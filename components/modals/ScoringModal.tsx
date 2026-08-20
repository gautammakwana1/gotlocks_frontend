"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

import { FANTASY_POINT_TIERS } from "@/lib/constants";
import { FEED_CONTEST_PARTICIPATION_RULES_TEXT } from "@/lib/contests/participationRules";
import { GLOBAL_XP_DAILY_CAP } from "@/lib/scoring/dailyXp";
import {
  calculateOddsBasedPoints,
  ODDS_POINT_EXPONENT,
  ODDS_POINT_SCALE,
} from "@/lib/scoring/oddsBasedPoints";

type Props = {
  open: boolean;
  onClose: () => void;
  variant: "global" | "league" | "arena";
};

const LEAGUE_MODAL_TABS = [
  { id: "league-points", label: "League Points" },
  { id: "fantasy-points", label: "Fantasy Points" },
] as const;

const GLOBAL_MODAL_TABS = [
  { id: "xp", label: "XP" },
  { id: "reward-room", label: "Reward Room" },
] as const;

const ARENA_MODAL_TABS = [
  { id: "how", label: "How Arenas work" },
  { id: "points", label: "Arena Points & leaderboards" },
] as const;

const CONTINUOUS_EXAMPLE_ODDS = [
  -300,
  -200,
  -110,
  100,
  200,
  300,
  500,
  1000,
  2000,
] as const;

type LeagueModalTab = (typeof LEAGUE_MODAL_TABS)[number]["id"];
type GlobalModalTab = (typeof GLOBAL_MODAL_TABS)[number]["id"];
type ArenaModalTab = (typeof ARENA_MODAL_TABS)[number]["id"];

type ScoringTabListProps<T extends string> = {
  activeTab: T;
  ariaLabel: string;
  onChange: (tab: T) => void;
  scope: "global" | "league" | "arena";
  tabs: readonly { id: T; label: string }[];
};

const ScoringTabList = <T extends string,>({
  activeTab,
  ariaLabel,
  onChange,
  scope,
  tabs,
}: ScoringTabListProps<T>) => {
  const focusTab = (index: number) => {
    const tab = tabs[index];
    if (!tab) return;

    onChange(tab.id);
    document.getElementById(`${scope}-scoring-tab-${tab.id}`)?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      aria-orientation="horizontal"
      className="scrollbar-hide -mx-1 flex gap-5 overflow-x-auto border-b border-white/10 px-1"
    >
      {tabs.map((tab, index) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`${scope}-scoring-tab-${tab.id}`}
            aria-selected={isActive}
            aria-controls={`${scope}-scoring-panel-${tab.id}`}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(event) => {
              if (event.key === "Home") {
                event.preventDefault();
                focusTab(0);
                return;
              }
              if (event.key === "End") {
                event.preventDefault();
                focusTab(tabs.length - 1);
                return;
              }
              if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;

              event.preventDefault();
              const direction = event.key === "ArrowRight" ? 1 : -1;
              focusTab((index + direction + tabs.length) % tabs.length);
            }}
            className={`relative inline-flex min-h-11 shrink-0 items-center justify-center whitespace-nowrap border-b-2 px-1 py-2.5 text-xs font-semibold uppercase tracking-wide transition motion-reduce:transition-none sm:text-[11px] ${
              isActive
                ? "border-white text-white"
                : "border-transparent text-gray-400 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};

const DEFAULT_LEAGUE_OPEN_SECTIONS: Record<LeagueModalTab, string | null> = {
  "league-points": "overview",
  "fantasy-points": "tiers",
};

const DEFAULT_GLOBAL_OPEN_SECTIONS: Record<GlobalModalTab, string | null> = {
  xp: "overview",
  "reward-room": "rewards",
};

const DEFAULT_ARENA_OPEN_SECTIONS: Record<ArenaModalTab, string | null> = {
  how: "roles",
  points: "overview",
};

const formatAmericanOdds = (odds: number) =>
  odds > 0 ? `+${odds}` : `${odds}`;

const ContinuousExamples = ({ pointLabel }: { pointLabel: string }) => (
  <div className="space-y-3">
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {CONTINUOUS_EXAMPLE_ODDS.map((odds) => (
        <div
          key={odds}
          className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.035] px-3 py-3"
        >
          <span className="text-xs tabular-nums text-white/60">
            {formatAmericanOdds(odds)}
          </span>
          <span className="text-sm font-semibold tabular-nums text-emerald-200">
            +{calculateOddsBasedPoints(odds)}
          </span>
        </div>
      ))}
    </div>
    <p className="text-xs leading-5 text-white/55">
      These are examples. Your exact {pointLabel} value is based on the accepted odds
      used to score your {pointLabel === "XP" ? "post" : "entry"}.
    </p>
  </div>
);

const ScoringDetails = () => (
  <div className="space-y-4">
    <p>
      Gotlocks converts the accepted American odds into their standard odds multiplier
      and uses that multiplier to calculate the point value.
    </p>
    <div className="rounded-xl border border-white/10 bg-black/35 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50">
        Current formula
      </p>
      <code className="mt-2 block overflow-x-auto whitespace-nowrap text-sm font-semibold text-emerald-200">
        Points = round({ODDS_POINT_SCALE} × odds multiplier^{ODDS_POINT_EXPONENT})
      </code>
    </div>
    <p>
      Longer odds therefore earn more points when successful, while shorter odds earn
      fewer. For example, -200 is a 1.50× multiplier, +100 is 2.00×, +200 is 3.00×,
      and +500 is 6.00×.
    </p>
    <p className="text-xs leading-5 text-white/55">
      Gotlocks may update this scoring model as competitive balance is tested and
      improved. The current rules will always be shown here. Changes apply
      prospectively; finalized points already earned are not recalculated.
    </p>
  </div>
);

export const ScoringModal = ({ open, onClose, variant }: Props) => {
  const [activeLeagueTab, setActiveLeagueTab] =
    useState<LeagueModalTab>("league-points");
  const [activeGlobalTab, setActiveGlobalTab] = useState<GlobalModalTab>("xp");
  const [activeArenaTab, setActiveArenaTab] = useState<ArenaModalTab>("how");
  const [openLeagueSections, setOpenLeagueSections] = useState<
    Record<LeagueModalTab, string | null>
  >(DEFAULT_LEAGUE_OPEN_SECTIONS);
  const [openGlobalSections, setOpenGlobalSections] = useState<
    Record<GlobalModalTab, string | null>
  >(DEFAULT_GLOBAL_OPEN_SECTIONS);
  const [openArenaSections, setOpenArenaSections] = useState<
    Record<ArenaModalTab, string | null>
  >(DEFAULT_ARENA_OPEN_SECTIONS);

  const showGlobal = variant === "global";
  const showLeague = variant === "league";
  const showArena = variant === "arena";
  const modalTitle =
    variant === "global"
      ? "XP Rules"
      : variant === "arena"
        ? "Arena Points Rules"
        : "League Scoring Rules";
  const modalSubtitle =
    variant === "global"
      ? "How eligible Profile and Global posts earn XP and advance your profile."
      : variant === "arena"
        ? "How Feed Contests award Arena Points and build standings inside your Arena."
        : "How League Feed Contests award League Points and Fantasy Contests award Fantasy Points.";
  const closeButtonClassName = `inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full border border-white/20 text-xl font-normal leading-none text-gray-300 transition hover:border-white/35 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-reduce:transition-none ${
    showArena
      ? "focus-visible:outline-violet-300"
      : "focus-visible:outline-sky-300"
  }`;
  const bulletListClassName = `list-disc space-y-2 pl-5 ${
    showArena ? "marker:text-violet-200" : "marker:text-sky-200"
  }`;

  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Not in the MVP. The modal body scrolls on its own, so without this the page
  // behind it scrolls too once that inner scroll hits its end.
  useEffect(() => {
    if (!open) return;

    const scrollBarWidth =
      window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    document.body.style.paddingRight = `${scrollBarWidth}px`;

    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
      document.body.style.paddingRight = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (variant === "league") {
      setActiveLeagueTab("league-points");
      setOpenLeagueSections(DEFAULT_LEAGUE_OPEN_SECTIONS);
    } else if (variant === "global") {
      setActiveGlobalTab("xp");
      setOpenGlobalSections(DEFAULT_GLOBAL_OPEN_SECTIONS);
    } else {
      setActiveArenaTab("how");
      setOpenArenaSections(DEFAULT_ARENA_OPEN_SECTIONS);
    }
  }, [open, variant]);

  if (!open) return null;

  const toggleLeagueSection = (tab: LeagueModalTab, sectionId: string) => {
    setOpenLeagueSections((current) => ({
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

  const toggleArenaSection = (tab: ArenaModalTab, sectionId: string) => {
    setOpenArenaSections((current) => ({
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
  }) => (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.045]">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={panelId}
        className="flex w-full items-start justify-between gap-4 px-5 py-4 text-left transition hover:bg-white/[0.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-sky-300 sm:px-6"
      >
        <span className="space-y-1">
          <span
            className={`block text-[10px] uppercase tracking-[0.22em] ${
              showArena ? "text-violet-200/80" : "text-sky-200/80"
            }`}
          >
            {eyebrow}
          </span>
          <span className="block text-base font-semibold text-white">{title}</span>
        </span>
        <span
          aria-hidden="true"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 text-lg leading-none text-white"
        >
          {isOpen ? "−" : "+"}
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

  const renderFeedFormats = (pointLabel: "League Points" | "Arena Points") => (
    <div className="space-y-4">
      <section>
        <h4 className="font-semibold text-white">General Combo</h4>
        <p className="mt-1">
          Win the full combo to earn {pointLabel} based on the accepted combined odds
          of the successful entry.
        </p>
      </section>
      <section>
        <h4 className="font-semibold text-white">Sunday Pick&apos;em</h4>
        <p className="mt-1">
          Correct picks earn odds-based {pointLabel} plus the contest&apos;s +2
          correct-pick bonus. Placement starts with how many games you get right, so a
          higher correct count ranks ahead of a lower one. Scoring prices are locked
          consistently so everyone is evaluated from the same contest pricing point.
        </p>
      </section>
      <section>
        <h4 className="font-semibold text-white">TD Psychic</h4>
        <p className="mt-1">
          TD Psychic first rewards getting the scorers right. Eligible successful cards
          use the difficulty of the correct scorers within the contest&apos;s existing
          scoring and tie-break system.
        </p>
      </section>
    </div>
  );

  const renderLeagueTabContent = () => {
    if (activeLeagueTab === "league-points") {
      return (
        <div className="space-y-4">
          {renderRuleCard({
            isOpen: openLeagueSections["league-points"] === "overview",
            onToggle: () => toggleLeagueSection("league-points", "overview"),
            panelId: "league-rule-points-overview",
            eyebrow: "League Feed",
            title: "League Points and Feed standings",
            children: (
              <ul className={bulletListClassName}>
                <li>
                  League Points are earned through League Feed Contests and determine
                  the cumulative League Feed standings.
                </li>
                <li>
                  Harder successful predictions generally earn more League Points
                  because scoring follows the accepted odds. Each contest format
                  determines how that value is applied.
                </li>
                <li>
                  League Points are uncapped, have no daily limit, and are separate from
                  XP and Fantasy Points.
                </li>
              </ul>
            ),
          })}
          {renderRuleCard({
            isOpen: openLeagueSections["league-points"] === "formats",
            onToggle: () => toggleLeagueSection("league-points", "formats"),
            panelId: "league-rule-points-formats",
            eyebrow: "Formats",
            title: "How each Feed Contest applies scoring",
            children: renderFeedFormats("League Points"),
          })}
          {renderRuleCard({
            isOpen: openLeagueSections["league-points"] === "examples",
            onToggle: () => toggleLeagueSection("league-points", "examples"),
            panelId: "league-rule-points-examples",
            eyebrow: "Exact examples",
            title: "League Points at sample odds",
            children: <ContinuousExamples pointLabel="League Points" />,
          })}
          {renderRuleCard({
            isOpen: openLeagueSections["league-points"] === "details",
            onToggle: () => toggleLeagueSection("league-points", "details"),
            panelId: "league-rule-points-details",
            eyebrow: "Transparency",
            title: "Scoring details",
            children: <ScoringDetails />,
          })}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {renderRuleCard({
          isOpen: openLeagueSections["fantasy-points"] === "tiers",
          onToggle: () => toggleLeagueSection("fantasy-points", "tiers"),
          panelId: "league-rule-fantasy-tiers",
          eyebrow: "Fantasy Contests",
          title: "Fantasy Point tiers",
          children: (
            <div className="space-y-4">
              <p>
                Fantasy Contests use fixed scoring tiers instead of the continuous Feed
                scoring system. Each pick earns a set number of Fantasy Points based on
                its accepted odds.
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {FANTASY_POINT_TIERS.map((tier) => (
                  <div
                    key={tier.tier}
                    className={`flex min-w-0 items-center justify-between gap-3 rounded-xl border border-white/15 bg-gradient-to-br px-4 py-3 ${tier.color}`}
                  >
                    <span className="min-w-0">
                      <span className="block font-semibold text-white">
                        {tier.displayName}
                      </span>
                      <span className="block text-xs text-white/70">{tier.label}</span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block text-[10px] uppercase tracking-wide text-white/60">
                        Win
                      </span>
                      <span className="block text-sm font-semibold text-emerald-200">
                        +{tier.points} pts{tier.points === 60 ? " MAX" : ""}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ),
        })}
        {renderRuleCard({
          isOpen: openLeagueSections["fantasy-points"] === "outcomes",
          onToggle: () => toggleLeagueSection("fantasy-points", "outcomes"),
          panelId: "league-rule-fantasy-outcomes",
          eyebrow: "Results",
          title: "Wins, losses, voids, and automatic scoring",
          children: (
            <ul className={bulletListClassName}>
              <li>Wins earn the Fantasy Point value for the accepted-odds tier.</li>
              <li>
                Losses earn <strong>−15 Fantasy Points</strong>. Voids and not-found
                results earn 0.
              </li>
              <li>
                +851 and all longer odds stay at the <strong>60-point maximum</strong>.
                Later market movement does not change the accepted tier.
              </li>
              <li>
                Results and Fantasy Points update automatically from the settled game
                outcome. Owners and managers cannot edit the awarded value.
              </li>
              <li>
                Automatically finalized outcomes count toward Fantasy Contest standings.
                Fantasy Points are separate from League Points and never become XP.
              </li>
            </ul>
          ),
        })}
        {renderRuleCard({
          isOpen: openLeagueSections["fantasy-points"] === "lifecycle",
          onToggle: () => toggleLeagueSection("fantasy-points", "lifecycle"),
          panelId: "league-rule-fantasy-lifecycle",
          eyebrow: "Slips",
          title: "Fantasy Contest lifecycle",
          children: (
            <ul className={bulletListClassName}>
              <li>
                League staff create each Fantasy Contest and its League Slips. Members
                submit and manage only their own pick while a Slip is open.
              </li>
              <li>
                At the pick deadline, the Slip locks and starts Resolving automatically.
                Pending or postponed games keep it Resolving while result observations
                continue updating.
              </li>
              <li>
                The Slip finalizes automatically once every pick is terminal. After the
                Fantasy Contest end date, the Contest enters Resolving and finalizes
                automatically when all remaining Slips resolve.
              </li>
              <li>
                Eligible Pro League badge bonuses remain part of finalized Fantasy
                standings; Pro never changes the base Fantasy Point result.
              </li>
            </ul>
          ),
        })}
      </div>
    );
  };

  const renderGlobalTabContent = () => {
    if (activeGlobalTab === "xp") {
      return (
        <div className="space-y-4">
          {renderRuleCard({
            isOpen: openGlobalSections.xp === "overview",
            onToggle: () => toggleGlobalSection("xp", "overview"),
            panelId: "global-rule-xp-overview",
            eyebrow: "XP",
            title: "XP and profile progression",
            children: (
              <ul className={bulletListClassName}>
                <li>
                  Win eligible Profile or Global picks to earn XP. The longer the
                  accepted odds, the more XP a successful pick is worth.
                </li>
                <li>Losses and voids earn 0 XP. A loss never removes XP.</li>
                <li>
                  The accepted odds used to score the post lock its XP value, so later
                  market movement does not change it.
                </li>
                <li>XP advances your Profile level and Reward Room progress.</li>
                <li>
                  Up to <strong>{GLOBAL_XP_DAILY_CAP.toLocaleString("en-US")} XP</strong> can be applied per
                  account day. The full XP value is calculated first, then only the
                  remaining daily allowance is applied.
                </li>
                <li>
                  League Points, Arena Points, and Fantasy Points are separate and do
                  not use or increase this XP allowance.
                </li>
              </ul>
            ),
          })}
          {renderRuleCard({
            isOpen: openGlobalSections.xp === "examples",
            onToggle: () => toggleGlobalSection("xp", "examples"),
            panelId: "global-rule-xp-examples",
            eyebrow: "Exact examples",
            title: "XP at sample odds",
            children: <ContinuousExamples pointLabel="XP" />,
          })}
          {renderRuleCard({
            isOpen: openGlobalSections.xp === "details",
            onToggle: () => toggleGlobalSection("xp", "details"),
            panelId: "global-rule-xp-details",
            eyebrow: "Transparency",
            title: "Scoring details",
            children: <ScoringDetails />,
          })}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {renderRuleCard({
          isOpen: openGlobalSections["reward-room"] === "rewards",
          onToggle: () => toggleGlobalSection("reward-room", "rewards"),
          panelId: "global-rule-reward-room",
          eyebrow: "Reward Room",
          title: "Levels and virtual rewards",
          children: (
            <div className="space-y-4">
              <p>
                Reward Room milestones unlock automatically at Profile levels 5, 15,
                25, and 35. Unlocked rewards are virtual profile, post, and league
                upgrades.
              </p>
              <Link
                href="/global-points-shop"
                onClick={onClose}
                className="inline-flex min-h-11 items-center text-sm font-semibold text-sky-200 underline decoration-white/25 underline-offset-4 transition hover:text-white"
              >
                Go to Reward Room
              </Link>
            </div>
          ),
        })}
      </div>
    );
  };

  const renderArenaTabContent = () => {
    if (activeArenaTab === "how") {
      return (
        <div className="space-y-4">
          {renderRuleCard({
            isOpen: openArenaSections.how === "roles",
            onToggle: () => toggleArenaSection("how", "roles"),
            panelId: "arena-rule-how-roles",
            eyebrow: "Roles",
            title: "Owner, managers, and members",
            children: (
              <ul className={bulletListClassName}>
                <li>
                  The <strong>owner</strong> controls the Arena&apos;s identity,
                  hosting and billing, ownership transfer, and deletion.
                </li>
                <li>
                  <strong>Managers</strong> help run contests and community features,
                  but do not control billing or the permanent unlock.
                </li>
                <li>
                  <strong>Members</strong> join with an invite code, submit complete
                  contest entries, and earn Arena Points.
                </li>
                <li>
                  Owners and managers remain outside the hosting plan&apos;s member count
                  but can compete when a contest permits staff participation. Each
                  accepted staff entry still uses a contest participant spot.
                </li>
              </ul>
            ),
          })}
          {renderRuleCard({
            isOpen: openArenaSections.how === "contests",
            onToggle: () => toggleArenaSection("how", "contests"),
            panelId: "arena-rule-how-contests",
            eyebrow: "Contests",
            title: "Contests and Pick'em",
            children: (
              <ul className={bulletListClassName}>
                <li>
                  Owners and managers create General Combo, NFL Sunday Pick&apos;em, or
                  TD Psychic Feed Contests.
                </li>
                <li>
                  Members build and submit their own entries. Eligible staff use that
                  same flow and are never entered automatically. Competitive entries
                  stay hidden until the contest locks.
                </li>
                <li>
                  Deadlines and game starts are exact instants shown in each viewer&apos;s
                  device-local time.
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
          isOpen: openArenaSections.points === "overview",
          onToggle: () => toggleArenaSection("points", "overview"),
          panelId: "arena-rule-points-overview",
          eyebrow: "Scoring",
          title: "How Arena Points work",
          children: (
            <ul className={bulletListClassName}>
              <li>
                Arena Points are earned through Arena Feed Contests. Harder successful
                predictions generally earn more, while each contest format determines
                how those Arena Points are applied.
              </li>
              <li>
                Arena Points are uncapped, have no daily limit, and are never manually
                edited.
              </li>
              <li>
                Arena Points remain inside that Arena and are separate from XP, League
                Points, and Fantasy Points.
              </li>
              <li>
                Eligible owner and manager entries earn Arena Points normally. Staff
                announcements and Staff Picks remain noncompetitive.
              </li>
            </ul>
          ),
        })}
        {renderRuleCard({
          isOpen: openArenaSections.points === "formats",
          onToggle: () => toggleArenaSection("points", "formats"),
          panelId: "arena-rule-points-formats",
          eyebrow: "Formats",
          title: "How each Feed Contest applies scoring",
          children: renderFeedFormats("Arena Points"),
        })}
        {renderRuleCard({
          isOpen: openArenaSections.points === "examples",
          onToggle: () => toggleArenaSection("points", "examples"),
          panelId: "arena-rule-points-examples",
          eyebrow: "Exact examples",
          title: "Arena Points at sample odds",
          children: <ContinuousExamples pointLabel="Arena Points" />,
        })}
        {renderRuleCard({
          isOpen: openArenaSections.points === "details",
          onToggle: () => toggleArenaSection("points", "details"),
          panelId: "arena-rule-points-details",
          eyebrow: "Transparency",
          title: "Scoring details",
          children: <ScoringDetails />,
        })}
        {renderRuleCard({
          isOpen: openArenaSections.points === "standings",
          onToggle: () => toggleArenaSection("points", "standings"),
          panelId: "arena-rule-points-standings",
          eyebrow: "Standings",
          title: "Leaderboard and achievements",
          children: (
            <ul className={bulletListClassName}>
              <li>
                Eligible participants appear in cumulative Arena standings using
                finalized Arena Points. Staff carry their Arena role beside their
                name after earning eligible Arena Points.
              </li>
              <li>
                Champion, Runner-up, Podium, and Top-five achievements recognize strong
                finishes but add no Arena Points or XP.
              </li>
            </ul>
          ),
        })}
      </div>
    );
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 py-8 ${
        showArena ? "arena-theme" : ""
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="scoring-modal-title"
      aria-describedby="scoring-modal-description"
      onClick={onClose}
    >
      <div
        className="max-h-full w-full max-w-3xl overflow-hidden rounded-xl border border-slate-800/80 bg-black/85 shadow-2xl backdrop-blur"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-6 py-5 sm:px-7">
          <div className="max-w-[630px] space-y-1">
            <h2 id="scoring-modal-title" className="text-xl font-semibold text-white sm:text-2xl">
              {modalTitle}
            </h2>
            <p id="scoring-modal-description" className="text-xs text-gray-400 sm:text-sm">
              {modalSubtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={closeButtonClassName}
            aria-label="Close scoring rules"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>

        <div className="max-h-[72vh] space-y-6 overflow-y-auto overscroll-contain px-6 py-6 text-sm text-gray-300 sm:px-7 sm:py-7">
          {showGlobal ? (
            <section className="mx-auto w-full max-w-[760px] space-y-4">
              <ScoringTabList
                activeTab={activeGlobalTab}
                ariaLabel="Profile scoring sections"
                onChange={setActiveGlobalTab}
                scope="global"
                tabs={GLOBAL_MODAL_TABS}
              />
              <div
                role="tabpanel"
                id={`global-scoring-panel-${activeGlobalTab}`}
                aria-labelledby={`global-scoring-tab-${activeGlobalTab}`}
                className="space-y-4"
              >
                {renderGlobalTabContent()}
              </div>
            </section>
          ) : null}

          {showLeague ? (
            <section className="mx-auto w-full max-w-[760px] space-y-4">
              <ScoringTabList
                activeTab={activeLeagueTab}
                ariaLabel="League scoring sections"
                onChange={setActiveLeagueTab}
                scope="league"
                tabs={LEAGUE_MODAL_TABS}
              />
              <div
                role="tabpanel"
                id={`league-scoring-panel-${activeLeagueTab}`}
                aria-labelledby={`league-scoring-tab-${activeLeagueTab}`}
                className="space-y-4"
              >
                {renderLeagueTabContent()}
              </div>
            </section>
          ) : null}

          {showArena ? (
            <section className="mx-auto w-full max-w-[760px] space-y-4">
              <ScoringTabList
                activeTab={activeArenaTab}
                ariaLabel="Arena scoring sections"
                onChange={setActiveArenaTab}
                scope="arena"
                tabs={ARENA_MODAL_TABS}
              />
              <div
                role="tabpanel"
                id={`arena-scoring-panel-${activeArenaTab}`}
                aria-labelledby={`arena-scoring-tab-${activeArenaTab}`}
                className="space-y-4"
              >
                {renderArenaTabContent()}
              </div>
            </section>
          ) : null}

          <section className="mx-auto w-full max-w-[760px] space-y-2">
            <h3
              className={`text-base font-semibold tracking-wide ${
                showArena ? "text-violet-200" : "text-sky-200"
              }`}
            >
              Legal note
            </h3>
            <p className="text-sm text-gray-300">
              {FEED_CONTEST_PARTICIPATION_RULES_TEXT}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default ScoringModal;
