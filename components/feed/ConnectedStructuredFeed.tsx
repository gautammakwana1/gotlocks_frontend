"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useDispatch, useSelector } from "react-redux";
import type {
    ArenaCommunityPick,
    ArenaStaffPick,
    BuiltPickPayload,
    CreateCommunityPickPayload,
    FeedContestPickRow,
    FeedGroupType,
    Pick,
    PickReaction,
    PickReactionSummary,
    RootState,
    SlipContestPickRow,
    StaffAnnouncement,
    StaffAnnouncementAuthor,
} from "@/lib/interfaces/interfaces";
import {
    clearCreateCommunityPickState,
    clearCreateStaffAnnouncementState,
    clearCreateStaffPickState,
    clearDeleteCommunityPickState,
    clearDeleteStaffAnnouncementState,
    clearDeleteStaffPickState,
    clearEditStaffAnnouncementState,
    clearPinStaffAnnouncementState,
    clearUpdateCommunityPickState,
    createCommunityPickRequest,
    createStaffAnnouncementRequest,
    createStaffPickRequest,
    deleteCommunityPickRequest,
    deleteStaffAnnouncementRequest,
    deleteStaffPickRequest,
    editStaffAnnouncementRequest,
    fetchCommunityPicksRequest,
    fetchStaffAnnouncementsRequest,
    fetchStaffPicksRequest,
    pinStaffAnnouncementRequest,
    resetGroupFeed,
    updateCommunityPickRequest,
} from "@/lib/redux/slices/arenaSlice";
import {
    clearFeedContestPicks,
    fetchFeedContestPicksRequest,
} from "@/lib/redux/slices/feedContestSlice";
import {
    clearSlipContestPicks,
    createPickReactionRequest,
    fetchSlipContestPicksRequest,
} from "@/lib/redux/slices/pickSlice";
import { fetchLiveNFLScheduleRequest } from "@/lib/redux/slices/nflSlice";
import { useToast } from "@/lib/state/ToastContext";
import { formatDateTime } from "@/lib/utils/date";
import { AnnouncementEditModal } from "./AnnouncementEditModal";
import { StructuredFeed } from "./StructuredFeed";
import {
    buildCommunityPickPayload,
    buildMoneylineStaffPickOptions,
    buildStaffPickPayload,
} from "./staffPickOdds";
import type {
    StructuredFeedCapabilities,
    StructuredFeedContextMetadata,
    StructuredFeedFilter,
    StructuredFeedPickSubmission,
    StructuredFeedRecord,
    StructuredFeedRecordSelection,
    StructuredFeedRole,
    StructuredFeedStaffRole,
    StructuredFeedSubmission,
    StructuredFeedSubmitResponse,
} from "./types";
import { parseAmericanOdds } from "@/lib/utils/scoring";

type ConnectedStructuredFeedProps = {
    groupId: string;
    /**
     * Arenas and Leagues share this Feed. It selects the endpoint namespace (see
     * `feedScope` in arenaSaga), the accent, and which post types are offered.
     */
    groupType?: FeedGroupType;
    contextName: string;
    // Raw role string from the group dashboard ("commissioner" | "manager" |
    // "member" | "undefined"); narrowed to a StructuredFeedRole below.
    currentRole: string;
    writable: boolean;
    currentUserId?: string;
    className?: string;
    /** Optional panel shown behind the Feed's "Standings" filter chip. */
    standings?: ReactNode;
    initialFilter?: StructuredFeedFilter;
};

const STAFF_ROLES = new Set(["commissioner", "manager", "owner"]);

// commissioner reads as "Owner" everywhere else in the Arena UI (and in this
// file's own record labels), so map it here too — the composer header would
// otherwise say "Posting as Commissioner" while the same user's cards say
// "Owner Announcement". feedRole only drives that label; gating is by capability.
const toFeedRole = (role: string): StructuredFeedRole =>
    role === "commissioner"
        ? "owner"
        : role === "manager" || role === "owner" || role === "member"
            ? role
            : "member";

// Supabase returns the profiles join as an object for a to-one FK, but normalize
// defensively against a single-element array.
const normalizeAuthor = (
    author: StaffAnnouncement["author"],
): StaffAnnouncementAuthor | undefined =>
    Array.isArray(author) ? author[0] : author ?? undefined;

/**
 * `staff_feed_posts.author_role` -> the role the card names on the announcement.
 *
 * The stored value is NOT one shape. Its Postgres enum is ('owner','manager'),
 * and the League path writes through `toStaffFeedAuthorRole` (commissioner ->
 * 'owner'), while the Arena path inserts the raw `group_members.role`
 * ('commissioner' | 'manager'). Mapping only 'commissioner' left every row that
 * stored the enum's own 'owner' unlabelled, which is what made the card fall
 * back to the generic "Staff Announcement" instead of naming the poster's role.
 *
 * Prefixed forms ('arena_owner', 'league_commissioner') are accepted too so a
 * future writer can't silently re-break the label. Anything genuinely unknown
 * still omits it rather than guessing a role the poster doesn't hold.
 */
const toStaffRole = (authorRole: string): StructuredFeedStaffRole | undefined => {
    const normalized = authorRole?.trim().toLowerCase().replace(/^(arena|league)_/, "");
    // commissioner reads as "Owner" everywhere else in the Arena / League UI.
    if (normalized === "owner" || normalized === "commissioner") return "owner";
    if (normalized === "manager") return "manager";
    return undefined;
};

/**
 * Reaction tallies as the row carries them. `up` / `down` / `reaction` are the
 * same three fields the Global Social and Profile feeds read straight off a pick,
 * attached server-side from `reaction_picks`.
 */
const reactionSummaryFromRow = (pick: Pick): PickReactionSummary => {
    const up = pick.up ?? 0;
    const down = pick.down ?? 0;
    return { up, down, total: up + down, userReaction: pick.reaction ?? null };
};

/**
 * Applies a click to a summary using the SAME toggle rule the endpoint runs
 * (`reactionToPickOfTheDay`): re-clicking the active reaction removes it, the
 * other one switches sides. Keeping the two in step is what lets the button
 * respond immediately — nothing refetches this feed after a reaction.
 */
const applyReaction = (
    base: PickReactionSummary,
    reaction: PickReaction,
): PickReactionSummary => {
    const removing = base.userReaction === reaction;
    const up = Math.max(
        0,
        base.up - (base.userReaction === "up" ? 1 : 0) + (!removing && reaction === "up" ? 1 : 0),
    );
    const down = Math.max(
        0,
        base.down -
        (base.userReaction === "down" ? 1 : 0) +
        (!removing && reaction === "down" ? 1 : 0),
    );
    return { up, down, total: up + down, userReaction: removing ? null : reaction };
};

// Turn a picks row (staff or community) into the card's rich pick-detail block:
// market, selection line, accepted odds (parsed from odds_bracket), potential/
// awarded points, and a result label once settled. Mirrors the MVP feed card's
// selection rendering.
const buildPickSelection = (pick: Pick): StructuredFeedRecordSelection => {
    const parsed = parseAmericanOdds(pick.odds_bracket);
    const settled = Boolean(pick.result && pick.result !== "pending");
    return {
        summary: pick.description,
        marketLabel:
            pick.selection?.market ?? pick.market ?? pick.source_tab ?? undefined,
        acceptedAmericanOdds: parsed ?? 0,
        potentialPoints: pick.points ?? 0,
        awardedPoints: settled ? pick.awardedPoints ?? null : undefined,
        resultLabel: settled
            ? String(pick.result).replaceAll("_", " ")
            : undefined,
    };
};

export const ConnectedStructuredFeed = ({
    groupId,
    groupType = "arena",
    contextName,
    currentRole,
    writable,
    currentUserId,
    className,
    standings,
    initialFilter,
}: ConnectedStructuredFeedProps) => {
    const dispatch = useDispatch();
    const { setToast } = useToast();
    const {
        staffAnnouncements,
        staffAnnouncementsLoading,
        staffPicks,
        createdAnnouncement,
        createAnnouncementError,
        createAnnouncementMessage,
        deleteAnnouncementLoadingId,
        deleteAnnouncementError,
        deleteAnnouncementMessage,
        deleteStaffPickLoadingId,
        deleteStaffPickError,
        deleteStaffPickMessage,
        editAnnouncementLoadingId,
        editAnnouncementError,
        editAnnouncementMessage,
        pinAnnouncementLoadingId,
        pinAnnouncementError,
        pinAnnouncementMessage,
        createdStaffPick,
        createStaffPickError,
        createStaffPickMessage,
        createdCommunityPick,
        createCommunityPickError,
        createCommunityPickMessage,
        communityPicks,
        updatedCommunityPick,
        updateCommunityPickError,
        updateCommunityPickMessage,
        deleteCommunityPickLoadingId,
        deleteCommunityPickError,
        deleteCommunityPickMessage,
    } = useSelector((state: RootState) => state.arena);
    const { nflSchedulesWithOdds } = useSelector((state: RootState) => state.nfl);
    /*
     * Feed contest entries for BOTH surfaces — GET /group/feed-contest/picks.
     *
     * Replaces the Arena-only /group/arena/contest-picks/{open,closed} pair this
     * feed used to read. Both surfaces' contests live in the same `feed_contests`
     * table and their entries are the same `picks` rows (feed_contest_id set), so
     * this route returns what that pair did — and, because it is not Arena-gated,
     * finally gives a LEAGUE feed its contest entries. Those had no source at all
     * before it landed, which is why the League Feed tab showed none.
     *
     * One call rather than two also removes the open/closed dedupe: a contest
     * that locked between the two fetches used to come back in both lists.
     */
    const { groupPicks: feedContestPicks } = useSelector(
        (state: RootState) => state.feedContest
    );
    // Slip (Fantasy) contest picks — GET /pick/slip-contest-picks. League-only,
    // since Slip contests are.
    const { slipContestPicks } = useSelector((state: RootState) => state.pick);

    const feedRole = toFeedRole(currentRole);
    const isStaff = STAFF_ROLES.has(currentRole);
    const isMember = currentRole === "member";
    const isOwner = currentRole === "commissioner" || currentRole === "owner";
    const canPost = writable && isStaff;
    // Staff Picks remain an Arena-only surface; a League's staff surface is
    // announcements only. Contest entries are NO LONGER gated on this — see the
    // feed-contest and slip-contest reads above.
    const isArena = groupType === "arena";
    const isLeague = groupType === "league";
    // Community picks are the member-side counterpart of a Staff Pick. The `writable`
    // prop here actually means "is staff" (it's isArenaStaffRole from the dashboard),
    // so it can't gate a member action — gate on role and let the endpoint enforce
    // writable hosting (402 when paused), same as the Join flow.
    //
    // In an Arena, staff are noncompetitive and post Staff Picks instead. In a
    // League there is no such split: leagueFeedController allows a community pick
    // from "any League member, including the commissioner".
    const canPostCommunityPick = isMember || (!isArena && isOwner);

    const context: StructuredFeedContextMetadata = {
        kind: groupType,
        id: groupId,
        name: contextName,
    };

    // Announcements + Staff Picks are live for staff; Community Picks are live for
    // members. A League offers announcements (commissioner) and Community Picks
    // (any member) only — Staff Picks are Arena-only.
    //
    // No competitive-pick mode: like the MVP, the Feed DISPLAYS contest entries
    // (competitive_pick records from /group/feed-contest/picks) but does not
    // create them. Entering is the contest page's job — FeedContestEntryShell,
    // which posts multi-leg combos through /group/feed-contest/enter and
    // validates them against the contest's own eligible slate. The composer
    // could only ever offer a single pick off the live NFL slate, on Arena-only
    // routes, which is neither.
    const capabilities: StructuredFeedCapabilities = {
        canCreateCommunityPick: canPostCommunityPick, // member NFL moneyline
        canCreateCompetitivePick: false, // see above — contest page only
        canCreateStaffPick: isArena && canPost, // NFL moneyline, next 2 days
        canCreateStaffPost: canPost, // announcements
    };

    // Priced-selection dropdown: NFL moneyline main lines for the next 2 days.
    // detailById lets onSubmit rebuild the full payload from the chosen id.
    const { options: staffPickOptions, detailById } = useMemo(
        () => buildMoneylineStaffPickOptions(nflSchedulesWithOdds?.events, Date.now()),
        [nflSchedulesWithOdds],
    );

    // The author join can come back without a username. This Feed also serves
    // Leagues, so the placeholder has to follow the surface rather than always
    // saying "Arena".
    const staffFallbackName = isArena ? "Arena staff" : "League staff";
    const memberFallbackName = isArena ? "Arena member" : "League member";

    // Announcement -> feed record. canDelete matches the backend exactly: the
    // post's author (regardless of current role) or the Arena owner.
    const announcementToRecord = useCallback(
        (announcement: StaffAnnouncement): StructuredFeedRecord => {
            const author = normalizeAuthor(announcement.author);
            // edit / pin / delete share one rule: the post's author or the Arena
            // owner. `pinned` is set for EVERY viewer so the badge renders even for
            // members who can't toggle it.
            const canModify =
                announcement.author_user_id === currentUserId || isOwner;
            const actions = {
                ...(announcement.is_pinned ? { pinned: true } : {}),
                ...(canModify ? { canDelete: true, canEdit: true, canPin: true } : {}),
            };
            return {
                id: announcement.id,
                kind: "staff_announcement",
                author: {
                    id: author?.id ?? announcement.author_user_id,
                    displayName: author?.username ?? staffFallbackName,
                    handle: author?.username ?? undefined,
                    profileImage: author?.profile_image ?? undefined,
                },
                createdAtLabel: formatDateTime(announcement.created_at),
                title: announcement.title ?? undefined,
                body: announcement.body,
                staffRole: toStaffRole(announcement.author_role),
                actions: Object.keys(actions).length ? actions : undefined,
            };
        },
        [currentUserId, isOwner, staffFallbackName],
    );

    // Staff pick -> feed record. Rendered as a noncompetitive text record (the
    // "Staff Pick · Noncompetitive" label comes from the kind). Deletable by the
    // pick's author or the Arena owner (matches the backend rule).
    const pickToRecord = useCallback(
        (pick: ArenaStaffPick): StructuredFeedRecord => {
            const author = normalizeAuthor(pick.author) ?? pick.profiles;
            const canDelete = pick.user_id === currentUserId || isOwner;
            return {
                id: pick.id,
                kind: "staff_pick",
                author: {
                    id: author?.id ?? pick.user_id,
                    displayName: author?.username ?? "Arena staff",
                    handle: author?.username ?? undefined,
                },
                createdAtLabel: formatDateTime(pick.created_at),
                selection: buildPickSelection(pick),
                actions: canDelete ? { canDelete: true } : undefined,
            };
        },
        [currentUserId, isOwner],
    );

    // Community pick -> feed record. A member's OWN pick is editable (replace) and
    // deletable only while still pending and pregame — mirroring the backend's
    // author + pending + pregame rule for update/delete.
    //
    // `pick` carries the whole row so the card renders the canonical pick body
    // (tier tile, confidence, combo legs, result chip) instead of the compact
    // selection block; `selection` stays for the search index and as the fallback
    // if a row ever arrives without a description.
    const communityPickToRecord = useCallback(
        (pick: ArenaCommunityPick): StructuredFeedRecord => {
            const author = normalizeAuthor(pick.author) ?? pick.profiles;
            const pending = !pick.result || pick.result === "pending";
            const pregame =
                !pick.match_date || Date.parse(pick.match_date) > Date.now();
            const editable = pick.user_id === currentUserId && pending && pregame;
            const authorId = author?.id ?? pick.user_id;
            const authorName = author?.username ?? memberFallbackName;
            return {
                id: pick.id,
                kind: "community_pick",
                author: {
                    id: authorId,
                    displayName: authorName,
                    handle: author?.username ?? undefined,
                },
                createdAtLabel: formatDateTime(pick.created_at ?? ""),
                selection: buildPickSelection(pick),
                // The fetch joins the author under `author` on some responses and
                // `profiles` on others; the card reads `profiles`, so normalize.
                pick: {
                    ...pick,
                    profiles: {
                        ...pick.profiles,
                        id: authorId,
                        user_id: authorId,
                        username: authorName,
                        profile_image:
                            pick.profiles?.profile_image ?? author?.profile_image ?? undefined,
                    },
                },
                actions: editable
                    ? { canDelete: true, canReplace: true }
                    : undefined,
            };
        },
        [currentUserId, memberFallbackName],
    );


    /*
     * Feed contest entry -> feed record. BOTH surfaces, from
     * GET /group/feed-contest/picks.
     *
     * `is_revealed` is a ROW fact here, not a contest one: the caller's own entry
     * carries detail even while its contest is still open, so mask on
     * "not revealed" rather than re-deriving anything from lifecycle_status.
     */
    const feedContestPickToRecord = useCallback(
        (item: FeedContestPickRow): StructuredFeedRecord => {
            const detail = item.pick;
            // The two surfaces route their contest detail differently: an Arena's
            // lives at /arena/<id>/contests/<contestId>, a League's under
            // /league/<id>/feed-contests/<contestId>.
            const contestHref = item.contest
                ? groupType === "arena"
                    ? `/arena/${groupId}/contests/${item.contest.id}`
                    : `/league/${groupId}/feed-contests/${item.contest.id}`
                : undefined;
            const settled = Boolean(detail?.result && detail.result !== "pending");
            return {
                id: `feed-contest:${item.id}`,
                kind: "competitive_pick",
                author: {
                    id: item.member.id,
                    displayName: item.member.username ?? memberFallbackName,
                    handle: item.member.username ?? undefined,
                },
                createdAtLabel: item.submitted_at ? formatDateTime(item.submitted_at) : "",
                visibility: item.is_revealed ? "visible" : "hidden_until_lock",
                // Names the contest in the card header — "Feed Contest General
                // Combo Entry - <name> ↗" — so a feed of mixed contests reads.
                presentation:
                    item.contest && contestHref
                        ? {
                            kind: "feed_contest",
                            entryFormat:
                                item.contest.template === "sunday_pickem"
                                    ? "sunday_pickem"
                                    : "general_combo",
                            contestHref,
                            contestName: item.contest.name,
                            contextualPointsLabel:
                                groupType === "arena" ? "Arena Points" : "League Points",
                        }
                        : undefined,
                contest: item.contest
                    ? { id: item.contest.id, name: item.contest.name, href: contestHref }
                    : undefined,
                selection: detail
                    ? {
                        summary: detail.description ?? detail.matchup ?? "Contest entry",
                        marketLabel: detail.market ?? undefined,
                        acceptedAmericanOdds:
                            detail.american_odds ??
                            parseAmericanOdds(detail.odds_bracket) ??
                            0,
                        potentialPoints: detail.points ?? 0,
                        awardedPoints: settled ? detail.arena_points_awarded ?? null : undefined,
                        resultLabel: settled
                            ? String(detail.result).replaceAll("_", " ")
                            : undefined,
                    }
                    : undefined,
                // Attaching the row is what upgrades the card from the compact
                // `selection` block to the full pick card — the one that carries
                // the contest-entry header link. The server spreads the whole
                // picks row into `pick` minus its id, so the id and the author
                // embed are put back here; `FeedContestEntryPick` only declares
                // the subset this app reads, hence the cast.
                pick: detail
                    ? ({
                        ...detail,
                        id: item.id,
                        user_id: item.member.id,
                        profiles: {
                            id: item.member.id,
                            user_id: item.member.id,
                            username: item.member.username ?? memberFallbackName,
                            profile_image: item.member.profile_image ?? undefined,
                        },
                    } as unknown as Pick)
                    : undefined,
            };
        },
        [groupId, groupType, memberFallbackName],
    );

    /*
     * Slip (Fantasy) contest pick -> feed record. League-only, from
     * GET /pick/slip-contest-picks.
     *
     * Never masked: `pick` is always populated and the server states
     * `summary.is_revealed: true` on every response — a Slip contest's picks are
     * public to the group the moment they are made.
     */
    const slipContestPickToRecord = useCallback(
        (item: SlipContestPickRow): StructuredFeedRecord => {
            const detail = item.pick;
            const contestHref = item.contest
                ? `/league/${groupId}/contests/${item.contest.id}`
                : undefined;
            const settled = Boolean(detail?.result && detail.result !== "pending");
            return {
                id: `slip-contest:${item.id}`,
                kind: "competitive_pick",
                author: {
                    id: item.member.id,
                    displayName:
                        item.member.username ?? item.member.full_name ?? memberFallbackName,
                    handle: item.member.username ?? undefined,
                },
                createdAtLabel: item.submitted_at ? formatDateTime(item.submitted_at) : "",
                visibility: "visible",
                presentation:
                    item.contest && contestHref
                        ? {
                            kind: "slip_contest",
                            contestHref,
                            contestName: item.contest.name,
                        }
                        : undefined,
                contest: item.contest
                    ? { id: item.contest.id, name: item.contest.name, href: contestHref }
                    : undefined,
                selection: {
                    summary: detail.description ?? detail.matchup ?? "Contest pick",
                    marketLabel: detail.market ?? undefined,
                    acceptedAmericanOdds:
                        detail.american_odds ?? parseAmericanOdds(detail.odds_bracket) ?? 0,
                    potentialPoints: detail.points ?? 0,
                    awardedPoints: settled ? detail.arena_points_awarded ?? null : undefined,
                    resultLabel: settled
                        ? String(detail.result).replaceAll("_", " ")
                        : undefined,
                },
                // As above — the row is what renders the full pick card, which on
                // a slip-contest entry is the one with the Scoring Tier box (and
                // its tiers modal) in place of the points tile.
                pick: {
                    ...detail,
                    id: item.id,
                    user_id: item.member.id,
                    profiles: {
                        id: item.member.id,
                        user_id: item.member.id,
                        username:
                            item.member.username ?? item.member.full_name ?? memberFallbackName,
                        profile_image: item.member.profile_image ?? undefined,
                    },
                } as unknown as Pick,
            };
        },
        [groupId, memberFallbackName],
    );

    // Merge announcements + picks into one feed: pinned announcements first, then
    // everything newest-first. (Picks are never pinned.)
    const records = useMemo(() => {
        const items: Array<{ pinned: boolean; sortKey: number; record: StructuredFeedRecord }> = [
            ...staffAnnouncements.map((announcement) => ({
                pinned: announcement.is_pinned,
                sortKey: Date.parse(announcement.created_at) || 0,
                record: announcementToRecord(announcement),
            })),
            // Staff Picks and competitive entries are Arena-only surfaces, never
            // fetched for a League (see the mount effect's `if (isArena)`), but
            // arenaSlice has NO reset for these three lists. Arena -> League in one
            // SPA session would otherwise render leftover Arena rows inside the
            // League feed with live buttons: "Delete post" on a leaked staff pick
            // would dispatch group_type "league" at /group/league/staff-pick/:id — a
            // route leagueFeedRoutes does not declare — and the contest link is
            // built as /arena/${groupId}/...
            ...(isArena
                ? staffPicks.map((pick) => ({
                    pinned: false,
                    sortKey: Date.parse(pick.created_at ?? "") || 0,
                    record: pickToRecord(pick),
                }))
                : []),
            ...communityPicks.map((pick) => ({
                pinned: false,
                sortKey: Date.parse(pick.created_at ?? "") || 0,
                record: communityPickToRecord(pick),
            })),
            // Feed contest entries, both surfaces. Scoped by group id because the
            // slice is single-tenant and one commit can still hold the previous
            // group's page while the new request is in flight.
            ...(feedContestPicks?.group.id === groupId
                ? feedContestPicks.picks.map((item) => ({
                    pinned: false,
                    sortKey: Date.parse(item.submitted_at ?? "") || 0,
                    record: feedContestPickToRecord(item),
                }))
                : []),
            // Slip (Fantasy) contest picks — League only.
            ...(isLeague && slipContestPicks?.group.id === groupId
                ? slipContestPicks.picks.map((item) => ({
                    pinned: false,
                    sortKey: Date.parse(item.submitted_at ?? "") || 0,
                    record: slipContestPickToRecord(item),
                }))
                : []),
        ];
        items.sort(
            (left, right) =>
                Number(right.pinned) - Number(left.pinned) || right.sortKey - left.sortKey,
        );
        return items.map((item) => item.record);
    }, [
        isArena,
        isLeague,
        groupId,
        staffAnnouncements,
        staffPicks,
        communityPicks,
        feedContestPicks,
        slipContestPicks,
        feedContestPickToRecord,
        slipContestPickToRecord,
        announcementToRecord,
        pickToRecord,
        communityPickToRecord,
    ]);

    /* ------------------------------------------------------------------------
     * Reactions — Community Picks only.
     *
     * A community pick IS a `picks` row and its Feed record id is that row's id,
     * so POST /pick/reaction-pick-of-day takes it unchanged (the endpoint looks
     * the pick up by id and never branches on pick_type). The other kinds stay
     * out: an announcement lives in `staff_feed_posts` and would 404, and the
     * contest-entry endpoints return no tallies to render. `getReactionSummary`
     * answering null for those is what keeps their buttons off the card.
     * -------------------------------------------------------------------- */
    const communityPickById = useMemo(
        () => new Map(communityPicks.map((pick) => [pick.id, pick] as const)),
        [communityPicks],
    );

    // The Feed never refetches after a reaction, so the click is held here until
    // a later list read carries it. Keyed by pick id.
    const [reactionOverrides, setReactionOverrides] = useState<
        Record<string, PickReactionSummary>
    >({});

    // Self-healing: once a refetched row reports the same reaction the override
    // claims, the server has caught up and the override is dropped so OTHER
    // members' votes (which the override cannot see) stop being masked.
    useEffect(() => {
        setReactionOverrides((current) => {
            const entries = Object.entries(current);
            if (!entries.length) return current;
            const kept = entries.filter(([pickId, override]) => {
                const pick = communityPickById.get(pickId);
                // A pick that left the page keeps no override either.
                if (!pick) return false;
                return (pick.reaction ?? null) !== override.userReaction;
            });
            return kept.length === entries.length ? current : Object.fromEntries(kept);
        });
    }, [communityPickById]);

    const getReactionSummary = useCallback(
        (recordId: string): PickReactionSummary | null => {
            const pick = communityPickById.get(recordId);
            if (!pick) return null;
            return reactionOverrides[recordId] ?? reactionSummaryFromRow(pick);
        },
        [communityPickById, reactionOverrides],
    );

    const onReaction = useCallback(
        (recordId: string, reaction: PickReaction) => {
            const pick = communityPickById.get(recordId);
            if (!pick) return;
            const base = reactionOverrides[recordId] ?? reactionSummaryFromRow(pick);
            setReactionOverrides((current) => ({
                ...current,
                [recordId]: applyReaction(base, reaction),
            }));
            dispatch(
                createPickReactionRequest({
                    pick_id: recordId,
                    action: reaction === "up" ? "liked" : "dislike",
                }),
            );
        },
        [communityPickById, reactionOverrides, dispatch],
    );

    // Drop the previous group's rows BEFORE the new ones are requested, and again on
    // unmount. The fetch reducers only flip a loading flag — they never clear their
    // list — so without this an Arena's posts stay rendered inside a League feed for
    // the whole in-flight window, and permanently if the League fetch fails (403 for
    // a non-member, 410 for a deleted group). Those rows carry live Edit/Delete/Pin
    // buttons whose ids belong to the other surface, where both backends answer 404.
    useEffect(() => {
        dispatch(resetGroupFeed());
        // The two contest-entry slots live outside arenaSlice, so resetGroupFeed
        // does not reach them — drop them on the same boundary or a League feed
        // can paint the previous group's entries.
        dispatch(clearFeedContestPicks());
        dispatch(clearSlipContestPicks());
        // Pending reaction overrides are keyed by pick id, so they would survive
        // the switch and re-apply to whatever the next group's list happens to
        // contain — clear them on the same boundary as the rows they describe.
        setReactionOverrides({});
        return () => {
            dispatch(resetGroupFeed());
            dispatch(clearFeedContestPicks());
            dispatch(clearSlipContestPicks());
        };
    }, [groupId, groupType, dispatch]);

    // Load both lists when the Feed mounts (only rendered while the Feed tab is
    // active). Staff also pull the odds that populate the Staff Pick dropdown.
    useEffect(() => {
        if (!groupId) return;
        dispatch(fetchStaffAnnouncementsRequest({ arena_id: groupId, group_type: groupType, page: 1 }));
        dispatch(fetchCommunityPicksRequest({ arena_id: groupId, group_type: groupType, page: 1 }));
        // Feed contest entries, BOTH surfaces. One call replaces the Arena-only
        // open/closed pair for feed purposes: a page mixes contests and each row
        // states its own `is_revealed`, so there is nothing left to dedupe.
        dispatch(
            fetchFeedContestPicksRequest({ group_id: groupId, group_type: groupType, page: 1 })
        );
        // Slip (Fantasy) contests exist on Leagues only.
        if (isLeague) {
            dispatch(fetchSlipContestPicksRequest({ group_id: groupId, page: 1 }));
        }
        // Staff Picks stay an Arena-only surface; a League 404s on them.
        if (isArena) {
            dispatch(fetchStaffPicksRequest({ arena_id: groupId, group_type: groupType, page: 1 }));
        }
        // Staff Picks, Community Picks and Competitive entries all post from the same
        // NFL moneyline dropdown, so pull the odds for anyone who can post a pick.
        if (canPost || canPostCommunityPick) {
            dispatch(fetchLiveNFLScheduleRequest(undefined));
        }
    }, [groupId, groupType, isArena, isLeague, canPost, canPostCommunityPick, isMember, dispatch]);

    // Only surface a delete result for a delete initiated during THIS mount. A
    // delete that resolves after the Feed tab unmounts still sets the store field,
    // but must not re-toast (detached from the action) when the tab reopens.
    const deleteRequestedRef = useRef(false);

    useEffect(() => {
        if (!deleteRequestedRef.current) return;
        if (!deleteAnnouncementError && !deleteAnnouncementMessage) return;
        deleteRequestedRef.current = false;
        setToast({
            id: Date.now(),
            type: deleteAnnouncementError ? "error" : "success",
            message: deleteAnnouncementError ?? deleteAnnouncementMessage ?? "",
            duration: 3000,
        });
        dispatch(clearDeleteStaffAnnouncementState());
    }, [deleteAnnouncementError, deleteAnnouncementMessage, dispatch, setToast]);

    // Same one-shot pattern for staff-pick deletes.
    const deletePickRequestedRef = useRef(false);

    useEffect(() => {
        if (!deletePickRequestedRef.current) return;
        if (!deleteStaffPickError && !deleteStaffPickMessage) return;
        deletePickRequestedRef.current = false;
        setToast({
            id: Date.now(),
            type: deleteStaffPickError ? "error" : "success",
            message: deleteStaffPickError ?? deleteStaffPickMessage ?? "",
            duration: 3000,
        });
        dispatch(clearDeleteStaffPickState());
    }, [deleteStaffPickError, deleteStaffPickMessage, dispatch, setToast]);

    // Same one-shot pattern for community-pick deletes.
    const deleteCommunityRequestedRef = useRef(false);

    useEffect(() => {
        if (!deleteCommunityRequestedRef.current) return;
        if (!deleteCommunityPickError && !deleteCommunityPickMessage) return;
        deleteCommunityRequestedRef.current = false;
        setToast({
            id: Date.now(),
            type: deleteCommunityPickError ? "error" : "success",
            message: deleteCommunityPickError ?? deleteCommunityPickMessage ?? "",
            duration: 3000,
        });
        dispatch(clearDeleteCommunityPickState());
    }, [deleteCommunityPickError, deleteCommunityPickMessage, dispatch, setToast]);

    // One handler for both post types (the card renders a single Delete button);
    // each branch is single-flight-guarded on its own loadingId.
    const onDelete = useCallback(
        (record: StructuredFeedRecord) => {
            if (record.kind === "staff_announcement") {
                // The card's delete button isn't disabled and the delete saga is
                // takeEvery, so a second confirm would fire a duplicate DELETE that
                // 404s ("already deleted") and toasts a false error after the real
                // success. Bail while one is already in flight.
                if (deleteAnnouncementLoadingId) return;
                if (typeof window !== "undefined" && !window.confirm("Delete this announcement?")) {
                    return;
                }
                deleteRequestedRef.current = true;
                dispatch(
                    deleteStaffAnnouncementRequest({
                        announcement_id: record.id,
                        arena_id: groupId,
                        group_type: groupType,
                    }),
                );
                return;
            }
            if (record.kind === "staff_pick") {
                if (deleteStaffPickLoadingId) return;
                if (typeof window !== "undefined" && !window.confirm("Delete this staff pick?")) {
                    return;
                }
                deletePickRequestedRef.current = true;
                dispatch(
                    deleteStaffPickRequest({ pick_id: record.id, arena_id: groupId, group_type: groupType }),
                );
                return;
            }
            if (record.kind === "community_pick") {
                if (deleteCommunityPickLoadingId) return;
                if (typeof window !== "undefined" && !window.confirm("Delete this community pick?")) {
                    return;
                }
                deleteCommunityRequestedRef.current = true;
                dispatch(
                    deleteCommunityPickRequest({ pick_id: record.id, arena_id: groupId, group_type: groupType }),
                );
            }
        },
        [
            groupId,
            groupType,
            deleteAnnouncementLoadingId,
            deleteStaffPickLoadingId,
            deleteCommunityPickLoadingId,
            dispatch,
        ],
    );

    // Pin/unpin. Single-flight (guarded on pinAnnouncementLoadingId) so a rapid
    // re-toggle can't race; the reducer flips is_pinned and the feed re-sorts. Only
    // surface a pin FAILURE (success is obvious from the badge moving).
    const pinRequestedRef = useRef(false);

    useEffect(() => {
        if (!pinRequestedRef.current) return;
        if (!pinAnnouncementError && !pinAnnouncementMessage) return;
        pinRequestedRef.current = false;
        if (pinAnnouncementError) {
            setToast({
                id: Date.now(),
                type: "error",
                message: pinAnnouncementError,
                duration: 3000,
            });
        }
        dispatch(clearPinStaffAnnouncementState());
    }, [pinAnnouncementError, pinAnnouncementMessage, dispatch, setToast]);

    const onPin = useCallback(
        (record: StructuredFeedRecord) => {
            if (record.kind !== "staff_announcement") return;
            if (pinAnnouncementLoadingId) return;
            pinRequestedRef.current = true;
            dispatch(
                pinStaffAnnouncementRequest({
                    announcement_id: record.id,
                    arena_id: groupId,
                    group_type: groupType,
                    is_pinned: !record.actions?.pinned,
                }),
            );
        },
        [groupId, groupType, pinAnnouncementLoadingId, dispatch],
    );

    // Edit. onEdit opens the modal prefilled from the raw announcement; the modal's
    // save dispatches the PUT, and the result effect closes it on success.
    const [editing, setEditing] = useState<{ id: string; title: string; body: string } | null>(
        null,
    );
    const editRequestedRef = useRef(false);

    useEffect(() => {
        if (!editRequestedRef.current) return;
        if (!editAnnouncementError && !editAnnouncementMessage) return;
        editRequestedRef.current = false;
        if (editAnnouncementMessage) {
            setEditing(null); // close only on success; keep open so an error can retry
        }
        setToast({
            id: Date.now(),
            type: editAnnouncementError ? "error" : "success",
            message: editAnnouncementError ?? editAnnouncementMessage ?? "",
            duration: 3000,
        });
        dispatch(clearEditStaffAnnouncementState());
    }, [editAnnouncementError, editAnnouncementMessage, dispatch, setToast]);

    const onEdit = useCallback(
        (record: StructuredFeedRecord) => {
            if (record.kind !== "staff_announcement") return;
            const announcement = staffAnnouncements.find((item) => item.id === record.id);
            if (!announcement) return;
            setEditing({
                id: announcement.id,
                title: announcement.title ?? "",
                body: announcement.body,
            });
        },
        [staffAnnouncements],
    );

    const onSaveEdit = useCallback(
        (text: string, title: string) => {
            if (!editing) return;
            editRequestedRef.current = true;
            dispatch(
                editStaffAnnouncementRequest({
                    announcement_id: editing.id,
                    arena_id: groupId,
                    group_type: groupType,
                    text,
                    // Empty title clears it server-side (null wipes the column).
                    title: title ? title : null,
                }),
            );
        },
        [editing, groupId, groupType, dispatch],
    );

    // The shared composer awaits onSubmit's response to drive its own submitting /
    // success / error UI. Redux reports each write's result via state, not a return
    // value, so bridge the two: hold the composer's resolver and settle it from the
    // create-announcement / create-staff-pick state below. The resolver is TAGGED
    // with its post type so each effect settles only its own domain — otherwise an
    // orphaned saga (submit → leave tab → come back → submit the other type) whose
    // success lands late could resolve the wrong in-flight promise.
    const pendingResolve = useRef<
        | {
              kind: "staff_post" | "staff_pick" | "community_pick";
              resolve: (response: StructuredFeedSubmitResponse) => void;
          }
        | null
    >(null);

    // The replacement composer awaits onReplaceSubmit's promise; hold its resolver
    // (tagged by pick kind) and settle it from the matching update state. Community
    // picks are the only replaceable kind here — contest entries are replaced on the
    // contest page.
    const pendingReplaceResolve = useRef<
        | {
              kind: "community_pick";
              resolve: (response: StructuredFeedSubmitResponse) => void;
          }
        | null
    >(null);

    // Drop any stale transient state left by an orphaned saga from a previous mount:
    // create-state (so it can't settle a same-type promise on this fresh instance)
    // and edit/pin/delete loadingIds (a leftover loadingId would otherwise lock a
    // freshly-opened edit modal on "Saving…" or dead-click pin/delete).
    useEffect(() => {
        dispatch(clearCreateStaffAnnouncementState());
        dispatch(clearCreateStaffPickState());
        dispatch(clearCreateCommunityPickState());
        dispatch(clearUpdateCommunityPickState());
        dispatch(clearDeleteCommunityPickState());
        dispatch(clearEditStaffAnnouncementState());
        dispatch(clearPinStaffAnnouncementState());
        dispatch(clearDeleteStaffAnnouncementState());
        dispatch(clearDeleteStaffPickState());
    }, [dispatch]);

    useEffect(() => {
        const pending = pendingResolve.current;
        if (!pending || pending.kind !== "staff_post") return;
        if (createdAnnouncement || createAnnouncementMessage) {
            pending.resolve({
                status: "accepted",
                message: createAnnouncementMessage ?? "Announcement published.",
            });
            pendingResolve.current = null;
            dispatch(clearCreateStaffAnnouncementState());
        } else if (createAnnouncementError) {
            pending.resolve({ status: "rejected", message: createAnnouncementError });
            pendingResolve.current = null;
            dispatch(clearCreateStaffAnnouncementState());
        }
    }, [createdAnnouncement, createAnnouncementMessage, createAnnouncementError, dispatch]);

    useEffect(() => {
        const pending = pendingResolve.current;
        if (!pending || pending.kind !== "staff_pick") return;
        if (createdStaffPick || createStaffPickMessage) {
            pending.resolve({
                status: "accepted",
                message: createStaffPickMessage ?? "Staff pick posted.",
            });
            pendingResolve.current = null;
            dispatch(clearCreateStaffPickState());
        } else if (createStaffPickError) {
            pending.resolve({ status: "rejected", message: createStaffPickError });
            pendingResolve.current = null;
            dispatch(clearCreateStaffPickState());
        }
    }, [createdStaffPick, createStaffPickMessage, createStaffPickError, dispatch]);

    useEffect(() => {
        const pending = pendingResolve.current;
        if (!pending || pending.kind !== "community_pick") return;
        if (createdCommunityPick || createCommunityPickMessage) {
            pending.resolve({
                status: "accepted",
                message: createCommunityPickMessage ?? "Community pick posted.",
            });
            pendingResolve.current = null;
            dispatch(clearCreateCommunityPickState());
        } else if (createCommunityPickError) {
            pending.resolve({ status: "rejected", message: createCommunityPickError });
            pendingResolve.current = null;
            dispatch(clearCreateCommunityPickState());
        }
    }, [
        createdCommunityPick,
        createCommunityPickMessage,
        createCommunityPickError,
        dispatch,
    ]);

    useEffect(() => {
        const pending = pendingReplaceResolve.current;
        if (!pending || pending.kind !== "community_pick") return;
        if (updatedCommunityPick || updateCommunityPickMessage) {
            pending.resolve({
                status: "accepted",
                message: updateCommunityPickMessage ?? "Community pick updated.",
            });
            pendingReplaceResolve.current = null;
            dispatch(clearUpdateCommunityPickState());
        } else if (updateCommunityPickError) {
            pending.resolve({ status: "rejected", message: updateCommunityPickError });
            pendingReplaceResolve.current = null;
            dispatch(clearUpdateCommunityPickState());
        }
    }, [
        updatedCommunityPick,
        updateCommunityPickMessage,
        updateCommunityPickError,
        dispatch,
    ]);

    const onSubmit = useCallback(
        (submission: StructuredFeedSubmission): Promise<StructuredFeedSubmitResponse> | StructuredFeedSubmitResponse => {
            if (submission.mode === "staff_post") {
                const text = submission.body.trim();
                if (!text) {
                    return { status: "rejected", message: "Write an announcement first." };
                }
                return new Promise<StructuredFeedSubmitResponse>((resolve) => {
                    pendingResolve.current = { kind: "staff_post", resolve };
                    dispatch(createStaffAnnouncementRequest({ arena_id: groupId, group_type: groupType, text }));
                });
            }
            if (submission.mode === "staff_pick") {
                const detail = detailById[submission.selectionId];
                if (!detail) {
                    return {
                        status: "rejected",
                        message: "That selection is no longer available. Refresh and try again.",
                    };
                }
                // The option list froze its kickoff window at fetch time and never
                // refreshes while the tab stays mounted, and the backend doesn't
                // validate kickoff — so a game that started during the session can
                // still be in the dropdown. Re-check the live clock before dispatch.
                if (Date.parse(detail.match_date) <= Date.now()) {
                    return {
                        status: "rejected",
                        message: "That game has already started. Refresh for the latest slate.",
                    };
                }
                const payload = buildStaffPickPayload(detail, groupId, submission.note);
                return new Promise<StructuredFeedSubmitResponse>((resolve) => {
                    pendingResolve.current = { kind: "staff_pick", resolve };
                    dispatch(createStaffPickRequest({ ...payload, group_type: groupType }));
                });
            }
            if (submission.mode === "community_pick") {
                // Members post from the same NFL moneyline dropdown as staff.
                const detail = detailById[submission.selectionId];
                if (!detail) {
                    return {
                        status: "rejected",
                        message: "That selection is no longer available. Refresh and try again.",
                    };
                }
                if (Date.parse(detail.match_date) <= Date.now()) {
                    return {
                        status: "rejected",
                        message: "That game has already started. Refresh for the latest slate.",
                    };
                }
                const payload = buildCommunityPickPayload(detail, groupId, submission.note);
                return new Promise<StructuredFeedSubmitResponse>((resolve) => {
                    pendingResolve.current = { kind: "community_pick", resolve };
                    dispatch(createCommunityPickRequest({ ...payload, group_type: groupType }));
                });
            }
            return { status: "rejected", message: "This post type isn't available yet." };
        },
        [groupId, groupType, detailById, dispatch],
    );

    /**
     * Community Picks now come from the full Pick Builder in the New-post drawer,
     * so the payload is already built — no odds-dropdown lookup. The community
     * pick body is the same shape as createPostPick (the endpoint reads exactly
     * these fields), plus the group scope and american_odds, which the endpoint
     * needs because it recomputes `points` from it rather than trusting the body.
     *
     * Only the first pick is posted: the endpoint takes one pick per call and is
     * rate limited, so a multi-pick build would need N calls and N receipts.
     */
    const onSubmitBuiltPicks = useCallback(
        (picks: BuiltPickPayload[]): Promise<StructuredFeedSubmitResponse> | StructuredFeedSubmitResponse => {
            const payload = picks[0];
            if (!payload) {
                return { status: "rejected", message: "Build a pick before posting." };
            }
            if (payload.match_date && Date.parse(payload.match_date) <= Date.now()) {
                return {
                    status: "rejected",
                    message: "That game has already started. Refresh for the latest slate.",
                };
            }
            const americanOdds = parseAmericanOdds(payload.odds_bracket);
            if (americanOdds === null) {
                return {
                    status: "rejected",
                    message: "That pick has no priced odds yet. Rebuild it and try again.",
                };
            }

            return new Promise<StructuredFeedSubmitResponse>((resolve) => {
                pendingResolve.current = { kind: "community_pick", resolve };
                dispatch(
                    createCommunityPickRequest({
                        arena_id: groupId,
                        group_type: groupType,
                        description: payload.description,
                        odds_bracket: payload.odds_bracket,
                        american_odds: americanOdds,
                        buildMode: payload.buildMode,
                        difficulty_label: payload.difficulty_label,
                        difficultyTier: payload.difficultyTier,
                        points: payload.points,
                        sport: payload.sport,
                        gameId: payload.gameId ?? payload.selection?.gameId,
                        market: payload.market ?? payload.selection?.market,
                        scope: payload.scope ?? payload.selection?.scope,
                        side: payload.side ?? payload.selection?.side,
                        threshold: payload.threshold ?? payload.selection?.threshold,
                        teamId: payload.teamId ?? payload.selection?.teamId,
                        playerId: payload.selection?.playerId ?? undefined,
                        external_pick_key: payload.external_pick_key,
                        confidence: payload.confidence,
                        isCombo: payload.isCombo ?? false,
                        legs: payload.legs,
                        selection: payload.selection,
                        matchup: payload.matchup ?? undefined,
                        match_date: payload.match_date
                            ? new Date(payload.match_date)
                            : undefined,
                        sourceTab: payload.sourceTab,
                        validationStatus: payload.validationStatus,
                    } as CreateCommunityPickPayload),
                );
            });
        },
        [groupId, groupType, dispatch],
    );

    // Replace = update a community pick by re-picking. The member chooses a new NFL
    // moneyline in the replacement composer; we rebuild the full pick body and PUT
    // it. Only community picks are replaceable today.
    const onReplaceSubmit = useCallback(
        (
            record: StructuredFeedRecord,
            submission: StructuredFeedPickSubmission,
        ): Promise<StructuredFeedSubmitResponse> | StructuredFeedSubmitResponse => {
            const detail = detailById[submission.selectionId];
            if (!detail) {
                return {
                    status: "rejected",
                    message: "That selection is no longer available. Refresh and try again.",
                };
            }
            if (Date.parse(detail.match_date) <= Date.now()) {
                return {
                    status: "rejected",
                    message: "That game has already started. Refresh for the latest slate.",
                };
            }
            if (record.kind === "community_pick") {
                const changes = buildCommunityPickPayload(detail, groupId, submission.note);
                return new Promise<StructuredFeedSubmitResponse>((resolve) => {
                    pendingReplaceResolve.current = { kind: "community_pick", resolve };
                    dispatch(
                        updateCommunityPickRequest({
                            pick_id: record.id,
                            arena_id: groupId,
                            group_type: groupType,
                            changes,
                        }),
                    );
                });
            }
            // A competitive_pick is a contest ENTRY, replaced on the contest page
            // via /group/feed-contest/replace-entry (FeedContestEntryShell), which
            // swaps the whole combo and re-prices it. There is no single-leg
            // in-feed replacement any more — see the capabilities note above.
            return { status: "rejected", message: "This pick can't be replaced." };
        },
        [groupId, groupType, detailById, dispatch],
    );

    return (
        <>
            <StructuredFeed
                context={context}
                currentRole={feedRole}
                capabilities={capabilities}
                records={records}
                selectionOptions={staffPickOptions}
                standings={standings}
                initialFilter={initialFilter}
                currentUserId={currentUserId}
                onReaction={onReaction}
                getPickReactionSummary={getReactionSummary}
                onSubmit={onSubmit}
                onSubmitBuiltPicks={onSubmitBuiltPicks}
                onReplaceSubmit={onReplaceSubmit}
                onDelete={onDelete}
                onEdit={onEdit}
                onPin={onPin}
                emptyMessage={
                    staffAnnouncementsLoading
                        ? "Loading announcements…"
                        : isArena
                            ? "No Arena Feed activity yet."
                            : "No League Feed activity yet."
                }
                className={className}
            />
            {editing ? (
                <AnnouncementEditModal
                    initialTitle={editing.title}
                    initialBody={editing.body}
                    // Scope busy to THIS row's edit, so a stale/other-row loadingId
                    // can't trap a freshly-opened modal.
                    busy={editAnnouncementLoadingId === editing.id}
                    onSave={onSaveEdit}
                    onClose={() => {
                        if (editAnnouncementLoadingId !== editing.id) setEditing(null);
                    }}
                />
            ) : null}
        </>
    );
};

export default ConnectedStructuredFeed;
