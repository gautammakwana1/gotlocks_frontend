"use client";

import { useEffect } from "react";
import { ODDS_BRACKETS } from "@/lib/constants";
import { formatTierPrimary, getGroupTierColor, getGroupTierName, GROUP_CAP_POINTS, GROUP_CAP_TIER } from "@/lib/utils/scoring";
import { XP_DAILY_CAP } from "@/lib/utils/progression";

type Props = {
  open: boolean;
  onClose: () => void;
  variant?: "global" | "group" | "all";
};

export const ScoringModal = ({ open, onClose, variant = "all" }: Props) => {
  const globalTiers = ODDS_BRACKETS;
  const groupTiers = ODDS_BRACKETS.filter((tier) => tier.tier <= GROUP_CAP_TIER);
  const groupCapPoints = groupTiers[groupTiers.length - 1]?.points ?? GROUP_CAP_POINTS;
  const groupCapName = getGroupTierName(GROUP_CAP_TIER, `Tier ${GROUP_CAP_TIER}`);
  const showGlobal = variant !== "group";
  const showGroup = variant !== "global";
  const isGroupOnly = variant === "group";
  const isGlobalOnly = variant === "global";
  const isSingleMode = isGroupOnly || isGlobalOnly;
  const modalTitle =
    variant === "global"
      ? "profile scoring rules"
      : variant === "group"
        ? "group scoring rules"
        : "scoring rules & tier table";
  const modalSubtitle =
    variant === "global"
      ? "Global points and XP tiers used on profiles."
      : variant === "group"
        ? `Group leaderboard scoring capped at ${groupCapName}.`
        : "Two scoring modes: profile XP/global points and group leaderboards.";
  const modalWidthClassName = isSingleMode ? "max-w-[640px]" : "max-w-3xl";
  const modalHeaderClassName = isSingleMode ? "px-7 py-5" : "px-6 py-4";
  const modalTitleClassName = isSingleMode ? "text-2xl" : "text-lg";
  const modalSubtitleClassName = isSingleMode ? "text-sm" : "text-xs";
  const modalBodyClassName = isSingleMode
    ? "max-h-[70vh] space-y-8 overflow-y-auto px-7 py-7 text-base text-gray-300"
    : "max-h-[70vh] space-y-6 overflow-y-auto px-6 py-6 text-sm text-gray-300";
  const singleModeSectionClassName = isSingleMode
    ? "mx-auto w-full max-w-[560px]"
    : "";
  const singleModeHeaderTextClassName = isSingleMode ? "max-w-[560px]" : "";
  const groupGridClassName = isGroupOnly
    ? "grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-[max-content_max-content] md:justify-center"
    : "grid gap-3 sm:grid-cols-2";
  const globalGridClassName = isGlobalOnly
    ? "grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-[max-content_max-content] md:justify-center"
    : "grid gap-2 sm:grid-cols-2 sm:justify-center sm:justify-items-center";
  const sectionTitleClassName = isSingleMode ? "text-base" : "text-sm";
  const sectionSubtitleClassName = isSingleMode ? "text-sm" : "text-xs";
  const infoCardClassName = isSingleMode
    ? "rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-sm text-gray-300"
    : "rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-gray-300";
  const legalTextClassName = isSingleMode
    ? "text-sm text-gray-300"
    : "text-xs text-gray-400";
  const closeButtonClassName = isSingleMode
    ? "rounded-full border border-white/20 px-3 py-1.5 text-sm font-semibold tracking-wide text-gray-300 transition hover:border-white/35 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
    : "rounded-full border border-white/15 px-2 py-1 text-xs font-semibold tracking-wide text-gray-300 transition hover:border-white/35 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300";

  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const formatOddsValue = (odds: number | null) => {
    if (odds === null) return null;
    if (!Number.isFinite(odds)) return null;
    return odds > 0 ? `+${odds}` : `${odds}`;
  };

  const maxTierIndex = ODDS_BRACKETS[ODDS_BRACKETS.length - 1]?.tier ?? 1;

  const getTierLabel = (
    tier: (typeof ODDS_BRACKETS)[number],
    capped: boolean
  ) => {
    if (capped && tier.tier === 1) {
      const maxLabel = formatOddsValue(tier.maxOdds);
      if (maxLabel) {
        return `${maxLabel} or less`;
      }
    }
    if (capped && tier.tier === GROUP_CAP_TIER) {
      const minLabel = formatOddsValue(tier.minOdds);
      if (minLabel) {
        return `${minLabel} or greater`;
      }
    }
    if (!capped && tier.tier === 1) {
      const maxLabel = formatOddsValue(tier.maxOdds);
      if (maxLabel) {
        return `${maxLabel} or less`;
      }
    }
    if (!capped && tier.tier === maxTierIndex) {
      const minLabel = formatOddsValue(tier.minOdds);
      if (minLabel) {
        return `${minLabel} or greater`;
      }
    }
    return tier.label;
  };

  const withAlpha = (hex: string, alphaHex: string) => {
    if (hex.startsWith("#") && hex.length === 7) {
      return `${hex}${alphaHex}`;
    }
    return hex;
  };

  const getCardStyle = (override?: string) => {
    if (!override) return undefined;
    return {
      backgroundImage: `linear-gradient(135deg, ${withAlpha(
        override,
        "55"
      )}, ${withAlpha(override, "22")}, rgba(0,0,0,0))`,
    };
  };

  const getHexFromGradient = (color: string) => {
    const match = color.match(/#([0-9a-fA-F]{6})/);
    return match ? `#${match[1]}` : undefined;
  };

  const renderTierCard = (
    tier: (typeof ODDS_BRACKETS)[number],
    {
      capped = false,
      showTierLabel = true,
      showDescriptor = true,
      nameOverride,
      colorOverride,
      cardVariant = "default",
    }: {
      capped?: boolean;
      showTierLabel?: boolean;
      showDescriptor?: boolean;
      nameOverride?: string;
      colorOverride?: string;
      cardVariant?: "default" | "group" | "global";
    } = {}
  ) => {
    const tierPrimary = formatTierPrimary(tier.tier);
    const tierLabel = getTierLabel(tier, capped);
    const descriptorName = nameOverride ?? tier.name;
    const titleCopy = showTierLabel ? tierPrimary : descriptorName;
    const oddsCopy = showTierLabel ? `Odds · ${tierLabel}` : tierLabel;
    const cardTone = colorOverride ? "bg-transparent" : `bg-gradient-to-br ${tier.color}`;
    const cardStyle = getCardStyle(colorOverride);
    const isGroupCard = cardVariant === "group";
    const isGlobalCard = cardVariant === "global";
    const isTierCard = isGroupCard || isGlobalCard;
    const isTierLarge =
      (isGroupCard && isGroupOnly) || (isGlobalCard && isGlobalOnly);
    const cardClassName = isTierCard
      ? isTierLarge
        ? `flex min-h-[72px] w-full items-center justify-between gap-2 rounded-xl border border-white/20 px-3 py-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] sm:min-h-[92px] sm:gap-4 sm:rounded-2xl sm:px-5 sm:py-4 sm:w-[260px] ${cardTone}`
        : `flex w-full items-center justify-between gap-3 rounded-[10px] border border-white/15 px-3 py-2 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)] sm:w-[190px] ${cardTone}`
      : `flex items-center justify-between rounded-xl border border-white/10 px-3 py-2 ${cardTone}`;
    const titleClassName = isTierCard
      ? showTierLabel
        ? isTierLarge
          ? "text-[10px] uppercase tracking-[0.26em] text-white/70 sm:text-xs sm:tracking-[0.28em]"
          : "text-[10px] uppercase tracking-[0.24em] text-white/70"
        : isTierLarge
          ? "text-base font-semibold text-white sm:text-lg"
          : "text-[14px] font-semibold text-white"
      : showTierLabel
        ? "text-[10px] uppercase tracking-wide text-gray-300"
        : "text-xs font-semibold text-white";
    const oddsClassName = isTierCard
      ? isTierLarge
        ? "text-xs text-white/70 sm:text-sm"
        : "text-[11px] text-white/70"
      : "text-[10px] text-gray-300";
    const pointsLabelClassName = isTierCard
      ? isTierLarge
        ? "text-[10px] uppercase tracking-[0.22em] text-white/60 sm:text-xs sm:tracking-[0.24em]"
        : "text-[10px] uppercase tracking-[0.2em] text-white/60"
      : "text-[9px] uppercase tracking-wide text-gray-300";
    const pointsValueClassName = isTierCard
      ? isTierLarge
        ? "text-xs font-semibold text-emerald-200 sm:text-sm"
        : "text-[12px] font-semibold text-emerald-200"
      : "text-xs font-semibold text-emerald-200";
    return (
      <div key={tier.tier} className={cardClassName} style={cardStyle}>
        <div
          className={
            isTierLarge
              ? "min-w-0 space-y-0.5 leading-tight sm:space-y-1"
              : "min-w-0 space-y-0.5 leading-tight"
          }
        >
          <p className={titleClassName}>{titleCopy}</p>
          {showTierLabel && showDescriptor && (
            <p className="text-[13px] font-semibold text-white">{descriptorName}</p>
          )}
          <p className={oddsClassName}>{oddsCopy}</p>
        </div>
        <div
          className={
            isTierLarge
              ? "flex flex-col items-end gap-0.5 text-right leading-tight sm:gap-1"
              : isTierCard
                ? "flex flex-col items-end gap-0.5 text-right leading-tight"
                : "flex flex-col items-end gap-1 text-right leading-tight"
          }
        >
          <p className={pointsLabelClassName}>Win</p>
          <p className={pointsValueClassName}>+{tier.points} pts</p>
        </div>
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 py-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="scoring-modal-title"
      onClick={onClose}
    >
      <div
        className={`max-h-full w-full ${modalWidthClassName} overflow-hidden rounded-xl border border-slate-800/80 bg-black/85 shadow-2xl backdrop-blur`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={`flex items-start justify-between gap-4 border-b border-white/10 ${modalHeaderClassName}`}>
          <div className={`space-y-1 ${singleModeHeaderTextClassName}`}>
            <h2 id="scoring-modal-title" className={`${modalTitleClassName} font-semibold text-white`}>
              {modalTitle}
            </h2>
            <p className={`${modalSubtitleClassName} text-gray-400`}>{modalSubtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={closeButtonClassName}
            aria-label="Close scoring rules"
          >
            x
          </button>
        </div>

        <div className={modalBodyClassName}>
          {showGlobal && (
            <section className={`space-y-3 ${singleModeSectionClassName}`}>
              <div className="space-y-1">
                <h3 className={`${sectionTitleClassName} font-semibold tracking-wide text-sky-200`}>
                  Profile scoring (XP + global points)
                </h3>
                <p className={`${sectionSubtitleClassName} text-gray-400`}>
                  Used on profiles and post picks. Full Tier 1-14 table.
                </p>
              </div>

              <div className={infoCardClassName}>
                <p>Wins add tier points to global points. Losses are -10 points.</p>
                <p>Void/not found/pending stay at 0.</p>
                <p>
                  XP is awarded on wins only and capped at {XP_DAILY_CAP} XP per day.
                </p>
              </div>

              <div className={globalGridClassName}>
                {globalTiers.map((tier) =>
                  renderTierCard(tier, {
                    showTierLabel: false,
                    nameOverride: `Tier ${tier.tier}`,
                    colorOverride: getHexFromGradient(tier.color),
                    cardVariant: "global",
                  })
                )}
              </div>
            </section>
          )}

          {showGroup && (
            <section className={`space-y-3 ${singleModeSectionClassName}`}>
              <div className="space-y-1">
                <h3 className={`${sectionTitleClassName} font-semibold tracking-wide text-sky-200`}>
                  Group leaderboard scoring ({groupCapName} cap)
                </h3>
                <p className={`${sectionSubtitleClassName} text-gray-400`}>
                  Used for group standings and leaderboard slips.
                </p>
              </div>

              <div className={infoCardClassName}>
                <p>
                  Any odds above {groupCapName} score as {groupCapName}{" "}
                  ({groupCapPoints} pts max).
                </p>
                <p>Losses are -15 points. Void/not found/pending stay at 0.</p>
                <p>
                  Awarded points can override tier points during review. Vibe slips
                  award XP only.
                </p>
              </div>

              <div className={groupGridClassName}>
                {groupTiers.map((tier) =>
                  renderTierCard(tier, {
                    capped: true,
                    showTierLabel: false,
                    nameOverride: getGroupTierName(tier.tier, tier.name),
                    colorOverride: getGroupTierColor(tier.tier),
                    cardVariant: "group",
                  })
                )}
              </div>
            </section>
          )}

          <section className={`space-y-2 ${singleModeSectionClassName}`}>
            <h3 className={`${sectionTitleClassName} font-semibold tracking-wide text-sky-200`}>
              Legal note
            </h3>
            <p className={legalTextClassName}>
              gotLocks does not handle money or wagers. All scoring is strictly for
              entertainment, leaderboard ranking, and personal bragging rights.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default ScoringModal;
