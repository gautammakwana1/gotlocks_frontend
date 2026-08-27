"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatedArrow } from "@/components/ui/AnimatedArrow";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import BackButton from "@/components/ui/BackButton";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import {
    FEED_CONTEST_AWARD_REVERSE_REASON_MAX,
    formatContestDateTime,
    gameKickoffFormatter,
} from "@/lib/contests/feedContestCatalog";
import { useToast } from "@/lib/state/ToastContext";
import type {
    FeedContest,
    FeedContestGameSnapshot,
    FeedContestStandingRow,
    RootState,
} from "@/lib/interfaces/interfaces";
import {
    clearFeedContestAwardReversalState,
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
    reverseFeedContestAwardRequest,
} from "@/lib/redux/slices/feedContestSlice";
import ArenaContestPrizeSettings from "./ArenaContestPrizeSettings";
import ArenaContestRewardCard from "./ArenaContestRewardCard";
import ContestDeletionDrawer, {
    type ContestDeletionResult,
} from "./ContestDeletionDrawer";
import {
    ContestDetailHeader,
    ContestDetailTabBar,
    type ContestDetailFormat,
} from "./ContestDetailHeader";
import ContestRulesDisclosure from "./ContestRulesDisclosure";
import FeedContestEntriesPanel from "./FeedContestEntriesPanel";
import FeedContestStandingsPanel from "./FeedContestStandingsPanel";
import { formatParticipationRulesForContext } from "@/lib/contests/participationRules";
import type {
    ContestPreviewArtworkKey,
    ContestPreviewVisualState,
} from "./preview/model";

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
 * the drawer).
 *
 * Plus ONE owner-only write, narrower than every other on this screen: the
 * whole-award audit reversal (`PUT .../award-reversal/…`, in the Award
 * corrections panel). The endpoint answers an Arena MANAGER 403 — it tests
 * `groups.created_by`, not a `group_members` role — so that panel's button
 * gates on `isOwner`, never on `organizer`.
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
    if (template === "td_psychic") return "TD Psychic";
    if (template === "same_game_combo_challenge") return "Legacy Same-Game Combo";
    return "Legacy Single Pick";
};

/**
 * The header artwork — the faded, masked image behind ContestDetailHeader.
 * `CONTEST_ART` is keyed by the MVP's template names, so this backend's
 * `multi_pick` maps onto the General Combo art exactly as
 * `preview/feedContestPreview.ts` maps it for the contest cards. That module
 * keeps its own table module-private, so this mirrors it rather than reaching
 * in; the two legacy templates have no art of their own and share the key.
 */
const CONTEST_ARTWORK_BY_TEMPLATE: Record<string, ContestPreviewArtworkKey> = {
    multi_pick: "general_combo",
    general_combo: "general_combo",
    sunday_pickem: "sunday_pickem",
    td_psychic: "td_psychic",
};

const contestArtworkKey = (template: string): ContestPreviewArtworkKey =>
    CONTEST_ARTWORK_BY_TEMPLATE[template] ?? "general_combo";

/** `data-contest-format`, which the header stylesheet tints per template. */
const contestDetailFormat = (template: string): ContestDetailFormat =>
    template === "sunday_pickem"
        ? "sunday_pickem"
        : template === "td_psychic"
            ? "td_psychic"
            : "general_combo";

/** Multi-sport contests collapse to one "Multi" chip, exactly as the cards do. */
const headerSportChips = (contest: FeedContest) => {
    const sports = contest.sports?.filter(Boolean) ?? [];
    if (sports.length > 1) return ["Multi"];
    return sports.length ? sports : [contest.sport];
};

const eligibleSlateSportsLabel = (contest: FeedContest) =>
    contest.sports?.filter(Boolean).join(", ") || contest.sport;

const contestScoringLabel = (
    contest: FeedContest,
    pointsLabel: "League Points" | "Arena Points"
) => {
    if (contest.template === "sunday_pickem") {
        return `Correct picks first · odds-based ${pointsLabel} plus +${contest.pickem_correct_bonus ?? 2} per correct winner`;
    }
    /*
     * Both halves are load-bearing, and the second is the one a member gets
     * wrong: a TD card RANKS on correct count, so a 2-of-3 can take a podium
     * place — but POINTS come from the combined lock-time odds of all three
     * scorers, which only a perfect card has. Stating only the ranking rule here
     * would make a second-place finish worth zero read as a bug.
     */
    if (contest.template === "td_psychic") {
        return "Correct picks first · only a perfect 3 of 3 card earns points, from its combined lock-time odds";
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
    /**
     * This screen's own route — the contest detail URL, which is where each
     * entry card's header link points. Read from the router rather than passed
     * in, because both mount sites (arena and league) already ARE this path and
     * neither has it as a string to hand over.
     */
    const contestPathname = usePathname();
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
        awardReversalLoading,
        awardReversalMessage,
        awardReversalError,
        awardReversalContestId,
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
    // The award-reversal slot goes with them, so an outcome nobody was left to
    // report does not sit in the store waiting for the next screen. It is belt
    // and braces over the effect's own contest guard: a receipt that lands AFTER
    // this cleanup runs still gets stamped, and only that guard catches it.
    useEffect(() => () => {
        dispatch(clearFeedContestDetail());
        dispatch(clearFeedContestEntries());
        dispatch(clearFeedContestStats());
        dispatch(clearFeedContestLeaderboard());
        dispatch(clearFeedContestAwardReversalState());
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

    /*
     * ONE place reports the award reversal, mirroring the delete effect above:
     * it writes the MVP's inline feedback line, toasts, closes the inline form
     * on success, and clears the slice so a re-render cannot report the same
     * write twice.
     *
     * NO refetch. The reducer already patched the loaded board from the reply's
     * seven columns, and re-reading would collapse a board the organizer may
     * have paged open.
     *
     * The success copy is the SERVER's own message, which is the MVP's string
     * verbatim — and on the idempotent path it is the more accurate "This award
     * was already reversed." instead. The form is left OPEN on failure so the
     * reason that was typed survives a 403 or a 409.
     */
    useEffect(() => {
        if (!awardReversalMessage && !awardReversalError) return;
        /*
         * THE RECEIPT MUST BELONG TO THIS CONTEST — the same guard the delete
         * effect puts on `deletedContestId`. A PUT still in flight when the
         * organizer hits Back resolves against an unmounted screen and leaves
         * its outcome in the slot; without this check the NEXT contest detail to
         * mount would read a stranger's receipt and toast "the confirmed award
         * was reversed" over a contest nothing happened on. Worse on the failure
         * path, which would report a 403 about an Arena the viewer never touched.
         */
        if (awardReversalContestId && awardReversalContestId !== contestId) return;
        const message =
            awardReversalError ??
            awardReversalMessage ??
            "The confirmed award was reversed with an audit record.";
        setFeedback(message);
        setToast({
            id: Date.now(),
            type: awardReversalError ? "error" : "success",
            message,
            duration: 4000,
        });
        if (!awardReversalError) {
            setReversalTarget(undefined);
            setReversalReason("");
        }
        dispatch(clearFeedContestAwardReversalState());
    }, [
        awardReversalContestId,
        awardReversalError,
        awardReversalMessage,
        contestId,
        dispatch,
        setToast,
    ]);

    // Checked during RENDER, not in an effect: a record belonging to any other
    // id is never read, whatever the loading flag says (see useScopedGroup).
    const scoped = detail?.contest?.id === contestId ? detail : null;
    const contest = scoped?.contest ?? null;
    const organizer = scoped?.viewer?.is_organizer ?? false;
    /*
     * OWNER, not merely staff. `is_organizer` above is TRUE for an Arena manager
     * as well, and the award-reversal endpoint answers a manager 403: it tests
     * `groups.created_by`, never a `group_members` role. No feed-contest read
     * carries an owner flag today, and this screen must NOT fetch the group to
     * find one — `state.group.group` is the single-tenant slot the header
     * comment above forbids reading here.
     *
     * So the role string stands in, exactly as FeedContestEditRouter already
     * uses it for the Arena owner: "commissioner" is how the API spells owner in
     * `group_members.role`, on a League and an Arena alike.
     *
     * The `??` shape is deliberate, matching ArenaVenueCheckInPanel — the day
     * the server adds `viewer.is_owner` to this envelope, the flag is a drop-in
     * and nothing else changes. Until then the one known imprecision is the
     * window after an ownership TRANSFER, where `created_by` is rewritten
     * synchronously while the member roles are synced in the background: the
     * button may briefly be hidden from the new owner or shown to the old one.
     * The server remains the authority, and its 403 copy surfaces verbatim
     * through the failure toast.
     */
    const isOwner =
        (scoped?.viewer as { is_owner?: boolean } | undefined)?.is_owner ??
        scoped?.viewer?.role === "commissioner";
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

    /** Read by the Settings-tab board fetch below, not by the Standings one. */
    const boardIsFinal =
        lifecycleStatus === "final" || lifecycleStatus === "archived";
    const boardIsLoadedForContest = leaderboard?.contest?.id === contestId;

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

    /*
     * SETTINGS reads this board too. Award corrections is built from the same
     * standings rows — who holds a confirmed award, and whose was already
     * reversed — so without this the panel is permanently empty for an organizer
     * who never opened the Standings tab.
     *
     * A SECOND effect, not a branch of the one above, and the split is the whole
     * point: this one has to watch whether the board is already loaded, and the
     * Standings read must NOT. Folded together, `boardIsLoadedForContest` flips
     * false -> true the moment the first reply lands, re-running the effect and
     * firing a duplicate request on every visit to the Standings tab. Apart,
     * each guard only re-runs the read it belongs to.
     *
     * Narrowed to a FINALIZED contest, which is the only phase the Award
     * corrections panel renders in, so a Settings tab on an open contest still
     * costs zero requests. Page 1 is what it needs — the server orders rank asc
     * nulls last and only `winning_places` rows are ever awarded — and
     * `my_standing` rides on every page, so an owner's own award is covered even
     * on a field large enough to page it off.
     *
     * Skipped entirely once the board is loaded, because the success reducer
     * REPLACES on page 1: asking again would collapse a board the organizer had
     * already paged open on the Standings tab. That also makes this self-
     * limiting — the reply flips the guard, and the re-run returns here.
     */
    useEffect(() => {
        if (activeTab !== "settings" || !contestId) return;
        if (!boardIsFinal || boardIsLoadedForContest) return;
        dispatch(
            fetchFeedContestLeaderboardRequest({ contest_id: contestId, page: 1 })
        );
    }, [
        activeTab,
        boardIsFinal,
        boardIsLoadedForContest,
        contestId,
        dispatch,
    ]);

    /*
     * The MVP's reset (StructuredContestDetail ~4249): leaving Settings discards
     * a half-typed reversal rather than leaving the form primed to fire against
     * a row the organizer can no longer see.
     */
    useEffect(() => {
        if (activeTab === "settings") return;
        setReversalTarget(undefined);
        setReversalReason("");
    }, [activeTab]);

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
    /**
     * The contest's real-world prize, or null. A SIBLING of `contest` on the
     * detail response rather than a column of it, because the list endpoints
     * deliberately do not carry it — so it is read from the scoped envelope, not
     * from the contest row.
     */
    const contestReward = scoped?.reward ?? null;
    /**
     * What contest points are CALLED on this surface. One label, threaded
     * through every panel that names them, so an Arena contest never says
     * "League Points" and the stored rules copy can be narrowed to match.
     */
    const standingPointsLabel: "League Points" | "Arena Points" = isArenaContest
        ? "Arena Points"
        : "League Points";
    const contextualRulesText = formatParticipationRulesForContext(
        contest?.rules_text ?? "",
        standingPointsLabel
    );

    /* ---------- Header: the MVP's ContestDetailHeader inputs ---------- */

    /**
     * The header's THREE visual states, over our four display phases. A draft
     * has no state of its own and reads as open, exactly as it does on the
     * contest preview cards — `phaseLabel` below is what tells the two apart.
     */
    const headerVisualState: ContestPreviewVisualState =
        phase === "locked"
            ? "locked"
            : phase === "finalized"
                ? "finalized"
                : "open";

    /*
     * The MVP's `headerTimingLabel` (StructuredContestDetail ~4357), plus one
     * branch it has no phase for. A draft, canceled or archived contest has no
     * meaningful clock to print, and `phaseLabel` is the only place those three
     * are still spelled visibly now that the old accent status pill is gone —
     * the MVP itself already hands `phaseLabel` to this slot for a contest that
     * has not opened yet, so this follows its own precedent.
     */
    const headerTimingLabel =
        archived || canceled || phase === "draft"
            ? phaseLabel
            : phase === "finalized"
                ? contest.finalized_at
                    ? `Finalized ${formatContestDateTime(contest.finalized_at)}`
                    : "Final results"
                : phase === "locked"
                    ? contest.expected_ends_at
                        ? `Finalizes ${formatContestDateTime(contest.expected_ends_at)}`
                        : "Settlement in progress"
                    : opensInFuture
                        ? phaseLabel
                        : `Locks ${formatContestDateTime(contest.locks_at)}`;

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
    /*
     * THE TITLE BAR, which is where the MVP's whole standings header now lives
     * (StructuredContestDetail ~5425). Its own <h2> is screen-reader only: the
     * tab strip directly above already says "Rank", so a second heading saying
     * "Live standings" was repeating it in bigger type and pushing the board
     * itself below the fold. What is left is one line of numbers on a dark
     * gradient band that reads as the board's column header.
     */
    const standingsTitleSurfaceClassName = isArenaContest
        ? "bg-[linear-gradient(to_bottom,#000000_0%,#1b1529_100%)]"
        : "bg-[linear-gradient(to_bottom,#000000_0%,#111820_100%)]";
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
    /**
     * The one sentence under the pre-lock counts. It exists because the numbers
     * beside it are provisional in two different ways depending on the template:
     * a General Combo's potential points are exact and merely hypothetical, while
     * a card template's are quoted off prices that have not been captured yet.
     */
    const standingsPreLockDescription =
        contest.template === "multi_pick"
            ? `Selections stay hidden until lock; potential ${standingPointsLabel} assume a win.`
            : `Picks stay hidden until lock; current Combo odds and potential ${standingPointsLabel} may change before shared lock-time prices are captured.`;

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
    /*
     * The MVP's `participatingStaffPrivacyActive`. Arena staff eligible to
     * compete in their own contest must not read the field early, even though
     * their role otherwise could — so this OVERRIDES `canViewAllEntries`.
     *
     * `!entriesArePublic` is part of the rule, not an optimisation: once the
     * contest locks the field is public to everyone and there is no privacy left
     * to protect, so leaving it out would keep staff locked out for ever.
     */
    const staffParticipationPrivacy =
        isArenaStaffViewer &&
        Boolean(contest.allow_staff_participation) &&
        canParticipate &&
        !entriesArePublic;
    const canViewAllEntries =
        entriesArePublic || (isArenaStaffViewer && !isLiveParticipant);
    const contextName =
        scoped?.group?.name?.trim() || (isArenaContest ? "Arena" : "League");
    const participantCapacityLabel = `${contest.participant_count ?? 0} / ${participantLimit === null || participantLimit === undefined
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
                label: "Results finalize",
                value: "Automatic after the last included matchup is final",
            },
            /*
             * TD Psychic replaces the one-line Scoring fact with a full brief.
             *
             * It earns the space because this is the only template where placing
             * and scoring come apart: ranking is on correct count, so a 2-of-3 can
             * take a podium place, while points come from the combined lock-time
             * odds of all THREE scorers and only a perfect card has those. Stating
             * that in a single clause is what made members read a second-place
             * finish worth zero as a bug, so each rule gets its own row.
             */
            ...(contest.template === "td_psychic"
                ? [
                    {
                        label: "How it works",
                        value:
                            "Pick exactly three players from the included NFL games to score a rushing or receiving touchdown.",
                        wide: true,
                    },
                    { label: "Entry", value: "3 players" },
                    { label: "Ranking", value: "More correct picks rank higher." },
                    {
                        label: "Tiebreaker",
                        value:
                            "Shared scorer odds captured at lock break ties and appear on entry cards after lock; displayed current odds may change before then.",
                        wide: true,
                    },
                    {
                        label: "Placement requirement",
                        value:
                            "At least 2 of 3. Perfect cards rank first, then the strongest 2-of-3 cards fill any remaining places.",
                    },
                    {
                        label: "Awards",
                        value: "Up to the top 3 placement-eligible cards.",
                    },
                    {
                        label: standingPointsLabel,
                        value: `Only a perfect 3 of 3 card earns one combined lock-time-odds ${standingPointsLabel} total.`,
                        wide: true,
                    },
                ]
                : [
                    {
                        label: "Scoring",
                        value: contestScoringLabel(contest, standingPointsLabel),
                        wide: true,
                    },
                    {
                        label: "Awards",
                        value: `Top ${contest.winning_places ?? 3} ${contest.template === "sunday_pickem" ? "cards" : "entries"
                            } receive placements.`,
                    },
                ]),
            ...(isArenaContest
                ? [
                    // `entry_access_mode` rides on the list AND detail columns, so
                    // this fact costs no extra read. A League has no room to stand
                    // in and is pinned to 'open', which is why it sits in here.
                    {
                        label: "Entry access",
                        value:
                            contest.entry_access_mode === "venue_check_in_required"
                                ? "Venue Check-In Required"
                                : "Open to Arena members",
                    },
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
        ["multi_pick", "sunday_pickem", "td_psychic"].includes(contest.template) &&
        CONTEST_EDITABLE_STATUSES.includes(contest.lifecycle_status) &&
        !canceled &&
        !archived;

    /*
     * RENAME OUTLIVES THE COPY EDIT.
     *
     * The MVP splits one permission into two: the description and rules freeze
     * at the first accepted entry, but the NAME stays editable right up to
     * finalization. An organizer who typoed a contest title should not be stuck
     * with it for the whole run, and the name is the one field no entrant
     * accepted anything about.
     *
     * `contestInformationEditable` is the full-copy gate; `contestNameEditable`
     * is the wider one. Which is true decides both the link label and which of
     * the three summary sentences prints below it.
     */
    /*
     * The lock CLOCK as well as the status, matching the MVP's own clause
     * (`Date.now() < Date.parse(contest.locksAt)`, StructuredContestDetail.tsx:4611)
     * and the same reason `entriesArePublic` above checks it: the cron that
     * flips 'open' -> 'locked' runs on an interval, so between locks_at and that
     * sweep a contest still READS as open. Without this the link offered
     * "Edit details" — and the full details form — on a contest whose deadline
     * had already passed, where the MVP offers "Rename contest".
     */
    const contestInformationEditable =
        canEditContest &&
        phase === "open" &&
        Date.now() < Date.parse(contest.locks_at);
    const contestNameEditable = canEditContest && phase !== "finalized";

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
        // The three entry models with a builder: the General Combo board, the
        // Sunday Pick'em moneyline card, and the TD Psychic scorer card.
        // `FeedContestEntryShell` renders one of the three, so all three must
        // reach it.
        ["multi_pick", "pickem_card", "td_psychic_card"].includes(contest.entry_model) &&
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
     * The one-line status under "Contest information", following the MVP's
     * matrix (StructuredContestDetail ~4673). It says "details", never "rules":
     * the rules are GENERATED from the format and its settings, so they change
     * with the copy rather than being edited beside it.
     *
     * Two of the MVP's branches cannot be reproduced here:
     *
     *   "Read only · locked after the first accepted entry" — no response tells
     *   us whether anyone has opted in yet, and printing that sentence beside a
     *   still-live Edit link would contradict itself.
     *   TODO(api): with `viewer.can_edit` on the detail response, restore it.
     *
     *   the finalized-Arena rename — over there an Arena contest can still be
     *   renamed after it settles. `PUT /update/:contest_id` refuses a finalized
     *   contest outright, so offering it would be a button that cannot succeed.
     */
    const contestInformationSummary = contestNameEditable
        ? contestInformationEditable
            ? isArenaContest
                ? "Name, details, and the optional reward can still be updated until the first entry is accepted. Contest Rules regenerate automatically."
                : "Name and details can still be updated until the first entry is accepted. Contest Rules regenerate automatically."
            : !writable
                ? isArenaContest
                    ? "The contest name and existing podium prizes can still be updated. Details, mechanics, slate, and timing are read-only in the current Arena state."
                    : "The contest name can still be updated. Details, mechanics, slate, and timing are read-only in the current community state."
                : isArenaContest
                    ? "The contest name and existing podium prizes can still be updated. Details, mechanics, slate, and timing are read-only after entry or lock."
                    : "The contest name can still be updated. Details, mechanics, slate, and timing are read-only after entry or lock."
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
     * THE AWARD CORRECTIONS LIST — the finalized board, read as "who holds a
     * confirmed award, and whose was already reversed".
     *
     * The MVP derives this from the community point ledger. This backend has no
     * client-side ledger and needs none: on a finalized standing
     * `contest_points > 0` IS the confirmed award — it is the exact figure the
     * reversal endpoint refuses to act on when it is not positive (409 "This
     * member has no award to reverse.") — and `is_points_reverse` is the
     * reversal already on record. The same two booleans the MVP computes come
     * straight off the board, with no second read.
     *
     * `awarded` goes FALSE once reversed, matching the MVP's ledger row flipping
     * to status "reversed": the row then survives the filter on `reversed`
     * alone, which is what keeps the audit line visible after the correction.
     *
     * `my_standing` is folded in and de-duped by the contest_leaderboard row id.
     * The server reads the viewer's own line separately and it can land on a
     * page this screen never asked for, so an owner's own award must be neither
     * missing from nor doubled in the list of awards they may correct.
     */
    const awardCorrectionBoardRows =
        phase === "finalized" && !canceled && scopedLeaderboard
            ? scopedLeaderboard.standings
            : [];
    /*
     * `my_standing` is folded in SEPARATELY, not concatenated, because its
     * position carries no meaning: the board rows arrive in the server's own
     * order, so a board row's index is a usable stand-in for a missing rank,
     * while the viewer's own line was read by a different query and could belong
     * anywhere in the field. Numbering it by where it happens to sit in a
     * concatenated array would print a confident, wrong "#N".
     */
    const awardCorrectionSourceRows: {
        row: FeedContestStandingRow;
        positionalRank: number | null;
    }[] = [
            ...awardCorrectionBoardRows.map((row, index) => ({
                row,
                positionalRank: index + 1,
            })),
            ...(awardCorrectionBoardRows.length && scopedLeaderboard?.my_standing
                ? [{ row: scopedLeaderboard.my_standing, positionalRank: null }]
                : []),
        ];
    const seenAwardCorrectionIds = new Set<string>();
    const awardCorrectionRows: AwardCorrectionRow[] =
        awardCorrectionSourceRows.flatMap(({ row, positionalRank }) => {
            if (!row?.id || seenAwardCorrectionIds.has(row.id)) return [];
            seenAwardCorrectionIds.add(row.id);
            const reversed = Boolean(row.is_points_reverse);
            const points = row.contest_points ?? 0;
            const awarded = !reversed && points > 0;
            // A member appears iff they hold a live confirmed award OR already
            // have a reversal on record. Losers and pending entries are omitted.
            if (!awarded && !reversed) return [];
            // The member id is what the write posts back. A row whose profiles
            // embed came back empty still carries it, but one with neither is
            // unactionable and is dropped rather than sent as a blank user_id.
            const userId = row.member?.id;
            if (!userId) return [];
            return [
                {
                    entryId: row.id,
                    userId,
                    userName: row.member?.username?.trim() || "Member",
                    // `rank` is null only until a settlement job fills it in, and
                    // every row here is finalized — so this fallback is close to
                    // unreachable. When it is reached, the server's own ordering
                    // stands in for a BOARD row, and a `my_standing` read off a
                    // page this screen never asked for gets 0 rather than an
                    // invented position (`#0` reads as unranked; a wrong "#4"
                    // would not).
                    rank: row.rank ?? positionalRank ?? 0,
                    points,
                    awarded,
                    reversed,
                },
            ];
        });

    /*
     * OWNER-ONLY, and writable. The endpoint answers an Arena manager 403 even
     * though they clear every other organizer check on this router, so the
     * button is hidden from them rather than offered and then refused.
     */
    const canReverseAward = writable && isOwner;

    const reversibleAwardCount = awardCorrectionRows.filter(
        (row) => canReverseAward && row.awarded && !row.reversed && row.points > 0
    ).length;
    const reversedAwardCount = awardCorrectionRows.filter(
        (row) => row.reversed
    ).length;
    /*
     * The MVP's three branches, in its precedence: "available to reverse" wins
     * whenever there is at least one; else "N reversed", but only when EVERY row
     * is reversed; else the neutral confirmed count. Its old "awaiting the
     * standings read" branch is gone with the placeholder — the panel now
     * renders only when it has rows, exactly as the MVP's does.
     */
    const awardCorrectionSummary =
        reversibleAwardCount > 0
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

    /*
     * PUT /group/feed-contest/award-reversal/:contest_id — owner-only, and the
     * one write on this screen that creates a permanent audit record.
     *
     * The form is NOT closed here. The write is asynchronous and can fail (403
     * for a manager, 409 for a contest that is not finalized or a member with no
     * award, 400 for a reason the server trims to empty), and closing on
     * dispatch would throw away the reason the organizer typed along with the
     * server's own message. The outcome effect above closes it on success.
     */
    const handleReverseAward = (userId: string) => {
        if (!userId || !canReverseAward || awardReversalLoading) return;
        const reason = reversalReason.trim();
        // Kept client-side even though the endpoint will re-check it: an award
        // reversal with no audit reason is the one thing this form exists to
        // prevent, and it stays open until one is written.
        if (!reason) {
            setFeedback("Add an audit reason before reversing an award.");
            return;
        }
        // Pre-checked rather than capped with `maxLength`, which would silently
        // truncate what was written. The server answers 400 with this same
        // sentence; catching it here keeps the typed reason on screen.
        if (reason.length > FEED_CONTEST_AWARD_REVERSE_REASON_MAX) {
            setFeedback(
                `reason must be ${FEED_CONTEST_AWARD_REVERSE_REASON_MAX} characters or fewer.`
            );
            return;
        }
        dispatch(
            reverseFeedContestAwardRequest({
                contest_id: contest.id,
                user_id: userId,
                reason,
            })
        );
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
            {/* The shared contest chrome: the contest artwork as a faded,
                masked backdrop, a state-tinted gradient, the back button, the
                access / timing / sport meta chips and the Context / Contest
                title line — with the tab strip nested as its children, exactly
                as the MVP nests it (StructuredContestDetail ~4684). */}
            <ContestDetailHeader
                accent={accent}
                artwork={contestArtworkKey(contest.template)}
                backHref={backHref}
                contextName={contextName}
                contestName={contest.name}
                contestTypeLabel={contestFormatLabel(contest.template)}
                format={contestDetailFormat(contest.template)}
                sports={headerSportChips(contest)}
                state={headerVisualState}
                stateLabel={phaseLabel}
                timingLabel={headerTimingLabel}
                // The chip is desktop-only in the shared header; our old header
                // showed its timing on every width, so the compact slot keeps it.
                mobileTimingLabel={headerTimingLabel}
                accessLabel={
                    isArenaContest
                        ? contest.entry_access_mode === "venue_check_in_required"
                            ? "Venue check-in"
                            : "Open entry"
                        : undefined
                }
            >
                <ContestDetailTabBar
                    activeTab={activeTab}
                    ariaLabel="Contest sections"
                    getPanelId={(tab) => `contest-panel-${tab}`}
                    onTabChange={setDetailTab}
                    tabs={availableTabs.map((tab) => ({
                        id: tab,
                        // "Rank", not "Standings" — the tab id stays `standings`
                        // because that is what the `?tab=` deep link and the
                        // panel ids use, but the strip reads the MVP's label.
                        label:
                            tab === "standings"
                                ? "Rank"
                                : tab[0].toUpperCase() + tab.slice(1),
                    }))}
                />
            </ContestDetailHeader>

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

                        {/* Two-column dt/dd grid, bled to the full panel width so
                            its rules run edge to edge. `border-y` is load-bearing:
                            the rule below it doubles as the top rule of the games
                            disclosure, which carries only `border-b`. */}
                        <dl
                            aria-label="Contest facts"
                            className="-mx-5 mt-6 grid w-auto gap-x-10 gap-y-5 border-y border-white/10 px-5 py-5 sm:-mx-6 sm:grid-cols-2 sm:px-6"
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
                            <details className="group -mx-5 w-auto border-b border-white/10 px-5 sm:-mx-6 sm:px-6">
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
                                        data-directional-arrow="down"
                                        className="ui-directional-arrow h-4 w-4 shrink-0 text-gray-500 transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
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

                        {/* The PODIUM PRIZES, above the rules and in the same
                            stack of full-bleed disclosures. Shown to every
                            viewer, entered or not: "what do I win" is exactly the
                            question somebody asks BEFORE deciding to enter, and
                            the detail read carries the reward for that reason.
                            NULL on a League and on any Arena contest whose
                            organizer chose "No prizes". */}
                        {isArenaContest && contestReward ? (
                            <ArenaContestRewardCard
                                reward={contestReward}
                                className="-mt-px"
                                variant="details"
                            />
                        ) : null}

                        {/* The rules are a COLLAPSED disclosure now, in the same
                            full-bleed stack as the games list and the reward card:
                            most members open Details for the slate and the clock,
                            and a wall of accepted terms above the fold buried both.
                            The version stamp went with it — a member has no use for
                            it, and re-acceptance is prompted from the Entries tab. */}
                        <ContestRulesDisclosure
                            rulesText={contextualRulesText}
                            accent={accent}
                            className="-mt-px"
                            layout="details"
                        />
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
                    aria-label="Contest rank"
                    data-standings-layout="responsive-list"
                    data-standings-phase={standingsPhase}
                    data-standings-presentation="full-length"
                    // FULL-BLEED, and it is the section that carries the bleed —
                    // the title band, the frame and every row inside re-inset
                    // themselves with `px-5 sm:px-6`, so the gradients run to the
                    // screen edge while the text stays on the app gutter.
                    className="-mx-5 sm:-mx-6"
                >
                    <header
                        data-standings-title-row
                        data-standings-title-surface={isFrozenFinal ? "final" : "active"}
                        data-standings-title-theme={accent}
                        className={`flex min-h-12 items-center justify-start gap-3 px-5 py-2.5 sm:px-6 ${standingsTitleSurfaceClassName}`}
                    >
                        {/* Screen-reader only: the tab strip above already reads
                            "Rank", so a visible second heading said it twice. */}
                        <h2 className="sr-only">Contest standings</h2>
                        <div className="min-w-0 flex-1">
                            {standingsCountsPending ? (
                                // One read with no partial state, so the figures
                                // skeleton rather than flashing a zero that would
                                // read as "nobody entered".
                                <div aria-hidden="true">
                                    <div className="h-2.5 w-40 animate-pulse rounded bg-white/[0.08]" />
                                    <div className="mt-1.5 h-2 w-64 max-w-full animate-pulse rounded bg-white/[0.05]" />
                                </div>
                            ) : !entriesArePublic ? (
                                <div data-standings-summary className="min-w-0 text-left">
                                    <div className="flex min-w-0 items-baseline gap-1 truncate text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400 sm:text-xs">
                                        <span
                                            data-standings-phase-label="pre-lock"
                                            className="shrink-0 text-amber-200"
                                        >
                                            Pre-lock
                                        </span>
                                        <span aria-hidden="true">·</span>
                                        <dl
                                            aria-label="Contest participation progress"
                                            className="flex min-w-0 items-baseline gap-1"
                                        >
                                            <div className="flex min-w-0 items-baseline gap-1">
                                                <dt className="shrink-0">Participants</dt>
                                                <dd className="flex min-w-0 items-baseline justify-start gap-1 tabular-nums text-white">
                                                    <span aria-hidden="true">·</span>
                                                    <span>{standingsParticipantCount}</span>
                                                    {participantLimit !== null &&
                                                        participantLimit !== undefined ? (
                                                        <span className="font-medium text-gray-500">
                                                            / {participantLimit}
                                                        </span>
                                                    ) : null}
                                                </dd>
                                            </div>
                                        </dl>
                                    </div>
                                    <p
                                        id="standings-pre-lock-description"
                                        data-standings-pre-lock-description
                                        className="mt-1 max-w-3xl text-[10px] font-normal normal-case leading-4 tracking-normal text-gray-500 sm:text-[11px]"
                                    >
                                        {phase === "draft"
                                            ? "Standings unlock once this draft is published."
                                            : standingsPreLockDescription}
                                    </p>
                                </div>
                            ) : (
                                <div
                                    data-standings-summary
                                    className="flex min-w-0 items-baseline gap-1 truncate text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400 sm:text-xs"
                                >
                                    {!isFrozenFinal ? (
                                        <p className="shrink-0 text-amber-200">
                                            Live {standingPointsLabel}
                                        </p>
                                    ) : null}
                                    <p className="min-w-0 truncate tabular-nums">
                                        {!isFrozenFinal ? <span aria-hidden="true">· </span> : null}
                                        {standingsRowCount} ranked · {standingsEntryCount}{" "}
                                        {standingsEntryCount === 1 ? "entry" : "entries"}
                                    </p>
                                </div>
                            )}
                        </div>
                    </header>

                    <FeedContestStandingsPanel
                        leaderboard={scopedLeaderboard}
                        loading={leaderboardLoading}
                        error={leaderboardError}
                        isDraft={phase === "draft"}
                        isFrozenFinal={isFrozenFinal}
                        entriesArePublic={entriesArePublic}
                        winningPlaces={contest.winning_places ?? 3}
                        pointsLabel={standingPointsLabel}
                        template={contest.template}
                        currentUserId={currentUser?.userId}
                        accent={accent}
                        onShowMore={() => setStandingsPage((page) => page + 1)}
                        // For an expanded standing's entry card — the same three
                        // the Entries tab needs, and absent from the leaderboard
                        // read's narrow contest projection for the same reason.
                        pickemCorrectBonus={contest.pickem_correct_bonus}
                        contestName={contest.name}
                        contestHref={contestPathname}
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
                    {/* NO padding wrapper: the MVP hangs its entries list straight
                        off the tab panel, so the receipt's own rule sits flush
                        under the tab strip and the list runs to the screen edge.
                        The `px-1 pb-6 pt-2` box that used to be here was left over
                        from the organizer band that has since moved to Settings. */}
                    <FeedContestEntriesPanel
                        entries={scopedEntries}
                        loading={entriesLoading}
                        error={entriesError}
                        accent={accent}
                        currentUserId={currentUser?.userId}
                        // The entries read's contest projection omits this,
                        // and only a Pick'em card's scoring split needs it.
                        pickemCorrectBonus={contest.pickem_correct_bonus}
                        // Names each entry card's header. The link is
                        // self-referential from this tab, which is fine — the
                        // same card is also rendered on the entry route and in
                        // the group Feed, where it is not.
                        contestName={contest.name}
                        contestHref={contestPathname}
                        isDraft={phase === "draft"}
                        staffParticipationPrivacy={staffParticipationPrivacy}
                        canViewAllEntries={canViewAllEntries}
                        canParticipate={canParticipate}
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
                                    <AnimatedArrow
                                        direction="right"
                                        className="text-base leading-none"
                                    />
                                </Link>
                            ) : null
                        }
                    />
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
                            {contestNameEditable && editHref ? (
                                <Link
                                    href={editHref}
                                    className={`ml-auto inline-flex min-h-10 shrink-0 items-center rounded-lg border px-3.5 py-2 text-xs font-semibold transition ${accentClasses.borderedLink}`}
                                >
                                    {phase === "draft"
                                        ? "Edit draft"
                                        : contestInformationEditable
                                            ? "Edit details"
                                            : "Rename contest"}
                                </Link>
                            ) : (
                                <span className="ml-auto shrink-0 text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-500">
                                    Read only
                                </span>
                            )}
                        </div>
                    </section>

                    {/* PODIUM PRIZES — Arena only. Editing the WORDING is the one
                        reward write left after publication; the settlement method,
                        the venue and the contact email are the deal a member
                        accepted when they entered, so they are read-only.

                        `addRewardHref` is offered on a DRAFT alone. A reward's
                        legal disclosure has to be inside rules_text on the first
                        version of the row, so a published contest that shipped
                        without prizes cannot gain them — the endpoint answers 409
                        — and offering the link there would lead to a save that
                        cannot succeed. */}
                    {isArenaContest ? (
                        <ArenaContestPrizeSettings
                            contestId={contest.id}
                            reward={contestReward}
                            editable={writable && !canceled && !archived}
                            addRewardHref={
                                phase === "draft" && contestInformationEditable
                                    ? editHref
                                    : undefined
                            }
                            finalized={phase === "finalized"}
                        />
                    ) : null}

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
                                    data-directional-arrow="down"
                                    className="ui-directional-arrow h-4 w-4 text-gray-500 transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
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
                                Provider results update live rank after lock. The contest
                                settles after its last included matchup is final, with unresolved
                                selections handled by the provider grace policy.
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

                    {/* The MVP's own gate, restored now that the rows are real:
                        the disclosure DISAPPEARS when nothing was awarded or
                        reversed, rather than standing open to explain itself.
                        `awardCorrectionRows` is already empty outside a
                        finalized, uncanceled contest, so the phase check this
                        used to carry is folded into the array. */}
                    {awardCorrectionRows.length ? (
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
                                    data-directional-arrow="down"
                                    className="ui-directional-arrow h-4 w-4 shrink-0 text-gray-500 transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
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
                                    permanent audit record. Rank and {standingPointsLabel} values
                                    cannot be edited.
                                </p>
                                <ul className="divide-y divide-white/10 border-t border-white/10">
                                    {awardCorrectionRows.map((row) => (
                                        <li key={row.entryId} className="px-5 py-4 sm:px-6">
                                            <div className="flex flex-wrap items-center justify-between gap-3">
                                                <div>
                                                    <p className="text-sm font-semibold text-white">
                                                        {row.userName}
                                                    </p>
                                                    <p className="mt-1 text-xs text-gray-500">
                                                        #{row.rank} · {row.points} confirmed{" "}
                                                        {standingPointsLabel}
                                                        {row.reversed ? " · reversed" : ""}
                                                    </p>
                                                </div>
                                                {canReverseAward &&
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
                                                        Reverse {row.userName}’s{" "}
                                                        {row.points} {standingPointsLabel} award?
                                                    </h3>
                                                    <p className="mt-1 text-xs leading-5 text-gray-500">
                                                        This creates a permanent whole-award reversal.
                                                        Rank and {standingPointsLabel} values cannot
                                                        be changed.
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
                                                            disabled={
                                                                !reversalReason.trim() ||
                                                                awardReversalLoading
                                                            }
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
                                        ? `Permanent · entrants are notified and awarded ${standingPointsLabel} are reversed.`
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
                pointsLabel={standingPointsLabel}
                onDelete={handleDeleteContest}
                accent={accent}
            />
        </div>
    );
};

export default FeedContestDetail;
