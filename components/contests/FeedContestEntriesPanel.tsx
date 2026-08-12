"use client";

import { useState } from "react";
import { formatContestDateTime } from "@/lib/contests/feedContestCatalog";
import type {
    FeedContestEntriesData,
    FeedContestEntryRow,
} from "@/lib/interfaces/interfaces";
import ContestEntryFeedCard from "./ContestEntryFeedCard";
import type { FeedContestAccent } from "./FeedContestDetail";

/** Which half of the Entries tab a viewer is looking at. */
type EntryView = "mine" | "all";

/* ----------------------------------------------------------------------------
 * The FIELD of one Feed contest — GET /group/feed-contest/entries/:contest_id.
 *
 * Ported from the MVP's Entries tab (StructuredContestDetail, the
 * `showPrivateEntryReceipt` block and the "Accepted entries" list beneath it).
 *
 * The hidden-until-lock rule is the SERVER's, enforced in its query rather than
 * in its response shaping: before the lock, other members' rows arrive with
 * `pick: null` and only the caller's own carries detail. This component
 * therefore renders `row.is_revealed` and never re-derives visibility from the
 * lifecycle status — an organizer is not exempt either, so there is no role
 * check here at all.
 * -------------------------------------------------------------------------- */

/**
 * The MVP's `getFeedZebraRowClassName` (components/social/feedRowTone.ts) —
 * the same tone `FeedList` stripes its own rows with, so a list of one-item
 * FeedLists reads as one continuous feed rather than as separate cards.
 */
const zebraRowClassName = (index: number) =>
    index % 2 === 1 ? "bg-white/[0.025]" : undefined;

const participantStatusLabel = (status: string | null | undefined) => {
    switch (status) {
        case "entered":
            return "Entered";
        case "opted_in":
            return "Awaiting entry";
        case "locked":
            return "Locked";
        case "completed":
            return "Completed";
        case "withdrawn":
            return "Withdrawn";
        case "disqualified":
            return "Disqualified";
        case "missed_deadline":
            return "Missed deadline";
        case "eligible":
            return "Eligible";
        default:
            return "—";
    }
};

const memberInitials = (name: string) => (name || "??").slice(0, 2).toUpperCase();

type ParticipantTone = "sky" | "amber" | "emerald" | "muted" | "red";

/**
 * The MVP's "Your entry" copy matrix (StructuredContestDetail.tsx:457-545). The
 * heading and body both come from here, so the section states its case rather
 * than reporting a bare "Entry accepted" / "No entry yet".
 *
 * Precedence is deliberate: the deadline and a stale rules acceptance both
 * OVERRIDE the stored status, because a member sitting at `opted_in` past lock
 * has missed the contest whatever the row still says.
 */
const participantCopy = (
    status: string | null | undefined,
    hasParticipation: boolean,
    rulesCurrent: boolean,
    deadlinePassed: boolean
): { title: string; body: string; tone: ParticipantTone } => {
    if (!hasParticipation) {
        return deadlinePassed
            ? {
                title: "Entry window closed",
                body: "The deadline passed before you submitted an entry. No rank, points, or Contest Achievement can be recorded.",
                tone: "muted",
            }
            : {
                title: "Available to enter",
                body: "Build your picks, then submit everything together to join the contest.",
                tone: "sky",
            };
    }
    const preEntry = status === "eligible" || status === "opted_in";
    if (deadlinePassed && preEntry) {
        return {
            title: "Missed deadline",
            body: "No complete valid entry was received. You are not ranked and earn no points or Contest Achievement.",
            tone: "muted",
        };
    }
    if (!rulesCurrent && preEntry) {
        return {
            title: "Rules acceptance required",
            body: "The rules changed after your previous acceptance. Review the current version before entering.",
            tone: "amber",
        };
    }
    switch (status) {
        case "eligible":
            return {
                title: "Available to enter",
                body: "Review the rules and submit a complete entry to claim your spot.",
                tone: "sky",
            };
        case "opted_in":
            return {
                title: "Entry setup in progress",
                body: "This older saved rules acceptance does not claim an entry. Submit a complete valid entry before lock.",
                tone: "amber",
            };
        case "entered":
            return {
                title: "Entry submitted",
                body: "Your complete entry has a receipt and remains editable only while the entry window is open.",
                tone: "emerald",
            };
        case "locked":
            return {
                title: "Entry locked",
                body: "Your accepted entry is read-only while results and live standings update automatically.",
                tone: "sky",
            };
        case "completed":
            return {
                title: "Contest complete",
                body: "Your result is available in the frozen final standings.",
                tone: "emerald",
            };
        case "missed_deadline":
            return {
                title: "Missed deadline",
                body: "No complete valid entry was received. You are not ranked and earn no points or Contest Achievement.",
                tone: "muted",
            };
        case "withdrawn":
            return {
                title: "Withdrawn",
                body: "This participation record is no longer active.",
                tone: "muted",
            };
        case "disqualified":
            // The MVP prints the organizer's stated reason here; our entries read
            // carries no `disqualification_reason`, so the generic line stands in.
            return {
                title: "Disqualified",
                body: "This entry is ineligible for ranking, points, and achievements.",
                tone: "red",
            };
        default:
            return {
                title: "Available to enter",
                body: "Review the rules and submit a complete entry to claim your spot.",
                tone: "sky",
            };
    }
};

const participantToneTextClasses: Record<
    Exclude<ParticipantTone, "sky">,
    string
> = {
    amber: "text-amber-100",
    emerald: "text-emerald-100",
    muted: "text-gray-300",
    red: "text-red-100",
};

const participantToneTextClass = (tone: ParticipantTone, accent: FeedContestAccent) =>
    tone === "sky"
        ? accent === "arena"
            ? "text-violet-100"
            : "text-sky-100"
        : participantToneTextClasses[tone];

/**
 * A row whose pick is NOT on the response — the MVP's non-combo branch of the
 * accepted-entries list. Reached for a withdrawn or disqualified entrant (whose
 * row is kept deliberately, so the field reads as the record) and for anyone
 * else's entry before the lock.
 */
const EntryStubRow = ({ row, index }: { row: FeedContestEntryRow; index: number }) => {
    const memberName = row.member.username ?? "Member";
    return (
        <li className={`px-5 py-5 sm:px-6 ${zebraRowClassName(index) ?? ""}`.trim()}>
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                    <div
                        aria-hidden="true"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold uppercase text-slate-100"
                    >
                        {memberInitials(memberName)}
                    </div>
                    <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">{memberName}</p>
                        <p className="mt-0.5 text-xs text-gray-500">
                            {row.entered_at
                                ? `Accepted ${formatContestDateTime(row.entered_at)}`
                                : `Submitted ${formatContestDateTime(row.submitted_at)}`}
                        </p>
                    </div>
                </div>
                <span className="shrink-0 rounded-full border border-white/10 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-gray-400">
                    {participantStatusLabel(row.participant_status)}
                </span>
            </div>
            <p className="mt-2 text-sm leading-5 text-gray-300">
                This entry is hidden until the contest locks.
            </p>
        </li>
    );
};

export type FeedContestEntriesPanelProps = {
    entries: FeedContestEntriesData | null;
    loading: boolean;
    error: string | null;
    /**
     * Tints the "Your entry" heading in its sky/violet state. The POINTS wording
     * deliberately does not use it — that comes from the response's own
     * `contest.context_type`, which is the same fact and one the client cannot
     * get wrong.
     */
    accent?: FeedContestAccent;
    /** Drives the profile link on each entry card. */
    currentUserId?: string;
    /**
     * A draft has no field yet, so it replaces the whole panel with the
     * publish prompt — no receipt, no privacy notice. Passed in rather than read
     * off the entries response so the prompt renders before that read lands (and
     * at all, since only an organizer may read a draft's entries).
     */
    isDraft?: boolean;
    /**
     * Arena staff who opted their OWN contest in to staff participation are both
     * competitor and organizer, so they get a My-entry / All-entries switch.
     */
    showStaffEntrySubtabs?: boolean;
    /**
     * May this viewer read the field at all. False before the lock for anyone
     * who is themselves competing — a live participant must not read the field
     * early, whatever else they can do.
     */
    canViewAllEntries?: boolean;
    /** Which view a viewer WITHOUT the sub-tabs lands on. */
    defaultEntryView?: EntryView;
    /**
     * The caller's own participation status, from the DETAIL read's
     * `contest.my_participation` — the entries envelope does not carry it.
     * Drives the "Your entry" heading and body.
     */
    myParticipationStatus?: string | null;
    /** Has the viewer a participation row at all. */
    hasParticipation?: boolean;
    /** FALSE when the rules changed after the viewer's last acceptance. */
    rulesCurrent?: boolean;
    /** Past `locks_at` — overrides the stored status in the copy matrix. */
    deadlinePassed?: boolean;
    /** Set only while the contest has yet to open; renders the "Entries open" line. */
    opensAtLabel?: string | null;
    /** Rendered under the caller's own receipt — the "build entry" CTA. */
    action?: React.ReactNode;
    /**
     * The JOIN call to action, for a viewer with no participation row yet.
     * Set, it takes over the header: the kicker reads "Entry status", the title
     * drops its tone tint, and this link sits on the header's right edge instead
     * of the pill button under the receipt. That is the MVP's split — someone
     * who has not joined is being invited, not shown a record.
     */
    joinAction?: React.ReactNode;
};

export const FeedContestEntriesPanel = ({
    entries,
    loading,
    error,
    currentUserId,
    isDraft = false,
    showStaffEntrySubtabs = false,
    canViewAllEntries = false,
    defaultEntryView = "mine",
    myParticipationStatus = null,
    hasParticipation = false,
    rulesCurrent = true,
    deadlinePassed = false,
    opensAtLabel = null,
    accent = "league",
    action,
    joinAction,
}: FeedContestEntriesPanelProps) => {
    const [staffEntryView, setStaffEntryView] = useState<EntryView>("mine");

    // Arrow/Home/End move focus AND selection, the roving-tabindex pattern the
    // MVP uses. Focus is moved by id because the two buttons are siblings of
    // this handler's target, not children.
    const handleEntryViewKeyDown = (
        event: React.KeyboardEvent<HTMLDivElement>
    ) => {
        const next: EntryView | null =
            event.key === "Home"
                ? "mine"
                : event.key === "End"
                    ? "all"
                    : event.key === "ArrowLeft" || event.key === "ArrowRight"
                        ? staffEntryView === "mine"
                            ? "all"
                            : "mine"
                        : null;
        if (!next) return;
        event.preventDefault();
        setStaffEntryView(next);
        document.getElementById(`contest-entry-view-tab-${next}`)?.focus();
    };
    // Checked FIRST, ahead of the loading and error states: a draft's field does
    // not exist yet, so there is nothing to load and nothing to fail. The MVP
    // gates its receipt on `phase !== "draft"` for the same reason.
    if (isDraft) {
        return (
            <div
                aria-label="Contest entries"
                className="-mx-5 divide-y divide-white/10 overflow-visible border-y border-white/10 sm:mx-0"
            >
                <section className="px-5 py-5 sm:px-6">
                    <h2 className="font-semibold text-white">
                        Publish this draft to open entries
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-gray-500">
                        Finish the contest setup and publish when you are ready for
                        participants to submit entries.
                    </p>
                </section>
            </div>
        );
    }

    if (loading && !entries) {
        return (
            <div
                role="status"
                className="rounded-xl border border-white/10 bg-black/25 px-4 py-5 text-sm text-gray-400"
            >
                Loading entries…
            </div>
        );
    }

    if (error && !entries) {
        return (
            <div
                role="alert"
                className="rounded-xl border border-rose-300/20 bg-rose-500/5 px-4 py-5 text-sm text-rose-100"
            >
                {error}
            </div>
        );
    }

    if (!entries) return null;

    // Inside a contest a pick is worth League / Arena Points, never global XP —
    // the entries response names the surface, so the wording follows the data
    // rather than the accent prop.
    const pointsLabel =
        entries.contest.context_type === "arena" ? "Arena Points" : "League Points";
    // Same source as the wording above: the response names the surface, so the
    // card accent cannot drift from the points vocabulary.
    const cardAccent = entries.contest.context_type === "arena" ? "violet" : "sky";
    const participantState = participantCopy(
        myParticipationStatus,
        hasParticipation,
        rulesCurrent,
        deadlinePassed
    );

    const ownRow = entries.entries.find((row) => row.is_own) ?? null;
    /*
     * The receipt and the field are MUTUALLY EXCLUSIVE, as in the MVP: a member
     * sees only their own receipt before the lock, and only the full field —
     * with their own row inline — after it. So the list is NOT filtered by
     * `is_own`; it is simply never rendered alongside the receipt.
     */
    const resolvedEntryView: EntryView = showStaffEntrySubtabs
        ? staffEntryView
        : defaultEntryView;
    const showReceipt = resolvedEntryView === "mine";
    const showAllEntries = resolvedEntryView === "all" && canViewAllEntries;
    const submittedRows = entries.entries;

    return (
        <>
            {showStaffEntrySubtabs ? (
                <div
                    role="tablist"
                    aria-label="Entry views"
                    onKeyDown={handleEntryViewKeyDown}
                    className="mb-3 inline-flex rounded-xl bg-white/[0.05] p-1"
                >
                    {(
                        [
                            { id: "mine" as const, label: "My entry" },
                            { id: "all" as const, label: "All entries" },
                        ] as const
                    )
                        .filter((view) => view.id === "mine" || canViewAllEntries)
                        .map((view) => (
                            <button
                                key={view.id}
                                id={`contest-entry-view-tab-${view.id}`}
                                type="button"
                                role="tab"
                                aria-selected={resolvedEntryView === view.id}
                                aria-controls={`contest-entry-view-${view.id}`}
                                tabIndex={resolvedEntryView === view.id ? 0 : -1}
                                onClick={() => setStaffEntryView(view.id)}
                                className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition ${resolvedEntryView === view.id
                                    ? "bg-white text-black"
                                    : "text-gray-400 hover:text-white"
                                    }`}
                            >
                                {view.label}
                            </button>
                        ))}
                </div>
            ) : null}

            <div
                id={
                    showStaffEntrySubtabs
                        ? `contest-entry-view-${resolvedEntryView}`
                        : undefined
                }
                role={showStaffEntrySubtabs ? "tabpanel" : undefined}
                aria-labelledby={
                    showStaffEntrySubtabs
                        ? `contest-entry-view-tab-${resolvedEntryView}`
                        : undefined
                }
                aria-label={showStaffEntrySubtabs ? undefined : "Contest entries"}
                className={`-mx-5 divide-y divide-white/10 overflow-visible border-b border-white/10 sm:mx-0 ${ownRow?.pick ? "border-t" : ""
                    }`}
            >
            {showReceipt ? (
            <article className="px-5 py-5 sm:px-6">
                <div
                    data-entry-join-state={joinAction ? "available" : undefined}
                    className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3"
                >
                    {joinAction ? (
                        <div className="min-w-0">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500">
                                Entry status
                            </p>
                            <h2 className="mt-1 text-base font-semibold text-white">
                                {participantState.title}
                            </h2>
                        </div>
                    ) : (
                        <div>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500">
                                Your entry
                            </p>
                            <h2
                                className={`mt-1 font-semibold ${participantToneTextClass(
                                    participantState.tone,
                                    accent
                                )}`}
                            >
                                {participantState.title}
                            </h2>
                        </div>
                    )}
                    {ownRow?.entered_at ? (
                        <span className="text-xs text-gray-500">
                            Received {formatContestDateTime(ownRow.entered_at)}
                        </span>
                    ) : (
                        joinAction ?? null
                    )}
                </div>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-400">
                    {participantState.body}
                </p>
                {opensAtLabel ? (
                    <p
                        className={`mt-3 text-sm font-semibold ${accent === "arena" ? "text-violet-200" : "text-sky-200"
                            }`}
                    >
                        Entries open {opensAtLabel}.
                    </p>
                ) : null}

                {ownRow?.pick ? (
                    <section
                        aria-label="Accepted entry receipt"
                        className="mt-5 border-t border-white/10 pt-4"
                    >
                        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-500">
                            Accepted entry receipt
                        </p>
                        {/* Bled to the full panel width, as the MVP does — the
                            feed card owns its own px-5/sm:px-6 gutter. */}
                        <div className="-mx-5 mt-1 sm:-mx-6">
                            <ContestEntryFeedCard
                                row={ownRow}
                                pick={ownRow.pick}
                                contextualPointsLabel={pointsLabel}
                                currentUserId={currentUserId}
                                accent={cardAccent}
                            />
                        </div>
                    </section>
                ) : null}

                {/* Right-aligned, as the MVP now places it — the CTA sits at the
                    end of the receipt rather than under its left edge. Never
                    alongside `joinAction`: the MVP renders this pill only for a
                    viewer who is already in the contest. */}
                {action && !joinAction ? (
                    <div className="mt-4 flex justify-end">{action}</div>
                ) : null}
            </article>
            ) : null}

            {showReceipt && !entries.is_revealed ? (
                <section className="px-5 py-5 sm:px-6">
                    <h2 className="font-semibold text-white">Entries stay private until lock</h2>
                    <p className="mt-2 text-sm leading-6 text-gray-500">
                        Each participant can review their own accepted receipt here. Every
                        complete entry becomes visible when the contest locks
                        {entries.reveal_at
                            ? ` on ${formatContestDateTime(entries.reveal_at)}`
                            : ""}
                        .
                    </p>
                    {/* Deliberately not shown: the entered / participant tally.
                    <p className="mt-3 text-sm font-semibold text-sky-200">
                        {entries.summary.entered_count} of{" "}
                        {entries.summary.participant_count} participant
                        {entries.summary.participant_count === 1 ? "" : "s"} have entered.
                    </p> */}
                </section>
            ) : null}

            {showAllEntries ? (
                <section aria-labelledby="accepted-entries-heading">
                    <header className="flex flex-wrap items-end justify-between gap-2 px-5 py-4 sm:px-6">
                        <div>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-500">
                                Accepted entries
                            </p>
                            <h2
                                id="accepted-entries-heading"
                                className="mt-1 font-semibold text-white"
                            >
                                {entries.is_revealed ? "All locked entries" : "All entries"}
                            </h2>
                        </div>
                        {/* The paginated TOTAL, not the rendered row count — past
                            page 1 the two disagree, and the total is the honest
                            answer to "how many were submitted". */}
                        <span className="text-xs text-gray-500">
                            {entries.summary.entered_count} submitted
                        </span>
                    </header>
                    {submittedRows.length ? (
                        <ul className="divide-y divide-white/10 border-t border-white/10">
                            {submittedRows.map((row, index) =>
                                row.pick ? (
                                    <li key={row.id} className={zebraRowClassName(index)}>
                                        <ContestEntryFeedCard
                                            row={row}
                                            pick={row.pick}
                                            contextualPointsLabel={pointsLabel}
                                            currentUserId={currentUserId}
                                            accent={cardAccent}
                                        />
                                    </li>
                                ) : (
                                    <EntryStubRow key={row.id} row={row} index={index} />
                                )
                            )}
                        </ul>
                    ) : (
                        <p className="border-t border-white/10 px-5 py-6 text-sm text-gray-500 sm:px-6">
                            No complete valid entries were accepted before lock.
                        </p>
                    )}
                </section>
            ) : null}
        </div>

        {/* An empty panel so the inactive sub-tab's aria-controls resolves to a
            real element. */}
        {showStaffEntrySubtabs && canViewAllEntries ? (
            <div
                id={`contest-entry-view-${resolvedEntryView === "mine" ? "all" : "mine"}`}
                role="tabpanel"
                aria-labelledby={`contest-entry-view-tab-${resolvedEntryView === "mine" ? "all" : "mine"
                    }`}
                hidden
            />
        ) : null}
        </>
    );
};

export default FeedContestEntriesPanel;
