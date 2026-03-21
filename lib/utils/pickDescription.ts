import { formatDateTime } from "@/lib/utils/date";

export const EM_DASH = "\u2014";
export const PICK_DESCRIPTION_SEPARATOR = ` ${EM_DASH} `;

const LEGACY_PICK_DESCRIPTION_SEPARATOR = " - ";
const MATCHUP_PATTERN = /@|\bvs\.?\b|\bv\.?\b/i;
const MATCHUP_CAPTURE_PATTERN =
    /(.+?(?:@|\bvs\.?\b|\bv\.?\b).+?)(?=\s[—-]\s|$)/i;

const splitStructuredPickDescription = (description: string) => {
    for (const separator of [PICK_DESCRIPTION_SEPARATOR, LEGACY_PICK_DESCRIPTION_SEPARATOR]) {
        const [lead, ...rest] = description.split(separator);
        const candidate = lead?.trim();
        if (candidate && MATCHUP_PATTERN.test(candidate) && rest.length > 0) {
            return {
                matchup: candidate,
                pickLine: rest.join(separator).trim(),
            };
        }
    }
    return null;
};

export const extractPickLine = (description: string) =>
    splitStructuredPickDescription(description)?.pickLine ?? description;

export const extractMatchup = (
    description?: string | null,
    fallbackMatchup?: string | null
) => {
    if (!description) return fallbackMatchup ?? null;
    const structured = splitStructuredPickDescription(description);
    if (structured) return structured.matchup;
    const match = description.match(MATCHUP_CAPTURE_PATTERN);
    return match ? match[1].trim() : (fallbackMatchup ?? null);
};

export const parsePickDescription = (
    description?: string | null,
    fallbackMatchup?: string | null
) => {
    const normalized = description?.trim() ?? "";
    if (!normalized) {
        return {
            pickLine: "",
            matchup: fallbackMatchup ?? null,
        };
    }
    const structured = splitStructuredPickDescription(normalized);
    if (structured) return structured;
    return {
        pickLine: normalized,
        matchup: extractMatchup(normalized, fallbackMatchup),
    };
};

export const withMatchupDescription = (matchup: string, detail: string) =>
    `${matchup}${PICK_DESCRIPTION_SEPARATOR}${detail.trim()}`;

export const formatPickMetaLine = ({
    description,
    matchup,
    gameStartTime,
}: {
    description?: string | null;
    matchup?: string | null;
    gameStartTime?: string | null;
}) => {
    const matchupCopy = extractMatchup(description, matchup);
    const gameTimeCopy = formatDateTime(gameStartTime);
    const parts = [matchupCopy, gameTimeCopy !== EM_DASH ? gameTimeCopy : null].filter(Boolean);
    return parts.length > 0 ? parts.join(" \u00b7 ") : null;
};
