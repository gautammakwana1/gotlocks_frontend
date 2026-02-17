// /lib/utils/points.ts
// Helpers for odds bracket scoring logic

import { LOSS_PICK_POINTS, ODDS_BRACKETS } from "../constants";

export type PickOutcome = "win" | "loss" | "void";

export const calculatePoints = (oddsLabel: string, outcome: PickOutcome) => {
  if (outcome === "void") return 0;
  if (outcome === "loss") return LOSS_PICK_POINTS;

  const bucket = ODDS_BRACKETS.find((bracket) => bracket.label === oddsLabel);
  return bucket ? bucket.points : 0;
};

export const getBracketCopy = (label: string) => {
  const bucket = ODDS_BRACKETS.find((bracket) => bracket.label === label);
  return bucket
    ? `${bucket.label} → ${bucket.points} pts`
    : `${label} → 0 pts`;
};
