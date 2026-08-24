"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { BadgeIcon } from "@/components/badges/BadgeIcon";
import BackButton from "@/components/ui/BackButton";
import Loader from "@/components/ui/Loader";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import type {
    ContestBadgeCategory,
    EarnedContestBadgeRow,
    FeedContestAchievementRow,
    FeedContestPickRow,
    RootState,
    SlipContestPickRow,
} from "@/lib/interfaces/interfaces";
import {
    fetchMemberAchievementsRequest,
    fetchMemberEarnedBadgesRequest,
    fetchMemberFeedContestPicksRequest,
    fetchMemberSlipPicksRequest,
    fetchMemberStatsRequest,
    resetMemberCard,
} from "@/lib/redux/slices/memberCardSlice";
import { displayNameGradientStyle } from "@/lib/styles/text";
import { formatDateTime } from "@/lib/utils/date";
import { generateProfileImageUrl } from "@/lib/utils/helpers";
import { getProfilePath } from "@/lib/utils/profileNavigation";

import styles from "./ContextualMemberCard.module.css";

export type ContextualMemberCardContext = "league" | "arena";

export type ContextualMemberCardProps = {
    context: ContextualMemberCardContext;
    /** Route param — the group whose record this is. */
    communityId: string;
    /** Route param — whose record. */
    userId: string;
};

const initialsFor = (value: string) =>
    value
        .split(/\s+/)
        .filter(Boolean)
        .map((part) => part.charAt(0))
        .join("")
        .slice(0, 2)
        .toUpperCase() || "??";

/**
 * One row of a "recent activity" list. The slip and feed-contest reads return
 * different payload shapes, so each maps into this before rendering rather than
 * the list branching on which endpoint it came from.
 */
type ActivityItem = {
    id: string;
    title: string;
    detail: string;
    /** Pick result, contest status, or null for pending. */
    result: string | null;
    occurredAt: string;
};

const WON = new Set(["win", "completed", "final"]);
const LOST = new Set(["loss"]);
const NEEDS_REVIEW = new Set(["review_required", "not_found"]);
const NEUTRAL = new Set(["void", "push", "canceled", "postponed"]);

const resultTone = (result: string | null, accent: ContextualMemberCardContext) => {
    if (result && WON.has(result)) {
        return "border-emerald-300/20 bg-emerald-400/10 text-emerald-200";
    }
    if (result && LOST.has(result)) {
        return "border-rose-300/20 bg-rose-400/10 text-rose-200";
    }
    if (result && NEEDS_REVIEW.has(result)) {
        return "border-amber-300/20 bg-amber-400/10 text-amber-200";
    }
    if (result && NEUTRAL.has(result)) {
        return "border-slate-300/15 bg-slate-400/10 text-gray-300";
    }
    return accent === "arena"
        ? "border-violet-300/20 bg-violet-400/10 text-violet-200"
        : "border-blue-400/20 bg-blue-400/10 text-blue-300";
};

const resultLabel = (result: string | null) => (result ?? "pending").replaceAll("_", " ");

/** The timeline node beside each row: settled one way, the other, or still open. */
const ActivityMark = ({ result }: { result: string | null }) => {
    const finished = Boolean(result && WON.has(result));
    const lost = Boolean(result && LOST.has(result));

    return (
        <span className={styles.activityMark} aria-hidden="true">
            {finished ? (
                <svg viewBox="0 0 18 18" fill="none">
                    <path d="m4.5 9.25 2.8 2.75 6.2-6.25" />
                </svg>
            ) : lost ? (
                <svg viewBox="0 0 18 18" fill="none">
                    <path d="m5.5 5.5 7 7m0-7-7 7" />
                </svg>
            ) : (
                <span />
            )}
        </span>
    );
};

const SectionHeading = ({
    title,
    count,
    id,
    level = "h3",
}: {
    title: string;
    count?: number;
    id: string;
    level?: "h2" | "h3";
}) => {
    const Heading = level;

    return (
        <div className={styles.sectionHeading}>
            <div className="flex min-w-0 items-center gap-2.5">
                <span className={styles.sectionGlyph} aria-hidden="true" />
                <Heading id={id} className="truncate text-sm font-bold text-white sm:text-base">
                    {title}
                </Heading>
            </div>
            {typeof count === "number" ? (
                <span className={styles.sectionCount}>
                    {count} {count === 1 ? "entry" : "entries"}
                </span>
            ) : null}
        </div>
    );
};

const ActivityList = ({
    title,
    empty,
    items,
    accent = "league",
    headingLevel = "h3",
    loading,
    error,
    total,
}: {
    title: string;
    empty: string;
    items: ActivityItem[];
    accent?: ContextualMemberCardContext;
    headingLevel?: "h2" | "h3";
    loading: boolean;
    error: string | null;
    /**
     * The member's TRUE count, which `items` is only the first page of. The MVP
     * reads a whole mock store, so its heading can count the array; here that
     * would report "5 entries" for a member with fifty.
     */
    total?: number;
}) => {
    const headingId = `member-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
    const settled = !loading && !error;

    return (
        <section aria-labelledby={headingId} className={styles.contentPanel}>
            <SectionHeading
                title={title}
                count={settled ? total ?? items.length : undefined}
                id={headingId}
                level={headingLevel}
            />
            {loading ? (
                <div className={styles.panelStatus}>
                    <Loader size={22} message="Loading…" />
                </div>
            ) : error ? (
                <p role="alert" className={styles.panelError}>
                    {error}
                </p>
            ) : items.length ? (
                <div className={styles.activityList}>
                    {items.map((item) => (
                        <article key={item.id} className={styles.activityItem}>
                            <ActivityMark result={item.result} />
                            <div className="min-w-0">
                                <div className="flex min-w-0 items-start justify-between gap-3">
                                    {/* A pick description is free text and runs
                                        long — unclamped it took three or four
                                        lines and shoved the row's date out of
                                        alignment with its neighbours. */}
                                    <p
                                        title={item.title}
                                        className="line-clamp-2 min-w-0 text-sm font-semibold leading-5 text-white"
                                    >
                                        {item.title}
                                    </p>
                                    <span
                                        className={`${styles.resultPill} ${resultTone(
                                            item.result,
                                            accent
                                        )}`}
                                    >
                                        {resultLabel(item.result)}
                                    </span>
                                </div>
                                <p
                                    title={item.detail}
                                    className="mt-1 line-clamp-2 text-xs leading-5 text-gray-400"
                                >
                                    {item.detail}
                                </p>
                                {item.occurredAt ? (
                                    <p className="mt-2 text-[10px] font-medium uppercase tracking-[0.09em] text-slate-400">
                                        {formatDateTime(item.occurredAt)}
                                    </p>
                                ) : null}
                            </div>
                        </article>
                    ))}
                </div>
            ) : (
                <div className={styles.emptyState}>
                    <span className={styles.emptyStateIcon} aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="none">
                            <path d="M8 12h8M12 8v8" />
                        </svg>
                    </span>
                    <p>{empty}</p>
                </div>
            )}
        </section>
    );
};

const AchievementList = ({
    title = "Contest Achievements",
    achievements,
    headingLevel = "h3",
    loading,
    error,
    total,
}: {
    title?: string;
    achievements: FeedContestAchievementRow[];
    headingLevel?: "h2" | "h3";
    loading: boolean;
    error: string | null;
    total?: number;
}) => {
    const headingId = `member-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
    const settled = !loading && !error;

    return (
        <section
            aria-labelledby={headingId}
            className={`${styles.contentPanel} ${styles.achievementPanel}`}
        >
            <SectionHeading
                title={title}
                count={settled ? total ?? achievements.length : undefined}
                id={headingId}
                level={headingLevel}
            />
            {loading ? (
                <div className={styles.panelStatus}>
                    <Loader size={22} message="Loading achievements…" />
                </div>
            ) : error ? (
                <p role="alert" className={styles.panelError}>
                    {error}
                </p>
            ) : achievements.length ? (
                <div className={styles.achievementGrid}>
                    {achievements.map((achievement) => (
                        <article key={achievement.id} className={styles.achievementCard}>
                            <div className={styles.achievementIcon} aria-hidden="true">
                                <svg viewBox="0 0 24 24" fill="none">
                                    <path d="M8 4h8v4a4 4 0 0 1-8 0V4Z" />
                                    <path d="M8 6H5v1a4 4 0 0 0 4 4M16 6h3v1a4 4 0 0 1-4 4M12 12v4m-3 4h6m-5-4h4" />
                                </svg>
                            </div>
                            <div className="min-w-0 flex-1">
                                {/* The endpoint already spells the enum for a screen. */}
                                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-200">
                                    {achievement.label}
                                </p>
                                {/* Same reason as the activity rows: a contest
                                    is named by its commissioner, so the length
                                    is not ours to assume. */}
                                <p
                                    title={achievement.contest?.name ?? "Contest"}
                                    className="mt-1.5 line-clamp-2 text-sm font-semibold leading-5 text-white"
                                >
                                    {achievement.contest?.name ?? "Contest"}
                                </p>
                            </div>
                            <div className={styles.achievementPlacement}>
                                <span>#</span>
                                {achievement.placement}
                            </div>
                        </article>
                    ))}
                </div>
            ) : (
                <div className={`${styles.emptyState} ${styles.achievementEmpty}`}>
                    <span className={styles.emptyStateIcon} aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="none">
                            <path d="M8 5h8v3a4 4 0 0 1-8 0V5Zm4 7v4m-3 3h6M8 7H5v1a3 3 0 0 0 3 3m8-4h3v1a3 3 0 0 1-3 3" />
                        </svg>
                    </span>
                    <p>Contest Achievements appear here only after contest finalization.</p>
                </div>
            )}
        </section>
    );
};

/**
 * Capture-the-Badge, from the frozen award rows. Only FINALIZED Fantasy
 * Contests contribute — every badge is a contest-wide argmax that can change
 * hands on any regrade until the contest is frozen, so nothing listed here can
 * later move.
 */
const BadgePanel = ({
    badges,
    total,
    loading,
    error,
}: {
    badges: EarnedContestBadgeRow[];
    total: number;
    loading: boolean;
    error: string | null;
}) => (
    <section className={styles.badgePanel}>
        <div className="flex items-center justify-between gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">
                Capture-the-Badge activity
            </h3>
            <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-violet-200/70">
                {total} earned
            </span>
        </div>
        {loading ? (
            <div className={styles.panelStatus}>
                <Loader size={22} message="Loading badges…" />
            </div>
        ) : error ? (
            <p role="alert" className="mt-3 text-xs leading-5 text-amber-200">
                {error}
            </p>
        ) : badges.length ? (
            <div className={styles.badgeAwardGrid}>
                {badges.map((award) => (
                    // (contest, badge) is the award's identity server-side — one
                    // badge is won once per contest, by one member.
                    <article
                        key={`${award.contest.contest_id}:${award.badge_id}`}
                        className={styles.badgeAward}
                    >
                        <BadgeIcon
                            category={award.badge_category as ContestBadgeCategory}
                            sport={award.sport}
                            alt=""
                            className="h-10 w-10"
                        />
                        <div className="min-w-0">
                            <p
                                title={award.badge_name}
                                className="truncate text-xs font-semibold text-white"
                            >
                                {award.badge_name}
                            </p>
                            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.09em] text-violet-200">
                                +{award.points_awarded} Fantasy Points
                            </p>
                        </div>
                    </article>
                ))}
            </div>
        ) : (
            <p className="mt-3 text-xs leading-5 text-slate-400">
                No Capture-the-Badge awards in finalized Fantasy Contests.
            </p>
        )}
    </section>
);

const Metric = ({
    value,
    label,
    tone = "text-white",
}: {
    value: string | number;
    label: string;
    tone?: string;
}) => (
    <div className={styles.metric}>
        <p className={`text-2xl font-black tabular-nums sm:text-[1.75rem] ${tone}`}>{value}</p>
        <p className="mt-1.5 text-[9px] font-semibold uppercase leading-4 tracking-[0.12em] text-slate-400 sm:text-[10px]">
            {label}
        </p>
    </div>
);

const ContextualAvatar = ({
    avatarUrl,
    handle,
    initials,
}: {
    avatarUrl?: string;
    handle: string;
    initials: string;
}) => (
    <div className={styles.avatarFrame}>
        <div className={styles.avatarInner}>
            {avatarUrl ? (
                <Image
                    src={avatarUrl}
                    alt={`@${handle} avatar`}
                    fill
                    sizes="(min-width: 640px) 112px, 88px"
                    draggable={false}
                    onDragStart={(event) => event.preventDefault()}
                    unoptimized
                    className="object-cover"
                />
            ) : (
                <span>{initials}</span>
            )}
        </div>
    </div>
);

const ProfileArrowIcon = () => (
    <svg viewBox="0 0 18 18" fill="none" aria-hidden="true">
        <path d="M6.25 11.75 11.75 6.25M7.25 6.25h4.5v4.5" />
    </svg>
);

const RoleShieldIcon = () => (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M8 2.25 13 4v3.6c0 3.1-2.1 5.2-5 6.15-2.9-.95-5-3.05-5-6.15V4l5-1.75Z" />
        <path d="m5.75 7.85 1.4 1.4 3.1-3.15" />
    </svg>
);

/* ---------- Payload -> ActivityItem ---------- */

const slipPickToActivity = (row: SlipContestPickRow): ActivityItem => ({
    id: row.id,
    title: row.pick?.description || row.slip?.name || "Slip pick",
    detail:
        [row.contest?.name, row.slip?.name].filter(Boolean).join(" · ") || "Fantasy slip",
    result: row.pick?.result ?? null,
    occurredAt: row.submitted_at ?? "",
});

const feedContestPickToActivity = (row: FeedContestPickRow): ActivityItem => ({
    id: row.id,
    // A row whose contest has not locked comes back with `pick: null` by design
    // — the entry is real, its content is simply not disclosed yet.
    title: row.is_revealed ? row.pick?.description || "Contest entry" : "Entry hidden until lock",
    detail: row.is_revealed
        ? row.contest?.name ?? "Feed contest"
        : `${row.contest?.name ?? "Feed contest"} · opens up when the contest locks`,
    result: row.is_revealed ? row.pick?.result ?? null : null,
    occurredAt: row.submitted_at ?? "",
});

export const ContextualMemberCard = ({
    context,
    communityId,
    userId,
}: ContextualMemberCardProps) => {
    const isArena = context === "arena";
    const dispatch = useDispatch();
    const currentUser = useCurrentUser();
    const {
        stats,
        statsLoading,
        statsError,
        slipPicks,
        slipPicksLoading,
        slipPicksError,
        feedContestPicks,
        feedContestPicksLoading,
        feedContestPicksError,
        achievements,
        achievementsLoading,
        achievementsError,
        earnedBadges,
        earnedBadgesLoading,
        earnedBadgesError,
    } = useSelector((state: RootState) => state.memberCard);

    /*
     * Cleared BEFORE the reads, not only on unmount: this card is reachable
     * member-to-member inside one group, so without the reset the previous
     * member's totals stay painted under the new name for the whole in-flight
     * window. Same failure mode as the shared group record.
     */
    useEffect(() => {
        if (!communityId || !userId) return;
        dispatch(resetMemberCard());
        dispatch(fetchMemberStatsRequest({ group_id: communityId, user_id: userId }));
        dispatch(
            fetchMemberFeedContestPicksRequest({
                group_id: communityId,
                user_id: userId,
                page: 1,
                limit: 5,
            })
        );
        dispatch(
            fetchMemberAchievementsRequest({
                group_id: communityId,
                // The only one of the five that still needs the surface named.
                group_type: isArena ? "arena" : "league",
                user_id: userId,
                page: 1,
                limit: 6,
            })
        );
        // Slips are a League surface. An Arena answers with an empty page rather
        // than an error, but there is no reason to spend the round trip.
        if (!isArena) {
            dispatch(
                fetchMemberSlipPicksRequest({
                    group_id: communityId,
                    user_id: userId,
                    page: 1,
                    limit: 5,
                })
            );
            // Capture-the-Badge is won inside a slip contest, so an Arena has
            // none by construction. Unpaged on purpose: this is a trophy case,
            // and 24 covers a season of the 32-badge catalog.
            dispatch(
                fetchMemberEarnedBadgesRequest({
                    group_id: communityId,
                    user_id: userId,
                    page: 1,
                    limit: 24,
                })
            );
        }
        return () => {
            dispatch(resetMemberCard());
        };
    }, [communityId, userId, isArena, dispatch]);

    const slipItems = useMemo(
        () => (slipPicks?.picks ?? []).map(slipPickToActivity),
        [slipPicks]
    );
    const feedContestItems = useMemo(
        () => (feedContestPicks?.picks ?? []).map(feedContestPickToActivity),
        [feedContestPicks]
    );

    const themeClassName = isArena ? "arena-theme" : "league-theme";
    const communityName = stats?.group?.name ?? (isArena ? "Arena" : "League");
    const backHref = isArena
        ? `/arena/${communityId}?tab=members`
        : `/league/${communityId}?tab=members`;
    const handle = stats?.member?.username ?? "member";
    const memberImage = generateProfileImageUrl(stats?.member?.profile_image ?? undefined);
    const totals = stats?.totals;
    // The server's own answer to "does this group run slip contests", so the
    // card hides the Fantasy lane rather than inferring it from a NULL total.
    const fantasyApplies = Boolean(stats?.applies?.fantasy);
    /*
     * The badges endpoint carries no "is this League on the Pro tier" flag, and
     * the card never loads the group row, so having won a badge IS the signal
     * that the League runs them. A League that does not shows its Slip Picks
     * tile and no panel, instead of an empty trophy case implying a feature it
     * has not bought.
     */
    const badgeCount = earnedBadges?.summary?.total_badges ?? 0;
    const hasBadges = badgeCount > 0;

    // A member who has LEFT keeps their record but has no seat, which the stats
    // payload reports as role null + is_member false.
    const role = !stats?.member
        ? ""
        : !stats.member.is_member
            ? isArena
                ? "Former Arena Member"
                : "Former League Member"
            : isArena
                ? stats.member.role === "commissioner"
                    ? "Arena Owner"
                    : stats.member.role === "manager"
                        ? "Arena Manager"
                        : "Arena Member"
                : stats.member.role === "commissioner"
                    ? "League Commissioner"
                    : "League Member";
    const isStaff = Boolean(
        stats?.member?.is_member &&
        (stats.member.role === "commissioner" || stats.member.role === "manager")
    );

    if (statsLoading && !stats) {
        return (
            <div className={`space-y-5 pb-10 ${themeClassName}`}>
                <BackButton
                    label={`back to ${communityName}`}
                    fallback={backHref}
                    preferFallback
                />
                <Loader size={28} message="Loading member record…" />
            </div>
        );
    }

    if (statsError) {
        return (
            <div className={`space-y-5 pb-10 ${themeClassName}`}>
                <BackButton
                    label={`back to ${communityName}`}
                    fallback={backHref}
                    preferFallback
                />
                <section
                    role="alert"
                    className="rounded-2xl border border-amber-300/25 bg-amber-500/10 p-5 text-sm text-amber-100"
                >
                    <p className="font-semibold">This member card is unavailable</p>
                    <p className="mt-1 leading-6 text-amber-100/75">{statsError}</p>
                </section>
            </div>
        );
    }

    return (
        <div
            className={`${styles.shell} ${isArena ? styles.arenaShell : ""} ${themeClassName}`}
            data-contextual-member-card
            data-member-context={context}
        >
            <header className={styles.hero}>
                <div className={styles.heroColorSurface} aria-hidden="true" />
                <div className={styles.heroGrid} aria-hidden="true" />
                <div className={styles.heroGlow} aria-hidden="true" />

                <div className={styles.heroInner}>
                    <div className={styles.utilityRow}>
                        <BackButton
                            label={`back to ${communityName}`}
                            fallback={backHref}
                            preferFallback
                            className={styles.backButton}
                        />
                        <span className={styles.cardType}>
                            <span aria-hidden="true" />
                            {isArena ? "Arena card" : "League card"}
                        </span>
                    </div>

                    <div className={styles.identityRow}>
                        <div className={styles.identityMain}>
                            <ContextualAvatar
                                avatarUrl={memberImage}
                                handle={handle}
                                initials={initialsFor(handle)}
                            />
                            <div className="min-w-0 flex-1">
                                <p
                                    title={`${communityName} · contextual identity`}
                                    className={`truncate text-[10px] font-semibold uppercase tracking-[0.14em] ${isArena ? "text-violet-200" : "text-blue-400"
                                        }`}
                                >
                                    {communityName} · contextual identity
                                </p>
                                <h1
                                    className="allow-caps mt-1.5 truncate bg-clip-text text-2xl font-black leading-none text-transparent sm:text-4xl lg:text-[2.75rem]"
                                    style={{ ...displayNameGradientStyle, letterSpacing: "0.03em" }}
                                >
                                    @{handle}
                                </h1>
                                {role ? (
                                    <div className="mt-3 flex flex-wrap items-center gap-2">
                                        <span
                                            className={`${styles.rolePill} ${isStaff ? styles.staffRolePill : "ui-accent-badge"
                                                }`}
                                        >
                                            <RoleShieldIcon />
                                            {role}
                                        </span>
                                    </div>
                                ) : null}
                            </div>
                        </div>

                        <div className={styles.profileActionBlock}>
                            <p className="hidden max-w-xs text-right text-xs leading-5 text-slate-400 lg:block">
                                {isArena
                                    ? "Arena points, entries, and finishes—scoped to this community."
                                    : fantasyApplies
                                        ? "Two competition lanes, one member identity, zero mixed scoreboards."
                                        : "Every figure here is scoped to this League."}
                            </p>
                            {stats?.member?.id ? (
                                <Link
                                    href={getProfilePath(stats.member.id, currentUser?.userId)}
                                    className={`${styles.profileLink} ui-accent-button`}
                                >
                                    View global profile
                                    <ProfileArrowIcon />
                                </Link>
                            ) : null}
                        </div>
                    </div>

                    {isArena ? (
                        /* Three tiles, not the MVP's four. Its Pending Arena
                           Points is dropped because nothing in this system
                           stores points in play, and Community picks because
                           the feature is gone — so every number here is banked
                           and final. `threeMetricGrid` re-splits the rail. */
                        <section
                            aria-label="Arena member overview"
                            className={`${styles.scoreRail} ${styles.threeMetricGrid}`}
                        >
                            <Metric
                                value={totals?.feed_contest_points ?? 0}
                                label="Finalized Arena Points"
                                tone="text-violet-100"
                            />
                            <Metric
                                value={totals?.feed_contests_entered ?? 0}
                                label="Contest entries"
                            />
                            <Metric value={totals?.achievements ?? 0} label="Achievements" />
                        </section>
                    ) : fantasyApplies ? (
                        <section aria-label="League member overview" className={styles.scoreRail}>
                            <Metric
                                value={totals?.slip_points ?? 0}
                                label="Fantasy score"
                                tone="text-violet-100"
                            />
                            <Metric
                                value={totals?.feed_contest_points ?? 0}
                                label="Feed score"
                                tone="text-blue-300"
                            />
                            <Metric
                                value={
                                    (totals?.slips_entered ?? 0) +
                                    (totals?.feed_contests_entered ?? 0)
                                }
                                label="Total entries"
                            />
                            <Metric value="2" label="Competition lanes" />
                        </section>
                    ) : (
                        /* No slip contests in this League, so the rail drops the
                           Fantasy figures rather than printing zeroes for a lane
                           that does not exist. */
                        <section
                            aria-label="League member overview"
                            className={`${styles.scoreRail} ${styles.threeMetricGrid}`}
                        >
                            <Metric
                                value={totals?.feed_contest_points ?? 0}
                                label="Finalized League Points"
                                tone="text-blue-300"
                            />
                            <Metric
                                value={totals?.feed_contests_entered ?? 0}
                                label="Feed contest entries"
                            />
                            <Metric value={totals?.achievements ?? 0} label="Achievements" />
                        </section>
                    )}
                </div>
            </header>

            <div className={`${styles.body} workspace-tab-panel`}>
                {isArena ? (
                    <div className={styles.arenaLayout}>
                        <AchievementList
                            achievements={achievements?.achievements ?? []}
                            headingLevel="h2"
                            loading={achievementsLoading}
                            error={achievementsError}
                            total={achievements?.summary?.total}
                        />
                        <ActivityList
                            title="Recent Contest Entries"
                            empty="No complete contest entries in this Arena yet."
                            items={feedContestItems}
                            accent="arena"
                            headingLevel="h2"
                            loading={feedContestPicksLoading}
                            error={feedContestPicksError}
                            total={feedContestPicks?.pagination?.total}
                        />
                    </div>
                ) : (
                    <div
                        className={`${styles.leagueLayout} ${fantasyApplies ? "" : styles.singleLane
                            }`}
                    >
                        {fantasyApplies ? (
                            <section
                                aria-labelledby="traditional-league-activity"
                                className={`${styles.competitionLane} ${styles.fantasyLane}`}
                            >
                                <div className={styles.laneGlow} aria-hidden="true" />
                                <div className={styles.laneHeader}>
                                    <div className={styles.laneIcon} aria-hidden="true">
                                        <svg viewBox="0 0 24 24" fill="none">
                                            <path d="M7 6.5h10M8.5 3.5h7l1.5 6-5 3-5-3 1.5-6Z" />
                                            <path d="M12 12.5V17m-3 3h6m-4.5-3h3" />
                                        </svg>
                                    </div>
                                    <div className="min-w-0">
                                        <p className={styles.laneKicker}>Fantasy Contest activity</p>
                                        <h2
                                            id="traditional-league-activity"
                                            className={styles.laneTitle}
                                        >
                                            Fantasy Contests
                                        </h2>
                                        <p className={styles.laneDescription}>
                                            {hasBadges
                                                ? "Finalized League Slip results and badge bonuses contribute to cumulative League standings."
                                                : "Finalized League Slip results contribute only to Fantasy lifetime standings."}
                                        </p>
                                    </div>
                                </div>

                                <div
                                    className={`${styles.laneMetricGrid} ${styles.threeMetricGrid}`}
                                >
                                    <Metric
                                        value={totals?.slip_points ?? 0}
                                        label="Fantasy Points"
                                        tone="text-violet-100"
                                    />
                                    <Metric
                                        value={totals?.slips_entered ?? 0}
                                        label="League Slips"
                                    />
                                    {hasBadges ? (
                                        <Metric value={badgeCount} label="Capture-the-Badge" />
                                    ) : (
                                        <Metric
                                            value={totals?.slip_picks ?? 0}
                                            label="Slip Picks"
                                        />
                                    )}
                                </div>

                                <ActivityList
                                    title="Recent Fantasy Contest results"
                                    empty="No finalized Fantasy Contest results yet."
                                    items={slipItems}
                                    accent="league"
                                    loading={slipPicksLoading}
                                    error={slipPicksError}
                                    total={slipPicks?.summary?.total_picks}
                                />

                                {hasBadges || earnedBadgesError ? (
                                    <BadgePanel
                                        badges={earnedBadges?.badges ?? []}
                                        total={badgeCount}
                                        loading={earnedBadgesLoading}
                                        error={earnedBadgesError}
                                    />
                                ) : null}
                            </section>
                        ) : null}

                        <section
                            aria-labelledby="league-feed-activity"
                            className={`${styles.competitionLane} ${styles.feedLane}`}
                        >
                            <div className={styles.laneGlow} aria-hidden="true" />
                            <div className={styles.laneHeader}>
                                <div className={styles.laneIcon} aria-hidden="true">
                                    <svg viewBox="0 0 24 24" fill="none">
                                        <path d="M5 5h14v11H9l-4 3V5Z" />
                                        <path d="M8 9h8m-8 3h5" />
                                    </svg>
                                </div>
                                <div className="min-w-0">
                                    <p className={styles.laneKicker}>League Feed activity</p>
                                    <h2 id="league-feed-activity" className={styles.laneTitle}>
                                        Feed Contests
                                    </h2>
                                    <p className={styles.laneDescription}>
                                        League Points come only from finalized Feed Contests and stay
                                        separate from Fantasy Points.
                                    </p>
                                </div>
                            </div>

                            {/* No pending-points tile — see the Arena rail's note. */}
                            <div className={`${styles.laneMetricGrid} ${styles.twoMetricGrid}`}>
                                <Metric
                                    value={totals?.feed_contest_points ?? 0}
                                    label="Finalized League Points"
                                    tone="text-blue-300"
                                />
                                <Metric
                                    value={totals?.feed_contests_entered ?? 0}
                                    label="Feed contest entries"
                                />
                            </div>

                            <AchievementList
                                title="Feed Contest Achievements"
                                achievements={achievements?.achievements ?? []}
                                loading={achievementsLoading}
                                error={achievementsError}
                                total={achievements?.summary?.total}
                            />
                            <ActivityList
                                title="League Feed contest entries"
                                empty="No complete League Feed contest entries yet."
                                items={feedContestItems}
                                accent="league"
                                loading={feedContestPicksLoading}
                                error={feedContestPicksError}
                                total={feedContestPicks?.pagination?.total}
                            />
                        </section>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ContextualMemberCard;
