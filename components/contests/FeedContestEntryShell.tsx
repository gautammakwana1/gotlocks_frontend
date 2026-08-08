"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import BackButton from "@/components/ui/BackButton";
import ContestPickBuilder from "@/components/pick-builder/contest/ContestPickBuilder";
import {
    FEED_CONTEST_MAX_LEGS,
    FEED_CONTEST_MIN_LEGS,
    formatContestDateTime,
} from "@/lib/contests/feedContestCatalog";
import { feedContestOddsRequestKey } from "@/lib/contests/feedContestOdds";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { useToast } from "@/lib/state/ToastContext";
import type {
    FeedContestEntryLegPayload,
    FeedContestEntryRow,
    RootState,
} from "@/lib/interfaces/interfaces";
import {
    clearFeedContestDetail,
    clearFeedContestEntries,
    clearFeedContestEntryMessage,
    enterFeedContestRequest,
    fetchFeedContestDetailRequest,
    fetchFeedContestEntriesRequest,
    replaceFeedContestEntryRequest,
} from "@/lib/redux/slices/feedContestSlice";
import {
    clearFeedContestOdds,
    fetchFeedContestOddsRequest,
} from "@/lib/redux/slices/feedContestOddsSlice";
import ContestEntryFeedCard from "./ContestEntryFeedCard";
import type { FeedContestAccent } from "./FeedContestDetail";

/* ----------------------------------------------------------------------------
 * "Create your entry" — the member-facing entry route, ported from the MVP's
 * StructuredContestEntryShell (gotlocks.app_mvp2/components/contests/
 * StructuredContestDetail.tsx, ~line 3441).
 *
 * Layout, copy and gating are the MVP's. What changed is where the data comes
 * from: the MVP reads a synchronous mock catalog, so it can render the whole
 * builder on the first commit. Here the slate rides on the contest detail and
 * the markets arrive from `/leagues/**\/schedules-with-odds-by-events`, so the
 * builder carries its own loading and error states and the rules gate is
 * rendered before either lands.
 *
 * One call does BOTH halves of joining: `POST /enter` accepts the rules, opts
 * the member in and submits the combo, so nobody is ever left opted in with no
 * entry. Once an entry exists, `PUT /replace-entry` swaps it in place.
 * -------------------------------------------------------------------------- */

const accentClassesFor = (accent: FeedContestAccent) =>
    accent === "arena"
        ? { textSoft: "text-violet-200", checkbox: "accent-violet-400" }
        : { textSoft: "text-sky-200", checkbox: "accent-sky-400" };

/**
 * The ONLY status `/replace-entry` accepts. `gateParticipantForReplace` refuses
 * everything else, and it splits the refusal two ways for a reason: 'locked' and
 * 'completed' are past the deadline ("your entry is locked"), while every other
 * status has nothing to replace ("join first"). Those call for opposite actions
 * from the member, so this must not be widened to "holds a spot".
 */
const REPLACEABLE_STATUS = "entered";

/** Committed, but past the point where either write applies. */
const SETTLED_STATUSES = ["locked", "completed"];

/** Statuses that can never enter again, whatever the clock says. */
const BARRED_STATUSES = ["withdrawn", "disqualified", "missed_deadline"];

export type FeedContestEntryShellProps = {
    contestId: string;
    /** Where Back and Close return to — the contest detail route. */
    detailHref: string;
    /**
     * FALSE disables the write without hiding the screen — the Arena hosting
     * gate. A League has no hosting state and never passes it.
     */
    writable?: boolean;
    accent?: FeedContestAccent;
};

export const FeedContestEntryShell = ({
    contestId,
    detailHref,
    writable = true,
    accent = "league",
}: FeedContestEntryShellProps) => {
    const accentClasses = accentClassesFor(accent);
    const router = useRouter();
    const dispatch = useDispatch();
    const { setToast } = useToast();
    const currentUser = useCurrentUser();

    const {
        detail,
        detailLoading,
        detailError,
        entries,
        entrySubmitLoading,
        entrySubmitMessage,
        entrySubmitError,
        submittedEntry,
    } = useSelector((state: RootState) => state.feedContest);
    const odds = useSelector((state: RootState) => state.feedContestOdds);

    const [rulesAccepted, setRulesAccepted] = useState(false);
    const [feedback, setFeedback] = useState<{ tone: "error" | "success"; message: string }>();

    useEffect(() => {
        if (!contestId) return;
        dispatch(fetchFeedContestDetailRequest({ contest_id: contestId }));
        // The full first page, not the default 20: this screen needs the
        // CALLER's own row, and the endpoint pages the field by submission time
        // with no way to pin the caller's entry to page 1. 100 is the server's
        // own maximum.
        // TODO(api): a `?mine=1` filter (or the caller's row returned outside the
        // page window) would make this exact; past 100 entries a member who
        // entered early can still see an empty receipt and a blank replacement.
        dispatch(
            fetchFeedContestEntriesRequest({ contest_id: contestId, page: 1, limit: 100 })
        );
    }, [contestId, dispatch]);

    // Every slot this screen reads is single-tenant and shared with the detail
    // screen, so all three are dropped on the way out.
    useEffect(
        () => () => {
            dispatch(clearFeedContestDetail());
            dispatch(clearFeedContestEntries());
            dispatch(clearFeedContestOdds());
        },
        [dispatch]
    );

    // Read during RENDER, never from an effect: a record belonging to another id
    // is never used, whatever the loading flags say.
    const scoped = detail?.contest?.id === contestId ? detail : null;
    const contest = scoped?.contest ?? null;
    const slate = useMemo(() => contest?.eligible_games_json ?? [], [contest]);

    // A new rules_version invalidates whatever the member ticked.
    useEffect(() => {
        setRulesAccepted(false);
    }, [contest?.id, contest?.rules_version]);

    /* ---------- The markets for this contest's frozen slate ---------- */
    const requestKey = useMemo(
        () =>
            contest
                ? feedContestOddsRequestKey(
                      contest.id,
                      "fanduel",
                      slate.map((game) => game.game_id)
                  )
                : "",
        [contest, slate]
    );
    const oddsDescribeThisContest = Boolean(requestKey) && odds.requestKey === requestKey;

    // Keyed on the REQUEST KEY string, not on the slate array: the array is a new
    // identity every render and would loop.
    const requestedKeyRef = useRef("");
    useEffect(() => {
        if (!contest || !slate.length || !requestKey) return;
        if (requestedKeyRef.current === requestKey) return;
        requestedKeyRef.current = requestKey;
        dispatch(
            fetchFeedContestOddsRequest({
                contest_id: contest.id,
                games: slate,
                sportsbook: "fanduel",
            })
        );
    }, [contest, dispatch, requestKey, slate]);

    const refetchOdds = () => {
        if (!contest || !slate.length) return;
        requestedKeyRef.current = requestKey;
        dispatch(
            fetchFeedContestOddsRequest({
                contest_id: contest.id,
                games: slate,
                sportsbook: "fanduel",
            })
        );
    };

    /* ---------- Who may enter, and whether this is a join or a replacement ---------- */
    const participation = contest?.my_participation ?? null;
    const participantStatus = participation?.status ?? null;
    const rulesCurrent =
        Boolean(participation?.rules_version_accepted) &&
        participation?.rules_version_accepted === contest?.rules_version;
    // Exactly the server's replace gate. Widening this to "already holds a spot"
    // would send a PUT for a 'locked' participant, which answers 409 — the
    // decision between the two writes has to agree with the endpoint that
    // enforces it, not merely approximate it.
    const hasAcceptedEntry = participantStatus === REPLACEABLE_STATUS;
    const settled = SETTLED_STATUSES.includes(participantStatus ?? "");
    const barred = BARRED_STATUSES.includes(participantStatus ?? "");

    const opensAt = contest?.opens_at ? Date.parse(contest.opens_at) : Number.NEGATIVE_INFINITY;
    const locksAt = contest?.locks_at ? Date.parse(contest.locks_at) : Number.NaN;
    const entryWindowOpen = Boolean(
        contest &&
            writable &&
            contest.lifecycle_status === "open" &&
            !contest.canceled_at &&
            !contest.archived_at &&
            Date.now() >= opensAt &&
            Number.isFinite(locksAt) &&
            Date.now() < locksAt
    );

    // Only the General Combo entry model has a builder; the endpoint refuses
    // anything else with "This contest takes a '<model>' entry, not a combo."
    const isComboContest = contest?.entry_model === "multi_pick";
    const canBuildEntry = entryWindowOpen && isComboContest && !barred && !settled;
    // A join needs the rules ticked here; a replacement already accepted them.
    const needsRulesAcceptance = canBuildEntry && !hasAcceptedEntry;
    const acceptedCurrentRules = hasAcceptedEntry || rulesCurrent || rulesAccepted;

    /* ---------- The legs already accepted, for a replacement ---------- */
    // The entries list is the source; the just-written reply is the fallback, so
    // the receipt appears in the commit that wrote it rather than waiting for the
    // refetch. The reply carries no row, so a minimal one is synthesised — the
    // receipt card needs an author and a timestamp, both of which are known.
    const ownRow = useMemo<FeedContestEntryRow | null>(() => {
        const fromList =
            entries?.contest?.id === contestId
                ? (entries.entries.find((row) => row.is_own) ?? null)
                : null;
        if (fromList?.pick) return fromList;

        const written = submittedEntry?.pick;
        if (!written) return fromList;
        return {
            id: written.id ?? `${contestId}-own-entry`,
            is_own: true,
            is_revealed: true,
            member: {
                id: written.user_id ?? currentUser?.userId ?? "",
                username: currentUser?.username ?? null,
                // The session carries no avatar; the card falls back to its
                // placeholder, and the refetch replaces this row moments later.
                profile_image: null,
            },
            participant_status: "entered",
            joined_at: null,
            entered_at: written.created_at ?? null,
            submitted_at: written.created_at ?? new Date().toISOString(),
            updated_at: written.updated_at ?? written.created_at ?? "",
            pick: written,
        };
    }, [contestId, currentUser, entries, submittedEntry]);
    const ownEntry = ownRow?.pick ?? null;
    const initialLegKeys = useMemo(
        () => (ownEntry?.legs ?? []).map((leg) => leg.external_pick_key),
        [ownEntry]
    );
    const initialLegLabels = useMemo(
        () =>
            Object.fromEntries(
                (ownEntry?.legs ?? []).map((leg) => [leg.external_pick_key, leg.description])
            ),
        [ownEntry]
    );

    /* ---------- Report the write once ---------- */
    useEffect(() => {
        if (!entrySubmitMessage && !entrySubmitError) return;
        // `/replace-entry` returns what it displaced, precisely so the swap can
        // be shown without the client having kept the old entry to diff against.
        // Appended to the server's own copy rather than replacing it.
        const swap =
            !entrySubmitError && submittedEntry && "previous_entry" in submittedEntry
                ? submittedEntry.previous_entry
                : null;
        const swapNote =
            swap && typeof swap.leg_count === "number"
                ? ` Replaced a ${swap.leg_count}-leg entry${
                      typeof swap.combined_american_odds === "number"
                          ? ` at ${
                                swap.combined_american_odds > 0 ? "+" : ""
                            }${swap.combined_american_odds}`
                          : ""
                  }.`
                : "";
        const message = entrySubmitError ?? `${entrySubmitMessage ?? ""}${swapNote}`;
        setFeedback({ tone: entrySubmitError ? "error" : "success", message });
        setToast({
            id: Date.now(),
            type: entrySubmitError ? "error" : "success",
            message,
            duration: entrySubmitError ? 4000 : 3000,
        });
        // A successful write changed the participant row; re-read so the screen
        // flips from "join" to "replace" from the server's own copy.
        if (!entrySubmitError) {
            dispatch(fetchFeedContestDetailRequest({ contest_id: contestId }));
        }
        dispatch(clearFeedContestEntryMessage());
        // `submittedEntry` outlives the message it came with, but the guard above
        // means only the commit that carries a message can get past it — so this
        // still reports exactly once per write.
    }, [contestId, dispatch, entrySubmitError, entrySubmitMessage, setToast, submittedEntry]);

    const handleSubmit = (legs: FeedContestEntryLegPayload[]) => {
        if (!contest) return;
        if (!hasAcceptedEntry && !acceptedCurrentRules) {
            const message = "Accept the current contest rules before submitting your entry.";
            setFeedback({ tone: "error", message });
            setToast({ id: Date.now(), type: "error", message, duration: 4000 });
            return;
        }
        const body = {
            contest_id: contest.id,
            legs,
            description: legs.map((leg) => leg.description).join(" + ").slice(0, 300),
            source_tab: "Feed Contest",
            build_mode: "ODDS",
        };
        // A member who already holds an accepted entry REPLACES it; /enter would
        // answer 409 "You have already entered this contest."
        dispatch(
            hasAcceptedEntry
                ? replaceFeedContestEntryRequest({
                      ...body,
                      rules_version: contest.rules_version,
                  })
                : enterFeedContestRequest({ ...body, rules_version: contest.rules_version })
        );
    };

    if (!contest) {
        return (
            <div className="space-y-5 pb-10">
                <BackButton fallback={detailHref} preferFallback />
                <section className="rounded-xl border border-dashed border-white/15 bg-black/30 p-6">
                    <h1 className="font-semibold text-white">
                        {detailLoading ? "Loading entry…" : "Entry unavailable"}
                    </h1>
                    <p className="mt-2 text-sm text-gray-500">
                        {detailLoading
                            ? "Reading this contest."
                            : (detailError ?? "This contest entry could not be loaded.")}
                    </p>
                </section>
            </div>
        );
    }

    return (
        <div className={`flex flex-col gap-5 pb-10 ${accent === "arena" ? "arena-theme" : ""}`}>
            <BackButton fallback={`${detailHref}?tab=entries`} preferFallback />
            <header className="border-b border-white/10 pb-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500">
                    {scoped?.group?.name ?? "Contest"} · Contest entry
                </p>
                <h1 className="mt-1 text-2xl font-semibold text-white sm:text-3xl">
                    {contest.name}
                </h1>
                <p className="mt-2 text-sm text-gray-400">
                    Entries lock {formatContestDateTime(contest.locks_at)} in your local time.
                </p>
            </header>

            {needsRulesAcceptance ? (
                <section
                    aria-label="Accept contest rules"
                    className="-mx-5 border-y border-white/10 px-5 py-5 sm:-mx-6 sm:px-6"
                >
                    <p
                        className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${accentClasses.textSoft}`}
                    >
                        Rules version {contest.rules_version}
                    </p>
                    <h2 className="mt-1 text-lg font-semibold text-white">
                        Review before submitting
                    </h2>
                    <div className="mt-4 whitespace-pre-wrap border-l-2 border-white/15 pl-4 text-sm leading-6 text-gray-300">
                        {contest.rules_text}
                    </div>
                    <label className="mt-4 flex items-start gap-3 text-sm leading-6 text-gray-200">
                        <input
                            type="checkbox"
                            checked={rulesAccepted}
                            onChange={(event) => setRulesAccepted(event.target.checked)}
                            className={`mt-1 h-4 w-4 ${accentClasses.checkbox}`}
                        />
                        <span>
                            I accept the current rules. I will join this contest only when my
                            complete entry is submitted.
                        </span>
                    </label>
                </section>
            ) : null}

            {feedback ? (
                <p
                    role={feedback.tone === "error" ? "alert" : "status"}
                    className={
                        feedback.tone === "error"
                            ? "text-sm text-red-200"
                            : "text-sm text-emerald-200"
                    }
                >
                    {feedback.message}
                </p>
            ) : null}

            {ownEntry ? (
                <section
                    aria-label="Accepted entry receipt"
                    className="rounded-2xl border border-emerald-300/20 bg-emerald-500/10 p-5"
                >
                    <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-emerald-100/70">
                        Accepted entry receipt
                    </p>
                    {/* The same feed card the Entries tab shows, as the MVP does —
                        an accepted entry reads like the pick post it is. Not bled
                        to the edges here: the MVP only does that inside the detail
                        screen's flush entries list, not inside this padded card. */}
                    <ContestEntryFeedCard
                        row={ownRow!}
                        pick={ownEntry}
                        contextualPointsLabel={
                            scoped?.context_type === "arena" ? "Arena Points" : "League Points"
                        }
                        currentUserId={currentUser?.userId}
                    />
                </section>
            ) : null}

            {canBuildEntry ? (
                <section
                    aria-label="Build contest entry"
                    className="-mx-5 space-y-4 border-t border-white/10 px-5 pt-3 sm:-mx-6 sm:px-6 sm:pt-3.5"
                >
                    <div>
                        <div className="mb-1 flex items-center justify-between gap-4">
                            <p className="text-[10px] uppercase tracking-[0.22em] text-gray-500">
                                entry builder
                            </p>
                            <span
                                className={`text-[10px] uppercase tracking-[0.16em] ${accentClasses.textSoft}`}
                            >
                                contest lines
                            </span>
                        </div>
                        {/* The MVP gates this on there being NO participant row at
                            all — an already opted-in member has claimed their spot,
                            even though they have not entered yet. */}
                        {!participation ? (
                            <p className="mt-1 text-xs leading-5 text-gray-400">
                                Your contest spot is claimed only after this complete entry is
                                accepted.
                            </p>
                        ) : null}
                    </div>

                    <ContestPickBuilder
                        context={{
                            contestId: contest.id,
                            contestName: contest.name,
                            slate,
                            // Only ever the odds that describe THIS request; a
                            // stale group set would price another slate's games.
                            oddsGroups: oddsDescribeThisContest ? odds.groups : [],
                            allowedSports: contest.sports ?? undefined,
                            locksAt: contest.locks_at,
                            rules: {
                                minLegs: contest.minimum_legs ?? FEED_CONTEST_MIN_LEGS,
                                maxLegs: contest.maximum_legs ?? FEED_CONTEST_MAX_LEGS,
                                minimumCombinedOdds: contest.minimum_odds ?? null,
                                allowSameGameLegs: contest.allow_same_game_legs === true,
                            },
                            initialLegKeys,
                            initialLegLabels,
                            // "Not yet this contest's odds" counts as loading, so
                            // the builder never flashes "no eligible markets"
                            // before the first read lands — but NOT when the read
                            // failed, since a failure also clears the request key
                            // and would otherwise hide the error behind a
                            // spinner that never resolves.
                            loading:
                                odds.loading || (!oddsDescribeThisContest && !odds.error),
                            error: odds.error,
                            onRetry: refetchOdds,
                            submitting: entrySubmitLoading,
                            submitLabel: hasAcceptedEntry ? "Replace entry" : undefined,
                            // `rulesAccepted`, NOT the derived `acceptedCurrentRules`:
                            // the sheet's checkbox and the section above it are one
                            // control in two places, and feeding the derived value
                            // here renders it pre-ticked and un-untickable whenever
                            // the member's stored acceptance is already current.
                            rulesAcceptance: needsRulesAcceptance
                                ? {
                                      accepted: rulesAccepted,
                                      onAcceptedChange: setRulesAccepted,
                                      label: "I accept the current rules and want to join with this complete entry.",
                                  }
                                : undefined,
                            onSubmit: handleSubmit,
                        }}
                        onDismiss={() => router.push(`${detailHref}?tab=entries`)}
                        showDismissButton
                        surface="page"
                    />
                </section>
            ) : null}

            {!canBuildEntry ? (
                <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5 text-sm leading-6 text-gray-400">
                    {barred
                        ? "You are not eligible to enter this contest."
                        : settled
                          ? "Your entry is locked and can no longer be replaced. Results and live standings update automatically."
                          : !isComboContest
                          ? "This contest does not take a General Combo entry, so it cannot be built here yet."
                          : "This entry is read-only because the contest is not currently accepting submissions. Results and live standings update automatically."}
                </section>
            ) : null}
        </div>
    );
};

export default FeedContestEntryShell;
