"use client";

import { useState } from "react";
import { AnimatedArrow } from "@/components/ui/AnimatedArrow";
import Image from "next/image";
import { generateProfileImageUrl } from "@/lib/utils/helpers";
import Link from "next/link";

import {
    CONTEST_POST_HEADER_TONES,
    CONTEST_POST_PRIMARY_TONES,
    NEUTRAL_POST_CARD_SURFACE,
} from "@/lib/styles/postCards";
import type {
    FeedContestPodiumCard,
    FeedContestPodiumDetail,
    FeedContestPodiumPlacement,
} from "@/lib/contests/feedContestPodium";
import { formatStructuredFeedAmericanOdds } from "./formatters";
import type { StructuredFeedContextMetadata } from "./types";
import { BadgeIcon } from "@/components/badges/BadgeIcon";
import { FeedContestRewardDisclosure } from "./FeedContestRewardDisclosure";
import type { ContestBadgeCategory } from "@/lib/interfaces/interfaces";

/**
 * ONE finalized Feed contest's podium, as the MVP's Feed draws it.
 *
 * Ported from the MVP's components/feed/ContestResultsContent.tsx — the stage,
 * its 2-1-3 visual order, the crown over first place, the medal tones and the
 * gold avatar plates are that file's, kept token-for-token so the two surfaces
 * cannot drift apart.
 *
 * ONE DELIBERATE DIFFERENCE FROM THE MVP, asked for: no "show remaining ranks"
 * disclosure. The MVP card holds the whole frozen standings document, so it can
 * open ranks 4..8 inline. This one is fed by `/list/finalized/podium`, which
 * returns placements 1..3 and nothing else — the rest of the board is not hidden
 * here, it was never fetched. The contest link in the header goes to the
 * standings tab that has it.
 *
 * Everything else the MVP shows is now on the wire and drawn:
 *  - the field-size line ("12 ranked entries"), from `final_entry_count`,
 *  - the per-placement sub-score, from each row's `entry` block — combined odds
 *    on a General Combo, "3/5 teams correct" on the tally templates. WHICH of
 *    the two a contest gets is decided once, by template, in
 *    `podiumResultDetail`: `combo_odds` is an American price on a General
 *    Combo, a DECIMAL TIEBREAK on a TD Psychic card and NULL on a Pick'em, so
 *    rendering it blind would print a tiebreak as a payout,
 *  - the Fantasy badge rail, where that podium carried badges,
 *  - the Arena prize strip, when the read attaches a `reward`.
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


/**
 * The sub-score line under a podium member — the MVP's ResultDetail, at podium
 * scale. Combined odds on a General Combo, "3/5 teams correct" on the tally
 * templates. Renders nothing where the board row could not be read.
 */
const StageResultDetail = ({
    detail,
    valueClassName,
}: {
    detail: FeedContestPodiumDetail;
    valueClassName: string;
}) => {
    const isCombo = detail.kind === "feed_combo";
    const value = isCombo
        ? formatStructuredFeedAmericanOdds(detail.combinedAmericanOdds)
        : `${detail.correctCount}/${detail.selectionCount}`;

    return (
        <span
            data-feed-contest-result-odds={
                isCombo ? detail.combinedAmericanOdds : undefined
            }
            data-feed-contest-result-score={isCombo ? undefined : value}
            data-feed-contest-result-detail-treatment="plain"
            data-feed-contest-result-detail-layout="stacked-centered"
            className="mt-1.5 flex max-w-full flex-col items-center text-center"
        >
            <span
                data-feed-contest-result-detail-value
                data-feed-contest-result-detail-emphasis="points-adjacent"
                className={`font-black leading-none tabular-nums tracking-[-0.02em] text-white/90 ${valueClassName}`}
            >
                {value}
            </span>
            <span
                data-feed-contest-result-detail-label
                className="mt-0.5 text-[8px] font-semibold leading-tight text-slate-300/65 sm:text-[9px]"
            >
                {isCombo ? "combined odds" : detail.correctLabel}
            </span>
        </span>
    );
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

    /* The member's own photo, where they have one.
     *
     * Keyed on the resolved URL rather than a bare boolean so a re-sorted or
     * refetched podium cannot leave one member's failure suppressing a
     * different member's photo in the same slot — the same guard
     * LifetimeStandingAvatar uses. These paths can 404 for a deleted or
     * half-uploaded avatar, and the gold initials plate underneath is the
     * fallback, so a broken image degrades to what the card drew before. */
    const avatarSrc = generateProfileImageUrl(placement.avatarUrl ?? undefined);
    const [failedAvatarUrl, setFailedAvatarUrl] = useState<string | null>(null);
    const showAvatar = Boolean(avatarSrc) && failedAvatarUrl !== avatarSrc;
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
                        data-feed-contest-result-avatar-kind={showAvatar ? "image" : "initials"}
                        data-feed-contest-result-member-card-link="avatar"
                        // `overflow-hidden` so a photo is clipped to the plate;
                        // the gradient and the initials stay underneath as the
                        // fallback, which is what shows when there is no image.
                        className={`grid h-[78%] w-[78%] place-items-center overflow-hidden rounded-full border border-amber-100/60 bg-gradient-to-br from-amber-200 via-amber-400 to-orange-500 font-black text-amber-950 shadow-[inset_0_2px_4px_rgba(255,255,255,0.45),0_5px_14px_rgba(0,0,0,0.3)] transition hover:scale-[1.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 ${slot.avatarText}`}
                    >
                        {showAvatar && avatarSrc ? (
                            <Image
                                src={avatarSrc}
                                alt=""
                                aria-hidden="true"
                                width={96}
                                height={96}
                                unoptimized
                                onError={() => setFailedAvatarUrl(avatarSrc)}
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            initialsFor(placement.displayName)
                        )}
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

                {placement.detail ? (
                    <StageResultDetail
                        detail={placement.detail}
                        valueClassName={slot.name === "center" ? "text-sm sm:text-base" : "text-xs sm:text-sm"}
                    />
                ) : null}

                {/* FANTASY ONLY. The badges this member finished holding, with
                    what they contributed to the score above — the MVP's
                    EarnedBadgeRail at podium scale. Rendered only when the
                    endpoint carried badges: a Feed contest podium has none, and
                    an empty rail on every Feed result would read as a bug.

                    Non-interactive by design. The rail on the standings board
                    opens a BadgeAwardModal, but that modal states the mark that
                    won the badge and the mark needed to take it — neither of
                    which this payload carries, and neither of which means
                    anything on a contest that is already frozen. */}
                {placement.badges?.length ? (
                    <div
                        data-feed-contest-result-badges={placement.badges.length}
                        className="mt-2 flex w-full min-w-0 flex-col items-center"
                    >
                        <div className="flex max-w-full flex-wrap items-center justify-center gap-1">
                            {placement.badges.map((badge) => (
                                <span
                                    key={badge.badge_id}
                                    data-earned-badge={badge.badge_id}
                                    title={`${badge.badge_name} · +${badge.points_awarded} Fantasy Points`}
                                    className="inline-flex h-6 w-6 shrink-0 items-center justify-center"
                                >
                                    <BadgeIcon
                                        category={badge.badge_category as ContestBadgeCategory}
                                        alt={badge.badge_name}
                                        glow={false}
                                        className="h-4 w-4"
                                    />
                                </span>
                            ))}
                        </div>
                        <span className="mt-1 text-[7px] font-semibold uppercase leading-none tracking-[0.08em] text-sky-200/80 sm:text-[8px]">
                            {placement.badges.length} badge
                            {placement.badges.length === 1 ? "" : "s"}
                            {placement.badgePoints ? ` · +${placement.badgePoints}` : ""}
                        </span>
                    </div>
                ) : null}

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

    /* "12 ranked entries" / "8 ranked participants" — the MVP pluralises off
     * WHICH thing the board ranked, not off the count alone. */
    const rankedCountLabel =
        card.entryCount === null
            ? null
            : `${card.entryCount} ranked ${card.entryCount === 1
                ? card.entryNoun
                : card.entryNoun === "entry"
                    ? "entries"
                    : "participants"
            }`;

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
                            data-directional-arrow="up-right"
                            className="ui-directional-arrow shrink-0"
                            data-feed-contest-results-link-arrow
                        >
                            ↗
                        </span>
                    </Link>
                </h3>
                {/* The MVP's field-size line, right of the title. Hidden rather
                    than shown as "0" where the source cannot say — see
                    FeedContestPodiumCard.entryCount. */}
                {rankedCountLabel ? (
                    <span className="relative z-[1] shrink-0 text-[9px] font-medium text-slate-400">
                        {rankedCountLabel}
                    </span>
                ) : null}
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
                            <AnimatedArrow direction="up-right" className="shrink-0" />
                        </Link>
                    </div>
                ) : null}
            </div>

            {/* Prizes, when the contest offered them. Arena-only by construction
                — feed_contest_rewards carries an arena_only CHECK — and gated on
                the surface too so a League can never draw one. Renders nothing
                until the podium read attaches `reward`. */}
            {context.kind === "arena" && card.reward && card.reward.prizes.length ? (
                <FeedContestRewardDisclosure
                    accent={accent}
                    contestName={card.contestName}
                    reward={{
                        settlementLabel: card.reward.settlement_label,
                        providerName: card.reward.provider_name ?? "the Arena organizer",
                        prizes: (card.reward?.prizes ?? []).flatMap((prize) =>
                            typeof prize.place === "number"
                                ? [{
                                    place: prize.place,
                                    title: prize.title ?? "Prize",
                                    description: prize.description ?? "",
                                    approximateValue: prize.approximate_value,
                                }]
                                : []
                        ),
                    }}
                />
            ) : null}
        </section>
    );
};

export default FeedContestWinnersCard;
