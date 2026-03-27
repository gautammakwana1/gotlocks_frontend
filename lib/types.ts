// /lib/types.ts
// Shared TypeScript interfaces for gotLocks mock frontend

export type Role = "member" | "commissioner";

// NOTE: `name` represents the in-app username chosen during onboarding.
// It is the canonical display identity across groups, chat, leaderboards, and feeds.
// Real names (e.g., from Google OAuth) should only help suggest a username, not replace it.
export type User = {
  id: string;
  name: string;
  email: string;
  password?: string;
  joined_at?: string;
  username?: string;
  userId?: string;
};

export type Group = {
  id?: string;
  name: string;
  sport_type: string;
  theme_variant?: string;
  description?: string;
  contest_style?: "infinite" | "custom" | "monthly";
  contest_end_date?: string | null;
  active_slip_id?: string;
  pick_deadline: string;
  result_deadline: string;
  invite_code?: string;
  created_by?: string;
  members?: [];
};

export type SlipStatus = "open" | "locked" | "grading" | "final";

export type Slip = {
  id: string;
  group_id: string;
  index: number;
  name: string;
  sports: string[];
  pick_limit: 1 | "unlimited";
  pick_deadline_at: string;
  results_deadline_at: string;
  status: SlipStatus;
  archived?: boolean;
  isGraded?: boolean;
};

export type PickResult = "pending" | "win" | "loss" | "void";

export type Pick = {
  id: string;
  slip_id: string;
  user_id: string;
  description: string;
  odds_bracket: string;
  difficultyLabel: "Safe" | "Balanced" | "Risky" | null;
  result: PickResult;
  points: number;
  updated_at?: string;
};

export type LeaderboardEntry = {
  group_id: string;
  slip_id: string;
  user_id: string;
  slip_points: number;
  cumulative_points: number;
};

export type LeaderboardArchiveRow = Readonly<{
  userId: string;
  username: string;
  rank: number;
  totalPoints: number;
  wins: number;
  losses: number;
  voids: number;
  topPickLabel: string;
  topPickPoints: number;
  topPickSlipName?: string;
}>;

// LeaderboardArchive is an immutable snapshot of the leaderboard table
// at the time this archive was created.
// - rows already contain all usernames, ranks, and points needed to render.
// - it MUST NOT depend on current group.members or state.users.
// This is designed to be safely persisted (e.g. as a jsonb snapshot in Supabase).
export type LeaderboardArchive = Readonly<{
  id: string;
  groupId: string;
  label: string;
  rows: ReadonlyArray<LeaderboardArchiveRow>;
  archivedSlipIds: ReadonlyArray<string>;
  createdAt: string;
}>;

export type ActivityAction =
  | "pick_created"
  | "pick_updated"
  | "pick_deleted"
  | "status_change"
  | "result_override"
  | "bonus_assigned"
  | "user_joined"
  | "system_voided";

export type ActivityFeedEvent = {
  id: string;
  group_id: string;
  actor_id: string;
  action: ActivityAction;
  meta?: Record<string, unknown>;
  created_at: string;
};

export type ChatMessage = {
  id: string;
  group_id: string;
  sender_id: string;
  text: string;
  type: "text" | "emoji";
  created_at: string;
};

export type SessionState = {
  userId: string;
};

export type ToastMessage = {
  id: string;
  type: "success" | "error" | "info";
  message: string;
};

export type DeleteGroupPayload = {
  groupId: string;
  actorId: string;
};

export type GradingSnapshot = Record<
  string,
  {
    result: "win" | "loss" | "void" | "pending";
    bonus: string;
  }
>;