"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
    buildFantasyPodiumCards,
    buildFeedContestPodiumCards,
} from "@/lib/contests/feedContestPodium";
import {
    isContestFinalized,
    toPickCardStanding,
} from "@/lib/contests/pickStanding";
import type {
    FeedContestPickRow,
    FeedContestUpdateRow,
    FeedGroupType,
    GroupSelector,
    Pick,
    PickResult,
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
    createStaffAnnouncementRequest,
    deleteStaffAnnouncementRequest,
    editStaffAnnouncementRequest,
    fetchStaffAnnouncementsRequest,
    pinStaffAnnouncementRequest,
    resetGroupFeed,
} from "@/lib/redux/slices/arenaSlice";
import { fetchFantasyPodiumsRequest } from "@/lib/redux/slices/groupsSlice";
import { FANTASY_PODIUM_PAGE_SIZE } from "@/lib/redux/sagas/groupsSaga";
import {
    clearFeedContestPicks,
    clearFeedContestUpdates,
    fetchFeedContestUpdatesRequest,
    fetchFeedContestPicksRequest,
    fetchFeedContestPodiumsRequest,
} from "@/lib/redux/slices/feedContestSlice";
import {
    clearSlipContestPicks,
    fetchSlipContestPicksRequest,
} from "@/lib/redux/slices/pickSlice";
import { useToast } from "@/lib/state/ToastContext";
import { formatDateTime } from "@/lib/utils/date";
import { AnnouncementEditModal } from "./AnnouncementEditModal";
import { FEED_CONTEST_WINNERS_PAGE_SIZE } from "./FeedContestWinnersBlock";
import { StructuredFeed } from "./StructuredFeed";
import { resolveContestEntryLifecycle } from "./formatters";
import type {
    StructuredFeedCapabilities,
    StructuredFeedContextMetadata,
    StructuredFeedFilter,
    StructuredFeedProps,
    StructuredFeedRecord,
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
    /** Forwarded to StructuredFeed: the League's Fantasy/Feed flip button. */
    standingsAction?: StructuredFeedProps["standingsAction"];
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

// Turn a picks row (staff or community) into the card's rich pick-detail block:
// market, selection line, accepted odds (parsed from odds_bracket), potential/
// awarded points, and a result label once settled. Mirrors the MVP feed card's
// selection rendering.
/**
 * Narrow a raw `result` to the graded outcome the card tints on. The picks rows
 * and the contest-entry detail rows type this field differently (`PickResult` on
 * one, a bare `string` on the other), and an unrecognised value must read as
 * "not graded" rather than be cast into a tone the card would then paint.
 *
 * Without this the card's result tinting is unreachable: `resultLabel` alone
 * leaves `selection.result` undefined, which pins `data-pick-selection-state` to
 * "pending" and the selection line to plain white however the pick settled.
 */
const GRADED_PICK_RESULTS = new Set(["win", "loss", "void", "not_found"]);

const toGradedPickResult = (raw: unknown): PickResult | undefined =>
    typeof raw === "string" && GRADED_PICK_RESULTS.has(raw)
        ? (raw as PickResult)
        : undefined;

export const ConnectedStructuredFeed = ({
    groupId,
    groupType = "arena",
    contextName,
    currentRole,
    writable,
    currentUserId,
    className,
    standings,
    standingsAction,
    initialFilter,
}: ConnectedStructuredFeedProps) => {
    const dispatch = useDispatch();
    const { setToast } = useToast();
    const {
        staffAnnouncements,
        staffAnnouncementsLoading,

        createdAnnouncement,
        createAnnouncementError,
        createAnnouncementMessage,
        deleteAnnouncementLoadingId,
        deleteAnnouncementError,
        deleteAnnouncementMessage,
        editAnnouncementLoadingId,
        editAnnouncementError,
        editAnnouncementMessage,
        pinAnnouncementLoadingId,
        pinAnnouncementError,
        pinAnnouncementMessage,
    } = useSelector((state: RootState) => state.arena);
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
    const { groupPicks: feedContestPicks, updates: contestUpdates } = useSelector(
        (state: RootState) => state.feedContest
    );
    // Slip (Fantasy) contest picks — GET /pick/slip-contest-picks. League-only,
    // since Slip contests are.
    const { slipContestPicks } = useSelector((state: RootState) => state.pick);

    const feedRole = toFeedRole(currentRole);
    const isStaff = STAFF_ROLES.has(currentRole);
    const isOwner = currentRole === "commissioner" || currentRole === "owner";
    const canPost = writable && isStaff;
    // Staff Picks remain an Arena-only surface; a League's staff surface is
    // announcements only. Contest entries are NO LONGER gated on this — see the
    // feed-contest and slip-contest reads above.
    const isArena = groupType === "arena";
    const isLeague = groupType === "league";

    const context: StructuredFeedContextMetadata = {
        kind: groupType,
        id: groupId,
        name: contextName,
    };

    /* THE COMPOSER IS ANNOUNCEMENT-ONLY. All three pick modes are withdrawn,
     * each for its own reason, and the composer hides a mode whose capability is
     * false — so the drawer offers a single mode and its chooser does not render.
     *
     *   community_pick   withdrawn 2026-08-19 (create) and then entirely: the
     *                    read, the reactions and the replace path went too.
     *   staff_pick       withdrawn from BOTH surfaces: the Feed no longer
     *                    creates, reads or renders one, and nothing here reaches
     *                    /group/*​/staff-pick*.
     *   competitive_pick never created here. The Feed DISPLAYS contest entries
     *                    (from /group/feed-contest/picks) but entering is the
     *                    contest page's job — FeedContestEntryShell posts
     *                    multi-leg combos through /group/feed-contest/enter and
     *                    validates them against the contest's own slate. The
     *                    composer could only ever offer a single pick off the
     *                    live NFL slate, which is neither.
     *
     * The keys stay on the capability object because StructuredFeed's composer
     * is shared and reads all four; `false` is how a host declines a mode. */
    const capabilities: StructuredFeedCapabilities = {
        canCreateCommunityPick: false, // withdrawn — see above
        canCreateCompetitivePick: false, // contest page only
        canCreateStaffPick: false, // withdrawn — see above
        canCreateStaffPost: canPost, // announcements — the only live mode
    };

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
            // Both surfaces run the same engine, so both route their contest
            // detail through /feed-contests/<contestId>. NOT the Arena's older
            // /arena/<id>/contests/<contestId>: that is the legacy arena_contests
            // screen, and these ids are feed_contests rows.
            const contestHref = item.contest
                ? groupType === "arena"
                    ? `/arena/${groupId}/feed-contests/${item.contest.id}`
                    : `/league/${groupId}/feed-contests/${item.contest.id}`
                : undefined;
            const settled = Boolean(detail?.result && detail.result !== "pending");

            /* ---------- The Contest Rank tile ----------
             *
             * `standing` is written by finalization and is NULL until then, so
             * it doubles as the "has this played out" test. There is no LIVE
             * rank on this read — the board is only joined once ranks exist —
             * so an entry is either final, or finished-but-unranked, or pending.
             *
             * Gated on `is_revealed` the way the MVP gates it on details being
             * visible (MVP adapters.ts:434-436): a masked card must not leak a
             * placement. Belt-and-braces, since a rank is only ever written
             * after the lock that reveals the field.
             *
             * `placementEligible` is deliberately NOT derived from
             * `is_awarded`: that flag is false for everyone outside the paid
             * window, so using it would strip the podium tone off an honest 2nd
             * place in a winner-takes-all contest. The MVP sets this only for
             * TD Psychic's own eligibility rule and leaves it undefined
             * everywhere else (MVP adapters.ts:516-519). */
            const standing = toPickCardStanding({
                standing: item.standing,
                isRevealed: item.is_revealed,
                isFinalized: isContestFinalized(item.contest),
            });

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
                // Drives the Entries view's filter drawer. Read off the CONTEST's
                // lifecycle, not the row's `is_revealed` — the drawer asks which
                // phase the contest is in, which is a different question from
                // whether this viewer may see the entry's detail yet. Reuses the
                // already-fetched join, so this adds no request.
                entryLifecycle: resolveContestEntryLifecycle(item.contest?.lifecycle_status),
                // Names the contest in the card header — "Feed Contest General
                // Combo Entry - <name> ↗" — so a feed of mixed contests reads.
                presentation:
                    item.contest && contestHref
                        ? {
                            kind: "feed_contest",
                            entryFormat:
                                item.contest.template === "td_psychic"
                                    ? "td_psychic"
                                    : item.contest.template === "sunday_pickem"
                                        ? "sunday_pickem"
                                        : "general_combo",
                            contestHref,
                            contestName: item.contest.name,
                            contextualPointsLabel:
                                groupType === "arena" ? "Arena Points" : "League Points",
                            standing,
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
                        result: settled ? toGradedPickResult(detail.result) : undefined,
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
     * Contest update -> feed record. BOTH surfaces, from
     * GET /group/feed-contest/updates.
     *
     * A LIVE PROJECTION, not a stored post: nothing is written when a contest
     * opens or locks, and the same card changes status in place. That is why
     * the record id is the server's stable `contest-update:<id>` — keying on it
     * animates the card rather than tearing it down on every status change.
     *
     * Sorted by the CONTEST's created_at, matching the MVP: an update card does
     * not jump to the top of the Feed when its contest locks.
     */
    const contestUpdateToRecord = useCallback(
        (item: FeedContestUpdateRow): StructuredFeedRecord => {
            const contestHref =
                groupType === "arena"
                    ? `/arena/${groupId}/feed-contests/${item.contest.id}`
                    : `/league/${groupId}/feed-contests/${item.contest.id}`;

            /* The API sends TIMESTAMPS, never copy — only the client knows the
             * viewer's zone. A locked contest has no date to show at all: it is
             * waiting on games, not on a clock we own. */
            const timingLabel =
                item.timing.basis === "results_pending" || !item.timing.at
                    ? "Results pending"
                    : `Locks ${formatDateTime(item.timing.at)}`;

            const reward = item.contest.reward;

            return {
                id: item.id,
                kind: "contest_update",
                author: {
                    id: item.author.id,
                    displayName: item.author.username ?? memberFallbackName,
                    handle: item.author.username ?? undefined,
                },
                createdAtLabel: formatDateTime(item.contest.created_at),
                contest: {
                    id: item.contest.id,
                    name: item.contest.name,
                    href: contestHref,
                    // Arena-only server-side, and the card gates on context too.
                    ...(reward
                        ? {
                            reward: {
                                settlementLabel: reward.settlement_label,
                                providerName: reward.provider_name ?? "the Arena organizer",
                                // A prize with no place cannot be ordered or
                                // labelled, so it is dropped rather than drawn
                                // as "NaNth Place".
                                prizes: reward.prizes.flatMap((prize) =>
                                    typeof prize.place === "number"
                                        ? [{
                                            place: prize.place,
                                            title: prize.title ?? "Prize",
                                            description: prize.description ?? "",
                                            approximateValue: prize.approximate_value,
                                        }]
                                        : []
                                ),
                            },
                        }
                        : {}),
                },
                contestUpdate: {
                    status: item.status,
                    template:
                        item.contest.template === "td_psychic"
                            ? "td_psychic"
                            : item.contest.template === "sunday_pickem"
                                ? "sunday_pickem"
                                : "general_combo",
                    entrantCount: item.entrant_count,
                    entrants: item.entrants.map((entrant) => ({
                        id: entrant.id,
                        displayName: entrant.username ?? memberFallbackName,
                        handle: entrant.username ?? undefined,
                    })),
                    timingLabel,
                },
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
                // Fantasy contests only store "ACTIVE" | "ARCHIVED", so their
                // entries can only ever resolve to Open or Settled — there is no
                // stored locked/live phase. The mapper returns undefined for
                // anything else, which leaves the entry under "All entries" only
                // rather than filing it under a phase it may not be in.
                entryLifecycle: resolveContestEntryLifecycle(item.contest?.status),
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
                    result: settled ? toGradedPickResult(detail.result) : undefined,
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


    /*
     * Finalized podiums -> feed records.
     *
     * These used to render as a "Winners" block pinned above the list. They are
     * rows now, so a result sorts against the contest updates and posts around
     * it by DATE — a podium from last month no longer sits on top of this
     * morning's update.
     *
     * Both podium sources produce the same card, so one record kind carries
     * both: Feed contests from `feedContest.podium`, and a League's Fantasy
     * contests from `group.fantasyPodium`.
     *
     * Guarded on each slot's own group id, not just on the fetch: the Feed
     * renders on the same tick the group changes, and an unguarded read would
     * show the previous community's winners until the refetch landed.
     */
    const feedPodium = useSelector((state: RootState) => state.feedContest.podium);
    const fantasyPodium = useSelector(
        (state: GroupSelector) => state.group.fantasyPodium
    );

    const winnersRecords = useMemo(() => {
        const cards = [
            ...(feedPodium.groupId === groupId
                ? buildFeedContestPodiumCards(feedPodium.contests, groupType, groupId)
                : []),
            // Fantasy contests are a League surface only.
            ...(isLeague && fantasyPodium.groupId === groupId
                ? buildFantasyPodiumCards(fantasyPodium.contests, groupId, currentUserId)
                : []),
        ];

        return cards.map((card) => ({
            pinned: false,
            sortKey: Date.parse(card.sortAt ?? "") || 0,
            record: {
                id: `contest-winners:${card.contestId}`,
                kind: "contest_winners" as const,
                // The podium names its own members; this author block exists only
                // because every record carries one.
                author: { id: card.contestId, displayName: card.contestName },
                createdAtLabel: card.sortAt ? formatDateTime(card.sortAt) : "",
                contest: {
                    id: card.contestId,
                    name: card.contestName,
                    href: card.detailHref,
                },
                winnersCard: card,
            } satisfies StructuredFeedRecord,
        }));
    }, [
        feedPodium,
        fantasyPodium,
        groupId,
        groupType,
        isLeague,
        currentUserId,
    ]);
    // Merge announcements + picks into one feed: pinned announcements first, then
    // everything newest-first. (Picks are never pinned.)
    const records = useMemo(() => {
        const items: Array<{ pinned: boolean; sortKey: number; record: StructuredFeedRecord }> = [
            ...staffAnnouncements.map((announcement) => ({
                pinned: announcement.is_pinned,
                sortKey: Date.parse(announcement.created_at) || 0,
                record: announcementToRecord(announcement),
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
            // Contest UPDATE cards — one per running contest, both surfaces.
            // Sorted on the CONTEST's created_at like the MVP, so a card does
            // not jump to the top of the Feed the moment its contest locks.
            ...(contestUpdates?.group.id === groupId
                ? contestUpdates.updates.map((item) => ({
                    pinned: false,
                    sortKey: Date.parse(item.contest.created_at ?? "") || 0,
                    record: contestUpdateToRecord(item),
                }))
                : []),
            // Finalized podiums, ordered by date with everything else.
            ...winnersRecords,
        ];
        items.sort(
            (left, right) =>
                Number(right.pinned) - Number(left.pinned) || right.sortKey - left.sortKey,
        );
        return items.map((item) => item.record);
    }, [
        isLeague,
        groupId,
        staffAnnouncements,
        feedContestPicks,
        slipContestPicks,
        contestUpdates,
        winnersRecords,
        contestUpdateToRecord,
        feedContestPickToRecord,
        slipContestPickToRecord,
        announcementToRecord,

    ]);


    /* Reactions were a COMMUNITY-PICK-ONLY surface and went with them.
     *
     * `getPickReactionSummary` answered null for every other kind — an
     * announcement lives in staff_feed_posts and would 404, and the
     * contest-entry endpoints return no tallies — which is what kept the
     * buttons off those cards. With no community picks left to react to,
     * nothing can reach POST /pick/reaction-pick-of-day from the Feed, so the
     * summary/override plumbing and the reaction dispatch are gone too. */
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
        dispatch(clearFeedContestUpdates());
        return () => {
            dispatch(resetGroupFeed());
            dispatch(clearFeedContestPicks());
            dispatch(clearFeedContestUpdates());
            dispatch(clearSlipContestPicks());
        };
    }, [groupId, groupType, dispatch]);

    // Everything the Feed lists, loaded on mount (this only renders while the
    // Feed tab is active).
    //
    // NO NFL ODDS READ any more. The slate populated the Staff Pick dropdown and
    // nothing else once Community Picks went, so withdrawing Staff Picks took
    // its last consumer with it — the composer is announcement-only and asks the
    // odds feed for nothing.
    useEffect(() => {
        if (!groupId) return;
        dispatch(fetchStaffAnnouncementsRequest({ arena_id: groupId, group_type: groupType, page: 1 }));
        // Feed contest entries, BOTH surfaces. One call replaces the Arena-only
        // open/closed pair for feed purposes: a page mixes contests and each row
        // states its own `is_revealed`, so there is nothing left to dedupe.
        dispatch(
            fetchFeedContestPicksRequest({ group_id: groupId, group_type: groupType, page: 1 })
        );
        // Contest update cards — one per RUNNING contest, both surfaces. A live
        // projection, so it is simply re-read on mount rather than invalidated.
        dispatch(
            fetchFeedContestUpdatesRequest({ group_id: groupId, group_type: groupType, page: 1 })
        );
        // Slip (Fantasy) contests exist on Leagues only.
        if (isLeague) {
            dispatch(fetchSlipContestPicksRequest({ group_id: groupId, page: 1 }));
        }
    }, [groupId, groupType, isLeague, dispatch]);

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
        },
        [
            groupId,
            groupType,
            deleteAnnouncementLoadingId,

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
            kind: "staff_post";
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

    // NOTE: the community-pick resolver effects that sat here are gone with the
    // rest of that surface. No community-pick action is dispatched from this
    // Feed any more, so nothing can be awaiting a reply. The slice and saga are
    // untouched and the mount-time `clear*CommunityPickState()` calls above are
    // kept — they are pure reducers, and they stop a stale success or loadingId
    // left by an older cached bundle from leaking into this instance.

    // The Winners strip's read lives HERE rather than in FeedContestWinnersBlock
    // because the block is rendered inside CommunitySwipePager's slide, which is
    // keyed on the active view — so it unmounts and remounts on every
    // Updates/Entries/Standings switch. Owning the fetch in the pager's stable
    // parent keeps it to one GET per group, as it was before the strip moved
    // inside the pager. The block itself is now a pure read of the slice.
    useEffect(() => {
        if (!groupId) return;
        dispatch(
            fetchFeedContestPodiumsRequest({
                group_id: groupId,
                group_type: groupType,
                page: 1,
                limit: FEED_CONTEST_WINNERS_PAGE_SIZE,
            })
        );
    }, [dispatch, groupId, groupType]);

    /*
     * The FANTASY winners strip's read, owned here for the same reason as the
     * Feed one above — the block lives inside the swipe pager and would refetch
     * on every view switch if it owned this.
     *
     * League only: Fantasy contests are a League construct, and the endpoint
     * would answer an Arena with an empty list at the cost of a round trip.
     */
    useEffect(() => {
        if (!groupId || !isLeague) return;
        dispatch(
            fetchFantasyPodiumsRequest({
                group_id: groupId,
                page: 1,
                limit: FANTASY_PODIUM_PAGE_SIZE,
            })
        );
    }, [dispatch, groupId, isLeague]);

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
            return { status: "rejected", message: "This post type isn't available yet." };
        },
        [groupId, groupType, dispatch],
    );

    /* Replace went with Community Picks.
     *
     * They were the only replaceable kind: a competitive_pick is a contest
     * ENTRY, replaced on the contest page via /group/feed-contest/replace-entry
     * (FeedContestEntryShell), which swaps the whole combo and re-prices it.
     * With no `onReplaceSubmit` passed, StructuredFeed renders no Replace
     * affordance and the replacement composer is unreachable. */

    return (
        <>
            {/*
             * `onCreateAnnouncement` is deliberately NOT passed, even though the
             * MVP's ConnectedStructuredFeed owns the announcement drawer
             * (MVP:159-168). StructuredFeed's header carries exactly one create
             * affordance and picks it either/or: supplying the callback replaces
             * the four-tab composer drawer with an announcement-only workspace
             * for EVERY viewer.
             *
             * The MVP can afford that because it deleted Community Picks and
             * Staff Picks. Community Picks are gone here too now, but Staff
             * Picks are still live REST wiring on an Arena, so the drawer still
             * has more than one mode to offer and cannot collapse to an
             * announcement-only workspace. The header button already renders the
             * MVP's icon, position and chrome; only drawer OWNERSHIP stays here,
             * which is not visual.
             */}
            <StructuredFeed
                context={context}
                currentRole={feedRole}
                capabilities={capabilities}
                records={records}
                // Announcement-only composer: no mode reads a priced selection.
                selectionOptions={[]}
                standings={standings}
                standingsAction={standingsAction}
                /* No `winners` node any more. The podiums those two blocks drew
                   are now `contest_winners` RECORDS merged into `records`, so a
                   result orders by date against the updates and posts around it
                   instead of being pinned above them in a "Winners" strip.
                   FeedContestWinnersCard still draws each one — see
                   StructuredFeedCard. This component still owns both podium
                   FETCHES below; only the rendering moved. */
                initialFilter={initialFilter}
                currentUserId={currentUserId}

                onSubmit={onSubmit}
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
                    // Mounted outside any `.arena-theme` ancestor (neither host
                    // wraps the Feed in one), so the modal has to be told which
                    // surface it belongs to or an Arena edit renders League-blue.
                    isArena={isArena}
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
