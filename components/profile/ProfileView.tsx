"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getLevelProgress } from "@/lib/utils/progression";
import PostFeed from "./PostFeed";
import ProfileControls, {
    type ConfidenceFilter,
    type ResultFilter,
    type SortOption,
    type TypeFilter,
} from "./ProfileControls";
import ProfileHeader from "./ProfileHeader";
import { CurrentUser, FollowersList, FollowingsList, Pick, PickResult, Picks, PickSliceState, PickType, Profile, ProgressState } from "@/lib/interfaces/interfaces";
import { useDispatch, useSelector } from "react-redux";
import { clearFollowUnfollowUserMessage, clearUpdateProfileMessage, fetchFollowersListByIdRequest, fetchFollowersListRequest, fetchFollowingListByIdRequest, fetchFollowingListRequest, fetchMemberProfileRequest, followUnfollowUserRequest, updateProfilePictureRequest, updateProfilePublicOrPrivateRequest } from "@/lib/redux/slices/authSlice";
import { fetchProgressByUserIdRequest } from "@/lib/redux/slices/progressSlice";
import { clearDeletePostPickMessage, deletePostPickRequest, fetchPostPicksByUserIdRequest } from "@/lib/redux/slices/pickSlice";
import { useToast } from "@/lib/state/ToastContext";
import FootballAnimation from "../animations/FootballAnimation";
import { getPickPoints } from "@/lib/utils/scoring";
import ScoringModal from "../modals/ScoringModal";
import Link from "next/link";
import Image from "next/image";

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
    followers: FollowersList[] | null;
    followings: FollowingsList[] | null;
    followersById: FollowersList[] | null;
    followingsById: FollowingsList[] | null;
    loading: boolean;
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

const buildInitials = (handle: string) => {
    const segments = handle.split(/[^a-zA-Z0-9]+/).filter(Boolean);
    const source = segments.length ? segments : [handle];
    const initials = source
        .map((segment) => segment.charAt(0))
        .join("")
        .slice(0, 2)
        .toUpperCase();
    return initials || "GL";
};

const normalizeResult = (result: PickResult): NonNullable<PickResult> =>
    (result ?? "pending") as NonNullable<PickResult>;

const getPickTimestamp = (pick: Pick) =>
    new Date(pick.created_at ?? pick.updated_at ?? pick.id).getTime();

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

    const { postPicks, deleteMessage, loading: postLoader } = useSelector((state: RootState) => state.pick);
    const { followings, followers, followersById, followingsById, loading: authLoader, message: authMessage, user, profileUpdateMessage, error } = useSelector((state: RootState) => state.user);
    const { progress } = useSelector((state: RootState) => state.progress);

    useEffect(() => {
        if (!targetUserId) return;
        dispatch(fetchMemberProfileRequest({ userId: targetUserId }));
        dispatch(fetchFollowingListRequest());
        dispatch(fetchFollowersListRequest());
        if (mode === "public") {
            dispatch(fetchFollowersListByIdRequest({ user_id: targetUserId }));
            dispatch(fetchFollowingListByIdRequest({ user_id: targetUserId }));
        }
        dispatch(fetchProgressByUserIdRequest({ user_id: targetUserId }));
        dispatch(fetchPostPicksByUserIdRequest({ user_id: targetUserId }));
    }, [targetUserId, dispatch, mode]);

    useEffect(() => {
        if (user?.profile && !authLoader) {
            setTargetUser(user?.profile)
        }
    }, [user?.profile, authLoader]);

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
            if (targetUserId) dispatch(fetchPostPicksByUserIdRequest({ user_id: targetUserId }));
        }
    }, [dispatch, deleteMessage, postLoader, setToast, targetUserId]);

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

    const canViewProfile = useCallback(
        (viewerId: string, targetUser: Profile | undefined) => {
            if (!targetUser) return false;
            if (viewerId === targetUser.id) return true;
            if (targetUser.is_public) return true;
            // return isFollowing(viewerId, targetUser.id);
        }, []
    );

    const viewerId = currentUser?.userId ?? "";
    const isSelf = viewerId === targetUserId;
    const computedProfileVisible =
        mode === "self" ? true : targetUser ? canViewProfile(viewerId, targetUser) : false;
    const profileVisible =
        typeof profileVisibleOverride === "boolean"
            ? profileVisibleOverride
            : computedProfileVisible;

    const postPicksList: Picks = useMemo(() => {
        if (!Array.isArray(postPicks) || !postPicks?.length) return [];
        return postPicks.filter((pick) => pick.pick_type === PickType.POST)
    }, [postPicks]);

    const filteredPicks = useMemo(() => {
        return postPicksList.filter((pick) => {
            const result = normalizeResult(pick.result);
            if (resultFilter !== "all" && result !== resultFilter) return false;
            if (typeFilter === "combo" && !pick.is_combo) return false;
            if (typeFilter === "straight" && pick.is_combo) return false;
            if (confidenceFilter !== "all" && pick.confidence !== confidenceFilter) return false;
            return true;
        });
    }, [confidenceFilter, postPicksList, resultFilter, typeFilter]);

    const sortedPicks = useMemo(() => {
        const picks = [...filteredPicks];
        picks.sort((a, b) => {
            const timeA = getPickTimestamp(a);
            const timeB = getPickTimestamp(b);
            if (sortOption === "oldest") return timeA - timeB;
            if (sortOption === "highestPoints") {
                const pointsA = getPickPoints(a);
                const pointsB = getPickPoints(b);
                if (pointsB !== pointsA) return pointsB - pointsA;
                return timeB - timeA;
            }
            if (sortOption === "mostLegs") {
                const legsA = a.legs?.length ?? 0;
                const legsB = b.legs?.length ?? 0;
                if (legsB !== legsA) return legsB - legsA;
                return timeB - timeA;
            }
            return timeB - timeA;
        });
        return picks;
    }, [filteredPicks, sortOption]);

    const visiblePicks = useMemo(
        () => (profileVisible ? sortedPicks : []),
        [profileVisible, sortedPicks]
    );

    const postWins = useMemo(
        () => postPicksList.filter((pick) => normalizeResult(pick.result) === "win").length,
        [postPicksList]
    );
    const comboCount = useMemo(
        () => postPicksList.filter((pick) => pick.is_combo).length,
        [postPicksList]
    );

    const tally = useMemo(() => {
        const wins = visiblePicks.filter((pick) => normalizeResult(pick.result) === "win").length;
        const losses = visiblePicks.filter(
            (pick) => normalizeResult(pick.result) === "loss"
        ).length;
        const pending = visiblePicks.filter(
            (pick) => normalizeResult(pick.result) === "pending"
        ).length;
        return { wins, losses, pending };
    }, [visiblePicks]);

    const handleFollowToggle = () => {
        if (!currentUser?.userId || !targetUser?.id) return;
        dispatch(followUnfollowUserRequest({ user_id: targetUser?.id }));
    };

    const handleUnfollowUser = (targetUserId: string) => {
        if (!currentUser?.userId || !targetUserId) return;
        dispatch(followUnfollowUserRequest({ user_id: targetUserId }));
    };

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
            const confirmed = window.confirm("Delete this post? This can't be undone.");
            if (!confirmed) return;
            dispatch(deletePostPickRequest({ pick_id: pickId }));
        },
        [currentUser, dispatch]
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

    const now = new Date();
    const lastXP = new Date(progress?.last_xp_date ?? 0);

    const isTodayXp =
        now.toISOString().slice(0, 10) ===
        lastXP.toISOString().slice(0, 10);
    const { level, xpIntoLevel, xpToNext, xpRemaining } = getLevelProgress(
        progress?.lifetime_xp ?? 0
    );
    const xpToday = progress?.xp_today ?? 0;
    const levelProgressPercent = xpToNext > 0 ? Math.min(100, (xpIntoLevel / xpToNext) * 100) : 0;
    const displayName = targetUser?.username ?? targetUser?.full_name ?? "Member";
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

    if (authLoader) {
        return (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
                <div className="w-48 max-w-[70vw] sm:w-60">
                    <FootballAnimation />
                </div>
            </div>
        )
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
            <ProfileHeader
                user={targetUser}
                mode={mode}
                profileVisible={profileVisible}
                isSelf={isSelf}
                showFollowControls={showFollowControls}
                isFollowing={
                    !!targetUser && !!currentUser && isFollowing(currentUser.userId, targetUser.id)
                }
                record={tally}
                stats={{
                    posts: showStats ? postPicksList.length : 0,
                    wins: showStats ? postWins : 0,
                    combos: showStats ? comboCount : 0,
                    followers: isSelfMode ? followers?.length ?? 0 : followersById?.length ?? 0,
                    following: isSelfMode ? followings?.length ?? 0 : followingsById?.length ?? 0,
                    groups: targetUser?.groups ?? 0,
                    globalPoints: showStats ? progress?.lifetime_xp ?? 0 : 0,
                    joinedAt: targetUser.created_at,
                }}
                progress={{
                    level: level,
                    xpToday: isTodayXp ? xpToday : 0,
                    xpIntoLevel: xpIntoLevel,
                    xpToNext: xpToNext,
                    xpRemaining: xpRemaining,
                    levelProgressPercent,
                }}
                onShowScoringRules={() => setShowScoringModal(true)}
                onFollowToggle={handleFollowToggle}
                onAvatarChange={handleImageChange}
                onRemoveAvatar={handleRemoveAvatar}
                onPrivacyToggle={handlePrivacyToggle}
                onFollowersClick={openFollowersPanel}
                onFollowingClick={openFollowingPanel}
            />
            <div
                className={`fixed inset-y-0 right-0 z-50 w-full max-w-[420px] border-l border-white/10 bg-black/95 shadow-2xl transition-all duration-300 ease-out sm:bg-[var(--surface-1)] sm:backdrop-blur ${followPanelOpen
                    ? "translate-x-0 opacity-100"
                    : "translate-x-full opacity-0 pointer-events-none"
                    }`}
            >
                <div className="flex h-full flex-col">
                    <div className="px-5 pt-4">
                        <button
                            type="button"
                            onClick={closeFollowPanel}
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
                        <div className="grid w-full grid-cols-2 border-b border-white/10">
                            <button
                                type="button"
                                onClick={() => setFollowPanelTab("followers")}
                                className={`-mb-px w-full border-b-2 px-2 py-3 text-center text-[10px] font-semibold tracking-[0.12em] transition sm:text-[11px] ${followPanelTab === "followers"
                                    ? "border-white text-white"
                                    : "border-transparent text-[var(--text-secondary)] hover:text-white"
                                    }`}
                            >
                                followers
                            </button>
                            <button
                                type="button"
                                onClick={() => setFollowPanelTab("following")}
                                className={`-mb-px w-full border-b-2 px-2 py-3 text-center text-[10px] font-semibold tracking-[0.12em] transition sm:text-[11px] ${followPanelTab === "following"
                                    ? "border-white text-white"
                                    : "border-transparent text-[var(--text-secondary)] hover:text-white"
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
                                    const initials = buildInitials(label);
                                    const profilePicture = user.user?.profile_image ? `${process.env.NEXT_PUBLIC_SUPABASE_S3_URL}/${user.user?.profile_image}` : undefined;
                                    return (
                                        <li
                                            key={user.user.id}
                                            className="flex items-center justify-between gap-3"
                                        >
                                            <Link
                                                href={`/user/${user.user.id}`}
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
                                                        <span className="tracking-wide">
                                                            {initials}
                                                        </span>
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

            {!profileVisible && mode === "public" ? (
                <section className="rounded-3xl border border-[var(--border-soft)] bg-[var(--surface-1)] p-5 text-sm text-[var(--text-secondary)] shadow-[var(--shadow-soft)]">
                    This profile is private. Follow to see their posts and progress.
                </section>
            ) : (
                <>
                    <div className="space-y-4">
                        <ProfileControls
                            resultFilter={resultFilter}
                            typeFilter={typeFilter}
                            confidenceFilter={confidenceFilter}
                            sortOption={sortOption}
                            variant="embedded"
                            showPostLock={mode === "self"}
                            onResultChange={setResultFilter}
                            onTypeChange={setTypeFilter}
                            onConfidenceChange={setConfidenceFilter}
                            onSortChange={setSortOption}
                        />
                        <div className="mt-4">
                            <div className="-mx-5 h-px bg-white/10 sm:mx-0" />
                            <div className="pt-4">
                                <PostFeed
                                    picks={visiblePicks}
                                    totalCount={postPicks?.length ?? 0}
                                    displayName={displayName}
                                    mode={mode}
                                    variant="embedded"
                                    canDeletePick={canDeletePick}
                                    onDeletePick={handleDeletePick}
                                />
                            </div>
                        </div>
                    </div>
                    <ScoringModal
                        open={showScoringModal}
                        onClose={() => setShowScoringModal(false)}
                        variant="global"
                    />
                </>
            )}
        </div>
    );
};

export default ProfileView;
