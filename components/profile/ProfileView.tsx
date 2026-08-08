"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getLevelProgress } from "@/lib/utils/progression";
import PostFeed from "./PostFeed";
import ProfileControls, {
    type ConfidenceFilter,
    type ResultFilter,
    type SortOption,
    type TypeFilter,
} from "./ProfileControls";
import ProfileHeader from "./ProfileHeader";
import { ProfileFilterDrawer } from "./ProfileFilterDrawer";
import { ProfilePostComposerDrawer } from "./ProfilePostComposerDrawer";
import { BlockedUsers, CurrentUser, FollowersList, FollowingsList, FollowRequest, Pick, PickReaction, PickResult, Picks, PickSliceState, PickType, Profile, ProgressState } from "@/lib/interfaces/interfaces";
import { useDispatch, useSelector } from "react-redux";
import { accpetFollowRequest, clearFollowUnfollowUserMessage, clearUpdateProfileMessage, declineFollowRequest, fetchFollowersListByIdRequest, fetchFollowingListByIdRequest, fetchFollowingListRequest, fetchFollowRequestListRequest, fetchMemberProfileRequest, fetchProfileBadgesRequest, fetchSentFollowRequestListRequest, followUnfollowUserRequest, resetProfile, updateProfilePictureRequest, updateProfilePublicOrPrivateRequest } from "@/lib/redux/slices/authSlice";
import { fetchProgressByUserIdRequest } from "@/lib/redux/slices/progressSlice";
import { clearCreatePickReactionMessage, clearDeletePostPickMessage, createPickReactionRequest, deletePostPickRequest, fetchPostPicksByUserIdRequest } from "@/lib/redux/slices/pickSlice";
import { useToast } from "@/lib/state/ToastContext";
import ScoringModal from "../modals/ScoringModal";
import Link from "next/link";
import Image from "next/image";
import { UserIcon } from "../layout/MainTabBar";
import { getLocalStorage, setLocalStorage } from "@/lib/utils/jwtUtils";
import { getProfilePath } from "@/lib/utils/profileNavigation";
import ScrollUpButton from "../ui/ScrollUpButton";
import { generateProfileImageUrl } from "@/lib/utils/helpers";
import { LeftChevronIcon } from "../ui/SvgIcons";
import ProfileSkeleton from "../skeletons/profile/ProfileSkeleton";
import { ProfileBadgeProgress } from "@/lib/profile/badges";
import BadgesStrip from "./BadgesStrip";
import { SIDE_DRAWER_DESKTOP_WIDTH } from "@/components/layout/sideDrawerSizing";
import { SIDE_DRAWER_MOTION } from "@/components/ui/sideDrawerMotion";

type ProfileViewProps = {
    targetUserId: string;
    mode: "self" | "public";
    showFollowControls?: boolean;
    profileVisible?: boolean;
    currentUser: CurrentUser | null;
};

type AuthSliceState = {
    user: {
        profile?: Profile | null;
    } | null;
    blockedUsers: BlockedUsers[] | null;
    followers: FollowersList[] | null;
    followings: FollowingsList[] | null;
    followersById: FollowersList[] | null;
    followingsById: FollowingsList[] | null;
    followReuests: FollowRequest[] | null;
    sentFollowReuests: FollowRequest[] | null;
    profileBadges: ProfileBadgeProgress[] | null;
    loading: boolean;
    isProfileLoading?: boolean;
    badgeLoading: boolean;
    error: string | null;
    message: string | null;
    profileUpdateMessage?: string;
};

type RootState = {
    user: AuthSliceState;
    pick: PickSliceState;
    progress: ProgressState;
};

export type FollowUser = {
    id: string;
    email?: string;
    username: string;
    profile_image?: string;
};

export type FollowPanelUser = {
    id: string;
    created_at?: string;
    user: FollowUser;
};

const MAX_AVATAR_SIZE = 2 * 1024 * 1024;

const normalizeResult = (result: PickResult): NonNullable<PickResult> =>
    (result ?? "pending") as NonNullable<PickResult>;

// The profile feed is filtered and sorted server-side (fetchPostPicksByUserIdRequest).
// These maps translate each UI control value into the exact query string the
// /pick/post-picks-by-user-id endpoint expects; "all"/default values are omitted so
// the backend applies no filter for that dimension.
const RESULT_PARAM: Record<Exclude<ResultFilter, "all">, string> = {
    win: "wins",
    loss: "loss",
    pending: "pending",
    void: "void",
};

const CONFIDENCE_PARAM: Record<Exclude<ConfidenceFilter, "all">, string> = {
    HIGH: "high",
    MEDIUM: "medium",
    LOW: "low",
};

const SORT_PARAM: Partial<Record<SortOption, string>> = {
    oldest: "oldest",
    highestXp: "highest_xp",
    // "newest" (and any option the API does not support) omit sort_by; the API defaults to newest.
};

export const isUserBlocked = (blockedUsers: BlockedUsers[] | null, targetId: string) => {
    if (!blockedUsers || !blockedUsers.length || !targetId) return false;

    return blockedUsers.some(
        (block) => block.blocked_id === targetId
    );
}

const ProfileView = ({
    targetUserId,
    mode,
    showFollowControls = mode === "public",
    profileVisible: profileVisibleOverride,
    currentUser,
}: ProfileViewProps) => {
    const dispatch = useDispatch();
    const { setToast } = useToast();

    const [resultFilter, setResultFilter] = useState<ResultFilter>("all");
    const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
    const [confidenceFilter, setConfidenceFilter] = useState<ConfidenceFilter>("all");
    const [sortOption, setSortOption] = useState<SortOption>("newest");
    const [targetUser, setTargetUser] = useState<Profile | undefined>(undefined);
    const [showScoringModal, setShowScoringModal] = useState(false);
    const [followPanelOpen, setFollowPanelOpen] = useState(false);
    const [followPanelTab, setFollowPanelTab] = useState<"followers" | "following">(
        "followers"
    );
    const [pendingDeletePickId, setPendingDeletePickId] = useState<string | null>(null);
    const [pendingFollowRequests, setPendingFollowRequests] = useState<FollowRequest[]>([]);
    const [pendingUnfollowUserId, setPendingUnfollowUserId] = useState<string | null>(null);
    const [respondedFollowRequestId, setRespondedFollowRequestId] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [showScrollTop, setShowScrollTop] = useState(false);
    const observer = useRef<IntersectionObserver | null>(null);
    const [badgesOpen, setBadgesOpen] = useState(false);
    const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
    const [postComposerOpen, setPostComposerOpen] = useState(false);
    const filterDrawerTriggerRef = useRef<HTMLButtonElement | null>(null);
    const postComposerTriggerRef = useRef<HTMLButtonElement | null>(null);
    // Pick id to scroll to / highlight, sourced from a `?pick=` deep link (e.g. the
    // weekly winners leaderboard's "biggest hit" cell).
    const [highlightPickId, setHighlightPickId] = useState<string | null>(null);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const pickParam = new URLSearchParams(window.location.search).get("pick");
        setHighlightPickId(pickParam);
    }, [targetUserId]);

    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 400) {
                setShowScrollTop(true);
            } else {
                setShowScrollTop(false);
            }
        };

        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    };
    const followPanelRef = useRef<HTMLDivElement | null>(null);
    const badgesPanelRef = useRef<HTMLDivElement | null>(null);
    const limit = 10;

    const { postPicks, deleteMessage, loading: postLoader, message, hasMore } = useSelector((state: RootState) => state.pick);
    const { followings, followers, followersById, followingsById, blockedUsers, loading: authLoader, isProfileLoading, message: authMessage, user, profileUpdateMessage, error, followReuests, sentFollowReuests, profileBadges: profileBadgesList, badgeLoading } = useSelector((state: RootState) => state.user);
    const { progress, picksCount } = useSelector((state: RootState) => state.progress);

    // Active backend filters translated from the UI controls. Omitted keys mean "no filter".
    const filterParams = useMemo(() => {
        const params: {
            sort_by?: string;
            result?: string;
            pick_type?: string;
            confidence_lvl?: string;
        } = {};
        if (resultFilter !== "all") params.result = RESULT_PARAM[resultFilter];
        if (typeFilter !== "all") params.pick_type = typeFilter;
        if (confidenceFilter !== "all") params.confidence_lvl = CONFIDENCE_PARAM[confidenceFilter];
        const sortParam = SORT_PARAM[sortOption];
        if (sortParam) params.sort_by = sortParam;
        return params;
    }, [resultFilter, typeFilter, confidenceFilter, sortOption]);

    const fetchData = useCallback((pageNum: number, customLimit?: number, pickId?: string) => {
        if (!targetUserId) return;
        dispatch(fetchPostPicksByUserIdRequest({
            user_id: targetUserId,
            page: pageNum,
            limit: customLimit ?? limit,
            ...filterParams,
            ...(pickId ? { pick_id: pickId } : {}),
        }));
    }, [dispatch, targetUserId, limit, filterParams]);

    // Reset and reload profile-level data whenever the viewed profile changes.
    useEffect(() => {
        if (!targetUserId) return;
        setTargetUser(undefined);
        setRespondedFollowRequestId(null);
        dispatch(resetProfile());
        dispatch(fetchFollowingListRequest());
        dispatch(fetchFollowRequestListRequest({}));
        dispatch(fetchSentFollowRequestListRequest({}));
        dispatch(fetchProgressByUserIdRequest({ user_id: targetUserId }));
        dispatch(fetchProfileBadgesRequest({ user_id: targetUserId }));
    }, [targetUserId, dispatch, mode]);

    // Load the post feed on first render and refetch (page 1) whenever a backend
    // filter or sort changes. The `?pick=` deep link only forces a pick onto page 1
    // in the default (unfiltered) view, so an active filter never pulls in a pick
    // that would not otherwise match it.
    useEffect(() => {
        if (!targetUserId) return;
        setPage(1);
        const hasActiveFilter = Object.keys(filterParams).length > 0;
        const pickParam =
            !hasActiveFilter && typeof window !== "undefined"
                ? new URLSearchParams(window.location.search).get("pick")
                : null;
        fetchData(1, undefined, pickParam ?? undefined);
    }, [targetUserId, filterParams, fetchData]);

    useEffect(() => {
        if (user?.profile && !authLoader && !isProfileLoading) {
            setTargetUser(user?.profile)
            if (user?.profile?.username && mode === "self") {
                const storedUser = getLocalStorage<CurrentUser>("currentUser");
                setLocalStorage("currentUser", { ...storedUser, username: user?.profile?.username });
            }
        }
    }, [user?.profile, authLoader, isProfileLoading, mode]);

    useEffect(() => {
        if (Array.isArray(followReuests)) {
            setPendingFollowRequests(followReuests)
        }
    }, [followReuests]);

    useEffect(() => {
        if (!authLoader && profileUpdateMessage) {
            setToast({
                id: Date.now(),
                type: "success",
                message: profileUpdateMessage,
                duration: 3000
            });
            dispatch(fetchMemberProfileRequest({ userId: targetUserId }));
        }
        if (!authLoader && error) {
            setToast({
                id: Date.now(),
                type: "error",
                message: error,
                duration: 3000
            });
        }
        dispatch(clearUpdateProfileMessage());
    }, [profileUpdateMessage, authLoader, setToast, dispatch, error, targetUserId]);

    useEffect(() => {
        if (authLoader || !authMessage) return;

        setToast({
            id: Date.now(),
            type: "success",
            message: authMessage,
            duration: 3000
        });
        if (mode === "public") {
            dispatch(fetchFollowersListByIdRequest({ user_id: targetUserId }));
            dispatch(fetchFollowingListByIdRequest({ user_id: targetUserId }));
        }
        // Keep the incoming follow-request banner in sync after accept/decline (or any follow action).
        dispatch(fetchFollowRequestListRequest({}));
        dispatch(clearFollowUnfollowUserMessage());
    }, [dispatch, authMessage, authLoader, setToast, mode, targetUserId]);

    useEffect(() => {
        if (!postLoader && deleteMessage) {
            setToast({
                id: Date.now(),
                type: "success",
                message: deleteMessage,
                duration: 3000
            });
            dispatch(clearDeletePostPickMessage());
            if (targetUserId) {
                dispatch(fetchProgressByUserIdRequest({ user_id: targetUserId }));
                setPage(1);
                fetchData(1);
            }
        }
    }, [dispatch, deleteMessage, postLoader, setToast, targetUserId, fetchData]);

    const lastItemRef = useCallback((node: HTMLDivElement | null) => {
        if (postLoader) return;
        if (observer.current) observer.current.disconnect();

        observer.current = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && hasMore) {
                const nextPage = page + 1;
                setPage(nextPage);
                fetchData(nextPage);
            }
        });

        if (node) observer.current.observe(node);
    }, [postLoader, hasMore, page, fetchData]);

    useEffect(() => {
        if (postLoader || !message) return;
        dispatch(clearCreatePickReactionMessage())
        fetchData(1, page * limit)
    }, [message, postLoader, dispatch, targetUserId, page, fetchData]);

    const isFollowing = useCallback(
        (followerId: string | undefined, targetUserId: string | undefined): boolean => {
            if (!followerId || !targetUserId) return false;
            if (!Array.isArray(followings) || followings.length === 0) {
                return false;
            }

            return followings.some(
                (f) =>
                    f.follower_id === followerId &&
                    f.following_id === targetUserId
            );
        },
        [followings]
    );

    // const canViewProfile = useCallback(
    //     (viewerId: string, targetUser: Profile | undefined) => {
    //         if (!targetUser) return false;
    //         if (viewerId === targetUser.id) return true;
    //         if (targetUser.is_public) return true;
    //         // return isFollowing(viewerId, targetUser.id);
    //     }, []
    // );

    const hasPendingFollowRequest = useCallback(
        (requesterId: string, targetUserId: string) =>
            sentFollowReuests?.some(
                (request) =>
                    request.requester_id === requesterId &&
                    request.receiver_id === targetUserId
            ) ?? false,
        [sentFollowReuests]
    );

    const viewerId = currentUser?.userId ?? "";
    const isSelf = viewerId === targetUserId;
    const viewerBlockedTarget = targetUser ? isUserBlocked(blockedUsers, targetUser.id) : false;
    const targetBlockedViewer = targetUser ? isUserBlocked(blockedUsers, viewerId) : false;
    const followRequested = targetUser
        ? hasPendingFollowRequest(viewerId, targetUser.id)
        : false;
    const computedProfileVisible =
        mode === "self"
            ? true
            : targetUser
                ? !targetBlockedViewer &&
                (targetUser.is_public || isFollowing(viewerId, targetUser.id))
                : false;
    const profileVisible =
        typeof profileVisibleOverride === "boolean"
            ? profileVisibleOverride
            : computedProfileVisible;
    const postsVisible = profileVisible && !viewerBlockedTarget && !targetBlockedViewer;
    const showLockedPrivateHeaderSummary =
        mode === "public" &&
        Boolean(targetUser) &&
        !profileVisible &&
        !viewerBlockedTarget &&
        !targetBlockedViewer &&
        !targetUser?.is_public;

    const postPicksList: Picks = useMemo(() => {
        if (!Array.isArray(postPicks) || !postPicks?.length) return [];
        return postPicks.filter((pick) => pick.pick_type === PickType.POST);
    }, [postPicks]);

    // Result / type / confidence filtering and sorting are applied server-side (see
    // filterParams), so the loaded post picks are already filtered and in final order.
    const visiblePicks = useMemo(
        () => (profileVisible ? postPicksList : []),
        [profileVisible, postPicksList]
    );

    const postWins = useMemo(
        () => postPicksList.filter((pick) => normalizeResult(pick.result) === "win").length,
        [postPicksList]
    );
    const comboCount = useMemo(
        () => postPicksList.filter((pick) => pick.is_combo).length,
        [postPicksList]
    );

    const performUnfollowUser = useCallback(
        (userId: string) => {
            if (!currentUser) return false;
            dispatch(followUnfollowUserRequest({ user_id: userId }));
            return true;
        },
        [currentUser, dispatch]
    );

    const requestUnfollowUser = useCallback(
        (userId: string) => {
            if (!currentUser) return;
            if (!user?.profile?.is_public && isFollowing(currentUser.userId, userId)) {
                setPendingUnfollowUserId(userId);
                return;
            }
            performUnfollowUser(userId);
        },
        [currentUser, isFollowing, performUnfollowUser, user?.profile?.is_public]
    );

    const handleFollowToggle = () => {
        if (!currentUser?.userId || !targetUser?.id) return;
        const alreadyFollowing = isFollowing(currentUser.userId, targetUser.id);
        if (alreadyFollowing) {
            requestUnfollowUser(targetUser.id);
            return;
        }
        dispatch(followUnfollowUserRequest({ user_id: targetUser?.id }));
    };

    const handleUnfollowUser = (targetUserId: string) => {
        if (!currentUser?.userId || !targetUserId) return;
        dispatch(followUnfollowUserRequest({ user_id: targetUserId }));
    };

    const closeUnfollowWarning = useCallback(() => {
        setPendingUnfollowUserId(null);
    }, []);

    const confirmUnfollowUser = useCallback(() => {
        if (!pendingUnfollowUserId) return;
        if (performUnfollowUser(pendingUnfollowUserId)) {
            setPendingUnfollowUserId(null);
        }
    }, [pendingUnfollowUserId, performUnfollowUser]);

    const openFollowersPanel = useCallback(() => {
        setFollowPanelTab("followers");
        setFollowPanelOpen(true);
    }, []);

    const openFollowingPanel = useCallback(() => {
        setFollowPanelTab("following");
        setFollowPanelOpen(true);
    }, []);

    const closeFollowPanel = useCallback(() => {
        setFollowPanelOpen(false);
    }, []);

    // Only one overlay at a time — each opener closes the others so the followers
    // panel and badges panel can never sit behind a drawer's backdrop.
    const openPostComposer = useCallback(() => {
        setFollowPanelOpen(false);
        setBadgesOpen(false);
        setFilterDrawerOpen(false);
        setPostComposerOpen(true);
    }, []);

    const closePostComposer = useCallback(() => {
        setPostComposerOpen(false);
    }, []);

    const openFilterDrawer = useCallback(() => {
        setFollowPanelOpen(false);
        setBadgesOpen(false);
        setPostComposerOpen(false);
        setFilterDrawerOpen(true);
    }, []);

    const closeFilterDrawer = useCallback(() => {
        setFilterDrawerOpen(false);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (!followPanelOpen) return;

            const target = event.target;

            if (!(target instanceof Node)) return;

            if (
                followPanelRef.current &&
                !followPanelRef.current.contains(target)
            ) {
                closeFollowPanel();
            }
        };

        document.addEventListener("mousedown", handleClickOutside);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [followPanelOpen, closeFollowPanel]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (!badgesOpen) return;

            const target = event.target;

            if (!(target instanceof Node)) return;

            if (
                badgesPanelRef.current &&
                !badgesPanelRef.current.contains(target)
            ) {
                setBadgesOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [badgesOpen]);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            setToast({ id: Date.now(), type: "error", message: "Upload a valid image file.", duration: 3000 });
            e.target.value = "";
            return;
        }
        if (file.size > MAX_AVATAR_SIZE) {
            setToast({ id: Date.now(), type: "error", message: "Image must be under 2MB.", duration: 3000 });
            e.target.value = "";
            return;
        }

        const formData = new FormData();
        formData.append("image", file);
        dispatch(updateProfilePictureRequest(formData));

        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result !== "string") {
                setToast({ id: Date.now(), type: "error", message: "Unable to read that image.", duration: 3000 });
                return;
            }
        };
        reader.onerror = () => {
            setToast({ id: Date.now(), type: "error", message: "Unable to read that image.", duration: 3000 });
        };
        reader.readAsDataURL(file);
    };

    const handleRemoveAvatar = () => {
        if (!currentUser) return;
        const formData = new FormData();
        formData.append("image", "");
        dispatch(updateProfilePictureRequest(formData));
    };

    const handlePrivacyToggle = useCallback(
        () => {
            if (!currentUser) return;
            dispatch(updateProfilePublicOrPrivateRequest());
        },
        [currentUser, dispatch]
    );

    const handleDeletePick = useCallback(
        (pickId: string) => {
            if (!currentUser) return;
            setPendingDeletePickId(pickId);
        },
        [currentUser]
    );

    const closeDeletePickModal = useCallback(() => {
        setPendingDeletePickId(null);
    }, []);

    const confirmDeletePick = useCallback(
        () => {
            if (!currentUser || !pendingDeletePickId) return;
            dispatch(deletePostPickRequest({ pick_id: pendingDeletePickId }));
            setPendingDeletePickId(null);
        },
        [currentUser, dispatch, pendingDeletePickId]
    );

    const canDeletePick = useCallback(
        (pick: Pick) => {
            if (mode !== "self" || !currentUser) return false;
            if (pick.user_id !== currentUser.userId) return false;
            if (pick.pick_type !== PickType.POST) return false;
            const result = normalizeResult(pick.result);
            return result === "pending" || result === "void";
        },
        [currentUser, mode]
    );

    const handleReaction = (reaction: PickReaction, pickId: string) => {
        if (reaction && pickId) {
            dispatch(createPickReactionRequest({ pick_id: pickId, action: reaction === "up" ? "liked" : "dislike" }));
        }
    };

    const now = new Date();
    const totalXp = progress?.lifetime_xp ?? 0;
    const lastXP = new Date(progress?.last_xp_date ?? 0);

    const isTodayXp =
        now.toISOString().slice(0, 10) ===
        lastXP.toISOString().slice(0, 10);
    const { level, xpIntoLevel, xpToNext, xpRemaining } = getLevelProgress(totalXp);
    const xpToday = progress?.xp_today ?? 0;
    const levelProgressPercent = xpToNext > 0 ? Math.min(100, (xpIntoLevel / xpToNext) * 100) : 0;
    const displayName = targetUser?.username ?? targetUser?.full_name ?? "Member";
    // const resolvedShowFollowControls =
    //     showFollowControls && !viewerBlockedTarget && !targetBlockedViewer;
    // const pendingUnfollowUser = pendingUnfollowUserId ? pendingFollowRequests.find((candidate) => candidate.receiver_id === pendingUnfollowUserId) ?? null : null;
    // const pendingUnfollowLabel =
    //     pendingUnfollowUser?.receiver.username ?? pendingUnfollowUser?.receiver.full_name ?? "this member";
    const isFollowersTab = followPanelTab === "followers";
    const isSelfMode = mode === "self";

    let followPanelUsers: FollowPanelUser[] | undefined;

    if (isFollowersTab) {
        const list = isSelfMode ? followers : followersById;

        followPanelUsers = list?.map((item) => ({
            id: item.id,
            created_at: item.created_at,
            user: item.follower,
        }));
    } else {
        const list = isSelfMode ? followings : followingsById;

        followPanelUsers = list?.map((item) => ({
            id: item.id,
            created_at: item.created_at,
            user: item.following,
        }));
    }

    const showUnfollowInPanel = isSelf && followPanelTab === "following";
    const followPanelEmptyCopy =
        followPanelTab === "followers"
            ? "No followers yet."
            : "Not following anyone yet.";
    const showStats = mode === "self" || profileVisible;

    const incomingFollowRequest = useMemo(() => {
        if (mode !== "public" || isSelf || !targetUser) return null;
        if (!Array.isArray(followReuests)) return null;
        return (
            followReuests.find(
                (request) =>
                    request.requester_id === targetUser.id &&
                    request.receiver_id === viewerId &&
                    (!request.status || request.status === "pending")
            ) ?? null
        );
    }, [followReuests, mode, isSelf, targetUser, viewerId]);

    const handleAcceptIncomingFollow = useCallback(() => {
        if (!incomingFollowRequest) return;
        setRespondedFollowRequestId(incomingFollowRequest.id);
        dispatch(accpetFollowRequest({ requestId: incomingFollowRequest.id, notificationId: incomingFollowRequest.id }));
    }, [dispatch, incomingFollowRequest]);

    const handleDeclineIncomingFollow = useCallback(() => {
        if (!incomingFollowRequest) return;
        setRespondedFollowRequestId(incomingFollowRequest.id);
        dispatch(declineFollowRequest({ requestId: incomingFollowRequest.id, notificationId: incomingFollowRequest.id }));
    }, [dispatch, incomingFollowRequest]);

    const showIncomingFollowRequest =
        !!incomingFollowRequest &&
        incomingFollowRequest.id !== respondedFollowRequestId &&
        !viewerBlockedTarget &&
        !targetBlockedViewer;

    const incomingRequester = incomingFollowRequest?.requester;
    const incomingRequesterName =
        incomingRequester?.username ??
        incomingRequester?.full_name ??
        targetUser?.username ??
        "Member";
    const incomingRequesterImage = generateProfileImageUrl(incomingRequester?.profile_image);

    if (authLoader || isProfileLoading) {
        return <ProfileSkeleton />;
    }

    if (!targetUser) {
        return (
            <div className="rounded-3xl border border-[var(--border-soft)] bg-[var(--surface-1)] p-6 text-sm text-[var(--text-secondary)] shadow-[var(--shadow-soft)]">
                Member not found. The pick may have been removed. Head back to the feed to keep
                browsing.
            </div>
        );
    }

    return (
        <div className="space-y-0">
            {showIncomingFollowRequest && incomingFollowRequest && (
                <div className="sm:flex sm:justify-between sm:items-center mb-4 rounded-2xl border border-sky-300/20 bg-gradient-to-br from-sky-500/[0.10] via-slate-900/40 to-slate-950/60 p-3.5 shadow-[0_12px_44px_-20px_rgba(56,189,248,0.6)] sm:p-4">
                    <div className="flex items-center gap-3">
                        <div className="shrink-0">
                            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-white/5">
                                {incomingRequesterImage ? (
                                    <Image
                                        src={incomingRequesterImage}
                                        alt={incomingRequesterName}
                                        width={48}
                                        height={48}
                                        className="h-full w-full object-cover"
                                        draggable={false}
                                        onDragStart={(e) => e.preventDefault()}
                                        unoptimized
                                    />
                                ) : (
                                    <UserIcon className="h-6 w-6 text-white/80" />
                                )}
                            </div>
                        </div>

                        <div className="min-w-0 flex-1">
                            <p className="truncate text-[15px] leading-snug text-white">
                                <span className="font-bold">{incomingRequesterName}</span>
                                <span className="font-normal text-white/85"> wants to follow you</span>
                            </p>
                            <p className="mt-0.5 truncate text-xs text-[var(--text-secondary)]">
                                follow request pending · respond below
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-3 mt-3.5 sm:mt-0">
                        <button
                            type="button"
                            onClick={handleAcceptIncomingFollow}
                            disabled={authLoader}
                            className="ui-accent-button flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_26px_-14px_rgba(37,99,235,0.95)] transition hover:from-sky-400/90 hover:to-blue-600/85 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
                                <path d="M20 6 9 17l-5-5" />
                            </svg>
                            accept
                        </button>
                        <button
                            type="button"
                            onClick={handleDeclineIncomingFollow}
                            disabled={authLoader}
                            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.03] px-4 py-2 text-sm font-semibold text-gray-200 transition hover:border-white/30 hover:bg-white/[0.07] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
                                <path d="M18 6 6 18M6 6l12 12" />
                            </svg>
                            reject
                        </button>
                    </div>
                </div>
            )}
            <ProfileHeader
                user={targetUser}
                mode={mode}
                profileVisible={profileVisible}
                showLockedPrivateSummary={showLockedPrivateHeaderSummary}
                isSelf={isSelf}
                showFollowControls={showFollowControls}
                targetBlockedViewer={targetBlockedViewer}
                viewerBlockedTarget={viewerBlockedTarget}
                isFollowRequested={followRequested}
                isFollowing={
                    !!targetUser && !!currentUser && isFollowing(currentUser.userId, targetUser.id)
                }
                record={{
                    wins: picksCount?.win ?? 0,
                    losses: picksCount?.loss ?? 0,
                    pending: picksCount?.pending ?? 0,
                }}
                stats={{
                    posts: showStats ? postPicksList.length : 0,
                    wins: showStats ? postWins : 0,
                    combos: showStats ? comboCount : 0,
                    followers: isSelfMode ? followers?.length ?? 0 : followersById?.length ?? 0,
                    following: isSelfMode ? followings?.length ?? 0 : followingsById?.length ?? 0,
                    groups: targetUser?.groups ?? 0,
                    joinedAt: targetUser.created_at,
                }}
                progress={{
                    level: level,
                    xpToday: isTodayXp ? xpToday : 0,
                    xpIntoLevel: xpIntoLevel,
                    xpToNext: xpToNext,
                    xpRemaining: xpRemaining,
                    levelProgressPercent,
                    lifetimeXp: totalXp
                }}
                onFollowToggle={handleFollowToggle}
                onAvatarChange={handleImageChange}
                onRemoveAvatar={handleRemoveAvatar}
                onPrivacyToggle={handlePrivacyToggle}
                onFollowersClick={openFollowersPanel}
                onFollowingClick={openFollowingPanel}
                badges={postsVisible ? profileBadgesList ?? [] : undefined}
                onOpenBadges={postsVisible ? () => setBadgesOpen(true) : undefined}
            />
            <div
                ref={followPanelRef}
                data-profile-follow-drawer
                role="dialog"
                aria-label="Profile connections"
                aria-hidden={!followPanelOpen}
                inert={!followPanelOpen}
                className={`fixed inset-y-0 right-0 z-50 w-full max-w-[420px] border-l border-white/10 bg-neutral-950 shadow-2xl ${SIDE_DRAWER_DESKTOP_WIDTH.standard} ${SIDE_DRAWER_MOTION.panel} ${followPanelOpen
                    ? SIDE_DRAWER_MOTION.open
                    : `${SIDE_DRAWER_MOTION.closedRight} pointer-events-none`
                    }`}
            >
                <div className="flex h-full flex-col">
                    <div className="px-5 pt-4">
                        <button
                            type="button"
                            onClick={closeFollowPanel}
                            className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[var(--text-secondary)] transition hover:text-white"
                        >
                            <LeftChevronIcon />
                            back
                        </button>
                    </div>
                    <div className="px-5 pt-4">
                        <div className="relative grid w-full grid-cols-2 border-b border-white/10">
                            <div
                                className={`absolute bottom-0 h-[2px] w-1/2 bg-white transition-transform duration-300 ease-out`}
                                style={{
                                    transform:
                                        followPanelTab === "followers"
                                            ? "translateX(0%)"
                                            : "translateX(100%)",
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => setFollowPanelTab("followers")}
                                className={`-mb-px w-full px-2 py-3 text-center text-[10px] font-semibold tracking-[0.12em] transition sm:text-[11px] ${followPanelTab === "followers"
                                    ? "text-white"
                                    : "text-[var(--text-secondary)] hover:text-white"
                                    }`}
                            >
                                followers
                            </button>
                            <button
                                type="button"
                                onClick={() => setFollowPanelTab("following")}
                                className={`-mb-px w-full px-2 py-3 text-center text-[10px] font-semibold tracking-[0.12em] transition sm:text-[11px] ${followPanelTab === "following"
                                    ? "text-white"
                                    : "text-[var(--text-secondary)] hover:text-white"
                                    }`}
                            >
                                following
                            </button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto px-5 py-4">
                        {followPanelUsers && followPanelUsers?.length ? (
                            <ul className="space-y-3">
                                {followPanelUsers.map((user) => {
                                    const label = user.user.username ?? "Member";
                                    const handle = (user.user.username ?? "member").toLowerCase();
                                    const profilePicture = generateProfileImageUrl(user.user?.profile_image);
                                    return (
                                        <li
                                            key={user.user.id}
                                            className="flex items-center justify-between gap-3"
                                        >
                                            <Link
                                                href={getProfilePath(user.user.id, currentUser?.userId)}
                                                className="flex min-w-0 items-center gap-3 rounded-xl border border-transparent px-2 py-1 transition hover:border-white/10 hover:bg-white/5"
                                            >
                                                <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/5 text-xs font-semibold uppercase text-white">
                                                    {profilePicture ? (
                                                        <Image
                                                            src={profilePicture}
                                                            alt="Profile image"
                                                            width={56}
                                                            height={56}
                                                            className={`tracking-wide rounded-full object-cover h-9 w-9`}
                                                            draggable={false}
                                                            onDragStart={(e) => e.preventDefault()}
                                                            unoptimized
                                                        />
                                                    ) : (
                                                        <UserIcon className="h-6 w-6 text-white/80 sm:h-6 sm:w-6" />
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-semibold text-white">{label}</p>
                                                    <p className="truncate text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
                                                        @{handle}
                                                    </p>
                                                </div>
                                            </Link>
                                            {showUnfollowInPanel && user.user.id !== currentUser?.userId && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleUnfollowUser(user.user.id)}
                                                    className="rounded-lg border border-red-400/60 bg-red-500/15 px-2.5 py-1 text-[10px] tracking-[0.14em] text-red-100 transition hover:border-red-300/80 hover:text-red-50"
                                                >
                                                    unfollow
                                                </button>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        ) : (
                            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-[var(--text-secondary)]">
                                {followPanelEmptyCopy}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div
                ref={badgesPanelRef}
                data-profile-badges-drawer
                role="dialog"
                aria-label="Profile badges"
                aria-hidden={!badgesOpen}
                inert={!badgesOpen}
                className={`fixed inset-y-0 right-0 z-50 w-full max-w-[460px] border-l border-white/10 bg-neutral-950 shadow-2xl ${SIDE_DRAWER_DESKTOP_WIDTH.standard} ${SIDE_DRAWER_MOTION.panel} ${badgesOpen
                    ? SIDE_DRAWER_MOTION.open
                    : `${SIDE_DRAWER_MOTION.closedRight} pointer-events-none`
                    }`}
            >
                <div className="flex h-full flex-col">
                    <div className="px-5 pt-4">
                        <button
                            type="button"
                            onClick={() => setBadgesOpen(false)}
                            className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[var(--text-secondary)] transition hover:text-white"
                        >
                            <svg
                                aria-hidden
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                className="h-4 w-4"
                            >
                                <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            back
                        </button>
                    </div>
                    <div className="px-5 pt-4">
                        <h2 className="text-lg font-semibold text-white">Badges</h2>
                        <p className="text-sm text-[var(--text-secondary)]">
                            Track milestones across {isSelf ? "your" : `${displayName}'s`} picks.
                        </p>
                    </div>
                    <div className="flex-1 overflow-y-auto px-5 py-4">
                        <BadgesStrip postPicks={postPicksList} variant="plain" profileBadges={profileBadgesList ?? []} />
                    </div>
                </div>
            </div>

            {mode === "public" && targetBlockedViewer ? (
                <section className="rounded-3xl border border-[var(--border-soft)] bg-[var(--surface-1)] p-5 text-sm text-[var(--text-secondary)] shadow-[var(--shadow-soft)]">
                    This profile is unavailable.
                </section>
            ) : mode === "public" && viewerBlockedTarget ? (
                <section className="rounded-3xl border border-[var(--border-soft)] bg-[var(--surface-1)] p-5 text-sm text-[var(--text-secondary)] shadow-[var(--shadow-soft)]">
                    You blocked this member. Unblock them to view posts again.
                </section>
            ) : !profileVisible && mode === "public" ? (
                <section className="rounded-3xl border border-[var(--border-soft)] bg-[var(--surface-1)] p-5 text-sm text-[var(--text-secondary)] shadow-[var(--shadow-soft)]">
                    {followRequested
                        ? "Follow request sent. You’ll be able to see their posts once they accept."
                        : "This profile is private. Follow to see their posts and progress."}
                </section>
            ) : (
                <>
                    <div className="space-y-0">
                        <ProfileControls
                            resultFilter={resultFilter}
                            typeFilter={typeFilter}
                            confidenceFilter={confidenceFilter}
                            sortOption={sortOption}
                            filterDrawerOpen={filterDrawerOpen}
                            filterDrawerTriggerRef={filterDrawerTriggerRef}
                            scoringRulesOpen={showScoringModal}
                            postComposerOpen={postComposerOpen}
                            postComposerTriggerRef={postComposerTriggerRef}
                            onOpenFilterDrawer={openFilterDrawer}
                            onShowScoringRules={
                                mode === "self" ? () => setShowScoringModal(true) : undefined
                            }
                            onOpenPostComposer={mode === "self" ? openPostComposer : undefined}
                            onResultChange={setResultFilter}
                            onTypeChange={setTypeFilter}
                            onConfidenceChange={setConfidenceFilter}
                            onSortChange={setSortOption}
                        />
                        <PostFeed
                            picks={visiblePicks}
                            totalCount={postPicks?.length ?? 0}
                            displayName={displayName}
                            mode={mode}
                            variant="embedded"
                            canDeletePick={canDeletePick}
                            onDeletePick={handleDeletePick}
                            lastItemRef={lastItemRef}
                            loading={postLoader}
                            onReaction={handleReaction}
                            highlightPickId={highlightPickId}
                        />
                    </div>
                    <ScoringModal
                        open={showScoringModal}
                        onClose={() => setShowScoringModal(false)}
                        variant="global"
                    />
                </>
            )}

            {mode === "self" ? (
                <ProfilePostComposerDrawer
                    open={postComposerOpen}
                    onClose={closePostComposer}
                    returnFocusRef={postComposerTriggerRef}
                />
            ) : null}

            <ProfileFilterDrawer
                open={filterDrawerOpen}
                onClose={closeFilterDrawer}
                returnFocusRef={filterDrawerTriggerRef}
                resultFilter={resultFilter}
                typeFilter={typeFilter}
                confidenceFilter={confidenceFilter}
                sortOption={sortOption}
                onResultChange={setResultFilter}
                onTypeChange={setTypeFilter}
                onConfidenceChange={setConfidenceFilter}
                onSortChange={setSortOption}
            />

            {pendingUnfollowUserId && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm"
                    role="dialog"
                    aria-modal="true"
                    onClick={closeUnfollowWarning}
                >
                    <div
                        className="w-full max-w-sm rounded-3xl border border-white/10 bg-black p-5 shadow-2xl"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="space-y-4">
                            <div className="space-y-1 text-center">
                                <h3 className="text-base font-semibold text-white">Unfollow private profile?</h3>
                                <p className="text-xs text-gray-400">
                                    Unfollowing {displayName} means you&apos;ll need to request to
                                    follow again if you want to see their private posts later.
                                </p>
                            </div>
                            <div className="flex justify-center gap-3">
                                <button
                                    type="button"
                                    onClick={closeUnfollowWarning}
                                    className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-gray-200 transition hover:border-white/30 hover:text-white"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={confirmUnfollowUser}
                                    className="rounded-xl border border-red-400/60 bg-red-500/20 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-red-100 transition hover:border-red-300/80 hover:text-white"
                                >
                                    Unfollow
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {pendingDeletePickId && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm"
                    role="dialog"
                    aria-modal="true"
                    onClick={closeDeletePickModal}
                >
                    <div
                        className="w-full max-w-sm rounded-3xl border border-white/10 bg-black p-5 shadow-2xl"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="space-y-4">
                            <div className="space-y-1 text-center">
                                <h3 className="text-base font-semibold text-white">Delete post</h3>
                                <p className="text-xs text-gray-400">
                                    Delete this post? This can&apos;t be undone.
                                </p>
                            </div>
                            <div className="flex justify-center gap-3">
                                <button
                                    type="button"
                                    onClick={closeDeletePickModal}
                                    className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-gray-200 transition hover:border-white/30 hover:text-white"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={confirmDeletePick}
                                    className="rounded-xl border border-red-400/60 bg-red-500/20 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-red-100 transition hover:border-red-300/80 hover:text-white"
                                >
                                    Delete post
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showScrollTop && (
                <ScrollUpButton scrollToTop={scrollToTop} />
            )}
        </div>
    );
};

export default ProfileView;
