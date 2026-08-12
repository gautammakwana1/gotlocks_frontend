"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, type ReactNode } from "react";
import { useDispatch, useSelector } from "react-redux";
import BackButton from "@/components/ui/BackButton";
import Loader from "@/components/ui/Loader";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import type {
    FeedContestAchievementRow,
    FeedContestPickRow,
    GroupMemberCommunityPickRow,
    RootState,
    SlipContestPickRow,
} from "@/lib/interfaces/interfaces";
import {
    fetchMemberAchievementsRequest,
    fetchMemberCommunityPicksRequest,
    fetchMemberFeedContestPicksRequest,
    fetchMemberSlipPicksRequest,
    fetchMemberStatsRequest,
    resetMemberCard,
} from "@/lib/redux/slices/memberCardSlice";
import { formatDateTime } from "@/lib/utils/date";
import { generateProfileImageUrl } from "@/lib/utils/helpers";
import { getProfilePath } from "@/lib/utils/profileNavigation";

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
 * One row of a "recent activity" list. The three tabs return three different
 * payload shapes, so each maps into this before rendering rather than the list
 * branching on which endpoint it came from.
 */
type ActivityItem = {
    id: string;
    title: string;
    detail: string;
    /** Pick result, contest status, or null for pending. */
    result: string | null;
    occurredAt: string;
};

const resultTone = (result: string | null, accent: ContextualMemberCardContext) => {
    if (result === "win" || result === "completed" || result === "final") {
        return "text-emerald-200";
    }
    if (result === "loss") return "text-rose-200";
    if (result === "review_required" || result === "not_found") return "text-amber-200";
    if (
        result === "void" ||
        result === "push" ||
        result === "canceled" ||
        result === "postponed"
    ) {
        return "text-gray-300";
    }
    return accent === "arena" ? "text-violet-200" : "text-sky-200";
};

const resultLabel = (result: string | null) =>
    (result ?? "pending").replaceAll("_", " ");

const ActivityList = ({
    title,
    empty,
    items,
    accent,
    loading,
    error,
}: {
    title: string;
    empty: string;
    items: ActivityItem[];
    accent: ContextualMemberCardContext;
    loading: boolean;
    error: string | null;
}) => (
    <section className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">
            {title}
        </h3>
        {loading ? (
            <div className="rounded-xl border border-white/10">
                <Loader size={22} message="Loading…" />
            </div>
        ) : error ? (
            <p
                role="alert"
                className="rounded-xl border border-amber-300/20 bg-amber-500/10 px-4 py-4 text-xs leading-5 text-amber-100"
            >
                {error}
            </p>
        ) : items.length ? (
            <div className="overflow-hidden rounded-xl border border-white/10">
                {items.map((item) => (
                    <article
                        key={item.id}
                        className="border-b border-white/5 bg-white/[0.025] px-4 py-3 last:border-b-0"
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-white">
                                    {item.title}
                                </p>
                                <p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-500">
                                    {item.detail}
                                </p>
                            </div>
                            <span
                                className={`shrink-0 text-[10px] font-semibold uppercase tracking-[0.12em] ${resultTone(
                                    item.result,
                                    accent
                                )}`}
                            >
                                {resultLabel(item.result)}
                            </span>
                        </div>
                        {item.occurredAt ? (
                            <p className="mt-2 text-[10px] text-gray-600">
                                {formatDateTime(item.occurredAt)}
                            </p>
                        ) : null}
                    </article>
                ))}
            </div>
        ) : (
            <p className="rounded-xl border border-dashed border-white/10 bg-black/25 px-4 py-4 text-xs leading-5 text-gray-500">
                {empty}
            </p>
        )}
    </section>
);

const AchievementList = ({
    title = "Contest Achievements",
    achievements,
    loading,
    error,
}: {
    title?: string;
    achievements: FeedContestAchievementRow[];
    loading: boolean;
    error: string | null;
}) => (
    <section className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">
            {title}
        </h3>
        {loading ? (
            <div className="rounded-xl border border-white/10">
                <Loader size={22} message="Loading achievements…" />
            </div>
        ) : error ? (
            <p
                role="alert"
                className="rounded-xl border border-amber-300/20 bg-amber-500/10 px-4 py-4 text-xs leading-5 text-amber-100"
            >
                {error}
            </p>
        ) : achievements.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
                {achievements.map((achievement) => (
                    <article
                        key={achievement.id}
                        className="rounded-xl border border-amber-300/20 bg-amber-500/[0.07] p-4"
                    >
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-200">
                            {/* The endpoint already spells the enum for a screen. */}
                            {achievement.label}
                        </p>
                        <p className="mt-2 text-sm font-semibold text-white">
                            {achievement.contest?.name ?? "Contest"}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                            Final placement #{achievement.placement}
                        </p>
                    </article>
                ))}
            </div>
        ) : (
            <p className="rounded-xl border border-dashed border-white/10 bg-black/25 px-4 py-4 text-xs leading-5 text-gray-500">
                Contest Achievements appear here only after contest finalization.
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
    <div className="rounded-xl border border-white/10 bg-black/30 px-4 py-3">
        <p className={`text-xl font-extrabold tabular-nums ${tone}`}>{value}</p>
        <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500">
            {label}
        </p>
    </div>
);

const SectionShell = ({
    eyebrow,
    heading,
    blurb,
    tone,
    children,
}: {
    eyebrow: string;
    heading: string;
    blurb: string;
    tone: "violet" | "sky";
    children: ReactNode;
}) => (
    <section
        className={`space-y-5 rounded-2xl border p-5 ${tone === "violet"
            ? "border-violet-300/20 bg-violet-500/[0.055]"
            : "border-sky-300/20 bg-sky-500/[0.055]"
            }`}
    >
        <div>
            <p
                className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${tone === "violet" ? "text-violet-200" : "text-sky-200"
                    }`}
            >
                {eyebrow}
            </p>
            <h2 className="mt-1 text-lg font-bold text-white">{heading}</h2>
            <p className="mt-1 text-xs leading-5 text-gray-500">{blurb}</p>
        </div>
        {children}
    </section>
);

/* ---------- Payload -> ActivityItem ---------- */

const slipPickToActivity = (row: SlipContestPickRow): ActivityItem => ({
    id: row.id,
    title: row.pick?.description || row.slip?.name || "Slip pick",
    detail: [row.contest?.name, row.slip?.name].filter(Boolean).join(" · ") || "Fantasy slip",
    result: row.pick?.result ?? null,
    occurredAt: row.submitted_at ?? "",
});

const communityPickToActivity = (row: GroupMemberCommunityPickRow): ActivityItem => ({
    id: row.id,
    title: row.pick?.description || "Community pick",
    detail:
        [row.pick?.matchup, row.pick?.market ?? row.pick?.source_tab]
            .filter(Boolean)
            .join(" · ") || "Posted to the community feed",
    result: row.pick?.result ?? null,
    occurredAt: row.submitted_at ?? "",
});

const feedContestPickToActivity = (row: FeedContestPickRow): ActivityItem => ({
    id: row.id,
    // A row whose contest has not locked comes back with `pick: null` by design
    // — the entry is real, its content is simply not disclosed yet.
    title: row.is_revealed
        ? row.pick?.description || "Contest entry"
        : "Entry hidden until lock",
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
        communityPicks,
        communityPicksLoading,
        communityPicksError,
        feedContestPicks,
        feedContestPicksLoading,
        feedContestPicksError,
        achievements,
        achievementsLoading,
        achievementsError,
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
            fetchMemberCommunityPicksRequest({
                group_id: communityId,
                user_id: userId,
                page: 1,
                limit: 5,
            })
        );
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
        }
        return () => {
            dispatch(resetMemberCard());
        };
    }, [communityId, userId, isArena, dispatch]);

    const slipItems = useMemo(
        () => (slipPicks?.picks ?? []).map(slipPickToActivity),
        [slipPicks]
    );
    const communityItems = useMemo(
        () => (communityPicks?.picks ?? []).map(communityPickToActivity),
        [communityPicks]
    );
    const feedContestItems = useMemo(
        () => (feedContestPicks?.picks ?? []).map(feedContestPickToActivity),
        [feedContestPicks]
    );

    const communityName = stats?.group?.name ?? (isArena ? "Arena" : "League");
    const backHref = isArena
        ? `/arena/${communityId}?tab=members`
        : `/league/${communityId}?tab=members`;
    const handle = stats?.member?.username ?? "member";
    const memberImage = generateProfileImageUrl(stats?.member?.profile_image ?? undefined);
    const totals = stats?.totals;

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
    const isStaff =
        stats?.member?.is_member &&
        (stats.member.role === "commissioner" || stats.member.role === "manager");

    if (statsLoading && !stats) {
        return (
            <div className={`space-y-5 pb-10 ${isArena ? "arena-theme" : ""}`}>
                <BackButton label={`back to ${communityName}`} fallback={backHref} preferFallback />
                <Loader size={28} message="Loading member record…" />
            </div>
        );
    }

    if (statsError) {
        return (
            <div className={`space-y-5 pb-10 ${isArena ? "arena-theme" : ""}`}>
                <BackButton label={`back to ${communityName}`} fallback={backHref} preferFallback />
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
        <div className={`space-y-5 pb-10 ${isArena ? "arena-theme" : ""}`}>
            <BackButton label={`back to ${communityName}`} fallback={backHref} preferFallback />

            <header
                className={`rounded-2xl border p-5 ${isArena
                    ? "border-violet-300/15 bg-gradient-to-br from-violet-500/[0.15] via-fuchsia-500/[0.045] to-black/25"
                    : "border-white/10 bg-gradient-to-br from-sky-500/[0.12] via-white/[0.035] to-black/20"
                    }`}
            >
                <div className="flex items-start gap-4">
                    <span
                        className={`flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border bg-black/45 text-sm font-bold uppercase tracking-[0.16em] ${isArena
                            ? "border-violet-300/25 text-violet-100"
                            : "border-sky-300/25 text-sky-100"
                            }`}
                    >
                        {memberImage ? (
                            <Image
                                src={memberImage}
                                alt=""
                                width={64}
                                height={64}
                                className="h-full w-full object-cover"
                                draggable={false}
                                onDragStart={(event) => event.preventDefault()}
                                unoptimized
                            />
                        ) : (
                            initialsFor(handle)
                        )}
                    </span>
                    <div className="min-w-0 flex-1">
                        <p
                            className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${isArena ? "text-violet-200" : "text-sky-200"
                                }`}
                        >
                            {communityName} · contextual identity
                        </p>
                        <h1 className="allow-caps mt-1 truncate bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-2xl font-extrabold text-transparent sm:text-3xl">
                            @{handle}
                        </h1>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span
                                className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${isStaff
                                    ? "border-amber-300/25 bg-amber-500/10 text-amber-100"
                                    : "border-white/10 bg-white/[0.04] text-gray-300"
                                    }`}
                            >
                                {role}
                            </span>
                            {stats?.member?.id ? (
                                <Link
                                    href={getProfilePath(stats.member.id, currentUser?.userId)}
                                    className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500 transition hover:text-white"
                                >
                                    View global Profile ↗
                                </Link>
                            ) : null}
                        </div>
                    </div>
                </div>
            </header>

            {isArena ? (
                <>
                    {/* No pending-points tile: only banked points are shown, so
                        every figure on this card is settled and final. */}
                    <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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

                    <AchievementList
                        achievements={achievements?.achievements ?? []}
                        loading={achievementsLoading}
                        error={achievementsError}
                    />

                    <div className="grid gap-5 lg:grid-cols-2">
                        <ActivityList
                            title="Recent Community Picks"
                            empty="No community picks shared with this Arena yet."
                            items={communityItems}
                            accent="arena"
                            loading={communityPicksLoading}
                            error={communityPicksError}
                        />
                        <ActivityList
                            title="Recent Contest Entries"
                            empty="No complete contest entries in this Arena yet."
                            items={feedContestItems}
                            accent="arena"
                            loading={feedContestPicksLoading}
                            error={feedContestPicksError}
                        />
                    </div>
                </>
            ) : (
                <>
                    {/* Only rendered when the group actually runs slip contests.
                        `applies.fantasy` is the server's own answer to that, so
                        the card never infers it from a NULL total. */}
                    {stats?.applies?.fantasy ? (
                        <SectionShell
                            eyebrow="Fantasy Contest activity"
                            heading="Fantasy Contests"
                            blurb="Finalized League Slip results contribute to cumulative League standings."
                            tone="violet"
                        >
                            {/* The MVP's third metric here is Capture-the-Badge; it is
                                deliberately absent — see the note on this file's PR.
                                `slip_picks` takes the slot because it is real data the
                                stats endpoint already returns. */}
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                <Metric
                                    value={totals?.slip_points ?? 0}
                                    label="Slip Points"
                                    tone="text-violet-100"
                                />
                                <Metric
                                    value={totals?.slips_entered ?? 0}
                                    label="League Slips"
                                />
                                <Metric value={totals?.slip_picks ?? 0} label="Slip Picks" />
                            </div>
                            <ActivityList
                                title="Recent Fantasy Contest results"
                                empty="No finalized Fantasy Contest results yet."
                                items={slipItems}
                                accent="league"
                                loading={slipPicksLoading}
                                error={slipPicksError}
                            />
                        </SectionShell>
                    ) : null}

                    <SectionShell
                        eyebrow="League Feed activity"
                        heading="Posts and Feed Contests"
                        blurb="League Points come only from finalized contests and join Slip results in cumulative standings."
                        tone="sky"
                    >
                        {/* No pending-points tile — see the Arena grid's note. */}
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                            <Metric
                                value={totals?.feed_contest_points ?? 0}
                                label="Finalized League Points"
                                tone="text-sky-100"
                            />
                            <Metric
                                value={totals?.community_picks ?? 0}
                                label="Community Picks"
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
                        />
                        <div className="grid gap-5 lg:grid-cols-2">
                            <ActivityList
                                title="Recent Community Picks"
                                empty="No community picks shared with this League yet."
                                items={communityItems}
                                accent="league"
                                loading={communityPicksLoading}
                                error={communityPicksError}
                            />
                            <ActivityList
                                title="League Feed contest entries"
                                empty="No complete League Feed contest entries yet."
                                items={feedContestItems}
                                accent="league"
                                loading={feedContestPicksLoading}
                                error={feedContestPicksError}
                            />
                        </div>
                    </SectionShell>
                </>
            )}
        </div>
    );
};

export default ContextualMemberCard;
