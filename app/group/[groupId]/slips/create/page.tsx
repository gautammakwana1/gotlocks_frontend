"use client";

import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import BackButton from "@/components/ui/BackButton";
import { fromLocalInputValue, toLocalInputValue, formatDateTime } from "@/lib/utils/date";
import { DEFAULT_ELIGIBLE_WINDOW_DAYS, eligibleWindowEnd } from "@/lib/utils/games";
import { Group, GroupSelector, LeaderboardList, SlipSelector } from "@/lib/interfaces/interfaces";
import { useDispatch, useSelector } from "react-redux";
import { clearCreateSlipMessage, createSlipRequest } from "@/lib/redux/slices/slipSlice";
import { GroupDataShape } from "../../page";
import { fetchAllLeaderboardsRequest, fetchGroupByIdRequest } from "@/lib/redux/slices/groupsSlice";
import { useToast } from "@/lib/state/ToastContext";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";

type Step = 1 | 2;
type DeadlinesOverviewModalProps = {
    open: boolean;
    onClose: () => void;
    windowDays: number;
};

const SPORTS = ["NFL", "NBA", "NCAAF", "NCAAB", "NHL", "MLB", "Soccer"];
const WINDOW_DAY_OPTIONS = [1, 2, 3, 4, 5];
const MODE_INFO = {
    overview: {
        title: "Slip types",
        summary: "Quick breakdown of leaderboard vs vibe slips.",
        bullets: [
            <>
                <span className="font-semibold text-amber-200">Leaderboard slips</span> count
                toward standings, allow one pick per member, and can only be created by the
                commissioner.
            </>,
            <>
                <span className="font-semibold text-amber-200">Vibe slips</span> are casual,
                XP-only, allow multiple picks, and can be created by any member.
            </>,
        ] as ReactNode[],
    },
    leaderboard: {
        title: "Leaderboard slip",
        summary: "Leaderboard slips impact leaderboard rankings.",
        bullets: [
            <>
                one pick per member, scored with odds tiers to fuel the{" "}
                <span className="font-semibold text-amber-200">leaderboard</span>.
            </>,
            <>
                only the{" "}
                <span className="font-semibold text-amber-200">commissioner</span> can create
                leaderboard slips to keep scoring consistent.
            </>,
            <>perfect for proving who actually knows ball each week.</>,
        ] as ReactNode[],
    },
    vibe: {
        title: "Vibe slip",
        summary: "Vibe slips are casual and award XP only.",
        bullets: [
            <>any member can create one for quick, low-stakes bragging rights.</>,
            <>
                <span className="font-semibold text-amber-200">multi-pick only</span> so
                friends can fire off as many picks as they want.
            </>,
            <>great for lottery plays, gut calls, and testing instincts.</>,
        ] as ReactNode[],
    },
} as const;

const hasNestedGroup = (
    value: GroupDataShape
): value is { group?: Group | null } => {
    return Boolean(value && typeof value === "object" && "group" in value);
};

const extractGroup = (data: GroupDataShape): Group | null => {
    if (!data) {
        return null;
    }

    if (hasNestedGroup(data)) {
        return data.group ?? null;
    }

    return data;
};

const SlipCreationPage = () => {
    const dispatch = useDispatch();
    const params = useParams<{ groupId: string }>();
    const searchParams = useSearchParams();
    const router = useRouter();
    const { setToast } = useToast();
    const currentUser = useCurrentUser();
    const [step, setStep] = useState<Step>(1);
    const [modeInfoOpen, setModeInfoOpen] = useState<keyof typeof MODE_INFO | null>(null);
    const [showDeadlinesOverview, setShowDeadlinesOverview] = useState(false);
    const [slipCreating, setSlipCreating] = useState(false);
    const initialIsGraded = searchParams.get("mode") === "vibe" ? false : true;
    const [form, setForm] = useState({
        name: "",
        sports: [] as string[],
        isGraded: initialIsGraded,
        pickDeadline: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
        windowDays: DEFAULT_ELIGIBLE_WINDOW_DAYS,
        sideLeaderboardId: null as string | null,
    });
    const rawGroup = useSelector((state: GroupSelector) => state.group.group);
    const group = useMemo(() => extractGroup(rawGroup as GroupDataShape), [rawGroup]);
    const { slip, loading: slipLoading, message: slipMessage, error: slipError } = useSelector((state: SlipSelector) => state.slip);
    const isCommissioner = currentUser && group && currentUser.userId === group.created_by;
    const windowDropdownRef = useRef<HTMLDivElement | null>(null);
    const [windowDropdownOpen, setWindowDropdownOpen] = useState(false);
    const [leaderboardDataList, setLeaderboardDataList] = useState<LeaderboardList[]>([]);
    const [showNameError, setShowNameError] = useState(false);
    const [showSportsError, setShowSportsError] = useState(false);
    const { leaderboardList: leaderboardListData } = useSelector((state: GroupSelector) => state.group);

    useEffect(() => {
        if (!params.groupId || !currentUser) return;
        dispatch(fetchGroupByIdRequest({ groupId: params.groupId }));
        dispatch(fetchAllLeaderboardsRequest({ group_id: params.groupId }))
    }, [params.groupId, currentUser, dispatch]);
    useEffect(() => {
        if (Array.isArray(leaderboardListData)) {
            setLeaderboardDataList(leaderboardListData)
        }
    }, [leaderboardListData]);

    useEffect(() => {
        if (!slipLoading && slipMessage && slip) {
            setToast({
                id: Date.now(),
                type: "success",
                message: slipMessage,
                duration: 3000
            });
            dispatch(clearCreateSlipMessage());
            if (group?.id && slip.id) {
                // setSlipCreating(false)
                router.replace(`/group/${group?.id}/slips/${slip.id}`)
            };
        }
        if (!slipLoading && slipError) {
            setToast({
                id: Date.now(),
                type: "error",
                message: slipError,
                duration: 3000
            });
            dispatch(clearCreateSlipMessage());
            // setSlipCreating(false)
        }
    }, [slipLoading, slipMessage, slipError, dispatch, slip, setToast, group, router]);

    const slipIsFantasy = isCommissioner ? form.isGraded : false;
    const enforcedPickLimit: 1 | "unlimited" = slipIsFantasy ? 1 : "unlimited";
    const eligibilityEnd = eligibleWindowEnd(form.pickDeadline, form.windowDays);
    const slipNameSuggestion = "ex: NFL week 16 - locks only";

    const groupLeaderboards = useMemo(
        () => leaderboardDataList.filter((board) => board.group_id === group?.id),
        [leaderboardDataList, group?.id]
    );
    const secondaryLeaderboardsEnabled =
        group?.is_enable_secondary_leaderboard ?? false;
    const defaultLeaderboard = useMemo(
        () =>
            groupLeaderboards.find((board) => board.isDefault && board.status === "ACTIVE") ??
            groupLeaderboards.find((board) => board.isDefault) ??
            null,
        [groupLeaderboards]
    );
    const activeSideLeaderboards = useMemo(
        () =>
            secondaryLeaderboardsEnabled
                ? groupLeaderboards.filter(
                    (board) => !board.isDefault && board.status === "ACTIVE"
                )
                : [],
        [groupLeaderboards, secondaryLeaderboardsEnabled]
    );
    const selectedSideLeaderboard = useMemo(
        () =>
            groupLeaderboards.find((board) => board.id === form.sideLeaderboardId) ??
            null,
        [form.sideLeaderboardId, groupLeaderboards]
    );

    useEffect(() => {
        if (!windowDropdownOpen) return;
        const handler = (event: MouseEvent | TouchEvent) => {
            if (!windowDropdownRef.current) return;
            if (!windowDropdownRef.current.contains(event.target as Node)) {
                setWindowDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        document.addEventListener("touchstart", handler);
        return () => {
            document.removeEventListener("mousedown", handler);
            document.removeEventListener("touchstart", handler);
        };
    }, [windowDropdownOpen]);

    useEffect(() => {
        if (!secondaryLeaderboardsEnabled) {
            if (form.sideLeaderboardId) {
                setForm((prev) => ({ ...prev, sideLeaderboardId: null }));
            }
            return;
        }
        if (!form.sideLeaderboardId) return;
        if (!activeSideLeaderboards.some((board) => board.id === form.sideLeaderboardId)) {
            setForm((prev) => ({ ...prev, sideLeaderboardId: null }));
        }
    }, [activeSideLeaderboards, form.sideLeaderboardId, secondaryLeaderboardsEnabled]);

    if (!group || !currentUser) {
        // router.replace("/home");
        return null;
    }

    const toggleSport = (sport: string) => {
        setForm((prev) => {
            const exists = prev.sports.includes(sport);
            const nextSports = exists
                ? prev.sports.filter((s) => s !== sport)
                : [...prev.sports, sport];
            if (showSportsError && nextSports.length > 0) {
                setShowSportsError(false);
            }
            return {
                ...prev,
                sports: nextSports,
            };
        });
    };

    const handleModeSelect = (isFantasy: boolean) => {
        if (isFantasy && !isCommissioner) return;
        setForm((prev) => ({
            ...prev,
            isGraded: isFantasy,
            sideLeaderboardId: isFantasy && secondaryLeaderboardsEnabled ? prev.sideLeaderboardId : null,
        }));
    };

    const isNameMissing = !form.name.trim();
    const hasSports = form.sports.length > 0;
    const isSportsMissing = !hasSports;
    const hasPickDeadline = Boolean(form.pickDeadline);

    const canAdvance = () => {
        if (step === 1) {
            return !isNameMissing && hasSports && hasPickDeadline;
        }
        return true;
    };

    const handleNext = () => {
        if (!canAdvance()) {
            if (isNameMissing) setShowNameError(true);
            if (isSportsMissing) setShowSportsError(true);
            return;
        }
        setStep((prev) => (prev < 2 ? ((prev + 1) as Step) : prev));
    };

    const handleSubmit = () => {
        const slipType = slipIsFantasy ? "fantasy" : "vibe"
        setSlipCreating(true);
        dispatch(createSlipRequest({
            group_id: group.id,
            name: form.name,
            sports: form.sports,
            isGraded: slipIsFantasy,
            pickLimit: enforcedPickLimit,
            pickDeadline: form.pickDeadline,
            windowDays: form.windowDays,
            leaderboardId: slipIsFantasy && secondaryLeaderboardsEnabled ? form.sideLeaderboardId : null,
            slip_type: slipType,
        }));
    };

    const renderStepContent = () => {
        switch (step) {
            case 1: {
                return (
                    <div className="flex flex-col gap-6">
                        <div className="flex flex-col gap-4">
                            <div className="flex flex-col gap-3">
                                <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                                    <span className="font-semibold uppercase tracking-[0.14em] text-gray-300">
                                        slip name
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <div className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/60 p-1 text-[10px] font-semibold uppercase tracking-wide text-gray-300">
                                            <button
                                                type="button"
                                                onClick={() => handleModeSelect(true)}
                                                disabled={!isCommissioner}
                                                aria-pressed={slipIsFantasy}
                                                title={
                                                    isCommissioner
                                                        ? "Leaderboard slip"
                                                        : "Commissioner-only"
                                                }
                                                className={`rounded-full px-2.5 py-1 transition ${slipIsFantasy
                                                    ? "bg-sky-500/30 text-sky-100"
                                                    : "text-gray-400 hover:text-white"
                                                    } ${!isCommissioner ? "cursor-not-allowed opacity-60" : ""}`}
                                            >
                                                leaderboard
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleModeSelect(false)}
                                                aria-pressed={!slipIsFantasy}
                                                className={`rounded-full px-2.5 py-1 transition ${!slipIsFantasy
                                                    ? "bg-sky-500/30 text-sky-100"
                                                    : "text-gray-400 hover:text-white"
                                                    }`}
                                            >
                                                vibe
                                            </button>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setModeInfoOpen("overview")}
                                            className="flex h-6 w-6 items-center justify-center rounded-full border border-white/10 text-[11px] font-semibold text-gray-300 transition hover:border-sky-300/60 hover:text-white"
                                            aria-label="Slip type info"
                                        >
                                            i
                                        </button>
                                    </div>
                                </div>

                                <input
                                    value={form.name}
                                    onChange={(event) => {
                                        const nextValue = event.target.value;
                                        setForm((prev) => ({ ...prev, name: nextValue }));
                                        if (showNameError && nextValue.trim()) {
                                            setShowNameError(false);
                                        }
                                    }}
                                    className={`no-focus-ring rounded-lg border bg-black/70 px-4 py-3 text-sm text-white outline-none transition ${showNameError && !form.name.trim()
                                        ? "border-rose-400/70 focus:border-rose-400/80"
                                        : "border-white/15 focus:border-sky-400/70"
                                        }`}
                                    placeholder={slipNameSuggestion}
                                />
                                {showNameError && !form.name.trim() && (
                                    <p className="text-[11px] text-rose-300">
                                        Add a slip name to continue.
                                    </p>
                                )}
                            </div>

                            <div className="h-px bg-white/10" />

                            {slipIsFantasy && secondaryLeaderboardsEnabled && (
                                <>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="font-semibold uppercase tracking-[0.14em] text-gray-300">
                                                counts toward
                                            </span>
                                            <span className="rounded-full bg-white/5 px-3 py-1 text-[11px] font-semibold tracking-wide text-gray-300">
                                                main + optional secondary
                                            </span>
                                        </div>
                                        <div className="space-y-3">
                                            <label className="flex items-center gap-3 rounded-lg border border-slate-800/80 bg-slate-950/60 px-3 py-2 text-sm text-white">
                                                <input
                                                    type="checkbox"
                                                    checked
                                                    disabled
                                                    className="h-4 w-4 rounded border border-white/20 bg-black text-sky-500"
                                                />
                                                <span className="text-sm font-semibold text-white">
                                                    {defaultLeaderboard?.name ?? "Main Leaderboard"}
                                                </span>
                                                <span className="text-[11px] uppercase tracking-wide text-gray-400">
                                                    always on
                                                </span>
                                            </label>

                                            {secondaryLeaderboardsEnabled ? (
                                                activeSideLeaderboards.length > 0 ? (
                                                    <label className="flex flex-col gap-2 text-sm text-gray-200">
                                                        <span className="text-xs uppercase tracking-wide text-gray-400">
                                                            Secondary leaderboard (optional)
                                                        </span>
                                                        <select
                                                            value={form.sideLeaderboardId ?? ""}
                                                            onChange={(event) =>
                                                                setForm((prev) => ({
                                                                    ...prev,
                                                                    sideLeaderboardId: event.target.value || null,
                                                                }))
                                                            }
                                                            className="rounded-lg border border-slate-800/80 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400/70"
                                                        >
                                                            <option value="">No secondary leaderboard</option>
                                                            {activeSideLeaderboards.map((board) => (
                                                                <option key={board.id} value={board.id}>
                                                                    {board.name}
                                                                </option>
                                                            ))}
                                                        </select>
                                                        <p className="text-[11px] text-gray-400">
                                                            If you choose one, this slip counts toward both the Main Leaderboard
                                                            and this Secondary Leaderboard&apos;s standings.
                                                        </p>
                                                    </label>
                                                ) : (
                                                    <p className="text-xs text-gray-500">
                                                        Create a secondary leaderboard in Group Settings to add a second
                                                        leaderboard.
                                                    </p>
                                                )
                                            ) : null}
                                        </div>
                                    </div>
                                    <div className="h-px bg-white/10" />
                                </>
                            )}

                            <div className="flex flex-col gap-2">
                                <span className="text-xs tracking-wide text-gray-400">
                                    sport leagues (multi-select)
                                </span>
                                <p className="text-xs text-gray-500">
                                    <span className="font-semibold text-gray-500">choose one</span> or{" "}
                                    <span className="font-semibold text-gray-500">more leagues</span> the slip can pull games from.
                                </p>
                                <div
                                    className={`flex w-full gap-2 overflow-x-auto rounded-lg border bg-slate-950/60 p-1 scrollbar-hide ${showSportsError && isSportsMissing
                                        ? "border-rose-400/70"
                                        : "border-slate-800/80"
                                        }`}
                                >
                                    {SPORTS.map((sport) => {
                                        const active = form.sports.includes(sport);
                                        return (
                                            <button
                                                key={sport}
                                                type="button"
                                                onClick={() => toggleSport(sport)}
                                                className={`allow-league-caps whitespace-nowrap rounded-md border px-3 py-2 text-xs font-semibold uppercase tracking-wide transition ${active
                                                    ? "border-sky-300/70 bg-gradient-to-b from-sky-500/25 via-sky-500/10 to-blue-900/20 text-white shadow-[0_6px_16px_-12px_rgba(59,130,246,0.8)]"
                                                    : "border-transparent text-gray-400 hover:border-white/10 hover:text-white"
                                                    }`}
                                            >
                                                {sport}
                                            </button>
                                        );
                                    })}
                                </div>
                                {showSportsError && isSportsMissing && (
                                    <p className="text-[11px] text-rose-300">
                                        Select at least one sport to continue.
                                    </p>
                                )}
                            </div>

                            <div className="h-px bg-white/10" />

                            <div className="flex flex-col gap-3">
                                <div className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2">
                                        <label
                                            htmlFor="pick-deadline-input"
                                            className="font-semibold uppercase tracking-[0.14em] text-gray-300"
                                        >
                                            pick deadline
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => setShowDeadlinesOverview(true)}
                                            className="flex h-6 w-6 items-center justify-center rounded-full border border-white/10 text-[11px] font-semibold text-gray-300 transition hover:border-sky-300/60 hover:text-white"
                                            aria-label="Pick deadline info"
                                        >
                                            i
                                        </button>
                                    </div>
                                </div>
                                <input
                                    id="pick-deadline-input"
                                    type="datetime-local"
                                    value={toLocalInputValue(form.pickDeadline)}
                                    onChange={(event) =>
                                        setForm((prev) => ({
                                            ...prev,
                                            pickDeadline: fromLocalInputValue(event.target.value),
                                        }))
                                    }
                                    className="no-focus-ring rounded-lg border border-white/15 bg-black/70 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400/70"
                                />
                            </div>

                            <div className="h-px bg-white/10" />

                            <div className="flex flex-col gap-3">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="font-semibold uppercase tracking-[0.14em] text-gray-300">
                                        slate window
                                    </span>
                                    <span className="rounded-full bg-white/5 px-3 py-1 text-[11px] font-semibold tracking-wide text-gray-300">
                                        choose 1-5 days
                                    </span>
                                </div>
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                                    {/* relative + elevated stacking to keep custom dropdown above blurred/gradient card on mobile */}
                                    <div className="relative z-50 w-full sm:w-auto" ref={windowDropdownRef}>
                                        <button
                                            type="button"
                                            onClick={() => setWindowDropdownOpen((prev) => !prev)}
                                            className="flex w-full items-center justify-between gap-3 rounded-lg border border-white/15 bg-black/80 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400/70 focus:shadow-[0_0_0_1px_rgba(59,130,246,0.35)] sm:w-[200px]"
                                            aria-haspopup="listbox"
                                            aria-expanded={windowDropdownOpen}
                                        >
                                            <span className="allow-league-caps">
                                                {form.windowDays} day{form.windowDays === 1 ? "" : "s"}
                                            </span>
                                            <span className="text-sm text-gray-300">
                                                {windowDropdownOpen ? "▴" : "▾"}
                                            </span>
                                        </button>
                                        {windowDropdownOpen && (
                                            <div className="absolute left-0 right-0 top-full mt-1 rounded-lg border border-white/20 bg-black shadow-[0_20px_50px_rgba(0,0,0,0.55)] sm:w-[200px]">
                                                <ul role="listbox" className="max-h-60 overflow-y-auto py-1">
                                                    {WINDOW_DAY_OPTIONS.map((option) => (
                                                        <li key={option}>
                                                            <button
                                                                type="button"
                                                                className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm transition hover:bg-white/5 ${form.windowDays === option
                                                                    ? "text-sky-100"
                                                                    : "text-gray-200"
                                                                    }`}
                                                                onClick={() => {
                                                                    setForm((prev) => ({ ...prev, windowDays: option }));
                                                                    setWindowDropdownOpen(false);
                                                                }}
                                                                role="option"
                                                                aria-selected={form.windowDays === option}
                                                            >
                                                                <span className="allow-league-caps">
                                                                    {option} day{option === 1 ? "" : "s"}
                                                                </span>
                                                                {form.windowDays === option && (
                                                                    <span className="text-sky-200">•</span>
                                                                )}
                                                            </button>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-gray-500 sm:text-xs">
                                        <span className="sm:hidden">
                                            available game markets are limited to games starting after the pick
                                            deadline and before {formatDateTime(eligibilityEnd ?? "")}.
                                        </span>
                                        <span className="hidden sm:block">
                                            available game markets are limited to games starting after the pick
                                            deadline
                                        </span>
                                        <span className="hidden sm:block">
                                            and before {formatDateTime(eligibilityEnd ?? "")}.
                                        </span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            }
            case 2:
                return (
                    <div className="flex flex-col gap-4">
                        <h2 className="text-xl font-semibold text-white">review &amp; create</h2>

                        <div className="relative overflow-hidden rounded-xl border border-slate-800/80 bg-gradient-to-br from-slate-950/75 via-slate-900/55 to-blue-900/30 shadow-lg">
                            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-sky-400/10 via-transparent to-blue-400/10" />
                            <div className="relative space-y-4 p-4 sm:p-5">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm uppercase tracking-[0.14em] text-gray-300">summary</p>
                                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-400">
                                            confirm slip details
                                        </p>
                                    </div>
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="flex items-start gap-3">
                                        <div className="mt-2 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-sky-300/80 shadow-[0_0_0_4px_rgba(59,130,246,0.12)]" />
                                        <div className="space-y-1">
                                            <p className="text-[11px] uppercase tracking-wide text-gray-400">slip name</p>
                                            <p className="text-white text-sm">{form.name || "—"}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="mt-2 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-sky-300/80 shadow-[0_0_0_4px_rgba(59,130,246,0.12)]" />
                                        <div className="space-y-1">
                                            <p className="text-[11px] uppercase tracking-wide text-gray-400">sports leagues</p>
                                            <p className="text-white text-sm">
                                                {form.sports.length > 0 ? (
                                                    <span className="allow-league-caps">{form.sports.join(", ")}</span>
                                                ) : (
                                                    "multiple sports allowed"
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="mt-2 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-sky-300/80 shadow-[0_0_0_4px_rgba(59,130,246,0.12)]" />
                                        <div className="space-y-1">
                                            <p className="text-[11px] uppercase tracking-wide text-gray-400">mode</p>
                                            <p className="text-white text-sm">
                                                {slipIsFantasy ? "leaderboard slip" : "vibe slip"}
                                            </p>
                                        </div>
                                    </div>
                                    {slipIsFantasy && (
                                        <div className="flex items-start gap-3">
                                            <div className="mt-2 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-sky-300/80 shadow-[0_0_0_4px_rgba(59,130,246,0.12)]" />
                                            <div className="space-y-1">
                                                <p className="text-[11px] uppercase tracking-wide text-gray-400">
                                                    counts toward
                                                </p>
                                                <p className="text-white text-sm">
                                                    {defaultLeaderboard?.name ?? "Main Leaderboard"}
                                                    {selectedSideLeaderboard
                                                        ? ` + ${selectedSideLeaderboard.name}`
                                                        : ""}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                    <div className="flex items-start gap-3">
                                        <div className="mt-2 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-sky-300/80 shadow-[0_0_0_4px_rgba(59,130,246,0.12)]" />
                                        <div className="space-y-1">
                                            <p className="text-[11px] uppercase tracking-wide text-gray-400">pick deadline</p>
                                            <p className="text-white text-sm">{formatDateTime(form.pickDeadline)}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="mt-2 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-sky-300/80 shadow-[0_0_0_4px_rgba(59,130,246,0.12)]" />
                                        <div className="space-y-1">
                                            <p className="text-[11px] uppercase tracking-wide text-gray-400">slate window</p>
                                            <p className="text-white text-sm">
                                                {form.windowDays} day{form.windowDays === 1 ? "" : "s"}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <>
            <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between text-xs tracking-wide text-gray-500">
                    <BackButton fallback={`/group/${group.id}?tab=slips${form.isGraded ? `` : `&mode=vibe`}`} preferFallback />
                    <span>step {step} / 2</span>
                </div>

                <div className="rounded-xl border border-slate-800/80 bg-gradient-to-br from-slate-950/75 via-slate-900/55 to-blue-900/35 p-6 shadow-lg backdrop-blur">
                    {renderStepContent()}
                </div>

                <div className="flex items-center justify-end gap-2">
                    {step > 1 && (
                        <button
                            type="button"
                            onClick={() => setStep((prev) => (prev > 1 ? ((prev - 1) as Step) : prev))}
                            className="rounded-lg border border-slate-800/80 px-4 py-2 text-xs tracking-wide text-gray-300 transition hover:border-slate-700/80"
                        >
                            back
                        </button>
                    )}
                    {step < 2 ? (
                        <button
                            type="button"
                            disabled={step === 1 && !hasPickDeadline}
                            onClick={handleNext}
                            className="rounded-lg bg-sky-500/25 px-5 py-2 text-xs font-semibold tracking-wide text-sky-100 transition hover:bg-sky-500/35 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            next
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={!form.name.trim() || slipLoading || slipCreating}
                            className="rounded-lg border border-slate-800/80 px-4 py-2 text-xs tracking-wide text-gray-300 transition hover:border-slate-700/80 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            create slip
                        </button>
                    )}
                </div>
            </div>

            <DeadlinesOverviewModal
                open={showDeadlinesOverview}
                onClose={() => setShowDeadlinesOverview(false)}
                windowDays={form.windowDays}
            />

            <ModeInfoModal
                mode={modeInfoOpen}
                onClose={() => setModeInfoOpen(null)}
            />
        </>
    );
};

export default SlipCreationPage;

const DeadlinesOverviewModal = ({ open, onClose, windowDays }: DeadlinesOverviewModalProps) => {
    useEffect(() => {
        if (!open) return;
        const handler = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                onClose();
            }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 py-8"
            role="dialog"
            aria-modal="true"
            aria-labelledby="deadlines-overview-title"
            onClick={onClose}
        >
            <div
                className="max-h-full w-full max-w-3xl overflow-hidden rounded-xl border border-slate-800/80 bg-black/85 shadow-2xl backdrop-blur"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="flex items-start justify-between gap-4 border-b border-white/10 px-6 py-4">
                    <div className="space-y-1">
                        <h2 id="deadlines-overview-title" className="text-lg font-semibold text-white">
                            deadlines &amp; review overview
                        </h2>
                        <p className="text-xs text-gray-400">
                            quick refresher on how deadlines, auto-grade, and slips stay in sync.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full border border-white/15 px-2 py-1 text-xs font-semibold tracking-wide text-gray-300 transition hover:border-white/35 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
                        aria-label="close deadlines and review overview"
                    >
                        x
                    </button>
                </div>

                <div className="max-h-[70vh] space-y-6 overflow-y-auto px-6 py-6 text-sm text-gray-300">
                    <section className="space-y-2">
                        <h3 className="text-sm font-semibold tracking-wide text-sky-200">
                            why the pick deadline matters
                        </h3>
                        <p>
                            the pick deadline is the single anchor for each slip. picks lock at this time and the
                            eligible slate of games is generated from it so everyone is betting on the same week
                            or slate.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h3 className="text-sm font-semibold tracking-wide text-sky-200">
                            which games show up
                        </h3>
                        <p>
                            we only show games that start <strong>after the pick deadline</strong> and within the
                            next <strong>{windowDays} day{windowDays === 1 ? "" : "s"}</strong>. move the deadline
                            to shift the window—no second deadline to manage.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h3 className="text-sm font-semibold tracking-wide text-sky-200">
                            review and finalizing
                        </h3>
                        <p>
                            commissioners can auto-grade once games finish. Results are read-only after
                            auto-grade, and awarded points are the only review adjustment. Finalize when you&apos;re
                            ready to post to the leaderboard.
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
};

const ModeInfoModal = ({
    mode,
    onClose,
}: {
    mode: keyof typeof MODE_INFO | null;
    onClose: () => void;
}) => {
    useEffect(() => {
        if (!mode) return;
        const handler = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                onClose();
            }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [mode, onClose]);

    if (!mode) return null;

    const content = MODE_INFO[mode];

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 py-8"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mode-info-title"
            onClick={onClose}
        >
            <div
                className="w-full max-w-md overflow-hidden rounded-xl border border-slate-800/80 bg-black/85 shadow-2xl backdrop-blur"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
                    <div className="space-y-1">
                        <h2 id="mode-info-title" className="text-lg font-semibold text-white">
                            {content.title}
                        </h2>
                        <p className="text-xs text-gray-400">{content.summary}</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full border border-white/15 px-2 py-1 text-xs font-semibold tracking-wide text-gray-300 transition hover:border-white/35 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
                        aria-label="Close slip mode info"
                    >
                        x
                    </button>
                </div>
                <div className="space-y-3 px-5 py-5 text-sm text-gray-200">
                    <ul className="list-disc space-y-2 pl-5">
                        {content.bullets.map((bullet, index) => (
                            <li key={`${mode}-${index}`}>{bullet}</li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
};
