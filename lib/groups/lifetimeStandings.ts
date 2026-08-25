import type {
    GroupLifetimeStandingRow,
    LifetimeStandingsType,
} from "@/lib/interfaces/interfaces";

/* ============================================================================
 * LIFETIME STANDINGS — the board vocabulary shared by the Arena and the League.
 *
 * These titles and labels also come back on every response as
 * `board.title` / `board.points_label`, and the strings are identical. They are
 * duplicated here ONLY so the title bar and the points column are already
 * correct on the first paint, before any response exists — an empty title bar
 * that fills in a moment later reads as a bug. Once data has landed, prefer the
 * response's own copy so a server-side wording change needs no client release.
 *
 * Mirrors the backend's src/utils/constant.ts LIFETIME_STANDINGS_BOARDS. The
 * same board is "Arena Points" on an Arena and "League Points" on a League, so
 * the label is a function of (group type, board type) and not of type alone.
 * ========================================================================== */

export type LifetimeStandingsBoardMeta = {
    title: string;
    points_label: string;
};

export const LIFETIME_STANDINGS_BOARDS = {
    arena: {
        feed: {
            title: "Feed Contest Lifetime Standings",
            points_label: "Arena Points",
        },
    },
    league: {
        feed: {
            title: "Feed Contest Lifetime Standings",
            points_label: "League Points",
        },
        fantasy: {
            title: "Fantasy Contest Lifetime Standings",
            points_label: "Fantasy Points",
        },
    },
} as const;

/** An Arena has no Fantasy contests, so `fantasy` there is a 400, not a board. */
export const getLifetimeStandingsBoardMeta = (
    groupKind: "arena" | "league",
    type: LifetimeStandingsType
): LifetimeStandingsBoardMeta =>
    groupKind === "arena"
        ? LIFETIME_STANDINGS_BOARDS.arena.feed
        : LIFETIME_STANDINGS_BOARDS.league[type];

/**
 * The word the Arena board's role chip prints.
 *
 * The API answers this codebase's `group_members` vocabulary — commissioner |
 * manager | member — while the MVP's chip says "owner". `is_owner` is
 * `groups.created_by`, which is not a role and has no membership row, so it is
 * checked first: a founder who somehow carries a plain member row is still the
 * owner. Returns null for an ordinary member, which renders no chip at all.
 */
export const lifetimeStandingRoleChip = (
    row: Pick<GroupLifetimeStandingRow, "role" | "is_owner">
): "owner" | "manager" | null =>
    row.is_owner || row.role === "commissioner"
        ? "owner"
        : row.role === "manager"
            ? "manager"
            : null;

/**
 * The MVP hides staff from the Arena board until they have actually scored
 * (`role === "member" || componentCount > 0`, MVP ArenaDashboard.tsx:301-308).
 * `contest_count` — contests this member has banked from — is the API's
 * equivalent of that count.
 *
 * Filtering AFTER the server has ranked leaves gaps in the visible sequence
 * (#1, #3, #4). That is not a defect to paper over: the MVP filters post-rank
 * and has exactly the same artifact, and re-numbering here would invent ranks
 * the server never assigned. If the RPC already excludes staff, this is a
 * harmless no-op.
 */
export const filterArenaLifetimeStandings = (
    rows: readonly GroupLifetimeStandingRow[]
): GroupLifetimeStandingRow[] =>
    rows.filter(
        (row) => lifetimeStandingRoleChip(row) === null || row.contest_count > 0
    );
