"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import BackButton from "@/components/ui/BackButton";
import DateTimeWheelPicker from "@/components/ui/DateTimeWheelPicker";
import { useToast } from "@/lib/state/ToastContext";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { useDispatch, useSelector } from "react-redux";
import { CreateContestPayload, GroupSelector, RootState } from "@/lib/interfaces/interfaces";
import { fetchGroupByIdRequest } from "@/lib/redux/slices/groupsSlice";
import { clearCreateContestMessage, createContestRequest } from "@/lib/redux/slices/contestSlice";
import { checkAnyRestrictedWords } from "@/lib/utils/helpers";
import { canCreateContestInGroup, getActiveContestCountsLabel } from "@/lib/groups/limits";
import { useUserPlan } from "@/lib/plan/useUserPlan";
import { canCreateStandardContest } from "@/lib/permissions/leaguePermissions";

type FormErrors = {
    name?: string;
    sportScope?: string;
    startsAt?: string;
    endsAt?: string;
};

const SPORTS = ["NFL", "NBA", "NCAAF", "NCAAB", "NHL", "MLB", "Soccer"];
const MULTI_SPORT_OPTION = "Multi";
const SPORT_SCOPE_OPTIONS = [...SPORTS, MULTI_SPORT_OPTION];

const defaultStart = () => new Date(Date.now() + 60 * 60 * 1000).toISOString();
const defaultEnd = () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
const fieldLabelClasses = "block text-xs font-semibold uppercase tracking-[0.14em] text-gray-300";
const fieldClasses =
    "mt-2 w-full rounded-lg border border-white/15 bg-black/70 px-4 py-3 text-sm normal-case text-white outline-none transition focus:border-sky-400/70";

const CreateContestPage = () => {
    const dispatch = useDispatch();
    const params = useParams<{ leagueId: string }>();
    const leagueId = params.leagueId as string;
    const router = useRouter();
    const { setToast } = useToast();
    const currentUser = useCurrentUser();
    const plan = useUserPlan();
    const [name, setName] = useState("");
    const [sportScope, setSportScope] = useState("");
    const [badgesEnabled, setBadgesEnabled] = useState(false);
    const [startsAt, setStartsAt] = useState(defaultStart);
    const [endsAt, setEndsAt] = useState(defaultEnd);
    const [errors, setErrors] = useState<FormErrors>({});

    const { group } = useSelector((state: GroupSelector) => state.group);
    const { contest, loading: contestLoader, error, message } = useSelector((state: RootState) => state.contest);

    const permission = canCreateStandardContest({
        league: group,
        actorId: currentUser?.userId,
        sessionUserId: currentUser?.userId,
        plan: plan
    });

    useEffect(() => {
        if (!leagueId || !currentUser) return;
        dispatch(fetchGroupByIdRequest({ groupId: leagueId }));
    }, [leagueId, currentUser, dispatch]);

    useEffect(() => {
        if (group && currentUser && !permission.allowed) {
            router.replace(`/league/${group.id}?tab=contests`);
        }
    }, [currentUser, group, permission.allowed, router]);

    useEffect(() => {
        if (!contestLoader && message) {
            setToast({
                id: Date.now(),
                type: "success",
                message: message,
                duration: 3000
            });
            dispatch(clearCreateContestMessage());
            if (contest?.id && group?.id) {
                router.replace(`/league/${group?.id}/contests/${contest?.id}`);
            }
        }
        if (!contestLoader && error) {
            setToast({
                id: Date.now(),
                type: "error",
                message: error,
                duration: 3000
            });
            dispatch(clearCreateContestMessage());
        }
    }, [contestLoader, error, message, dispatch, contest?.id, group?.id, router, setToast]);

    const validate = useCallback((): boolean => {
        const nextErrors: FormErrors = {};

        if (!name.trim()) {
            nextErrors.name = "Contest name is required.";
        }

        if (name.trim().length > 25) {
            nextErrors.name = "Contest name must be 25 characters or less.";
        }

        if (!sportScope) {
            nextErrors.sportScope = "Please select a contest sport.";
        }

        if (!startsAt) {
            nextErrors.startsAt = "Start date is required.";
        }

        if (!endsAt) {
            nextErrors.endsAt = "End date is required.";
        }

        if (startsAt && endsAt) {
            const startDate = new Date(startsAt);
            const endDate = new Date(endsAt);

            if (endDate <= startDate) {
                nextErrors.endsAt =
                    "End date must be later than start date.";
            }
        }

        // Optional restricted words validation
        const containsNameRestricted = checkAnyRestrictedWords(name);
        if (containsNameRestricted) {
            nextErrors.name =
                "Contest name contains inappropriate language.";
        }

        setErrors(nextErrors);

        return Object.keys(nextErrors).length === 0;
    }, [name, sportScope, startsAt, endsAt]);

    const activeContestCount = group?.active_contest ?? 0;
    const contestCheck = canCreateContestInGroup(group, activeContestCount);

    const handleSubmit = () => {
        if (!contestCheck.allowed) {
            setToast({ id: Date.now(), type: "error", message: contestCheck.error, duration: 3000 });
            return;
        }
        if (!validate()) return;

        const contestSports =
            sportScope === MULTI_SPORT_OPTION
                ? SPORTS
                : sportScope
                    ? [sportScope]
                    : [];

        if (group?.id) {
            const payload: CreateContestPayload = {
                group_id: group.id,
                name,
                sports: contestSports,
                starts_at: startsAt,
                ends_at: endsAt,
                badges_enabled: badgesEnabled,
                status: "ACTIVE",
                excluded_member_ids: []
            };
            dispatch(createContestRequest(payload));
        }
    };

    if (!group || !currentUser || !permission.allowed) return null;

    return (
        <div className="flex flex-col gap-6 pb-10">
            <BackButton fallback={`/league/${group.id}?tab=contests`} preferFallback />
            <header className="space-y-2 border-b border-white/10 pb-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    {group.name}
                </p>
                <h1 className="text-3xl font-semibold text-white">Start a contest</h1>
                <p className="text-xs uppercase tracking-wide text-gray-500">
                    {getActiveContestCountsLabel(group, activeContestCount)} - archived contests do not count
                </p>
            </header>

            <section className="relative overflow-hidden rounded-xl border border-slate-800/80 bg-gradient-to-br from-slate-950/75 via-slate-900/55 to-blue-900/35 p-5 shadow-lg backdrop-blur sm:p-6">
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-sky-400/10 via-transparent to-blue-400/10" />
                <div className="relative space-y-5">
                    <label className={fieldLabelClasses}>
                        Contest name
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
                            placeholder="ex: NBA playoff gauntlet"
                            className={fieldClasses}
                        />
                        {errors.name && (
                            <p className="mt-1 text-xs text-red-400">
                                {errors.name}
                            </p>
                        )}
                    </label>

                    <div className="h-px bg-white/10" />

                    <div className="space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-300">
                            Contest sport
                        </p>
                        <div className="grid grid-cols-2 gap-2 rounded-lg border border-slate-800/80 bg-slate-950/60 p-1 sm:grid-cols-4">
                            {SPORT_SCOPE_OPTIONS.map((option) => {
                                const selected = sportScope === option;
                                const dimmed = Boolean(sportScope) && !selected;
                                return (
                                    <button
                                        key={option}
                                        type="button"
                                        onClick={() => {
                                            setSportScope((current) => (current === option ? "" : option))
                                            if (errors.sportScope) {
                                                setErrors((prev) => ({
                                                    ...prev,
                                                    sportScope: undefined
                                                }));
                                            }
                                        }}
                                        aria-pressed={selected}
                                        className={`allow-league-caps rounded-md border px-3 py-2 text-xs font-semibold uppercase tracking-wide transition ${selected
                                            ? "border-sky-300/70 bg-gradient-to-b from-sky-500/25 via-sky-500/10 to-blue-900/20 text-white shadow-[0_6px_16px_-12px_rgba(59,130,246,0.8)]"
                                            : dimmed
                                                ? "border-transparent text-gray-600 opacity-45 hover:border-white/10 hover:text-gray-300 hover:opacity-80"
                                                : "border-transparent text-gray-400 hover:border-white/10 hover:text-white"
                                            }`}
                                    >
                                        {option}
                                    </button>
                                );
                            })}
                        </div>
                        {errors.sportScope && (
                            <p className="text-xs text-red-400">
                                {errors.sportScope}
                            </p>
                        )}
                    </div>

                    <div className="h-px bg-white/10" />

                    <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-800/80 bg-slate-950/60 px-4 py-3">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-300">
                                Capture the badge
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                                Add bonus badge points directly into contest standings.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setBadgesEnabled((current) => !current)}
                            aria-pressed={badgesEnabled}
                            className={`relative inline-flex h-7 w-12 flex-shrink-0 items-center rounded-full border transition-all duration-300 ${badgesEnabled
                                ? "border-sky-300/60 bg-sky-500/30"
                                : "border-white/15 bg-black/60"
                                }`}
                        >
                            <span
                                className={`absolute h-5 w-5 rounded-full bg-white shadow-md transition-all duration-300 ${badgesEnabled ? "left-6" : "left-1"}`}
                            />
                        </button>
                    </div>

                    <div className="h-px bg-white/10" />

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <DateTimeWheelPicker
                            label="Starts"
                            value={startsAt}
                            onChange={(iso) => {
                                setStartsAt(iso);
                                if (errors.startsAt) {
                                    setErrors((prev) => ({ ...prev, startsAt: undefined }));
                                }
                            }}
                            error={errors.startsAt}
                            className="min-w-0"
                        />
                        <DateTimeWheelPicker
                            label="Ends"
                            value={endsAt}
                            onChange={(iso) => {
                                setEndsAt(iso);
                                if (errors.endsAt) {
                                    setErrors((prev) => ({ ...prev, endsAt: undefined }));
                                }
                            }}
                            error={errors.endsAt}
                            className="min-w-0"
                        />
                    </div>

                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={contestLoader || !contestCheck.allowed}
                        className="w-full rounded-lg bg-sky-500/25 px-5 py-3 text-sm font-semibold uppercase tracking-wide text-sky-100 transition hover:bg-sky-500/35 sm:w-auto disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Create contest
                    </button>
                    {!contestCheck.allowed && (
                        <p className="text-xs font-semibold text-amber-100">
                            {contestCheck.error}
                        </p>
                    )}
                </div>
            </section>
        </div>
    );
};

export default CreateContestPage;
