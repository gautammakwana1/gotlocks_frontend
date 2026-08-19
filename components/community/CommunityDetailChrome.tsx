import type { CSSProperties, ReactNode } from "react";

import styles from "./CommunityDetailChrome.module.css";

export type CommunityDetailAccent = "league" | "arena";

export const COMMUNITY_DETAIL_HEADER_ACTION_CLASS_NAME =
  "inline-flex h-10 shrink-0 items-center justify-center whitespace-nowrap rounded-xl border border-white/10 px-3.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-400 transition hover:bg-white/5 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-gray-400 lg:h-11 lg:px-5 lg:text-xs";

export const COMMUNITY_DETAIL_HEADER_PRIMARY_ACTION_CLASS_NAME =
  `${COMMUNITY_DETAIL_HEADER_ACTION_CLASS_NAME} lg:h-12 lg:w-36 lg:px-6`;

const COMMUNITY_DETAIL_CONTEST_ACTION_BASE_CLASS_NAME =
  "inline-flex h-10 shrink-0 items-center justify-center whitespace-nowrap rounded-xl border px-3 text-[10px] font-semibold uppercase tracking-[0.1em] transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";

export const COMMUNITY_DETAIL_CONTEST_ACTION_CLASS_NAME =
  `${COMMUNITY_DETAIL_CONTEST_ACTION_BASE_CLASS_NAME} border-blue-400/25 bg-blue-400/10 text-blue-300 hover:border-blue-400/45 hover:bg-blue-400/15 focus-visible:outline-sky-300`;

/**
 * The Arena tone of the same button.
 *
 * DELIBERATE DIVERGENCE FROM THE MVP: the MVP applies its single blue constant
 * on the Arena screen too (MVP ArenaDashboard.tsx:1391-1392), so the button
 * renders League blue inside the violet Arena Contests band — against the violet
 * `bg-violet-400/[0.055]` header it sits in, and against the violet-400 the
 * contest cards below it were just retoned to. That reads as an MVP oversight
 * rather than an intent, and this app had a violet button here before the port,
 * so matching the MVP verbatim would be a visible regression.
 *
 * Violet values are the same ramp as `--community-accent-rgb` for arena
 * (167 139 250) and as ContestPreviewCard.module.css `.arena`.
 */
export const COMMUNITY_DETAIL_ARENA_CONTEST_ACTION_CLASS_NAME =
  `${COMMUNITY_DETAIL_CONTEST_ACTION_BASE_CLASS_NAME} border-violet-400/25 bg-violet-400/10 text-violet-300 hover:border-violet-400/45 hover:bg-violet-400/15 focus-visible:outline-violet-300`;

type CommunityDetailChromeProps = {
  accent: CommunityDetailAccent;
  children: ReactNode;
};

type CommunityDetailHeaderProps = {
  actions: ReactNode;
  backAction: ReactNode;
  description: ReactNode;
  inviteIndicator: ReactNode;
  metadataClassName: string;
  metadataEnd: ReactNode;
  metadataStart: ReactNode;
  mobileActionsLayout?: "equal" | "end";
  title: ReactNode;
  titleClassName?: string;
  titleStyle?: CSSProperties;
};

type CommunityDetailTab = {
  id: string;
  label: string;
};

type CommunityDetailTabBarProps<TTab extends CommunityDetailTab> = {
  activeTab: TTab["id"];
  ariaLabel: string;
  className?: string;
  onTabChange: (tabId: TTab["id"]) => void;
  tabs: readonly TTab[];
};

export const CommunityDetailIndicatorSeparator = () => (
  <span
    aria-hidden="true"
    data-community-header-indicator-separator
    className="hidden shrink-0 text-gray-600 lg:inline"
  >
    ·
  </span>
);

export const CommunityDetailChrome = ({
  accent,
  children,
}: CommunityDetailChromeProps) => (
  <div
    data-community-detail-surface
    data-community-accent={accent}
    className={`${styles.surface} -mx-5 sm:-mx-6`}
  >
    <div className={styles.backdrop} aria-hidden="true">
      <span className={styles.colorSurface} />
      <span className={styles.gridTexture} />
      <span className={styles.lightField} />
    </div>
    <div
      className={`${styles.content} flex flex-col gap-3 pt-2 sm:pt-3 lg:pt-4`}
    >
      {children}
    </div>
  </div>
);

export const CommunityDetailHeader = ({
  actions,
  backAction,
  description,
  inviteIndicator,
  metadataClassName,
  metadataEnd,
  metadataStart,
  mobileActionsLayout = "equal",
  title,
  titleClassName = "",
  titleStyle,
}: CommunityDetailHeaderProps) => (
  <header
    data-community-header
    className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 px-5 pb-4 sm:px-6 sm:pb-5 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:gap-x-2 lg:pb-6"
  >
    <div data-community-header-utility className="contents">
      <div
        data-community-header-back
        className="col-start-1 row-start-1 flex min-h-11 min-w-0 items-center lg:min-h-12"
      >
        {backAction}
      </div>
      <div
        data-community-header-invite
        className="col-start-2 row-start-1 flex min-h-11 items-center justify-end lg:col-start-3 lg:min-h-12 lg:gap-2"
      >
        <CommunityDetailIndicatorSeparator />
        {inviteIndicator}
      </div>
    </div>

    <div
      data-community-header-metadata
      className="contents"
    >
      <div
        data-community-header-primary-indicators
        className={`col-start-1 row-start-2 mt-3 flex min-h-5 min-w-0 -translate-y-2 flex-wrap items-center gap-x-3 gap-y-1 text-gray-400 sm:translate-y-0 lg:col-start-2 lg:row-start-1 lg:mt-0 lg:min-h-12 lg:translate-y-0 lg:flex-nowrap lg:gap-x-2 lg:justify-self-end lg:whitespace-nowrap lg:text-[11px] ${metadataClassName}`}
      >
        {metadataStart}
      </div>
      <div
        data-community-header-secondary-indicators
        className={`col-start-2 row-start-2 mt-3 flex min-h-5 -translate-y-2 items-center justify-end text-gray-400 sm:translate-y-0 lg:col-start-2 lg:col-end-4 lg:row-start-2 lg:mt-0 lg:translate-y-0 lg:justify-self-end lg:whitespace-nowrap lg:text-[11px] ${metadataClassName}`}
      >
        {metadataEnd}
      </div>
    </div>

    <div
      data-community-header-identity
      className="contents"
    >
      <div
        data-community-header-copy
        className="col-span-2 row-start-3 mt-2.5 min-w-0 -translate-y-2 sm:translate-y-0 lg:col-span-1 lg:col-start-1 lg:row-start-3 lg:mt-4 lg:translate-y-0 lg:pl-4"
      >
        <h1
          className={`allow-caps min-w-0 bg-clip-text text-2xl font-extrabold leading-tight text-transparent sm:text-3xl lg:text-[2.625rem] lg:tracking-[-0.025em] ${titleClassName}`}
          style={titleStyle}
        >
          {title}
        </h1>
        <p className="mt-1.5 line-clamp-2 min-h-10 max-w-3xl text-xs leading-5 text-gray-500 sm:text-[13px] lg:mt-2 lg:min-h-0 lg:text-base lg:leading-6">
          {description}
        </p>
      </div>

      <div
        data-community-header-actions
        className={`col-span-2 row-start-4 mt-3 w-full gap-2 lg:col-start-2 lg:col-end-4 lg:row-start-3 lg:mt-4 lg:w-auto lg:shrink-0 lg:self-end lg:justify-self-end lg:gap-3 ${
          mobileActionsLayout === "equal"
            ? "grid grid-flow-col auto-cols-fr"
            : "flex justify-end"
        }`}
      >
        {actions}
      </div>
    </div>
  </header>
);

export const CommunityDetailTabStrip = ({
  children,
}: {
  children: ReactNode;
}) => (
  <section
    data-community-detail-tab-strip
    className={`${styles.tabStrip} -mt-3 border-b border-transparent px-5 pb-0 pt-2 sm:px-6`}
  >
    {children}
  </section>
);

export const CommunityDetailTabBar = <TTab extends CommunityDetailTab>({
  activeTab,
  ariaLabel,
  className = "grid",
  onTabChange,
  tabs,
}: CommunityDetailTabBarProps<TTab>) => (
  <nav aria-label={ariaLabel} className={`${styles.navigation} ${className}`}>
    <div
      className="grid w-full items-end gap-1"
      style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
    >
      {tabs.map((tab, index) => {
        const selected = activeTab === tab.id;
        const centerPosition = (index + 0.5) / tabs.length;
        const endWeight = Math.min(
          1,
          Math.max(0, (centerPosition - 0.34) / (0.72 - 0.34)),
        );
        const startWeight = 1 - endWeight;

        return (
          <button
            key={tab.id}
            type="button"
            aria-label={tab.label}
            aria-current={selected ? "page" : undefined}
            data-community-tab-active={selected ? "true" : "false"}
            data-community-tab-accent-mix={endWeight.toFixed(3)}
            onClick={() => onTabChange(tab.id)}
            style={
              {
                "--community-tab-start-weight": `${(
                  startWeight * 100
                ).toFixed(3)}%`,
                "--community-tab-end-weight": `${(endWeight * 100).toFixed(
                  3,
                )}%`,
              } as CSSProperties
            }
            className={`${styles.tab} ${
              selected ? styles.selectedTab : styles.inactiveTab
            } relative flex h-10 min-w-0 items-center justify-center rounded-t-xl border border-b-0 px-1 text-center text-sm font-semibold transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-out sm:px-3 lg:h-11 lg:text-[15px] motion-reduce:transition-none`}
          >
            <span className="truncate">{tab.label}</span>
          </button>
        );
      })}
    </div>
  </nav>
);
