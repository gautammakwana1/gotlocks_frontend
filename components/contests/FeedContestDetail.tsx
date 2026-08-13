"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import BackButton from "@/components/ui/BackButton";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import {
    formatContestDateTime,
    gameKickoffFormatter,
} from "@/lib/contests/feedContestCatalog";
import { useToast } from "@/lib/state/ToastContext";
import type {
    FeedContest,
    FeedContestGameSnapshot,
    RootState,
} from "@/lib/interfaces/interfaces";
import {
    clearFeedContestDeleteState,
    clearFeedContestDetail,
    clearFeedContestEntries,
    clearFeedContestLeaderboard,
    clearFeedContestStats,
    deleteFeedContestRequest,
    fetchFeedContestDetailRequest,
    fetchFeedContestEntriesRequest,
    fetchFeedContestLeaderboardRequest,
    fetchFeedContestStatsRequest,
} from "@/lib/redux/slices/feedContestSlice";
import ContestDeletionDrawer, {
    type ContestDeletionResult,
} from "./ContestDeletionDrawer";
import FeedContestEntriesPanel from "./FeedContestEntriesPanel";
import FeedContestStandingsPanel from "./FeedContestStandingsPanel";

/* ----------------------------------------------------------------------------
 * The Feed contest DETAIL screen, ported from the MVP's StructuredContestDetail
 * (gotlocks.app_mvp2/components/contests/StructuredContestDetail.tsx, ~line 3800
 * onwards). Like the MVP's, this is ONE component for both contexts — an Arena
 * contest and a League Feed contest differ only in `context_type` and accent —
 * so the two arena-only facts below stay behind a `context_type` check rather
 * than being deleted.
 *
 * Ported: the header, the four-tab strip, and all four panels. STANDINGS reads
 * TWO endpoints — `GET .../stats/:contest_id` for the header count, which never
 * grows with the field, and `GET .../leaderboard/:contest_id` for the board
 * itself, which does and is therefore paged on its own.
 *
 * Note where the MVP puts each count, which this follows: STANDINGS shows only a
 * compact PARTICIPANTS figure in its header (or "N ranked · N entries" once the
 * field is public), and the ENTRIES tab owns "N submitted" on its Accepted
 * entries header. The old two-up Participants / Valid entries block that lived
 * in Standings is gone, as is the "Contest configuration" band that used to
 * head ENTRIES — the organizer's contest copy lives in SETTINGS.
 *
 * SETTINGS follows the MVP's newer, quieter shape: a one-line "Contest
 * information" summary (the name/description/rules dump moved out — Details
 * already renders all three), Automatic settlement and Award corrections as
 * collapsed <details>, and a destructive Delete contest row that opens the
 * three-step ContestDeletionDrawer. Cancel and archive are gone here for the
 * same reason they are gone from the MVP: deletion replaced them.
 *
 * Live organizer writes: the copy edit (`PUT .../update/…`, on its own route
 * behind the Edit link) and the permanent delete (`DELETE .../delete/…`, behind
 * the drawer). Reverse-award is still a stub — see TODO(api).
 * -------------------------------------------------------------------------- */

export type FeedContestAccent = "league" | "arena";

const contestAccentClasses: Record<
    FeedContestAccent,
    {
        openStatus: string;
        textStrong: string;
        textSoft: string;
        lifecycleCurrent: string;
        actionButton: string;
        borderedLink: string;
    }
> = {
    league: {
        openStatus: "border-sky-300/25 bg-sky-500/10 text-sky-100",
        textStrong: "text-sky-100",
        textSoft: "text-sky-200",
        lifecycleCurrent: "border-sky-300/50 bg-sky-500/15 text-sky-100",
        actionButton:
            "border-sky-300/35 bg-sky-500/10 text-sky-100 hover:bg-sky-500/15",
        borderedLink: "border-sky-300/30 text-sky-100 hover:bg-sky-500/10",
    },
    arena: {
        openStatus: "border-violet-300/25 bg-violet-500/10 text-violet-100",
        textStrong: "text-violet-100",
        textSoft: "text-violet-200",
        lifecycleCurrent: "border-violet-300/50 bg-violet-500/15 text-violet-100",
        actionButton:
            "border-violet-300/35 bg-violet-500/10 text-violet-100 hover:bg-violet-500/15",
        borderedLink: "border-violet-300/30 text-violet-100 hover:bg-violet-500/10",
    },
};

/** FEED_CONTEST_EDITABLE_STATUSES — where a copy edit still means something. */
const CONTEST_EDITABLE_STATUSES = [
    "draft",
    "scheduled",
    "open",
    "locked",
    "grading",
];

/** The MVP's auto-void grace: 24 h past the contest's expected end. */
const AUTO_VOID_GRACE_MS = 24 * 60 * 60 * 1000;

type ContestUiPhase = "draft" | "open" | "locked" | "finalized";

/**
 * The MVP's four display phases, over this backend's eight `lifecycle_status`
 * values. 'scheduled' reads as open on purpose — the MVP has no phase for it,
 * and the `Opens <date>` header label is what tells the two apart.
 */
const contestUiPhase = (contest: FeedContest): ContestUiPhase => {
    switch (contest.lifecycle_status) {
        case "draft":
            return "draft";
        case "locked":
        case "grading":
            return "locked";
        case "final":
        case "archived":
            return "finalized";
        default:
            return "open";
    }
};

// Both the status and the stamp are checked: a row can carry either alone, and
// the stamp is what the MVP reads.
const isContestArchived = (contest: FeedContest) =>
    Boolean(contest.archived_at) || contest.lifecycle_status === "archived";

const isContestCanceled = (contest: FeedContest) =>
    Boolean(contest.canceled_at) || contest.lifecycle_status === "canceled";

const contestFormatLabel = (template: string) => {
    if (template === "multi_pick") return "General Combo";
    if (template === "sunday_pickem") return "NFL Sunday Pick’em";
    if (template === "same_game_combo_challenge") return "Legacy Same-Game Combo";
    return "Legacy Single Pick";
};

/** Multi-sport contests collapse to one "Multi" chip, exactly as the cards do. */
const headerSportChips = (contest: FeedContest) => {
    const sports = contest.sports?.filter(Boolean) ?? [];
    if (sports.length > 1) return ["Multi"];
    return sports.length ? sports : [contest.sport];
};

const eligibleSlateSportsLabel = (contest: FeedContest) =>
    contest.sports?.filter(Boolean).join(", ") || contest.sport;

const contestScoringLabel = (contest: FeedContest) => {
    if (contest.template === "sunday_pickem") {
        return `Correct picks first · odds points + ${contest.pickem_correct_bonus ?? 2} per correct winner`;
    }
    if (contest.template === "multi_pick") {
        const minimum = contest.minimum_odds
            ? ` · minimum +${contest.minimum_odds}`
            : "";
        return `All-or-nothing · between ${contest.minimum_legs ?? 2} and ${contest.maximum_legs ?? 8} legs${minimum}`;
    }
    return "Legacy contest scoring";
};

const gameKickoffLabel = (startsAt: string) => {
    const kickoff = new Date(startsAt);
    return Number.isNaN(kickoff.getTime())
        ? "—"
        : gameKickoffFormatter.format(kickoff);
};

const kickoffSortKey = (game: FeedContestGameSnapshot) => {
    const kickoff = Date.parse(game.starts_at);
    return Number.isNaN(kickoff) ? Number.MAX_SAFE_INTEGER : kickoff;
};

const gameMatchupLabel = (game: FeedContestGameSnapshot) =>
    game.away_team && game.home_team
        ? `${game.away_team} @ ${game.home_team}`
        : game.matchup || "Included matchup";

type DetailTab = "standings" | "entries" | "details" | "settings";

const DETAIL_TABS: readonly DetailTab[] = [
    "standings",
    "entries",
    "details",
    "settings",
];

/**
 * One finalized standing whose confirmed award the organizer may still reverse.
 * The MVP derives this from the standings rows joined against the community
 * point ledger; here it is the shape the Award corrections list reads, waiting
 * on both endpoints. See the TODO(api) beside `awardCorrectionRows`.
 */
type AwardCorrectionRow = {
    entryId: string;
    userId: string;
    userName: string;
    rank: number;
    /** The contest's contextual point value for this rank. */
    points: number;
    /** The award actually landed in the ledger. */
    awarded: boolean;
    /** A reversal was already recorded against it. */
    reversed: boolean;
};

export type FeedContestDetailProps = {
    contestId: string;
    backHref: string;
    /** Where the organizer's "Edit contest copy" link goes. Omit to hide it. */
    editHref?: string;
    /** Where the member's "build entry" CTA goes. Omit to hide it. */
    entryHref?: string;
    /**
     * Arena capacity, for the arena-only capacity fact. Omit (or pass null) for
     * a League Feed contest, which has no per-contest participant limit.
     */
    participantLimit?: number | null;
    /**
     * FALSE disables every organizer write without hiding it — the MVP's hosting
     * gate (an Arena in `paused` / `cleanup` may operate nothing). A League has
     * no hosting state, so it never passes this.
     */
    writable?: boolean;
    accent?: FeedContestAccent;
};

/**
 * The group name, the viewer's role and `is_organizer` all ride on the detail
 * response, so this screen needs NO group fetch of its own. That is not just an
 * optimization: `state.group.group` is a single-tenant slot shared by every
 * group screen, and reading it here would reintroduce the wrong-group-for-one-
 * commit hazard that useScopedGroup exists to close.
 */
export const FeedContestDetail = ({
    contestId,
    backHref,
    editHref,
    entryHref,
    participantLimit,
    writable = true,
    accent = "league",
}: FeedContestDetailProps) => {
    const accentClasses = contestAccentClasses[accent];
    const router = useRouter();
    const searchParams = useSearchParams();
    const dispatch = useDispatch();
    const { setToast } = useToast();
    const currentUser = useCurrentUser();
    const {
        detail,
        detailError,
        deleteLoading,
        deleteError,
        deletedContestId,
        deletedEntrantsNotified,
        entries,
        entriesLoading,
        entriesError,
        leaderboard,
        leaderboardLoading,
        leaderboardError,
        stats,
        statsError,
    } = useSelector((state: RootState) => state.feedContest);
    // The MVP's inline action result line, rendered above the panels.
    const [feedback, setFeedback] = useState<string>();
    /** The standing row whose inline reversal form is open, keyed by user id. */
    const [reversalTarget, setReversalTarget] = useState<string>();
    const [reversalReason, setReversalReason] = useState("");
    /** Which page of the standings board has been asked for. "Show more" bumps it. */
    const [standingsPage, setStandingsPage] = useState(1);
    const [deletionDrawerOpen, setDeletionDrawerOpen] = useState(false);
    // Focus returns to the row's own button when the drawer closes, so a
    // keyboard organizer is not dropped back at the top of the panel.
    const deletionTriggerRef = useRef<HTMLButtonElement>(null);
    /*
     * The drawer awaits ONE promise per submit and decides from its result
     * whether to close or to hold the organizer on the confirm step with the
     * error inline. Redux answers asynchronously, so the resolver is parked here
     * and settled by the outcome effect below — the alternative, resolving
     * optimistically at dispatch time, would close the drawer on a 409 and lose
     * both the message and the phrase they typed.
     */
    const deleteResolverRef = useRef<
        ((result: ContestDeletionResult) => void) | null
    >(null);

    useEffect(() => {
        if (!contestId) return;
        dispatch(fetchFeedContestDetailRequest({ contest_id: contestId }));
    }, [dispatch, contestId]);

    // The detail slot is single-tenant and shared by every contest screen, so it
    // is dropped on the way out — otherwise the next contest opened renders this
    // one's name, slate and rules until its own read lands. The entries slot has
    // the same problem and a sharper consequence: it would show another
    // contest's field, including who entered. `stats` and `leaderboard` are the
    // same again: left behind, the next contest's Standings tab opens on THIS
    // contest's numbers and board until its own reads land.
    useEffect(() => () => {
        dispatch(clearFeedContestDetail());
        dispatch(clearFeedContestEntries());
        dispatch(clearFeedContestStats());
        dispatch(clearFeedContestLeaderboard());
    }, [dispatch]);

    /*
     * ONE place reports the delete: it settles the drawer's pending promise,
     * toasts, clears the slice message so a re-render cannot report twice, and
     * on success routes back — the contest this screen is built on no longer
     * exists, so staying here would 404 on the next read.
     *
     * The `deletedContestId === contestId` guard is what makes a receipt left
     * behind by an abandoned delete harmless: it belongs to another contest and
     * is ignored rather than navigating this one away.
     */
    useEffect(() => {
        if (deleteLoading) return;
        const failed = Boolean(deleteError);
        const succeeded = Boolean(deletedContestId && deletedContestId === contestId);
        if (!failed && !succeeded) return;

        const resolve = deleteResolverRef.current;
        deleteResolverRef.current = null;

        if (failed) {
            const message = deleteError ?? "Failed to delete the contest";
            resolve?.({ success: false, error: message });
            setFeedback(message);
            setToast({ id: Date.now(), type: "error", message, duration: 4000 });
            dispatch(clearFeedContestDeleteState());
            return;
        }

        resolve?.({ success: true });
        setToast({
            id: Date.now(),
            type: "success",
            message:
                deletedEntrantsNotified === 0
                    ? "Contest deleted. No entrants needed a notification."
                    : `Contest deleted. ${deletedEntrantsNotified} ${deletedEntrantsNotified === 1 ? "entrant" : "entrants"
                    } notified.`,
            duration: 3000,
        });
        dispatch(clearFeedContestDeleteState());
        setDeletionDrawerOpen(false);
        router.replace(backHref);
    }, [
        backHref,
        contestId,
        deleteError,
        deleteLoading,
        deletedContestId,
        deletedEntrantsNotified,
        dispatch,
        router,
        setToast,
    ]);

    // Checked during RENDER, not in an effect: a record belonging to any other
    // id is never read, whatever the loading flag says (see useScopedGroup).
    const scoped = detail?.contest?.id === contestId ? detail : null;
    const contest = scoped?.contest ?? null;
    const organizer = scoped?.viewer?.is_organizer ?? false;
    const scopedEntries = entries?.contest?.id === contestId ? entries : null;
    const scopedStats = stats?.contest?.id === contestId ? stats : null;

    const availableTabs = useMemo<readonly DetailTab[]>(
        () => DETAIL_TABS.filter((tab) => tab !== "settings" || organizer),
        [organizer]
    );

    // The MVP also accepts its two legacy deep-link aliases.
    const requestedTabValue = searchParams.get("tab");
    const requestedTab: DetailTab | null =
        requestedTabValue === "my-entry"
            ? "entries"
            : requestedTabValue === "manage"
                ? "settings"
                : DETAIL_TABS.includes(requestedTabValue as DetailTab)
                    ? (requestedTabValue as DetailTab)
                    : null;

    // The MVP's rule: a contest that has stopped taking entries opens on its
    // numbers, everything else opens on the field. Restored now that Standings
    // carries the real tally.
    const defaultTab: DetailTab =
        contest && ["locked", "finalized"].includes(contestUiPhase(contest))
            ? "standings"
            : "entries";
    const [activeTab, setActiveTab] = useState<DetailTab>(
        requestedTab && availableTabs.includes(requestedTab)
            ? requestedTab
            : defaultTab
    );

    useEffect(() => {
        setActiveTab(
            requestedTab && availableTabs.includes(requestedTab)
                ? requestedTab
                : defaultTab
        );
    }, [availableTabs, defaultTab, requestedTab]);

    // Deferred to the tab that renders it, so opening the Details or Settings
    // tab costs one request rather than two. The slice drops the slot on an id
    // mismatch, so a re-entry after navigating between contests always re-reads.
    // Hoisted so the effect below can depend on the STATUS rather than on the
    // contest object, whose identity changes on every lifecycle merge.
    const lifecycleStatus = contest?.lifecycle_status;

    useEffect(() => {
        if (activeTab !== "entries" || !contestId) return;
        // A draft has no field, and its panel is the publish prompt — so the read
        // is skipped entirely rather than fetching an empty list. Waits for the
        // detail read, since the status is what decides.
        if (!lifecycleStatus || lifecycleStatus === "draft") return;
        dispatch(fetchFeedContestEntriesRequest({ contest_id: contestId }));
    }, [activeTab, contestId, dispatch, lifecycleStatus]);

    // The tally behind the Standings tab. Deferred the same way the field is, and
    // skipped for a draft for the same reason — every number would be zero, and
    // the endpoint answers 404 to anyone but the organizer anyway.
    useEffect(() => {
        if (activeTab !== "standings" || !contestId) return;
        if (!lifecycleStatus || lifecycleStatus === "draft") return;
        dispatch(fetchFeedContestStatsRequest({ contest_id: contestId }));
    }, [activeTab, contestId, dispatch, lifecycleStatus]);

    /*
     * The board itself. A SECOND read alongside the tally rather than one call:
     * the counts never grow with the size of the field and the board does, so
     * "Show more" pages this one without re-reading the numbers.
     *
     * `standingsPage` is reset whenever the contest changes, so a board opened
     * three pages deep does not ask the next contest for page 4 — which would
     * come back empty and read as "no standings".
     */
    useEffect(() => {
        setStandingsPage(1);
    }, [contestId]);

    useEffect(() => {
        if (activeTab !== "standings" || !contestId) return;
        if (!lifecycleStatus || lifecycleStatus === "draft") return;
        dispatch(
            fetchFeedContestLeaderboardRequest({
                contest_id: contestId,
                page: standingsPage,
            })
        );
    }, [activeTab, contestId, dispatch, lifecycleStatus, standingsPage]);

    const setDetailTab = (tab: DetailTab) => {
        if (!availableTabs.includes(tab)) return;
        setActiveTab(tab);
        const params = new URLSearchParams(searchParams.toString());
        params.set("tab", tab);
        router.replace(`?${params.toString()}`, { scroll: false });
    };

    // Kickoff order, not the order the wizard happened to send: the slate reads
    // as a schedule. An unparsable kickoff sorts last rather than poisoning the
    // comparator with NaN.
    const includedGames = useMemo(() => {
        const games = contest?.eligible_games_json ?? [];
        return [...games].sort(
            (left, right) =>
                kickoffSortKey(left) - kickoffSortKey(right) ||
                gameMatchupLabel(left).localeCompare(gameMatchupLabel(right))
        );
    }, [contest?.eligible_games_json]);

    if (!contest) {
        // No error yet means the read has not answered — including the very first
        // commit, before the fetch effect has even run. Only a reported failure
        // renders the dead end.
        if (!detailError) {
            return (
                <div className="flex flex-col gap-2 pb-10">
                    <BackButton fallback={backHref} preferFallback />
                    <div className="mt-3 h-6 w-2/3 animate-pulse rounded bg-white/[0.06]" />
                    <div className="mt-2 grid grid-cols-4 gap-1">
                        {[0, 1, 2, 3].map((key) => (
                            <div
                                key={key}
                                className="h-10 animate-pulse rounded-t-xl bg-white/[0.04]"
                            />
                        ))}
                    </div>
                    <div className="space-y-3 border-t border-white/10 pt-6">
                        {[0, 1, 2, 3, 4].map((key) => (
                            <div
                                key={key}
                                className="h-4 animate-pulse rounded bg-white/[0.04]"
                                style={{ width: `${90 - key * 12}%` }}
                            />
                        ))}
                    </div>
                </div>
            );
        }

        return (
            <div className="space-y-5 pb-10">
                <BackButton fallback={backHref} preferFallback />
                <section className="rounded-xl border border-dashed border-white/15 bg-black/30 p-6">
                    <h1 className="font-semibold text-white">Contest unavailable</h1>
                    <p className="mt-2 text-sm leading-6 text-gray-500">
                        {detailError ||
                            "This Feed contest could not be found in this group."}
                    </p>
                </section>
            </div>
        );
    }

    const phase = contestUiPhase(contest);
    const archived = isContestArchived(contest);
    const canceled = isContestCanceled(contest);
    /**
     * Has the field opened up. The lock CLOCK is checked as well as the status,
     * because the cron that flips 'open' -> 'locked' runs on an interval: between
     * locks_at and that sweep the contest is past its deadline but still reads as
     * open. A canceled contest never reveals.
     */
    const entriesArePublic =
        !canceled &&
        (["locked", "finalized"].includes(phase) ||
            Date.now() >= Date.parse(contest.locks_at));

    const opensInFuture =
        phase === "open" &&
        Boolean(contest.opens_at) &&
        Date.now() < Date.parse(contest.opens_at ?? "");
    const phaseLabel = archived
        ? "Archived"
        : canceled
            ? "Canceled"
            : opensInFuture
                ? `Opens ${formatContestDateTime(contest.opens_at)}`
                : phase === "finalized"
                    ? "Finalized"
                    : phase[0].toUpperCase() + phase.slice(1);
    const isArenaContest = scoped?.context_type === "arena";

    /* ---------- Standings tab: the header summary ----------
     *
     * The MVP moved the counts apart: the ENTRIES tab owns "N submitted" (our
     * entries panel already prints it, from `summary.entered_count`) and
     * Standings keeps only a compact right-aligned figure in its header. The old
     * two-up Participants / Valid entries block is gone from both.
     */
    const isFrozenFinal = phase === "finalized";
    const standingsPhase = isFrozenFinal
        ? "final"
        : entriesArePublic
            ? "live"
            : "preview";
    const scopedLeaderboard =
        leaderboard?.contest?.id === contestId ? leaderboard : null;
    // Rows ON THE BOARD, not rows on this page — the board is paginated and the
    // header is reporting the size of the field.
    const standingsRowCount = scopedLeaderboard?.pagination.total ?? 0;
    // The MVP's ladder. Its "Live standings" rung is gated on the field being
    // public as well as on having rows: `contest_leaderboard` is seeded the
    // moment a member enters, so a pre-lock board is a preview, not a scoreboard.
    // The draft rung is ours — the MVP has no draft phase on this screen.
    const standingsTitle =
        phase === "draft"
            ? "Standings unlock after publish"
            : isFrozenFinal
                ? "Final standings"
                : entriesArePublic && standingsRowCount
                    ? "Live standings"
                    : entriesArePublic
                        ? "Live standings are settling"
                        : "Standings preview";
    /*
     * The MVP prints ONE number under both labels, because over there a member
     * is not a participant until they hold an entry. This backend splits the
     * two, so each label gets the field it actually names: `active` is what
     * `participant_count` and the capacity denominator mean, and `entries.total`
     * is what "entries" means.
     */
    const standingsParticipantCount = scopedStats?.counts.participants.active ?? 0;
    const standingsEntryCount = scopedStats?.counts.entries.total ?? 0;
    // A draft is never counted and an error has nothing to count, so the figure
    // skeletons only while a real read is genuinely in flight.
    const standingsCountsPending =
        phase !== "draft" && !statsError && !scopedStats;

    /*
     * The MVP's entry-view policy. Arena staff who opted their own contest in to
     * staff participation get a My-entry / All-entries switch, because they are
     * both a competitor and the organizer; everyone else gets one view.
     *
     * `canViewAllEntries` is the MVP's rule from policies.ts: the field opens to
     * everyone once it is public, and before that only to arena staff who are
     * NOT themselves competing — a live participant must not read the field
     * early, whatever else they can do.
     */
    const isArenaStaffViewer = isArenaContest && organizer;
    const canParticipate = scoped?.viewer?.can_participate ?? false;
    /*
     * Did the viewer accept the rules that are live NOW. A never-accepted row
     * reads as current rather than stale: the copy matrix only consults this for
     * an eligible / opted_in member, and telling someone who has not started that
     * "the rules changed" would be wrong.
     */
    const acceptedRulesVersion = contest.my_participation?.rules_version_accepted;
    const rulesCurrent =
        !acceptedRulesVersion || acceptedRulesVersion === contest.rules_version;
    const isLiveParticipant = ["opted_in", "entered", "locked", "completed"].includes(
        contest.my_participation?.status ?? ""
    );
    const showStaffEntrySubtabs =
        isArenaStaffViewer && Boolean(contest.allow_staff_participation) && canParticipate;
    const canViewAllEntries =
        entriesArePublic || (isArenaStaffViewer && !isLiveParticipant);
    // Which view a viewer WITHOUT the sub-tabs lands on: an organizer who cannot
    // enter has no receipt of their own to show, so the field is all there is.
    const defaultEntryView: "mine" | "all" =
        isArenaStaffViewer && !canParticipate
            ? "all"
            : entriesArePublic
                ? "all"
                : "mine";
    const contextName =
        scoped?.group?.name?.trim() || (isArenaContest ? "Arena" : "League");
    const participantCapacityLabel = `${contest.participant_count ?? 0} / ${
        participantLimit === null || participantLimit === undefined
            ? "Unlimited"
            : participantLimit
    }`;

    /*
     * The Details tab's dt/dd grid. `wide` spans both columns — only Scoring
     * takes it, because its sentence is the one long enough to wrap badly in a
     * half-width cell. The two arena facts are spread in LAST: a League Feed
     * contest has no participant cap and its commissioner always competes.
     *
     * No timezone suffix on the two stamps: formatContestDateTime already emits
     * a `timeZoneName: "short"` token, so "· local time" was saying it twice.
     */
    const contestDetailFacts: {
        label: string;
        value: React.ReactNode;
        wide?: boolean;
    }[] = [
        { label: "Format", value: contestFormatLabel(contest.template) },
        {
            label: "Opens",
            value: contest.opens_at
                ? formatContestDateTime(contest.opens_at)
                : "When published",
        },
        { label: "Entries lock", value: formatContestDateTime(contest.locks_at) },
        {
            label: "Settlement",
            value: "Automatic after the last included matchup is final",
        },
        { label: "Scoring", value: contestScoringLabel(contest), wide: true },
        ...(isArenaContest
            ? [
                {
                    label: "Participant capacity",
                    value: `${participantCapacityLabel} spots used`,
                },
                {
                    label: "Owner and manager participation",
                    value: contest.allow_staff_participation
                        ? "Allowed · each staff entrant uses a contest participant spot"
                        : "Not allowed for this contest",
                },
                // `entry_access_mode` rides on the list AND detail columns, so
                // this fact costs no extra read. A League has no room to stand
                // in and is pinned to 'open', which is why it sits in here.
                {
                    label: "Entry access",
                    value:
                        contest.entry_access_mode === "venue_check_in_required"
                            ? "Venue Check-In Required · an active verified venue session is needed to submit or replace an entry"
                            : "Open to Arena members · entries can be submitted from anywhere",
                    wide: true,
                },
            ]
            : []),
    ];

    /*
     * The MVP's canEditContest, minus one clause it can evaluate and we cannot:
     * "no member has joined yet". `PUT /update/:contest_id` freezes the copy on
     * `opted_in_at IS NOT NULL`, and `participant_count` does not answer that
     * (it counts every non-withdrawn/disqualified row). So the link can be
     * offered on a contest whose copy is already frozen, and the save then
     * returns a 409 that the edit form surfaces verbatim.
     * TODO(api): add `viewer.can_edit` to the detail response and AND it in here,
     * so the button and the endpoint agree before the round trip.
     */
    const canEditContest =
        ["multi_pick", "sunday_pickem"].includes(contest.template) &&
        CONTEST_EDITABLE_STATUSES.includes(contest.lifecycle_status) &&
        !canceled &&
        !archived;

    /* ---------- Entries tab: the member's "build entry" CTA ----------
     *
     * Derived CLIENT-SIDE, and deliberately NOT from `viewer.can_participate`.
     * That flag is hardcoded false for `context_type: 'league_feed'` — it was
     * written when join and entry really were arena-only — while
     * `POST /group/feed-contest/enter/:contest_id` now serves both surfaces and
     * succeeds for a League member. Reading it here would hide the CTA on every
     * League contest.
     * TODO(api): fix `can_participate` (or add `viewer.can_enter`) so the button
     * and the endpoint cannot disagree; the entry screen then AND-s it in.
     *
     * The window mirrors the server's `isFeedContestEnterable`: open, published,
     * not called off, past `opens_at` and before `locks_at`.
     */
    const entryParticipation = contest.my_participation ?? null;
    const entryParticipantStatus = entryParticipation?.status ?? null;
    const canEnterContest =
        writable &&
        contest.entry_model === "multi_pick" &&
        contest.lifecycle_status === "open" &&
        !canceled &&
        !archived &&
        !opensInFuture &&
        Date.now() < Date.parse(contest.locks_at) &&
        // A locked, completed, withdrawn or disqualified participant is past the
        // point where either write applies.
        !["locked", "completed", "withdrawn", "disqualified", "missed_deadline"].includes(
            entryParticipantStatus ?? ""
        );
    // The MVP's three labels: joining and entering are ONE action, so a member
    // with no participation row is told so rather than being sent to "review".
    const entryCtaLabel = !entryParticipation
        ? "Build entry and join contest"
        : entryParticipantStatus === "entered"
            ? "Replace entry"
            : "Build contest entry";
    /**
     * The MVP's `canJoin` — the entry window is open and this viewer holds no
     * participation row at all. It routes the CTA to the header's inline arrow
     * link instead of the pill under the receipt, and reframes the section from
     * "Your entry" (a record) to "Entry status" (an invitation).
     */
    const canJoinContest = canEnterContest && !entryParticipation;

    /* ---------- Settings tab: derived state + the organizer writes ---------- */

    /*
     * The one-line status under "Contest information". The MVP has a fourth
     * branch — "Read only · locked after the first accepted entry" — that is
     * omitted here for the same reason `canEditContest` omits its clause: no
     * response tells us whether anyone has opted in yet, and printing that
     * sentence beside a still-live Edit link would contradict itself.
     * TODO(api): with `viewer.can_edit` on the detail response, restore it.
     */
    const contestInformationSummary = canEditContest
        ? "Name, description, and rules can still be updated until the first entry is accepted."
        : phase === "finalized"
            ? "Read only · finalized contest setup stays fixed."
            : !writable
                ? "Read only in the current Arena state."
                : "Read only in the current contest phase.";

    const settlementStatus =
        phase === "finalized"
            ? "Completed automatically"
            : phase === "locked"
                ? "Settling automatically"
                : `Locks ${formatContestDateTime(contest.locks_at)}`;

    const autoVoidAt = contest.expected_ends_at
        ? new Date(
            Date.parse(contest.expected_ends_at) + AUTO_VOID_GRACE_MS
        ).toISOString()
        : null;

    /*
     * The MVP builds these from the finalized standings joined against the
     * community point ledger — which award landed for whom, and which was
     * already reversed. Neither read exists here yet, so the list is empty and
     * the section renders its own awaiting-data note. Wiring is to fill this
     * array; every row below already reads from it.
     * TODO(api): needs the finalized standings (rank / points per entrant) and
     * the point ledger for this contest.
     */
    const awardCorrectionRows: AwardCorrectionRow[] = [];
    const reversibleAwardCount = awardCorrectionRows.filter(
        (row) => writable && row.awarded && !row.reversed && row.points > 0
    ).length;
    const reversedAwardCount = awardCorrectionRows.filter(
        (row) => row.reversed
    ).length;
    const awardCorrectionSummary = !awardCorrectionRows.length
        ? "Confirmed awards appear here once the standings read lands."
        : reversibleAwardCount > 0
            ? `${reversibleAwardCount} ${reversibleAwardCount === 1 ? "award" : "awards"
            } available to reverse`
            : reversedAwardCount === awardCorrectionRows.length
                ? `${reversedAwardCount} ${reversedAwardCount === 1 ? "award" : "awards"
                } reversed`
                : `${awardCorrectionRows.length} confirmed ${awardCorrectionRows.length === 1 ? "award" : "awards"
                }`;

    // The MVP counts distinct entrants for the deletion notice. `participant_count`
    // is this backend's nearest equivalent — it already excludes withdrawn and
    // disqualified rows — and the Standings read refines it once that tab has run.
    const entrantCount =
        scopedStats?.counts?.participants?.active ?? contest.participant_count ?? 0;

    // TODO(api): still a STUB — a whole-award audit reversal for one finalized
    // standing row has no endpoint. Everything around it is final: wiring is to
    // replace the message below with the dispatch. It is also currently
    // unreachable, since the rows that open this form need the standings read.
    const handleReverseAward = (userId: string) => {
        if (!userId || !writable) return;
        const reason = reversalReason.trim();
        // Kept client-side even though the endpoint will re-check it: an award
        // reversal with no audit reason is the one thing this form exists to
        // prevent, and it stays open until one is written.
        if (!reason) {
            setFeedback("Add an audit reason before reversing an award.");
            return;
        }
        // TODO(api): dispatch(reverseFeedContestAwardRequest({
        //     contest_id: contest.id, user_id: userId, reason,
        // })) → "The confirmed award was reversed with an audit record."
        const message = "Reversing a confirmed award is not available yet.";
        setFeedback(message);
        setToast({ id: Date.now(), type: "info", message, duration: 3000 });
        setReversalTarget(undefined);
        setReversalReason("");
    };

    /*
     * DELETE /group/feed-contest/delete/:contest_id. The drawer will not call
     * this unless the organizer typed `DELETE <name>` exactly and acknowledged
     * the impact — the server has no confirmation-name field, so that phrase is
     * enforced here and nowhere else.
     *
     * The returned promise is settled by the outcome effect above, not here:
     * the drawer stays on its confirm step, with its button spinning, until the
     * server actually answers. `organizer_note` is optional to the endpoint and
     * required by the drawer, so it is always present by the time we get here.
     */
    const handleDeleteContest = (organizerNote: string) =>
        new Promise<ContestDeletionResult>((resolve) => {
            if (!writable) {
                resolve({
                    success: false,
                    error: "This contest cannot be changed in the current Arena state.",
                });
                return;
            }
            // Defensive: the drawer serialises its own submits, so a second
            // resolver can only appear if that guard ever regresses. Settle the
            // orphan rather than dropping it, or its drawer hangs forever.
            deleteResolverRef.current?.({
                success: false,
                error: "That deletion was superseded. Try again.",
            });
            deleteResolverRef.current = resolve;
            dispatch(
                deleteFeedContestRequest({
                    contest_id: contest.id,
                    organizer_note: organizerNote,
                })
            );
        });

    return (
        <div className="flex flex-col gap-2 pb-10">
            <header className="-mx-5 pb-4 pl-5 pr-2 sm:mx-0 sm:px-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <BackButton
                        fallback={backHref}
                        preferFallback
                        className="shrink-0 py-1"
                    />
                    <div className="flex flex-wrap justify-end gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                        <span
                            className={`rounded-full border px-2 py-1 ${accentClasses.openStatus}`}
                        >
                            {phaseLabel}
                        </span>
                        <span className="rounded-full bg-white/5 px-2 py-1">
                            {formatContestDateTime(contest.opens_at ?? contest.created_at)}{" "}
                            to{" "}
                            {formatContestDateTime(
                                contest.expected_ends_at ?? contest.locks_at
                            )}
                        </span>
                        {headerSportChips(contest).map((sport) => (
                            <span key={sport} className="rounded-full bg-white/5 px-2 py-1">
                                {sport}
                            </span>
                        ))}
                    </div>
                </div>
                <div className="mt-2.5 flex min-w-0 items-center gap-2 text-base font-semibold sm:text-lg lg:gap-3 lg:text-xl">
                    <span className="min-w-0 max-w-[45%] truncate text-gray-400">
                        {contextName}
                    </span>
                    <span className="shrink-0 text-gray-600">/</span>
                    <h1 className="min-w-0 flex-1 truncate text-base font-semibold text-white sm:text-lg lg:text-xl">
                        {contest.name}
                    </h1>
                </div>
            </header>

            <section className="-mx-5 -mt-3 border-b border-white/10 px-1 pb-0 pt-2 sm:mx-0">
                <div
                    role="tablist"
                    aria-label="Contest sections"
                    className="grid w-full items-end gap-1"
                    style={{
                        gridTemplateColumns: `repeat(${availableTabs.length}, minmax(0, 1fr))`,
                    }}
                    onKeyDown={(event) => {
                        if (
                            !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
                        ) {
                            return;
                        }
                        event.preventDefault();
                        const currentIndex = availableTabs.indexOf(activeTab);
                        const nextIndex =
                            event.key === "Home"
                                ? 0
                                : event.key === "End"
                                    ? availableTabs.length - 1
                                    : event.key === "ArrowRight"
                                        ? (currentIndex + 1) % availableTabs.length
                                        : (currentIndex - 1 + availableTabs.length) %
                                        availableTabs.length;
                        const next = availableTabs[nextIndex];
                        setDetailTab(next);
                        document.getElementById(`contest-tab-${next}`)?.focus();
                    }}
                >
                    {availableTabs.map((tab) => {
                        const selected = tab === activeTab;
                        const label = tab[0].toUpperCase() + tab.slice(1);
                        return (
                            <button
                                key={tab}
                                id={`contest-tab-${tab}`}
                                type="button"
                                role="tab"
                                aria-selected={selected}
                                aria-controls={`contest-panel-${tab}`}
                                tabIndex={selected ? 0 : -1}
                                onClick={() => setDetailTab(tab)}
                                className={`relative flex h-10 min-w-0 items-center justify-center rounded-t-xl border border-b-0 px-1 text-center text-sm font-semibold transition-colors duration-200 ease-out sm:px-3 motion-reduce:transition-none ${
                                    selected
                                        ? `border-white/10 bg-black ${accentClasses.textStrong} after:absolute after:-bottom-px after:inset-x-0 after:h-px after:bg-black after:content-['']`
                                        : "border-transparent bg-black text-gray-400 hover:border-white/10 hover:text-white"
                                }`}
                            >
                                <span className="truncate">{label}</span>
                            </button>
                        );
                    })}
                </div>
            </section>

            {activeTab === "details" ? (
                <div
                    id="contest-panel-details"
                    role="tabpanel"
                    aria-labelledby="contest-tab-details"
                    className="-mx-5 sm:mx-0"
                >
                    <section aria-label="Contest details" className="px-5 py-6 sm:px-6">
                        <header className="w-full">
                            <h2 className="text-lg font-semibold text-white">
                                Contest details
                            </h2>
                            {contest.description ? (
                                <p className="mt-2 text-sm leading-6 text-gray-400">
                                    {contest.description}
                                </p>
                            ) : null}
                        </header>

                        {/* Two-column dt/dd grid. `border-y` is load-bearing: the
                            rule below it doubles as the top rule of the games
                            disclosure, which carries only `border-b`. */}
                        <dl
                            aria-label="Contest facts"
                            className="mt-6 grid w-full gap-x-10 gap-y-5 border-y border-white/10 py-5 sm:grid-cols-2"
                        >
                            {contestDetailFacts.map((fact) => (
                                <div
                                    key={fact.label}
                                    className={`min-w-0 ${fact.wide ? "sm:col-span-2" : ""}`}
                                >
                                    <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500">
                                        {fact.label}
                                    </dt>
                                    <dd className="mt-1 text-sm font-medium leading-6 text-gray-200">
                                        {fact.value}
                                    </dd>
                                </div>
                            ))}
                        </dl>

                        {includedGames.length ? (
                            <details className="group w-full border-b border-white/10">
                                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 outline-none transition hover:text-white focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/30 [&::-webkit-details-marker]:hidden">
                                    <span className="min-w-0">
                                        <span className="block text-sm font-semibold text-gray-100">
                                            Included games
                                        </span>
                                        <span className="mt-0.5 block text-xs text-gray-500">
                                            {includedGames.length}{" "}
                                            {includedGames.length === 1 ? "matchup" : "matchups"} ·{" "}
                                            {eligibleSlateSportsLabel(contest)}
                                        </span>
                                    </span>
                                    <svg
                                        aria-hidden="true"
                                        viewBox="0 0 16 16"
                                        className="h-4 w-4 shrink-0 text-gray-500 transition-transform duration-200 group-open:rotate-180"
                                    >
                                        <path
                                            d="m4 6 4 4 4-4"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth="1.5"
                                        />
                                    </svg>
                                </summary>
                                <ul
                                    aria-label="Included games"
                                    className="divide-y divide-white/10 border-t border-white/10"
                                >
                                    {includedGames.map((game) => (
                                        <li
                                            key={game.game_id}
                                            className="flex min-w-0 flex-col gap-1 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4"
                                        >
                                            <span className="text-sm font-medium text-gray-200">
                                                {gameMatchupLabel(game)}
                                            </span>
                                            <span className="text-xs text-gray-500 sm:shrink-0">
                                                {game.sport} · {gameKickoffLabel(game.starts_at)} local
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </details>
                        ) : null}

                        <section
                            aria-labelledby="contest-detail-rules-title"
                            className="mt-6 w-full"
                        >
                            <div className="flex flex-wrap items-baseline justify-between gap-2">
                                <h3
                                    id="contest-detail-rules-title"
                                    className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-300"
                                >
                                    Rules
                                </h3>
                                <span className="text-[10px] uppercase tracking-[0.1em] text-gray-600">
                                    Version {contest.rules_version}
                                </span>
                            </div>
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-400">
                                {contest.rules_text}
                            </p>
                        </section>
                    </section>
                </div>
            ) : null}

            {feedback ? (
                <p
                    role="status"
                    className="border-l-2 border-white/15 py-2 pl-3 text-sm text-gray-200"
                >
                    {feedback}
                </p>
            ) : null}

            {activeTab === "standings" ? (
                <section
                    id="contest-panel-standings"
                    role="tabpanel"
                    aria-labelledby="contest-tab-standings"
                    aria-label="Contest standings"
                    data-standings-layout="responsive-list"
                    data-standings-phase={standingsPhase}
                    className="space-y-4"
                >
                    <header className="flex items-start justify-between gap-3">
                        <h2 className="min-w-0 text-lg font-semibold text-white">
                            {standingsTitle}
                        </h2>
                        <div className="shrink-0">
                            {standingsCountsPending ? (
                                // One read with no partial state, so the figure
                                // skeletons rather than flashing a zero that would
                                // read as "nobody entered".
                                <div aria-hidden="true" className="text-right">
                                    <div className="ml-auto h-2.5 w-16 animate-pulse rounded bg-white/[0.06]" />
                                    <div className="ml-auto mt-1.5 h-4 w-12 animate-pulse rounded bg-white/[0.06]" />
                                </div>
                            ) : !entriesArePublic ? (
                                <dl
                                    aria-label="Contest participation progress"
                                    data-standings-summary
                                    className="text-right"
                                >
                                    <div>
                                        <dt className="text-[9px] font-semibold uppercase tracking-[0.1em] text-gray-500">
                                            Participants
                                        </dt>
                                        <dd className="mt-0.5 flex items-baseline justify-end gap-1 text-sm font-semibold tabular-nums text-white sm:text-base">
                                            <span>{standingsParticipantCount}</span>
                                            {participantLimit !== null &&
                                                participantLimit !== undefined ? (
                                                <span className="text-[10px] font-medium text-gray-500">
                                                    / {participantLimit}
                                                </span>
                                            ) : null}
                                        </dd>
                                    </div>
                                </dl>
                            ) : (
                                <div className="text-right">
                                    {!isFrozenFinal ? (
                                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-200">
                                            Live points
                                        </p>
                                    ) : null}
                                    <p
                                        className={`${isFrozenFinal ? "" : "mt-1"} text-xs tabular-nums text-gray-500`}
                                    >
                                        {standingsRowCount} ranked · {standingsEntryCount}{" "}
                                        {standingsEntryCount === 1 ? "entry" : "entries"}
                                    </p>
                                </div>
                            )}
                        </div>
                    </header>

                    {/* The MVP's pre-lock frame carries this chip; here it sits above
                        the board, because the header slot it used to occupy is now
                        taken by the participant count. */}
                    {scopedLeaderboard && !scopedLeaderboard.is_entry_revealed ? (
                        <div className="flex justify-end">
                            <span className="rounded-full border border-white/10 bg-black/25 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.12em] text-gray-500">
                                Pre-lock · entry details hidden
                            </span>
                        </div>
                    ) : null}

                    <FeedContestStandingsPanel
                        leaderboard={scopedLeaderboard}
                        loading={leaderboardLoading}
                        error={leaderboardError}
                        isDraft={phase === "draft"}
                        isFrozenFinal={isFrozenFinal}
                        entriesArePublic={entriesArePublic}
                        winningPlaces={contest.winning_places ?? 3}
                        pointsLabel={isArenaContest ? "Arena points" : "League points"}
                        template={contest.template}
                        currentUserId={currentUser?.userId}
                        accent={accent}
                        onShowMore={() => setStandingsPage((page) => page + 1)}
                    />
                </section>
            ) : null}

            {activeTab === "entries" ? (
                <section
                    id="contest-panel-entries"
                    role="tabpanel"
                    aria-labelledby="contest-tab-entries"
                    aria-label="Entries"
                    className="overflow-visible"
                >
                    {/* One spacing for everyone now: the organizer band that used
                        to sit above this (and needed the extra top padding) moved
                        to Settings and Standings, as in the MVP. */}
                    <div className="px-1 pb-6 pt-2">
                        <FeedContestEntriesPanel
                            entries={scopedEntries}
                            loading={entriesLoading}
                            error={entriesError}
                            accent={accent}
                            currentUserId={currentUser?.userId}
                            isDraft={phase === "draft"}
                            showStaffEntrySubtabs={showStaffEntrySubtabs}
                            canViewAllEntries={canViewAllEntries}
                            defaultEntryView={defaultEntryView}
                            myParticipationStatus={contest.my_participation?.status ?? null}
                            hasParticipation={Boolean(contest.my_participation)}
                            rulesCurrent={rulesCurrent}
                            deadlinePassed={entriesArePublic}
                            opensAtLabel={
                                opensInFuture ? formatContestDateTime(contest.opens_at) : null
                            }
                            action={
                                entryHref && canEnterContest && !canJoinContest ? (
                                    <Link
                                        href={entryHref}
                                        className="inline-flex rounded-xl bg-white px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.09em] text-black transition hover:bg-gray-200"
                                    >
                                        {entryCtaLabel}
                                    </Link>
                                ) : null
                            }
                            joinAction={
                                entryHref && canJoinContest ? (
                                    <Link
                                        href={entryHref}
                                        className={`group inline-flex shrink-0 items-center gap-2 py-0.5 text-sm font-semibold transition hover:text-white ${accentClasses.textStrong}`}
                                    >
                                        <span>{entryCtaLabel}</span>
                                        <span
                                            aria-hidden
                                            className="text-base leading-none transition-transform group-hover:translate-x-1"
                                        >
                                            →
                                        </span>
                                    </Link>
                                ) : null
                            }
                        />
                    </div>
                </section>
            ) : null}

            {organizer && activeTab === "settings" ? (
                <section
                    id="contest-panel-settings"
                    role="tabpanel"
                    aria-labelledby="contest-tab-settings"
                    aria-label="Settings"
                    className="workspace-tab-panel -mx-5 divide-y divide-white/10 pt-1 sm:-mx-6"
                >
                    {/* The name / description / rules dump the MVP used to print
                        here is gone with it: all three already render in Details,
                        and Settings now says only whether they can still change. */}
                    <section
                        aria-label="Contest information"
                        className="px-5 py-6 sm:px-6"
                    >
                        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                            <div className="min-w-0 max-w-3xl">
                                <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-white">
                                    Contest information
                                </h2>
                                <p className="mt-1 text-xs leading-5 text-gray-500">
                                    {contestInformationSummary}
                                </p>
                            </div>
                            {canEditContest && editHref ? (
                                <Link
                                    href={editHref}
                                    className={`ml-auto inline-flex min-h-10 shrink-0 items-center rounded-lg border px-3.5 py-2 text-xs font-semibold transition ${accentClasses.borderedLink}`}
                                >
                                    {phase === "draft" ? "Edit draft" : "Edit details"}
                                </Link>
                            ) : (
                                <span className="ml-auto shrink-0 text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-500">
                                    Read only
                                </span>
                            )}
                        </div>
                    </section>

                    <details
                        aria-label="Automatic settlement policy"
                        className="group px-5 sm:px-6"
                    >
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 outline-none transition hover:text-white focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/30 [&::-webkit-details-marker]:hidden">
                            <span className="min-w-0">
                                <span className="block text-sm font-semibold uppercase tracking-[0.12em] text-white">
                                    Automatic settlement
                                </span>
                                <span className="mt-1 block text-xs leading-5 text-gray-500">
                                    {settlementStatus}
                                </span>
                            </span>
                            <span className="flex shrink-0 items-center gap-3">
                                <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-500">
                                    {archived ? "Archived" : canceled ? "Canceled" : phase}
                                </span>
                                <svg
                                    aria-hidden="true"
                                    viewBox="0 0 16 16"
                                    className="h-4 w-4 text-gray-500 transition-transform duration-200 group-open:rotate-180"
                                >
                                    <path
                                        d="m4 6 4 4 4-4"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="1.5"
                                    />
                                </svg>
                            </span>
                        </summary>
                        <div className="-mx-5 border-t border-white/10 sm:-mx-6">
                            <p className="px-5 py-4 text-xs leading-5 text-gray-500 sm:px-6">
                                Provider results update live standings after lock. The contest
                                settles after its last included matchup is final, with
                                unresolved selections handled by the provider grace policy.
                            </p>
                            <dl className="divide-y divide-white/10 border-t border-white/10">
                                <div className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6 sm:px-6">
                                    <dt className="text-[10px] font-semibold uppercase tracking-[0.09em] text-gray-500">
                                        Locks
                                    </dt>
                                    <dd className="text-sm text-gray-200 sm:text-right">
                                        {formatContestDateTime(contest.locks_at)}
                                    </dd>
                                </div>
                                <div className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6 sm:px-6">
                                    <dt className="text-[10px] font-semibold uppercase tracking-[0.09em] text-gray-500">
                                        Settlement
                                    </dt>
                                    <dd className="text-sm text-gray-200 sm:text-right">
                                        After the last included matchup is final
                                    </dd>
                                </div>
                                <div className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6 sm:px-6">
                                    <dt className="text-[10px] font-semibold uppercase tracking-[0.09em] text-gray-500">
                                        Auto-void cutoff
                                    </dt>
                                    <dd className="text-sm text-gray-200 sm:text-right">
                                        {formatContestDateTime(autoVoidAt)}
                                    </dd>
                                </div>
                            </dl>
                        </div>
                    </details>

                    {/* The MVP drops this disclosure entirely when it has no rows.
                        We keep it on a finalized contest so the organizer is told
                        WHY it is empty — the standings + ledger reads it maps over
                        do not exist yet (see the TODO(api) on awardCorrectionRows).
                        `!canceled` because a contest that was called off and then
                        archived reads as the finalized phase but never had awards. */}
                    {phase === "finalized" && !canceled ? (
                        <details
                            aria-label="Award corrections"
                            className="group px-5 sm:px-6"
                        >
                            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 outline-none transition hover:text-white focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/30 [&::-webkit-details-marker]:hidden">
                                <span className="min-w-0">
                                    <span className="block text-sm font-semibold uppercase tracking-[0.12em] text-white">
                                        Award corrections
                                    </span>
                                    <span className="mt-1 block text-xs leading-5 text-gray-500">
                                        {awardCorrectionSummary}
                                    </span>
                                </span>
                                <svg
                                    aria-hidden="true"
                                    viewBox="0 0 16 16"
                                    className="h-4 w-4 shrink-0 text-gray-500 transition-transform duration-200 group-open:rotate-180"
                                >
                                    <path
                                        d="m4 6 4 4 4-4"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="1.5"
                                    />
                                </svg>
                            </summary>
                            <div className="-mx-5 border-t border-white/10 sm:-mx-6">
                                <p className="px-5 py-4 text-xs leading-5 text-gray-500 sm:px-6">
                                    A correction reverses the full confirmed award and creates a
                                    permanent audit record. Rank and point values cannot be
                                    edited.
                                </p>
                                {awardCorrectionRows.length ? (
                                    <ul className="divide-y divide-white/10 border-t border-white/10">
                                        {awardCorrectionRows.map((row) => (
                                            <li key={row.entryId} className="px-5 py-4 sm:px-6">
                                                <div className="flex flex-wrap items-center justify-between gap-3">
                                                    <div>
                                                        <p className="text-sm font-semibold text-white">
                                                            {row.userName}
                                                        </p>
                                                        <p className="mt-1 text-xs text-gray-500">
                                                            #{row.rank} · {row.points} confirmed points
                                                            {row.reversed ? " · reversed" : ""}
                                                        </p>
                                                    </div>
                                                    {writable &&
                                                        row.awarded &&
                                                        !row.reversed &&
                                                        row.points > 0 ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setReversalTarget(row.userId);
                                                                setReversalReason("");
                                                            }}
                                                            className="ml-auto rounded-lg border border-red-300/30 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-red-200 transition hover:bg-red-500/10"
                                                        >
                                                            Reverse award
                                                        </button>
                                                    ) : null}
                                                </div>
                                                {reversalTarget === row.userId ? (
                                                    <section
                                                        aria-labelledby="reverse-award-title"
                                                        className="mt-4 border-t border-white/10 pt-4"
                                                    >
                                                        <h3
                                                            id="reverse-award-title"
                                                            className="text-sm font-semibold text-red-100"
                                                        >
                                                            Reverse {row.userName}’s {row.points}-point
                                                            award?
                                                        </h3>
                                                        <p className="mt-1 text-xs leading-5 text-gray-500">
                                                            This creates a permanent whole-award reversal.
                                                            Rank and point values cannot be changed.
                                                        </p>
                                                        <label className="mt-4 block text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-400">
                                                            Audit reason
                                                            <textarea
                                                                autoFocus
                                                                rows={3}
                                                                value={reversalReason}
                                                                onChange={(event) =>
                                                                    setReversalReason(event.target.value)
                                                                }
                                                                className="mt-2 w-full rounded-lg border border-white/15 bg-black/30 px-3.5 py-3 text-sm font-normal normal-case tracking-normal text-white outline-none focus:border-red-200/50"
                                                            />
                                                        </label>
                                                        <div className="mt-3 flex flex-wrap justify-end gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setReversalTarget(undefined);
                                                                    setReversalReason("");
                                                                }}
                                                                className="min-h-10 rounded-lg px-3.5 py-2 text-xs font-semibold text-gray-300 transition hover:bg-white/[0.05] hover:text-white"
                                                            >
                                                                Cancel
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleReverseAward(row.userId)}
                                                                disabled={!reversalReason.trim()}
                                                                className="min-h-10 rounded-lg bg-red-100 px-3.5 py-2 text-xs font-semibold text-black transition disabled:cursor-not-allowed disabled:opacity-40"
                                                            >
                                                                Confirm reversal
                                                            </button>
                                                        </div>
                                                    </section>
                                                ) : null}
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="border-t border-white/10 px-5 py-4 text-xs leading-5 text-gray-500 sm:px-6">
                                        Confirmed awards appear here once the standings read
                                        lands.
                                    </p>
                                )}
                            </div>
                        </details>
                    ) : null}

                    <section aria-label="Delete contest" className="px-5 py-6 sm:px-6">
                        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                            <div className="min-w-0 max-w-3xl">
                                <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-red-200">
                                    Delete contest
                                </h2>
                                <p className="mt-1 text-xs leading-5 text-gray-500">
                                    {phase === "finalized"
                                        ? "Permanent · entrants are notified and awarded points are reversed."
                                        : "Permanent · the contest and its entries are removed, and entrants are notified."}
                                </p>
                            </div>
                            <button
                                ref={deletionTriggerRef}
                                type="button"
                                onClick={() => setDeletionDrawerOpen(true)}
                                className="ml-auto inline-flex min-h-10 shrink-0 items-center rounded-lg border border-red-300/35 px-3.5 py-2 text-xs font-semibold text-red-100 transition hover:bg-red-500/10"
                            >
                                Delete contest
                            </button>
                        </div>
                    </section>
                </section>
            ) : null}

            <ContestDeletionDrawer
                open={deletionDrawerOpen}
                onClose={() => setDeletionDrawerOpen(false)}
                returnFocusRef={deletionTriggerRef}
                contestName={contest.name}
                communityName={contextName}
                phaseLabel={phaseLabel}
                entrantCount={entrantCount}
                reversesAwards={phase === "finalized"}
                organizerHandle={currentUser?.username ?? ""}
                onDelete={handleDeleteContest}
                accent={accent}
            />
        </div>
    );
};

export default FeedContestDetail;
