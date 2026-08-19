import { Fragment, type ReactNode } from "react";

import { LifetimeStandingAvatar } from "./LifetimeStandingAvatar";

/* ----------------------------------------------------------------------------
 * The gold LIFETIME standings surface, ported from the MVP's
 * components/community/StandingsCard.tsx.
 *
 * It is layout ONLY: the caller owns every row through `renderRow`, so a board
 * whose row is a Link (League / Arena member card) and a board whose row holds
 * two independent buttons (Global Social: view profile, view pick) can share
 * one frame without nesting an interactive element inside a surface-owned
 * link — which is exactly why the MVP does not accept `href`/`onRowClick`.
 *
 * NOT the same thing as components/contests/FeedContestStandingsPanel.tsx: that
 * is the PER-CONTEST board over `GET /group/feed-contest/leaderboard/:id`, and
 * the MVP keeps it on its own neutral responsive-list frame
 * (StructuredContestDetail.tsx ~5300) rather than on this card.
 * -------------------------------------------------------------------------- */

const joinClassNames = (...values: Array<string | false | null | undefined>) =>
  values.filter(Boolean).join(" ");

/**
 * The reusable gold standings vocabulary. The named classes are exported for
 * standings with richer, custom row interaction (including nested buttons).
 */
export const STANDINGS_CARD_STYLES = {
  frame:
    "min-w-0 overflow-hidden rounded-2xl border border-amber-300/20 bg-[#090806] shadow-[inset_0_1px_0_rgba(254,243,199,0.08),0_12px_30px_rgba(0,0,0,0.22)]",
  fullPageFrame: "min-w-0",
  titleBar:
    "border-b border-amber-200/10 bg-[linear-gradient(115deg,rgba(245,158,11,0.12),rgba(255,255,255,0.025)_55%,rgba(120,53,15,0.08))] px-4 py-3.5",
  fullPageTitleBar:
    "border-y border-amber-200/10 bg-[linear-gradient(115deg,rgba(245,158,11,0.12),rgba(255,255,255,0.025)_55%,rgba(120,53,15,0.08))] px-5 py-3.5 sm:px-4",
  title: "text-sm font-bold text-amber-50",
  subtitle: "mt-1 text-xs leading-5 text-amber-100/45",
  titleActions: "flex shrink-0 items-center gap-2",
  leaderboard: "overflow-hidden",
  fullPageLeaderboard: "overflow-visible",
  columnHeader:
    "items-center gap-3 border-b border-amber-200/10 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-100/45",
  columnHeaderInset: "px-4",
  fullPageColumnHeaderInset: "px-5 sm:px-4",
  columnHeaderSubtle: "bg-amber-400/[0.045] py-2.5",
  columnHeaderGold:
    "bg-[linear-gradient(115deg,rgba(245,158,11,0.12),rgba(255,255,255,0.025)_55%,rgba(120,53,15,0.08))] py-3 text-amber-100/50",
  viewport:
    "max-h-[49.6875rem] overflow-y-auto overscroll-contain focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300/70",
  row:
    "items-center gap-3 border-b border-amber-200/[0.07] bg-[linear-gradient(90deg,rgba(245,158,11,0.045),transparent_40%)] px-4 py-1.5 transition last:border-b-0 hover:bg-amber-300/[0.07] focus-visible:bg-amber-300/[0.07] focus-visible:outline-none",
  fullPageRow:
    "items-center gap-3 border-b border-amber-200/[0.07] bg-[linear-gradient(90deg,rgba(245,158,11,0.045),transparent_40%)] px-5 py-1.5 transition last:border-b-0 hover:bg-amber-300/[0.07] focus-visible:bg-amber-300/[0.07] focus-visible:outline-none sm:px-4",
  rank: "font-black tabular-nums",
  identity: "flex min-w-0 items-center gap-2.5",
  identityHandle: "truncate text-sm font-semibold text-white",
  primaryMetric:
    "text-right text-base font-black tabular-nums text-amber-300 drop-shadow-[0_1px_4px_rgba(245,158,11,0.16)]",
} as const;

export const getStandingRankClassName = (rank: number) =>
  rank === 1
    ? "text-amber-300"
    : rank === 2
      ? "text-slate-200"
      : rank === 3
        ? "text-orange-300"
        : "text-amber-100/65";

export const StandingRank = ({
  rank,
  includeHash = true,
  className,
}: {
  rank: number;
  includeHash?: boolean;
  className?: string;
}) => (
  <span
    className={joinClassNames(
      STANDINGS_CARD_STYLES.rank,
      getStandingRankClassName(rank),
      className,
    )}
  >
    {includeHash ? "#" : ""}
    {rank}
  </span>
);

export const StandingIdentity = ({
  avatarUrl,
  displayName,
  handle,
  rank,
  meta,
  children,
  className,
  handleClassName,
  metaClassName,
}: {
  avatarUrl?: string;
  displayName: string;
  handle: string;
  rank: number;
  meta?: ReactNode;
  children?: ReactNode;
  className?: string;
  handleClassName?: string;
  metaClassName?: string;
}) => (
  <span className={joinClassNames(STANDINGS_CARD_STYLES.identity, className)}>
    <LifetimeStandingAvatar
      avatarUrl={avatarUrl}
      displayName={displayName}
      handle={handle}
      rank={rank}
    />
    <span className="min-w-0">
      <span
        className={joinClassNames(
          "block",
          STANDINGS_CARD_STYLES.identityHandle,
          handleClassName,
        )}
      >
        @{handle.replace(/^@/, "")}
      </span>
      {meta ? (
        <span
          className={joinClassNames(
            "block truncate text-[10px] uppercase tracking-wide text-amber-100/45",
            metaClassName,
          )}
        >
          {meta}
        </span>
      ) : null}
    </span>
    {children}
  </span>
);

export const StandingPrimaryMetric = ({
  value,
  children,
  className,
}: {
  value?: number | string;
  children?: ReactNode;
  className?: string;
}) => (
  <span
    data-lifetime-standing-points={value}
    className={joinClassNames(STANDINGS_CARD_STYLES.primaryMetric, className)}
  >
    {children ?? value}
  </span>
);

export type StandingsCardColumn = {
  key: string;
  label: ReactNode;
  className?: string;
};

export type StandingsPresentation = "card" | "page";

export type StandingsCardProps<Row> = {
  rows: readonly Row[];
  getRowKey: (row: Row, index: number) => string;
  renderRow: (row: Row, index: number) => ReactNode;
  columns: readonly StandingsCardColumn[];
  gridClassName: string;
  title?: ReactNode;
  titleId?: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  emptyState?: ReactNode;
  noTitle?: boolean;
  rootAs?: "section" | "div";
  rootClassName?: string;
  titleBarClassName?: string;
  leaderboardClassName?: string;
  columnHeaderClassName?: string;
  columnHeaderVariant?: "subtle" | "gold";
  viewportClassName?: string;
  visibleRowLimit?: number;
  scrollLabel?: string;
  boardId?: string;
  leaderboardDataId?: string | true;
  scrollDataId?: string | true;
  lifetimeTheme?: string;
  presentation?: StandingsPresentation;
};

/**
 * A layout-only standings surface. Callers retain complete ownership of each
 * row, so additional columns and independent row actions do not require
 * nesting an interactive element inside a surface-owned link or button.
 */
export function StandingsCard<Row>({
  rows,
  getRowKey,
  renderRow,
  columns,
  gridClassName,
  title,
  titleId,
  subtitle,
  actions,
  emptyState,
  noTitle = false,
  rootAs,
  rootClassName,
  titleBarClassName,
  leaderboardClassName,
  columnHeaderClassName,
  columnHeaderVariant = noTitle ? "gold" : "subtle",
  viewportClassName,
  visibleRowLimit = 15,
  scrollLabel,
  boardId,
  leaderboardDataId = true,
  scrollDataId = true,
  lifetimeTheme = "gold",
  presentation = "card",
}: StandingsCardProps<Row>) {
  const Root = rootAs ?? (noTitle ? "div" : "section");
  const fullPage = presentation === "page";
  // A page-presentation board grows with the screen; only the bordered card
  // caps its height, and only once it actually overflows the visible limit.
  const scrollable = !fullPage && rows.length > visibleRowLimit;
  const standingsStyle = fullPage ? "gold-page" : "gold-card";
  const standingsPresentation = fullPage ? "full-page" : "card";
  const leaderboardDataValue =
    leaderboardDataId === true ? true : leaderboardDataId;
  const scrollDataValue = scrollDataId === true ? true : scrollDataId;

  const leaderboardContent = (
    <>
      <div
        className={joinClassNames(
          "grid",
          gridClassName,
          STANDINGS_CARD_STYLES.columnHeader,
          fullPage
            ? STANDINGS_CARD_STYLES.fullPageColumnHeaderInset
            : STANDINGS_CARD_STYLES.columnHeaderInset,
          columnHeaderVariant === "gold"
            ? STANDINGS_CARD_STYLES.columnHeaderGold
            : STANDINGS_CARD_STYLES.columnHeaderSubtle,
          columnHeaderClassName,
        )}
      >
        {columns.map((column) => (
          <span key={column.key} className={column.className}>
            {column.label}
          </span>
        ))}
      </div>
      <div
        data-standings-scroll-container={scrollDataValue}
        data-visible-member-limit={fullPage ? undefined : visibleRowLimit}
        role={scrollable ? "region" : undefined}
        aria-label={scrollable ? scrollLabel : undefined}
        tabIndex={scrollable ? 0 : undefined}
        className={joinClassNames(
          fullPage ? undefined : STANDINGS_CARD_STYLES.viewport,
          viewportClassName,
        )}
      >
        {rows.length
          ? rows.map((row, index) => (
              <Fragment key={getRowKey(row, index)}>
                {renderRow(row, index)}
              </Fragment>
            ))
          : emptyState}
      </div>
    </>
  );

  if (noTitle) {
    return (
      <Root
        data-lifetime-standings-board={boardId}
        data-standings-leaderboard={leaderboardDataValue}
        data-standings-style={standingsStyle}
        data-standings-presentation={standingsPresentation}
        data-lifetime-standings-theme={lifetimeTheme}
        className={joinClassNames(
          fullPage
            ? STANDINGS_CARD_STYLES.fullPageFrame
            : STANDINGS_CARD_STYLES.frame,
          fullPage
            ? STANDINGS_CARD_STYLES.fullPageLeaderboard
            : STANDINGS_CARD_STYLES.leaderboard,
          rootClassName,
          leaderboardClassName,
        )}
      >
        {leaderboardContent}
      </Root>
    );
  }

  return (
    <Root
      aria-labelledby={titleId}
      data-lifetime-standings-board={boardId}
      data-standings-style={standingsStyle}
      data-standings-presentation={standingsPresentation}
      data-lifetime-standings-theme={lifetimeTheme}
      className={joinClassNames(
        fullPage
          ? STANDINGS_CARD_STYLES.fullPageFrame
          : STANDINGS_CARD_STYLES.frame,
        rootClassName,
      )}
    >
      <div
        data-standings-title-bar
        className={joinClassNames(
          fullPage
            ? STANDINGS_CARD_STYLES.fullPageTitleBar
            : STANDINGS_CARD_STYLES.titleBar,
          titleBarClassName,
        )}
      >
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id={titleId} className={STANDINGS_CARD_STYLES.title}>
              {title}
            </h2>
            {subtitle ? (
              <div className={STANDINGS_CARD_STYLES.subtitle}>{subtitle}</div>
            ) : null}
          </div>
          {actions ? (
            <div className={STANDINGS_CARD_STYLES.titleActions}>{actions}</div>
          ) : null}
        </div>
      </div>
      <div
        data-standings-leaderboard={leaderboardDataValue}
        data-standings-style={standingsStyle}
        data-standings-presentation={standingsPresentation}
        data-lifetime-standings-theme={lifetimeTheme}
        className={joinClassNames(
          fullPage
            ? STANDINGS_CARD_STYLES.fullPageLeaderboard
            : STANDINGS_CARD_STYLES.leaderboard,
          leaderboardClassName,
        )}
      >
        {leaderboardContent}
      </div>
    </Root>
  );
}

export default StandingsCard;
