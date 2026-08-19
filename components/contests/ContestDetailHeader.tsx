import Image from "next/image";
import type { CSSProperties, KeyboardEvent, ReactNode } from "react";

import BackButton from "@/components/ui/BackButton";
import { CONTEST_ART } from "@/components/contests/preview/contestArt";
import type {
  ContestPreviewArtworkKey,
  ContestPreviewVisualState,
} from "@/components/contests/preview/model";

import styles from "./ContestDetailHeader.module.css";

export type ContestDetailFormat =
  | "fantasy"
  | "general_combo"
  | "sunday_pickem"
  | "td_psychic";

type ContestDetailHeaderProps = {
  accent: "league" | "arena";
  artwork: ContestPreviewArtworkKey;
  backHref: string;
  /** Intercepts the header back button (e.g. to confirm unsaved changes). */
  onBack?: () => void;
  contextName: string;
  contestName: string;
  contestTypeLabel: string;
  format: ContestDetailFormat;
  sports: readonly string[];
  state: ContestPreviewVisualState;
  stateLabel?: string;
  timingLabel: string;
  mobileTimingLabel?: string;
  accessLabel?: string;
  children?: ReactNode;
};

type ContestDetailTab = {
  id: string;
  label: string;
};

type ContestDetailTabBarProps<TTab extends ContestDetailTab> = {
  activeTab: TTab["id"];
  ariaLabel: string;
  onTabChange: (tab: TTab["id"]) => void;
  tabs: readonly TTab[];
  getPanelId?: (tab: TTab["id"]) => string;
  semanticTabs?: boolean;
  tabIdPrefix?: string;
};

const STATE_LABELS: Record<ContestPreviewVisualState, string> = {
  open: "Open",
  locked: "Locked",
  finalized: "Finalized",
};

const ContestTimingIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <rect x="2.25" y="3.5" width="11.5" height="10" rx="2" />
    <path d="M5 2v3M11 2v3M2.5 7h11" />
  </svg>
);

export const ContestDetailTabBar = <TTab extends ContestDetailTab>({
  activeTab,
  ariaLabel,
  onTabChange,
  tabs,
  getPanelId,
  semanticTabs = true,
  tabIdPrefix = "contest-tab",
}: ContestDetailTabBarProps<TTab>) => {
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!semanticTabs || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
      return;
    }

    event.preventDefault();
    const currentIndex = tabs.findIndex((tab) => tab.id === activeTab);
    const nextIndex =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? tabs.length - 1
          : event.key === "ArrowRight"
            ? (currentIndex + 1) % tabs.length
            : (currentIndex - 1 + tabs.length) % tabs.length;
    const nextTab = tabs[nextIndex];
    if (!nextTab) return;

    onTabChange(nextTab.id);
    document.getElementById(`${tabIdPrefix}-${nextTab.id}`)?.focus();
  };

  return (
    <section
      className={`${styles.tabStrip} -mt-1 border-b border-transparent px-5 pb-0 pt-2 sm:px-6`}
      data-contest-tab-strip
    >
      <div
        {...(semanticTabs ? { role: "tablist", "aria-label": ariaLabel } : {})}
        className="grid w-full items-end gap-1"
        style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
        onKeyDown={handleKeyDown}
      >
        {tabs.map((tab, index) => {
          const selected = tab.id === activeTab;
          const centerPosition = (index + 0.5) / tabs.length;
          const stateWeight = Math.min(
            1,
            Math.max(0, (centerPosition - 0.3) / (0.72 - 0.3)),
          );
          const communityWeight = 1 - stateWeight;
          return (
            <button
              key={tab.id}
              id={`${tabIdPrefix}-${tab.id}`}
              type="button"
              {...(semanticTabs
                ? {
                    role: "tab",
                    "aria-selected": selected,
                    "aria-controls": getPanelId?.(tab.id),
                    tabIndex: selected ? 0 : -1,
                  }
                : {})}
              data-contest-tab-active={selected ? "true" : "false"}
              data-contest-tab-accent-mix={stateWeight.toFixed(3)}
              onClick={() => onTabChange(tab.id)}
              style={
                {
                  "--contest-tab-community-weight": `${(
                    communityWeight * 100
                  ).toFixed(3)}%`,
                  "--contest-tab-state-weight": `${(stateWeight * 100).toFixed(
                    3,
                  )}%`,
                } as CSSProperties
              }
              className={`${styles.tab} ${
                selected ? styles.selectedTab : styles.inactiveTab
              } relative flex h-10 min-w-0 items-center justify-center rounded-t-xl border border-b-0 px-1 text-center text-sm font-semibold transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-out sm:px-3 motion-reduce:transition-none`}
            >
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
};

export const ContestDetailHeader = ({
  accent,
  artwork,
  backHref,
  onBack,
  contextName,
  contestName,
  contestTypeLabel,
  format,
  sports,
  state,
  stateLabel: stateLabelOverride,
  timingLabel,
  mobileTimingLabel,
  accessLabel,
  children,
}: ContestDetailHeaderProps) => {
  const stateLabel = stateLabelOverride ?? STATE_LABELS[state];
  const artworkDefinition = CONTEST_ART[artwork];

  return (
    <div
      data-contest-detail-surface
      data-contest-format={format}
      data-contest-header-accent={accent}
      data-contest-header-state={state}
      className={`${styles.surface} -mx-5 sm:-mx-6`}
    >
      <span className={styles.stateSurface} aria-hidden="true" />
      <span className={styles.gridTexture} aria-hidden="true" />
      <span className={styles.artwork} data-contest-artwork aria-hidden="true">
        <Image
          src={artworkDefinition.src}
          alt=""
          fill
          sizes="(min-width: 1024px) 22rem, 46vw"
          className={styles.artworkImage}
          style={{ objectPosition: artworkDefinition.objectPosition }}
        />
      </span>
      <header
        aria-label={`${contestTypeLabel} header`}
        data-contest-detail-header
        data-contest-format={format}
        data-contest-header-accent={accent}
        data-contest-header-state={state}
        className={`${styles.header} pb-4 pl-5 pr-2 sm:px-6`}
      >
        <span
          className="sr-only"
          data-contest-accessible-identity
        >
          <span data-contest-type={format}>{contestTypeLabel}</span>
          <span aria-hidden="true"> · </span>
          <span data-contest-status={state}>{stateLabel}</span>
        </span>

        <div className="relative z-10 flex min-w-0 items-center justify-between gap-2">
          <BackButton
            fallback={backHref}
            preferFallback
            onBack={onBack}
            className={`${styles.backButton} shrink-0 py-1`}
          />
          <div className="flex min-w-0 items-center justify-end gap-1.5 overflow-hidden text-[10px] font-semibold uppercase tracking-wide">
            {accessLabel ? (
              <span
                className={`${styles.metaChip} hidden lg:inline-flex`}
                data-contest-access
                title={accessLabel}
              >
                {accessLabel}
              </span>
            ) : null}

            {mobileTimingLabel ? (
              <span
                className="block min-w-0 max-w-[13rem] truncate text-right text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-300 sm:hidden"
                data-contest-mobile-timing
                title={timingLabel}
              >
                {mobileTimingLabel}
              </span>
            ) : null}

            <span
              className={`${styles.metaChip} hidden min-w-0 max-w-[19rem] sm:inline-flex`}
              data-contest-timing
              title={timingLabel}
            >
              <ContestTimingIcon />
              <span className="truncate">{timingLabel}</span>
            </span>

            {sports.map((sport) => (
              <span
                key={sport}
                className={`${styles.metaChip} hidden md:inline-flex`}
                data-contest-sport
              >
                {sport}
              </span>
            ))}
          </div>
        </div>

        <div className="relative z-10 mt-2.5 flex min-w-0 items-center gap-2 text-base font-semibold sm:text-lg lg:gap-3 lg:text-xl">
          <span
            className="min-w-0 max-w-[45%] truncate text-gray-400"
            title={contextName}
          >
            {contextName}
          </span>
          <span className={styles.titleDivider} aria-hidden="true">
            /
          </span>
          <h1
            className="min-w-0 flex-1 truncate text-base font-semibold text-white sm:text-lg lg:text-xl"
            title={contestName}
          >
            {contestName}
          </h1>
        </div>

      </header>

      {children}
    </div>
  );
};
