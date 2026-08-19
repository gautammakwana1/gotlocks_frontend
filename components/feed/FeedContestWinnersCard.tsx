"use client";

import Image from "next/image";
import Link from "next/link";

import {
    CONTEST_POST_HEADER_TONES,
    CONTEST_POST_PRIMARY_TONES,
    NEUTRAL_POST_CARD_SURFACE,
} from "@/lib/styles/postCards";
import type { FeedContestPodiumCard, FeedContestPodiumPlacement } from "@/lib/contests/feedContestPodium";
import type { StructuredFeedContextMetadata } from "./types";

/**
 * ONE finalized Feed contest's podium, as the MVP's Feed draws it.
 *
 * Ported from the MVP's components/feed/ContestResultsContent.tsx — the stage,
 * its 2-1-3 visual order, the crown over first place, the medal tones and the
 * gold avatar plates are that file's, kept token-for-token so the two surfaces
 * cannot drift apart.
 *
 * TWO DELIBERATE DIFFERENCES FROM THE MVP, both asked for:
 *
 *  1. NO "show remaining ranks" disclosure. The MVP card holds the whole frozen
 *     standings document, so it can open ranks 4..8 inline. This one is fed by
 *     `/list/finalized/podium`, which returns placements 1..3 and nothing else —
 *     the rest of the board is not hidden here, it was never fetched. The
 *     contest link in the header goes to the standings tab that has it.
 *  2. NO per-placement result detail or badge rail. The MVP renders combined
 *     odds / "7/10 teams correct" / a Fantasy badge rail under each podium
 *     member; the podium endpoint carries only `final_score`, so the card shows
 *     points and stops rather than inventing a number.
 */

type FeedContestWinnersCardProps = {
    context: StructuredFeedContextMetadata;
    card: FeedContestPodiumCard;
    accent: "sky" | "violet";
    /** Drives the "League Points" / "Arena Points" caption under each score. */
    pointsLabel: string;
    currentUserId?: string;
};

const contestResultStageTone = {
    sky: {
        theme: "blue",
        stageAccent: "shadow-[inset_0_1px_0_rgba(96,165,250,0.10)]",
        footer: "border-blue-400/10 bg-[#0b0b0b]",
        footerCopy: "text-blue-300",
    },
    violet: {
        theme: "violet",
        stageAccent: "shadow-[inset_0_1px_0_rgba(167,139,250,0.10)]",
        footer: "border-violet-200/10 bg-[#0b0b0b]",
        footerCopy: "text-violet-100",
    },
} as const;

type StageMedalTone = "gold" | "silver" | "bronze";

const stageMedalTone = {
    gold: {
        marker: "text-amber-200 drop-shadow-[0_0_5px_rgba(251,191,36,0.38)]",
        avatarHalo:
            "border-amber-200/60 bg-gradient-to-br from-amber-200/70 via-amber-500/35 to-amber-950/30 ring-2 ring-amber-300/20 shadow-[0_0_20px_rgba(251,191,36,0.20)]",
    },
    silver: {
        marker:
            "text-slate-50 [text-shadow:0_1px_1px_rgba(15,23,42,1),0_0_7px_rgba(226,232,240,0.55)]",
        avatarHalo:
            "border-slate-100/70 bg-gradient-to-br from-slate-300 via-slate-600 to-slate-950 ring-2 ring-slate-200/25 shadow-[0_0_22px_rgba(226,232,240,0.22)]",
    },
    bronze: {
        marker:
            "text-orange-200 [text-shadow:0_1px_1px_rgba(67,20,7,1),0_0_7px_rgba(249,115,22,0.52)]",
        avatarHalo:
            "border-orange-200/70 bg-gradient-to-br from-orange-500 via-orange-800 to-orange-950 ring-2 ring-orange-300/25 shadow-[0_0_20px_rgba(205,127,50,0.24)]",
    },
} as const satisfies Record<StageMedalTone, { marker: string; avatarHalo: string }>;

// Tone follows the awarded PLACEMENT, not the slot — so both halves of a tie
// for 1st wear gold, and a podium that reads 1, 1, 3 has no silver on it.
const stageMedalToneForRank = (rank: number): StageMedalTone =>
    rank === 1 ? "gold" : rank === 2 ? "silver" : "bronze";

const stageRankMarkerSize = {
    gold: "text-[32px] sm:text-[36px]",
    silver: "text-[32px] sm:text-[36px]",
    bronze: "text-[28px] sm:text-[32px]",
} as const satisfies Record<StageMedalTone, string>;

/**
 * The three stage positions, in ARRAY order rather than rank order: the best
 * placement takes the center (raised, largest), the next two flank it. The grid
 * columns are what produce the 2-1-3 reading order, so the winner sits in the
 * middle without the markup having to be re-ordered.
 */
const stageSlots = [
    {
        name: "center",
        layout: "col-start-2 row-start-1 z-20",
        avatar: "h-[5.6rem] w-[5.6rem] sm:h-24 sm:w-24",
        avatarText: "text-xl",
        points: "text-2xl sm:text-[28px]",
    },
    {
        name: "left",
        layout: "col-start-1 row-start-1 z-10",
        avatar: "h-[4.15rem] w-[4.15rem] sm:h-[4.75rem] sm:w-[4.75rem]",
        avatarText: "text-base",
        points: "text-lg sm:text-xl",
    },
    {
        name: "right",
        layout: "col-start-3 row-start-1 z-10",
        avatar: "h-[4.15rem] w-[4.15rem] sm:h-[4.75rem] sm:w-[4.75rem]",
        avatarText: "text-base",
        points: "text-lg sm:text-xl",
    },
] as const;

const initialsFor = (name: string) => {
    const parts = name.replace(/^@/, "").trim().split(/\s+/).filter(Boolean);

    return (
        parts.length > 1
            ? `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`
            : parts[0]?.slice(0, 2) ?? ""
    ).toUpperCase();
};

/**
 * A podium member's destination. In a League or an Arena that is their CONTEXT
 * member card, not their global profile — the same rule the MVP applies, and the
 * reason this takes the whole context rather than just a user id.
 */
const contextualMemberCard = (
    context: StructuredFeedContextMetadata,
    userId: string,
    visibleName: string
) => {
    const contextLabel = context.kind === "league" ? "League" : "Arena";
    return {
        href: `/${context.kind}/${context.id}/members/${userId}`,
        label: `View ${visibleName}'s ${contextLabel} member card`,
    };
};

const StagePlacement = ({
    context,
    placement,
    slotIndex,
    pointsLabel,
    currentUserId,
}: {
    context: StructuredFeedContextMetadata;
    placement: FeedContestPodiumPlacement;
    slotIndex: number;
    pointsLabel: string;
    currentUserId?: string;
}) => {
    const slot = stageSlots[slotIndex] ?? stageSlots[2];
    const medalToneName = stageMedalToneForRank(placement.rank);
    const medalTone = stageMedalTone[medalToneName];
    const memberCard = contextualMemberCard(
        context,
        placement.userId,
        placement.displayName
    );
    // `is_own` is the server's, so this never compares ids; currentUserId only
    // has to be present for the row to be worth announcing as the viewer's.
    const isViewer = placement.isOwn && Boolean(currentUserId);

    return (
        <li
            value={placement.rank}
            data-feed-contest-result-stage-card
            data-feed-contest-result-placement={placement.rank}
            data-feed-contest-result-visual-slot={slot.name}
            data-feed-contest-result-medal-tone={medalToneName}
            data-feed-contest-result-viewer={isViewer || undefined}
            className={`min-w-0 self-end text-center ${slot.layout}`}
        >
            <div className="flex min-w-0 flex-col items-center">
                <div className="mb-1 flex h-12 w-full items-center justify-center sm:h-14">
                    {slot.name === "center" ? (
                        <>
                            <Image
                                src="/contest-art/compressed/finalized-crown.webp"
                                alt=""
                                aria-hidden="true"
                                width={56}
                                height={45}
                                sizes="(min-width: 640px) 64px, 56px"
                                data-feed-contest-results-stage-crown
                                data-feed-contest-results-stage-crown-position="center"
                                data-feed-contest-results-stage-crown-effect="subtle"
                                className="h-11 w-14 object-contain drop-shadow-[0_2px_2px_rgba(0,0,0,0.35)] sm:h-12 sm:w-16"
                            />
                            <span className="sr-only">First place</span>
                        </>
                    ) : (
                        <span
                            data-feed-contest-result-rank-marker="side"
                            data-feed-contest-result-rank-emphasis="prominent"
                            data-feed-contest-result-rank-tone={medalToneName}
                            data-feed-contest-result-rank-contrast="high"
                            className={`font-black leading-none tabular-nums tracking-[-0.06em] ${stageRankMarkerSize[medalToneName]} ${medalTone.marker}`}
                        >
                            #{placement.rank}
                        </span>
                    )}
                </div>

                <span
                    data-feed-contest-result-avatar-halo
                    data-feed-contest-result-avatar-halo-tone={medalToneName}
                    className={`relative grid place-items-center rounded-full border ${medalTone.avatarHalo} ${slot.avatar}`}
                >
                    <Link
                        href={memberCard.href}
                        aria-label={memberCard.label}
                        data-feed-contest-result-avatar
                        data-feed-contest-result-member-card-link="avatar"
                        className={`grid h-[78%] w-[78%] place-items-center rounded-full border border-amber-100/60 bg-gradient-to-br from-amber-200 via-amber-400 to-orange-500 font-black text-amber-950 shadow-[inset_0_2px_4px_rgba(255,255,255,0.45),0_5px_14px_rgba(0,0,0,0.3)] transition hover:scale-[1.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 ${slot.avatarText}`}
                    >
                        {initialsFor(placement.displayName)}
                    </Link>
                </span>

                <Link
                    href={memberCard.href}
                    data-feed-contest-result-member-card-link="handle"
                    className="mt-2 block max-w-full truncate rounded-sm px-0.5 text-[9px] font-extrabold text-white/90 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:text-[10px]"
                >
                    {placement.displayName}
                </Link>

                <span
                    data-feed-contest-result-points={placement.points}
                    className="mt-1 flex min-w-0 flex-col items-center"
                >
                    <span
                        className={`font-black leading-none tabular-nums tracking-[-0.03em] text-amber-300 drop-shadow-[0_2px_5px_rgba(0,0,0,0.45)] ${slot.points}`}
                    >
                        {placement.points}
                    </span>
                    <span className="mt-0.5 text-[7px] font-bold uppercase leading-tight tracking-[0.08em] text-amber-100/70 sm:text-[8px]">
                        {pointsLabel}
                    </span>
                </span>

                {/* A shared place is stated rather than implied by two members
                    wearing the same medal — "tied" is the only thing that makes
                    a podium reading 1, 1, 3 legible instead of look like a bug. */}
                {placement.isTie ? (
                    <span
                        data-feed-contest-result-tie
                        data-feed-contest-result-tied-count={placement.tiedCount}
                        className="mt-1 inline-flex items-center rounded-full border border-white/10 bg-white/[0.06] px-1.5 py-0.5 text-[7px] font-bold uppercase leading-none tracking-[0.08em] text-slate-300 sm:text-[8px]"
                    >
                        Tied {placement.tiedCount}-way
                    </span>
                ) : null}
            </div>
        </li>
    );
};

export const FeedContestWinnersCard = ({
    context,
    card,
    accent,
    pointsLabel,
    currentUserId,
}: FeedContestWinnersCardProps) => {
    const stageTone = contestResultStageTone[accent];

    return (
        <section
            aria-label={`Final results for ${card.contestName}`}
            data-feed-contest-results
            data-feed-contest-winners-card
            data-post-accent={accent}
            className={`relative overflow-hidden rounded-2xl border ${CONTEST_POST_PRIMARY_TONES[accent]}`}
        >
            <header
                data-feed-contest-results-header
                data-feed-contest-results-header-layout="contest-entry-aligned"
                className={`relative z-20 flex min-w-0 items-center justify-between gap-3 overflow-hidden border-b border-white/10 px-3 py-2.5 sm:px-4 ${CONTEST_POST_HEADER_TONES[accent]}`}
            >
                <h3 className="relative z-[1] min-w-0 flex-1">
                    <Link
                        href={card.detailHref}
                        data-feed-contest-results-contest-link
                        className="inline-flex min-h-6 max-w-full min-w-0 items-start gap-1 rounded-md text-left text-[10px] font-semibold uppercase tracking-[0.13em] text-slate-200 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                    >
                        <span className="truncate">{card.headerLabel}</span>
                        <span
                            aria-hidden="true"
                            className="shrink-0"
                            data-feed-contest-results-link-arrow
                        >
                            ↗
                        </span>
                    </Link>
                </h3>
            </header>

            <div data-feed-contest-results-body="showcase">
                <div
                    role="group"
                    aria-label={`${card.contestName} top three ranks`}
                    data-feed-contest-results-stage="top-three"
                    data-feed-contest-results-stage-theme={stageTone.theme}
                    data-feed-contest-results-stage-surface="contest-entry-body"
                    data-feed-contest-results-stage-accent-treatment="restrained"
                    data-feed-contest-results-stage-decoration="none"
                    data-feed-contest-results-stage-visual-order="2-1-3"
                    className={`relative isolate overflow-hidden px-2 pb-4 pt-1 sm:px-4 sm:pb-5 sm:pt-2 ${NEUTRAL_POST_CARD_SURFACE} ${stageTone.stageAccent}`}
                >
                    <ol
                        aria-label={`${card.contestName} top three ranks`}
                        className="relative z-10 grid min-h-[13.5rem] grid-cols-[minmax(0,1fr)_minmax(0,1.22fr)_minmax(0,1fr)] items-end gap-1 sm:min-h-[14.25rem] sm:gap-3"
                    >
                        {card.placements.map((placement, index) => (
                            <StagePlacement
                                key={`${placement.rank}:${placement.userId}:${index}`}
                                context={context}
                                placement={placement}
                                slotIndex={index}
                                pointsLabel={pointsLabel}
                                currentUserId={currentUserId}
                            />
                        ))}
                    </ol>
                </div>

                {/* Where the MVP's "show remaining ranks" accordion sat. It is a
                    LINK rather than a disclosure because the rest of the board
                    was never fetched — see this file's header note. Rendered only
                    when there provably are more places, so an ordinary
                    three-member podium carries no dead affordance. */}
                {card.hasMorePlacements ? (
                    <div className={`border-t ${stageTone.footer}`}>
                        <Link
                            href={card.detailHref}
                            className={`flex min-h-11 w-full items-center gap-3 px-3 py-2 text-left text-[10px] font-normal normal-case tracking-normal transition hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/40 ${stageTone.footerCopy}`}
                        >
                            <span className="min-w-0 flex-1">
                                more members placed — view full standings
                            </span>
                            <span aria-hidden="true" className="shrink-0">
                                ↗
                            </span>
                        </Link>
                    </div>
                ) : null}
            </div>
        </section>
    );
};

export default FeedContestWinnersCard;
