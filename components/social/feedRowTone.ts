/**
 * One zebra rule for every feed surface, so a list of single-item `FeedList`s
 * (structured Feed cards) stripes identically to one multi-item `FeedList`.
 */
export const FEED_ZEBRA_ROW_CLASS_NAME = "bg-white/[0.025]";

export const getFeedZebraRowClassName = (index: number) =>
    index % 2 === 1 ? FEED_ZEBRA_ROW_CLASS_NAME : undefined;
