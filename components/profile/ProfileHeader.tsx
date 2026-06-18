"use client";

import {
    ReactNode,
    useCallback,
    useEffect,
    useId,
    useMemo,
    useRef,
    useState,
    type ChangeEvent,
    type MouseEvent as ReactMouseEvent,
} from "react";
import Image from "next/image";
import { Profile } from "@/lib/interfaces/interfaces";
import { generateProfileImageUrl } from "@/lib/utils/helpers";
import { UserIcon } from "../layout/MainTabBar";
import { ProfileBadgeProgress } from "@/lib/profile/badges";
import ProfileBadgeIcon from "./ProfileBadgeIcon";

type ProfileHeaderStats = {
    posts: number;
    wins: number;
    combos: number;
    followers: number;
    following: number;
    groups: number;
    joinedAt?: string;
};

type ProfileHeaderProgress = {
    level: number;
    lifetimeXp: number;
    xpToday: number;
    xpIntoLevel: number;
    xpToNext: number;
    xpRemaining: number;
    levelProgressPercent: number;
};

type ProfileHeaderRecord = {
    wins: number;
    losses: number;
    pending: number;
};

type ProfileHeaderProps = {
    user: Profile;
    mode: "self" | "public";
    profileVisible: boolean | undefined;
    showLockedPrivateSummary?: boolean;
    isSelf: boolean;
    showFollowControls: boolean;
    targetBlockedViewer: boolean;
    viewerBlockedTarget: boolean;
    isFollowing: boolean;
    isFollowRequested?: boolean;
    record: ProfileHeaderRecord;
    stats: ProfileHeaderStats;
    progress: ProfileHeaderProgress;
    onShowScoringRules: () => void;
    onFollowToggle: () => void;
    onAvatarChange: (event: ChangeEvent<HTMLInputElement>) => void;
    onRemoveAvatar: () => void;
    onPrivacyToggle: () => void;
    onFollowersClick?: () => void;
    onFollowingClick?: () => void;
    /** Sorted badge progress for the header preview; omitted when badges are hidden. */
    badges?: ProfileBadgeProgress[];
    /** Opens the full badge tracker. When omitted, the badges block is non-interactive. */
    onOpenBadges?: () => void;
};

const BADGE_PLACEHOLDERS = Array.from({ length: 3 }, (_, index) => `Locked badge ${index + 1}`);
const numberFormatter = new Intl.NumberFormat("en-US");

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

type ProfileAvatarProps = {
    avatarUrl?: string | null;
    displayName: string;
    initials: string;
    setIsAvatarOpen?: (isOpen: boolean) => void;
};

const ProfileAvatar = ({ avatarUrl, displayName, setIsAvatarOpen }: ProfileAvatarProps) => (
    <div className="relative -ml-1 flex h-16 w-16 items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-sky-200/60 via-sky-500/20 to-white/10" />
        <div className="absolute inset-[6px] rounded-full border border-sky-200/40 bg-black/40" />
        <div
            className="relative z-10 flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-sky-300/40 bg-sky-500/20 text-white"
            onClick={setIsAvatarOpen ? () => setIsAvatarOpen(true) : undefined}
        >
            {avatarUrl ? (
                <Image
                    src={avatarUrl}
                    alt={`${displayName} avatar`}
                    className="h-full w-full object-cover"
                    width={56}
                    height={56}
                    draggable={false}
                    onDragStart={(e) => e.preventDefault()}
                    unoptimized
                />
            ) : (
                <UserIcon className="h-8 w-8 text-white/80 sm:h-10 sm:w-10" />
            )}
        </div>
    </div>
);

type FollowerStatsProps = {
    followers: number;
    following: number;
    className?: string;
    showStats: boolean;
    onFollowersClick?: () => void;
    onFollowingClick?: () => void;
};

const FollowerStats = ({
    followers,
    following,
    className = "",
    onFollowersClick,
    onFollowingClick,
    showStats = true,
}: FollowerStatsProps) => (
    <div
        className={`flex flex-nowrap items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-sky-100/80 ${className}`}
    >
        {onFollowersClick ? (
            <button
                type="button"
                onClick={onFollowersClick}
                className="whitespace-nowrap transition hover:text-white"
                disabled={!showStats}
            >
                {followers} followers
            </button>
        ) : (
            <span className="whitespace-nowrap">{followers} followers</span>
        )}
        <span aria-hidden className="h-3 w-px bg-white/25" />
        {onFollowingClick ? (
            <button
                type="button"
                onClick={onFollowingClick}
                className="whitespace-nowrap transition hover:text-white"
                disabled={!showStats}
            >
                {following} following
            </button>
        ) : (
            <span className="whitespace-nowrap">{following} following</span>
        )}
    </div>
);

const ProfileHeader = ({
    user,
    mode,
    profileVisible = false,
    showLockedPrivateSummary = false,
    isSelf,
    showFollowControls,
    viewerBlockedTarget,
    isFollowing,
    isFollowRequested = false,
    record,
    stats,
    progress,
    onShowScoringRules,
    onFollowToggle,
    onAvatarChange,
    onRemoveAvatar,
    onFollowersClick,
    onFollowingClick,
    badges,
    onOpenBadges
}: ProfileHeaderProps) => {
    const avatarInputId = useId();
    const [isAvatarOpen, setIsAvatarOpen] = useState(false);
    const avatarMenuRef = useRef<HTMLDetailsElement | null>(null);
    const optionsMenuRef = useRef<HTMLDetailsElement | null>(null);
    const displayName = user.username ?? user.full_name ?? "Member";
    const initials = useMemo(() => buildInitials(displayName), [displayName]);
    const avatarUrl = generateProfileImageUrl(user.profile_image);
    const showStats = mode === "self" || profileVisible;
    const showRightSummary = showStats || showLockedPrivateSummary;
    const showNumericProgress = mode === "self";
    const showFollowSection = mode === "public" && showFollowControls && !isSelf && !viewerBlockedTarget;
    const showFollowerStats = showStats || showFollowSection;
    const privacyStatusLabel = user.is_public ? "public" : "private";
    const formattedLifetimeXp = numberFormatter.format(progress.lifetimeXp);
    const recordItems = [
        { label: "W", value: record?.wins ?? 0, tone: "text-emerald-300/50" },
        { label: "L", value: record?.losses ?? 0, tone: "text-red-300/50" },
        { label: "P", value: record?.pending ?? 0, tone: "text-amber-300/50" },
    ];
    const earnedBadgeCount = badges?.filter((badge) => badge.earnedTier).length ?? 0;

    const closeDetailsMenu = (event: ReactMouseEvent<HTMLElement>) => {
        const details = event.currentTarget.closest("details");
        if (details instanceof HTMLDetailsElement) {
            details.open = false;
        }
    };

    useEffect(() => {
        const handleClick = (event: globalThis.MouseEvent) => {
            const menus = [avatarMenuRef.current, optionsMenuRef.current].filter(
                Boolean
            ) as HTMLDetailsElement[];

            if (!menus.length) return;

            const openMenus = menus.filter((menu) => menu.open);
            if (!openMenus.length) return;

            const target = event.target instanceof Node ? event.target : null;

            if (target && openMenus.some((menu) => menu.contains(target))) {
                return;
            }

            if (openMenus.some((menu) => menu.contains(target))) {
                return;
            }

            openMenus.forEach((menu) => {
                menu.open = false;
            });
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key !== "Escape") return;
            const menus = [avatarMenuRef.current, optionsMenuRef.current].filter(
                Boolean
            ) as HTMLDetailsElement[];
            const openMenus = menus.filter((menu) => menu.open);
            if (!openMenus.length) return;
            openMenus.forEach((menu) => {
                menu.open = false;
            });
        };

        document.addEventListener("mousedown", handleClick);
        document.addEventListener("keydown", handleEscape);
        return () => {
            document.removeEventListener("mousedown", handleClick);
            document.removeEventListener("keydown", handleEscape);
        };
    }, []);

    const renderFollowControls = (className = "") => {
        if (!showFollowSection) return null;
        return (
            <div className={`flex flex-wrap items-center gap-2 ${className}`}>
                {isFollowing ? (
                    <details className="relative">
                        <summary
                            aria-label="Following options"
                            className="list-none cursor-pointer rounded-lg border border-sky-300/60 bg-sky-500/15 px-2.5 py-1 text-[10px] tracking-[0.14em] text-sky-100 transition hover:border-sky-200/80 [&::-webkit-details-marker]:hidden"
                        >
                            following
                        </summary>
                        <div className="absolute left-0 top-full mt-2 w-20 rounded-lg border border-white/10 bg-black/80 p-1 text-[10px] tracking-[0.14em] text-white shadow-lg backdrop-blur">
                            <button
                                type="button"
                                onClick={(event) => {
                                    onFollowToggle();
                                    closeDetailsMenu(event);
                                }}
                                className="flex w-full items-center justify-start rounded-md px-1.5 py-1 text-left text-red-200 transition hover:bg-white/10"
                            >
                                unfollow
                            </button>
                        </div>
                    </details>
                ) : isFollowRequested ? (
                    <button
                        type="button"
                        disabled
                        className="cursor-default rounded-lg border border-amber-300/45 bg-amber-500/10 px-2.5 py-1 text-[10px] tracking-[0.14em] text-amber-100"
                    >
                        requested
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={onFollowToggle}
                        className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-[10px] tracking-[0.14em] text-white transition hover:border-sky-300/60"
                    >
                        follow
                    </button>
                )}
            </div>
        );
    };

    return (
        <header className="relative overflow-visible -mx-5 bg-black sm:-mx-6">
            <div className="relative px-5 pt-2 pb-5 sm:px-6 sm:pt-3 sm:pb-6">
                <div className="relative">
                    <div className="pointer-events-none absolute -inset-y-2 inset-x-0 rounded-[18px] bg-gradient-to-br from-slate-950/80 via-slate-900/65 to-blue-900/35 ring-1 ring-white/10 sm:-inset-y-3">
                        <div className="absolute inset-[1px] rounded-[17px] bg-gradient-to-b from-white/10 via-white/5 to-black/70" />
                        <div className="absolute inset-0 rounded-[18px] bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.18),transparent_55%)]" />
                    </div>
                    <div className="relative px-4 py-2 sm:px-5">
                        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,240px)]">
                            <div className="flex flex-col">
                                {/* Identity */}
                                <div className="relative -mx-4 flex items-center gap-3 border-b border-white/10 px-4 pb-2 sm:-mx-5 sm:px-5 lg:mr-0">
                                    {showFollowerStats && (
                                        <span
                                            className={`absolute right-4 top-0 rounded-full px-2 py-0.5 text-[9px] font-semibold lowercase tracking-[0.12em] sm:right-5 ${user.is_public
                                                ? "bg-sky-500/80 text-white"
                                                : "bg-white/15 text-white/80"
                                                }`}
                                        >
                                            {privacyStatusLabel}
                                        </span>
                                    )}
                                    <div className="flex shrink-0 flex-col items-center gap-1">
                                        {mode === "self" ? (
                                            <details
                                                ref={avatarMenuRef}
                                                className="relative z-20"
                                            >
                                                <summary
                                                    aria-label="Profile photo actions"
                                                    className="relative list-none cursor-pointer [&::-webkit-details-marker]:hidden"
                                                >
                                                    <ProfileAvatar
                                                        avatarUrl={avatarUrl}
                                                        displayName={displayName}
                                                        initials={initials}
                                                    />
                                                    {showStats && (
                                                        <span className="sr-only">Level {progress.level}</span>
                                                    )}
                                                </summary>
                                                <div className="absolute left-0 top-full mt-2 w-40 rounded-2xl border border-white/10 bg-black/80 p-2 text-xs uppercase tracking-[0.16em] text-white shadow-lg backdrop-blur">
                                                    <label
                                                        htmlFor={avatarInputId}
                                                        onClick={closeDetailsMenu}
                                                        className="flex w-full cursor-pointer items-center justify-between rounded-xl px-3 py-2 transition hover:bg-white/10"
                                                    >
                                                        {avatarUrl ? "edit photo" : "upload photo"}
                                                    </label>
                                                    {avatarUrl && (
                                                        <button
                                                            type="button"
                                                            onClick={(event) => {
                                                                onRemoveAvatar();
                                                                closeDetailsMenu(event);
                                                            }}
                                                            className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-red-200 transition hover:bg-white/10"
                                                        >
                                                            remove photo
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={(event) => {
                                                            setIsAvatarOpen(true);
                                                            closeDetailsMenu(event);
                                                        }}
                                                        className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-red-200 transition hover:bg-white/10"
                                                    >
                                                        view photo
                                                    </button>
                                                </div>
                                            </details>
                                        ) : (
                                            <div className="relative">
                                                <ProfileAvatar
                                                    avatarUrl={avatarUrl}
                                                    displayName={displayName}
                                                    initials={initials}
                                                    setIsAvatarOpen={setIsAvatarOpen}
                                                />
                                                {showStats && (
                                                    <span className="sr-only">Level {progress.level}</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                                        <div className="flex items-center gap-2 pr-14">
                                            <div className="truncate text-3xl font-bold leading-none text-white">
                                                {displayName}
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
                                            {showFollowerStats && (
                                                <FollowerStats
                                                    followers={stats.followers}
                                                    following={stats.following}
                                                    className="sm:flex sm:gap-3 sm:text-[11px] sm:tracking-[0.18em] sm:mt-2"
                                                    onFollowersClick={onFollowersClick}
                                                    onFollowingClick={onFollowingClick}
                                                    showStats={showStats}
                                                />
                                            )}
                                            {renderFollowControls("lg:absolute lg:bottom-2 lg:right-5")}
                                        </div>
                                    </div>
                                </div>

                                {/* Stats */}
                                {showRightSummary && (
                                    <div className="-mx-4 space-y-2.5 border-b border-white/10 px-4 py-3 sm:-mx-5 sm:px-5 lg:mr-0 lg:border-b-0">
                                        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
                                            {showStats && (
                                                <span className="text-xl font-bold uppercase leading-none tracking-wide text-white sm:text-2xl">
                                                    LVL {progress.level}
                                                </span>
                                            )}
                                            <div className="flex items-baseline gap-6 text-xl font-bold uppercase tracking-wide sm:gap-8 sm:text-2xl">
                                                {recordItems.map((item) => (
                                                    <span
                                                        key={item.label}
                                                        className={`flex items-baseline gap-1.5 ${item.tone}`}
                                                    >
                                                        <span>{item.label}:</span>
                                                        <span>{item.value}</span>
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        {showStats && (
                                            <>
                                                <div className="h-2 w-full rounded-full bg-white/10">
                                                    <div
                                                        className="h-2 rounded-full bg-sky-400/80 transition-all"
                                                        style={{ width: `${progress.levelProgressPercent}%` }}
                                                    />
                                                </div>
                                                <div className="flex items-start justify-between gap-3">
                                                    {isSelf ? (
                                                        <button
                                                            type="button"
                                                            onClick={onShowScoringRules}
                                                            className="text-[11px] font-semibold lowercase tracking-wide text-sky-300 underline decoration-sky-300/40 transition hover:text-sky-200"
                                                        >
                                                            scoring rules
                                                        </button>
                                                    ) : (
                                                        <span />
                                                    )}
                                                    <div className="text-right text-[10px] uppercase leading-tight tracking-wide text-sky-100/75">
                                                        {showNumericProgress && (
                                                            <p>{progress.xpRemaining} XP to next</p>
                                                        )}
                                                        <p>
                                                            <span className="text-white/55">Total XP </span>
                                                            <span className="font-semibold text-white">
                                                                {formattedLifetimeXp}
                                                            </span>
                                                        </p>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="pt-3 lg:relative lg:pt-0 lg:pl-6">
                                <div
                                    aria-hidden
                                    className="hidden lg:absolute lg:-top-4 lg:-bottom-4 lg:left-0 lg:block lg:w-px lg:bg-white/10"
                                />
                                {onOpenBadges ? (
                                    <button
                                        type="button"
                                        onClick={onOpenBadges}
                                        className="group flex w-full flex-col gap-2.5 text-left lg:h-full lg:justify-between lg:gap-4"
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
                                                badges
                                            </p>
                                            <span className="text-[10px] uppercase tracking-wide text-sky-200 transition group-hover:text-sky-100">
                                                {earnedBadgeCount} earned
                                            </span>
                                        </div>
                                        <div className={`flex flex-wrap items-center gap-2 lg:gap-3`}>
                                            {(badges ?? []).slice(0, 8).map((badge) => (
                                                <ProfileBadgeIcon
                                                    key={badge.definition.id}
                                                    badgeId={badge.definition.id}
                                                    tierLevel={badge.earnedTier?.level ?? "locked"}
                                                    className="h-8 w-8 lg:h-10 lg:w-10"
                                                    glow={false}
                                                />
                                            ))}
                                        </div>
                                        <span className="flex justify-end text-sky-200 transition group-hover:text-sky-100">
                                            <svg
                                                aria-hidden
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                className="h-4 w-4"
                                            >
                                                <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </span>
                                    </button>
                                ) : (
                                    <div className="space-y-2.5">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
                                                badges
                                            </p>
                                            <span className="text-[9px] uppercase tracking-wide text-[var(--text-secondary)]">
                                                coming soon
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {BADGE_PLACEHOLDERS.map((label, index) => (
                                                <div
                                                    key={`${label}-${index}`}
                                                    className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[var(--text-secondary)]"
                                                >
                                                    <svg
                                                        aria-hidden
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth="1.6"
                                                        className="h-[18px] w-[18px]"
                                                    >
                                                        <path
                                                            d="M12 4.5 14.2 9l4.8.7-3.5 3.4.9 4.8L12 15.9 7.6 17.9l.9-4.8L5 9.7 9.8 9 12 4.5Z"
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                        />
                                                    </svg>
                                                    <span className="sr-only">{label}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                <input
                    id={avatarInputId}
                    type="file"
                    accept="image/*"
                    onChange={onAvatarChange}
                    className="sr-only"
                />
            </div>

            {isAvatarOpen && profileVisible && (
                <ModalShell onClose={() => setIsAvatarOpen(false)} maxWidthClass="max-w-sm">
                    <div
                        className="relative max-h-[90vh] max-w-[90vw]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {avatarUrl ? (
                            <Image
                                src={avatarUrl}
                                alt={`${displayName} avatar`}
                                className="h-full w-full object-cover"
                                width={56}
                                height={56}
                                draggable={false}
                                onDragStart={(e) => e.preventDefault()}
                                unoptimized
                            />
                        ) : (
                            <UserIcon className="h-full w-full text-white/80 sm:h-full sm:w-full" />
                        )}

                        <button
                            onClick={() => setIsAvatarOpen(false)}
                            className="absolute -right-5 -top-5 flex h-10 w-10 items-center justify-center rounded-full bg-transparent text-white shadow-lg hover:bg-white/10"
                        >
                            ✕
                        </button>
                    </div>
                </ModalShell>
            )}
        </header>
    );
};

export default ProfileHeader;

const ModalShell = ({
    children,
    onClose,
    maxWidthClass = "max-w-3xl",
}: {
    children: ReactNode;
    onClose: () => void;
    maxWidthClass?: string;
}) => (
    <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-[2px]"
        onClick={onClose}
    >
        <div
            className={`relative w-full ${maxWidthClass} max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 bg-black p-5 shadow-2xl`}
            onClick={(event) => event.stopPropagation()}
        >
            {children}
        </div>
    </div>
);