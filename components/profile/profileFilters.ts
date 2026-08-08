export type ResultFilter = "all" | "win" | "loss" | "pending" | "void";
export type TypeFilter = "all" | "straight" | "combo";
export type ConfidenceFilter = "all" | "HIGH" | "MEDIUM" | "LOW";
export type SortOption =
    | "newest"
    | "oldest"
    | "highestXp"
    | "mostLegs";

export type ProfileFilterOption<T extends string> = {
    value: T;
    label: string;
};

export const RESULT_FILTER_OPTIONS: readonly ProfileFilterOption<ResultFilter>[] = [
    { value: "all", label: "All" },
    { value: "win", label: "Wins" },
    { value: "loss", label: "Losses" },
    { value: "pending", label: "Pending" },
    { value: "void", label: "Void" },
];

export const TYPE_FILTER_OPTIONS: readonly ProfileFilterOption<TypeFilter>[] = [
    { value: "all", label: "All" },
    { value: "straight", label: "Straight" },
    { value: "combo", label: "Combo" },
];

export const CONFIDENCE_FILTER_OPTIONS: readonly ProfileFilterOption<ConfidenceFilter>[] = [
    { value: "all", label: "All" },
    { value: "HIGH", label: "High" },
    { value: "MEDIUM", label: "Medium" },
    { value: "LOW", label: "Low" },
];

// "Most legs" is intentionally absent: the profile feed is sorted server-side by
// /pick/post-picks-by-user-id, whose sort_by enum has no most-legs mode. Offering it
// would render a "Sort: Most legs" chip over a list the backend still ordered by
// newest. Add it back here once the endpoint accepts it (see SORT_PARAM in ProfileView).
export const SORT_OPTIONS: readonly ProfileFilterOption<SortOption>[] = [
    { value: "newest", label: "Newest" },
    { value: "oldest", label: "Oldest" },
    { value: "highestXp", label: "Highest XP" },
];

export const PROFILE_FILTER_DEFAULTS = {
    result: "all",
    type: "all",
    confidence: "all",
    sort: "newest",
} as const satisfies {
    result: ResultFilter;
    type: TypeFilter;
    confidence: ConfidenceFilter;
    sort: SortOption;
};

export const getProfileFilterLabel = <T extends string>(
    options: readonly ProfileFilterOption<T>[],
    value: T
) => options.find((option) => option.value === value)?.label ?? value;
