"use client";

import { ConfidenceLevel } from "@/lib/interfaces/interfaces";
import { resolveTierCardAppearance } from "@/lib/utils/tierCard";
import ConfidenceDropdown from "../../ui/ConfidenceDropdown";
import { useEffect } from "react";
import { extractPickLine } from "@/lib/utils/pickDescription";
import { ChevronUpDownIcon } from "../../ui/SvgIcons";
import dockStyles from "../../layout/BottomDock.module.css";

export type ReviewSheetItem = {
  id: string;
  description?: string;
  odds?: string;
  sourceTabLabel?: string;
  tierLine?: string;
  metaLine?: string | null;
  onDelete?: () => void;
};

export type StraightReviewSheetItem = {
  id: string;
  description: string;
  odds: string;
  sourceTabLabel: string;
  tierLine: string;
  metaLine?: string | null;
  tierCard: ReturnType<typeof resolveTierCardAppearance>;
};

export type SameGameComboReviewGroup = {
  id: string;
  label: string;
  oddsLabel: string | null;
  validationCopy?: string | null;
  items: ReviewSheetItem[];
  tierLine: string;
  tierCard: ReturnType<typeof resolveTierCardAppearance>;
};

export type ReviewSheetPostSelection = {
  includeMainCombo: boolean;
  includeSinglePick: boolean;
  sameGameGroupIds: string[];
  straightIds: string[];
};

type Props = {
  show: boolean;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  hasMultiSelection: boolean;
  multiSelectionCount: number;
  sheetHeaderLabel: string;
  sheetSummary: string;
  confirmationVariant: "post" | "slip";
  locked: boolean;
  comboHasInvalidSelections: boolean;
  comboValidationCopy: string | null;
  comboValidationReasons: string[];
  slipWarningMessages?: string[];
  comboOddsLabel: string | null;
  comboReviewItems: ReviewSheetItem[];
  sameGameComboGroups: SameGameComboReviewGroup[];
  straightReviewItems: StraightReviewSheetItem[];
  reviewListItems: ReviewSheetItem[];
  sheetTierCard: ReturnType<typeof resolveTierCardAppearance>;
  sheetTierLine: string;
  showTierCards?: boolean;
  selectedConfidence: ConfidenceLevel | null;
  onSelectedConfidenceChange: (value: ConfidenceLevel | null) => void;
  sameGameComboConfidences: Record<string, ConfidenceLevel | null>;
  onSameGameComboConfidenceChange: (
    id: string,
    value: ConfidenceLevel | null
  ) => void;
  straightConfidences: Record<string, ConfidenceLevel | null>;
  onStraightConfidenceChange: (
    id: string,
    value: ConfidenceLevel | null
  ) => void;
  isSameGameSectionCollapsed: boolean;
  onToggleSameGameSection: () => void;
  isStraightSectionCollapsed: boolean;
  onToggleStraightSection: () => void;
  onSubmitCombo: (action: "post" | "slip") => void;
  onSubmitSingle: (action: "post" | "slip") => void;
  onSubmitSelectedPosts: (selection: ReviewSheetPostSelection) => void;
};

const formatOdds = (odds?: string | null) => odds?.trim() || "—";

const formatCountLabel = (
  count: number,
  singular: string,
  plural = `${singular}s`
) => `${count} ${count === 1 ? singular : plural}`;

const joinLabelParts = (parts: string[]) => {
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;
};

const ReviewMetaLine = ({
  metaLine,
  tierLine,
  includeTierLine = false,
}: {
  metaLine?: string | null;
  tierLine?: string;
  includeTierLine?: boolean;
}) => {
  const showTierLine = includeTierLine && Boolean(tierLine);
  if (!metaLine && !showTierLine) return null;

  return (
    <span className="mt-1 text-[10px] text-slate-400">
      {metaLine}
      {metaLine && showTierLine ? " · " : null}
      {showTierLine ? <span className="uppercase tracking-wide">{tierLine}</span> : null}
    </span>
  );
};

export function PickReviewSheet({
  show,
  isOpen,
  onOpenChange,
  hasMultiSelection,
  multiSelectionCount,
  sheetHeaderLabel,
  confirmationVariant,
  locked,
  comboHasInvalidSelections,
  comboValidationCopy,
  comboValidationReasons,
  slipWarningMessages = [],
  comboOddsLabel,
  comboReviewItems,
  sameGameComboGroups,
  straightReviewItems,
  reviewListItems,
  sheetTierCard,
  sheetTierLine,
  showTierCards = true,
  selectedConfidence,
  onSelectedConfidenceChange,
  sameGameComboConfidences,
  onSameGameComboConfidenceChange,
  straightConfidences,
  onStraightConfidenceChange,
  isSameGameSectionCollapsed,
  onToggleSameGameSection,
  isStraightSectionCollapsed,
  onToggleStraightSection,
  onSubmitCombo,
  onSubmitSingle,
  onSubmitSelectedPosts,
}: Props) {

  // For Stop Overlay Scrollbar
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }

    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isOpen]);

  if (!show) return null;
  const isPostMode = confirmationVariant === "post";
  const includeMainCombo =
    hasMultiSelection && !comboHasInvalidSelections && selectedConfidence !== null;
  const includeSinglePick =
    !hasMultiSelection && isPostMode && selectedConfidence !== null;
  const selectedSameGameGroupIds = sameGameComboGroups
    .filter((group) => sameGameComboConfidences[group.id] !== null)
    .map((group) => group.id);
  const selectedStraightIds = straightReviewItems
    .filter((item) => straightConfidences[item.id] !== null)
    .map((item) => item.id);
  const hasSelectedPosts =
    includeMainCombo ||
    includeSinglePick ||
    selectedSameGameGroupIds.length > 0 ||
    selectedStraightIds.length > 0;
  const singleReviewItem = !hasMultiSelection ? reviewListItems[0] ?? null : null;
  const hasLeagueCandidates = hasMultiSelection
    ? straightReviewItems.length > 0
    : Boolean(singleReviewItem);
  const singleSelectionSummary = "1 pick selected";
  const resolvedSheetHeaderLabel = isPostMode
    ? sheetHeaderLabel
    : hasMultiSelection
      ? "Selected Picks"
      : "Selected Pick";
  const comboSectionLabel = isPostMode ? "Combo Picks+" : "Combo Picks";
  const bottomPostLabel = (() => {
    if (!hasMultiSelection) return "Post Pick";

    const parts: string[] = [];
    if (includeMainCombo) parts.push("Combo Picks+");
    if (selectedSameGameGroupIds.length > 0) {
      parts.push(
        formatCountLabel(
          selectedSameGameGroupIds.length,
          "Same Game Pick",
          "Same Game Picks"
        )
      );
    }
    if (selectedStraightIds.length > 0) {
      parts.push(
        formatCountLabel(
          selectedStraightIds.length,
          "Straight Pick",
          "Straight Picks"
        )
      );
    }

    return parts.length > 0 ? `Post ${joinLabelParts(parts)}` : "Post Pick";
  })();

  const shouldRenderTierGrid = showTierCards || confirmationVariant === "post";
  const detailGridClassName = `grid gap-3 ${showTierCards && confirmationVariant === "post" ? "grid-cols-2" : "grid-cols-1"
    }`;

  return (
    <>
      {isOpen && (
        <div
          data-pick-review-backdrop
          className={`${dockStyles.dockClearance} fixed inset-x-0 top-0 z-30 bg-black/70`}
          role="presentation"
          onClick={() => onOpenChange(false)
          }
        />
      )}

      <div
        data-pick-review-dock
        className={`${dockStyles.viewportAnchor} ${dockStyles.dockPosition} ${dockStyles.dockGutter} fixed z-30 flex justify-center`}
      >
        <div className={`${dockStyles.scaledFrame} relative`} >
          <div
            data-pick-review-surface
            data-pick-review-open={isOpen}
            data-pick-review-variant={confirmationVariant}
            className={`rounded-3xl sheet-rounded border-x-0 border-t border-white/10 shadow-[0_-12px_40px_rgba(0,0,0,0.55)] sm:border sm:border-b-0 ${isOpen
              ? "bg-[#080a0f]"
              : "bg-gradient-to-br from-white/10 via-white/5 to-white/[0.03] backdrop-blur"
              } ${confirmationVariant === "post" && isOpen
                ? dockStyles.postSheetActionClearance
                : dockStyles.sheetSurfaceClearance
              } ${isOpen
                ? `${dockStyles.openSheetViewport} overflow-y-auto sheet-scroll`
                : "overflow-hidden"
              }`}
          >
            <button
              type="button"
              onClick={() => onOpenChange(!isOpen)}
              aria-expanded={isOpen}
              aria-label={isOpen ? "Collapse pick review" : "Expand pick review"}
              className={`flex w-full items-center justify-between gap-3 px-4 py-4 text-left ${isOpen
                ? "sticky top-0 z-10 bg-[#080a0f]"
                : "min-h-[72px] sm:min-h-0"
                }`}
            >
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wide text-gray-400" >
                  {resolvedSheetHeaderLabel}
                </p>
                <p className="mt-1 text-sm font-semibold text-white">
                  {hasMultiSelection
                    ? `${multiSelectionCount} picks selected`
                    : singleSelectionSummary}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                {!isOpen &&
                  hasMultiSelection &&
                  !comboHasInvalidSelections &&
                  comboOddsLabel && (
                    <div className="text-right">
                      <span className="block text-[11px] font-semibold text-slate-100">
                        {comboOddsLabel}
                      </span>
                      <span className="mt-0.5 block text-[9px] uppercase tracking-wide text-slate-400">
                        combo odds
                      </span>
                    </div>
                  )}
                {/* The open/close affordance.
                    Sized and rotated here rather than through a `direction`
                    prop — the icon has none, so the old `direction` landed on
                    the DOM as an inert attribute and the chevron never turned
                    (nor rendered, having had no size class either). The base
                    path points DOWN, which is the CLOSE direction, so it is the
                    shut state that rotates. That rotation flips the shared
                    hover nudge along with the glyph, so the fixed "down"
                    direction always reads as "toward where this points". */}
                <span
                  aria-hidden
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] text-gray-200 transition-transform duration-200 ${isOpen ? "" : "rotate-180"
                    }`}
                >
                  <ChevronUpDownIcon
                    data-directional-arrow="down"
                    className="ui-directional-arrow h-4 w-4"
                  />
                </span>
              </div>
            </button>

            {isOpen && (
              <div className="border-t border-white/10 px-4 pb-5 pt-0 overflow-y-auto max-h-[500px] custom-scrollbar sm:max-h-[350px]" >
                {slipWarningMessages.length > 0 && (
                  <div className="-mx-4 border-x-0 border-y border-amber-400/30 bg-amber-950/35 px-4 py-4">
                    <p className="text-xs uppercase tracking-wide text-amber-200/80">
                      Slip warning
                    </p>
                    <div className="mt-2 space-y-1">
                      {slipWarningMessages.map((message) => (
                        <p key={message} className="text-[12px] font-semibold text-amber-100">
                          {message}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
                {hasMultiSelection ? (
                  <div className="flex flex-col gap-2" >
                    <div
                      className={`-mx-4 border-x-0 border-y p-4 ${comboHasInvalidSelections
                        ? "border-amber-400/30 bg-amber-950/35"
                        : "border-white/10 bg-white/5"
                        }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="text-xs uppercase tracking-wide text-gray-400">
                            {comboSectionLabel}
                          </p>
                          {comboValidationCopy && (
                            <p
                              className={`text-sm font-semibold ${comboHasInvalidSelections
                                ? "text-amber-100"
                                : "text-white"
                                } `}
                            >
                              {comboValidationCopy}
                            </p>
                          )}
                          {comboValidationReasons.length > 0 && (
                            <p className="text-[11px] text-amber-100/80">
                              {comboValidationReasons[0]}
                            </p>
                          )}
                        </div>
                        {!comboHasInvalidSelections && comboOddsLabel && (
                          <div className="shrink-0 pt-3 pr-2 text-right">
                            <span className="block text-[11px] font-semibold text-slate-100">
                              {comboOddsLabel}
                            </span>
                            <span className="mt-1 block text-[10px] uppercase tracking-wide text-slate-400">
                              combo odds
                            </span>
                          </div>
                        )}
                      </div>

                      <ul className="mt-4 divide-y divide-white/10">
                        {comboReviewItems.map((item) => {
                          const pickLine = item?.description ? extractPickLine(item?.description) : "-";
                          return (
                            <li
                              key={item.id}
                              className="flex w-full items-start gap-3 py-3 pr-2 first:pt-0 last:pb-0"
                            >
                              <div className="min-w-0 flex flex-1 items-center gap-2">
                                <button
                                  type="button"
                                  onClick={item.onDelete}
                                  className="mt-1 flex h-4 w-4 items-center justify-center rounded-full border border-rose-400/60 bg-rose-500/15 text-[12px] font-semibold text-rose-200 transition hover:bg-rose-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/60"
                                  aria-label="Remove pick"
                                  title="Remove pick"
                                >
                                  -
                                </button>
                                <div className="min-w-0">
                                  {item.sourceTabLabel && (
                                    <span className="block text-[9px] font-semibold uppercase tracking-wide text-gray-400">
                                      {item.sourceTabLabel}
                                    </span>
                                  )}
                                  <p
                                    className="mt-1 min-w-0 text-[12px] font-semibold leading-snug text-cyan-200"
                                    title={item.description}
                                  >
                                    {pickLine}
                                  </p>
                                  <ReviewMetaLine
                                    metaLine={item.metaLine}
                                    tierLine={item.tierLine}
                                    includeTierLine={showTierCards}
                                  />
                                </div>
                              </div>
                              <div className="flex items-start gap-2 pt-3 text-right">
                                <span className="text-[11px] font-semibold text-slate-100">
                                  {formatOdds(item.odds)}
                                </span>
                              </div>
                            </li>
                          );
                        })}
                      </ul>

                      {!comboHasInvalidSelections && (
                        <>
                          {shouldRenderTierGrid && (
                            <div className={`mt-4 ${detailGridClassName}`}>
                              {showTierCards && (
                                <div
                                  className={`rounded-xl border border-white/10 p-2.5 shadow-[inset_0_0_10px_rgba(15, 23, 42, 0.24)] ${sheetTierCard.toneClass}`}
                                  style={sheetTierCard.style}
                                >
                                  <p className="text-[10px] font-semibold lowercase tracking-wide text-sky-100/70">
                                    tier
                                  </p>
                                  <p className="mt-1 text-[10px] font-semibold text-white">
                                    {sheetTierLine}
                                  </p>
                                </div>
                              )}
                              {confirmationVariant === "post" && (
                                <div className="rounded-xl border border-white/10 bg-white/[0.04] p-2.5 shadow-[inset_0_0_10px_rgba(15,23,42,0.2)]">
                                  <p className="block text-[10px] font-semibold lowercase tracking-wide text-slate-400">
                                    confidence
                                  </p>
                                  <ConfidenceDropdown
                                    value={selectedConfidence}
                                    onChange={onSelectedConfidenceChange}
                                    disabled={locked}
                                  />
                                </div>
                              )}
                            </div>
                          )}
                          {confirmationVariant === "post" && !selectedConfidence && (
                            <p className="mt-3 text-[11px] text-rose-200">
                              Pick a confidence level to post.
                            </p>
                          )}

                          <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
                            {confirmationVariant === "slip" && (
                              <button
                                type="button"
                                onClick={() => onSubmitCombo("slip")}
                                disabled={locked}
                                className="ui-accent-button rounded-xl px-4 py-3 text-xs font-semibold uppercase tracking-wide transition disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                post combo to slip
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>

                    {isPostMode && sameGameComboGroups.length > 0 && (
                      <div className="-mx-4 overflow-hidden border-x-0 border-y border-white/10 bg-white/5">
                        <button
                          type="button"
                          onClick={onToggleSameGameSection}
                          aria-expanded={!isSameGameSectionCollapsed}
                          className="flex w-full items-center justify-between px-4 py-4 text-left"
                        >
                          <p className="text-xs uppercase tracking-wide text-gray-400">
                            Same Game Combo Picks
                          </p>
                          <span className="text-gray-400">
                            <ChevronUpDownIcon
                              data-directional-arrow="down"
                              className={`ui-directional-arrow h-4 w-4 shrink-0 ${isSameGameSectionCollapsed ? "" : "rotate-180"}`}
                            />
                          </span>
                        </button>

                        {!isSameGameSectionCollapsed && (
                          <div className="divide-y divide-white/10 border-t border-white/10">
                            {sameGameComboGroups.map((group) => {
                              const confidence =
                                sameGameComboConfidences[group.id] ?? null;

                              return (
                                <div key={group.id} className="space-y-4 px-4 py-4">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="space-y-1">
                                      <p className="text-xs uppercase tracking-wide text-gray-400">
                                        Same game combo
                                      </p>
                                      <p className="text-sm font-semibold text-white">
                                        {group.label}
                                      </p>
                                      {group.validationCopy && (
                                        <p className="text-[11px] text-slate-300">
                                          {group.validationCopy}
                                        </p>
                                      )}
                                    </div>
                                    {group.oddsLabel && (
                                      <div className="shrink-0 pt-3 pr-2 text-right">
                                        <span className="block text-[11px] font-semibold text-slate-100">
                                          {group.oddsLabel}
                                        </span>
                                        <span className="mt-1 block text-[10px] uppercase tracking-wide text-slate-400">
                                          combo odds
                                        </span>
                                      </div>
                                    )}
                                  </div>

                                  <ul className="divide-y divide-white/10">
                                    {group.items.map((item) => {
                                      const pickLine = item.description ? extractPickLine(
                                        item.description
                                      ) : "-";
                                      return (
                                        <li
                                          key={item.id}
                                          className="flex w-full items-start gap-3 py-3 pr-2 first:pt-0 last:pb-0"
                                        >
                                          <div className="min-w-0 flex flex-1 items-center gap-2">
                                            <button
                                              type="button"
                                              onClick={item.onDelete}
                                              className="mt-1 flex h-4 w-4 items-center justify-center rounded-full border border-rose-400/60 bg-rose-500/15 text-[12px] font-semibold text-rose-200 transition hover:bg-rose-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/60"
                                              aria-label="Remove pick"
                                              title="Remove pick"
                                            >
                                              -
                                            </button>
                                            <div className="min-w-0">
                                              {item.sourceTabLabel && (
                                                <span className="block text-[9px] font-semibold uppercase tracking-wide text-gray-400">
                                                  {item.sourceTabLabel}
                                                </span>
                                              )}
                                              <p
                                                className="mt-1 min-w-0 text-[12px] font-semibold leading-snug text-cyan-200"
                                                title={item.description}
                                              >
                                                {pickLine}
                                              </p>
                                              <ReviewMetaLine
                                                metaLine={item.metaLine}
                                                tierLine={item.tierLine}
                                                includeTierLine={showTierCards}
                                              />
                                            </div>
                                          </div>
                                          <div className="flex items-start gap-2 pt-3 text-right">
                                            <span className="text-[11px] font-semibold text-slate-100">
                                              {formatOdds(item.odds)}
                                            </span>
                                          </div>
                                        </li>
                                      );
                                    })}
                                  </ul>

                                  {shouldRenderTierGrid && (
                                    <div className={detailGridClassName}>
                                      {showTierCards && (
                                        <div
                                          className={`rounded-xl border border-white/10 p-2.5 shadow-[inset_0_0_10px_rgba(15, 23, 42, 0.24)] ${group.tierCard.toneClass}`}
                                          style={group.tierCard.style}
                                        >
                                          <p className="text-[10px] font-semibold lowercase tracking-wide text-sky-100/70">
                                            tier
                                          </p>
                                          <p className="mt-1 text-[10px] font-semibold text-white">
                                            {group.tierLine}
                                          </p>
                                        </div>
                                      )}
                                      {confirmationVariant === "post" && (
                                        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-2.5 shadow-[inset_0_0_10px_rgba(15,23,42,0.2)]">
                                          <p className="block text-[10px] font-semibold lowercase tracking-wide text-slate-400">
                                            confidence
                                          </p>
                                          <ConfidenceDropdown
                                            value={confidence}
                                            onChange={(value) =>
                                              onSameGameComboConfidenceChange(
                                                group.id,
                                                value
                                              )
                                            }
                                            disabled={locked}
                                          />
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {confirmationVariant === "post" && !confidence && (
                                    <p className="text-[11px] text-rose-200">
                                      Pick a confidence level to post.
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {isPostMode && (
                      <div className="-mx-4 overflow-hidden border-x-0 border-y border-white/10 bg-white/5">
                        <button
                          type="button"
                          onClick={onToggleStraightSection}
                          aria-expanded={!isStraightSectionCollapsed}
                          className="flex w-full items-center justify-between px-4 py-4 text-left"
                        >
                          <p className="text-xs uppercase tracking-wide text-gray-400">
                            Straight Picks
                          </p>
                          <span className="text-gray-400">
                            <ChevronUpDownIcon
                              data-directional-arrow="down"
                              className={`ui-directional-arrow h-4 w-4 shrink-0 ${isStraightSectionCollapsed ? "" : "rotate-180"}`}
                            />
                          </span>
                        </button>

                        {!isStraightSectionCollapsed && (
                          <div className="divide-y divide-white/10 border-t border-white/10">
                            {straightReviewItems.map((item) => {
                              const confidence = straightConfidences[item.id] ?? null;
                              const pickLine = extractPickLine(item.description);

                              return (
                                <div key={item.id} className="space-y-4 px-4 py-4">
                                  <div className="flex items-center gap-3">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        comboReviewItems
                                          .find((comboItem) => comboItem.id === item.id)
                                          ?.onDelete?.()
                                      }
                                      className="mt-1 flex h-4 w-4 items-center justify-center rounded-full border border-rose-400/60 bg-rose-500/15 text-[12px] font-semibold text-rose-200 transition hover:bg-rose-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/60"
                                      aria-label="Remove pick"
                                      title="Remove pick"
                                    >
                                      -
                                    </button>
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                          <span className="block text-[9px] font-semibold uppercase tracking-wide text-gray-400">
                                            {item.sourceTabLabel}
                                          </span>
                                          <p
                                            className="mt-1 text-[13px] font-semibold leading-snug text-cyan-200"
                                            title={item.description}
                                          >
                                            {pickLine}
                                          </p>
                                          <ReviewMetaLine metaLine={item.metaLine} />
                                        </div>
                                        <span className="shrink-0 text-[11px] font-semibold text-slate-100">
                                          {formatOdds(item.odds)}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  {shouldRenderTierGrid && (
                                    <div className={detailGridClassName}>
                                      {showTierCards && (
                                        <div
                                          className={`rounded-xl border border-white/10 p-2.5 shadow-[inset_0_0_10px_rgba(15, 23, 42, 0.24)] ${item.tierCard.toneClass}`}
                                          style={item.tierCard.style}
                                        >
                                          <p className="text-[10px] font-semibold lowercase tracking-wide text-sky-100/70">
                                            tier
                                          </p>
                                          <p className="mt-1 text-[10px] font-semibold text-white">
                                            {item.tierLine}
                                          </p>
                                        </div>
                                      )}
                                      {confirmationVariant === "post" && (
                                        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-2.5 shadow-[inset_0_0_10px_rgba(15,23,42,0.2)]">
                                          <p className="block text-[10px] font-semibold lowercase tracking-wide text-slate-400">
                                            confidence
                                          </p>
                                          <ConfidenceDropdown
                                            value={confidence}
                                            onChange={(value) =>
                                              onStraightConfidenceChange(item.id, value)
                                            }
                                            disabled={locked}
                                          />
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {confirmationVariant === "post" && !confidence && (
                                    <p className="text-[11px] text-rose-200">
                                      Pick a confidence level to post.
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {locked && (
                      <p className="text-xs text-rose-200">Picks are locked.</p>
                    )}
                  </div>
                ) : singleReviewItem ? (
                  <div className="-mx-4 overflow-hidden border-x-0 border-y border-white/10 bg-white/5">
                    <div className="space-y-4 px-4 py-4">
                      <div className="flex items-center gap-3">
                        {singleReviewItem.onDelete ? (
                          <button
                            type="button"
                            onClick={singleReviewItem.onDelete}
                            className="mt-1 flex h-4 w-4 items-center justify-center rounded-full border border-rose-400/60 bg-rose-500/15 text-[12px] font-semibold text-rose-200 transition hover:bg-rose-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/60"
                            aria-label="Remove pick"
                            title="Remove pick"
                          >
                            -
                          </button>
                        ) : (
                          <span className="mt-2 h-1.5 w-1.5 rounded-full bg-cyan-300/80" />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              {singleReviewItem.sourceTabLabel && (
                                <span className="block text-[9px] font-semibold uppercase tracking-wide text-gray-400">
                                  {singleReviewItem.sourceTabLabel}
                                </span>
                              )}
                              <p
                                className="mt-1 text-[13px] font-semibold leading-snug text-cyan-200"
                                title={singleReviewItem.description}
                              >
                                {singleReviewItem.description ? extractPickLine(singleReviewItem.description) : "-"}
                              </p>
                              <ReviewMetaLine metaLine={singleReviewItem.metaLine} />
                            </div>
                            <span className="shrink-0 text-[11px] font-semibold text-slate-100">
                              {formatOdds(singleReviewItem.odds)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {shouldRenderTierGrid && (
                        <div className={detailGridClassName}>
                          {showTierCards && (
                            <div
                              className={`rounded-xl border border-white/10 p-2.5 shadow-[inset_0_0_10px_rgba(15, 23, 42, 0.24)] ${sheetTierCard.toneClass}`}
                              style={sheetTierCard.style}
                            >
                              <p className="text-[10px] font-semibold lowercase tracking-wide text-sky-100/70">
                                tier
                              </p>
                              <p className="mt-1 text-[10px] font-semibold text-white">
                                {sheetTierLine}
                              </p>
                            </div>
                          )}
                          {confirmationVariant === "post" && (
                            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-2.5 shadow-[inset_0_0_10px_rgba(15,23,42,0.2)]">
                              <p className="block text-[10px] font-semibold lowercase tracking-wide text-slate-400">
                                confidence
                              </p>
                              <ConfidenceDropdown
                                value={selectedConfidence}
                                onChange={onSelectedConfidenceChange}
                                disabled={locked}
                              />
                            </div>
                          )}
                        </div>
                      )}
                      {confirmationVariant === "post" && !selectedConfidence && (
                        <p className="text-[11px] text-rose-200">
                          Pick a confidence level to post.
                        </p>
                      )}

                      <div className="flex flex-wrap items-center justify-end gap-3">
                        {confirmationVariant === "slip" && (
                          <button
                            type="button"
                            onClick={() => onSubmitSingle("slip")}
                            disabled={locked}
                            className="ui-accent-button rounded-xl px-4 py-3 text-xs font-semibold uppercase tracking-wide transition disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            post to slip
                          </button>
                        )}
                      </div>

                      {locked && (
                        <p className="text-xs text-rose-200">Picks are locked.</p>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
          {confirmationVariant === "post" && isOpen && (
            <div
              data-pick-review-action
              className={`${dockStyles.sheetActionOffset} absolute inset-x-0 z-20 border border-b-0 border-white/10 bg-[#080a0f] px-4 py-3`}
            >
              <button
                type="button"
                onClick={() =>
                  onSubmitSelectedPosts({
                    includeMainCombo,
                    includeSinglePick,
                    sameGameGroupIds: selectedSameGameGroupIds,
                    straightIds: selectedStraightIds,
                  })
                }
                disabled={locked || (!hasSelectedPosts && !hasLeagueCandidates)}
                className="ui-accent-button w-full rounded-xl px-4 py-3 text-xs font-semibold uppercase tracking-wide transition disabled:cursor-not-allowed disabled:opacity-40"
              >
                {bottomPostLabel}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
