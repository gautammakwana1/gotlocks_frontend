"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import BackButton from "@/components/ui/BackButton";
import { useToast } from "@/lib/state/ToastContext";
import type {
    CreateArenaContestPayload,
    NFLSchedulesWithOdds,
    RootState,
} from "@/lib/interfaces/interfaces";
import {
    clearCreateArenaContestState,
    createArenaContestRequest,
} from "@/lib/redux/slices/arenaSlice";
import { fetchLiveNFLScheduleRequest } from "@/lib/redux/slices/nflSlice";
import { fromLocalInputValue, toLocalInputValue } from "@/lib/utils/date";

// Mirrors TEMPLATES / ENTRY_MODEL_BY_TEMPLATE in arenaController.ts — the
// endpoint rejects any template/entry_model pair that doesn't match this map.
const ENTRY_MODEL_BY_TEMPLATE: Record<string, string> = {
    single_pick: "single_pick",
    same_game_combo_challenge: "same_game_combo",
    sunday_pickem: "pickem_card",
};

const CONTEST_SPORT = "NFL";

const fieldLabelClasses =
    "block text-xs font-semibold uppercase tracking-[0.12em] text-gray-300";
const fieldClasses =
    "mt-2 w-full rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-sm normal-case text-white outline-none transition focus:border-sky-300/60 disabled:cursor-not-allowed disabled:opacity-50";

const TEMPLATE_OPTIONS: Array<{ value: string; label: string }> = [
    { value: "single_pick", label: "Single Pick" },
    { value: "same_game_combo_challenge", label: "Same-Game Combo Challenge" },
    { value: "sunday_pickem", label: "Sunday Pick’em" },
];

type SlateMode = "early_window" | "late_window" | "organizer_selected";

type ContestGameOption = {
    id: string;
    label: string;
    gameStartsAt: string;
    sundayWindow: "international" | "early" | "late" | "sunday_night" | null;
};

// One slot per validated field; keys double as the anchor for the inline
// message under that field.
type FieldErrors = Partial<
    Record<
        | "name"
        | "opensAt"
        | "locksAt"
        | "expectedEndsAt"
        | "winningPlaces"
        | "games"
        | "rules",
        string
    >
>;

// Sunday windows are defined against the NFL league clock (Eastern), not the
// viewer's timezone, so a late-window slate means the same games for everyone.
const scheduleParts = (gameStartsAt: string) => {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York",
        weekday: "short",
        hour: "numeric",
        hourCycle: "h23",
    }).formatToParts(new Date(gameStartsAt));
    return {
        weekday: parts.find((part) => part.type === "weekday")?.value ?? "",
        hour: Number(parts.find((part) => part.type === "hour")?.value ?? Number.NaN),
    };
};

const toGameOption = (event: NFLSchedulesWithOdds): ContestGameOption => {
    const { weekday, hour } = scheduleParts(event.date);
    return {
        id: event.id,
        label: `${event.teams.away.name} vs ${event.teams.home.name}`,
        gameStartsAt: event.date,
        sundayWindow:
            weekday !== "Sun" || !Number.isFinite(hour)
                ? null
                : hour < 13
                    ? "international"
                    : hour < 16
                        ? "early"
                        : hour < 20
                            ? "late"
                            : "sunday_night",
    };
};

const gameKickoffFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
});

export type ArenaContestCreateFormProps = {
    arenaId: string;
    contextName: string;
    backHref: string;
};

export const ArenaContestCreateForm = ({
    arenaId,
    contextName,
    backHref,
}: ArenaContestCreateFormProps) => {
    const router = useRouter();
    const dispatch = useDispatch();
    const { setToast } = useToast();
    const { createContestLoading, createdContest, createContestError, createContestMessage } =
        useSelector((state: RootState) => state.arena);
    const { nflSchedulesWithOdds, loading: schedulesLoading } = useSelector(
        (state: RootState) => state.nfl
    );

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [template, setTemplate] = useState("single_pick");
    const [sundayPickemSlateMode, setSundayPickemSlateMode] =
        useState<SlateMode>("organizer_selected");
    const [opensAt, setOpensAt] = useState(() =>
        new Date(Date.now() + 60 * 60 * 1000).toISOString()
    );
    const [locksAt, setLocksAt] = useState(() =>
        new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    );
    const [expectedEndsAt, setExpectedEndsAt] = useState(() =>
        new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
    );
    const [winningPlaces, setWinningPlaces] = useState(3);
    const [eligibleGameIds, setEligibleGameIds] = useState<string[]>([]);
    const [rulesText, setRulesText] = useState("");
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
    const [serverError, setServerError] = useState<string>();

    useEffect(() => {
        dispatch(fetchLiveNFLScheduleRequest(undefined));
    }, [dispatch]);

    // Terminal create states: the endpoint either echoed the inserted contest or
    // rejected the payload — deeper rules (role, unlock, hosting, limits) only
    // live server-side, so that path surfaces the API's own message.
    useEffect(() => {
        if (createdContest || createContestMessage) {
            setToast({
                id: Date.now(),
                type: "success",
                message: createContestMessage ?? "Arena contest created.",
                duration: 3000,
            });
            dispatch(clearCreateArenaContestState());
            router.replace(backHref);
            return;
        }
        if (createContestError) {
            setServerError(createContestError);
            setToast({
                id: Date.now(),
                type: "error",
                message: createContestError,
                duration: 4000,
            });
            dispatch(clearCreateArenaContestState());
        }
    }, [
        createdContest,
        createContestMessage,
        createContestError,
        backHref,
        dispatch,
        router,
        setToast,
    ]);

    // Upcoming games only — a contest slate can't include kicked-off matchups.
    const gameOptions = useMemo(
        () =>
            (nflSchedulesWithOdds?.events ?? [])
                .filter((event) => !event.live && Date.parse(event.date) > Date.now())
                .map(toGameOption)
                .sort(
                    (left, right) =>
                        Date.parse(left.gameStartsAt) - Date.parse(right.gameStartsAt) ||
                        left.id.localeCompare(right.id)
                ),
        [nflSchedulesWithOdds]
    );

    // Pick'em locks five minutes before the earliest selected kickoff and is
    // expected to end well after the latest one; the lock input stays disabled
    // for that template, so this is how its deadline gets set at all.
    const applySuggestedPickemTiming = (gameIds: readonly string[]) => {
        if (gameIds.length < 2) return;
        const kickoffTimes = gameIds
            .map((gameId) => gameOptions.find((option) => option.id === gameId))
            .filter((option): option is ContestGameOption => Boolean(option))
            .map((option) => Date.parse(option.gameStartsAt));
        if (
            kickoffTimes.length !== gameIds.length ||
            kickoffTimes.some((time) => !Number.isFinite(time))
        ) {
            return;
        }
        const earliestKickoff = Math.min(...kickoffTimes);
        const latestKickoff = Math.max(...kickoffTimes);
        setLocksAt(new Date(earliestKickoff - 5 * 60 * 1000).toISOString());
        if (!expectedEndsAt || Date.parse(expectedEndsAt) <= latestKickoff) {
            setExpectedEndsAt(new Date(latestKickoff + 8 * 60 * 60 * 1000).toISOString());
        }
    };

    const pickemGameOptions = (mode: SlateMode): readonly ContestGameOption[] =>
        gameOptions.filter((option) => {
            if (!option.sundayWindow) return false;
            if (mode === "early_window") return option.sundayWindow === "early";
            if (mode === "late_window") return option.sundayWindow === "late";
            return true;
        });

    const selectSuggestedPickemSlate = (mode: SlateMode) => {
        const gameIds = pickemGameOptions(mode).map((option) => option.id);
        setEligibleGameIds(gameIds);
        applySuggestedPickemTiming(gameIds);
    };

    const selectableGameOptions =
        template === "sunday_pickem"
            ? pickemGameOptions(sundayPickemSlateMode)
            : gameOptions;
    const fixedPickemWindow =
        template === "sunday_pickem" && sundayPickemSlateMode !== "organizer_selected";

    // Same shape checks the endpoint runs first (required fields, opens < locks
    // < expected ends, locks in the future, winning_places 1–5) so obvious
    // mistakes fail inline instead of costing a round-trip.
    const validate = (): FieldErrors => {
        const next: FieldErrors = {};
        if (!name.trim()) {
            next.name = "Contest name is required.";
        }
        const opensMs = Date.parse(opensAt);
        const locksMs = Date.parse(locksAt);
        const endsMs = Date.parse(expectedEndsAt);
        if (!opensAt || Number.isNaN(opensMs)) {
            next.opensAt = "Choose when the contest opens.";
        }
        if (!locksAt || Number.isNaN(locksMs)) {
            next.locksAt = "Choose the lock deadline.";
        } else if (locksMs <= Date.now()) {
            next.locksAt = "The lock deadline must be in the future.";
        } else if (!next.opensAt && opensMs >= locksMs) {
            next.locksAt = "The contest must open before it locks.";
        }
        if (!expectedEndsAt || Number.isNaN(endsMs)) {
            next.expectedEndsAt = "Choose the expected end.";
        } else if (!next.locksAt && !Number.isNaN(locksMs) && endsMs <= locksMs) {
            next.expectedEndsAt = "The expected end must be after lock.";
        }
        if (
            !Number.isInteger(winningPlaces) ||
            winningPlaces < 1 ||
            winningPlaces > 5
        ) {
            next.winningPlaces = "Winning places must be between 1 and 5.";
        }
        if (template === "same_game_combo_challenge") {
            if (eligibleGameIds.length !== 1) {
                next.games = "Same-Game Combo requires exactly one eligible NFL game.";
            }
        } else if (template === "sunday_pickem") {
            if (eligibleGameIds.length < 2) {
                next.games = "Sunday Pick’em requires at least two eligible games.";
            }
        } else if (eligibleGameIds.length === 0) {
            next.games = "Select at least one eligible game.";
        }
        if (!rulesText.trim()) {
            next.rules = "Add the rules participants must accept.";
        }
        return next;
    };

    const clearFieldError = (key: keyof FieldErrors) =>
        setFieldErrors((previous) => {
            if (!previous[key]) return previous;
            const next = { ...previous };
            delete next[key];
            return next;
        });

    const fieldClassFor = (invalid?: string) =>
        invalid ? `${fieldClasses} !border-red-400/60` : fieldClasses;

    const fieldError = (message?: string) =>
        message ? (
            <span
                role="alert"
                className="mt-1.5 block text-[11px] font-semibold normal-case text-red-300"
            >
                {message}
            </span>
        ) : null;

    const requiredMark = (
        <span aria-hidden className="text-red-300/80">
            {" "}*
        </span>
    );

    // datetime-local min attributes: past dates are unpickable, and each field's
    // floor advances to the previous one so the pickers steer toward a valid
    // opens < locks < expected-ends order.
    const nowLocal = toLocalInputValue(new Date().toISOString());
    const locksMinLocal = toLocalInputValue(opensAt) || nowLocal;
    const endsMinLocal = toLocalInputValue(locksAt) || nowLocal;

    const handleCreate = () => {
        if (createContestLoading) return;
        setServerError(undefined);

        const nextErrors = validate();
        setFieldErrors(nextErrors);
        if (Object.keys(nextErrors).length > 0) return;

        const payload: CreateArenaContestPayload = {
            arena_id: arenaId,
            name: name.trim(),
            description: description.trim(),
            template,
            entry_model: ENTRY_MODEL_BY_TEMPLATE[template],
            sport: CONTEST_SPORT,
            // Matches the backend's season convention (nowUtc.getUTCFullYear()).
            season_id: String(new Date().getUTCFullYear()),
            opens_at: opensAt,
            locks_at: locksAt,
            expected_ends_at: expectedEndsAt,
            winning_places: winningPlaces,
            eligible_game_ids: eligibleGameIds,
            rules_text: rulesText.trim(),
        };
        if (template === "sunday_pickem") {
            payload.sunday_pickem_slate_mode = sundayPickemSlateMode;
        }
        dispatch(createArenaContestRequest(payload));
    };

    return (
        <div className="flex flex-col gap-6 pb-10">
            <BackButton fallback={backHref} preferFallback />
            <header className="space-y-2 border-b border-white/10 pb-5">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-400">
                    {contextName} · Arena contest
                </p>
                <h1 className="text-3xl font-semibold text-white">Create contest</h1>
                <p className="max-w-2xl text-sm leading-6 text-gray-500">
                    Configure the shared lifecycle, deadline, eligibility, and rules. Entry
                    details remain separate from the traditional League Contest and Slip system.
                </p>
            </header>

            <section className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-950/80 via-slate-900/60 to-blue-950/45 p-5 shadow-lg sm:p-6">
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-sky-400/10 via-transparent to-blue-400/10" />
                <div className="relative space-y-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <label className={fieldLabelClasses}>
                            Contest name{requiredMark}
                            <input
                                value={name}
                                onChange={(event) => {
                                    setName(event.target.value);
                                    clearFieldError("name");
                                }}
                                placeholder="Opening night challenge"
                                className={fieldClassFor(fieldErrors.name)}
                                aria-invalid={Boolean(fieldErrors.name)}
                            />
                            {fieldError(fieldErrors.name)}
                        </label>
                        <label className={fieldLabelClasses}>
                            Entry framework{requiredMark}
                            <select
                                value={template}
                                onChange={(event) => {
                                    const nextTemplate = event.target.value;
                                    setTemplate(nextTemplate);
                                    clearFieldError("games");
                                    clearFieldError("locksAt");
                                    if (nextTemplate === "sunday_pickem") {
                                        selectSuggestedPickemSlate(sundayPickemSlateMode);
                                    } else if (nextTemplate === "same_game_combo_challenge") {
                                        setEligibleGameIds(
                                            gameOptions.slice(0, 1).map((option) => option.id)
                                        );
                                    } else {
                                        setEligibleGameIds([]);
                                    }
                                }}
                                className={fieldClasses}
                                aria-describedby="entry-framework-help"
                            >
                                {TEMPLATE_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                            <span
                                id="entry-framework-help"
                                className="mt-2 block text-[11px] normal-case leading-5 text-gray-600"
                            >
                                {template === "same_game_combo_challenge"
                                    ? "Participants choose four to eight supported legs from one eligible NFL game at combined odds of at least +300."
                                    : template === "sunday_pickem"
                                        ? "Arena members choose one outright moneyline winner for every included Sunday game."
                                        : "Participants submit one priced selection through the existing Feed composer."}
                            </span>
                        </label>
                    </div>

                    {template === "sunday_pickem" ? (
                        <label className={fieldLabelClasses}>
                            Slate mode
                            <select
                                value={sundayPickemSlateMode}
                                onChange={(event) => {
                                    const nextMode = event.target.value as SlateMode;
                                    setSundayPickemSlateMode(nextMode);
                                    clearFieldError("games");
                                    selectSuggestedPickemSlate(nextMode);
                                }}
                                className={fieldClasses}
                            >
                                <option value="early_window">Early Window</option>
                                <option value="late_window">Late Window</option>
                                <option value="organizer_selected">
                                    Organizer-Selected Sunday slate
                                </option>
                            </select>
                            <span className="mt-2 block text-[11px] normal-case leading-5 text-gray-600">
                                Early and late modes accept games from that Sunday window.
                                Organizer-selected slates may also include international Sunday
                                games and Sunday Night Football.
                            </span>
                        </label>
                    ) : null}

                    <label className={fieldLabelClasses}>
                        Description
                        <span className="normal-case tracking-normal text-gray-600">
                            {" "}· optional
                        </span>
                        <textarea
                            rows={3}
                            value={description}
                            onChange={(event) => setDescription(event.target.value)}
                            placeholder="What participants should know before joining"
                            className={fieldClasses}
                        />
                    </label>

                    <div className="h-px bg-white/10" />

                    <div className="grid gap-4 sm:grid-cols-3">
                        <label className={fieldLabelClasses}>
                            Opens{requiredMark}
                            <input
                                type="datetime-local"
                                value={toLocalInputValue(opensAt)}
                                min={nowLocal}
                                onChange={(event) => {
                                    setOpensAt(fromLocalInputValue(event.target.value));
                                    clearFieldError("opensAt");
                                    clearFieldError("locksAt");
                                }}
                                className={fieldClassFor(fieldErrors.opensAt)}
                                aria-invalid={Boolean(fieldErrors.opensAt)}
                            />
                            {fieldError(fieldErrors.opensAt)}
                        </label>
                        <label className={fieldLabelClasses}>
                            Locks{requiredMark}
                            <input
                                type="datetime-local"
                                value={toLocalInputValue(locksAt)}
                                min={locksMinLocal}
                                onChange={(event) => {
                                    setLocksAt(fromLocalInputValue(event.target.value));
                                    clearFieldError("locksAt");
                                    clearFieldError("expectedEndsAt");
                                }}
                                className={fieldClassFor(fieldErrors.locksAt)}
                                aria-invalid={Boolean(fieldErrors.locksAt)}
                                disabled={template === "sunday_pickem"}
                            />
                            {fieldError(fieldErrors.locksAt)}
                        </label>
                        <label className={fieldLabelClasses}>
                            Expected end{requiredMark}
                            <input
                                type="datetime-local"
                                value={toLocalInputValue(expectedEndsAt)}
                                min={endsMinLocal}
                                onChange={(event) => {
                                    setExpectedEndsAt(fromLocalInputValue(event.target.value));
                                    clearFieldError("expectedEndsAt");
                                }}
                                className={fieldClassFor(fieldErrors.expectedEndsAt)}
                                aria-invalid={Boolean(fieldErrors.expectedEndsAt)}
                            />
                            {fieldError(fieldErrors.expectedEndsAt)}
                        </label>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
                        <label className={fieldLabelClasses}>
                            Winning places{requiredMark}
                            <input
                                type="number"
                                min={1}
                                max={5}
                                step={1}
                                value={winningPlaces}
                                onChange={(event) => {
                                    setWinningPlaces(Number(event.target.value));
                                    clearFieldError("winningPlaces");
                                }}
                                className={fieldClassFor(fieldErrors.winningPlaces)}
                                aria-invalid={Boolean(fieldErrors.winningPlaces)}
                            />
                            {fieldError(fieldErrors.winningPlaces)}
                        </label>
                        <fieldset className={fieldLabelClasses}>
                            <legend>Eligible games{requiredMark}</legend>
                            <div
                                className={`mt-2 max-h-64 space-y-2 overflow-y-auto rounded-xl border bg-black/40 p-3 ${fieldErrors.games ? "border-red-400/60" : "border-white/10"}`}
                            >
                                {selectableGameOptions.map((option) => {
                                    const checked = eligibleGameIds.includes(option.id);
                                    const singleChoice =
                                        template === "same_game_combo_challenge";
                                    return (
                                        <label
                                            key={option.id}
                                            className="flex cursor-pointer items-start gap-3 rounded-lg border border-white/5 bg-white/[0.025] px-3 py-2.5 normal-case transition hover:border-white/15"
                                        >
                                            <input
                                                type={singleChoice ? "radio" : "checkbox"}
                                                name={singleChoice ? "eligible-combo-game" : undefined}
                                                checked={checked}
                                                disabled={fixedPickemWindow}
                                                onChange={() => {
                                                    const gameIds = singleChoice
                                                        ? [option.id]
                                                        : checked
                                                            ? eligibleGameIds.filter(
                                                                (gameId) => gameId !== option.id
                                                            )
                                                            : [...eligibleGameIds, option.id];
                                                    setEligibleGameIds(gameIds);
                                                    clearFieldError("games");
                                                    if (template === "sunday_pickem") {
                                                        applySuggestedPickemTiming(gameIds);
                                                    }
                                                }}
                                                className="mt-1 h-4 w-4 accent-sky-400"
                                            />
                                            <span className="min-w-0">
                                                <span className="block text-sm font-semibold text-white">
                                                    {option.label}
                                                </span>
                                                <span className="mt-0.5 block text-[11px] font-medium text-gray-500">
                                                    {gameKickoffFormatter.format(
                                                        new Date(option.gameStartsAt)
                                                    )}
                                                </span>
                                            </span>
                                        </label>
                                    );
                                })}
                                {selectableGameOptions.length === 0 ? (
                                    <p className="px-1 py-2 text-xs normal-case leading-5 text-gray-500">
                                        {schedulesLoading
                                            ? "Loading upcoming games…"
                                            : "No upcoming games are available for this entry framework."}
                                    </p>
                                ) : null}
                            </div>
                            {fieldError(fieldErrors.games)}
                            <span className="mt-2 block text-[11px] normal-case leading-5 text-gray-600">
                                {template === "sunday_pickem"
                                    ? sundayPickemSlateMode === "organizer_selected"
                                        ? "Choose at least two Sunday matchups. The deadline updates to five minutes before the earliest selected kickoff."
                                        : "The complete selected Sunday window is included automatically, with a deadline five minutes before its earliest kickoff."
                                    : template === "same_game_combo_challenge"
                                        ? "Choose the one NFL matchup this contest's combos are built from."
                                        : "Choose at least one game participants can pick from."}
                            </span>
                        </fieldset>
                    </div>

                    <div className="h-px bg-white/10" />

                    <label className={fieldLabelClasses}>
                        Rules participants must accept{requiredMark}
                        <textarea
                            rows={6}
                            value={rulesText}
                            onChange={(event) => {
                                setRulesText(event.target.value);
                                clearFieldError("rules");
                            }}
                            placeholder="State the complete-entry requirement, deadline, grading, tie-breakers, and eligibility."
                            className={fieldClassFor(fieldErrors.rules)}
                            aria-invalid={Boolean(fieldErrors.rules)}
                        />
                        {fieldError(fieldErrors.rules)}
                    </label>

                    {serverError ? (
                        <p role="alert" className="text-sm font-semibold text-red-200">
                            {serverError}
                        </p>
                    ) : null}

                    <button
                        type="button"
                        onClick={handleCreate}
                        disabled={createContestLoading}
                        className="w-full rounded-xl bg-sky-500/25 px-5 py-3 text-sm font-semibold uppercase tracking-[0.09em] text-sky-100 transition hover:bg-sky-500/35 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
                    >
                        {createContestLoading ? "Creating…" : "Create Arena contest"}
                    </button>
                </div>
            </section>
        </div>
    );
};

export default ArenaContestCreateForm;
