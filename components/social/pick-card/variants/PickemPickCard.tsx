"use client";

import type { CSSProperties } from "react";
import { PickemCarousel } from "@/components/contests/PickemCarousel";
import {
    getPickemTeamCardTint,
    getPickemTeamVisual,
    splitPickemTeamName,
} from "@/lib/contests/pickemTeamVisual";
import type { Pick, PickLeg } from "@/lib/interfaces/interfaces";
import ComboOddsRow from "../ComboOddsRow";
import PickCardShell from "../PickCardShell";
import { PLACEHOLDER, buildPickCardModel, type PickCardModel } from "../pickCardModel";
import type { PickCardBaseProps } from "../types";

/* ----------------------------------------------------------------------------
 * AN ACCEPTED SUNDAY PICK'EM CARD.
 *
 * A card is NOT a combo and must not render as one. A combo is one priced parlay
 * that pays only if every leg lands, so its legs read as a list under a single
 * price. A card scores each selection INDEPENDENTLY and sums them, so each
 * selection gets its own tile carrying its own award — two per page, paged by
 * the same carousel the builder uses.
 *
 * TWO ADAPTATIONS from the MVP, both because it reads state this repo has not
 * got:
 *
 *   1. TEAM COLOURS. The MVP resolves them through a bundled team catalog. No
 *      abbreviation is persisted on a stored pick, so `getPickemTeamVisual`
 *      matches the team NAME instead — the leg's `description` is exactly that,
 *      because the server writes `description: side.trim()`.
 *
 *   2. THE POINTS SPLIT. The MVP is handed a per-selection outcome object with
 *      `oddsBasedPoints` / `correctPickBonus` / `totalPoints` precomputed. Here
 *      only the total is stored (`legs[].points`), so the split is reconstructed
 *      from the server's own rule in `scorePickemLeg`: a leg scores 0 unless it
 *      WON, and a winner scores `calculateOddsBasedPoints(american_odds) +
 *      correctBonus`. The bonus is therefore the contest's flat figure on a win
 *      and the odds share is the remainder — never recomputed from the price,
 *      which would drift from what was actually paid.
 * -------------------------------------------------------------------------- */

const META_SEPARATOR = " · ";

/** Our leg vocabulary is `pending | win | loss | void | not_found`. */
const RESULT_COPY: Record<string, string> = {
    pending: "Pending",
    win: "Correct",
    loss: "Incorrect",
    void: "Void",
    not_found: "Under review",
};

/** Settled one way or the other — a scored leg shows numbers, a pending one dashes. */
const isScoredResult = (result: string) => ["win", "loss", "void"].includes(result);

const formatPickemPoints = (points: number) =>
    `${points >= 0 ? "+" : ""}${points.toLocaleString()}`;

const formatKickoff = (value: string | undefined | null) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    }).format(date);
};

export type PickemSelectionTileProps = {
    leg: PickLeg;
    /** The contest's flat per-correct-pick bonus, for the scoring breakdown. */
    correctBonus?: number | null;
    pointsLabel?: "League Points" | "Arena Points";
};

export const PickemSelectionTile = ({
    leg,
    correctBonus,
    pointsLabel = "League Points",
}: PickemSelectionTileProps) => {
    // The server stores the picked team as the leg's description AND as
    // `selection.side`; either is the club name.
    const fullTeamName = leg.selection?.side || leg.description || PLACEHOLDER;
    const teamName = splitPickemTeamName(fullTeamName);
    const teamVisual = getPickemTeamVisual({ name: fullTeamName });
    const teamCardTint = getPickemTeamCardTint(teamVisual);

    const result: string = leg.result ?? "pending";
    const incorrect = result === "loss";
    const scored = isScoredResult(result);

    const matchup = leg.selection?.matchup ?? leg.matchup ?? null;
    const kickoff = formatKickoff(leg.match_time ?? leg.selection?.gameStartTime ?? null);
    const matchupMeta = [matchup, kickoff].filter(Boolean).join(META_SEPARATOR);

    /*
     * "Accepted", not "Odds at lock", unless the capture actually stamped one.
     * A Pick'em leg is priced when the entry is ACCEPTED, and calling that a lock
     * price would misname the number. `lockedOddsAt` is written by the capture
     * and by nothing else, so its presence is the only thing that earns the
     * post-lock label.
     */
    const hasLockTimeOdds = Boolean(leg.selection?.lockedOddsAt);
    const acceptedOdds = leg.odds_bracket || PLACEHOLDER;

    // Reconstructed from scorePickemLeg's rule, never recomputed from the price.
    const total = typeof leg.points === "number" ? leg.points : null;
    const bonus =
        result === "win" && Number.isFinite(Number(correctBonus))
            ? Math.max(0, Math.trunc(Number(correctBonus)))
            : 0;
    const oddsPoints = total === null ? null : total - bonus;

    const scoreValue = (points: number | null) =>
        scored && points !== null ? formatPickemPoints(points) : PLACEHOLDER;

    return (
        <li
            data-feed-entry-selection="sunday_pickem"
            data-pickem-team-color={teamVisual.primary}
            data-team-abbreviation={teamVisual.abbreviation}
            data-team-color={teamVisual.primary}
            data-pickem-selection-result={result}
            data-pickem-team-card-state={incorrect ? "incorrect" : "selected"}
            data-pickem-team-surface={incorrect ? "neutral" : "team-color"}
            data-pickem-team-color-treatment={incorrect ? undefined : "flat"}
            style={
                {
                    "--pickem-team-primary": teamVisual.primary,
                    "--pickem-team-secondary": teamVisual.secondary,
                    backgroundColor: incorrect ? undefined : teamCardTint,
                } as CSSProperties
            }
            className={`relative flex min-h-[10rem] min-w-0 flex-col overflow-hidden rounded-xl border bg-[#0d0f13] p-3 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.045)] ${incorrect ? "border-white/[0.06] grayscale saturate-0" : "border-white/10"
                }`}
        >
            <div className="flex items-start justify-between gap-2">
                <span
                    aria-hidden="true"
                    className={`text-lg font-black tracking-[-0.05em] drop-shadow-md ${incorrect ? "text-gray-300" : "text-white/90"
                        }`}
                >
                    {teamVisual.abbreviation}
                </span>
                <span
                    className={`text-[9px] font-semibold uppercase tracking-[0.1em] ${result === "win"
                        ? "text-emerald-300"
                        : incorrect
                            ? "text-gray-300"
                            : "text-white/75"
                        }`}
                >
                    {RESULT_COPY[result] ?? "Pending"}
                </span>
            </div>

            <div className="mt-2 flex items-start justify-between gap-2">
                <div data-pickem-team-name className="min-w-0 drop-shadow-md">
                    <span className="sr-only">{fullTeamName}</span>
                    <span
                        data-pickem-team-city
                        aria-hidden="true"
                        className={`block whitespace-nowrap text-[9px] font-medium leading-none sm:text-[10px] ${incorrect ? "text-gray-400" : "text-white/65"
                            }`}
                    >
                        {teamName.city || " "}
                    </span>
                    <span
                        data-pickem-team-nickname
                        aria-hidden="true"
                        className={`mt-1 block whitespace-nowrap text-[11px] font-semibold leading-none sm:text-xs ${incorrect ? "text-gray-300" : "text-white"
                            }`}
                    >
                        {teamName.nickname}
                    </span>
                </div>
                <div className="shrink-0 text-right">
                    <p
                        className={`text-[8px] font-semibold uppercase tracking-[0.08em] ${incorrect ? "text-gray-500" : "text-white/60"
                            }`}
                    >
                        {hasLockTimeOdds ? "Odds at lock" : "Accepted"}
                    </p>
                    <p
                        className={`mt-0.5 text-[11px] font-semibold tabular-nums ${incorrect ? "text-gray-300" : "text-white"
                            }`}
                    >
                        {acceptedOdds}
                    </p>
                </div>
            </div>

            {matchupMeta ? (
                <p
                    data-pickem-entry-time
                    className={`mt-2 text-[9px] leading-4 ${incorrect ? "text-gray-400" : "text-white/65"
                        }`}
                >
                    {matchupMeta}
                </p>
            ) : null}

            <dl
                data-pickem-selection-scoring
                aria-label={`Scoring in ${pointsLabel}`}
                className="mt-auto grid grid-cols-3 gap-1 border-t border-white/20 pt-2"
            >
                {(
                    [
                        ["odds", pointsLabel, scoreValue(oddsPoints)],
                        ["bonus", "Bonus Points", scoreValue(scored ? bonus : null)],
                        ["total", "Total Points", scoreValue(total)],
                    ] as const
                ).map(([key, label, value]) => (
                    <div key={key} className="min-w-0">
                        <dt
                            data-pickem-scoring-label={key}
                            className={`text-[9px] font-semibold uppercase leading-tight tracking-[0.04em] ${incorrect ? "text-gray-500" : "text-white/60"
                                }`}
                        >
                            <span data-pickem-scoring-helper className="block">
                                {label}
                            </span>
                        </dt>
                        <dd
                            className={`mt-1 text-[11px] font-semibold tabular-nums ${incorrect ? "text-gray-300" : "text-white"
                                }`}
                        >
                            {value}
                        </dd>
                    </div>
                ))}
            </dl>

            <span
                data-pickem-team-strip
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0 h-1"
                style={{ backgroundColor: incorrect ? "#6B7280" : teamVisual.secondary }}
            />
        </li>
    );
};

/** Two selections per page, exactly as the MVP pages them. */
export const PickemSelectionCarousel = ({
    pick,
    correctBonus,
    pointsLabel,
    className = "mt-3",
}: {
    pick: Pick;
    correctBonus?: number | null;
    pointsLabel?: "League Points" | "Arena Points";
    className?: string;
}) => {
    const legs = pick.legs ?? [];
    const pages = Array.from({ length: Math.ceil(legs.length / 2) }, (_, pageIndex) =>
        legs.slice(pageIndex * 2, pageIndex * 2 + 2)
    );

    const carouselItems = pages.map((page, pageIndex) => {
        const firstPick = pageIndex * 2 + 1;
        const lastPick = firstPick + page.length - 1;
        return {
            id:
                page
                    .map(
                        (leg) =>
                            `${leg.selection?.gameId ?? "game"}:${leg.external_pick_key ?? leg.description}`
                    )
                    .join("|") || `page-${pageIndex}`,
            label: firstPick === lastPick ? `Pick ${firstPick}` : `Picks ${firstPick}–${lastPick}`,
            content: (
                <ul data-pickem-selection-page={pageIndex + 1} className="grid grid-cols-2 gap-2">
                    {page.map((leg, index) => (
                        <PickemSelectionTile
                            key={`${leg.external_pick_key ?? leg.description}-${index}`}
                            leg={leg}
                            correctBonus={correctBonus}
                            pointsLabel={pointsLabel}
                        />
                    ))}
                </ul>
            ),
        };
    });

    if (!carouselItems.length) return null;

    return (
        <div data-pickem-entry-carousel>
            <PickemCarousel
                items={carouselItems}
                versionKey={`${pick.id}:${pick.updated_at ?? pick.created_at ?? "entry"}`}
                ariaLabel="Pick’em entry selection carousel"
                itemName="page"
                className={className}
                compact
            />
        </div>
    );
};

/** True once the shared capture has written a full-card combined price. */
const isPickemCardPriced = (pick: Pick, model: PickCardModel) =>
    typeof pick.american_odds === "number" &&
    pick.american_odds !== 0 &&
    model.legs.some((leg) => Boolean(leg.selection?.lockedOddsAt));

export const PickemPickCard = ({
    pick,
    collapsed = false,
    entryOnly = false,
    contextualPointsLabel,
    accent = "sky",
    includePostedAtPrefix = true,
    presentation = { kind: "ordinary" },
}: PickCardBaseProps) => {
    const model = buildPickCardModel({
        pick,
        presentation,
        contextualPointsLabel,
        accent,
        includePostedAtPrefix,
    });
    const correctBonus =
        presentation.kind === "feed_contest" ? presentation.pickemCorrectBonus : null;

    return (
        <PickCardShell
            model={model}
            collapsed={collapsed}
            entryOnly={entryOnly}
            primaryFooter={
                <ComboOddsRow
                    americanOdds={pick.american_odds}
                    locked={isPickemCardPriced(pick, model)}
                />
            }
        >
            <PickemSelectionCarousel
                pick={pick}
                correctBonus={correctBonus}
                pointsLabel={model.effectiveContextualPointsLabel === "Arena Points" ? "Arena Points" : "League Points"}
                className={entryOnly ? "" : "mt-3"}
            />
        </PickCardShell>
    );
};

export default PickemPickCard;
