"use client";

import { ReactNode, useEffect, useState } from "react";
import { ODDS_BRACKETS } from "@/lib/constants";
import { formatTierPrimary, getGroupTierColor, getGroupTierName, GROUP_CAP_POINTS, GROUP_CAP_TIER } from "@/lib/utils/scoring";
import { XP_DAILY_CAP } from "@/lib/utils/progression";
import Link from "next/link";

type Props = {
  open: boolean;
  onClose: () => void;
  variant: "global" | "group";
};

const GROUP_MODAL_TABS = [
  { id: "slips", label: "What are Slips?" },
  { id: "scoring", label: "Scoring and Leaderboards" },
] as const;

const GLOBAL_MODAL_TABS = [
  { id: "scoring", label: "Scoring & XP" },
  { id: "shop", label: "Global Tier Table" },
] as const;

type GroupModalTab = (typeof GROUP_MODAL_TABS)[number]["id"];
type GlobalModalTab = (typeof GLOBAL_MODAL_TABS)[number]["id"];

const DEFAULT_GROUP_OPEN_SECTIONS: Record<GroupModalTab, string | null> = {
  slips: "types",
  scoring: "tiers",
};

const DEFAULT_GLOBAL_OPEN_SECTIONS: Record<GlobalModalTab, string | null> = {
  scoring: "xp",
  shop: "tiers",
};

export const ScoringModal = ({ open, onClose, variant }: Props) => {
  const [activeGroupTab, setActiveGroupTab] = useState<GroupModalTab>("slips");
  const [activeGlobalTab, setActiveGlobalTab] = useState<GlobalModalTab>("scoring");
  const [openGroupSections, setOpenGroupSections] = useState<
    Record<GroupModalTab, string | null>
  >(DEFAULT_GROUP_OPEN_SECTIONS);
  const [openGlobalSections, setOpenGlobalSections] = useState<
    Record<GlobalModalTab, string | null>
  >(DEFAULT_GLOBAL_OPEN_SECTIONS);
  const globalTiers = ODDS_BRACKETS;
  const groupTiers = ODDS_BRACKETS.filter((tier) => tier.tier <= GROUP_CAP_TIER);
  const groupCapPoints = groupTiers[groupTiers.length - 1]?.points ?? GROUP_CAP_POINTS;
  const groupCapName = getGroupTierName(GROUP_CAP_TIER, `Tier ${GROUP_CAP_TIER}`);
  const showGlobal = variant === "global";
  const showGroup = variant === "group";
  const isGroupOnly = variant === "group";
  const isGlobalOnly = variant === "global";
  const isSingleMode = isGroupOnly || isGlobalOnly;
  const modalTitle =
    variant === "global"
      ? "Profile Scoring Rules"
      : "Group Scoring Rules";
  const modalSubtitle =
    variant === "global"
      ? "How post scoring, XP, and global points connect to profiles and the shop."
      : "How slips, scoring, and commissioner controls work inside your group.";
  const modalWidthClassName = isGroupOnly ? "max-w-3xl" : "max-w-[640px]";
  const modalHeaderClassName = isGroupOnly ? "px-6 py-5 sm:px-7" : "px-7 py-5";
  const modalTitleClassName = isGroupOnly ? "text-xl sm:text-2xl" : "text-2xl";
  const modalSubtitleClassName = isGroupOnly ? "text-xs sm:text-sm" : "text-sm";
  const modalBodyClassName = isGroupOnly
    ? "max-h-[72vh] space-y-6 overflow-y-auto px-6 py-6 text-sm text-gray-300 sm:px-7 sm:py-7"
    : "max-h-[70vh] space-y-8 overflow-y-auto px-7 py-7 text-base text-gray-300";
  const singleModeSectionClassName = isGroupOnly
    ? "mx-auto w-full max-w-[760px]"
    : isSingleMode
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

  useEffect(() => {
    if (open && variant === "group") {
      setActiveGroupTab("slips");
      setOpenGroupSections(DEFAULT_GROUP_OPEN_SECTIONS);
      return;
    }
    if (open && variant === "global") {
      setActiveGlobalTab("scoring");
      setOpenGlobalSections(DEFAULT_GLOBAL_OPEN_SECTIONS);
    }
  }, [open, variant]);

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

  const toggleGroupSection = (tab: GroupModalTab, sectionId: string) => {
    setOpenGroupSections((current) => ({
      ...current,
      [tab]: current[tab] === sectionId ? null : sectionId,
    }));
  };

  const toggleGlobalSection = (tab: GlobalModalTab, sectionId: string) => {
    setOpenGlobalSections((current) => ({
      ...current,
      [tab]: current[tab] === sectionId ? null : sectionId,
    }));
  };

  const renderRuleCard = ({
    isOpen,
    onToggle,
    panelId,
    eyebrow,
    title,
    children,
  }: {
    isOpen: boolean;
    onToggle: () => void;
    panelId: string;
    eyebrow: string;
    title: string;
    children: ReactNode;
  }) => {
    return (
      <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.045]">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isOpen}
          aria-controls={panelId}
          className="flex w-full items-start justify-between gap-4 px-5 py-4 text-left transition hover:bg-white/[0.03] sm:px-6"
        >
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-[0.22em] text-sky-200/80">
              {eyebrow}
            </p>
            <h3 className="text-base font-semibold text-white">{title}</h3>
          </div>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 text-lg leading-none text-white">
            {isOpen ? "-" : "+"}
          </span>
        </button>

        {isOpen ? (
          <div
            id={panelId}
            className="border-t border-white/10 px-5 py-4 text-sm leading-6 text-gray-300 sm:px-6"
          >
            {children}
          </div>
        ) : null}
      </section>
    );
  };

  const groupBulletListClassName = "list-disc space-y-2 pl-5 marker:text-sky-200";

  const renderGroupTabContent = () => {
    if (activeGroupTab === "slips") {
      return (
        <div className="space-y-4">
          {renderRuleCard({
            isOpen: openGroupSections.slips === "types",
            onToggle: () => toggleGroupSection("slips", "types"),
            panelId: "group-rule-slips-types",
            eyebrow: "Basics",
            title: "Two slip types",
            children: (
              <ul className={groupBulletListClassName}>
                <li>
                  <strong>Leaderboard Slips.</strong> The official competition inside
                  the group. They count toward group standings and are the slips that
                  get reviewed, scored, and finalized.
                </li>
                <li>
                  <strong>Vibe Slips.</strong> Casual group play for profile
                  progression. They award XP only and never affect leaderboard totals.
                </li>
              </ul>
            ),
          })}

          {renderRuleCard({
            isOpen: openGroupSections.slips === "flow",
            onToggle: () => toggleGroupSection("slips", "flow"),
            panelId: "group-rule-slips-flow",
            eyebrow: "Flow",
            title: "How a slip works",
            children: (
              <ul className={groupBulletListClassName}>
                <li>
                  <strong>Set Up.</strong> Choose sports, set a pick deadline, and
                  select a 1-5 day slate window. Eligible games start after the
                  deadline and within that window.
                </li>
                <li>
                  <strong>Open.</strong> Members submit picks before the deadline.
                </li>
                <li>
                  <strong>In Review.</strong> Once the deadline passes, the slip locks
                  and waits for review.
                </li>
                <li>
                  <strong>Finalized.</strong> The commissioner grades it, can adjust
                  points, and then finalizes it.
                </li>
                <li>
                  <strong>Multiple slips can run at once.</strong> A group can run
                  Leaderboard and Vibe Slips at the same time.
                </li>
              </ul>
            ),
          })}

          {renderRuleCard({
            isOpen: openGroupSections.slips === "controls",
            onToggle: () => toggleGroupSection("slips", "controls"),
            panelId: "group-rule-slips-controls",
            eyebrow: "Controls",
            title: "Who controls what",
            children: (
              <ul className={groupBulletListClassName}>
                <li>
                  Only the <strong>commissioner</strong> can create Leaderboard Slips.
                  Any group member can create a Vibe Slip.
                </li>
                <li>
                  After a slip locks, the commissioner reviews it with auto-grading
                  and optional point adjustments.
                </li>
                <li>
                  Before finalization, a slip can be reopened. Reopening clears the
                  picks and resets the slip.
                </li>
              </ul>
            ),
          })}
        </div>
      );
    }

    if (activeGroupTab === "scoring") {
      return (
        <div className="space-y-4">
          {renderRuleCard({
            isOpen: openGroupSections.scoring === "tiers",
            onToggle: () => toggleGroupSection("scoring", "tiers"),
            panelId: "group-rule-scoring-tiers",
            eyebrow: "Tiers",
            title: "How group scoring works",
            children: (
              <div className="space-y-4">
                <ul className={groupBulletListClassName}>
                  <li>
                    Each pick lands in a scoring tier based on its odds. Wins earn the
                    tier value, and losses are <strong>-15 points</strong>.
                  </li>
                  <li>
                    Group leaderboard scoring caps at {groupCapName}. Any odds above it
                    still score {groupCapPoints} points max.
                  </li>
                </ul>
                <div className={groupGridClassName}>
                  {groupTiers.map((tier) => (
                    renderTierCard(tier, {
                      capped: true,
                      showTierLabel: false,
                      nameOverride: getGroupTierName(tier.tier, tier.name),
                      colorOverride: getGroupTierColor(tier.tier),
                      cardVariant: "group",
                    })
                  ))}
                </div>
              </div>
            ),
          })}

          {renderRuleCard({
            isOpen: openGroupSections.scoring === "adjustments",
            onToggle: () => toggleGroupSection("scoring", "adjustments"),
            panelId: "group-rule-scoring-adjustments",
            eyebrow: "Commissioner",
            title: "Optional score adjustments",
            children: (
              <ul className={groupBulletListClassName}>
                <li>
                  <strong>Allowed.</strong> Commissioners can add bonus points, reduce
                  points, or customize totals for special rules and side competitions.
                </li>
                <li>
                  <strong>Locked.</strong> Pick outcomes cannot be changed. Winning
                  picks stay green, and losing picks stay red.
                </li>
              </ul>
            ),
          })}

          {renderRuleCard({
            isOpen: openGroupSections.scoring === "leaderboard",
            onToggle: () => toggleGroupSection("scoring", "leaderboard"),
            panelId: "group-rule-scoring-leaderboard",
            eyebrow: "Standings",
            title: "What counts toward the leaderboard",
            children: (
              <ul className={groupBulletListClassName}>
                <li>
                  <strong>Finalized only.</strong> Open and in-review slips do not
                  affect standings yet.
                </li>
                <li>
                  <strong>Total score.</strong> A member&apos;s score is the sum of
                  their finalized Leaderboard Slip results.
                </li>
                <li>
                  <strong>Vibe Slips.</strong> They can award XP, but they never change
                  group standings.
                </li>
              </ul>
            ),
          })}
          {renderRuleCard({
            isOpen: openGroupSections.scoring === "extra-controls",
            onToggle: () => toggleGroupSection("scoring", "extra-controls"),
            panelId: "group-rule-scoring-extra-controls",
            eyebrow: "Extra",
            title: "Extra commissioner controls",
            children: (
              <ul className={groupBulletListClassName}>
                <li>
                  Commissioners can use score adjustments to create custom house rules,
                  side challenges, or bonus-based formats on top of the normal slip
                  flow.
                </li>
                <li>
                  Commissioners can open side boards, archive boards, and restart boards
                  whenever the group needs a reset or a new format.
                </li>
              </ul>
            ),
          })}
        </div>
      );
    }
  };

  const renderGlobalTabContent = () => {
    if (activeGlobalTab === "scoring") {
      return (
        <div className="space-y-4">
          {renderRuleCard({
            isOpen: openGlobalSections.scoring === "xp",
            onToggle: () => toggleGlobalSection("scoring", "xp"),
            panelId: "global-rule-scoring-xp",
            eyebrow: "XP",
            title: "What is XP?",
            children: (
              <ul className={groupBulletListClassName}>
                <li>
                  XP stands for experience points and powers your profile
                  progression.
                </li>
                <li>
                  Winning posts earn XP, which helps level up your profile and fill
                  your progress bar.
                </li>
                <li>
                  Losses do <strong>not</strong> remove XP.
                </li>
                <li>
                  You can earn up to <strong>{XP_DAILY_CAP} XP per day</strong>.
                </li>
              </ul>
            ),
          })}

          {renderRuleCard({
            isOpen: openGlobalSections.scoring === "global-points",
            onToggle: () => toggleGlobalSection("scoring", "global-points"),
            panelId: "global-rule-scoring-global-points",
            eyebrow: "Currency",
            title: "What are Global Points?",
            children: (
              <ul className={groupBulletListClassName}>
                <li>
                  Global Points are earned through your posts and used to unlock
                  exclusive rewards.
                </li>
                <li>
                  Winning posts add points based on their tier, while losses
                  subtract points.
                </li>
                <li>
                  The more success you have posting, the more Global Points you
                  earn.
                </li>
              </ul>
            ),
          })}

          {renderRuleCard({
            isOpen: openGlobalSections.scoring === "settlement",
            onToggle: () => toggleGlobalSection("scoring", "settlement"),
            panelId: "global-rule-scoring-settlement",
            eyebrow: "Basics",
            title: "When do points and XP get added?",
            children: (
              <ul className={groupBulletListClassName}>
                <li>
                  Your posts need to settle before any points or XP are added to
                  your profile.
                </li>
                <li>
                  Once a post is graded, your rewards will update automatically.
                </li>
                <li>
                  You&apos;ll also receive a notification when points or XP are
                  added.
                </li>
              </ul>
            ),
          })}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {renderRuleCard({
          isOpen: openGlobalSections.shop === "tiers",
          onToggle: () => toggleGlobalSection("shop", "tiers"),
          panelId: "global-rule-shop-tiers",
          eyebrow: "Tiers",
          title: "Global tier table",
          children: (
            <div className="space-y-4">
              <ul className={groupBulletListClassName}>
                <li>
                  Your posts are scored by tier based on their odds.
                </li>
                <li>
                  Higher-risk picks can earn more Global Points on wins, while
                  losses are always <strong>-15 points</strong>.
                </li>
              </ul>
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
            </div>
          ),
        })}

        {renderRuleCard({
          isOpen: openGlobalSections.shop === "connection",
          onToggle: () => toggleGlobalSection("shop", "connection"),
          panelId: "global-rule-shop-connection",
          eyebrow: "Shop",
          title: "Global Points Shop",
          children: (
            <div className="space-y-4">
              <p>Redeem your Global Points for exclusive rewards.</p>
              <Link
                href="/global-points-shop"
                onClick={onClose}
                className="inline-flex items-center text-sm font-semibold text-sky-200 underline decoration-white/25 underline-offset-4 transition hover:text-white"
              >
                Go to Shop
              </Link>
            </div>
          ),
        })}
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
            {modalSubtitle ? (
              <p className={`${modalSubtitleClassName} text-gray-400`}>{modalSubtitle}</p>
            ) : null}
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
            <section className={`space-y-4 ${singleModeSectionClassName}`}>
              <div
                role="tablist"
                aria-label="Profile scoring sections"
                className="scrollbar-hide -mx-1 flex gap-5 overflow-x-auto border-b border-white/10 px-1"
              >
                {GLOBAL_MODAL_TABS.map((tab) => {
                  const isActive = activeGlobalTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      id={`global-scoring-tab-${tab.id}`}
                      aria-selected={isActive}
                      aria-controls={`global-scoring-panel-${tab.id}`}
                      onClick={() => setActiveGlobalTab(tab.id)}
                      className={`relative whitespace-nowrap border-b-2 px-0 pb-3 text-xs font-semibold uppercase tracking-wide transition sm:text-[11px] ${isActive
                        ? "border-white text-white"
                        : "border-transparent text-gray-400 hover:text-white"
                        }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              <div
                role="tabpanel"
                id={`global-scoring-panel-${activeGlobalTab}`}
                aria-labelledby={`global-scoring-tab-${activeGlobalTab}`}
                className="space-y-4"
              >
                {renderGlobalTabContent()}
              </div>
            </section>
          )}

          {showGroup && (
            <section className={`space-y-4 ${singleModeSectionClassName}`}>
              <div
                role="tablist"
                aria-label="Group scoring sections"
                className="scrollbar-hide -mx-1 flex gap-5 overflow-x-auto border-b border-white/10 px-1"
              >
                {GROUP_MODAL_TABS.map((tab) => {
                  const isActive = activeGroupTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      id={`group-scoring-tab-${tab.id}`}
                      aria-selected={isActive}
                      aria-controls={`group-scoring-panel-${tab.id}`}
                      onClick={() => setActiveGroupTab(tab.id)}
                      className={`relative whitespace-nowrap border-b-2 px-0 pb-3 text-xs font-semibold uppercase tracking-wide transition sm:text-[11px] ${isActive
                        ? "border-white text-white"
                        : "border-transparent text-gray-400 hover:text-white"
                        }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              <div
                role="tabpanel"
                id={`group-scoring-panel-${activeGroupTab}`}
                aria-labelledby={`group-scoring-tab-${activeGroupTab}`}
                className="space-y-4"
              >
                {renderGroupTabContent()}
              </div>
            </section>
          )}

          <section className={`space-y-2 ${singleModeSectionClassName}`}>
            <h3 className={`${sectionTitleClassName} font-semibold tracking-wide text-sky-200`}>
              Legal note
            </h3>
            <p className={legalTextClassName}>
              Gotlocks does not handle money or wagers. All scoring is strictly for
              entertainment, leaderboard ranking, and personal bragging rights.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default ScoringModal;
