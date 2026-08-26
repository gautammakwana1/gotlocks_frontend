"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import BackButton from "@/components/ui/BackButton";
import { useToast } from "@/lib/state/ToastContext";
import type { RootState } from "@/lib/interfaces/interfaces";
import {
    clearFeedContestUpdateState,
    updateFeedContestRequest,
} from "@/lib/redux/slices/feedContestSlice";
import ArenaContestPrizeSettings from "./ArenaContestPrizeSettings";
import ContestRulesDisclosure from "./ContestRulesDisclosure";
import {
    contestAccentClasses,
    contestFormCardClasses,
    copyFieldClasses,
    fieldClasses,
    fieldLabelClasses,
    type ContestAccent,
} from "./contestFormStyles";

/* ----------------------------------------------------------------------------
 * Edit a Feed contest's member-facing COPY.
 *
 * This is the MVP's `editingPublishedCopy` screen, which is the create wizard
 * opened at its RULES step: same page chrome, same hero card, no step nav, and
 * the whole Rules step body — with every mechanic control DISABLED rather than
 * removed, so the organizer reads the frozen settings in the same sentences the
 * wizard wrote them in. Footer is Cancel + Save Changes.
 *
 * It is a separate component from FeedContestCreateForm (which the MVP reuses)
 * because `PUT /update/:contest_id` accepts name / description / rules_text and
 * nothing else — there is no slate, timing or mechanics write to carry. The
 * shared look comes from ./contestFormStyles instead.
 * -------------------------------------------------------------------------- */

const CONTEST_EDITABLE_STATUSES = [
    "draft",
    "scheduled",
    "open",
    "locked",
    "grading",
];

export type FeedContestEditFormProps = {
    contestId: string;
    /** The contest detail screen — where Cancel and a successful save both land. */
    detailHref: string;
    accent?: ContestAccent;
};

export const FeedContestEditForm = ({
    contestId,
    detailHref,
    accent = "league",
}: FeedContestEditFormProps) => {
    const accentClasses = contestAccentClasses[accent];
    const router = useRouter();
    const dispatch = useDispatch();
    const { setToast } = useToast();
    const {
        detail,
        detailError,
        updateLoading,
        updateMessage,
        updateError,
        updateBumpedRulesVersion,
    } = useSelector((state: RootState) => state.feedContest);

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [rulesText, setRulesText] = useState("");
    const [error, setError] = useState<string>();
    // The form is seeded from the contest exactly ONCE. Re-seeding on every
    // change to `detail` would discard the organizer's edits the moment the
    // save's own reply merges the updated row back into the store.
    const seededContestId = useRef<string | undefined>(undefined);

    // The detail read and its teardown belong to FeedContestEditRouter, which is
    // this form's only mount site and gates on the record before rendering it.
    // Duplicating them here fetched twice, and — because the second reply lands
    // AFTER the router has already committed the first — a transient failure on
    // it would set `detailError`, unmount this form, and have its own cleanup
    // clear that error on the way out. The router then had neither a record nor
    // an error, and sat on a skeleton no retry could ever heal.
    useEffect(() => () => {
        dispatch(clearFeedContestUpdateState());
    }, [dispatch]);

    // Same render-time scoping as the detail screen: a record belonging to any
    // other id is never read.
    const scoped = detail?.contest?.id === contestId ? detail : null;
    const contest = scoped?.contest ?? null;
    const organizer = scoped?.viewer?.is_organizer ?? false;

    useEffect(() => {
        if (!contest || seededContestId.current === contest.id) return;
        seededContestId.current = contest.id;
        setName(contest.name ?? "");
        setDescription(contest.description ?? "");
        setRulesText(contest.rules_text ?? "");
    }, [contest]);

    useEffect(() => {
        if (updateMessage) {
            setToast({
                id: Date.now(),
                type: "success",
                // A rules change invalidates every acceptance already echoed
                // back, so the organizer is told rather than left to discover it.
                message: updateBumpedRulesVersion
                    ? `${updateMessage} Entrants must accept the new rules again.`
                    : updateMessage,
                duration: updateBumpedRulesVersion ? 5000 : 3000,
            });
            dispatch(clearFeedContestUpdateState());
            router.replace(detailHref);
            return;
        }
        if (updateError) {
            setError(updateError);
            setToast({
                id: Date.now(),
                type: "error",
                message: updateError,
                duration: 4000,
            });
            dispatch(clearFeedContestUpdateState());
        }
    }, [
        updateMessage,
        updateError,
        updateBumpedRulesVersion,
        detailHref,
        dispatch,
        router,
        setToast,
    ]);

    const handleSave = () => {
        if (updateLoading) return;
        const trimmedName = name.trim();
        const trimmedRules = rulesText.trim();
        // Mirrors the endpoint's own 400s, so an empty field never costs a
        // round trip.
        if (!trimmedName) {
            setError("Give the contest a name.");
            return;
        }
        if (!trimmedRules) {
            setError("Keep or rewrite the rules participants must accept.");
            return;
        }
        setError(undefined);
        // All three are sent every time: the endpoint compares against what is
        // stored, so unchanged copy is a no-op and never bumps rules_version.
        // Unlike name and rules_text, an EMPTY description is legal — the
        // endpoint trims it and stores "" — so it is deliberately not guarded
        // above, and clearing the field is a real edit.
        dispatch(
            updateFeedContestRequest({
                contest_id: contestId,
                name: trimmedName,
                description: description.trim(),
                rules_text: trimmedRules,
            })
        );
    };

    if (!contest) {
        if (!detailError) {
            return (
                <div className="flex flex-col gap-6 pb-10">
                    <BackButton fallback={detailHref} preferFallback />
                    <div className="space-y-2 border-b border-white/10 pb-5">
                        <div className="h-3 w-40 animate-pulse rounded bg-white/[0.06]" />
                        <div className="h-8 w-2/3 animate-pulse rounded bg-white/[0.06]" />
                    </div>
                    <div className="h-96 animate-pulse rounded-2xl bg-white/[0.03]" />
                </div>
            );
        }
        return (
            <div className="space-y-5 pb-10">
                <BackButton fallback={detailHref} preferFallback />
                <section className="rounded-xl border border-dashed border-white/15 bg-black/30 p-6">
                    <h1 className="font-semibold text-white">Contest unavailable</h1>
                    <p className="mt-2 text-sm leading-6 text-gray-500">{detailError}</p>
                </section>
            </div>
        );
    }

    const isDraft = contest.lifecycle_status === "draft";
    const isArenaContest = scoped?.context_type === "arena";
    // The endpoint's own window. It also freezes the copy once a member has
    // joined, which this screen cannot see — that case surfaces as a 409 on save.
    const editable =
        organizer &&
        ["multi_pick", "sunday_pickem", "td_psychic"].includes(contest.template) &&
        CONTEST_EDITABLE_STATUSES.includes(contest.lifecycle_status) &&
        !contest.canceled_at &&
        !contest.archived_at;
    /*
     * RENAME OUTLIVES THE COPY EDIT — the detail page's split, applied to the
     * form it links to. The name stays writable until the contest finalizes;
     * description and rules freeze once it leaves `open`, because from that
     * point an entrant has accepted the terms on record.
     *
     * The server freezes the copy one step earlier still — at the first accepted
     * entry, which no response tells us about — so an open contest that already
     * has an entrant renders enabled here and gets a 409 on save, surfaced
     * verbatim. Disabling on phase is the half we can know.
     */
    const copyEditable = editable && contest.lifecycle_status === "open";

    if (!editable) {
        return (
            <div className="space-y-5 pb-10">
                <BackButton fallback={detailHref} preferFallback />
                <section className="rounded-xl border border-dashed border-white/15 bg-black/30 p-6">
                    <h1 className="font-semibold text-white">This contest cannot be edited</h1>
                    <p className="mt-2 text-sm leading-6 text-gray-500">
                        {organizer
                            ? "A finalized, canceled or archived contest is a record, not a draft."
                            : "Only the organizer can edit a contest."}
                    </p>
                    <Link
                        href={detailHref}
                        className="mt-4 inline-flex rounded-xl border border-white/15 px-4 py-2.5 text-xs font-semibold text-gray-300 transition hover:border-white/30 hover:text-white"
                    >
                        Back to contest
                    </Link>
                </section>
            </div>
        );
    }

    return (
        <div
            className={`flex flex-col gap-6 pb-10 ${accent === "arena" ? "arena-theme" : ""}`}
        >
            <BackButton fallback={detailHref} preferFallback />

            <header className="space-y-2 border-b border-white/10 pb-5">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-400">
                    {scoped?.group?.name?.trim() || "League"} · Feed contest
                </p>
                <h1 className="text-3xl font-semibold text-white">
                    {isDraft
                        ? "Edit contest draft"
                        : copyEditable
                            ? "Edit contest details"
                            : "Rename contest"}
                </h1>
                <p className="max-w-2xl text-sm leading-6 text-gray-500">
                    {copyEditable
                        ? "Update the member-facing name and details before the first entry is submitted. Mechanics, slate, and timing stay read-only."
                        : isArenaContest
                            ? "Update the contest name here. Details, mechanics, slate, timing, and reward settlement stay read-only. Existing podium prizes can be updated from Contest Settings."
                            : "Update the contest name. Details, mechanics, slate, and timing are read-only after entry or lock."}
                </p>
            </header>

            {/* The wizard's step nav is deliberately absent — the MVP hides it in
                this mode too, because there is only ever one step to edit. */}
            <section className={contestFormCardClasses(accent)}>
                <div
                    className={`pointer-events-none absolute inset-0 ${accentClasses.heroGlow}`}
                />
                <div className="relative space-y-6">
                    <div>
                        <p
                            className={`text-xs font-semibold uppercase tracking-[0.12em] ${accentClasses.textSoft}`}
                        >
                            Rules
                        </p>
                        <h2 className="mt-2 text-2xl font-semibold text-white">
                            Make the contest easy to understand
                        </h2>
                        <p className="mt-2 text-sm leading-6 text-gray-400">
                            Add the contest details members will see. The contest rules stay
                            available in Contest Details, and entrants accept them before
                            submitting an entry.
                        </p>
                    </div>

                    <label className={fieldLabelClasses}>
                        Contest name
                        <input
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            placeholder="Sunday slate showdown"
                            disabled={updateLoading}
                            className={fieldClasses(accent)}
                        />
                    </label>

                    <section aria-labelledby="contest-description-title">
                        <div className="flex items-center justify-between gap-3">
                            <h3 id="contest-description-title" className={fieldLabelClasses}>
                                Details
                            </h3>
                            <span className="rounded-full border border-white/10 bg-white/[0.035] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.1em] text-gray-500">
                                {copyEditable ? "Edit details" : "Details locked"}
                            </span>
                        </div>
                        {/* The MVP now edits published copy as plain prose. A
                            General Combo's MECHANICS stay frozen at publish, but the
                            details blurb is member-facing copy, so it is editable
                            here and sent with the save. */}
                        <textarea
                            aria-label="Details"
                            aria-describedby="contest-description-help"
                            rows={4}
                            value={description}
                            onChange={(event) => setDescription(event.target.value)}
                            disabled={updateLoading || !copyEditable}
                            className={copyFieldClasses(accent)}
                        />
                        <p
                            id="contest-description-help"
                            className="mt-2 text-[11px] font-normal normal-case leading-5 text-gray-500"
                        >
                            Shown with the contest details. Participants do not accept
                            this copy.
                        </p>
                    </section>

                    {copyEditable ? (
                        <div>
                            <label className={fieldLabelClasses}>
                                Rules participants must accept
                                <textarea
                                    rows={4}
                                    value={rulesText}
                                    onChange={(event) => setRulesText(event.target.value)}
                                    disabled={updateLoading}
                                    aria-describedby="contest-rules-help"
                                    className={copyFieldClasses(accent)}
                                />
                            </label>
                            <p
                                id="contest-rules-help"
                                className="mt-2 text-[11px] font-normal normal-case leading-5 text-gray-500"
                            >
                                Entrants must review and check that they accept this copy before submitting an entry.
                            </p>
                        </div>
                    ) : (
                        /* RENAME MODE — the rules are a RECORD now, not a field.
                           Entrants accepted this exact text, so it is shown the way
                           the Details tab shows it: collapsed, formatted, and with
                           no control that implies it could still be changed. */
                        <section aria-label="Contest Rules" data-contest-rules-preview>
                            <ContestRulesDisclosure
                                rulesText={rulesText}
                                accent={accent}
                                helperText="Read only · accepted by entrants at this version."
                                className={`rounded-xl border px-4 ${accentClasses.previewSurface}`}
                            />
                        </section>
                    )}

                    {isArenaContest ? (
                        <section
                            aria-labelledby="arena-staff-participation-title"
                            className="border-t border-white/10 pt-5"
                        >
                            <h3
                                id="arena-staff-participation-title"
                                className={fieldLabelClasses}
                            >
                                Owner and manager participation
                            </h3>
                            <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.025] p-4">
                                <p className="text-sm font-semibold text-white">
                                    {contest.allow_staff_participation ? "Allowed" : "Not allowed"}
                                    <span className="ml-2 font-normal text-gray-500">
                                        Frozen when this contest was published
                                    </span>
                                </p>
                                <p className="mt-2 max-w-2xl text-xs normal-case leading-5 text-gray-500">
                                    Each owner or manager chooses whether to enter. A staff member
                                    who joins uses a contest participant spot, but staff still do
                                    not use an Arena member spot.
                                </p>
                            </div>
                            {/* Frozen alongside it, and for the same reason: an entrant
                                who accepted "enter from anywhere" must never find the
                                contest moved into a room. `PUT /update` is copy-only, so
                                neither value can be sent from here. */}
                            <h3
                                id="arena-entry-access-title"
                                className={`${fieldLabelClasses} mt-5`}
                            >
                                Entry access
                            </h3>
                            <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.025] p-4">
                                <p className="text-sm font-semibold text-white">
                                    {contest.entry_access_mode === "venue_check_in_required"
                                        ? "Venue Check-In Required"
                                        : "Open to Arena members"}
                                    <span className="ml-2 font-normal text-gray-500">
                                        Frozen when this contest was published
                                    </span>
                                </p>
                                <p className="mt-2 max-w-2xl text-xs normal-case leading-5 text-gray-500">
                                    {contest.entry_access_mode === "venue_check_in_required"
                                        ? "Members need an active verified venue session whenever they submit or replace an entry."
                                        : "Eligible members can submit from anywhere while entries are open."}
                                </p>
                            </div>
                        </section>
                    ) : null}

                    {/* PODIUM PRIZES, the MVP's reward block on this same screen
                        (MVP StructuredContestDetail.tsx:2928-2949).

                        Mounted in "card" surface: the section below already
                        supplies the heading and the divider, so the disclosure
                        chrome the Settings tab uses would be a third nested
                        frame inside the hero card.

                        Gated on a reward EXISTING. A contest published without
                        prizes cannot gain them — the disclosure has to be in
                        rules_text on the row's first version, and the endpoint
                        answers 409 — so there is nothing to offer here. The
                        detail screen's Settings tab says so in words; a form
                        does not need to repeat it.

                        `editable`, not `copyEditable`: prize WORDING outlives
                        the copy freeze on this backend exactly as the name does,
                        and PATCH /reward/:id/prizes carries no lifecycle gate.
                        Its own Cancel / Save prizes footer stays — the two
                        writes hit different endpoints and the prize save takes a
                        fresh organizer attestation, so chaining them behind one
                        button would let a copy 409 strand a saved prize. */}
                    {isArenaContest && scoped?.reward ? (
                        <section className="border-t border-white/10 pt-6">
                            <ArenaContestPrizeSettings
                                surface="card"
                                contestId={contestId}
                                reward={scoped.reward}
                                editable={editable}
                            />
                        </section>
                    ) : null}

                    {error ? (
                        <p role="alert" className="text-sm font-semibold text-red-200">
                            {error}
                        </p>
                    ) : null}

                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5">
                        <Link
                            href={detailHref}
                            className="rounded-xl border border-white/15 px-4 py-2.5 text-xs font-semibold text-gray-300 transition hover:border-white/30 hover:text-white"
                        >
                            Cancel
                        </Link>
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={updateLoading}
                            aria-busy={updateLoading}
                            className={`rounded-xl px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.09em] transition disabled:cursor-not-allowed disabled:opacity-40 ${accentClasses.createButton}`}
                        >
                            {updateLoading ? "Saving…" : "Save Changes"}
                        </button>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default FeedContestEditForm;
