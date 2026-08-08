/**
 * Desktop-only sizing shared by the structured Feed cards (League / Arena).
 * Keeping every token behind `lg:` means opting a surface in can never change
 * its phone or tablet layout.
 *
 * Global Social, the Profile feed and contest receipts deliberately render with
 * {@link FEED_DESKTOP_SIZING_OFF} so this port leaves them pixel-identical; pass
 * `desktopSizing` to opt a surface in.
 */
export const FEED_DESKTOP_SIZING = {
    row: "lg:py-5",
    header: "lg:w-full lg:flex-nowrap lg:px-8 lg:pb-4",
    authorTrigger: "lg:shrink-0 lg:gap-4 lg:pr-3",
    avatar:
        "lg:h-11 lg:w-11 lg:border lg:border-white/10 lg:text-base lg:shadow-[0_12px_28px_-18px_rgba(96,165,250,0.55)]",
    // The avatar wrapper grows to 44px at lg, so its contents have to grow with
    // it or the photo floats inside an oversized ring.
    avatarImage: "lg:h-full lg:w-full",
    avatarGlyph: "lg:h-7 lg:w-7",
    authorName: "lg:text-lg",
    collapsedOdds: "lg:text-sm",
    controlCluster: "lg:gap-3",
    collapseButton: "lg:h-8 lg:w-8 lg:text-xs",
    resultChip: "lg:px-3.5 lg:py-1.5 lg:text-xs",
    content: "lg:w-full lg:space-y-4 lg:px-8",
    contentRow:
        "lg:grid lg:grid-cols-[minmax(0,1fr)_clamp(220px,28%,280px)] lg:items-start lg:gap-4",
    metrics:
        "lg:order-none lg:col-start-2 lg:row-start-1 lg:grid lg:w-auto lg:grid-cols-1 lg:grid-rows-[88px_88px] lg:items-stretch lg:gap-3 lg:self-start",
    metricCard:
        "lg:flex lg:h-[88px] lg:min-h-[88px] lg:max-h-[88px] lg:flex-none lg:flex-col lg:justify-center lg:self-stretch lg:rounded-2xl lg:border-b-[3px] lg:border-b-white/15 lg:p-3 lg:shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_16px_36px_-28px_rgba(0,0,0,0.9)]",
    pointsCard: "lg:order-none lg:col-start-1 lg:row-start-1",
    confidenceCard: "lg:order-none lg:col-start-1 lg:row-start-2",
    metricLabel: "lg:text-xs",
    metricValue: "lg:mt-3 lg:break-words lg:text-lg lg:leading-tight",
    compactMetricValue: "lg:mt-2 lg:text-base lg:leading-tight",
    primaryCard:
        "lg:order-none lg:col-start-1 lg:row-start-1 lg:min-h-[188px] lg:min-w-0 lg:self-start lg:rounded-2xl lg:p-4",
    primaryEyebrow: "lg:text-xs",
    selectionRow: "lg:gap-4",
    selectionLead: "lg:gap-3",
    selectionDot: "lg:mt-2.5 lg:h-2 lg:w-2",
    categoryLabel: "lg:text-xs",
    pickCopy: "lg:mt-2 lg:text-base",
    metadata: "lg:mt-2 lg:text-sm",
    odds: "lg:text-base",
    comboList: "lg:space-y-3",
    footer: "lg:text-xs",
    reactionGroup: "lg:gap-2.5",
    reactionButton: "lg:h-8 lg:gap-2 lg:rounded-lg lg:px-3 lg:text-xs",
    reactionCount: "lg:text-xs",
    reactionIcon: "lg:h-4 lg:w-4",
    structuredArticle: "lg:px-8 lg:py-5",
    structuredBody: "lg:text-base lg:leading-7",
    structuredSelection: "lg:text-base",
} as const;

export type FeedDesktopSizing = Record<keyof typeof FEED_DESKTOP_SIZING, string>;

/** Every token blanked, so an opted-out surface emits the exact classes it did before. */
export const FEED_DESKTOP_SIZING_OFF: FeedDesktopSizing = Object.fromEntries(
    Object.keys(FEED_DESKTOP_SIZING).map((token) => [token, ""])
) as FeedDesktopSizing;

export const getFeedDesktopSizing = (enabled?: boolean): FeedDesktopSizing =>
    enabled ? FEED_DESKTOP_SIZING : FEED_DESKTOP_SIZING_OFF;
