"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import BackButton from "@/components/ui/BackButton";
import DateTimeWheelPicker from "@/components/ui/DateTimeWheelPicker";
import { useToast } from "@/lib/state/ToastContext";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { useDispatch, useSelector } from "react-redux";
import { CreateContestPayload, RootState } from "@/lib/interfaces/interfaces";
import { fetchGroupByIdRequest } from "@/lib/redux/slices/groupsSlice";
import { clearCreateContestMessage, createContestRequest } from "@/lib/redux/slices/contestSlice";
import { checkAnyRestrictedWords } from "@/lib/utils/helpers";
import {
    canCreateContestInGroup,
    getActiveFantasyContestCapacityLabel,
} from "@/lib/groups/limits";
import { useUserPlan } from "@/lib/plan/useUserPlan";
import { canCreateStandardContest } from "@/lib/permissions/leaguePermissions";
import useScopedGroup from "@/lib/groups/useScopedGroup";

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

export type LeagueFantasyContestCreateFormProps = {
    leagueId: string;
    /**
     * WHERE this form is mounted — the MVP's own prop, and it changes exactly
     * one thing: a page owns a Back chevron to leave by, a drawer's header
     * already has one. See FeedContestCreateForm for the same split.
     */
    surface?: "page" | "drawer";
};

/**
 * The Fantasy (standard) contest form.
 *
 * EXPORTED SEPARATELY FROM THE ROUTE so the "Start a contest" sidebar can mount
 * it, which is how the MVP does it (`LeagueFantasyContestCreateForm`,
 * app/league/[leagueId]/contests/create/page.tsx:30). The route below is now a
 * thin wrapper that only reads the id out of the URL.
 */
export const LeagueFantasyContestCreateForm = ({
    leagueId,
    surface = "page",
}: LeagueFantasyContestCreateFormProps) => {
    const dispatch = useDispatch();
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

    /*
     * `state.group.group` is a single-tenant slot shared by every group screen,
     * and this form is now mounted from TWO places — its own route and the
     * League page's drawer. Reading it raw would let the previously viewed
     * group's row reach `group_id` on the first commit. `useScopedGroup` answers
     * during render, so a record belonging to any other id is never returned.
     */
    const scopedLeague = useScopedGroup(leagueId);
    const group = scopedLeague.group;
    const { contest, loading: contestLoader, error, message } = useSelector(
        (state: RootState) => state.contest
    );

    const permission = canCreateStandardContest({
        league: group,
        actorId: currentUser?.userId,
        sessionUserId: currentUser?.userId,
        plan: plan,
    });

    /**
     * Fetch the group ONLY when this screen does not already have it.
     *
     * Unconditionally dispatching here is safe on the route and catastrophic in
     * the drawer. `fetchGroupByIdRequest` sets `state.group.loading = true` even
     * for the id already in the slot; the League page folds that flag into
     * `isInitialLoading` and swaps its whole tree for `<LeaguePageSkeleton/>`,
     * which unmounts the drawer and this form — which then remounts, dispatches
     * again, and loops forever, discarding anything typed on every pass.
     *
     * The ref is belt-and-braces on top of the status check: `useScopedGroup`
     * reports "loading" for both "not fetched" and "slot holds another group", so
     * the status alone could re-fire while a request is in flight.
     */
    const requestedGroupRef = useRef("");
    useEffect(() => {
        if (!leagueId || !currentUser) return;
        if (scopedLeague.status === "ready") return;
        if (requestedGroupRef.current === leagueId) return;
        requestedGroupRef.current = leagueId;
        dispatch(fetchGroupByIdRequest({ groupId: leagueId }));
    }, [leagueId, currentUser, dispatch, scopedLeague.status]);

    /**
     * A member who may not create bounces back to the hub — but ONLY from the
     * route.
     *
     * In the drawer this same redirect rewrites the URL of the page the drawer is
     * sitting on (dropping its `contestType` tab along with it) while leaving a
     * blank builder region open on top. Reachable in practice: the League page
     * offers the chooser on `current_user_member.role`, while
     * `canCreateStandardContest` reads `created_by` — a transferred commissioner
     * passes one and fails the other. The drawer says so instead, below.
     */
    useEffect(() => {
        if (surface !== "page") return;
        if (group && currentUser && !permission.allowed) {
            router.replace(`/league/${group.id}?tab=contests`);
        }
    }, [currentUser, group, permission.allowed, router, surface]);

    /**
     * Latches on THIS screen's submit.
     *
     * `state.contest` is a shared slot and its message outlives the component
     * that wrote it. Without the latch, a create that settles after the builder
     * was closed leaves `message` sitting there, and the next drawer open reads
     * it on mount and immediately `router.replace`s to a contest the member did
     * not just make. `FeedContestCreateForm` carries the same latch for the same
     * reason.
     */
    const submittedRef = useRef(false);
    useEffect(() => {
        if (!submittedRef.current) return;
        if (!contestLoader && message) {
            setToast({
                id: Date.now(),
                type: "success",
                message: message,
                duration: 3000,
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
                duration: 3000,
            });
            dispatch(clearCreateContestMessage());
            submittedRef.current = false;
        }
    }, [contestLoader, error, message, dispatch, contest?.id, group?.id, router, setToast]);

    // Anything a previous mount left behind is not this one's to report.
    useEffect(() => {
        dispatch(clearCreateContestMessage());
    }, [dispatch]);

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
                nextErrors.endsAt = "End date must be later than start date.";
            }
        }

        // Optional restricted words validation
        const containsNameRestricted = checkAnyRestrictedWords(name);
        if (containsNameRestricted) {
            nextErrors.name = "Contest name contains inappropriate language.";
        }

        setErrors(nextErrors);

        return Object.keys(nextErrors).length === 0;
    }, [name, sportScope, startsAt, endsAt]);

    const activeContestCount = group?.active_contest ?? 0;
    const contestCheck = canCreateContestInGroup(group, activeContestCount);
    /**
     * Capture the Badge is a PRO feature — the MVP gates it on
     * `league.hostingTier === "pro"` and shows an upgrade link otherwise. The
     * same fact rides on `hosting_tier` here.
     */
    const badgeFeatureEntitled = group?.hosting_tier === "pro";
    const badgeUpgradeHref = `/app-settings/plan/league/upgrade?intent=capture-badges&leagueId=${encodeURIComponent(
        leagueId
    )}`;

    const handleSubmit = () => {
        if (!contestCheck.allowed) {
            setToast({
                id: Date.now(),
                type: "error",
                message: contestCheck.error,
                duration: 3000,
            });
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
                // An unentitled League can never turn the toggle on, but the flag
                // is re-checked here so a stale bit of state cannot send `true`.
                badges_enabled: badgeFeatureEntitled && badgesEnabled,
                status: "ACTIVE",
                excluded_member_ids: [],
            };
            submittedRef.current = true;
            dispatch(createContestRequest(payload));
        }
    };

    if (!group || !currentUser) return null;
    if (!permission.allowed) {
        // The route redirects (above) and never reaches here; the drawer has
        // nowhere to send anyone, so it explains itself.
        return surface === "page" ? null : (
            <div
                data-league-fantasy-contest-create-surface={surface}
                className="rounded-xl border border-amber-300/25 bg-amber-500/10 p-5 text-sm leading-6 text-amber-100"
            >
                <p className="font-semibold">You cannot start a Fantasy contest</p>
                <p className="mt-1 text-amber-100/75">
                    Only the member who created this League can open one.
                </p>
            </div>
        );
    }

    return (
        <div
            data-league-fantasy-contest-create-surface={surface}
            className="flex flex-col gap-6 pb-10"
        >
            {surface === "page" ? (
                <BackButton fallback={`/league/${group.id}?tab=contests`} preferFallback />
            ) : null}
            <header className="space-y-2 border-b border-white/10 pb-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    {group.name}
                </p>
                <h1 className="text-3xl font-semibold text-white">Start a contest</h1>
                <p className="text-xs uppercase tracking-wide text-gray-500">
                    {getActiveFantasyContestCapacityLabel(group, activeContestCount)} ·
                    finalized contests do not count
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
                                setName(event.target.value);

                                if (errors.name) {
                                    setErrors((prev) => ({
                                        ...prev,
                                        name: undefined,
                                    }));
                                }
                            }}
                            placeholder="ex: NBA playoff gauntlet"
                            className={fieldClasses}
                        />
                        {errors.name && (
                            <p className="mt-1 text-xs text-red-400">{errors.name}</p>
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
                                            setSportScope((current) =>
                                                current === option ? "" : option
                                            );
                                            if (errors.sportScope) {
                                                setErrors((prev) => ({
                                                    ...prev,
                                                    sportScope: undefined,
                                                }));
                                            }
                                        }}
                                        aria-pressed={selected}
                                        className={`allow-league-caps rounded-md border px-3 py-2 text-xs font-semibold uppercase tracking-wide transition ${selected
                                            ? "border-sky-300/70 bg-gradient-to-b from-sky-500/25 via-sky-500/10 to-blue-900/20 text-white shadow-[0_6px_16px_-12px_rgba(96,165,250,0.8)]"
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
                            <p className="text-xs text-red-400">{errors.sportScope}</p>
                        )}
                    </div>

                    <div className="h-px bg-white/10" />

                    <div
                        className="flex items-center justify-between gap-4 rounded-lg border border-slate-800/80 bg-slate-950/60 px-4 py-3"
                        data-create-badge-option
                    >
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-300">
                                    Capture the badge
                                </p>
                                {!badgeFeatureEntitled && (
                                    <span className="rounded-full border border-sky-300/20 bg-sky-500/[0.08] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-sky-100">
                                        Pro
                                    </span>
                                )}
                            </div>
                            <p className="mt-1 text-xs text-gray-500">
                                {badgeFeatureEntitled
                                    ? "Add bonus badge points directly into the contest Rank."
                                    : "Badge challenges and bonus scoring require Pro Lifetime."}
                            </p>
                        </div>
                        {badgeFeatureEntitled ? (
                            <button
                                type="button"
                                onClick={() => setBadgesEnabled((current) => !current)}
                                aria-label="Enable Capture the Badge"
                                aria-pressed={badgesEnabled}
                                className={`relative h-7 w-12 shrink-0 rounded-full border transition ${badgesEnabled
                                    ? "border-sky-300/60 bg-sky-500/30"
                                    : "border-white/15 bg-black/60"
                                    }`}
                            >
                                <span
                                    className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${badgesEnabled ? "left-6" : "left-1"
                                        }`}
                                />
                            </button>
                        ) : (
                            <Link
                                href={badgeUpgradeHref}
                                className="shrink-0 rounded-lg border border-sky-300/25 bg-sky-500/[0.08] px-3 py-2 text-[11px] font-semibold text-sky-100 transition hover:bg-sky-500/15"
                            >
                                Unlock Pro
                            </Link>
                        )}
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

export default LeagueFantasyContestCreateForm;
