"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
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
import type { ArenaSelector } from "@/lib/interfaces/interfaces";
import {
    clearJoinArenaState,
    fetchJoinedArenasRequest,
    fetchOwnedArenasRequest,
    joinArenaRequest,
} from "@/lib/redux/slices/arenaSlice";
import { useToast } from "@/lib/state/ToastContext";

const ARENA_HUB_PATH = "/arena";
const ARENA_CREATE_PATH = "/cag-form?type=arena";
const PAGE_SIZE = 10;

const normalizeView = (value: string | null): CommunityHubView | null =>
    value === "hosting" || value === "participating" ? value : null;

export const ArenaHub = () => {
    const router = useRouter();
    const dispatch = useDispatch();
    const searchParams = useSearchParams();
    const { setToast } = useToast();
    const currentUser = useCurrentUser();

    const {
        ownedArenas,
        ownedArenasLoading,
        ownedArenasError,
        ownedArenasHasMore,
        ownedArenasTotal,
        joinedArenas,
        joinedArenasLoading,
        joinedArenasError,
        joinedArenasHasMore,
        joinedArenasTotal,
        joinArenaLoading,
        joinArenaError,
        joinArenaMessage,
        joinArenaCrossType,
        joinArenaNotFound,
        joinedArena,
    } = useSelector((state: ArenaSelector) => state.arena);

    const [hostingPage, setHostingPage] = useState(1);
    const [participatingPage, setParticipatingPage] = useState(1);
    const [joinOpen, setJoinOpen] = useState(false);
    const [scoringOpen, setScoringOpen] = useState(false);
    const joinIntentHandledRef = useRef(false);
    const defaultViewAppliedRef = useRef(false);
    const joinHandledRef = useRef(false);
    const hasCompletedFirstLoadRef = useRef(false);

    const intent = searchParams.get("intent");
    const requestedView = normalizeView(searchParams.get("view"));

    // Both tabs load on mount — the tab badges show server totals, and the default
    // tab can't be chosen until the hosted count is known. See LeagueHub.
    useEffect(() => {
        if (!currentUser) return;
        dispatch(fetchOwnedArenasRequest({ page: 1, limit: PAGE_SIZE }));
        dispatch(fetchJoinedArenasRequest({ page: 1, limit: PAGE_SIZE }));
        setHostingPage(1);
        setParticipatingPage(1);
    }, [currentUser, dispatch]);

    const listsSettled = ownedArenas !== null && joinedArenas !== null;

    const activeView: CommunityHubView =
        intent === "join"
            ? "participating"
            : requestedView ?? (ownedArenasTotal > 0 ? "hosting" : "participating");

    useEffect(() => {
        if (intent || requestedView || !listsSettled || defaultViewAppliedRef.current) return;
        defaultViewAppliedRef.current = true;
        router.replace(`${ARENA_HUB_PATH}?view=${activeView}`);
    }, [activeView, intent, listsSettled, requestedView, router]);

    useEffect(() => {
        if (intent !== "join" || joinIntentHandledRef.current || !currentUser) return;
        joinIntentHandledRef.current = true;
        router.replace(`${ARENA_HUB_PATH}?view=participating`);
        // Clear first — arriving from the League hub's cross-type link must not
        // reopen the dialog showing the previous attempt's error. See LeagueHub.
        dispatch(clearJoinArenaState());
        setJoinOpen(true);
    }, [currentUser, dispatch, intent, router]);

    // Drop any in-flight join result on unmount, so a join that settles after the
    // user navigates away can't toast and force-navigate on the next mount.
    useEffect(
        () => () => {
            dispatch(clearJoinArenaState());
        },
        [dispatch]
    );

    // Handle each join exactly once — see the matching guard in LeagueHub.
    useEffect(() => {
        if (joinArenaLoading) {
            joinHandledRef.current = false;
            return;
        }
        if (!joinArenaMessage || joinHandledRef.current) return;
        joinHandledRef.current = true;

        setToast({
            id: Date.now(),
            type: "success",
            message: joinArenaMessage,
            duration: 3000,
        });
        setJoinOpen(false);

        const joinedId = joinedArena?.group_id;
        dispatch(clearJoinArenaState());
        dispatch(fetchJoinedArenasRequest({ page: 1, limit: PAGE_SIZE }));
        setParticipatingPage(1);
        if (joinedId) router.push(`/arena/${joinedId}`);
    }, [dispatch, joinArenaLoading, joinArenaMessage, joinedArena, router, setToast]);

    const cards = activeView === "hosting" ? ownedArenas : joinedArenas;
    const listLoading = activeView === "hosting" ? ownedArenasLoading : joinedArenasLoading;
    const listError = activeView === "hosting" ? ownedArenasError : joinedArenasError;
    const hasMore = activeView === "hosting" ? ownedArenasHasMore : joinedArenasHasMore;

    const handleLoadMore = () => {
        if (activeView === "hosting") {
            const nextPage = hostingPage + 1;
            setHostingPage(nextPage);
            dispatch(fetchOwnedArenasRequest({ page: nextPage, limit: PAGE_SIZE }));
            return;
        }
        const nextPage = participatingPage + 1;
        setParticipatingPage(nextPage);
        dispatch(fetchJoinedArenasRequest({ page: nextPage, limit: PAGE_SIZE }));
    };

    // Retries the page that failed, not page 1 — see LeagueHub.
    const handleRetry = () => {
        if (activeView === "hosting") {
            dispatch(fetchOwnedArenasRequest({ page: hostingPage, limit: PAGE_SIZE }));
            return;
        }
        dispatch(fetchJoinedArenasRequest({ page: participatingPage, limit: PAGE_SIZE }));
    };

    const emptyState = useMemo(
        () =>
            activeView === "hosting"
                ? {
                    title: "Create an Arena workspace",
                    body: "Launch a dedicated space for larger communities, staff, and structured contests.",
                }
                : {
                    title: "No participating Arenas yet",
                    body: "Use an Arena invite code to join its community and contests.",
                },
        [activeView]
    );

    // First paint only — see LeagueHub: gating on `listsSettled` would re-show the
    // skeleton on every Retry after a failed list and hide the error banner.
    if (!hasCompletedFirstLoadRef.current && (ownedArenasLoading || joinedArenasLoading)) {
        return <GroupsTabSkeleton />;
    }
    hasCompletedFirstLoadRef.current = true;

    return (
        <div className="flex flex-col gap-5 pb-8 text-white">
            <header className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <h1 className="mt-1 bg-gradient-to-r from-white via-violet-100 to-fuchsia-200 bg-clip-text text-3xl font-extrabold text-transparent sm:text-4xl">
                        Arenas
                    </h1>
                    <p className="mt-1 text-xs leading-5 text-gray-400 sm:text-sm">
                        Larger communities with structured contests.
                    </p>
                </div>
                <CommunityHubScoringButton tone="arena" onClick={() => setScoringOpen(true)} />
            </header>

            <CommunityHubTabs
                tone="arena"
                idPrefix="arena"
                basePath={ARENA_HUB_PATH}
                activeView={activeView}
                hostingCount={ownedArenasTotal}
                participatingCount={joinedArenasTotal}
                onSelect={(view) => router.push(`${ARENA_HUB_PATH}?view=${view}`)}
            />

            <section
                id={`arena-${activeView}-panel`}
                role="tabpanel"
                aria-labelledby={`arena-${activeView}-tab`}
                className="space-y-4 focus:outline-none"
            >
                {activeView === "hosting" ? (
                    <CommunityHubWorkspaceAction
                        tone="arena"
                        kind="new"
                        label="New Arena"
                        href={ARENA_CREATE_PATH}
                    />
                ) : (
                    <CommunityHubWorkspaceAction
                        tone="arena"
                        kind="join"
                        label="Join Arena"
                        onClick={() => {
                            dispatch(clearJoinArenaState());
                            setJoinOpen(true);
                        }}
                    />
                )}

                {listError ? (
                    <CommunityHubError
                        tone="arena"
                        message={listError}
                        onRetry={handleRetry}
                        retrying={listLoading}
                    />
                ) : null}

                {/* See LeagueHub: an errored list is null, not empty. */}
                {(cards?.length ?? 0) === 0 ? (
                    listError ? null : (
                        <div className="rounded-2xl border border-dashed border-violet-300/20 bg-violet-500/[0.045] px-5 py-8 text-center">
                            <h3 className="text-base font-bold text-white">{emptyState.title}</h3>
                            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-400">
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
                                tone="arena"
                                href={`/arena/${group.id}`}
                            />
                        ))}
                    </div>
                )}

                {/* Hidden while an error is up — see LeagueHub: the cursor has
                    already advanced past the failed page. */}
                {hasMore && !listError ? (
                    <div className="flex justify-center pt-2">
                        <button
                            type="button"
                            onClick={handleLoadMore}
                            disabled={listLoading}
                            className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-6 py-2.5 text-sm font-semibold text-gray-200 transition hover:border-violet-400/50 hover:bg-violet-500/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
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
                scope="arena"
                loading={joinArenaLoading}
                error={joinArenaError}
                crossType={joinArenaCrossType}
                notFound={joinArenaNotFound}
                onClose={() => {
                    setJoinOpen(false);
                    dispatch(clearJoinArenaState());
                }}
                onSubmit={(inviteCode) => dispatch(joinArenaRequest({ invite_code: inviteCode }))}
            />

            <ScoringModal
                open={scoringOpen}
                onClose={() => setScoringOpen(false)}
                variant="league"
            />
        </div>
    );
};

export default ArenaHub;
