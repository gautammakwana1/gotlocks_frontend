"use client";

import { ConfidenceLevel } from "@/lib/interfaces/interfaces";
import { resolveTierCardAppearance } from "@/lib/utils/tierCard";
import ConfidenceDropdown from "../ui/ConfidenceDropdown";

export type ReviewSheetItem = {
  id: string;
  description?: string;
  odds?: string;
  sourceTabLabel?: string;
  tierLine?: string;
  onDelete?: () => void;
};

export type StraightReviewSheetItem = {
  id: string;
  description: string;
  odds: string;
  sourceTabLabel: string;
  tierLine: string;
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
  comboOddsLabel: string | null;
  comboReviewItems: ReviewSheetItem[];
  sameGameComboGroups: SameGameComboReviewGroup[];
  straightReviewItems: StraightReviewSheetItem[];
  reviewListItems: ReviewSheetItem[];
  sheetTierCard: ReturnType<typeof resolveTierCardAppearance>;
  sheetTierLine: string;
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
  onSubmitSameGameCombo: (groupId: string, action: "post" | "slip") => void;
  onSubmitStraight: (legId: string, action: "post" | "slip") => void;
  onSubmitSingle: (action: "post" | "slip") => void;
  onSubmitSelectedPosts: (selection: ReviewSheetPostSelection) => void;
};

const DASH_SEPARATOR = " \u2014 ";

const formatOdds = (odds?: string | null) => odds?.trim() || "—";

const extractPickLine = (description: string | undefined) => {
  if (!description) return undefined;
  const [matchupSegment, ...lineSegments] = description.split(DASH_SEPARATOR);
  const candidate = matchupSegment?.trim();
  const hasMatchup = candidate && /@|\bvs\.?\b|\bv\.?\b/i.test(candidate);
  if (hasMatchup && lineSegments.length > 0) {
    return lineSegments.join(DASH_SEPARATOR);
  }
  return description;
};

const ChevronIcon = ({ direction }: { direction: "up" | "down" }) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 16 16"
    className="h-4 w-4 shrink-0"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {direction === "down" ? (
      <path d="M4 6l4 4 4-4" />
    ) : (
      <path d="M4 10l4-4 4 4" />
    )}
  </svg>
);

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

export function PickReviewSheet({
  show,
  isOpen,
  onOpenChange,
  hasMultiSelection,
  multiSelectionCount,
  sheetHeaderLabel,
  sheetSummary,
  confirmationVariant,
  locked,
  comboHasInvalidSelections,
  comboValidationCopy,
  comboValidationReasons,
  comboOddsLabel,
  comboReviewItems,
  sameGameComboGroups,
  straightReviewItems,
  reviewListItems,
  sheetTierCard,
  sheetTierLine,
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
  onSubmitSameGameCombo,
  onSubmitStraight,
  onSubmitSingle,
  onSubmitSelectedPosts,
}: Props) {
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

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-x-0 top-0 bottom-[calc(0.75rem+4.5rem)] z-30 bg-black/70 sm:bottom-[calc(0.75rem+4.875rem)] md:bottom-[calc(0.75rem+4.875rem*1.45)]"
          role="presentation"
          onClick={() => onOpenChange(false)
          }
        />
      )}

      <div className="fixed inset-x-0 bottom-3 z-30 flex justify-center px-5 sm:px-6" >
        <div className="relative w-[360px] sm:w-[390px] md:origin-bottom md:scale-[1.45]" >
          <div
            className={
              `rounded-3xl sheet-rounded border border-b-0 border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-white/[0.03] shadow-[0_-12px_40px_rgba(0,0,0,0.55)] backdrop-blur ${confirmationVariant === "post"
                ? "pb-[9rem] sm:pb-[9.75rem]"
                : "pb-[4.5rem] sm:pb-[4.875rem]"
              } ${isOpen
                ? "max-h-[calc(100dvh-6rem)] overflow-y-auto sheet-scroll md:max-h-[calc((100dvh-6rem)*0.689655)]"
                : "overflow-hidden"
              }`
            }
          >
            <button
              type="button"
              onClick={() => onOpenChange(!isOpen)}
              className={`flex w-full items-center justify-between gap-3 px-4 py-4 text-left ${isOpen
                ? "sticky top-0 z-10 bg-gradient-to-b from-black/80 via-black/60 to-black/20 backdrop-blur"
                : ""
                }`}
            >
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-400" >
                  {resolvedSheetHeaderLabel}
                </p>
                {
                  isOpen &&
                  (hasMultiSelection ? (
                    <p className="mt-1 text-sm font-semibold text-white" >
                      {multiSelectionCount} picks selected
                    </p>
                  ) : (
                    <p className="mt-1 text-sm font-semibold text-white" >
                      {sheetSummary}
                    </p>
                  ))
                }
              </div>
              < span className="text-gray-400" >
                <ChevronIcon direction={isOpen ? "down" : "up"} />
              </span>
            </button>

            {isOpen && (
              <div className="border-t border-white/10 px-4 pb-5 pt-0 overflow-y-auto max-h-[500px] custom-scrollbar sm:max-h-[350px]" >
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
                          const pickLine = extractPickLine(item?.description);
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
                                    className="min-w-0 text-[12px] font-semibold leading-snug text-cyan-200"
                                    title={item.description}
                                  >
                                    {pickLine}
                                  </p>
                                  {item.tierLine && (
                                    <p className="mt-1 text-[10px] uppercase tracking-wide text-slate-400">
                                      {item.tierLine}
                                    </p>
                                  )}
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
                          <div
                            className={`mt-4 grid gap-3 ${confirmationVariant === "post"
                              ? "grid-cols-2"
                              : "grid-cols-1"
                              }`}
                          >
                            <div
                              className={`rounded-xl border border-white/10 p-2.5 shadow-[inset_0_0_10px_rgba(15, 23, 42, 0.24)] ${sheetTierCard.toneClass}`}
                              style={sheetTierCard.style}
                            >
                              <p className="text-[10px] font-semibold lowercase tracking-wide text-emerald-100/70">
                                tier
                              </p>
                              <p className="mt-1 text-[10px] font-semibold text-white">
                                {sheetTierLine}
                              </p>
                            </div>
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
                          {confirmationVariant === "post" && !selectedConfidence && (
                            <p className="mt-3 text-[11px] text-rose-200">
                              Pick a confidence level to post.
                            </p>
                          )}

                          <div className="mt-4 flex flex-wrap items-center gap-3">
                            {confirmationVariant === "slip" && (
                              <button
                                type="button"
                                onClick={() => onSubmitCombo("slip")}
                                disabled={locked}
                                className="rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-emerald-100 transition hover:border-emerald-400/70 hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-40"
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
                            <ChevronIcon
                              direction={
                                isSameGameSectionCollapsed ? "down" : "up"
                              }
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
                                      const pickLine = extractPickLine(
                                        item.description
                                      );
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
                                                className="min-w-0 text-[12px] font-semibold leading-snug text-cyan-200"
                                                title={item.description}
                                              >
                                                {pickLine}
                                              </p>
                                              {item.tierLine && (
                                                <p className="mt-1 text-[10px] uppercase tracking-wide text-slate-400">
                                                  {item.tierLine}
                                                </p>
                                              )}
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

                                  <div
                                    className={`grid gap-3 ${confirmationVariant === "post"
                                      ? "grid-cols-2"
                                      : "grid-cols-1"
                                      } `}
                                  >
                                    <div
                                      className={`rounded-xl border border-white/10 p-2.5 shadow-[inset_0_0_10px_rgba(15, 23, 42, 0.24)] ${group.tierCard.toneClass}`}
                                      style={group.tierCard.style}
                                    >
                                      <p className="text-[10px] font-semibold lowercase tracking-wide text-emerald-100/70">
                                        tier
                                      </p>
                                      <p className="mt-1 text-[10px] font-semibold text-white">
                                        {group.tierLine}
                                      </p>
                                    </div>
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

                                  {confirmationVariant === "post" && !confidence && (
                                    <p className="text-[11px] text-rose-200">
                                      Pick a confidence level to post.
                                    </p>
                                  )}

                                  {/* <div className="flex flex-wrap items-center gap-3">
                                    {confirmationVariant === "slip" && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          onSubmitSameGameCombo(group.id, "slip")
                                        }
                                        disabled={locked}
                                        className="rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-emerald-100 transition hover:border-emerald-400/70 hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-40"
                                      >
                                        post same game combo to slip
                                      </button>
                                    )}
                                  </div> */}
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
                            <ChevronIcon
                              direction={
                                isStraightSectionCollapsed ? "down" : "up"
                              }
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
                                        </div>
                                        <span className="shrink-0 text-[11px] font-semibold text-slate-100">
                                          {formatOdds(item.odds)}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  <div
                                    className={`grid gap-3 ${confirmationVariant === "post"
                                      ? "grid-cols-2"
                                      : "grid-cols-1"
                                      } `}
                                  >
                                    <div
                                      className={`rounded-xl border border-white/10 p-2.5 shadow-[inset_0_0_10px_rgba(15, 23, 42, 0.24)] ${item.tierCard.toneClass}`}
                                      style={item.tierCard.style}
                                    >
                                      <p className="text-[10px] font-semibold lowercase tracking-wide text-emerald-100/70">
                                        tier
                                      </p>
                                      <p className="mt-1 text-[10px] font-semibold text-white">
                                        {item.tierLine}
                                      </p>
                                    </div>
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

                                  {confirmationVariant === "post" && !confidence && (
                                    <p className="text-[11px] text-rose-200">
                                      Pick a confidence level to post.
                                    </p>
                                  )}

                                  {/* <div className="flex flex-wrap items-center gap-3">
                                    {confirmationVariant === "slip" && (
                                      <button
                                        type="button"
                                        onClick={() => onSubmitStraight(item.id, "slip")}
                                        disabled={locked}
                                        className="rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-emerald-100 transition hover:border-emerald-400/70 hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-40"
                                      >
                                        post to slip
                                      </button>
                                    )}
                                  </div> */}
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
                      <div className="flex items-start gap-3">
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
                                {extractPickLine(singleReviewItem.description)}
                              </p>
                            </div>
                            <span className="shrink-0 text-[11px] font-semibold text-slate-100">
                              {formatOdds(singleReviewItem.odds)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div
                        className={`grid gap-3 ${confirmationVariant === "post"
                          ? "grid-cols-2"
                          : "grid-cols-1"
                          } `}
                      >
                        <div
                          className={`rounded-xl border border-white/10 p-2.5 shadow-[inset_0_0_10px_rgba(15, 23, 42, 0.24)] ${sheetTierCard.toneClass}`}
                          style={sheetTierCard.style}
                        >
                          <p className="text-[10px] font-semibold lowercase tracking-wide text-emerald-100/70">
                            tier
                          </p>
                          <p className="mt-1 text-[10px] font-semibold text-white">
                            {sheetTierLine}
                          </p>
                        </div>
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
                      {confirmationVariant === "post" && !selectedConfidence && (
                        <p className="text-[11px] text-rose-200">
                          Pick a confidence level to post.
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-3">
                        {confirmationVariant === "slip" && (
                          <button
                            type="button"
                            onClick={() => onSubmitSingle("slip")}
                            disabled={locked}
                            className="rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-emerald-100 transition hover:border-emerald-400/70 hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-40"
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
          {confirmationVariant === "post" && (
            <div className="absolute inset-x-0 bottom-[4.5rem] border border-b-0 border-white/10 bg-black/80 px-4 py-3 backdrop-blur sm:bottom-[4.875rem]">
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
                disabled={locked || !hasSelectedPosts}
                className="w-full rounded-xl bg-emerald-500/25 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-emerald-100 transition hover:bg-emerald-500/35 disabled:cursor-not-allowed disabled:opacity-40"
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
