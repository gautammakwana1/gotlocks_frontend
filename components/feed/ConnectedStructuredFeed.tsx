"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useDispatch, useSelector } from "react-redux";
import type {
    ArenaCommunityPick,
    ArenaContestPick,
    ArenaStaffPick,
    BuiltPickPayload,
    CreateCommunityPickPayload,
    FeedGroupType,
    Pick,
    RootState,
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
    clearReplaceArenaContestEntryState,
    clearSubmitArenaContestEntryState,
    clearUpdateCommunityPickState,
    createCommunityPickRequest,
    createStaffAnnouncementRequest,
    createStaffPickRequest,
    deleteCommunityPickRequest,
    deleteStaffAnnouncementRequest,
    deleteStaffPickRequest,
    editStaffAnnouncementRequest,
    fetchClosedContestPicksRequest,
    fetchCommunityPicksRequest,
    fetchJoinedOpenContestsRequest,
    fetchOpenContestPicksRequest,
    fetchStaffAnnouncementsRequest,
    fetchStaffPicksRequest,
    pinStaffAnnouncementRequest,
    replaceArenaContestEntryRequest,
    resetGroupFeed,
    submitArenaContestEntryRequest,
    updateCommunityPickRequest,
} from "@/lib/redux/slices/arenaSlice";
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
    StructuredFeedContestOption,
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

// commissioner reads as "Owner" everywhere else in the Arena UI; manager stays
// as-is. Anything else omits the staff role label.
const toStaffRole = (authorRole: string): StructuredFeedStaffRole | undefined =>
    authorRole === "commissioner"
        ? "owner"
        : authorRole === "manager"
            ? "manager"
            : undefined;

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
        joinedOpenContests,
        submittedEntryPick,
        submitEntryError,
        submitEntryMessage,
        replacedEntryPick,
        replaceEntryError,
        replaceEntryMessage,
        openContestPicks,
        closedContestPicks,
    } = useSelector((state: RootState) => state.arena);
    const { nflSchedulesWithOdds } = useSelector((state: RootState) => state.nfl);

    const feedRole = toFeedRole(currentRole);
    const isStaff = STAFF_ROLES.has(currentRole);
    const isMember = currentRole === "member";
    const isOwner = currentRole === "commissioner" || currentRole === "owner";
    const canPost = writable && isStaff;
    // League Feed contests are not wired yet, so a League has no competitive
    // entries and no Staff Picks — its staff surface is announcements only.
    const isArena = groupType === "arena";
    // Community picks are the member-side counterpart of a Staff Pick. The `writable`
    // prop here actually means "is staff" (it's isArenaStaffRole from the dashboard),
    // so it can't gate a member action — gate on role and let the endpoint enforce
    // writable hosting (402 when paused), same as the Join flow.
    //
    // In an Arena, staff are noncompetitive and post Staff Picks instead. In a
    // League there is no such split: leagueFeedController allows a community pick
    // from "any League member, including the commissioner".
    const canPostCommunityPick = isMember || (!isArena && isOwner);
    // Competitive picks are contest entries: member-only, and only when the member
    // has a joined, still-open contest they can still enter (status opted_in).
    const canPostCompetitivePick =
        isArena &&
        isMember &&
        joinedOpenContests.some((contest) => contest.my_status === "opted_in");
    // The composer's contest dropdown. acceptsEntries=false (already entered) rows
    // are shown but filtered out of the enterable list by the composer.
    const contestOptions: StructuredFeedContestOption[] = joinedOpenContests.map(
        (contest) => ({
            id: contest.id,
            name: contest.name,
            locksAtLabel: formatDateTime(contest.locks_at),
            acceptsEntries: contest.my_status === "opted_in",
        }),
    );

    const context: StructuredFeedContextMetadata = {
        kind: groupType,
        id: groupId,
        name: contextName,
    };

    // Announcements + Staff Picks are live for staff; Community Picks are live for
    // members. A League offers announcements (commissioner) and Community Picks
    // (any member) only — Staff Picks and competitive entries are Arena-only today.
    const capabilities: StructuredFeedCapabilities = {
        canCreateCommunityPick: canPostCommunityPick, // member NFL moneyline
        canCreateCompetitivePick: canPostCompetitivePick, // member contest entry
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

    // Contest pick (competitive entry) -> feed record. The server reveals `pick`
    // details only for CLOSED contests or the caller's OWN pick, so `detail`
    // presence == "revealed": show the selection when present, mask (hidden_until_
    // lock) only when it's someone else's still-open pick. A member can Replace
    // their own open pick while the game hasn't started.
    const contestPickToRecord = useCallback(
        (item: ArenaContestPick): StructuredFeedRecord => {
            const detail = item.pick;
            const settled = Boolean(detail?.result && detail.result !== "pending");
            const pregame =
                !detail?.match_date || Date.parse(detail.match_date) > Date.now();
            const canReplace = item.is_own && item.is_open && pregame;
            return {
                id: item.id,
                kind: "competitive_pick",
                author: {
                    id: item.member.id,
                    displayName: item.member.username ?? "Arena member",
                    handle: item.member.username ?? undefined,
                },
                createdAtLabel: item.created_at
                    ? formatDateTime(item.created_at)
                    : "",
                // Masked only when it's another member's still-open entry.
                visibility:
                    item.is_open && !item.is_own ? "hidden_until_lock" : "visible",
                contest: item.contest
                    ? {
                        id: item.contest.id,
                        name: item.contest.name,
                        href: `/arena/${groupId}/contests/${item.contest.id}`,
                    }
                    : undefined,
                selection: detail
                    ? {
                        summary:
                            detail.description ?? detail.matchup ?? "Contest entry",
                        marketLabel: detail.market ?? undefined,
                        acceptedAmericanOdds:
                            detail.american_odds ??
                            parseAmericanOdds(detail.odds_bracket) ??
                            0,
                        potentialPoints: detail.points ?? 0,
                        awardedPoints: settled
                            ? detail.arena_points_awarded ?? null
                            : undefined,
                        resultLabel: settled
                            ? String(detail.result).replaceAll("_", " ")
                            : undefined,
                    }
                    : undefined,
                actions: canReplace ? { canReplace: true } : undefined,
            };
        },
        [groupId],
    );

    // Merge announcements + picks into one feed: pinned announcements first, then
    // everything newest-first. (Picks are never pinned.)
    const records = useMemo(() => {
        // A contest that locks between the open- and closed-picks fetches can return
        // the same pick id in both lists. Keep the closed (revealed) copy and drop
        // the stale masked open one so React keys stay unique.
        const closedContestPickIds = new Set(closedContestPicks.map((p) => p.id));
        const openContestPicksDeduped = openContestPicks.filter(
            (item) => !closedContestPickIds.has(item.id),
        );
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
            // Competitive entries interleave by their real post time now that the
            // endpoints return created_at. Arena-only — see the note above.
            ...(isArena
                ? openContestPicksDeduped.map((item) => ({
                    pinned: false,
                    sortKey: Date.parse(item.created_at ?? "") || 0,
                    record: contestPickToRecord(item),
                }))
                : []),
            ...(isArena
                ? closedContestPicks.map((item) => ({
                    pinned: false,
                    sortKey: Date.parse(item.created_at ?? "") || 0,
                    record: contestPickToRecord(item),
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
        staffAnnouncements,
        staffPicks,
        communityPicks,
        openContestPicks,
        closedContestPicks,
        announcementToRecord,
        pickToRecord,
        communityPickToRecord,
        contestPickToRecord,
    ]);

    // Drop the previous group's rows BEFORE the new ones are requested, and again on
    // unmount. The fetch reducers only flip a loading flag — they never clear their
    // list — so without this an Arena's posts stay rendered inside a League feed for
    // the whole in-flight window, and permanently if the League fetch fails (403 for
    // a non-member, 410 for a deleted group). Those rows carry live Edit/Delete/Pin
    // buttons whose ids belong to the other surface, where both backends answer 404.
    useEffect(() => {
        dispatch(resetGroupFeed());
        return () => {
            dispatch(resetGroupFeed());
        };
    }, [groupId, groupType, dispatch]);

    // Load both lists when the Feed mounts (only rendered while the Feed tab is
    // active). Staff also pull the odds that populate the Staff Pick dropdown.
    useEffect(() => {
        if (!groupId) return;
        dispatch(fetchStaffAnnouncementsRequest({ arena_id: groupId, group_type: groupType, page: 1 }));
        dispatch(fetchCommunityPicksRequest({ arena_id: groupId, group_type: groupType, page: 1 }));
        // Staff Picks and competitive contest entries are Arena-only surfaces; a
        // League would just 404 on them until its Feed contest APIs land.
        if (isArena) {
            dispatch(fetchStaffPicksRequest({ arena_id: groupId, group_type: groupType, page: 1 }));
            // Competitive entries: open (hidden until lock) + closed (revealed). Any
            // active Arena member — including staff — can view these.
            dispatch(fetchOpenContestPicksRequest({ arena_id: groupId, page: 1 }));
            dispatch(fetchClosedContestPicksRequest({ arena_id: groupId, page: 1 }));
            // Members also load their joined open contests for the competitive-pick tab.
            if (isMember) {
                dispatch(fetchJoinedOpenContestsRequest({ arena_id: groupId }));
            }
        }
        // Staff Picks, Community Picks and Competitive entries all post from the same
        // NFL moneyline dropdown, so pull the odds for anyone who can post a pick.
        if (canPost || canPostCommunityPick) {
            dispatch(fetchLiveNFLScheduleRequest(undefined));
        }
    }, [groupId, groupType, isArena, canPost, canPostCommunityPick, isMember, dispatch]);

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
              kind:
                  | "staff_post"
                  | "staff_pick"
                  | "community_pick"
                  | "competitive_pick";
              resolve: (response: StructuredFeedSubmitResponse) => void;
          }
        | null
    >(null);

    // The replacement composer awaits onReplaceSubmit's promise; hold its resolver
    // (tagged by pick kind) and settle it from the matching update/replace state.
    const pendingReplaceResolve = useRef<
        | {
              kind: "community_pick" | "competitive_pick";
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
        dispatch(clearSubmitArenaContestEntryState());
        dispatch(clearReplaceArenaContestEntryState());
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
        const pending = pendingResolve.current;
        if (!pending || pending.kind !== "competitive_pick") return;
        if (submittedEntryPick || submitEntryMessage) {
            pending.resolve({
                status: "accepted",
                message: submitEntryMessage ?? "Competitive pick submitted.",
            });
            pendingResolve.current = null;
            dispatch(clearSubmitArenaContestEntryState());
        } else if (submitEntryError) {
            pending.resolve({ status: "rejected", message: submitEntryError });
            pendingResolve.current = null;
            dispatch(clearSubmitArenaContestEntryState());
        }
    }, [submittedEntryPick, submitEntryMessage, submitEntryError, dispatch]);

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

    useEffect(() => {
        const pending = pendingReplaceResolve.current;
        if (!pending || pending.kind !== "competitive_pick") return;
        if (replacedEntryPick || replaceEntryMessage) {
            pending.resolve({
                status: "accepted",
                message: replaceEntryMessage ?? "Competitive pick replaced.",
            });
            pendingReplaceResolve.current = null;
            dispatch(clearReplaceArenaContestEntryState());
        } else if (replaceEntryError) {
            pending.resolve({ status: "rejected", message: replaceEntryError });
            pendingReplaceResolve.current = null;
            dispatch(clearReplaceArenaContestEntryState());
        }
    }, [replacedEntryPick, replaceEntryMessage, replaceEntryError, dispatch]);

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
            if (submission.mode === "competitive_pick") {
                if (!submission.contestId) {
                    return { status: "rejected", message: "Choose a contest to enter." };
                }
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
                // The entry body is the community-pick body (the endpoint ignores
                // arena_id and resolves the arena from the contest); tag the source.
                const entry = {
                    ...buildCommunityPickPayload(detail, groupId, submission.note),
                    sourceTab: "arena_competitive",
                };
                const contestId = submission.contestId;
                return new Promise<StructuredFeedSubmitResponse>((resolve) => {
                    pendingResolve.current = { kind: "competitive_pick", resolve };
                    dispatch(
                        submitArenaContestEntryRequest({
                            contest_id: contestId,
                            arena_id: groupId,
                            entry,
                        }),
                    );
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
            if (record.kind === "competitive_pick") {
                // Keyed by the pick id (record.id). Include american_odds so the
                // endpoint recomputes the point value for the new selection (it does
                // NOT read `points` from the body).
                const changes = {
                    ...buildCommunityPickPayload(detail, groupId, submission.note),
                    sourceTab: "arena_competitive",
                    american_odds: submission.acceptedQuote.americanOdds,
                };
                return new Promise<StructuredFeedSubmitResponse>((resolve) => {
                    pendingReplaceResolve.current = { kind: "competitive_pick", resolve };
                    dispatch(
                        replaceArenaContestEntryRequest({
                            pick_id: record.id,
                            arena_id: groupId,
                            changes,
                        }),
                    );
                });
            }
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
                contestOptions={contestOptions}
                standings={standings}
                initialFilter={initialFilter}
                currentUserId={currentUserId}
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
