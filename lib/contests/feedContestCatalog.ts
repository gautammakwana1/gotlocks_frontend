// /lib/contests/feedContestCatalog.ts
// Shared slate vocabulary for the Feed contest create wizard.
//
// The MVP builds its slate from a bundled mock catalog (lib/contests/gameCatalog.ts).
// Here the same shape is produced from the live `schedules-for-all-tz` responses,
// so every constant below mirrors the backend's arenaConstant.ts rather than the
// mock — the endpoint is the authority on what it will accept.

import type {
    LeagueMatchupCount,
    LeagueScheduleEvent,
} from "@/lib/interfaces/interfaces";
import { isValidIanaTimeZone } from "@/lib/scoring/dailyXp";

/** FEED_CONTEST_SUPPORTED_SPORTS. NCAAF is deliberately absent. */
export const FEED_CONTEST_SPORTS = [
    "NFL",
    "NBA",
    "NCAAB",
    "NHL",
    "MLB",
    "Soccer",
] as const;

export type FeedContestSport = (typeof FEED_CONTEST_SPORTS)[number];

/** FEED_CONTEST_MIN_LEGS / FEED_CONTEST_MAX_LEGS. */
/**
 * How many places a contest may pay. THREE is the floor, not one: every
 * placement surface — the podium, the Winners block, the achievements — is built
 * around a top three, and a one-place contest would render a podium with two
 * empty steps. The MVP pins the same pair.
 */
export const FEED_CONTEST_MIN_WINNING_PLACES = 3;
export const FEED_CONTEST_MAX_WINNING_PLACES = 5;

/** Snaps a typed value back into range on blur, as the MVP's spinner does. */
export const clampFeedContestWinningPlaces = (value: number) =>
    Math.min(
        FEED_CONTEST_MAX_WINNING_PLACES,
        Math.max(
            FEED_CONTEST_MIN_WINNING_PLACES,
            Math.trunc(value) || FEED_CONTEST_MIN_WINNING_PLACES
        )
    );

export const FEED_CONTEST_MIN_LEGS = 2;
export const FEED_CONTEST_MAX_LEGS = 8;

/** FEED_CONTEST_LOCK_LEAD_MS — entries lock this far before the earliest kickoff. */
export const FEED_CONTEST_LOCK_LEAD_MS = 5 * 60 * 1000;

/**
 * FEED_CONTEST_AWARD_REVERSE_REASON_MAX, mirrored from the server so the Award
 * corrections form can refuse an over-long audit reason before it costs a round
 * trip. Pre-checked rather than capped with `maxLength`, which would silently
 * truncate what the owner wrote.
 */
export const FEED_CONTEST_AWARD_REVERSE_REASON_MAX = 280;

/** SUNDAY_PICKEM_MIN_GAMES. */
export const SUNDAY_PICKEM_MIN_GAMES = 2;

/**
 * How many calendar days a General Combo slate may cover, counting its start
 * date — a 3-day slate ends two days after it begins.
 */
export const MAX_SLATE_DAYS = 3;

/** How far past today the organizer's slate calendar reaches. */
export const SLATE_HORIZON_DAYS = 14;

/** SUNDAY_PICKEM_KICKOFF_WINDOW. */
export type SundayKickoffWindow = "international" | "early" | "late" | "sunday_night";

export type SundayPickemSlateMode =
    | "early_window"
    | "late_window"
    | "full_sunday"
    /**
     * "Organizer selected" — every window is offered and the organizer unchecks
     * whatever they do not want, rather than the shortcut picking for them. The
     * backend maps it to the same window set as `full_sunday`
     * (SUNDAY_PICKEM_WINDOWS_BY_SLATE_MODE, arenaConstant.ts:115); what differs
     * is only what the STORED mode says about how the slate was arrived at.
     */
    | "organizer_selected";

/**
 * The `schedules-for-all-tz` route behind each contest sport. Soccer is three
 * competitions behind one chip; every other sport is exactly one call. The
 * wizard reads the UNPRICED feed on purpose — it needs kickoff and teams, not
 * markets, and one range call replaces the six priced feeds it used to pull.
 */
export const FEED_CONTEST_LEAGUE_FEEDS: Readonly<
    Record<FeedContestSport, readonly { path: string; competition: string }[]>
> = {
    NFL: [{ path: "/leagues/nfl/schedules-for-all-tz", competition: "NFL" }],
    NBA: [{ path: "/leagues/nba/schedules-for-all-tz", competition: "NBA" }],
    NCAAB: [{ path: "/leagues/ncaab/schedules-for-all-tz", competition: "NCAAB" }],
    NHL: [{ path: "/leagues/nhl/schedules-for-all-tz", competition: "NHL" }],
    MLB: [{ path: "/leagues/mlb/schedules-for-all-tz", competition: "MLB" }],
    Soccer: [
        {
            path: "/leagues/soccer/england-premier-league-schedules-for-all-tz",
            competition: "Premier League",
        },
        {
            path: "/leagues/soccer/germany-bundesliga-schedules-for-all-tz",
            competition: "Bundesliga",
        },
        {
            path: "/leagues/soccer/fifa-world-cup-schedules-for-all-tz",
            competition: "FIFA World Cup",
        },
    ],
};

/**
 * Identifies one (sports, dates, zone) slate request; order-insensitive on sports.
 *
 * The ZONE is part of the identity, not decoration: the endpoint files each
 * kickoff under a calendar day in the zone `X-Timezone` names, so the same
 * sports over the same dates return DIFFERENT games in Eastern than in the
 * browser's zone. Leaving it out would let a Sunday Pick'em slate be served the
 * General Combo answer that happened to be cached under the same key.
 */
export const feedContestScheduleRequestKey = (
    sports: readonly string[],
    date: string,
    timeZone = ""
) => `${[...sports].sort().join(",")}|${date}|${timeZone}`;

/** One selectable row of the slate picker. */
export type ContestGameOption = {
    id: string;
    sport: FeedContestSport;
    competition: string;
    label: string;
    homeTeam: string;
    awayTeam: string;
    /** Feed-supplied short codes (WSH, PHI) — never derived from the name. */
    homeAbbr: string;
    awayAbbr: string;
    /**
     * The feed's own team ids, carried through UNTOUCHED.
     *
     * TD Psychic only, and required rather than decorative: its create endpoint
     * refuses a slate whose `eligible_games_json` omits distinct
     * `home_team_id`/`away_team_id` (feed.helper.ts:510), because its entry path
     * has to prove a picked player belongs to one of the two teams in the game.
     * Every other template ignores them.
     */
    homeTeamId: string;
    awayTeamId: string;
    gameStartsAt: string;
    /** NFL Sundays only; null for every other kickoff. */
    sundayWindow: SundayKickoffWindow | null;
    /** Eastern calendar day of the kickoff — the Sunday a Pick'em card belongs to. */
    scheduleDateKey: string;
};

// Sunday windows are read on the NFL league clock (Eastern), never the viewer's
// zone, so a late-window slate means the same games for everyone.
/**
 * The NFL league clock the schedule feed files kickoffs under. Exported because
 * a saved Pick'em draft's Sunday has to be recovered in THIS zone, not the
 * organizer's: `sundayDateOptions` is built from `ContestGameOption.scheduleDateKey`,
 * which is always Eastern.
 */
export const SCHEDULE_TIME_ZONE = "America/New_York";

const schedulePartsFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: SCHEDULE_TIME_ZONE,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    hourCycle: "h23",
});

export const scheduleParts = (gameStartsAt: string) => {
    const instant = new Date(gameStartsAt);
    if (Number.isNaN(instant.getTime())) {
        return { weekday: "", hour: Number.NaN, dateKey: "" };
    }
    const parts = schedulePartsFormatter.formatToParts(instant);
    const value = (type: Intl.DateTimeFormatPartTypes) =>
        parts.find((part) => part.type === type)?.value ?? "";
    return {
        weekday: value("weekday"),
        hour: Number(value("hour")),
        dateKey: `${value("year")}-${value("month")}-${value("day")}`,
    };
};

// The backend's kickoffWindowFor, in Eastern time: pre-13:00 international,
// 13:00-15:59 early, 16:00-19:59 late, 20:00+ Sunday night.
const kickoffWindowFor = (hour: number): SundayKickoffWindow => {
    if (hour < 13) return "international";
    if (hour < 16) return "early";
    if (hour < 20) return "late";
    return "sunday_night";
};

/**
 * The feed's own code wins; the fallback is the MVP's rule, not initials.
 *
 * Both produce three letters, but from different places: initials give "Kansas
 * City Chiefs" → KCC, where the MVP's first-three-alphanumerics gives KAN — the
 * form a reader actually recognises, and the one the slate browser's team badge
 * is sized for. Only reached for a competition whose feed omits the code.
 */
const teamAbbreviation = (team: { name: string; abbreviation?: string }) => {
    const abbreviation = team.abbreviation?.trim();
    if (abbreviation) return abbreviation.toUpperCase();
    return team.name.replace(/[^a-z0-9]/gi, "").slice(0, 3).toUpperCase() || "—";
};

export const toContestGameOption = (
    event: LeagueScheduleEvent,
    sport: FeedContestSport,
    competition: string
): ContestGameOption => {
    const { weekday, hour, dateKey } = scheduleParts(event.date);
    return {
        id: event.id,
        sport,
        competition,
        label: `${event.teams.away.name} @ ${event.teams.home.name}`,
        homeTeam: event.teams.home.name,
        awayTeam: event.teams.away.name,
        homeAbbr: teamAbbreviation(event.teams.home),
        awayAbbr: teamAbbreviation(event.teams.away),
        homeTeamId: event.teams.home.id ?? '',
        awayTeamId: event.teams.away.id ?? '',
        gameStartsAt: event.date,
        sundayWindow:
            sport !== "NFL" || weekday !== "Sun" || !Number.isFinite(hour)
                ? null
                : kickoffWindowFor(hour),
        scheduleDateKey: dateKey,
    };
};

/**
 * The backend's `LEAGUES` ids, mapped onto the six contest sports. Three soccer
 * competitions collapse into one `Soccer` chip, exactly as the odds catalog
 * merges them. NCAAF is in neither list.
 */
export const FEED_CONTEST_SPORT_BY_LEAGUE_ID: Readonly<
    Record<string, FeedContestSport>
> = {
    nfl: "NFL",
    nba: "NBA",
    ncaab: "NCAAB",
    nhl: "NHL",
    mlb: "MLB",
    "england-premier-league": "Soccer",
    "germany-bundesliga": "Soccer",
    "fifa-world-cup": "Soccer",
};

export type FeedContestSportCount = {
    sport: FeedContestSport;
    count: number;
    /** FALSE when any league behind this sport failed upstream — count is a floor. */
    available: boolean;
};

/**
 * Collapses `GET /leagues/matchup-counts` rows onto the contest sports, dropping
 * anything with no matchups. Re-sorted after the merge because summing the three
 * soccer competitions can move Soccer past a league the server ranked above it.
 */
export const toFeedContestSportCounts = (
    leagues: readonly LeagueMatchupCount[] | null | undefined
): FeedContestSportCount[] => {
    const totals = new Map<FeedContestSport, FeedContestSportCount>();

    (leagues ?? []).forEach((row) => {
        const sport = FEED_CONTEST_SPORT_BY_LEAGUE_ID[row.league?.toLowerCase?.() ?? ""];
        if (!sport) return;
        const current = totals.get(sport);
        totals.set(sport, {
            sport,
            count: (current?.count ?? 0) + (Number.isFinite(row.count) ? row.count : 0),
            available: (current?.available ?? true) && row.available !== false,
        });
    });

    return [...totals.values()]
        .filter((entry) => entry.count > 0)
        .sort(
            (left, right) =>
                right.count - left.count ||
                FEED_CONTEST_SPORTS.indexOf(left.sport) -
                FEED_CONTEST_SPORTS.indexOf(right.sport)
        );
};

/**
 * The `date` grammar `/leagues/matchup-counts` accepts: one day, or `from-to`
 * for an inclusive range.
 */
export const toScheduleDateSpec = (startDateKey: string, endDateKey: string) => {
    if (!startDateKey) return "";
    if (!endDateKey || endDateKey === startDateKey) return startDateKey;
    return `${startDateKey}-${endDateKey}`;
};

/** SUNDAY_PICKEM_WINDOWS_BY_SLATE_MODE, narrowed the way the MVP picker narrows it. */
export const sundayWindowsForSlateMode = (
    mode: SundayPickemSlateMode
): readonly SundayKickoffWindow[] =>
    mode === "early_window"
        ? ["early"]
        : mode === "late_window"
            ? ["late"]
            // full_sunday AND organizer_selected: every window is on the table.
            : ["international", "early", "late", "sunday_night"];

/**
 * The zone every organizer-facing calendar day is read in. A contest's own
 * deadlines stay exact instants; only the day a kickoff is filed under moves.
 */
export const DEFAULT_ORGANIZER_TIME_ZONE = "America/New_York";

const browserTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

/**
 * The account's stored zone wins, then the browser's, then the league clock —
 * the same order `X-Timezone` is resolved in, so the wizard and the endpoint
 * agree on which day a slate boundary names.
 */
export const resolveOrganizerTimeZone = (preferred?: string | null) => {
    if (isValidIanaTimeZone(preferred)) return preferred.trim();
    const detected = browserTimeZone();
    return isValidIanaTimeZone(detected) ? detected : DEFAULT_ORGANIZER_TIME_ZONE;
};

const dateKeyFormatters = new Map<string, Intl.DateTimeFormat>();

const dateKeyFormatter = (timeZone: string) => {
    const cached = dateKeyFormatters.get(timeZone);
    if (cached) return cached;
    // en-CA already formats as YYYY-MM-DD, so the parts join in key order.
    const created = new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });
    dateKeyFormatters.set(timeZone, created);
    return created;
};

/** The `YYYY-MM-DD` calendar day an instant falls on in the given zone. */
export const toZonedDateKey = (
    value: string | number | Date,
    timeZone: string = DEFAULT_ORGANIZER_TIME_ZONE
) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const parts = dateKeyFormatter(timeZone).formatToParts(date);
    const value_ = (type: Intl.DateTimeFormatPartTypes) =>
        parts.find((part) => part.type === type)?.value ?? "";
    return `${value_("year")}-${value_("month")}-${value_("day")}`;
};

// Date keys are shifted through UTC noon so a DST change cannot round a day
// away — the arithmetic is on calendar days, never on elapsed hours.
const dateKeyTime = (dateKey: string) => {
    const [year, month, day] = dateKey.split("-").map(Number);
    return year && month && day ? Date.UTC(year, month - 1, day) : Number.NaN;
};

export const addDateKeyDays = (dateKey: string, days: number) => {
    const time = dateKeyTime(dateKey);
    if (!Number.isFinite(time)) return dateKey;
    const shifted = new Date(time + days * 24 * 60 * 60 * 1000);
    const month = String(shifted.getUTCMonth() + 1).padStart(2, "0");
    const day = String(shifted.getUTCDate()).padStart(2, "0");
    return `${shifted.getUTCFullYear()}-${month}-${day}`;
};

/** Whole calendar days from `startKey` to `endKey`; NaN if either is unparsable. */
export const daysBetweenDateKeys = (startKey: string, endKey: string) =>
    (dateKeyTime(endKey) - dateKeyTime(startKey)) / (24 * 60 * 60 * 1000);

/**
 * The calendar days a SAVED slate snapshot covers, in the given zone.
 *
 * A contest stores its slate as kickoff instants, never as the range the
 * organizer drew — so reopening a draft has to recover the range from the games.
 * The length is deliberately not derived here: `ContestSlateRangeCalendar`
 * computes it from the two boundaries, so returning them is enough to light the
 * right duration button.
 */
export const slateBoundsFromGames = (
    games: readonly { starts_at: string }[] | null | undefined,
    timeZone: string
) => {
    const keys = (games ?? [])
        .map((game) => toZonedDateKey(game.starts_at, timeZone))
        .filter(Boolean)
        // `YYYY-MM-DD` sorts correctly as a plain string.
        .sort();
    return keys.length
        ? { startsOn: keys[0], endsOn: keys[keys.length - 1] }
        : { startsOn: "", endsOn: "" };
};

export const gameKickoffFormatter = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
});

/** Kickoffs on the NFL league clock, which is how Sunday windows are named. */
export const easternKickoffFormatter = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
    timeZone: SCHEDULE_TIME_ZONE,
});

const zonedKickoffFormatters = new Map<string, Intl.DateTimeFormat>();

/** The same kickoff line as `gameKickoffFormatter`, pinned to one zone. */
/**
 * The slate browser's kickoff line — and its ONLY consumer, which is why the
 * locale is the VIEWER's rather than the en-US every other formatter in this
 * file pins. The MVP builds this one inline with `Intl.DateTimeFormat(undefined,
 * …)`, so a non-US organizer reads "Sun 14 Sep, 13:00 EDT" instead of
 * "Sun, Sep 14, 1:00 PM EDT". The zone is still explicit; only the rendering
 * follows the reader.
 */
export const zonedKickoffFormatter = (timeZone: string) => {
    const cached = zonedKickoffFormatters.get(timeZone);
    if (cached) return cached;
    const created = new Intl.DateTimeFormat(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short",
        timeZone,
    });
    zonedKickoffFormatters.set(timeZone, created);
    return created;
};

const slateDateFormatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
});

/** Renders a `YYYY-MM-DD` slate boundary without dragging it through UTC. */
export const formatSlateDate = (dateKey: string) => {
    const [year, month, day] = dateKey.split("-").map(Number);
    if (!year || !month || !day) return "—";
    return slateDateFormatter.format(new Date(year, month - 1, day));
};

export const formatContestDateTime = (value: string | null | undefined) => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return gameKickoffFormatter.format(date);
};
