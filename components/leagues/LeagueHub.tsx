"use client";

import Link from "next/link";
import { AnimatedArrow } from "@/components/ui/AnimatedArrow";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import CommunityHubCard from "@/components/communities/CommunityHubCard";
import {
    CommunityHubScoringButton,
    CommunityHubTabs,
    CommunityHubWorkspaceAction,
    type CommunityHubView,
} from "@/components/communities/CommunityHubControls";
import CommunityHubError from "@/components/communities/CommunityHubError";
import CommunityJoinDialog from "@/components/communities/CommunityJoinDialog";
import ScoringModal from "@/components/modals/ScoringModal";
import GroupsTabSkeleton from "@/components/skeletons/fantasy/GroupsTabSkeleton";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { PLAN_LIMITS } from "@/lib/groups/limits";
import type { ArenaState, GroupObject } from "@/lib/interfaces/interfaces";
import { useUserPlan } from "@/lib/plan/useUserPlan";
import {
    clearJoinLeagueState,
    fetchJoinedLeaguesRequest,
    fetchOwnedLeaguesRequest,
    joinLeagueRequest,
} from "@/lib/redux/slices/groupsSlice";
import { useToast } from "@/lib/state/ToastContext";

const LEAGUE_HUB_PATH = "/fantasy";
const LEAGUE_CREATE_PATH = "/cag-form?type=league";
const LEAGUE_PLAN_PATH = "/app-settings/plan?product=league";
const LEAGUE_UPGRADE_PATH = "/app-settings/plan/league/upgrade";
const PAGE_SIZE = 10;

type LeagueHubSelection = {
    group: {
        ownedLeagues: GroupObject[] | null;
        ownedLeaguesLoading: boolean;
        ownedLeaguesError: string | null;
        ownedLeaguesHasMore: boolean;
        ownedLeaguesTotal: number;
        joinedLeagues: GroupObject[] | null;
        joinedLeaguesLoading: boolean;
        joinedLeaguesError: string | null;
        joinedLeaguesHasMore: boolean;
        joinedLeaguesTotal: number;
        joinLeagueLoading: boolean;
        joinLeagueError: string | null;
        joinLeagueMessage: string | null;
        joinLeagueCrossType: boolean;
        joinLeagueNotFound: boolean;
        joinedLeague: { group_id: string } | null;
    };
    arena: ArenaState;
};

const normalizeView = (value: string | null): CommunityHubView | null =>
    value === "hosting" || value === "participating" ? value : null;

export const LeagueHub = () => {
    const router = useRouter();
    const dispatch = useDispatch();
    const searchParams = useSearchParams();
    const { setToast } = useToast();
    const currentUser = useCurrentUser();
    const userPlan = useUserPlan();

    const {
        ownedLeagues,
        ownedLeaguesLoading,
        ownedLeaguesError,
        ownedLeaguesHasMore,
        ownedLeaguesTotal,
        joinedLeagues,
        joinedLeaguesLoading,
        joinedLeaguesError,
        joinedLeaguesHasMore,
        joinedLeaguesTotal,
        joinLeagueLoading,
        joinLeagueError,
        joinLeagueMessage,
        joinLeagueCrossType,
        joinLeagueNotFound,
        joinedLeague,
    } = useSelector((state: LeagueHubSelection) => state.group);

    const [hostingPage, setHostingPage] = useState(1);
    const [participatingPage, setParticipatingPage] = useState(1);
    const [joinOpen, setJoinOpen] = useState(false);
    const [scoringOpen, setScoringOpen] = useState(false);
    const createIntentHandledRef = useRef(false);
    const joinIntentHandledRef = useRef(false);
    const defaultViewAppliedRef = useRef(false);
    const joinHandledRef = useRef(false);
    const hasCompletedFirstLoadRef = useRef(false);
    const headingRef = useRef<HTMLHeadingElement>(null);
    const headingFocusedRef = useRef(false);

    const intent = searchParams.get("intent");
    const requestedView = normalizeView(searchParams.get("view"));

    // Both tabs load on mount. The counts in the tab strip are server totals, so
    // the inactive tab's badge would read 0 until first visited if only the active
    // list were fetched — and `defaultView` needs the hosted count before it can
    // pick a tab at all.
    useEffect(() => {
        if (!currentUser) return;
        dispatch(fetchOwnedLeaguesRequest({ page: 1, limit: PAGE_SIZE }));
        dispatch(fetchJoinedLeaguesRequest({ page: 1, limit: PAGE_SIZE }));
        setHostingPage(1);
        setParticipatingPage(1);
    }, [currentUser, dispatch]);

    const listsSettled = ownedLeagues !== null && joinedLeagues !== null;

    const activeView: CommunityHubView =
        intent === "join"
            ? "participating"
            : intent === "create-league"
                ? "hosting"
                : requestedView ?? (ownedLeaguesTotal > 0 ? "hosting" : "participating");

    // Pin the resolved default into the URL exactly once, so a later refresh or a
    // back-navigation lands on the same tab even after the counts change.
    useEffect(() => {
        if (intent || requestedView || !listsSettled || defaultViewAppliedRef.current) return;
        defaultViewAppliedRef.current = true;
        router.replace(`${LEAGUE_HUB_PATH}?view=${activeView}`);
    }, [activeView, intent, listsSettled, requestedView, router]);

    const ownedLeagueLimit = PLAN_LIMITS[userPlan ?? "free"].maxOwnedLeagues;
    // The server total, not the loaded rows: with 10-per-page and a 5-league Pro
    // cap they agree today, but the gate must not silently reopen if either changes.
    const ownedLeagueCount = ownedLeaguesTotal;
    const leagueLimitReached = ownedLeagueCount >= ownedLeagueLimit;
    const slotUsagePercent = Math.min(
        100,
        ownedLeagueLimit > 0 ? (ownedLeagueCount / ownedLeagueLimit) * 100 : 0
    );

    const handleStartLeague = useCallback(() => {
        if (!currentUser) {
            router.replace("/landing-page");
            return;
        }
        if (!leagueLimitReached) {
            router.push(LEAGUE_CREATE_PATH);
            return;
        }
        if (userPlan === "free") {
            // A full-page review, not a modal: confirming there hands the browser to
            // Stripe, and a dialog that unmounts mid-redirect leaves nothing to
            // come back to. `intent` brings the user back to League creation once
            // the unlock lands.
            router.push(`${LEAGUE_UPGRADE_PATH}?intent=create-league`);
            return;
        }
        setToast({
            id: Date.now(),
            type: "error",
            message: `Pro users can host up to ${ownedLeagueLimit} leagues.`,
            duration: 3000,
        });
    }, [currentUser, leagueLimitReached, ownedLeagueLimit, router, setToast, userPlan]);

    // ?intent=create-league / ?intent=join are one-shot deep links (from the plan
    // screen and the Arena hub's cross-type prompt). The ref guards against the
    // effect re-firing before router.replace has stripped the param.
    useEffect(() => {
        if (intent !== "create-league" || createIntentHandledRef.current || !currentUser) return;
        createIntentHandledRef.current = true;
        router.replace(`${LEAGUE_HUB_PATH}?view=hosting`);
        handleStartLeague();
    }, [currentUser, handleStartLeague, intent, router]);

    useEffect(() => {
        if (intent !== "join" || joinIntentHandledRef.current || !currentUser) return;
        joinIntentHandledRef.current = true;
        router.replace(`${LEAGUE_HUB_PATH}?view=participating`);
        // Clear first, like every other path that opens the dialog: arriving here
        // from the Arena hub's cross-type link would otherwise reopen showing the
        // previous attempt's error.
        dispatch(clearJoinLeagueState());
        setJoinOpen(true);
    }, [currentUser, dispatch, intent, router]);

    // The join result lives in the store, not in this component. If the hub
    // unmounts while a join is in flight (the user taps another tab), the success
    // message latches and the NEXT mount would fire its toast and force-navigate
    // into that League out of nowhere.
    useEffect(
        () => () => {
            dispatch(clearJoinLeagueState());
        },
        [dispatch]
    );

    // A successful join lands the user in the League they just joined. The list
    // refresh still fires because they may navigate straight back here.
    //
    // The ref makes "handle each join exactly once" explicit. `setToast` is a new
    // function identity on every render (ToastContext returns a fresh object), so
    // this effect re-runs constantly; without the guard the only thing preventing
    // a double toast + double router.push is that the clear dispatch below lands
    // before the next render — true today, but not a property worth depending on.
    useEffect(() => {
        if (joinLeagueLoading) {
            joinHandledRef.current = false;
            return;
        }
        if (!joinLeagueMessage || joinHandledRef.current) return;
        joinHandledRef.current = true;

        setToast({
            id: Date.now(),
            type: "success",
            message: joinLeagueMessage,
            duration: 3000,
        });
        setJoinOpen(false);

        const joinedId = joinedLeague?.group_id;
        dispatch(clearJoinLeagueState());
        dispatch(fetchJoinedLeaguesRequest({ page: 1, limit: PAGE_SIZE }));
        setParticipatingPage(1);
        if (joinedId) router.push(`/league/${joinedId}`);
    }, [dispatch, joinLeagueLoading, joinLeagueMessage, joinedLeague, router, setToast]);

    useEffect(() => {
        if (!currentUser || headingFocusedRef.current) return;
        headingFocusedRef.current = true;
        headingRef.current?.focus();
    }, [currentUser]);

    const cards = activeView === "hosting" ? ownedLeagues : joinedLeagues;
    const listLoading = activeView === "hosting" ? ownedLeaguesLoading : joinedLeaguesLoading;
    const listError = activeView === "hosting" ? ownedLeaguesError : joinedLeaguesError;
    const hasMore = activeView === "hosting" ? ownedLeaguesHasMore : joinedLeaguesHasMore;

    const handleLoadMore = () => {
        if (activeView === "hosting") {
            const nextPage = hostingPage + 1;
            setHostingPage(nextPage);
            dispatch(fetchOwnedLeaguesRequest({ page: nextPage, limit: PAGE_SIZE }));
            return;
        }
        const nextPage = participatingPage + 1;
        setParticipatingPage(nextPage);
        dispatch(fetchJoinedLeaguesRequest({ page: nextPage, limit: PAGE_SIZE }));
    };

    // Retry re-requests the page that failed, not page 1 — a "Show more" that
    // failed on page 3 must not silently reset the list to its first page.
    const handleRetry = () => {
        if (activeView === "hosting") {
            dispatch(fetchOwnedLeaguesRequest({ page: hostingPage, limit: PAGE_SIZE }));
            return;
        }
        dispatch(fetchJoinedLeaguesRequest({ page: participatingPage, limit: PAGE_SIZE }));
    };

    const emptyState = useMemo(
        () =>
            activeView === "hosting"
                ? {
                    title: "No hosted Leagues yet",
                    body: "Start a League when you are ready to organize a group.",
                }
                : {
                    title: "No participating Leagues yet",
                    body: "Use a League invite code to join friends and start competing.",
                },
        [activeView]
    );

    // First paint only. Gating on `!listsSettled` alone would swap the whole hub
    // back to a skeleton every time the user hit Retry after a failed list — the
    // failure leaves that list at null, so `listsSettled` never becomes true and
    // the retry's loading flag would re-trigger this on every attempt, hiding the
    // error banner the user just clicked.
    if (!hasCompletedFirstLoadRef.current && (ownedLeaguesLoading || joinedLeaguesLoading)) {
        return <GroupsTabSkeleton />;
    }
    hasCompletedFirstLoadRef.current = true;

    return (
        <div className="flex flex-col gap-5 pb-8 text-white">
            <header className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <h1
                        ref={headingRef}
                        tabIndex={-1}
                        className="text-3xl font-black tracking-tight text-white outline-none sm:text-4xl"
                    >
                        Leagues
                    </h1>
                    <p className="mt-1 text-xs leading-5 text-gray-400 sm:text-sm">
                        Private groups for picks and friendly competition.
                    </p>
                </div>
                <CommunityHubScoringButton tone="league" onClick={() => setScoringOpen(true)} />
            </header>

            <CommunityHubTabs
                tone="league"
                idPrefix="league"
                basePath={LEAGUE_HUB_PATH}
                activeView={activeView}
                hostingCount={ownedLeaguesTotal}
                participatingCount={joinedLeaguesTotal}
                onSelect={(view) => router.push(`${LEAGUE_HUB_PATH}?view=${view}`)}
            />

            <section
                id={`league-${activeView}-panel`}
                role="tabpanel"
                aria-labelledby={`league-${activeView}-tab`}
                className="space-y-4 focus:outline-none"
            >
                {activeView === "hosting" ? (
                    <CommunityHubWorkspaceAction
                        tone="league"
                        kind="new"
                        label="New League"
                        onClick={handleStartLeague}
                    />
                ) : (
                    <CommunityHubWorkspaceAction
                        tone="league"
                        kind="join"
                        label="Join League"
                        onClick={() => {
                            dispatch(clearJoinLeagueState());
                            setJoinOpen(true);
                        }}
                    />
                )}

                {activeView === "hosting" ? (
                    <Link
                        href={LEAGUE_PLAN_PATH}
                        aria-label={`Open League Plan. ${userPlan === "pro" ? "Pro" : "Free"} · ${ownedLeagueCount} of ${ownedLeagueLimit} hosted`}
                        className="group/meter block rounded-2xl border border-sky-200/15 bg-sky-500/[0.06] px-4 py-3 transition hover:border-sky-200/30 hover:bg-sky-500/[0.09] focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-200 motion-reduce:transition-none"
                    >
                        <span className="flex items-center justify-between gap-3">
                            <span>
                                <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-sky-200/70">
                                    Organizer capacity
                                </span>
                                <span className="mt-1 block text-sm font-semibold text-white">
                                    {userPlan === "pro" ? "Pro" : "Free"} · {ownedLeagueCount} of{" "}
                                    {ownedLeagueLimit} hosted
                                </span>
                            </span>
                            <span
                                className="inline-flex items-center gap-1.5 text-sm font-semibold text-sky-200"
                                aria-hidden
                            >
                                <span>Upgrade</span>
                                <AnimatedArrow direction="up-right" className="text-base leading-none" />
                            </span>
                        </span>
                        <span
                            className="mt-2 block h-1.5 overflow-hidden rounded-full bg-white/10"
                            aria-hidden
                        >
                            <span
                                className="block h-full rounded-full bg-sky-300 transition-[width] duration-300 motion-reduce:transition-none"
                                style={{ width: `${slotUsagePercent}%` }}
                            />
                        </span>
                    </Link>
                ) : null}

                {listError ? (
                    <CommunityHubError
                        tone="league"
                        message={listError}
                        onRetry={handleRetry}
                        retrying={listLoading}
                    />
                ) : null}

                {/* An errored list is null, not empty — showing the "no Leagues yet"
                    empty state on top of the error would contradict it. */}
                {(cards?.length ?? 0) === 0 ? (
                    listError ? null : (
                        <div className="rounded-[24px] border border-dashed border-sky-300/20 bg-sky-400/[0.04] px-5 py-10 text-center">
                            <p className="text-base font-bold text-white">{emptyState.title}</p>
                            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-gray-400">
                                {emptyState.body}
                            </p>
                        </div>
                    )
                ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {(cards ?? []).map((group) => (
                            <CommunityHubCard
                                key={group.id}
                                group={group}
                                tone="league"
                                href={`/league/${group.id}`}
                            />
                        ))}
                    </div>
                )}

                {/* Hidden while an error is up: handleLoadMore has already advanced
                    the cursor past the page that failed, so tapping it again would
                    skip those rows for good. Retry is the only way forward. */}
                {hasMore && !listError ? (
                    <div className="flex justify-center pt-2">
                        <button
                            type="button"
                            onClick={handleLoadMore}
                            disabled={listLoading}
                            className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-6 py-2.5 text-sm font-semibold text-gray-200 transition hover:border-sky-400/50 hover:bg-sky-500/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {listLoading ? (
                                <span
                                    aria-hidden
                                    className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white"
                                />
                            ) : null}
                            Show more
                        </button>
                    </div>
                ) : null}
            </section>

            <CommunityJoinDialog
                open={joinOpen}
                scope="league"
                loading={joinLeagueLoading}
                error={joinLeagueError}
                crossType={joinLeagueCrossType}
                notFound={joinLeagueNotFound}
                onClose={() => {
                    setJoinOpen(false);
                    dispatch(clearJoinLeagueState());
                }}
                onSubmit={(inviteCode) => dispatch(joinLeagueRequest({ invite_code: inviteCode }))}
            />

            <ScoringModal
                open={scoringOpen}
                onClose={() => setScoringOpen(false)}
                variant="league"
            />
        </div>
    );
};

export default LeagueHub;
