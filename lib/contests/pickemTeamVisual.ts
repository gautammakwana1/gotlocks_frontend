/* ----------------------------------------------------------------------------
 * Sunday Pick'em team colours, ported from the MVP's
 * lib/contests/pickemTeamVisual.ts.
 *
 * The Pick'em card is the one entry surface that renders a TEAM rather than a
 * market row, so it needs a colour per club. Resolved from the canonical
 * schedule abbreviation the odds feed supplies — never from the team name, which
 * the feed spells differently across competitions.
 *
 * ONE DELIBERATE DIVERGENCE from the MVP: its fallback abbreviation is the
 * literal "NFL". This repo can run a Pick'em slate on another league while the
 * NFL season is out of range, so an unknown club falls back to a neutral dash
 * instead of mislabelling an MLB card as NFL.
 * -------------------------------------------------------------------------- */

export type PickemTeamVisual = {
    abbreviation: string;
    primary: string;
    secondary: string;
};

export type PickemTeamNameParts = {
    city: string;
    nickname: string;
};

/**
 * "Kansas City Chiefs" -> { city: "Kansas City", nickname: "Chiefs" }.
 *
 * Splits on the LAST word rather than the first space, which is what keeps
 * multiword locations ("New York", "Tampa Bay", "Los Angeles") intact. A
 * one-word name is all nickname, so the city line renders empty rather than
 * stealing the club's only identifying word.
 */
export const splitPickemTeamName = (fullName: string): PickemTeamNameParts => {
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    if (parts.length <= 1) {
        return { city: "", nickname: parts[0] ?? "" };
    }
    const nickname = parts.pop() ?? "";
    return { city: parts.join(" "), nickname };
};

const withHexAlpha = (color: string, alpha: string) =>
    /^#[0-9a-f]{6}$/i.test(color) ? `${color}${alpha}` : color;

/** The stronger flat primary tone used by the clean two-colour card treatment. */
export const getPickemTeamCardTint = (visual: Pick<PickemTeamVisual, "primary">) =>
    withHexAlpha(visual.primary, "3D");

type PickemTeamVisualInput = {
    abbreviation?: string;
    /**
     * The full club name, when no abbreviation is to hand.
     *
     * Needed because an ACCEPTED entry carries only what the server stored:
     * `legs[].description` and `selection.side` are the team NAME, and no
     * abbreviation is persisted anywhere on the pick. The MVP resolves this
     * through its bundled team catalog; this repo has none, so the name is
     * matched against the table below instead.
     */
    name?: string;
};

const NFL_TEAM_VISUALS = {
    ARI: { primary: "#97233F", secondary: "#000000" },
    ATL: { primary: "#A71930", secondary: "#000000" },
    BAL: { primary: "#241773", secondary: "#9E7C0C" },
    BUF: { primary: "#00338D", secondary: "#C60C30" },
    CAR: { primary: "#0085CA", secondary: "#101820" },
    CHI: { primary: "#0B162A", secondary: "#C83803" },
    CIN: { primary: "#FB4F14", secondary: "#000000" },
    CLE: { primary: "#311D00", secondary: "#FF3C00" },
    DAL: { primary: "#041E42", secondary: "#869397" },
    DEN: { primary: "#FB4F14", secondary: "#002244" },
    DET: { primary: "#0076B6", secondary: "#B0B7BC" },
    GB: { primary: "#203731", secondary: "#FFB612" },
    HOU: { primary: "#03202F", secondary: "#A71930" },
    IND: { primary: "#002C5F", secondary: "#A2AAAD" },
    JAX: { primary: "#006778", secondary: "#D7A22A" },
    KC: { primary: "#E31837", secondary: "#FFB81C" },
    LV: { primary: "#000000", secondary: "#A5ACAF" },
    LAC: { primary: "#0080C6", secondary: "#FFC20E" },
    LAR: { primary: "#003594", secondary: "#FFA300" },
    MIA: { primary: "#008E97", secondary: "#FC4C02" },
    MIN: { primary: "#4F2683", secondary: "#FFC62F" },
    NE: { primary: "#002244", secondary: "#C60C30" },
    NO: { primary: "#101820", secondary: "#D3BC8D" },
    NYG: { primary: "#0B2265", secondary: "#A71930" },
    NYJ: { primary: "#125740", secondary: "#000000" },
    PHI: { primary: "#004C54", secondary: "#A5ACAF" },
    PIT: { primary: "#101820", secondary: "#FFB612" },
    SEA: { primary: "#002244", secondary: "#69BE28" },
    SF: { primary: "#AA0000", secondary: "#B3995D" },
    TB: { primary: "#D50A0A", secondary: "#34302B" },
    TEN: { primary: "#0C2340", secondary: "#4B92DB" },
    WAS: { primary: "#5A1414", secondary: "#FFB612" },
} as const;

type NflTeamAbbreviation = keyof typeof NFL_TEAM_VISUALS;

const NFL_ABBREVIATION_ALIASES: Record<string, NflTeamAbbreviation> = {
    JAC: "JAX",
    WSH: "WAS",
};

const FALLBACK_COLORS = {
    primary: "#1F2937",
    secondary: "#F8FAFC",
} as const;

/**
 * Full club name → abbreviation. Keyed on the LAST word (the nickname), which is
 * unique across the league and survives the ways the feeds differ on the city
 * ("NY Jets" / "New York Jets", "LA Chargers" / "Los Angeles Chargers").
 *
 * The two Giants/Jets and the three Los Angeles clubs are all distinct
 * nicknames, so there is no collision to disambiguate.
 */
const NFL_ABBREVIATION_BY_NICKNAME: Record<string, NflTeamAbbreviation> = {
    CARDINALS: "ARI", FALCONS: "ATL", RAVENS: "BAL", BILLS: "BUF",
    PANTHERS: "CAR", BEARS: "CHI", BENGALS: "CIN", BROWNS: "CLE",
    COWBOYS: "DAL", BRONCOS: "DEN", LIONS: "DET", PACKERS: "GB",
    TEXANS: "HOU", COLTS: "IND", JAGUARS: "JAX", CHIEFS: "KC",
    RAIDERS: "LV", CHARGERS: "LAC", RAMS: "LAR", DOLPHINS: "MIA",
    VIKINGS: "MIN", PATRIOTS: "NE", SAINTS: "NO", GIANTS: "NYG",
    JETS: "NYJ", EAGLES: "PHI", STEELERS: "PIT", SEAHAWKS: "SEA",
    "49ERS": "SF", BUCCANEERS: "TB", TITANS: "TEN", COMMANDERS: "WAS",
};

const normalizeAbbreviation = (value: string | undefined) =>
    value?.trim().toUpperCase().replace(/[^A-Z0-9]/g, "") ?? "";

/** The abbreviation a full club name resolves to, or null. */
const abbreviationFromName = (name: string | undefined): NflTeamAbbreviation | null => {
    const parts = name?.trim().toUpperCase().split(/\s+/).filter(Boolean) ?? [];
    if (!parts.length) return null;
    const nickname = parts[parts.length - 1].replace(/[^A-Z0-9]/g, "");
    return NFL_ABBREVIATION_BY_NICKNAME[nickname] ?? null;
};

const knownAbbreviation = (value: string | undefined): NflTeamAbbreviation | null => {
    const normalized = normalizeAbbreviation(value);
    if (normalized in NFL_TEAM_VISUALS) {
        return normalized as NflTeamAbbreviation;
    }
    return NFL_ABBREVIATION_ALIASES[normalized] ?? null;
};

const fallbackAbbreviation = ({ abbreviation, name }: PickemTeamVisualInput) => {
    const supplied = normalizeAbbreviation(abbreviation);
    if (supplied) return supplied.slice(0, 4);
    // Initials of an unknown club read better than a slice of its nickname:
    // "Yokohama BayStars" becomes YB, not YOKO.
    const initials = (name ?? "")
        .trim()
        .split(/\s+/)
        .map((part) => part[0] ?? "")
        .join("")
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, 4);
    return initials || "—";
};

/**
 * Resolves Pick'em card colours from the canonical schedule abbreviation. A club
 * outside the table above still renders — in the neutral slate pair — so a
 * non-NFL slate is legible rather than broken.
 */
export const getPickemTeamVisual = (input: PickemTeamVisualInput): PickemTeamVisual => {
    const abbreviation =
        knownAbbreviation(input.abbreviation) ?? abbreviationFromName(input.name);

    if (!abbreviation) {
        return {
            abbreviation: fallbackAbbreviation(input),
            ...FALLBACK_COLORS,
        };
    }

    return {
        abbreviation,
        ...NFL_TEAM_VISUALS[abbreviation],
    };
};
