"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import BackButton from "@/components/ui/BackButton";
import Loader from "@/components/ui/Loader";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { useToast } from "@/lib/state/ToastContext";
import type {
    CreateFeedContestPayload,
    FeedContest,
    FeedContestGameSnapshot,
    FeedContestTemplate,
    FeedGroupType,
    ReplaceDraftFeedContestPayload,
    RootState,
} from "@/lib/interfaces/interfaces";
import {
    clearCreateFeedContestState,
    createDraftFeedContestRequest,
    createFeedContestRequest,
    publishDraftFeedContestRequest,
    replaceDraftFeedContestRequest,
} from "@/lib/redux/slices/feedContestSlice";
import {
    clearLeagueMatchupCounts,
    fetchLeagueMatchupCountsRequest,
} from "@/lib/redux/slices/leagueSlice";
import {
    addDateKeyDays,
    daysBetweenDateKeys,
    easternKickoffFormatter,
    FEED_CONTEST_LOCK_LEAD_MS,
    FEED_CONTEST_MAX_LEGS,
    FEED_CONTEST_MIN_LEGS,
    FEED_CONTEST_SPORTS,
    formatContestDateTime,
    formatSlateDate,
    MAX_SLATE_DAYS,
    resolveOrganizerTimeZone,
    SCHEDULE_TIME_ZONE,
    slateBoundsFromGames,
    SLATE_HORIZON_DAYS,
    SUNDAY_PICKEM_MIN_GAMES,
    sundayWindowsForSlateMode,
    toFeedContestSportCounts,
    toScheduleDateSpec,
    toZonedDateKey,
    zonedKickoffFormatter,
    type ContestGameOption,
    type FeedContestSport,
    type SundayPickemSlateMode,
} from "@/lib/contests/feedContestCatalog";
import ContestSlateBrowser from "./ContestSlateBrowser";
import ContestSlateRangeCalendar from "./ContestSlateRangeCalendar";
import {
    contestAccentClasses,
    copyFieldClasses,
    fieldClasses,
    fieldLabelClasses,
    inlineDescriptionInputClasses,
    type ContestAccent,
} from "./contestFormStyles";
import { useFeedContestGameCatalog } from "./useFeedContestGameCatalog";

// ENTRY_MODEL_BY_TEMPLATE in the backend's arenaConstant.ts — the endpoint
// rejects any template/entry_model pair that doesn't match.
const ENTRY_MODEL_BY_TEMPLATE: Record<FeedContestTemplate, string> = {
    multi_pick: "multi_pick",
    sunday_pickem: "pickem_card",
};

/** The contest is expected to have settled this long after the last kickoff. */
const CONTEST_END_LAG_MS = 8 * 60 * 60 * 1000;

type ContestWizardStep = "style" | "slate" | "matchups" | "rules" | "review";
type ContestSubmissionMode = "draft" | "immediate";

// General Combo picks its dates and sports first, then reviews the resulting
// matchups on their own step; a Pick'em card is one Sunday window, so it has
// nothing to review separately. Neither template asks for timing any more —
// lock and expected end are derived from the slate.
const GENERAL_COMBO_WIZARD_STEPS: readonly { id: ContestWizardStep; label: string }[] = [
    { id: "style", label: "Style" },
    { id: "slate", label: "Date & sports" },
    { id: "matchups", label: "Matchups" },
    { id: "rules", label: "Rules" },
    { id: "review", label: "Review" },
];

const SUNDAY_PICKEM_WIZARD_STEPS: readonly { id: ContestWizardStep; label: string }[] = [
    { id: "style", label: "Style" },
    { id: "slate", label: "Slate" },
    { id: "rules", label: "Rules" },
    { id: "review", label: "Review" },
];

// Only these two templates can be created (FEED_CONTEST_CREATABLE_TEMPLATES).
const TEMPLATE_PRESETS: readonly {
    id: FeedContestTemplate;
    title: string;
    eyebrow: string;
    body: string;
}[] = [
        {
            id: "multi_pick",
            title: "General Combo",
            eyebrow: "Flexible · multi-sport",
            body: "Members build one 2–8 leg combo from the games and sports you include.",
        },
        {
            id: "sunday_pickem",
            title: "NFL Sunday Pick’em",
            eyebrow: "Complete card · NFL",
            body: "Members choose a winner for every included Sunday matchup. Shared odds are captured at lock.",
        },
    ];

// The only copy an organizer still writes. Both templates now generate their own
// member-facing description from the settings, so the rules field carries the
// terms an entrant has to accept rather than a restatement of the mechanics.
const CONTEST_PARTICIPATION_DISCLAIMER =
    "Gotlocks does not handle money or wagers. All scoring is strictly for entertainment, leaderboard ranking, and personal bragging rights.";

const SUNDAY_PICKEM_DESCRIPTION =
    "Pick one winner for every included Sunday matchup. Most correct wins; shared cutoff odds plus 2 per correct pick break ties.";

const SUNDAY_SLATE_MODES: readonly [SundayPickemSlateMode, string][] = [
    ["early_window", "Early"],
    ["late_window", "Late"],
    ["full_sunday", "Full Sunday"],
];

// Moved to ./contestFormStyles so the copy-edit screen renders the identical
// chrome — in the MVP that screen IS this component, opened at its Rules step.

const clampGeneralComboLegCount = (value: number) =>
    Math.min(FEED_CONTEST_MAX_LEGS, Math.max(FEED_CONTEST_MIN_LEGS, Math.trunc(value)));

/**
 * A General Combo's member-facing description is a restatement of its entry
 * settings, so it is generated from them rather than typed — the organizer edits
 * the numbers inline and the surrounding sentences follow.
 */
const generalComboDescriptionText = ({
    minLegs,
    maxLegs,
    minimumCombinedOdds,
    allowSameGameLegs,
    winningPlaces,
}: {
    minLegs: number;
    maxLegs: number;
    minimumCombinedOdds: string;
    allowSameGameLegs: boolean;
    winningPlaces: number;
}) =>
    [
        `Submit one ${minLegs}–${maxLegs} leg combo before entries lock. Every active leg must win.`,
        minimumCombinedOdds
            ? `The accepted combined price must be at least +${minimumCombinedOdds}.`
            : "There is no minimum combined price.",
        allowSameGameLegs ? "Same-game legs allowed." : "One leg per game.",
        winningPlaces === 1
            ? "The top entry wins."
            : `The top ${winningPlaces} entries win.`,
    ].join(" ");

/**
 * Everything a saved draft contributes to the wizard's first render.
 *
 * Computed in ONE pass and applied in ONE commit on purpose: `template`, the
 * slate dates and the sports together decide the catalog query, and a render
 * where any of them is still empty dispatches `clearFeedContestSchedules()` and
 * collapses the reachable step back to 1.
 */
type DraftSeed = {
    template: FeedContestTemplate | null;
    slateStartsOn: string;
    slateEndsOn: string;
    comboSports: FeedContestSport[];
    sundayDate: string;
    slateMode: SundayPickemSlateMode;
    minLegs: number;
    maxLegs: number;
    minimumCombinedOdds: string;
    allowSameGameLegs: boolean;
    winningPlaces: number;
    name: string;
    rulesText: string;
};

const CREATE_SEED: DraftSeed = {
    template: null,
    slateStartsOn: "",
    slateEndsOn: "",
    comboSports: [],
    sundayDate: "",
    slateMode: "full_sunday",
    minLegs: FEED_CONTEST_MIN_LEGS,
    maxLegs: 5,
    minimumCombinedOdds: "300",
    allowSameGameLegs: true,
    winningPlaces: 3,
    name: "",
    rulesText: "",
};

const isSlateMode = (value: unknown): value is SundayPickemSlateMode =>
    value === "early_window" || value === "late_window" || value === "full_sunday";

const buildDraftSeed = ({
    contest,
    organizerTimeZone,
    organizerToday,
    organizerHorizonEnd,
}: {
    contest: FeedContest | undefined;
    organizerTimeZone: string;
    organizerToday: string;
    organizerHorizonEnd: string;
}): DraftSeed => {
    if (!contest) return CREATE_SEED;

    const template: FeedContestTemplate | null =
        contest.template === "multi_pick" || contest.template === "sunday_pickem"
            ? contest.template
            : null;

    /* ---------- The slate range, recovered from the saved kickoffs ---------- */
    // A contest stores instants, never the range the organizer drew. The raw
    // bounds routinely fail `slateDateError` (a draft ages), and a failing range
    // blanks `slateDateSpec` — which stops the catalog fetch outright and dead-
    // ends the wizard. So they are clamped forward into a usable window instead.
    let slateStartsOn = "";
    let slateEndsOn = "";
    if (template === "multi_pick") {
        const raw = slateBoundsFromGames(contest.eligible_games_json, organizerTimeZone);
        if (raw.startsOn) {
            const startsOn =
                raw.startsOn < organizerToday ? organizerToday : raw.startsOn;
            if (startsOn <= organizerHorizonEnd) {
                // The earliest of: the saved end, the horizon, and the max span.
                const endsOn = [
                    raw.endsOn,
                    organizerHorizonEnd,
                    addDateKeyDays(startsOn, MAX_SLATE_DAYS - 1),
                ]
                    .filter(Boolean)
                    .sort()[0];
                if (endsOn && endsOn >= startsOn) {
                    slateStartsOn = startsOn;
                    slateEndsOn = endsOn;
                }
            }
        }
    }

    /* ---------- Pick'em's Sunday, read on the LEAGUE clock ---------- */
    // `sundayDateOptions` is built from `scheduleDateKey`, which is always
    // Eastern — using the organizer's zone here would produce a key that is
    // never in the list for a west-coast organizer with a late kickoff.
    const sundayDate =
        template === "sunday_pickem"
            ? toZonedDateKey(
                [...(contest.eligible_games_json ?? [])]
                    .map((game) => game.starts_at)
                    .sort()[0] ?? "",
                SCHEDULE_TIME_ZONE
            )
            : "";

    const minLegs = clampGeneralComboLegCount(
        contest.minimum_legs ?? FEED_CONTEST_MIN_LEGS
    );

    return {
        template,
        slateStartsOn,
        slateEndsOn,
        // Filtered through the canonical order `toggleComboSport` maintains, so a
        // re-toggle does not reshuffle the chips.
        comboSports:
            template === "multi_pick"
                ? FEED_CONTEST_SPORTS.filter((sport) =>
                    (contest.sports ?? []).includes(sport)
                )
                : [],
        sundayDate,
        slateMode: isSlateMode(contest.sunday_pickem_slate_mode)
            ? contest.sunday_pickem_slate_mode
            : "full_sunday",
        minLegs,
        maxLegs: Math.max(minLegs, clampGeneralComboLegCount(contest.maximum_legs ?? 5)),
        // A draft saved with NO minimum seeds empty, not the create default.
        minimumCombinedOdds:
            contest.minimum_odds === null || contest.minimum_odds === undefined
                ? ""
                : String(contest.minimum_odds),
        allowSameGameLegs: contest.allow_same_game_legs ?? true,
        winningPlaces: contest.winning_places ?? 3,
        name: contest.name ?? "",
        rulesText: contest.rules_text ?? "",
    };
};

export type FeedContestCreateFormProps = {
    groupId: string;
    groupType: FeedGroupType;
    contextName: string;
    backHref: string;
    /** Where to land after a successful create. Defaults to `backHref`. */
    detailHref?: (contestId: string) => string;
    /** Blocks both publication modes — e.g. the group can host no contest at all. */
    createDisabledReason?: string;
    /** Blocks publishing only; a draft takes no active-contest slot. */
    publishDisabledReason?: string;
    /**
     * DRAFT EDIT ONLY. The saved draft this wizard reopens, from
     * `GET /detail/:contest_id` — a list row will not do, since `rules_text` and
     * `eligible_games_json` are detail-only columns.
     *
     * Its presence switches the submit path to `PUT /replace-draft/:contest_id`
     * and the heading to "Edit contest draft". A PUBLISHED contest must never be
     * passed: its mechanics are frozen and the endpoint answers 409 — that case
     * belongs to the copy-only `FeedContestEditForm`.
     */
    initialContest?: FeedContest;
};

export const FeedContestCreateForm = ({
    groupId,
    groupType,
    contextName,
    backHref,
    detailHref,
    createDisabledReason,
    publishDisabledReason,
    initialContest,
}: FeedContestCreateFormProps) => {
    /** TRUE when the wizard is reopening a saved draft rather than starting one. */
    const editingDraft = Boolean(initialContest);
    const accent: ContestAccent = groupType === "arena" ? "arena" : "league";
    const accentClasses = contestAccentClasses[accent];
    const router = useRouter();
    const searchParams = useSearchParams();
    const dispatch = useDispatch();
    const { setToast } = useToast();
    const currentUser = useCurrentUser();
    const {
        createLoading,
        createdContest,
        createMessage,
        createError,
        draftLoading,
        draftedContest,
        draftMessage,
        draftError,
    } = useSelector((state: RootState) => state.feedContest);
    const matchupCounts = useSelector((state: RootState) => state.league.matchupCounts);
    const matchupCountsLoading = useSelector(
        (state: RootState) => state.league.matchupCountsLoading
    );
    const matchupCountsError = useSelector(
        (state: RootState) => state.league.matchupCountsError
    );

    const requestedStep = searchParams.get("step") as ContestWizardStep | null;

    // Every calendar day the wizard names is read in the organizer's own zone —
    // the same one `X-Timezone` carries to the create endpoint. Frozen at mount so
    // the horizon cannot slide at midnight and invalidate an answered step.
    const [creatorNow] = useState(() => new Date());
    const [organizerTimeZone, setOrganizerTimeZone] = useState(() =>
        resolveOrganizerTimeZone(
            // A saved draft's own zone is authoritative — it is the zone every
            // slate boundary in it was authored against.
            initialContest?.time_zone ?? currentUser?.accountTimezone
        )
    );
    useEffect(() => {
        // Never re-derived for a draft edit: the stored zone must win, or the
        // slate boundaries move out from under a range that hugs midnight.
        if (initialContest) return;
        const resolved = resolveOrganizerTimeZone(currentUser?.accountTimezone);
        setOrganizerTimeZone((current) => (current === resolved ? current : resolved));
    }, [currentUser?.accountTimezone, initialContest]);
    const organizerToday = toZonedDateKey(creatorNow, organizerTimeZone);
    const organizerHorizonEnd = addDateKeyDays(organizerToday, SLATE_HORIZON_DAYS);

    /*
     * SUNDAY PICK'EM READS THE LEAGUE CLOCK, NOT THE ORGANIZER'S.
     *
     * A Pick'em card is one EASTERN Sunday — `buildSundayPickemSlate` on the
     * server runs its "same Sunday" test and its kickoff windows in
     * America/New_York and rejects a slate that spans two Eastern dates.
     *
     * Scoping this template's horizon in the organizer's zone therefore cut a
     * single Sunday in half for anyone east of ET: a 4:25pm ET kickoff is Monday
     * in Kolkata, so the late and Sunday-night games of a Sunday at the edge of
     * the window fell outside [today, today+14] and disappeared — from the
     * REQUEST as well as the filter, since the endpoint files each kickoff under
     * a day in the zone `X-Timezone` names.
     *
     * General Combo keeps the organizer's zone: there the organizer really is
     * drawing a range on their own calendar.
     */
    const easternToday = toZonedDateKey(creatorNow, SCHEDULE_TIME_ZONE);
    const easternHorizonEnd = addDateKeyDays(easternToday, SLATE_HORIZON_DAYS);

    /*
     * Every Pick'em time on screen is stated on the league clock. For an
     * organizer who is not ON that clock, an Eastern time alone is not readable —
     * a 4:25pm ET kickoff is 1:55am the NEXT day in Kolkata — so each kickoff
     * also carries its equivalent in the organizer's own zone, labelled. Both
     * lines print `timeZoneName: "short"`, so neither can be mistaken for the
     * other.
     */
    const organizerKickoffFormatter = useMemo(
        () => zonedKickoffFormatter(organizerTimeZone),
        [organizerTimeZone]
    );
    const showsLocalKickoff = organizerTimeZone !== SCHEDULE_TIME_ZONE;

    // One pass, read by every initialiser below, so the whole draft lands on the
    // FIRST commit — `template`, the slate dates and the sports together decide
    // the catalog query, and a render where any of them is still empty clears the
    // schedule slice and collapses the reachable step back to 1.
    //
    // `useState` rather than `useMemo`: it must run once and never recompute. The
    // three zone values above are already their first-render values, which is
    // exactly what a lazy initialiser needs.
    const [seed] = useState(() =>
        buildDraftSeed({
            contest: initialContest,
            organizerTimeZone,
            organizerToday,
            organizerHorizonEnd,
        })
    );

    const [step, setStep] = useState<ContestWizardStep>("style");
    const [highestVisitedStepIndex, setHighestVisitedStepIndex] = useState(0);
    const [template, setTemplate] = useState<FeedContestTemplate | null>(seed.template);
    const [name, setName] = useState(seed.name);
    const [rulesText, setRulesText] = useState(seed.rulesText);
    const [selectedComboSports, setSelectedComboSports] = useState<FeedContestSport[]>(
        seed.comboSports
    );
    const [slateStartsOn, setSlateStartsOn] = useState(seed.slateStartsOn);
    const [slateEndsOn, setSlateEndsOn] = useState(seed.slateEndsOn);
    const [selectedSundayDate, setSelectedSundayDate] = useState(seed.sundayDate);
    // One exclusion list for both templates: every matchup on the visible slate
    // starts included and this records the ones the organizer took out. An
    // inclusion list cannot work here — the slate arrives from the network AFTER
    // the sports are chosen, so there is nothing to seed it from at click time.
    const [excludedGameIds, setExcludedGameIds] = useState<string[]>([]);
    const [sundayPickemSlateMode, setSundayPickemSlateMode] =
        useState<SundayPickemSlateMode>(seed.slateMode);
    const [minLegs, setMinLegs] = useState(seed.minLegs);
    const [maxLegs, setMaxLegs] = useState(seed.maxLegs);
    // The inline editor has to allow a momentarily empty field, so the raw text is
    // kept beside the clamped number instead of forcing it back on every keystroke.
    // Seeded with its numeric twin, or `onBlur` snaps the text back.
    const [minLegsInput, setMinLegsInput] = useState(String(seed.minLegs));
    const [maxLegsInput, setMaxLegsInput] = useState(String(seed.maxLegs));
    const [minimumCombinedOdds, setMinimumCombinedOdds] = useState(
        seed.minimumCombinedOdds
    );
    const [allowSameGameLegs, setAllowSameGameLegs] = useState(seed.allowSameGameLegs);
    const [winningPlaces, setWinningPlaces] = useState(seed.winningPlaces);
    const [submittingMode, setSubmittingMode] = useState<ContestSubmissionMode | null>(
        null
    );
    const [error, setError] = useState<string>();

    const submitting = createLoading || draftLoading;

    /* ---------- Draft-edit hydration ----------
     *
     * The saved slate cannot be applied at mount. The contest stores an INCLUSION
     * list (`eligible_game_ids`) while the wizard holds an EXCLUSION list, and
     * `excluded = catalog − saved` needs the live catalog, which arrives over the
     * network. So it runs exactly once, after the catalog lands — and never at
     * all if the organizer got there first.
     */
    const hydratedRef = useRef(!initialContest);
    const slateTouchedRef = useRef(false);
    /** Latches on this screen's own submit — see the terminal effect. */
    const submittedRef = useRef(false);
    // Games that have since started or left the schedule silently drop out of the
    // payload; this is what says so out loud.
    const [slateSeedNotice, setSlateSeedNotice] = useState<string>();

    const slateDateError = (() => {
        if (!slateStartsOn || !slateEndsOn) return "Choose the slate start and end dates.";
        if (slateEndsOn < slateStartsOn) {
            return "The slate end date must be on or after its start date.";
        }
        if (slateStartsOn < organizerToday) {
            return `The slate cannot begin before today in ${organizerTimeZone}.`;
        }
        if (slateEndsOn > organizerHorizonEnd) {
            return `The slate must end within the next ${SLATE_HORIZON_DAYS} calendar days.`;
        }
        // Compared as date keys rather than as a millisecond difference: a DST
        // change shortens the span by an hour and would slip past a numeric test.
        if (daysBetweenDateKeys(slateStartsOn, slateEndsOn) > MAX_SLATE_DAYS - 1) {
            return `General Combo slates may cover at most ${MAX_SLATE_DAYS} days.`;
        }
        return null;
    })();

    // The `date` spec the whole step-2 conversation is scoped to.
    const slateDateSpec =
        template === "multi_pick" && !slateDateError
            ? toScheduleDateSpec(slateStartsOn, slateEndsOn)
            : "";

    // Pick'em needs every Sunday in the organizer window to fill its date select,
    // so it reads NFL across the whole horizon — still one call. General Combo
    // reads ONLY the sports the organizer picked, over ONLY its own days: no
    // sport is fetched before it is chosen, and no day outside the slate.
    const catalogSports = useMemo<readonly FeedContestSport[]>(
        () =>
            template === "sunday_pickem"
                ? (["NFL"] as const)
                : template === "multi_pick"
                    ? selectedComboSports
                    : [],
        [selectedComboSports, template]
    );
    const catalogDateSpec =
        template === "sunday_pickem"
            ? toScheduleDateSpec(easternToday, easternHorizonEnd)
            : slateDateSpec;
    // Pinned to the league clock for Pick'em so the days the server buckets by
    // are the same days `catalogDateSpec` names. General Combo passes undefined
    // and keeps axiosInstance's browser-zone default.
    const catalogTimeZone =
        template === "sunday_pickem" ? SCHEDULE_TIME_ZONE : undefined;
    const {
        options: catalogOptions,
        loading: catalogLoading,
        error: catalogError,
    } = useFeedContestGameCatalog(catalogSports, catalogDateSpec, catalogTimeZone);

    // Terminal states for both publication modes. Deeper rules (organizer
    // authority, hosting, active-contest limits, slate freshness) only live
    // server-side, so the failure path surfaces the API's own message verbatim.
    // A terminal result stranded by an interrupted submit on an EARLIER mount is
    // not this screen's. Dropped here, at mount, because the latch below now
    // stops the effect that used to clear it — and a leftover `draftedContest`
    // makes `settled` truthy, which would swallow a genuine failure and toast a
    // success for a contest the organizer never saved.
    useEffect(() => {
        dispatch(clearCreateFeedContestState());
    }, [dispatch]);

    useEffect(() => {
        // Only THIS screen's own write may navigate. The wizard is reachable from
        // two routes now, and a message left in the slice by an earlier create
        // would otherwise bounce a freshly opened form straight back out.
        if (!submittedRef.current) return;
        const settled = createdContest || createMessage || draftedContest || draftMessage;
        if (settled) {
            setToast({
                id: Date.now(),
                type: "success",
                message: draftMessage ?? createMessage ?? "Feed contest saved.",
                duration: 3000,
            });
            dispatch(clearCreateFeedContestState());
            const contestId = (draftedContest ?? createdContest)?.id;
            router.replace(contestId && detailHref ? detailHref(contestId) : backHref);
            return;
        }
        const failure = createError ?? draftError;
        if (failure) {
            setError(failure);
            setSubmittingMode(null);
            setToast({ id: Date.now(), type: "error", message: failure, duration: 4000 });
            dispatch(clearCreateFeedContestState());
        }
    }, [
        createdContest,
        createMessage,
        createError,
        draftedContest,
        draftMessage,
        draftError,
        backHref,
        detailHref,
        dispatch,
        router,
        setToast,
    ]);

    // The server already filtered to the requested days; this re-checks the
    // boundaries client-side — on the SAME axis the request used, or the two
    // disagree and the edge games of the window drop out.
    //
    // Pick'em compares `scheduleDateKey`, which `toContestGameOption` computed in
    // Eastern; General Combo re-reads the kickoff in the organizer's zone, which
    // differs from the header's whenever the account carries an explicit one.
    const contestGameOptions = useMemo(
        () =>
            catalogOptions.filter((option) => {
                if (template === "sunday_pickem") {
                    return (
                        option.scheduleDateKey >= easternToday &&
                        option.scheduleDateKey <= easternHorizonEnd
                    );
                }
                const dateKey = toZonedDateKey(option.gameStartsAt, organizerTimeZone);
                return dateKey >= organizerToday && dateKey <= organizerHorizonEnd;
            }),
        [
            catalogOptions,
            easternHorizonEnd,
            easternToday,
            organizerHorizonEnd,
            organizerTimeZone,
            organizerToday,
            template,
        ]
    );

    const wizardSteps =
        template === "sunday_pickem" ? SUNDAY_PICKEM_WIZARD_STEPS : GENERAL_COMBO_WIZARD_STEPS;

    const generatedComboDescription = useMemo(
        () =>
            generalComboDescriptionText({
                minLegs,
                maxLegs,
                minimumCombinedOdds,
                allowSameGameLegs,
                winningPlaces,
            }),
        [allowSameGameLegs, maxLegs, minLegs, minimumCombinedOdds, winningPlaces]
    );
    const effectiveDescription =
        template === "multi_pick" ? generatedComboDescription : SUNDAY_PICKEM_DESCRIPTION;

    // Sunday windows are named on the NFL league clock, so a card belongs to the
    // Eastern calendar Sunday its kickoffs fall on.
    const sundayDateOptions = useMemo(
        () =>
            [
                ...new Set(
                    contestGameOptions
                        .filter((option) => Boolean(option.sundayWindow))
                        .map((option) => option.scheduleDateKey)
                ),
            ]
                .filter(Boolean)
                .sort(),
        [contestGameOptions]
    );

    // The schedule arrives after the style is chosen, so the Sunday selector seeds
    // itself the moment a Sunday exists — and re-seeds if the chosen one ages out.
    useEffect(() => {
        if (template !== "sunday_pickem" || !sundayDateOptions.length) return;
        setSelectedSundayDate((current) =>
            current && sundayDateOptions.includes(current) ? current : sundayDateOptions[0]
        );
    }, [sundayDateOptions, template]);

    const selectableGameOptions = useMemo(() => {
        if (template !== "sunday_pickem" || !selectedSundayDate) {
            return [] as ContestGameOption[];
        }
        const allowed = sundayWindowsForSlateMode(sundayPickemSlateMode);
        return contestGameOptions.filter(
            (option) =>
                option.sundayWindow &&
                allowed.includes(option.sundayWindow) &&
                option.scheduleDateKey === selectedSundayDate
        );
    }, [contestGameOptions, selectedSundayDate, sundayPickemSlateMode, template]);

    // The slate fetch is already scoped to these days, but the response is
    // filtered in the header zone; this re-checks the boundaries in the
    // organizer's own.
    const scopedComboCatalogGames = useMemo(
        () =>
            slateStartsOn && slateEndsOn
                ? contestGameOptions.filter((option) => {
                    const dateKey = toZonedDateKey(option.gameStartsAt, organizerTimeZone);
                    return dateKey >= slateStartsOn && dateKey <= slateEndsOn;
                })
                : [],
        [contestGameOptions, organizerTimeZone, slateEndsOn, slateStartsOn]
    );

    // Which leagues have matchups on the chosen days is answered by the server,
    // not derived from a schedule this wizard has not fetched yet: GET
    // /leagues/matchup-counts returns the list already sorted, most matchups
    // first. The saga debounces it, so dragging across the calendar costs one
    // call rather than one per day.
    useEffect(() => {
        if (!slateDateSpec) {
            dispatch(clearLeagueMatchupCounts());
            return;
        }
        dispatch(fetchLeagueMatchupCountsRequest({ date: slateDateSpec, sort: "count" }));
    }, [dispatch, slateDateSpec]);

    // The response echoes the canonical spec it answered, so a reply for an
    // abandoned range is recognised as stale instead of labelling the new one.
    const countsDescribeSlate =
        Boolean(slateDateSpec) && matchupCounts?.date === slateDateSpec;
    const sportCounts = useMemo(
        () => (countsDescribeSlate ? toFeedContestSportCounts(matchupCounts?.leagues) : []),
        [countsDescribeSlate, matchupCounts]
    );
    // Nothing local can stand in for the counts — the schedule is only fetched
    // once a sport is chosen — so a failed read offers every supported sport
    // rather than dead-ending the wizard.
    const sportOptions = useMemo(
        () =>
            countsDescribeSlate
                ? sportCounts
                : FEED_CONTEST_SPORTS.map((sport) => ({
                    sport,
                    count: 0,
                    available: true,
                })),
        [countsDescribeSlate, sportCounts]
    );
    const sportsAreLoading = matchupCountsLoading && !countsDescribeSlate;

    // Everything on the visible slate is included until the organizer removes it,
    // for both templates.
    const eligibleGameOptions = useMemo(
        () =>
            (template === "multi_pick"
                ? scopedComboCatalogGames
                : selectableGameOptions
            ).filter((option) => !excludedGameIds.includes(option.id)),
        [excludedGameIds, scopedComboCatalogGames, selectableGameOptions, template]
    );
    const eligibleGameIds = useMemo(
        () => eligibleGameOptions.map((option) => option.id),
        [eligibleGameOptions]
    );
    const kickoffTimes = useMemo(
        () =>
            eligibleGameOptions
                .map((option) => Date.parse(option.gameStartsAt))
                .filter(Number.isFinite),
        [eligibleGameOptions]
    );

    // Inverts the draft's saved inclusion list into the wizard's exclusion list,
    // once, as soon as the live catalog can be compared against it.
    useEffect(() => {
        if (hydratedRef.current || slateTouchedRef.current || !initialContest) return;
        if (catalogLoading) return;
        // Pick'em: wait for the Sunday auto-seed above to settle, or the visible
        // slate is still empty and every saved game would read as unavailable.
        if (
            template === "sunday_pickem" &&
            (!selectedSundayDate || !sundayDateOptions.includes(selectedSundayDate))
        ) {
            return;
        }

        const visible =
            template === "multi_pick" ? scopedComboCatalogGames : selectableGameOptions;
        if (!visible.length) {
            // `catalogLoading` above already proves the fetch settled — an
            // in-flight window always reads as loading — so an empty slate here
            // is final, for both templates.
            hydratedRef.current = true;
            setHighestVisitedStepIndex(wizardSteps.length - 1);
            setSlateSeedNotice(
                "None of this draft's matchups are still available. Choose the slate again."
            );
            return;
        }

        const saved = new Set(initialContest.eligible_game_ids ?? []);
        const matched = visible.filter((option) => saved.has(option.id));
        hydratedRef.current = true;
        setHighestVisitedStepIndex(wizardSteps.length - 1);

        if (saved.size && !matched.length) {
            // Schedule-feed event ids are not stable across refreshes, so zero
            // matches means the ids moved — NOT that the organizer excluded
            // everything. Leaving the slate fully included is the safe read.
            setSlateSeedNotice(
                "This draft's saved matchups could not be matched to the current schedule. Review the slate before saving."
            );
            return;
        }

        setExcludedGameIds(
            visible.filter((option) => !saved.has(option.id)).map((option) => option.id)
        );
        const dropped = saved.size - matched.length;
        if (dropped > 0) {
            setSlateSeedNotice(
                `${dropped} saved ${dropped === 1 ? "matchup has" : "matchups have"} started or left the schedule and ${dropped === 1 ? "was" : "were"} removed from this slate.`
            );
        }
    }, [
        catalogError,
        catalogLoading,
        initialContest,
        scopedComboCatalogGames,
        selectableGameOptions,
        selectedSundayDate,
        slateDateSpec,
        sundayDateOptions,
        template,
        wizardSteps,
    ]);

    // Timing is never asked for: entries lock five minutes before the earliest
    // included kickoff and the contest is expected to settle eight hours after
    // the last one.
    const automaticLocksAt = kickoffTimes.length
        ? new Date(Math.min(...kickoffTimes) - FEED_CONTEST_LOCK_LEAD_MS).toISOString()
        : "";
    const automaticExpectedEnd = kickoffTimes.length
        ? new Date(Math.max(...kickoffTimes) + CONTEST_END_LAG_MS).toISOString()
        : "";

    // Adding a sport widens the fetch and everything it returns starts included;
    // removing one narrows it again. Exclusions are left alone — an id for a
    // sport that is no longer fetched is inert, and survives a change of mind.
    const toggleComboSport = (sport: FeedContestSport) => {
        slateTouchedRef.current = true;
        setSelectedComboSports((current) => {
            if (current.includes(sport)) {
                return current.filter((candidate) => candidate !== sport);
            }
            const next = new Set<FeedContestSport>([...current, sport]);
            return FEED_CONTEST_SPORTS.filter((candidate) => next.has(candidate));
        });
        setError(undefined);
    };

    // The calendar owns both boundaries, so a new range always restarts the sport
    // and matchup answers that were scoped to the previous one.
    const chooseSlateDateRange = (startsOn: string, endsOn: string) => {
        // The calendar fires this from both the day grid and the length buttons,
        // so re-picking the SAME range would otherwise wipe the sports and
        // exclusions it just restored on a draft edit.
        if (startsOn === slateStartsOn && endsOn === slateEndsOn) return;
        slateTouchedRef.current = true;
        setSlateStartsOn(startsOn);
        setSlateEndsOn(endsOn);
        setSelectedComboSports([]);
        setExcludedGameIds([]);
        setError(undefined);
    };

    const updateMinimumLegs = (rawValue: string) => {
        setMinLegsInput(rawValue);
        if (!rawValue.trim()) return;
        const numericValue = Number(rawValue);
        if (!Number.isFinite(numericValue)) return;
        const nextMinimum = clampGeneralComboLegCount(numericValue);
        setMinLegs(nextMinimum);
        setMinLegsInput(String(nextMinimum));
        if (nextMinimum > maxLegs) {
            setMaxLegs(nextMinimum);
            setMaxLegsInput(String(nextMinimum));
        }
    };

    const updateMaximumLegs = (rawValue: string) => {
        setMaxLegsInput(rawValue);
        if (!rawValue.trim()) return;
        const numericValue = Number(rawValue);
        if (!Number.isFinite(numericValue)) return;
        const nextMaximum = clampGeneralComboLegCount(numericValue);
        setMaxLegs(nextMaximum);
        setMaxLegsInput(String(nextMaximum));
        if (nextMaximum < minLegs) {
            setMinLegs(nextMaximum);
            setMinLegsInput(String(nextMaximum));
        }
    };

    // The same first-pass checks the endpoint runs, so obvious mistakes fail on
    // the step that owns them instead of costing a round-trip. Both publication
    // modes run the full pass — a draft that cannot validate now could never be
    // published.
    const validateStep = (candidate: ContestWizardStep): string | null => {
        if (candidate === "style") {
            return template ? null : "Choose a contest style to continue.";
        }
        if (!template) return "Choose a contest style first.";
        if (candidate === "slate") {
            if (template === "sunday_pickem") {
                if (catalogLoading) return "Loading the NFL schedule…";
                if (!selectedSundayDate) return "Choose an NFL Sunday date in Eastern Time.";
                return eligibleGameIds.length < SUNDAY_PICKEM_MIN_GAMES
                    ? "Sunday Pick’em requires at least two included games."
                    : null;
            }
            if (slateDateError) return slateDateError;
            if (selectedComboSports.length === 0) {
                return "Choose at least one sport for the selected dates.";
            }
            // The slate is only fetched once a sport is chosen, so "none found"
            // and "not fetched yet" are distinct answers here.
            if (catalogLoading) return "Loading the matchups for these sports…";
            if (catalogError) return catalogError;
            if (scopedComboCatalogGames.length === 0) {
                return "No matchups are available for those dates and sports.";
            }
            return null;
        }
        if (candidate === "matchups") {
            if (template === "multi_pick" && eligibleGameIds.length === 0) {
                return "Include at least one matchup from the selected slate.";
            }
            return null;
        }
        if (candidate === "rules") {
            if (!name.trim()) return "Name the contest.";
            if (template === "multi_pick") {
                if (
                    !Number.isInteger(minLegs) ||
                    !Number.isInteger(maxLegs) ||
                    minLegs < FEED_CONTEST_MIN_LEGS ||
                    maxLegs > FEED_CONTEST_MAX_LEGS ||
                    minLegs > maxLegs
                ) {
                    return `Set a valid leg range between ${FEED_CONTEST_MIN_LEGS} and ${FEED_CONTEST_MAX_LEGS}.`;
                }
                if (minimumCombinedOdds && Number(minimumCombinedOdds) < 100) {
                    return "Minimum combined odds must be +100 or greater.";
                }
            }
            if (!effectiveDescription.trim()) return "Add a short contest description.";
            if (!rulesText.trim()) return "Add or keep the contest rules.";
            if (!Number.isInteger(winningPlaces) || winningPlaces < 1 || winningPlaces > 5) {
                return "Winning places must be between 1 and 5.";
            }
            return null;
        }
        const setupError =
            validateStep("style") ??
            validateStep("slate") ??
            validateStep("matchups") ??
            validateStep("rules");
        if (setupError) return setupError;
        return automaticLocksAt && automaticExpectedEnd
            ? null
            : "Choose at least one matchup with a valid kickoff time.";
    };

    const furthestReachableStep = (() => {
        let index = 0;
        for (const candidate of wizardSteps.slice(0, -1)) {
            if (validateStep(candidate.id)) return index;
            index += 1;
        }
        return wizardSteps.length - 1;
    })();

    // `?step=` is a breadcrumb, not a deep link: an answer that stops validating
    // pulls the wizard back, but a pasted URL never jumps ahead of the work.
    useEffect(() => {
        if (!requestedStep) return;
        const requestedIndex = wizardSteps.findIndex(
            (candidate) => candidate.id === requestedStep
        );
        if (requestedIndex < 0) return;
        const targetIndex = Math.min(requestedIndex, furthestReachableStep);
        setStep((current) => {
            const currentIndex = wizardSteps.findIndex(
                (candidate) => candidate.id === current
            );
            return currentIndex >= 0 && targetIndex < currentIndex
                ? wizardSteps[targetIndex].id
                : current;
        });
    }, [furthestReachableStep, requestedStep, wizardSteps]);

    const navigateToStep = (nextStep: ContestWizardStep, allowUnvisited = false) => {
        const index = wizardSteps.findIndex((candidate) => candidate.id === nextStep);
        if (
            index > furthestReachableStep ||
            (index > highestVisitedStepIndex && !allowUnvisited)
        ) {
            return;
        }
        setHighestVisitedStepIndex((current) => Math.max(current, index));
        setError(undefined);
        setStep(nextStep);
        const params = new URLSearchParams(searchParams.toString());
        params.set("step", nextStep);
        router.push(`?${params.toString()}`, { scroll: false });
    };

    const goForward = () => {
        const validationError = validateStep(step);
        if (validationError) {
            setError(validationError);
            return;
        }
        const currentIndex = wizardSteps.findIndex((candidate) => candidate.id === step);
        const next = wizardSteps[currentIndex + 1];
        if (next) navigateToStep(next.id, true);
    };

    const chooseTemplate = (nextTemplate: FeedContestTemplate) => {
        // Re-clicking the SELECTED card must be inert. It resets the high-water
        // mark, the sports, the exclusions, the slate and the rules text — which
        // on a draft edit destroys the whole prefill for no user intent at all.
        if (nextTemplate === template) return;
        slateTouchedRef.current = true;
        setTemplate(nextTemplate);
        setHighestVisitedStepIndex(0);
        setExcludedGameIds([]);
        setSelectedComboSports([]);
        if (nextTemplate === "multi_pick") {
            setSlateStartsOn("");
            setSlateEndsOn("");
        } else {
            // A Pick'em card is one Eastern Sunday, so the slate boundaries are the
            // chosen date itself and the endpoint derives them from the games.
            setSelectedSundayDate(sundayDateOptions[0] ?? "");
        }
        setRulesText(CONTEST_PARTICIPATION_DISCLAIMER);
        setError(undefined);
    };

    /**
     * The backend has no games table, so the selected schedule rows travel with
     * the request as `eligible_games_json` and are validated against
     * `eligible_game_ids` for agreement and freshness.
     */
    const buildPayload = (): CreateFeedContestPayload | null => {
        if (!template) return null;

        const games: FeedContestGameSnapshot[] = eligibleGameOptions.map((option) => ({
            game_id: option.id,
            sport: option.sport,
            starts_at: new Date(option.gameStartsAt).toISOString(),
            // `has_odds` is deliberately absent: the schedule feed carries no
            // prices, and an explicit `false` is rejected outright while an
            // absent value keeps the server's own default.
            matchup: option.label,
            home_team: option.homeTeam,
            away_team: option.awayTeam,
            kickoff_window: template === "sunday_pickem" ? option.sundayWindow : null,
        }));

        const payload: CreateFeedContestPayload = {
            group_id: groupId,
            group_type: groupType,
            name: name.trim(),
            description: effectiveDescription.trim(),
            template,
            entry_model: ENTRY_MODEL_BY_TEMPLATE[template],
            sports: template === "multi_pick" ? selectedComboSports : ["NFL"],
            // Nothing schedules a future opening any more: a published contest is
            // visible at once and a draft stays organizer-only until it is
            // published. The endpoint only requires opens < locks.
            opens_at: new Date().toISOString(),
            locks_at: automaticLocksAt,
            expected_ends_at: automaticExpectedEnd,
            winning_places: winningPlaces,
            eligible_game_ids: eligibleGameIds,
            eligible_games_json: games,
            rules_text: rulesText.trim(),
        };

        if (template === "sunday_pickem") {
            payload.sunday_pickem_slate_mode = sundayPickemSlateMode;
        } else {
            // Leg limits describe a General Combo entry; a Pick'em card is always
            // one card and the endpoint ignores these for that template.
            payload.minimum_legs = minLegs;
            payload.maximum_legs = maxLegs;
            payload.allow_same_game_legs = allowSameGameLegs;
            const parsedOdds = Number(minimumCombinedOdds);
            payload.minimum_odds =
                minimumCombinedOdds.trim() && Number.isFinite(parsedOdds) ? parsedOdds : null;
        }

        return payload;
    };

    const handleSubmit = (submissionMode: ContestSubmissionMode) => {
        const publishing = submissionMode === "immediate";
        if (createDisabledReason || (publishing && publishDisabledReason) || submitting) {
            if (publishing && publishDisabledReason) setError(publishDisabledReason);
            return;
        }
        const validationError = validateStep("review");
        if (validationError) {
            setError(validationError);
            return;
        }
        const payload = buildPayload();
        if (!payload) {
            setError("Refresh the slate — one selection is no longer available.");
            return;
        }
        setError(undefined);
        setSubmittingMode(submissionMode);
        submittedRef.current = true;

        // Reopening a saved draft REPLACES it in place — same body, same
        // validation, but the contest keeps its id, so every link to it survives.
        if (initialContest) {
            const replacement: ReplaceDraftFeedContestPayload = {
                ...payload,
                contest_id: initialContest.id,
                time_zone: organizerTimeZone,
                publish: publishing,
                // Both endpoints REPLACE the row, so anything the wizard cannot
                // author has to be carried forward or it resets.
                ...(initialContest.allow_staff_participation === undefined ||
                    initialContest.allow_staff_participation === null
                    ? {}
                    : {
                        allow_staff_participation:
                            initialContest.allow_staff_participation,
                    }),
            };
            dispatch(
                publishing
                    ? publishDraftFeedContestRequest(replacement)
                    : replaceDraftFeedContestRequest(replacement)
            );
            return;
        }

        dispatch(
            publishing
                ? createFeedContestRequest(payload)
                : createDraftFeedContestRequest(payload)
        );
    };

    const currentStepIndex = wizardSteps.findIndex((candidate) => candidate.id === step);

    const reviewRows: readonly [string, string][] = template
        ? [
            ["Style", template === "multi_pick" ? "General Combo" : "NFL Sunday Pick’em"],
            ["Contest name", name],
            ["Description", effectiveDescription],
            ...(template === "multi_pick"
                ? ([
                    [
                        "Date range",
                        slateStartsOn === slateEndsOn
                            ? formatSlateDate(slateStartsOn)
                            : `${formatSlateDate(slateStartsOn)} – ${formatSlateDate(slateEndsOn)}`,
                    ],
                ] as [string, string][])
                : ([
                    ["Sunday date", `${formatSlateDate(selectedSundayDate)} · Eastern Time`],
                ] as [string, string][])),
            [
                "Slate",
                `${eligibleGameIds.length} selected ${eligibleGameIds.length === 1 ? "matchup" : "matchups"
                } · ${template === "multi_pick" ? selectedComboSports.join(", ") : "NFL"}`,
            ],
            [
                "Entry lock",
                `${formatContestDateTime(
                    automaticLocksAt
                )} · automatically 5 minutes before the first matchup`,
            ],
        ]
        : [];

    return (
        <div
            className={`flex flex-col gap-6 pb-10 ${accent === "arena" ? "arena-theme" : ""}`}
        >
            <BackButton fallback={backHref} preferFallback />
            <header className="space-y-2 border-b border-white/10 pb-5">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-400">
                    {contextName} · Feed contest
                </p>
                <h1 className="text-3xl font-semibold text-white">
                    {editingDraft ? "Edit contest draft" : "Create contest"}
                </h1>
                <p className="max-w-2xl text-sm leading-6 text-gray-500">
                    Choose a proven format, set its slate, and review the member experience
                    before publishing.
                </p>
            </header>

            <nav aria-label="Contest creation progress" className="overflow-x-auto">
                <ol className="flex min-w-max items-center gap-2">
                    {wizardSteps.map((candidate, index) => {
                        const current = candidate.id === step;
                        const available =
                            index <= furthestReachableStep && index <= highestVisitedStepIndex;
                        return (
                            <li key={candidate.id} className="flex items-center gap-2">
                                <button
                                    type="button"
                                    aria-current={current ? "step" : undefined}
                                    disabled={!available}
                                    onClick={() => navigateToStep(candidate.id)}
                                    className={`rounded-full border px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.1em] transition disabled:cursor-not-allowed ${current
                                        ? accentClasses.lifecycleCurrent
                                        : available
                                            ? "border-white/15 text-gray-300 hover:border-white/30 hover:text-white"
                                            : "border-white/5 text-gray-700"
                                        }`}
                                >
                                    {index + 1}. {candidate.label}
                                </button>
                                {index < wizardSteps.length - 1 ? (
                                    <span aria-hidden className="text-gray-700">
                                        →
                                    </span>
                                ) : null}
                            </li>
                        );
                    })}
                </ol>
            </nav>

            {createDisabledReason ? (
                <section
                    role="alert"
                    className="rounded-xl border border-amber-300/25 bg-amber-500/10 p-5 text-sm text-amber-100"
                >
                    <p className="font-semibold">Contest creation unavailable</p>
                    <p className="mt-1 leading-6 text-amber-100/75">{createDisabledReason}</p>
                </section>
            ) : null}
            {slateSeedNotice ? (
                <section
                    role="status"
                    className="rounded-xl border border-amber-300/20 bg-amber-500/10 p-4 text-sm text-amber-100"
                >
                    <p className="font-semibold">This draft&apos;s slate has moved on</p>
                    <p className="mt-1 text-amber-100/75">{slateSeedNotice}</p>
                </section>
            ) : null}
            {!createDisabledReason && publishDisabledReason ? (
                <section
                    role="status"
                    className="rounded-xl border border-amber-300/20 bg-amber-500/10 p-4 text-sm text-amber-100"
                >
                    <p className="font-semibold">Publishing is currently unavailable</p>
                    <p className="mt-1 text-amber-100/75">
                        {publishDisabledReason} You can still save a draft.
                    </p>
                </section>
            ) : null}

            <section
                className={`relative overflow-hidden rounded-2xl border p-5 shadow-lg sm:p-6 ${accentClasses.hero}`}
            >
                <div className={`pointer-events-none absolute inset-0 ${accentClasses.heroGlow}`} />
                <div className="relative space-y-6">
                    {step === "style" ? (
                        <div className="space-y-5">
                            <div>
                                <p
                                    className={`text-xs font-semibold uppercase tracking-[0.12em] ${accentClasses.textSoft}`}
                                >
                                    Step 1 · Style
                                </p>
                                <h2 className="mt-2 text-2xl font-semibold text-white">
                                    What kind of contest are you running?
                                </h2>
                                <p className="mt-2 text-sm leading-6 text-gray-400">
                                    Both formats require a complete multi-pick entry. One-pick
                                    contests are no longer offered.
                                </p>
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                                {TEMPLATE_PRESETS.map((preset) => {
                                    const selected = template === preset.id;
                                    return (
                                        <button
                                            key={preset.id}
                                            type="button"
                                            aria-pressed={selected}
                                            onClick={() => chooseTemplate(preset.id)}
                                            className={`rounded-2xl border p-5 text-left transition ${selected
                                                ? accentClasses.selectedSurface
                                                : "border-white/10 bg-black/30 hover:border-white/25"
                                                }`}
                                        >
                                            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500">
                                                {preset.eyebrow}
                                            </span>
                                            <span className="mt-2 block text-lg font-semibold text-white">
                                                {preset.title}
                                            </span>
                                            <span className="mt-2 block text-sm leading-6 text-gray-400">
                                                {preset.body}
                                            </span>
                                            <span
                                                className={`mt-4 block text-xs font-semibold ${selected ? accentClasses.textStrong : "text-gray-500"
                                                    }`}
                                            >
                                                {selected ? "Selected" : "Choose this style"}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ) : null}

                    {step === "slate" && template ? (
                        <div className="space-y-6">
                            <div>
                                <p
                                    className={`text-xs font-semibold uppercase tracking-[0.12em] ${accentClasses.textSoft}`}
                                >
                                    Step 2 · {template === "multi_pick" ? "Date & sports" : "Slate"}
                                </p>
                                <h2 className="mt-2 text-2xl font-semibold text-white">
                                    {template === "multi_pick"
                                        ? "Choose dates and sports"
                                        : "Build the Sunday card"}
                                </h2>
                                <p className="mt-2 text-sm leading-6 text-gray-400">
                                    {template === "multi_pick"
                                        ? `Choose up to ${MAX_SLATE_DAYS} consecutive game dates, then select every sport you want in the slate. All eligible matchups start included for review.`
                                        : "All games in the selected Sunday window start included. Uncheck any matchup you want to exclude."}
                                </p>
                                {/* Stated once, up front: an organizer off the league clock is
                                    about to read Eastern dates that do not match their own
                                    calendar, and a card whose games run past their midnight is
                                    correct rather than a mistake. */}
                                {template === "sunday_pickem" && showsLocalKickoff ? (
                                    <p
                                        role="note"
                                        className="mt-3 rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-xs normal-case leading-5 text-gray-400"
                                    >
                                        Every date and kickoff on this step is the NFL league clock
                                        (Eastern Time), the same clock the contest is scored on. In{" "}
                                        <span className="font-semibold text-gray-200">
                                            {organizerTimeZone.replaceAll("_", " ")}
                                        </span>{" "}
                                        the later games of an Eastern Sunday fall after midnight, so a
                                        card can run into your Monday — each matchup below shows your
                                        local time too.
                                    </p>
                                ) : null}
                            </div>

                            {template === "multi_pick" ? (
                                <div className="space-y-6">
                                    <fieldset>
                                        <legend className={fieldLabelClasses}>1 · Slate range</legend>
                                        <div className="mt-2">
                                            <ContestSlateRangeCalendar
                                                minDate={organizerToday}
                                                maxDate={organizerHorizonEnd}
                                                startDate={slateStartsOn}
                                                endDate={slateEndsOn}
                                                accent={accent}
                                                onChange={chooseSlateDateRange}
                                            />
                                        </div>
                                    </fieldset>

                                    {!slateStartsOn || !slateEndsOn ? (
                                        <div className="border-y border-white/10 py-5 text-sm normal-case leading-6 text-gray-500">
                                            Choose a start date to unlock sport selection.
                                        </div>
                                    ) : slateDateError ? (
                                        <p role="alert" className="text-sm font-semibold text-red-200">
                                            {slateDateError}
                                        </p>
                                    ) : (
                                        <fieldset aria-busy={sportsAreLoading}>
                                            <legend className={fieldLabelClasses}>2 · Sports</legend>
                                            {sportsAreLoading ? (
                                                <div className="mt-2 border-y border-white/10">
                                                    <Loader
                                                        size={22}
                                                        message="Checking which leagues have matchups on these dates…"
                                                    />
                                                </div>
                                            ) : (
                                                <>
                                                    {matchupCountsError ? (
                                                        <p
                                                            role="status"
                                                            className="mt-2 text-xs normal-case leading-5 text-amber-100"
                                                        >
                                                            {matchupCountsError} Showing the leagues already
                                                            loaded from the schedule instead.
                                                        </p>
                                                    ) : null}
                                                    {sportOptions.length ? (
                                                        <div
                                                            role="group"
                                                            aria-label="Sports"
                                                            className={`mt-2 grid grid-cols-2 gap-2 rounded-lg border border-slate-800/80 bg-slate-950/60 p-1 transition sm:grid-cols-4 ${matchupCountsLoading
                                                                ? "pointer-events-none opacity-50"
                                                                : ""
                                                                }`}
                                                        >
                                                            {sportOptions.map(({ sport }) => {
                                                                const selected =
                                                                    selectedComboSports.includes(sport);
                                                                return (
                                                                    <button
                                                                        key={sport}
                                                                        type="button"
                                                                        aria-label={sport}
                                                                        aria-pressed={selected}
                                                                        onClick={() => toggleComboSport(sport)}
                                                                        className={`allow-league-caps rounded-md border px-3 py-2 text-xs font-semibold uppercase tracking-wide transition ${selected
                                                                            ? accentClasses.sportOptionSelected
                                                                            : "border-transparent text-gray-400 hover:border-white/10 hover:text-white"
                                                                            }`}
                                                                    >
                                                                        {sport}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    ) : (
                                                        <p className="mt-2 border-y border-white/10 py-5 text-sm normal-case leading-6 text-gray-500">
                                                            No league has matchups on these dates. Choose
                                                            another date or a longer slate.
                                                        </p>
                                                    )}
                                                </>
                                            )}
                                            <p className="mt-3 text-xs normal-case leading-5 text-gray-500">
                                                Select a sport to include all of its matchups. Select it again
                                                to remove that sport from the slate.
                                            </p>
                                            {matchupCounts?.partial && countsDescribeSlate ? (
                                                <p className="mt-2 text-[11px] normal-case leading-5 text-amber-100">
                                                    One league’s schedule could not be read, so a sport may be
                                                    missing from this list.
                                                </p>
                                            ) : null}
                                        </fieldset>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-5">
                                    <fieldset>
                                        <legend className={fieldLabelClasses}>
                                            1 · Sunday date (Eastern Time)
                                        </legend>
                                        <select
                                            aria-label="Sunday date (Eastern Time)"
                                            value={selectedSundayDate}
                                            disabled={sundayDateOptions.length === 0}
                                            onChange={(event) => {
                                                setSelectedSundayDate(event.target.value);
                                                setExcludedGameIds([]);
                                                setError(undefined);
                                            }}
                                            className={fieldClasses(accent)}
                                        >
                                            {sundayDateOptions.length === 0 ? (
                                                <option value="">
                                                    {catalogLoading
                                                        ? "Loading the NFL schedule…"
                                                        : `No NFL Sunday in the next ${SLATE_HORIZON_DAYS} days`}
                                                </option>
                                            ) : null}
                                            {sundayDateOptions.map((dateKey) => (
                                                <option key={dateKey} value={dateKey}>
                                                    {formatSlateDate(dateKey)}
                                                </option>
                                            ))}
                                        </select>
                                        <p className="mt-2 text-xs normal-case leading-5 text-gray-500">
                                            Each card is limited to this one Eastern-Time Sunday, so games
                                            from different NFL weeks cannot mix.
                                        </p>
                                    </fieldset>
                                    <fieldset>
                                        <legend className={fieldLabelClasses}>2 · Sunday window</legend>
                                        <div className="mt-2 grid gap-2 sm:grid-cols-3">
                                            {SUNDAY_SLATE_MODES.map(([mode, label]) => (
                                                <button
                                                    key={mode}
                                                    type="button"
                                                    aria-pressed={sundayPickemSlateMode === mode}
                                                    onClick={() => {
                                                        setSundayPickemSlateMode(mode);
                                                        setExcludedGameIds([]);
                                                    }}
                                                    className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${sundayPickemSlateMode === mode
                                                        ? accentClasses.selectedSurface
                                                        : "border-white/10 text-gray-400 hover:border-white/25"
                                                        }`}
                                                >
                                                    {label}
                                                </button>
                                            ))}
                                        </div>
                                        <p className="mt-2 text-xs normal-case leading-5 text-gray-500">
                                            NFL Sunday windows are classified using the league schedule’s
                                            Eastern Time convention.
                                        </p>
                                    </fieldset>
                                    <fieldset>
                                        <legend className={fieldLabelClasses}>
                                            <span aria-hidden="true">3 · </span>
                                            Included games
                                        </legend>
                                        <div className="mt-2 max-h-80 space-y-2 overflow-y-auto rounded-xl border border-white/10 bg-black/40 p-3">
                                            {selectableGameOptions.map((option) => {
                                                const checked = !excludedGameIds.includes(option.id);
                                                return (
                                                    <label
                                                        key={option.id}
                                                        className="flex cursor-pointer items-start gap-3 rounded-lg border border-white/5 bg-white/[0.025] px-3 py-2.5 normal-case transition hover:border-white/15"
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={checked}
                                                            onChange={() =>
                                                                setExcludedGameIds((current) =>
                                                                    checked
                                                                        ? [...current, option.id]
                                                                        : current.filter(
                                                                            (gameId) => gameId !== option.id
                                                                        )
                                                                )
                                                            }
                                                            className={`mt-1 h-4 w-4 ${accentClasses.checkbox}`}
                                                        />
                                                        <span className="min-w-0">
                                                            <span className="block text-sm font-semibold text-white">
                                                                {option.label}
                                                            </span>
                                                            <span className="mt-0.5 block text-[11px] font-medium text-gray-500">
                                                                {option.sport} ·{" "}
                                                                {easternKickoffFormatter.format(
                                                                    new Date(option.gameStartsAt)
                                                                )}
                                                            </span>
                                                            {/* An Eastern time alone is unreadable off that
                                                                clock — a late kickoff is the NEXT day in
                                                                Asia. Shown only when the zones differ. */}
                                                            {showsLocalKickoff ? (
                                                                <span className="mt-0.5 block text-[11px] font-medium text-gray-600">
                                                                    Your time ·{" "}
                                                                    {organizerKickoffFormatter.format(
                                                                        new Date(option.gameStartsAt)
                                                                    )}
                                                                </span>
                                                            ) : null}
                                                        </span>
                                                    </label>
                                                );
                                            })}
                                            {selectableGameOptions.length === 0 ? (
                                                <p className="px-2 py-3 text-xs normal-case leading-5 text-amber-100">
                                                    {catalogLoading
                                                        ? "Loading the slate…"
                                                        : "No scheduled NFL games are available for this date and window."}
                                                </p>
                                            ) : null}
                                        </div>
                                        <p className="mt-2 text-xs text-gray-500">
                                            {eligibleGameIds.length} of {selectableGameOptions.length} games
                                            included
                                        </p>
                                    </fieldset>
                                </div>
                            )}
                        </div>
                    ) : null}

                    {step === "matchups" && template === "multi_pick" ? (
                        <div className="space-y-6">
                            <div>
                                <p
                                    className={`text-xs font-semibold uppercase tracking-[0.12em] ${accentClasses.textSoft}`}
                                >
                                    Step 3 · Matchup review
                                </p>
                                <h2 className="mt-2 text-2xl font-semibold text-white">
                                    Review eligible matchups
                                </h2>
                                <p className="mt-2 text-sm leading-6 text-gray-400">
                                    Move between your selected dates and sports to review the slate.
                                    Every matchup starts included; remove only the games you do not
                                    want entrants to use.
                                </p>
                            </div>
                            {catalogLoading ? (
                                <div className="rounded-2xl border border-white/10 bg-black/35">
                                    <Loader size={26} message="Loading the matchups for this slate…" />
                                </div>
                            ) : catalogError ? (
                                <p
                                    role="alert"
                                    className="rounded-2xl border border-amber-300/25 bg-amber-500/10 p-5 text-sm normal-case leading-6 text-amber-100"
                                >
                                    {catalogError}
                                </p>
                            ) : (
                                <ContestSlateBrowser
                                    key={`${slateStartsOn}:${slateEndsOn}:${selectedComboSports.join(",")}`}
                                    games={scopedComboCatalogGames}
                                    selectedGameIds={eligibleGameIds}
                                    onToggleGame={(gameId) =>
                                        setExcludedGameIds((current) =>
                                            current.includes(gameId)
                                                ? current.filter((candidate) => candidate !== gameId)
                                                : [...current, gameId]
                                        )
                                    }
                                    accent={accent}
                                    timeZone={organizerTimeZone}
                                />
                            )}
                        </div>
                    ) : null}

                    {step === "rules" && template ? (
                        <div className="space-y-6">
                            <div>
                                <p
                                    className={`text-xs font-semibold uppercase tracking-[0.12em] ${accentClasses.textSoft}`}
                                >
                                    Step {currentStepIndex + 1} · Rules
                                </p>
                                <h2 className="mt-2 text-2xl font-semibold text-white">
                                    Make the contest easy to understand
                                </h2>
                                <p className="mt-2 text-sm leading-6 text-gray-400">
                                    The description explains how entries work. Entrants must accept
                                    the rules below before submitting an entry.
                                </p>
                            </div>
                            <label className={fieldLabelClasses}>
                                Contest name
                                <input
                                    value={name}
                                    onChange={(event) => setName(event.target.value)}
                                    placeholder="Sunday slate showdown"
                                    className={fieldClasses(accent)}
                                />
                            </label>

                            <section aria-labelledby="contest-description-title">
                                <div className="flex items-center justify-between gap-3">
                                    <h3 id="contest-description-title" className={fieldLabelClasses}>
                                        Description
                                    </h3>
                                    <span className="rounded-full border border-white/10 bg-white/[0.035] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.1em] text-gray-500">
                                        {template === "multi_pick" ? "Edit values inline" : "Auto-generated"}
                                    </span>
                                </div>
                                {template === "multi_pick" ? (
                                    <fieldset
                                        data-contest-description-editor
                                        aria-describedby="contest-description-help"
                                        className="mt-2 rounded-xl border border-white/10 bg-black/25 px-4 py-3.5"
                                    >
                                        <legend className="sr-only">
                                            General Combo description settings
                                        </legend>
                                        <div className="space-y-2 text-sm font-normal normal-case leading-7 text-gray-400">
                                            <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                                                <span>Submit one</span>
                                                <label htmlFor="minimum-legs" className="sr-only">
                                                    Minimum legs
                                                </label>
                                                <input
                                                    id="minimum-legs"
                                                    type="number"
                                                    min={FEED_CONTEST_MIN_LEGS}
                                                    max={FEED_CONTEST_MAX_LEGS}
                                                    value={minLegsInput}
                                                    onChange={(event) => updateMinimumLegs(event.target.value)}
                                                    onBlur={() => setMinLegsInput(String(minLegs))}
                                                    className={`${inlineDescriptionInputClasses(accent)} w-10`}
                                                />
                                                <span aria-hidden="true">–</span>
                                                <label htmlFor="maximum-legs" className="sr-only">
                                                    Maximum legs
                                                </label>
                                                <input
                                                    id="maximum-legs"
                                                    type="number"
                                                    min={FEED_CONTEST_MIN_LEGS}
                                                    max={FEED_CONTEST_MAX_LEGS}
                                                    value={maxLegsInput}
                                                    onChange={(event) => updateMaximumLegs(event.target.value)}
                                                    onBlur={() => setMaxLegsInput(String(maxLegs))}
                                                    className={`${inlineDescriptionInputClasses(accent)} w-10`}
                                                />
                                                <span>
                                                    leg combo before entries lock. Every active leg must win.
                                                </span>
                                            </p>

                                            <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                                                <span>Minimum combined price:</span>
                                                <span className="inline-flex items-center">
                                                    {minimumCombinedOdds ? (
                                                        <span className="text-gray-600">+</span>
                                                    ) : null}
                                                    <label htmlFor="minimum-combined-odds" className="sr-only">
                                                        Minimum combined odds
                                                    </label>
                                                    <input
                                                        id="minimum-combined-odds"
                                                        type="number"
                                                        min={100}
                                                        step={5}
                                                        value={minimumCombinedOdds}
                                                        onChange={(event) =>
                                                            setMinimumCombinedOdds(event.target.value)
                                                        }
                                                        placeholder="No minimum"
                                                        className={`${inlineDescriptionInputClasses(accent)} w-24`}
                                                    />
                                                </span>
                                            </p>

                                            <label className="flex cursor-pointer items-center gap-3 py-1 text-gray-400">
                                                <input
                                                    id="allow-same-game-legs"
                                                    type="checkbox"
                                                    aria-label="Allow same-game legs"
                                                    checked={allowSameGameLegs}
                                                    onChange={(event) =>
                                                        setAllowSameGameLegs(event.target.checked)
                                                    }
                                                    className="peer sr-only"
                                                />
                                                <span
                                                    aria-hidden="true"
                                                    className={`relative h-5 w-9 shrink-0 rounded-full bg-white/10 ring-1 ring-inset ring-white/10 transition after:absolute after:left-1 after:top-1 after:h-3 after:w-3 after:rounded-full after:bg-gray-400 after:transition-transform peer-checked:after:translate-x-4 peer-checked:after:bg-white peer-focus-visible:ring-2 ${accentClasses.toggleOn}`}
                                                />
                                                <span className="whitespace-nowrap text-[13px] sm:text-sm">
                                                    {allowSameGameLegs
                                                        ? "Same-game legs allowed."
                                                        : "One leg per game."}
                                                </span>
                                            </label>

                                            <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                                                <span>The top</span>
                                                <label htmlFor="winning-places" className="sr-only">
                                                    Winning places
                                                </label>
                                                <input
                                                    id="winning-places"
                                                    type="number"
                                                    min={1}
                                                    max={5}
                                                    value={winningPlaces}
                                                    onChange={(event) =>
                                                        setWinningPlaces(Number(event.target.value))
                                                    }
                                                    className={`${inlineDescriptionInputClasses(accent)} w-10`}
                                                />
                                                <span>{winningPlaces === 1 ? "entry wins." : "entries win."}</span>
                                            </p>
                                        </div>
                                    </fieldset>
                                ) : (
                                    <div className="mt-2 rounded-xl border border-white/10 bg-black/25 px-4 py-3.5">
                                        <p className="text-sm font-normal normal-case leading-6 text-gray-400">
                                            {effectiveDescription}
                                        </p>
                                    </div>
                                )}
                                <p
                                    id="contest-description-help"
                                    className="mt-2 text-[11px] font-normal normal-case leading-5 text-gray-500"
                                >
                                    {template === "multi_pick"
                                        ? "Edit the highlighted values directly. The surrounding copy updates automatically. Participants do not accept this copy."
                                        : "Shown with the contest details. Participants do not accept this copy."}
                                </p>
                            </section>

                            <div>
                                <label className={fieldLabelClasses}>
                                    Rules participants must accept
                                    <textarea
                                        rows={4}
                                        value={rulesText}
                                        onChange={(event) => setRulesText(event.target.value)}
                                        aria-describedby="contest-rules-help"
                                        className={copyFieldClasses(accent)}
                                    />
                                </label>
                                <p
                                    id="contest-rules-help"
                                    className="mt-2 text-[11px] font-normal normal-case leading-5 text-gray-500"
                                >
                                    Entrants must review and check that they accept this copy before
                                    submitting an entry.
                                </p>
                            </div>

                            {template === "sunday_pickem" ? (
                                <label className={`${fieldLabelClasses} max-w-48`}>
                                    Winning places
                                    <input
                                        type="number"
                                        min={1}
                                        max={5}
                                        value={winningPlaces}
                                        onChange={(event) =>
                                            setWinningPlaces(Number(event.target.value))
                                        }
                                        className={fieldClasses(accent)}
                                    />
                                </label>
                            ) : null}
                        </div>
                    ) : null}

                    {step === "review" && template ? (
                        <div className="space-y-6">
                            <div>
                                <p
                                    className={`text-xs font-semibold uppercase tracking-[0.12em] ${accentClasses.textSoft}`}
                                >
                                    Step {currentStepIndex + 1} · Review
                                </p>
                                <h2 className="mt-2 text-2xl font-semibold text-white">
                                    Review and publish
                                </h2>
                                <p className="mt-2 text-sm leading-6 text-gray-400">
                                    Confirm the slate and rules, then publish the contest or save it
                                    as a draft.
                                </p>
                            </div>
                            <dl className="divide-y divide-white/10 border-y border-white/10">
                                {reviewRows.map(([label, value]) => (
                                    <div
                                        key={label}
                                        className="grid gap-1 py-3.5 sm:grid-cols-[11rem_1fr] sm:gap-5"
                                    >
                                        <dt className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-500">
                                            {label}
                                        </dt>
                                        <dd className="text-sm font-semibold normal-case leading-6 text-white">
                                            {value}
                                        </dd>
                                    </div>
                                ))}
                            </dl>
                            {rulesText.trim() ? (
                                <div className="border-b border-white/10 pb-4">
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-500">
                                        Rules participants must accept
                                    </p>
                                    <p className="mt-2 whitespace-pre-line text-sm normal-case leading-6 text-gray-300">
                                        {rulesText}
                                    </p>
                                </div>
                            ) : null}
                        </div>
                    ) : null}

                    {error ? (
                        <p role="alert" className="text-sm font-semibold text-red-200">
                            {error}
                        </p>
                    ) : null}

                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5">
                        <button
                            type="button"
                            disabled={currentStepIndex === 0}
                            onClick={() => navigateToStep(wizardSteps[currentStepIndex - 1].id)}
                            className="rounded-xl border border-white/15 px-4 py-2.5 text-xs font-semibold text-gray-300 transition hover:border-white/30 hover:text-white disabled:opacity-30"
                        >
                            Back
                        </button>
                        {step === "review" ? (
                            <div className="flex flex-wrap items-center justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => handleSubmit("draft")}
                                    disabled={Boolean(createDisabledReason) || submitting}
                                    className="rounded-xl border border-white/15 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.09em] text-gray-200 transition hover:border-white/30 hover:text-white disabled:opacity-40"
                                >
                                    {submitting && submittingMode === "draft"
                                        ? "Saving…"
                                        : "Save as Draft"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleSubmit("immediate")}
                                    disabled={
                                        Boolean(createDisabledReason) ||
                                        Boolean(publishDisabledReason) ||
                                        submitting
                                    }
                                    title={publishDisabledReason}
                                    className={`rounded-xl px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.09em] transition disabled:opacity-40 ${accentClasses.createButton}`}
                                >
                                    {submitting && submittingMode === "immediate"
                                        ? "Publishing…"
                                        : "Publish Contest"}
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={goForward}
                                className={`rounded-xl px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.09em] transition ${accentClasses.createButton}`}
                            >
                                Continue to {wizardSteps[currentStepIndex + 1]?.label ?? "Review"}
                            </button>
                        )}
                    </div>
                </div>
            </section>
        </div>
    );
};

export default FeedContestCreateForm;
