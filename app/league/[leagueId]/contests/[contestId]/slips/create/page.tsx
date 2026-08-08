"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import BackButton from "@/components/ui/BackButton";
import { formatDateTime } from "@/lib/utils/date";
import DateTimeWheelPicker from "@/components/ui/DateTimeWheelPicker";
import { DEFAULT_ELIGIBLE_WINDOW_DAYS } from "@/lib/utils/games";
import { useToast } from "@/lib/state/ToastContext";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { useDispatch, useSelector } from "react-redux";
import { CreateSlipPayload, RootState } from "@/lib/interfaces/interfaces";
import { fetchGroupByIdRequest } from "@/lib/redux/slices/groupsSlice";
import useScopedGroup from "@/lib/groups/useScopedGroup";
import { fetchContestByIdRequest } from "@/lib/redux/slices/contestSlice";
import { clearCreateSlipMessage, createSlipRequest } from "@/lib/redux/slices/slipSlice";
import { checkAnyRestrictedWords } from "@/lib/utils/helpers";
import { canAddContestSlip, isContestInLeague } from "@/lib/permissions/leaguePermissions";
import { useUserPlan } from "@/lib/plan/useUserPlan";

type FormErrors = {
    name?: string;
    sports?: string;
    pickDeadline?: string;
    windowDays?: string;
};

const WINDOW_DAY_OPTIONS = [1, 2, 3, 4, 5];
const fieldLabelClasses = "block text-xs font-semibold uppercase tracking-[0.14em] text-gray-300";
const fieldClasses =
    "mt-2 w-full rounded-lg border border-white/15 bg-black/70 px-4 py-3 text-sm normal-case text-white outline-none transition focus:border-sky-400/70";

const ContestSlipCreatePage = () => {
    const dispatch = useDispatch();
    const params = useParams<{ leagueId: string; contestId: string }>();
    const leagueId = params.leagueId as string;
    const contestId = params.contestId as string;

    const router = useRouter();
    const { setToast } = useToast();
    const currentUser = useCurrentUser();
    const plan = useUserPlan();

    // The group slot is single-tenant and shared with every other League and Arena
    // screen, so reading it raw hands this page the PREVIOUSLY viewed group on the
    // first commit after a navigation — and this page writes `group.id` into the
    // created slip. useScopedGroup returns the record only when it is this league's.
    const scopedLeague = useScopedGroup(leagueId);
    const group = scopedLeague.group;
    const { contest: rawContest } = useSelector((state: RootState) => state.contest);
    // Same hazard, same fix, for the contest slot: checked during RENDER so the
    // gates below can never judge this page against the last contest viewed.
    const contest = rawContest?.id === contestId ? rawContest : null;
    const { slip, loading: slipLoading, message: slipMessage, error: slipError } = useSelector((state: RootState) => state.slip);

    const [name, setName] = useState("");
    const [sports, setSports] = useState<string[]>([]);
    const [pickDeadline, setPickDeadline] = useState(() =>
        new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString()
    );
    const [windowDays, setWindowDays] = useState(DEFAULT_ELIGIBLE_WINDOW_DAYS);
    const [errors, setErrors] = useState<FormErrors>({});

    const belongsToLeague = isContestInLeague(contest, group?.id);
    const permission = canAddContestSlip({
        league: group,
        actorId: currentUser?.userId,
        sessionUserId: currentUser?.userId,
        plan: plan
    });

    useEffect(() => {
        if (!leagueId || !currentUser || !contestId) return;
        // This route used to lean on whatever group the screen before it had left in
        // the shared slot. Now that the read is scoped to `leagueId`, the fetch has to
        // be made here too — otherwise a direct load or refresh of this URL would sit
        // at "loading" forever. Every sibling league route already does this.
        dispatch(fetchGroupByIdRequest({ groupId: leagueId }));
        dispatch(fetchContestByIdRequest({ contest_id: contestId }));
    }, [contestId, leagueId, currentUser, dispatch]);

    useEffect(() => {
        if (contest) {
            setSports(contest.sports.length > 1 ? [] : contest.sports);
        }
    }, [contest]);

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
                router.replace(`/league/${group?.id}/slips/${slip.id}`);
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
        }
    }, [slipLoading, slipMessage, slipError, dispatch, slip, setToast, group, router]);

    const isMultiContest = contest?.sports ? contest?.sports.length > 1 : false;

    const validate = useCallback((): boolean => {
        const nextErrors: FormErrors = {};

        if (!name.trim()) {
            nextErrors.name = "Slip name is required.";
        }

        if (name.trim().length > 25) {
            nextErrors.name =
                "Slip name must be 25 characters or less.";
        }

        if (isMultiContest && sports.length === 0) {
            nextErrors.sports =
                "Please select at least one sport.";
        }

        if (!pickDeadline) {
            nextErrors.pickDeadline =
                "Pick deadline is required.";
        }

        if (!windowDays || windowDays <= 0) {
            nextErrors.windowDays =
                "Please select a valid slate window.";
        }

        if (pickDeadline && contest?.starts_at) {
            const deadlineDate = new Date(pickDeadline);
            const contestStart = new Date(contest.starts_at);
            const contestEnd = new Date(contest.ends_at);

            if (deadlineDate < contestStart) {
                nextErrors.pickDeadline =
                    "Pick deadline cannot be before contest starts.";
            }

            if (deadlineDate > contestEnd) {
                nextErrors.pickDeadline =
                    "Pick deadline cannot be after contest ends.";
            }
        }

        const containsRestricted = checkAnyRestrictedWords(name);
        if (containsRestricted) {
            nextErrors.name =
                "Slip name contains inappropriate language.";
        }

        setErrors(nextErrors);

        return Object.keys(nextErrors).length === 0;
    }, [
        name,
        sports,
        pickDeadline,
        windowDays,
        isMultiContest,
        contest
    ]);

    const canManage = currentUser?.userId === contest?.created_by || currentUser?.userId === group?.created_by;
    // Hold the gate until both records for THIS url have actually landed. The group
    // read is fail-closed now, so judging while it is still in flight would bounce
    // every direct load of this page — and it would bounce it to a url built from an
    // absent group and contest. The redirect target uses the URL's own ids for the
    // same reason: those can never be stale or missing.
    const isResolving = scopedLeague.status === "loading" || !contest;
    if (!isResolving && (!canManage || !permission.allowed || contest?.status === "ARCHIVED")) {
        router.replace(`/league/${leagueId}/contests/${contestId}`);
        return null;
    }

    const toggleSport = (sport: string) => {
        setSports((prev) =>
            prev.includes(sport)
                ? prev.filter((candidate) => candidate !== sport)
                : [...prev, sport]
        );
    };

    const handleSubmit = () => {
        if (!validate()) return;

        const payload: CreateSlipPayload = {
            group_id: group?.id,
            contest_id: contest?.id,
            name: name,
            sports: isMultiContest ? sports : contest?.sports,
            isGraded: true,
            pickLimit: 1,
            pickDeadline: pickDeadline,
            windowDays: windowDays,
            leaderboardId: null,
            slip_type: "fantasy",
        }

        if (group?.id) {
            dispatch(createSlipRequest(payload))
        }
    };

    if (!group || !contest || !currentUser || !belongsToLeague || !permission.allowed) return null;

    return (
        <div className="flex flex-col gap-6 pb-10">
            <BackButton fallback={`/league/${group.id}/contests/${contest.id}`} preferFallback />
            <header className="space-y-2 border-b border-white/10 pb-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    {contest.name}
                </p>
                <h1 className="text-3xl font-semibold text-white">Add contest slip</h1>
                <p className="text-sm text-gray-500">
                    Contest runs {formatDateTime(contest.starts_at)} to {formatDateTime(contest.ends_at)}.
                </p>
            </header>

            <section className="relative overflow-hidden rounded-xl border border-slate-800/80 bg-gradient-to-br from-slate-950/75 via-slate-900/55 to-blue-900/35 p-5 shadow-lg backdrop-blur sm:p-6">
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-sky-400/10 via-transparent to-blue-400/10" />
                <div className="relative space-y-5">
                    <label className={fieldLabelClasses}>
                        Slip name
                        <input
                            value={name}
                            onChange={(event) => {
                                setName(event.target.value)
                                if (errors.name) {
                                    setErrors((prev) => ({
                                        ...prev,
                                        name: undefined
                                    }));
                                }
                            }}
                            placeholder="ex: game 3 locks"
                            className={fieldClasses}
                        />
                        {errors.name && (
                            <p className="mt-1 text-xs text-red-400">
                                {errors.name}
                            </p>
                        )}
                    </label>

                    {isMultiContest && (
                        <>
                            <div className="h-px bg-white/10" />

                            <div className="space-y-3">
                                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-300">
                                    Slip sport
                                </p>
                                <div className="flex w-full gap-2 overflow-x-auto rounded-lg border border-slate-800/80 bg-slate-950/60 p-1 scrollbar-hide">
                                    {contest.sports.map((sport) => {
                                        const selected = sports.includes(sport);
                                        return (
                                            <button
                                                key={sport}
                                                type="button"
                                                onClick={() => toggleSport(sport)}
                                                aria-pressed={selected}
                                                className={`allow-league-caps whitespace-nowrap rounded-md border px-3 py-2 text-xs font-semibold uppercase tracking-wide transition ${selected
                                                    ? "border-sky-300/70 bg-gradient-to-b from-sky-500/25 via-sky-500/10 to-blue-900/20 text-white shadow-[0_6px_16px_-12px_rgba(59,130,246,0.8)]"
                                                    : "border-transparent text-gray-400 hover:border-white/10 hover:text-white"
                                                    }`}
                                            >
                                                {sport}
                                            </button>
                                        );
                                    })}
                                </div>
                                {errors.sports && (
                                    <p className="text-xs text-red-400">
                                        {errors.sports}
                                    </p>
                                )}
                            </div>
                        </>
                    )}

                    <div className="h-px bg-white/10" />

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <DateTimeWheelPicker
                            label="Pick deadline"
                            value={pickDeadline}
                            onChange={(iso) => {
                                setPickDeadline(iso);
                                if (errors.pickDeadline) {
                                    setErrors((prev) => ({ ...prev, pickDeadline: undefined }));
                                }
                            }}
                            error={errors.pickDeadline}
                            className="min-w-0"
                        />
                        <label className={fieldLabelClasses}>
                            Slate window
                            <select
                                value={windowDays}
                                onChange={(event) => setWindowDays(Number(event.target.value))}
                                className={fieldClasses}
                            >
                                {WINDOW_DAY_OPTIONS.map((days) => (
                                    <option key={days} value={days}>
                                        {days} day{days === 1 ? "" : "s"}
                                    </option>
                                ))}
                            </select>
                            {errors.windowDays && (
                                <p className="mt-1 text-xs text-red-400">
                                    {errors.windowDays}
                                </p>
                            )}
                        </label>
                    </div>

                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={slipLoading}
                        className="w-full rounded-lg bg-sky-500/25 px-5 py-3 text-sm font-semibold uppercase tracking-wide text-sky-100 transition hover:bg-sky-500/35 sm:w-auto disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Create slip
                    </button>
                </div>
            </section>
        </div>
    );
};

export default ContestSlipCreatePage;
