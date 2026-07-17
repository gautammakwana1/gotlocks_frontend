/**
 * A deterministic legacy migration fixture kept outside the current mockData so
 * Pass 2 can demonstrate grandfathering without changing the existing UI seed.
 */
export const LEGACY_GRANDFATHERED_ARENA_FIXTURE = {
    leagues: [
        {
            id: "arena-legacy-1",
            name: "Sunday Crowd",
            description: "Existing pre-unlock Arena",
            inviteCode: "SUNDAY",
            createdBy: "user-owner",
            members: ["user-owner", "user-member"],
            groupType: "arena",
            hostingTier: "pro",
        },
    ],
} as const;

export const LEGACY_MIGRATION_MONTH_FIXTURE = {
    startsAt: "2026-07-01T00:00:00.000Z",
    endsAt: "2026-08-01T00:00:00.000Z",
} as const;
