export type ContestPreviewArtworkKey =
  | "general_combo"
  | "sunday_pickem"
  | "td_psychic"
  | "fantasy-basketball"
  | "fantasy-football"
  | "fantasy-soccer"
  | "fantasy-hockey"
  | "fantasy-baseball"
  | "fantasy-multi-sport";

export type ContestPreviewVisualState = "open" | "locked" | "finalized";

export type ContestPreviewAccent = "league" | "arena";

export type ContestPreviewAction = {
  label: string;
  href: string;
  ariaLabel: string;
};

export type ContestPreviewResultSummary = {
  label: string;
  value: string;
  winners: {
    name: string;
    avatarUrl?: string;
  }[];
};

export type ContestPreviewTertiaryFact = {
  kind: "participation" | "slips";
  label: string;
  value: string;
};

export type ContestPreviewViewModel = {
  id: string;
  title: string;
  artwork: ContestPreviewArtworkKey;
  visualState: ContestPreviewVisualState;
  accent: ContestPreviewAccent;
  statusLabel: string;
  timingLabel: string;
  contestTypeLabel: string;
  mechanicLabel: string;
  secondaryMeta?: string;
  tertiaryFact?: ContestPreviewTertiaryFact;
  resultSummary?: ContestPreviewResultSummary;
  action: ContestPreviewAction;
};
