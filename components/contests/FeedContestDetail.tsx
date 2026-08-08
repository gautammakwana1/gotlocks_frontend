"use client";

import { useEffect, useMemo, useState } from "react";
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
    FeedContestStatsData,
    RootState,
} from "@/lib/interfaces/interfaces";
import {
    archiveFeedContestRequest,
    cancelFeedContestRequest,
    clearFeedContestDetail,
    clearFeedContestEntries,
    clearFeedContestLifecycleMessage,
    clearFeedContestStats,
    fetchFeedContestDetailRequest,
    fetchFeedContestEntriesRequest,
    fetchFeedContestStatsRequest,
} from "@/lib/redux/slices/feedContestSlice";
import FeedContestEntriesPanel from "./FeedContestEntriesPanel";

/* ----------------------------------------------------------------------------
 * The Feed contest DETAIL screen, ported from the MVP's StructuredContestDetail
 * (gotlocks.app_mvp2/components/contests/StructuredContestDetail.tsx, ~line 3800
 * onwards). Like the MVP's, this is ONE component for both contexts — an Arena
 * contest and a League Feed contest differ only in `context_type` and accent —
 * so the two arena-only facts below stay behind a `context_type` check rather
 * than being deleted.
 *
 * Ported: the header, the four-tab strip, and all four panels. STANDINGS carries
 * the real tally from `GET /group/feed-contest/stats/:contest_id`; its ranked
 * leaderboard is deliberately a "coming soon" card, because no endpoint returns
 * a per-entrant rank/score anywhere in the backend yet.
 *
 * Note the MVP's split, which this follows: the counts live in STANDINGS and the
 * organizer's contest copy lives in SETTINGS — the old "Contest configuration"
 * band at the top of ENTRIES held both and is gone.
 *
 * Live organizer writes: cancel and archive (`PUT /group/feed-contest/
 * {cancel,archive}/:contest_id`) and the copy edit (`PUT .../update/…`, on its
 * own route behind the Edit link). Reverse-award is still a stub. See TODO(api).
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
 * The MVP's Standings counts — the two numbers it shows and no others
 * (StructuredContestDetail.tsx:4883-4913). Everything else the stats endpoint
 * returns is deliberately not rendered here.
 */
const ContestCountsSection = ({
    stats,
    participantLimit,
}: {
    stats: FeedContestStatsData;
    participantLimit?: number | null;
}) => (
    <dl
        aria-label="Contest participation progress"
        className="mt-5 grid grid-cols-2 border-y border-white/10"
    >
        <div className="py-4 pr-4">
            <dt className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-500">
                Participants
            </dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums text-white">
                {stats.counts.participants.active}
            </dd>
            <p className="mt-1 text-xs text-gray-500">
                {participantLimit === null || participantLimit === undefined
                    ? "No participant limit"
                    : `of ${participantLimit} spots filled`}
            </p>
        </div>
        <div className="border-l border-white/10 py-4 pl-4">
            <dt className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-500">
                Valid entries
            </dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums text-white">
                {stats.counts.entries.total}
            </dd>
            <p className="mt-1 text-xs text-gray-500">Complete entries accepted</p>
        </div>
    </dl>
);

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
        cancelLoading,
        cancelMessage,
        cancelError,
        archiveLoading,
        archiveMessage,
        archiveError,
        entries,
        entriesLoading,
        entriesError,
        stats,
        statsError,
    } = useSelector((state: RootState) => state.feedContest);
    // The MVP's inline action result line, rendered above the panels.
    const [feedback, setFeedback] = useState<string>();
    /** The user whose confirmed award the reversal dialog is open for. */
    const [reversalTarget, setReversalTarget] = useState<string>();
    const [reversalReason, setReversalReason] = useState("");

    useEffect(() => {
        if (!contestId) return;
        dispatch(fetchFeedContestDetailRequest({ contest_id: contestId }));
    }, [dispatch, contestId]);

    // The detail slot is single-tenant and shared by every contest screen, so it
    // is dropped on the way out — otherwise the next contest opened renders this
    // one's name, slate and rules until its own read lands. The entries slot has
    // the same problem and a sharper consequence: it would show another
    // contest's field, including who entered. `stats` is the third such slot:
    // left behind, the next contest's Standings tab opens on THIS contest's
    // numbers until its own read lands.
    useEffect(() => () => {
        dispatch(clearFeedContestDetail());
        dispatch(clearFeedContestEntries());
        dispatch(clearFeedContestStats());
    }, [dispatch]);

    // ONE place reports both organizer writes — the inline status line and a
    // toast — then clears the slice message so a later re-render cannot toast
    // the same outcome twice. The updated contest row was already merged into
    // `detail` by the reducer, so the buttons re-gate themselves from state.
    useEffect(() => {
        const failure = cancelError ?? archiveError;
        const success = cancelMessage ?? archiveMessage;
        if (!failure && !success) return;
        const message = failure ?? success ?? "";
        setFeedback(message);
        setToast({
            id: Date.now(),
            type: failure ? "error" : "success",
            message,
            duration: failure ? 4000 : 3000,
        });
        dispatch(clearFeedContestLifecycleMessage());
    }, [
        cancelError,
        cancelMessage,
        archiveError,
        archiveMessage,
        dispatch,
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

    /* ---------- Settings tab: derived state + the organizer writes ---------- */

    // A finalized contest is immutable, and neither stamp can be undone.
    const canCancelContest = phase !== "finalized" && !canceled && !archived;
    // Archiving is the terminal move, so it needs a settled contest first.
    const canArchiveContest = (phase === "finalized" || canceled) && !archived;
    const autoVoidAt = contest.expected_ends_at
        ? new Date(
            Date.parse(contest.expected_ends_at) + AUTO_VOID_GRACE_MS
        ).toISOString()
        : null;

    // Cancel and archive move the SAME row, so either in flight locks both
    // buttons. That, plus `takeLatest`, is what keeps a double-click from firing
    // two writes; the endpoints are idempotent, but a second request would still
    // race the first's reply.
    const lifecycleBusy = cancelLoading || archiveLoading;

    const handleCancelContest = () => {
        if (!canCancelContest || !writable || lifecycleBusy) return;
        if (
            !window.confirm(
                "Cancel this contest? Active participation and entries will be withdrawn. This cannot be undone."
            )
        ) {
            return;
        }
        dispatch(cancelFeedContestRequest({ contest_id: contest.id }));
    };

    const handleArchiveContest = () => {
        if (!canArchiveContest || !writable || lifecycleBusy) return;
        dispatch(archiveFeedContestRequest({ contest_id: contest.id }));
    };

    // TODO(api): still a STUB — a whole-award audit reversal for one finalized
    // standing row has no endpoint. Everything around it is final: wiring is to
    // replace the notImplemented() line with the dispatch. It is also currently
    // unreachable, since the row list that opens this dialog needs the standings
    // read (see the Finalized award corrections section below).
    const handleReverseAward = () => {
        const userId = reversalTarget;
        if (!userId || !writable) return;
        const reason = reversalReason.trim();
        // Kept client-side even though the endpoint will re-check it: an award
        // reversal with no audit reason is the one thing this dialog exists to
        // prevent, and the dialog stays open until one is written.
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
                    className="rounded-2xl border border-white/10 bg-black/25 p-5"
                >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500">
                                Standings
                            </p>
                            {/* The MVP's heading ladder, minus its two ranked
                                branches: with no ranking read there are never any
                                standing rows, so it always resolves to one of
                                these three. */}
                            <h2 className="mt-1 font-semibold text-white">
                                {phase === "draft"
                                    ? "Standings unlock after publish"
                                    : entriesArePublic
                                        ? "Live standings are settling"
                                        : "Standings preview"}
                            </h2>
                        </div>
                        {scopedStats && !scopedStats.contest.is_revealed ? (
                            <span className="rounded-full border border-amber-300/25 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-amber-100">
                                Picks hidden until lock
                            </span>
                        ) : null}
                    </div>

                    {phase === "draft" ? (
                        <p className="mt-4 text-sm leading-6 text-gray-500">
                            Publish this contest to start counting participants and entries.
                        </p>
                    ) : statsError ? (
                        <p role="alert" className="mt-4 text-sm leading-6 text-rose-200">
                            {statsError}
                        </p>
                    ) : !scopedStats ? (
                        // The tally is one read with no partial state, so the whole
                        // block skeletons rather than flashing zeros that would read
                        // as "nobody entered".
                        <div
                            aria-hidden="true"
                            className="mt-5 grid grid-cols-2 border-y border-white/10"
                        >
                            {[0, 1].map((key) => (
                                <div
                                    key={key}
                                    className={key === 0 ? "py-4 pr-4" : "border-l border-white/10 py-4 pl-4"}
                                >
                                    <div className="h-3 w-20 animate-pulse rounded bg-white/[0.06]" />
                                    <div className="mt-2 h-7 w-10 animate-pulse rounded bg-white/[0.06]" />
                                    <div className="mt-2 h-3 w-24 animate-pulse rounded bg-white/[0.04]" />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <ContestCountsSection
                            stats={scopedStats}
                            participantLimit={participantLimit}
                        />
                    )}

                    {/* The leaderboard half needs a per-entrant standings read
                        (rank, score, result) that no endpoint returns yet — see
                        the MISSING API note in the handover. */}
                    <section
                        aria-labelledby="standings-leaderboard-heading"
                        className="mt-6"
                    >
                        <h3
                            id="standings-leaderboard-heading"
                            className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-300"
                        >
                            Leaderboard
                        </h3>
                        <div className="mt-3 rounded-xl border border-dashed border-white/15 bg-black/25 px-4 py-5">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500">
                                Coming soon
                            </p>
                            <p className="mt-2 font-semibold text-white">
                                Ranked standings are on the way
                            </p>
                            <p className="mt-1 text-sm leading-6 text-gray-500">
                                Live points while the contest is Locked, then the frozen
                                final table once it settles.
                            </p>
                        </div>
                    </section>
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
                                entryHref && canEnterContest ? (
                                    <Link
                                        href={entryHref}
                                        className="inline-flex rounded-xl bg-white px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.09em] text-black transition hover:bg-gray-200"
                                    >
                                        {entryCtaLabel}
                                    </Link>
                                ) : null
                            }
                        />
                    </div>
                </section>
            ) : null}

            {reversalTarget ? (
                <section
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="reverse-award-title"
                    className="rounded-2xl border border-red-300/25 bg-red-500/10 p-5"
                >
                    <h2 id="reverse-award-title" className="font-semibold text-red-100">
                        Reverse the confirmed award
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-red-100/75">
                        This creates a whole-award audit reversal. There is no manual
                        point amount or rank control.
                    </p>
                    <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.1em] text-red-100/80">
                        Audit reason
                        <textarea
                            rows={3}
                            value={reversalReason}
                            onChange={(event) => setReversalReason(event.target.value)}
                            className="mt-2 w-full rounded-xl border border-red-300/25 bg-black/40 px-4 py-3 text-sm normal-case text-white outline-none focus:border-red-200/60"
                        />
                    </label>
                    <div className="mt-4 flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={handleReverseAward}
                            disabled={!reversalReason.trim() || !writable}
                            className="rounded-xl bg-red-100 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.09em] text-black disabled:opacity-40"
                        >
                            Confirm reversal
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setReversalTarget(undefined);
                                setReversalReason("");
                            }}
                            className="rounded-xl border border-white/15 px-4 py-2.5 text-xs font-semibold text-gray-200"
                        >
                            Cancel
                        </button>
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
                    <section
                        aria-label="Contest information"
                        className="space-y-4 px-5 py-7 sm:px-6"
                    >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="max-w-3xl">
                                <h2 className="text-base font-semibold text-white">
                                    Contest information
                                </h2>
                                <p className="mt-1 text-sm leading-6 text-gray-500">
                                    Manage the member-facing contest name, description, and
                                    rules.
                                </p>
                            </div>
                            {canEditContest && editHref ? (
                                <Link
                                    href={editHref}
                                    className={`inline-flex shrink-0 rounded-xl border px-4 py-2.5 text-xs font-semibold transition ${accentClasses.borderedLink}`}
                                >
                                    {phase === "draft"
                                        ? "Edit draft"
                                        : "Edit name, description & rules"}
                                </Link>
                            ) : null}
                        </div>

                        <dl className="-mx-5 divide-y divide-white/10 sm:-mx-6">
                            {[
                                ["Contest name", contest.name],
                                ["Description", contest.description || "No description"],
                                ["Rules", contest.rules_text],
                            ].map(([label, value]) => (
                                <div
                                    key={label}
                                    className="grid gap-1 px-5 py-3 first:pt-0 last:pb-0 sm:grid-cols-[9rem_1fr] sm:gap-6 sm:px-6"
                                >
                                    <dt className="text-[10px] font-semibold uppercase tracking-[0.09em] text-gray-500">
                                        {label}
                                        {label === "Rules" ? (
                                            // The MVP's rules_version is a self-describing
                                            // string ("rules-v1"); ours is a bare integer,
                                            // so it gets the word to read as a version.
                                            <span className="mt-0.5 block font-normal normal-case tracking-normal text-gray-600">
                                                Version {contest.rules_version}
                                            </span>
                                        ) : null}
                                    </dt>
                                    <dd className="whitespace-pre-wrap text-sm leading-6 text-gray-200">
                                        {value}
                                    </dd>
                                </div>
                            ))}
                        </dl>

                        {!canEditContest ? (
                            <p className="text-xs leading-5 text-gray-500">
                                Contest information can no longer be edited.
                            </p>
                        ) : null}
                    </section>

                    <section
                        aria-label="Automatic settlement policy"
                        className="space-y-4 px-5 py-7 sm:px-6"
                    >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="max-w-3xl">
                                <h2 className="text-base font-semibold text-white">
                                    Automatic settlement
                                </h2>
                                <p className="mt-1 text-sm leading-6 text-gray-500">
                                    Provider results update live standings while Locked. The
                                    contest settles after its last included matchup is final,
                                    and unresolved selections are handled by the provider
                                    grace policy.
                                </p>
                            </div>
                            <span
                                className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.09em] ${accentClasses.lifecycleCurrent}`}
                            >
                                {archived ? "Archived" : canceled ? "Canceled" : phase}
                            </span>
                        </div>
                        <dl className="-mx-5 divide-y divide-white/10 sm:-mx-6">
                            <div className="flex flex-col gap-1 px-5 py-3 first:pt-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6 sm:px-6">
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
                            <div className="flex flex-col gap-1 px-5 py-3 last:pb-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6 sm:px-6">
                                <dt className="text-[10px] font-semibold uppercase tracking-[0.09em] text-gray-500">
                                    Auto-void cutoff
                                </dt>
                                <dd className="text-sm text-gray-200 sm:text-right">
                                    {formatContestDateTime(autoVoidAt)}
                                </dd>
                            </div>
                        </dl>
                    </section>

                    {/* The MVP lists one row per finalized standing, each with its own
                        "Reverse award" button. The rows come from the standings read,
                        which does not exist yet — the section, its copy and the whole
                        reversal dialog are here so wiring is: map the rows and call
                        setReversalTarget(row.user_id).
                        `!canceled` because a contest that was CALLED OFF and then
                        archived reads as the finalized phase but never had awards —
                        the MVP hides this section the same way, via its empty rows.
                        TODO(api): needs the finalized standings + the point ledger
                        (which awards landed, which were already reversed). */}
                    {phase === "finalized" && !canceled ? (
                        <section
                            aria-label="Finalized award corrections"
                            className="space-y-4 px-5 py-7 sm:px-6"
                        >
                            <div>
                                <h2 className="text-base font-semibold text-white">
                                    Finalized award corrections
                                </h2>
                                <p className="mt-1 text-sm leading-6 text-gray-500">
                                    Corrections create an auditable whole-award reversal. Rank
                                    and point values remain immutable.
                                </p>
                            </div>
                            <p className="rounded-xl border border-dashed border-white/15 bg-black/25 px-4 py-3 text-sm leading-6 text-gray-500">
                                Confirmed awards appear here once the standings read lands.
                            </p>
                        </section>
                    ) : null}

                    <section
                        aria-label="Contest actions"
                        className="space-y-4 px-5 py-7 sm:px-6"
                    >
                        <div>
                            <h2
                                className={`text-base font-semibold ${canCancelContest ? "text-red-200" : "text-white"}`}
                            >
                                Contest actions
                            </h2>
                            <p className="mt-1 max-w-3xl text-sm leading-6 text-gray-500">
                                {archived
                                    ? "This contest is archived in community history."
                                    : canArchiveContest
                                        ? "Move this contest into community history while preserving its results and audit records."
                                        : "Canceling withdraws active participation and entries. This action cannot be undone."}
                            </p>
                        </div>

                        {canCancelContest || canArchiveContest ? (
                            <div className="flex flex-wrap gap-2">
                                {canCancelContest ? (
                                    <button
                                        type="button"
                                        disabled={!writable || lifecycleBusy}
                                        aria-busy={cancelLoading}
                                        onClick={handleCancelContest}
                                        className="rounded-xl border border-red-300/30 bg-red-500/10 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.09em] text-red-100 transition hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        {cancelLoading ? "Canceling…" : "Cancel contest"}
                                    </button>
                                ) : null}
                                {canArchiveContest ? (
                                    <button
                                        type="button"
                                        disabled={!writable || lifecycleBusy}
                                        aria-busy={archiveLoading}
                                        onClick={handleArchiveContest}
                                        className={`rounded-xl border px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.09em] transition disabled:cursor-not-allowed disabled:opacity-40 ${accentClasses.actionButton}`}
                                    >
                                        {archiveLoading ? "Archiving…" : "Archive contest"}
                                    </button>
                                ) : null}
                            </div>
                        ) : null}
                    </section>
                </section>
            ) : null}
        </div>
    );
};

export default FeedContestDetail;
