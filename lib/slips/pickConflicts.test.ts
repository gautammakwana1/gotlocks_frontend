import { describe, expect, it } from "vitest";
import {
    analyzeSlipPayloadAgainstPicks,
    analyzeSlipPicks,
    getSlipConflictMessages,
    getSlipConflictWarningMessages,
} from "./pickConflicts";
import { BuiltPickPayload, Pick, PickSelectionMeta, PickType } from "../interfaces/interfaces";

const makeSelection = (
    overrides: Partial<PickSelectionMeta> = {}
): PickSelectionMeta => ({
    sport: overrides.sport ?? "NBA",
    scope: overrides.scope ?? "PLAYER_PROP",
    market: overrides.market ?? "Player Points",
    gameId: overrides.gameId ?? "game-1",
    gameStartTime: overrides.gameStartTime ?? "2026-04-15T23:00:00.000Z",
    matchup: overrides.matchup ?? "CHA @ NYK",
    teamId: overrides.teamId ?? "cha",
    playerId: overrides.playerId ?? "lamelo",
    side: overrides.side ?? "OVER",
    threshold: overrides.threshold ?? 24.5,
});

const makePick = (overrides: Partial<Pick> = {}): Pick => ({
    id: overrides.id ?? "pick-1",
    slip_id: overrides.slip_id ?? "slip-1",
    user_id: overrides.user_id ?? "user-1",
    sport: overrides.sport ?? "NBA",
    description: overrides.description ?? "LaMelo Ball - Over 24.5 Points",
    odds_bracket: overrides.odds_bracket ?? "-110",
    difficulty_label: overrides.difficulty_label ?? null,
    build_mode: overrides.build_mode,
    pick_type: overrides.pick_type ?? PickType.GROUP,
    result: overrides.result ?? "pending",
    points: overrides.points ?? 0,
    awardedPoints: overrides.awardedPoints,
    confidence: overrides.confidence ?? undefined,
    created_at: overrides.created_at ?? "2026-04-15T20:00:00.000Z",
    is_combo: overrides.is_combo ?? false,
    legs: overrides.legs,
    xp_awarded: overrides.xp_awarded,
    updated_at: overrides.updated_at ?? "2026-04-15T20:00:00.000Z",
    selection: overrides.selection ?? makeSelection(),
    source_tab: overrides.source_tab ?? "Player Props",
});

const makePayload = (
    overrides: Partial<BuiltPickPayload> = {}
): BuiltPickPayload => ({
    sport: overrides.sport ?? "NBA",
    description: overrides.description ?? "LaMelo Ball - Over 24.5 Points",
    odds_bracket: overrides.odds_bracket ?? "-110",
    difficulty_label: overrides.difficulty_label ?? null,
    buildMode: overrides.buildMode ?? "ODDS",
    points: overrides.points,
    selection: overrides.selection ?? makeSelection(),
    sourceTab: overrides.sourceTab ?? "Player Props",
    confidence: overrides.confidence ?? null,
    created_at: overrides.created_at,
    isCombo: overrides.isCombo ?? false,
    legs: overrides.legs,
});

describe("analyzeSlipPayloadAgainstPicks", () => {
    it("flags exact duplicate picks as blocking duplicates", () => {
        const existing = makePick();
        const incoming = makePayload();

        const analysis = analyzeSlipPayloadAgainstPicks([existing], incoming);

        expect(analysis.duplicates).toHaveLength(1);
        expect(analysis.warnings).toHaveLength(0);
        expect(getSlipConflictMessages(analysis)).toContain(
            "This exact pick is already on the slip."
        );
    });

    it("warns on contradictory picks in the same slip", () => {
        const existing = makePick();
        const incoming = makePayload({
            description: "LaMelo Ball - Under 24.5 Points",
            selection: makeSelection({ side: "UNDER" }),
        });

        const analysis = analyzeSlipPayloadAgainstPicks([existing], incoming);

        expect(analysis.duplicates).toHaveLength(0);
        expect(analysis.warnings).toHaveLength(1);
        expect(analysis.warnings[0]?.type).toBe("contradiction");
    });

    it("warns on overlapping ladder picks in the same slip", () => {
        const existing = makePick();
        const incoming = makePayload({
            description: "LaMelo Ball - Over 29.5 Alt Player Points",
            selection: makeSelection({
                market: "Alt Player Points",
                threshold: 29.5,
            }),
        });

        const analysis = analyzeSlipPayloadAgainstPicks([existing], incoming);

        expect(analysis.duplicates).toHaveLength(0);
        expect(analysis.warnings).toHaveLength(1);
        expect(analysis.warnings[0]?.type).toBe("overlap");
    });

    it("returns warning-only messages separately from duplicate blocks", () => {
        const duplicateAnalysis = analyzeSlipPayloadAgainstPicks([makePick()], makePayload());
        const warningAnalysis = analyzeSlipPayloadAgainstPicks(
            [makePick()],
            makePayload({
                description: "LaMelo Ball - Under 24.5 Points",
                selection: makeSelection({ side: "UNDER" }),
            })
        );

        expect(getSlipConflictWarningMessages(duplicateAnalysis)).toEqual([]);
        expect(getSlipConflictWarningMessages(warningAnalysis)).toEqual([
            "This pick contradicts another pick already on the slip.",
        ]);
    });
});

describe("analyzeSlipPicks", () => {
    it("finds conflicts already living on a slip", () => {
        const picks = [
            makePick({
                id: "over",
                user_id: "user-1",
            }),
            makePick({
                id: "under",
                user_id: "user-2",
                description: "LaMelo Ball - Under 24.5 Points",
                selection: makeSelection({ side: "UNDER" }),
            }),
        ];

        const analysis = analyzeSlipPicks(picks);

        expect(analysis.duplicates).toHaveLength(0);
        expect(analysis.warnings).toHaveLength(1);
        expect(analysis.warnings[0]?.type).toBe("contradiction");
    });
});
