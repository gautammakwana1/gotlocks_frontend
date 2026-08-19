"use client";

import {
  useId,
  useRef,
  type HTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type TouchEvent as ReactTouchEvent,
} from "react";

type DataAttributes = {
  [key: `data-${string}`]: string | number | boolean | undefined;
};

type CommunitySwipePagerItem<Id extends string> = {
  id: Id;
  label: string;
};

type CommunitySwipePagerAccent = "sky" | "violet";

type CommunitySwipePagerProps<Id extends string> = {
  items: readonly CommunitySwipePagerItem<Id>[];
  activeId: Id;
  onChange: (id: Id) => void;
  ariaLabel: string;
  progressLabel: string;
  positionLabel: string;
  accent: CommunitySwipePagerAccent;
  children: ReactNode;
  stackedLabel?: boolean;
  showPosition?: boolean;
  controlsAccessory?: ReactNode;
  reserveControlsAccessorySpace?: boolean;
  afterControls?: ReactNode;
  afterControlsClassName?: string;
  className?: string;
  headerClassName?: string;
  headerProps?: Omit<
    HTMLAttributes<HTMLDivElement>,
    "children" | "className"
  > &
    DataAttributes;
  panelClassName?: string;
  panelId?: string;
};

const joinClassNames = (...values: Array<string | false | null | undefined>) =>
  values.filter(Boolean).join(" ");

const PAGER_ACCENT_STYLES = {
  sky: {
    label: "text-sky-100/80",
    activeDot: "border-sky-200 bg-sky-300",
    focus: "focus-visible:outline-sky-300",
  },
  violet: {
    label: "text-violet-100/80",
    activeDot: "border-violet-200 bg-violet-300",
    focus: "focus-visible:outline-violet-300",
  },
} as const;

// A swipe that starts on a control (or inside a nested carousel) belongs to that
// control, not to the pager — otherwise dragging a slider or scrolling a nested
// strip would page the whole surface out from under the finger.
const isNestedOrInteractiveTouch = (
  target: EventTarget | null,
  currentTarget: HTMLDivElement,
) => {
  if (!(target instanceof Element)) return false;

  const carousel = target.closest<HTMLElement>(
    '[aria-roledescription="carousel"]',
  );
  if (carousel && carousel !== currentTarget) return true;

  return Boolean(
    target.closest(
      'a,button,input,select,textarea,[role="button"],[role="slider"]',
    ),
  );
};

/**
 * A controlled, swipeable page switcher with compact progress dots. The active
 * content is owned by the caller and exposed as the switcher's current slide.
 *
 * Ported verbatim from the MVP's components/community/CommunitySwipePager — it
 * carries no data of its own, so both the Feed's view switcher and the Contests
 * tab's contest-type switcher mount the same component.
 */
export const CommunitySwipePager = <Id extends string>({
  items,
  activeId,
  onChange,
  ariaLabel,
  progressLabel,
  positionLabel,
  accent,
  children,
  stackedLabel = false,
  showPosition = true,
  controlsAccessory,
  reserveControlsAccessorySpace = false,
  afterControls,
  afterControlsClassName,
  className,
  headerClassName,
  headerProps,
  panelClassName,
  panelId,
}: CommunitySwipePagerProps<Id>) => {
  const generatedPanelId = useId();
  const touchStartX = useRef<number | null>(null);
  const activeIndex = Math.max(
    0,
    items.findIndex((item) => item.id === activeId),
  );
  const activeItem = items[activeIndex] ?? items[0];
  const resolvedPanelId = panelId ?? `community-pager-${generatedPanelId}`;
  const accentStyles = PAGER_ACCENT_STYLES[accent];

  if (!activeItem) return null;

  const showIndex = (index: number) => {
    const normalizedIndex = (index + items.length) % items.length;
    const item = items[normalizedIndex];
    if (item) onChange(item.id);
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    if (
      event.key !== "ArrowLeft" &&
      event.key !== "ArrowRight" &&
      event.key !== "Home" &&
      event.key !== "End"
    ) {
      return;
    }

    event.preventDefault();
    if (event.key === "Home") showIndex(0);
    else if (event.key === "End") showIndex(items.length - 1);
    else if (event.key === "ArrowLeft") showIndex(activeIndex - 1);
    else showIndex(activeIndex + 1);
  };

  const handleTouchStart = (event: ReactTouchEvent<HTMLDivElement>) => {
    touchStartX.current = isNestedOrInteractiveTouch(
      event.target,
      event.currentTarget,
    )
      ? null
      : (event.touches[0]?.clientX ?? null);
  };

  const handleTouchEnd = (event: ReactTouchEvent<HTMLDivElement>) => {
    const startX = touchStartX.current;
    touchStartX.current = null;
    if (startX === null) return;

    const endX = event.changedTouches[0]?.clientX;
    if (endX === undefined) return;
    const distance = endX - startX;
    if (Math.abs(distance) < 48) return;
    if (distance < 0) showIndex(activeIndex + 1);
    else showIndex(activeIndex - 1);
  };

  return (
    <div
      role="region"
      aria-label={ariaLabel}
      aria-roledescription="carousel"
      data-community-swipe-pager
      data-active-community-page={activeItem.id}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={() => {
        touchStartX.current = null;
      }}
      className={joinClassNames("touch-pan-y", className)}
    >
      <div
        {...headerProps}
        data-community-pager-header
        className={headerClassName}
      >
        <div
          role="group"
          aria-label={`${ariaLabel} controls`}
          data-community-pager-controls
          tabIndex={0}
          onKeyDown={handleKeyDown}
          className={joinClassNames(
            "flex min-h-10 items-center justify-between gap-3 rounded-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
            accentStyles.focus,
          )}
        >
          <p
            data-community-pager-label-layout={
              stackedLabel ? "stacked" : "inline"
            }
            className={joinClassNames(
              "min-w-0 text-xs font-bold uppercase tracking-[0.12em]",
              stackedLabel
                ? "flex flex-col items-start leading-4"
                : "truncate",
            )}
          >
            <span
              data-community-pager-label
              className={joinClassNames(
                accentStyles.label,
                stackedLabel && "block max-w-full truncate",
              )}
            >
              {activeItem.label}
            </span>
            {!stackedLabel && showPosition ? (
              <span aria-hidden="true" className="text-gray-600">
                {" · "}
              </span>
            ) : null}
            {showPosition ? (
              <span
                data-community-pager-position
                className={joinClassNames(
                  "text-[10px] font-semibold text-gray-500",
                  stackedLabel && "block",
                )}
              >
                {positionLabel} {activeIndex + 1} of {items.length}
              </span>
            ) : null}
          </p>
          <div className="flex shrink-0 items-center gap-1">
            {controlsAccessory || reserveControlsAccessorySpace ? (
              <div
                data-community-pager-accessory-slot
                className={joinClassNames(
                  "grid shrink-0 place-items-center",
                  reserveControlsAccessorySpace && "size-10",
                )}
              >
                {controlsAccessory}
              </div>
            ) : null}
            <div
              role="group"
              aria-label={progressLabel}
              className="flex items-center gap-0.5"
            >
              {items.map((item, index) => {
                const active = item.id === activeItem.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-label={`Show ${item.label}, ${index + 1} of ${items.length}`}
                    aria-controls={resolvedPanelId}
                    aria-current={active ? "step" : undefined}
                    onClick={() => onChange(item.id)}
                    data-community-pager-option={item.id}
                    className={joinClassNames(
                      "grid size-8 place-items-center rounded-full focus-visible:outline focus-visible:outline-2",
                      accentStyles.focus,
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={joinClassNames(
                        "size-3 rounded-full border transition",
                        active
                          ? accentStyles.activeDot
                          : "border-white/25 bg-white/5",
                      )}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {afterControls ? (
          <div className={afterControlsClassName}>{afterControls}</div>
        ) : null}
      </div>

      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {activeItem.label}, {activeIndex + 1} of {items.length}
      </p>
      <div
        key={activeItem.id}
        id={resolvedPanelId}
        role="group"
        aria-roledescription="slide"
        aria-label={`${activeItem.label}, ${activeIndex + 1} of ${items.length}`}
        data-community-pager-slide={activeItem.id}
        className={panelClassName}
      >
        {children}
      </div>
    </div>
  );
};

export default CommunitySwipePager;
