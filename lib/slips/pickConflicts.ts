import { classifyLegPair, isExactDuplicate, type SlipLeg, type SlipTimeScope } from "@/lib/sgp/slipValidation";
import { BuiltPickPayload, Pick, PickSelectionMeta } from "../interfaces/interfaces";

export type SlipConflictType = "duplicate" | "contradiction" | "overlap";

export type SlipConflictSelection = {
    id: string;
    pickId: string;
    userId?: string;
    description: string;
    selection: PickSelectionMeta;
    sport?: string;
};

export type SlipConflictIssue = {
    key: string;
    type: SlipConflictType;
    left: SlipConflictSelection;
    right: SlipConflictSelection;
};

export type SlipConflictAnalysis = {
    duplicates: SlipConflictIssue[];
    warnings: SlipConflictIssue[];
};

const EMPTY_ANALYSIS: SlipConflictAnalysis = {
    duplicates: [],
    warnings: [],
};

const normalizeText = (value?: string | null) =>
    value?.trim().toLowerCase().replace(/\s+/g, " ") ?? "";

const normalizeSide = (side?: string | null) => {
    const token = normalizeText(side);
    if (token === "over") return "Over";
    if (token === "under") return "Under";
    if (token === "home") return "home";
    if (token === "away") return "away";
    if (token === "yes") return "yes";
    if (token === "no") return "no";
    return undefined;
};

const inferTimeScope = (market?: string | null): SlipTimeScope => {
    const token = normalizeText(market);
    if (token.startsWith("1st 3 innings")) return "first_three_innings";
    if (token.startsWith("1st 5 innings")) return "first_five_innings";
    if (token.startsWith("1st 7 innings")) return "first_seven_innings";
    if (token.startsWith("1st half")) return "first_half";
    if (token.startsWith("2nd half")) return "second_half";
    if (token.startsWith("1st quarter")) return "first_quarter";
    if (token.startsWith("2nd quarter")) return "second_quarter";
    if (token.startsWith("3rd quarter")) return "third_quarter";
    if (token.startsWith("4th quarter")) return "fourth_quarter";
    if (token.startsWith("1st period")) return "first_period";
    if (token.startsWith("2nd period")) return "second_period";
    if (token.startsWith("3rd period")) return "third_period";
    if (token.startsWith("1st inning")) return "first_inning";
    if (token.startsWith("2nd inning")) return "second_inning";
    if (token.startsWith("3rd inning")) return "third_inning";
    if (token.startsWith("4th inning")) return "fourth_inning";
    if (token.startsWith("5th inning")) return "fifth_inning";
    if (token.startsWith("6th inning")) return "sixth_inning";
    if (token.startsWith("7th inning")) return "seventh_inning";
    if (token.startsWith("8th inning")) return "eighth_inning";
    if (token.startsWith("9th inning")) return "ninth_inning";
    return "full_game";
};

const inferEntityType = (selection: PickSelectionMeta, market?: string | null): SlipLeg["entityType"] => {
    if (selection.playerId) return "player";
    if (selection.teamId) return "team";

    const marketToken = normalizeText(market);
    if (
        marketToken.includes("moneyline") ||
        marketToken.includes("spread") ||
        marketToken.includes("team total") ||
        marketToken.includes("puck line") ||
        marketToken.includes("run line") ||
        marketToken.includes("handicap")
    ) {
        return "team";
    }

    return "game";
};

const toSlipLeg = (source: SlipConflictSelection): SlipLeg | null => {
    const { selection } = source;
    const eventId = selection.gameId?.trim();
    if (!eventId) return null;

    const marketType = selection.market?.trim() || source.description.trim();
    if (!marketType) return null;

    const entityType = inferEntityType(selection, marketType);

    return {
        id: source.id,
        eventId,
        sport: selection.sport ?? source.sport ?? "",
        marketType,
        marketFamily: marketType,
        entityType,
        entityId:
            entityType === "player"
                ? selection.playerId
                : entityType === "team"
                    ? selection.teamId
                    : eventId,
        teamId: selection.teamId,
        playerId: selection.playerId,
        timeScope: inferTimeScope(marketType),
        side: normalizeSide(selection.side),
        selection: source.description,
        line:
            typeof selection.threshold === "number" && Number.isFinite(selection.threshold)
                ? selection.threshold
                : undefined,
        altLine:
            normalizeText(marketType).includes("alt ") &&
                typeof selection.threshold === "number" &&
                Number.isFinite(selection.threshold)
                ? selection.threshold
                : null,
    };
};

const buildSelectionSource = ({
    id,
    pickId,
    userId,
    description,
    selection,
    sport,
}: {
    id: string;
    pickId: string;
    userId?: string;
    description: string;
    selection?: PickSelectionMeta;
    sport?: string;
}): SlipConflictSelection | null => {
    if (!selection?.gameId) return null;

    return {
        id,
        pickId,
        userId,
        description,
        selection,
        sport,
    };
};

const flattenPickSelections = (pick: Pick): SlipConflictSelection[] => {
    if (pick.legs?.length) {
        return pick.legs
            .map((leg, index) =>
                buildSelectionSource({
                    id: `${pick.id}:leg:${index}`,
                    pickId: pick.id,
                    userId: pick.user_id,
                    description: leg.description,
                    selection: leg.selection,
                    sport: leg.selection?.sport ?? pick.sport,
                })
            )
            .filter((entry): entry is SlipConflictSelection => entry !== null);
    }

    const source = buildSelectionSource({
        id: pick.id,
        pickId: pick.id,
        userId: pick.user_id,
        description: pick.description,
        selection: pick.selection,
        sport: pick.sport,
    });

    return source ? [source] : [];
};

const flattenPayloadSelections = (payload: BuiltPickPayload): SlipConflictSelection[] => {
    if (payload.legs?.length) {
        return payload.legs
            .map((leg, index) =>
                buildSelectionSource({
                    id: `incoming:leg:${index}`,
                    pickId: "incoming",
                    description: leg.description,
                    selection: leg.selection,
                    sport: leg.selection?.sport ?? payload.sport,
                })
            )
            .filter((entry): entry is SlipConflictSelection => entry !== null);
    }

    const source = buildSelectionSource({
        id: "incoming",
        pickId: "incoming",
        description: payload.description,
        selection: payload.selection,
        sport: payload.sport,
    });

    return source ? [source] : [];
};

const buildConflictKey = (
    type: SlipConflictType,
    left: SlipConflictSelection,
    right: SlipConflictSelection
) => {
    const ids = [left.id, right.id].sort();
    return `${type}:${ids[0]}:${ids[1]}`;
};

const pushIssue = (
    bucket: Map<string, SlipConflictIssue>,
    issue: SlipConflictIssue
) => {
    if (bucket.has(issue.key)) return;
    bucket.set(issue.key, issue);
};

const classifyIssue = (
    left: SlipConflictSelection,
    right: SlipConflictSelection
): SlipConflictIssue | null => {
    const leftLeg = toSlipLeg(left);
    const rightLeg = toSlipLeg(right);
    if (!leftLeg || !rightLeg) return null;

    if (isExactDuplicate(leftLeg, rightLeg)) {
        return {
            key: buildConflictKey("duplicate", left, right),
            type: "duplicate",
            left,
            right,
        };
    }

    const decision = classifyLegPair(leftLeg, rightLeg);
    if (!decision) return null;

    if (
        decision.status === "blocked_conflict" ||
        decision.status === "blocked_impossible"
    ) {
        return {
            key: buildConflictKey("contradiction", left, right),
            type: "contradiction",
            left,
            right,
        };
    }

    if (
        decision.status === "collapsed_into_other_leg" ||
        decision.status === "redundant_non_incremental"
    ) {
        return {
            key: buildConflictKey("overlap", left, right),
            type: "overlap",
            left,
            right,
        };
    }

    return null;
};

export const analyzeSlipPicks = (picks: Pick[]): SlipConflictAnalysis => {
    const selections = picks.flatMap(flattenPickSelections);
    if (selections.length < 2) return EMPTY_ANALYSIS;

    const duplicates = new Map<string, SlipConflictIssue>();
    const warnings = new Map<string, SlipConflictIssue>();

    for (let index = 0; index < selections.length; index += 1) {
        const left = selections[index];
        if (!left) continue;

        for (let compareIndex = index + 1; compareIndex < selections.length; compareIndex += 1) {
            const right = selections[compareIndex];
            if (!right || left.pickId === right.pickId) continue;

            const issue = classifyIssue(left, right);
            if (!issue) continue;

            if (issue.type === "duplicate") {
                pushIssue(duplicates, issue);
            } else {
                pushIssue(warnings, issue);
            }
        }
    }

    return {
        duplicates: Array.from(duplicates.values()),
        warnings: Array.from(warnings.values()),
    };
};

export const analyzeSlipPayloadAgainstPicks = (
    picks: Pick[],
    payload: BuiltPickPayload,
    options?: { ignorePickId?: string }
): SlipConflictAnalysis => {
    const incomingSelections = flattenPayloadSelections(payload);
    if (incomingSelections.length === 0) return EMPTY_ANALYSIS;

    const existingSelections = picks
        .filter((pick) => pick.id !== options?.ignorePickId)
        .flatMap(flattenPickSelections);

    if (existingSelections.length === 0) return EMPTY_ANALYSIS;

    const duplicates = new Map<string, SlipConflictIssue>();
    const warnings = new Map<string, SlipConflictIssue>();

    incomingSelections.forEach((incoming) => {
        existingSelections.forEach((existing) => {
            const issue = classifyIssue(incoming, existing);
            if (!issue) return;

            if (issue.type === "duplicate") {
                pushIssue(duplicates, issue);
            } else {
                pushIssue(warnings, issue);
            }
        });
    });

    return {
        duplicates: Array.from(duplicates.values()),
        warnings: Array.from(warnings.values()),
    };
};

export const getSlipConflictMessage = (type: SlipConflictType) => {
    if (type === "duplicate") {
        return "This exact pick is already on the slip.";
    }
    if (type === "contradiction") {
        return "This pick contradicts another pick already on the slip.";
    }
    return "This pick overlaps with another pick already on the slip.";
};

export const getSlipConflictMessages = (analysis: SlipConflictAnalysis) => {
    const orderedTypes: SlipConflictType[] = [
        ...analysis.duplicates.map((issue) => issue.type),
        ...analysis.warnings.map((issue) => issue.type),
    ];

    return Array.from(
        new Set(orderedTypes.map((type) => getSlipConflictMessage(type))).values()
    );
};

export const getSlipConflictWarningMessages = (analysis: SlipConflictAnalysis) =>
    Array.from(
        new Set(analysis.warnings.map((issue) => getSlipConflictMessage(issue.type))).values()
    );

export const hasSlipConflicts = (analysis: SlipConflictAnalysis) =>
    analysis.duplicates.length > 0 || analysis.warnings.length > 0;
