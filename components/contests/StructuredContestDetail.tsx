"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import BackButton from "@/components/ui/BackButton";
import type {
    ArenaContest,
    ArenaContestParticipant,
    ArenaContestTransition,
    GroupSelector,
    RootState,
} from "@/lib/interfaces/interfaces";
import { useToast } from "@/lib/state/ToastContext";
import { fetchGroupByIdRequest } from "@/lib/redux/slices/groupsSlice";
import {
    advanceArenaContestRequest,
    clearAdvanceArenaContestMessage,
    clearArenaContestDetail,
    clearJoinArenaContestMessage,
    clearSubmitArenaContestEntryState,
    fetchArenaContestDetailRequest,
    fetchArenaContestsRequest,
    joinArenaContestRequest,
    submitArenaContestEntryRequest,
} from "@/lib/redux/slices/arenaSlice";
import { fetchLiveNFLScheduleRequest } from "@/lib/redux/slices/nflSlice";
import {
    buildCommunityPickPayload,
    buildMoneylineStaffPickOptions,
} from "@/components/feed/staffPickOdds";
import { formatStructuredFeedAmericanOdds } from "@/components/feed/formatters";
import { formatDateTime } from "@/lib/utils/date";

// commissioner = Arena owner; both owner and manager operate contests but never
// compete in them.
const isStaffRole = (role: string | undefined) =>
    role === "commissioner" || role === "manager";

const LIFECYCLE_STEPS = [
    "draft",
    "scheduled",
    "open",
    "locked",
    "grading",
    "final",
    "archived",
] as const;

const statusLabel = (contest: ArenaContest) => {
    if (contest.review_status === "review_required") return "Review Required";
    if (contest.review_status === "proposed_standings") return "Proposed standings";
    if (contest.review_status === "pending_point_confirmation") {
        return "Pending point confirmation";
    }
    if (contest.lifecycle_status === "final") return "Final · frozen";
    return (
        contest.lifecycle_status[0].toUpperCase() +
        contest.lifecycle_status.slice(1)
    );
};

const statusTone = (contest: ArenaContest) => {
    if (contest.lifecycle_status === "final") {
        return "border-emerald-300/25 bg-emerald-500/10 text-emerald-100";
    }
    if (
        contest.review_status === "review_required" ||
        contest.review_status === "proposed_standings" ||
        contest.review_status === "pending_point_confirmation" ||
        contest.lifecycle_status === "locked" ||
        contest.lifecycle_status === "grading"
    ) {
        return "border-amber-300/25 bg-amber-500/10 text-amber-100";
    }
    if (contest.lifecycle_status === "open") {
        return "border-sky-300/25 bg-sky-500/10 text-sky-100";
    }
    return "border-white/10 bg-white/[0.04] text-gray-300";
};

// Phase 1 surfaces only the two transitions staff asked for: draft → scheduled and
// scheduled → open. lock / grading / archive have backend endpoints too (and the
// saga already handles them), but stay out of the UI until their prerequisites
// exist — lock/grading are only meaningful once members can build entries, and
// archive needs finalize (grading → final), which has no endpoint yet.
// TODO(api): add "open" → { lock }, "locked" → { grading }, "final" → { archive }
// here once those flows land.
const nextTransition = (
    contest: ArenaContest
): { action: ArenaContestTransition; label: string } | null => {
    if (contest.lifecycle_status === "draft") {
        return { action: "schedule", label: "Schedule contest" };
    }
    if (contest.lifecycle_status === "scheduled") {
        return { action: "open", label: "Open contest" };
    }
    return null;
};

type ParticipantTone = "sky" | "amber" | "emerald" | "muted" | "red";

const participantToneClasses: Record<ParticipantTone, string> = {
    sky: "border-sky-300/25 bg-sky-500/10 text-sky-100",
    amber: "border-amber-300/25 bg-amber-500/10 text-amber-100",
    emerald: "border-emerald-300/25 bg-emerald-500/10 text-emerald-100",
    muted: "border-white/10 bg-white/[0.04] text-gray-300",
    red: "border-red-300/25 bg-red-500/10 text-red-100",
};

// The member's own participation copy. Mirrors the backend join rules: opting in is
// not the same as entering, and the deadline / rules-version gates change the tone.
const participantCopy = (
    participant: ArenaContestParticipant | null,
    opts: { rulesCurrent: boolean; joinWindowOpen: boolean; deadlinePassed: boolean }
): { title: string; body: string; tone: ParticipantTone } => {
    const { rulesCurrent, joinWindowOpen, deadlinePassed } = opts;
    if (!participant) {
        if (deadlinePassed) {
            return {
                title: "Entry window closed",
                body: "The deadline passed before you joined. No entry, rank, or points can be recorded.",
                tone: "muted",
            };
        }
        if (!joinWindowOpen) {
            return {
                title: "Not open for entries",
                body: "You can join once an organizer opens this contest for entries.",
                tone: "muted",
            };
        }
        return {
            title: "Available to join",
            body: "Review and accept the current rules to opt in.",
            tone: "sky",
        };
    }
    if (deadlinePassed && ["eligible", "opted_in"].includes(participant.status)) {
        return {
            title: "Missed deadline",
            body: "No complete valid entry was received. You are not ranked and earn no points.",
            tone: "muted",
        };
    }
    if (!rulesCurrent && ["eligible", "opted_in"].includes(participant.status)) {
        return {
            title: "Rules acceptance required",
            body: "The rules changed after your previous acceptance. Review the current version before entering.",
            tone: "amber",
        };
    }
    switch (participant.status) {
        case "eligible":
            return {
                title: "Available to join",
                body: "Review and accept the rules to opt in.",
                tone: "sky",
            };
        case "opted_in":
            return {
                title: "Joined — entry still required",
                body: "You accepted the rules, but opting in does not count as entering. Submit a complete valid entry before lock.",
                tone: "amber",
            };
        case "entered":
            return {
                title: "Entry submitted",
                body: "Your complete entry has a receipt and remains editable only while the entry window is open.",
                tone: "emerald",
            };
        case "locked":
            return {
                title: "Entry locked",
                body: "Your accepted entry is read-only while grading runs.",
                tone: "sky",
            };
        case "completed":
            return {
                title: "Contest complete",
                body: "Your result is available in the final standings.",
                tone: "emerald",
            };
        case "missed_deadline":
            return {
                title: "Missed deadline",
                body: "No complete valid entry was received. You are not ranked and earn no points.",
                tone: "muted",
            };
        case "withdrawn":
            return {
                title: "Withdrawn",
                body: "This participation record is no longer active.",
                tone: "muted",
            };
        case "disqualified":
            return {
                title: "Disqualified",
                body: "This entry is ineligible for ranking, points, and achievements.",
                tone: "red",
            };
        default:
            return { title: "Participation", body: "", tone: "muted" };
    }
};

export type StructuredContestDetailProps = {
    arenaId: string;
    contestId: string;
};

export const StructuredContestDetail = ({
    arenaId,
    contestId,
}: StructuredContestDetailProps) => {
    const dispatch = useDispatch();
    const { setToast } = useToast();
    const [showRules, setShowRules] = useState(false);
    const [rulesAccepted, setRulesAccepted] = useState(false);
    const [entrySelectionId, setEntrySelectionId] = useState("");
    const entrySubmitRequestedRef = useRef(false);

    const { group: arena } = useSelector((state: GroupSelector) => state.group);
    const {
        contestDetail,
        contestDetailArena,
        contestMyParticipation,
        arenaContests,
        contestDetailLoading,
        advanceContestLoading,
        advanceContestError,
        advanceContestMessage,
        joinContestLoading,
        joinContestError,
        joinContestMessage,
        submitEntryLoading,
        submitEntryError,
        submitEntryMessage,
    } = useSelector((state: RootState) => state.arena);
    const { nflSchedulesWithOdds } = useSelector((state: RootState) => state.nfl);

    const backHref = `/arena/${arenaId}?tab=contests`;

    // Load everything the page reads. The group carries the viewer's role, hosting
    // decides writability, the contest detail is the page's subject, and the list is
    // a deep-link/refresh fallback so the page can render before detail resolves.
    useEffect(() => {
        if (!arenaId || !contestId) return;
        dispatch(
            fetchArenaContestDetailRequest({
                arena_id: arenaId,
                contest_id: contestId,
            })
        );
        dispatch(fetchArenaContestsRequest({ arena_id: arenaId }));
        // Live NFL moneyline odds feed the single-pick entry builder below.
        dispatch(fetchLiveNFLScheduleRequest(undefined));
        if (arena?.id !== arenaId) {
            dispatch(fetchGroupByIdRequest({ groupId: arenaId }));
        }
    }, [arenaId, contestId, arena?.id, dispatch]);

    // Drop any stale entry-submit state left by a prior page, so its result can't
    // re-toast on this fresh mount.
    useEffect(() => {
        dispatch(clearSubmitArenaContestEntryState());
    }, [dispatch]);

    // Clear the detail on unmount so a stale contest can't flash on the next open.
    useEffect(() => () => {
        dispatch(clearArenaContestDetail());
    }, [dispatch]);

    // Surface entry-submit results (only for a submit started on THIS page); on
    // success, refresh the detail so participation flips to "entered".
    useEffect(() => {
        if (!entrySubmitRequestedRef.current) return;
        if (!submitEntryError && !submitEntryMessage) return;
        entrySubmitRequestedRef.current = false;
        setToast({
            id: Date.now(),
            type: submitEntryError ? "error" : "success",
            message: submitEntryError ?? submitEntryMessage ?? "",
            duration: 3000,
        });
        if (submitEntryMessage) {
            setEntrySelectionId("");
            dispatch(
                fetchArenaContestDetailRequest({
                    arena_id: arenaId,
                    contest_id: contestId,
                })
            );
        }
        dispatch(clearSubmitArenaContestEntryState());
    }, [submitEntryError, submitEntryMessage, arenaId, contestId, dispatch, setToast]);

    // Surface advance results as a toast, then clear the one-shot.
    useEffect(() => {
        if (!advanceContestError && !advanceContestMessage) return;
        setToast({
            id: Date.now(),
            type: advanceContestError ? "error" : "success",
            message: advanceContestError ?? advanceContestMessage ?? "",
            duration: 3000,
        });
        dispatch(clearAdvanceArenaContestMessage());
    }, [advanceContestError, advanceContestMessage, dispatch, setToast]);

    // Surface join results as a toast; on success, close the rules dialog. The
    // returned participant already updated contestMyParticipation in the reducer.
    useEffect(() => {
        if (!joinContestError && !joinContestMessage) return;
        setToast({
            id: Date.now(),
            type: joinContestError ? "error" : "success",
            message: joinContestError ?? joinContestMessage ?? "",
            duration: 3000,
        });
        if (joinContestMessage) {
            setShowRules(false);
            setRulesAccepted(false);
        }
        dispatch(clearJoinArenaContestMessage());
    }, [joinContestError, joinContestMessage, dispatch, setToast]);

    // Prefer the detail record; fall back to the list row so navigating in from the
    // contests tab renders instantly while the detail request is in flight.
    const contest = useMemo(() => {
        if (contestDetail?.id === contestId) return contestDetail;
        return arenaContests.find((candidate) => candidate.id === contestId);
    }, [contestDetail, arenaContests, contestId]);

    // NFL moneyline options for the single-pick entry builder. Computed before the
    // early return so hook order stays stable; narrowed to the contest's eligible
    // games below.
    const { options: entryOptions, detailById: entryDetailById } = useMemo(
        () => buildMoneylineStaffPickOptions(nflSchedulesWithOdds?.events, Date.now()),
        [nflSchedulesWithOdds],
    );

    const role =
        arena?.id === arenaId ? arena?.current_user_member?.role : undefined;
    const isStaff = isStaffRole(role);

    if (!contest) {
        return (
            <div className="space-y-5 pb-10">
                <BackButton fallback={backHref} preferFallback />
                <section className="rounded-xl border border-dashed border-white/15 bg-black/30 p-6">
                    <h1 className="font-semibold text-white">
                        {contestDetailLoading
                            ? "Loading contest…"
                            : "Contest unavailable"}
                    </h1>
                    <p className="mt-2 text-sm text-gray-500">
                        {contestDetailLoading
                            ? "Fetching the latest contest state."
                            : "This contest could not be found in this Arena."}
                    </p>
                </section>
            </div>
        );
    }

    const lifecycleIndex =
        contest.lifecycle_status === "canceled"
            ? -1
            : (LIFECYCLE_STEPS as readonly string[]).indexOf(
                  contest.lifecycle_status
              );
    const transition = nextTransition(contest);

    // "Open" is blocked until the scheduled open time — the server enforces this
    // too (400 before opens_at); we mirror it as a disabled-button hint. Scheduling
    // a draft has no timing gate.
    const advanceDisabledReason =
        transition?.action === "open" &&
        contest.opens_at &&
        Date.now() < Date.parse(contest.opens_at)
            ? `Available ${formatDateTime(contest.opens_at)}.`
            : undefined;

    const handleAdvance = () => {
        if (!transition || advanceContestLoading || advanceDisabledReason) return;
        dispatch(
            advanceArenaContestRequest({
                arena_id: arenaId,
                contest_id: contestId,
                action: transition.action,
            })
        );
    };

    // ---- Member participation (Join) --------------------------------------
    // Only role "member" can join; owners/managers are noncompetitive. Role comes
    // from the group; until it loads, isMember is false and the section is hidden.
    const isMember = role === "member";
    const myParticipation = contestMyParticipation;
    const rulesCurrent =
        myParticipation?.rules_version_accepted === contest.rules_version;
    const nowMs = Date.now();
    const locksAtMs = Date.parse(contest.locks_at);
    const opensAtMs = contest.opens_at ? Date.parse(contest.opens_at) : null;
    const deadlinePassed = Number.isFinite(locksAtMs) && nowMs >= locksAtMs;
    // Mirrors the backend join window: OPEN, past opens_at, before locks_at.
    const joinWindowOpen =
        contest.lifecycle_status === "open" &&
        !deadlinePassed &&
        (opensAtMs === null || nowMs >= opensAtMs);
    const canJoin =
        isMember &&
        joinWindowOpen &&
        (!myParticipation ||
            myParticipation.status === "eligible" ||
            (myParticipation.status === "opted_in" && !rulesCurrent));
    const participantState = participantCopy(myParticipation ?? null, {
        rulesCurrent,
        joinWindowOpen,
        deadlinePassed,
    });

    const handleJoin = () => {
        if (!canJoin || !rulesAccepted || joinContestLoading) return;
        dispatch(
            joinArenaContestRequest({
                contest_id: contestId,
                rules_version: contest.rules_version,
            })
        );
    };

    // ---- Member single-pick entry builder --------------------------------
    // Available once the member is opted_in (joined) with current rules, while the
    // window is open, for single_pick contests. Selections are the NFL moneyline
    // options narrowed to the contest's eligible games (if it restricts any).
    const eligibleGameIds = new Set(contest.eligible_game_ids ?? []);
    const entrySelectionOptions =
        eligibleGameIds.size === 0
            ? entryOptions
            : entryOptions.filter((option) => {
                const detail = entryDetailById[option.id];
                return Boolean(detail && eligibleGameIds.has(detail.gameId));
            });
    const selectedEntryOption = entrySelectionOptions.find(
        (option) => option.id === entrySelectionId,
    );
    const isSinglePick = contest.entry_model === "single_pick";
    const canBuildEntry =
        isMember &&
        joinWindowOpen &&
        rulesCurrent &&
        myParticipation?.status === "opted_in" &&
        isSinglePick;

    const handleSubmitEntry = () => {
        if (!canBuildEntry || !selectedEntryOption || submitEntryLoading) return;
        const detail = entryDetailById[selectedEntryOption.id];
        if (!detail) return;
        // Re-check the live clock: the option list froze kickoff windows at fetch.
        if (Date.parse(detail.match_date) <= Date.now()) {
            setToast({
                id: Date.now(),
                type: "error",
                message: "That game has already started. Refresh for the latest slate.",
                duration: 3000,
            });
            return;
        }
        entrySubmitRequestedRef.current = true;
        const entry = {
            ...buildCommunityPickPayload(detail, arenaId, ""),
            sourceTab: "arena_competitive",
        };
        dispatch(
            submitArenaContestEntryRequest({
                contest_id: contestId,
                arena_id: arenaId,
                entry,
            })
        );
    };

    // Prefer the arena name the detail endpoint returns (authoritative for this
    // contest's arena); fall back to the loaded group, then a generic label.
    const contextName =
        contestDetailArena?.name ??
        (arena?.id === arenaId ? arena?.name : undefined) ??
        "Arena";

    return (
        <div className="flex flex-col gap-5 pb-10">
            {/* ---------------------------------------------------------------
              Header — LIVE. Renders from the ArenaContest record (list/detail).
            ---------------------------------------------------------------- */}
            <header className="-mx-5 border-b border-white/10 px-5 pb-4 sm:mx-0 sm:px-0">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <BackButton fallback={backHref} preferFallback />
                    <span
                        className={`rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] ${statusTone(contest)}`}
                    >
                        {statusLabel(contest)}
                    </span>
                </div>
                <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.13em] text-gray-500">
                    {contextName} · Feed contest
                </p>
                <h1 className="mt-1 text-2xl font-semibold text-white sm:text-3xl">
                    {contest.name}
                </h1>
                {contest.description ? (
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-400">
                        {contest.description}
                    </p>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-400">
                    <span className="rounded-full border border-white/10 px-2.5 py-1">
                        {contest.sport}
                    </span>
                    <span className="rounded-full border border-white/10 px-2.5 py-1">
                        Locks {formatDateTime(contest.locks_at)}
                    </span>
                    <span className="rounded-full border border-white/10 px-2.5 py-1">
                        Top {contest.winning_places}
                    </span>
                </div>
            </header>

            {/* ---------------------------------------------------------------
              Lifecycle tracker — LIVE. Renders from lifecycle_status.
            ---------------------------------------------------------------- */}
            <section
                aria-label="Contest lifecycle"
                className="overflow-x-auto rounded-xl border border-white/10 bg-black/25 p-3"
            >
                <ol className="flex min-w-max items-center gap-2">
                    {LIFECYCLE_STEPS.map((step, index) => {
                        const reached = lifecycleIndex >= index;
                        const current = contest.lifecycle_status === step;
                        return (
                            <li key={step} className="flex items-center gap-2">
                                <span
                                    aria-current={current ? "step" : undefined}
                                    className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] ${
                                        current
                                            ? "border-sky-300/50 bg-sky-500/15 text-sky-100"
                                            : reached
                                                ? "border-emerald-300/20 bg-emerald-500/10 text-emerald-100/80"
                                                : "border-white/10 text-gray-600"
                                    }`}
                                >
                                    {step}
                                </span>
                                {index < LIFECYCLE_STEPS.length - 1 ? (
                                    <span aria-hidden className="text-gray-700">
                                        →
                                    </span>
                                ) : null}
                            </li>
                        );
                    })}
                </ol>
            </section>

            {/* ---------------------------------------------------------------
              Organizer · noncompetitive banner — LIVE (staff only).
            ---------------------------------------------------------------- */}
            {isStaff ? (
                <section className="rounded-xl border border-amber-300/25 bg-amber-500/10 p-4 text-amber-100">
                    <p className="font-semibold">Organizer · noncompetitive</p>
                    <p className="mt-1 text-sm leading-6 text-amber-100/75">
                        Arena owners and managers may operate this contest, but cannot
                        join, rank, or earn Arena Points.
                    </p>
                </section>
            ) : null}

            {/* ---------------------------------------------------------------
              Your contest entry — LIVE (member only). Participation state + Join.
            ---------------------------------------------------------------- */}
            {isMember ? (
                <section
                    aria-label="Your contest entry"
                    className={`rounded-2xl border p-5 ${participantToneClasses[participantState.tone]}`}
                >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] opacity-70">
                                Your contest state
                            </p>
                            <h2 className="mt-1 font-semibold">
                                {participantState.title}
                            </h2>
                        </div>
                        {myParticipation?.entered_at ? (
                            <span className="text-xs opacity-70">
                                Received {formatDateTime(myParticipation.entered_at)}
                            </span>
                        ) : myParticipation?.opted_in_at ? (
                            <span className="text-xs opacity-70">
                                Joined {formatDateTime(myParticipation.opted_in_at)}
                            </span>
                        ) : null}
                    </div>
                    <p className="mt-2 max-w-3xl text-sm leading-6 opacity-80">
                        {participantState.body}
                    </p>

                    {canJoin ? (
                        <button
                            type="button"
                            onClick={() => {
                                setShowRules(true);
                                setRulesAccepted(false);
                            }}
                            className="mt-4 rounded-xl bg-white px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.09em] text-black transition hover:bg-gray-200"
                        >
                            {myParticipation?.status === "opted_in"
                                ? "Review updated rules"
                                : "Join Contest"}
                        </button>
                    ) : null}

                    {/* Single-pick entry builder — LIVE (opted_in, open window). */}
                    {canBuildEntry ? (
                        <div className="mt-4 rounded-xl border border-white/10 bg-black/25 p-4">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] opacity-70">
                                Build your entry
                            </p>
                            <h3 className="mt-1 font-semibold text-white">
                                Single pick · one NFL moneyline
                            </h3>
                            <p className="mt-1 text-xs leading-5 opacity-70">
                                Choose one priced selection. Submitting records your
                                complete entry; you can replace it from the Feed while the
                                window is open.
                            </p>
                            {entrySelectionOptions.length ? (
                                <>
                                    <label className="mt-3 block text-xs font-semibold uppercase tracking-[0.1em] opacity-70">
                                        Selection
                                        <select
                                            value={entrySelectionId}
                                            onChange={(event) =>
                                                setEntrySelectionId(event.target.value)
                                            }
                                            className="mt-2 w-full rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-sm normal-case text-white outline-none transition focus:border-sky-300/60"
                                        >
                                            <option value="">
                                                Choose a priced selection
                                            </option>
                                            {entrySelectionOptions.map((option) => (
                                                <option
                                                    key={option.id}
                                                    value={option.id}
                                                    disabled={option.disabled}
                                                >
                                                    {option.label} ·{" "}
                                                    {formatStructuredFeedAmericanOdds(
                                                        option.quote.americanOdds
                                                    )}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                    {selectedEntryOption ? (
                                        <div className="mt-3 rounded-xl border border-sky-300/20 bg-sky-500/10 p-3">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <p className="text-sm font-semibold text-white">
                                                    {selectedEntryOption.label}
                                                </p>
                                                <span className="font-mono text-sm font-semibold text-sky-100">
                                                    {formatStructuredFeedAmericanOdds(
                                                        selectedEntryOption.quote
                                                            .americanOdds
                                                    )}
                                                </span>
                                            </div>
                                            {selectedEntryOption.description ? (
                                                <p className="mt-1 text-xs leading-5 opacity-70">
                                                    {selectedEntryOption.description}
                                                </p>
                                            ) : null}
                                            <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-sky-100/70">
                                                Potential Arena Points
                                            </p>
                                            <p className="mt-0.5 text-sm font-semibold text-sky-100">
                                                +
                                                {selectedEntryOption.quote.potentialPoints}{" "}
                                                Arena Points
                                            </p>
                                        </div>
                                    ) : null}
                                    <button
                                        type="button"
                                        onClick={handleSubmitEntry}
                                        disabled={
                                            !selectedEntryOption || submitEntryLoading
                                        }
                                        className="mt-4 rounded-xl bg-white px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.09em] text-black transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        {submitEntryLoading
                                            ? "Submitting…"
                                            : "Submit entry"}
                                    </button>
                                </>
                            ) : (
                                <p className="mt-3 rounded-xl border border-dashed border-white/15 p-3 text-xs leading-5 opacity-70">
                                    No eligible pregame NFL selections are available right
                                    now.
                                </p>
                            )}
                        </div>
                    ) : null}

                    {/* Non-single-pick templates (combo / pick'em) aren't buildable here yet. */}
                    {isMember &&
                    myParticipation?.status === "opted_in" &&
                    rulesCurrent &&
                    joinWindowOpen &&
                    !isSinglePick ? (
                        <p className="mt-4 rounded-xl border border-white/10 bg-black/25 p-3 text-xs leading-5 opacity-70">
                            This contest uses the{" "}
                            {contest.template.replaceAll("_", " ")} entry format, which
                            isn&apos;t buildable here yet.
                        </p>
                    ) : null}

                    {/* Accepted entry receipt (entered). */}
                    {myParticipation?.status === "entered" ? (
                        <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] opacity-70">
                                Accepted entry
                            </p>
                            <p className="mt-1 text-sm leading-6 opacity-80">
                                Your entry is in. It stays editable from the Feed (Replace
                                pick) while the contest is open, and is revealed to
                                everyone when it locks.
                            </p>
                        </div>
                    ) : null}
                </section>
            ) : null}

            {/* ---------------------------------------------------------------
              Rules review + accept-to-join dialog — LIVE (member only).
            ---------------------------------------------------------------- */}
            {showRules && isMember ? (
                <section
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="contest-rules-title"
                    className="rounded-2xl border border-sky-300/30 bg-[#0a101b] p-5 shadow-2xl"
                >
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-sky-200">
                                Rules version {contest.rules_version}
                            </p>
                            <h2
                                id="contest-rules-title"
                                className="mt-1 text-lg font-semibold text-white"
                            >
                                Review before joining
                            </h2>
                        </div>
                        <button
                            type="button"
                            aria-label="Close contest rules"
                            onClick={() => {
                                setShowRules(false);
                                setRulesAccepted(false);
                            }}
                            className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-gray-400 transition hover:text-white"
                        >
                            Close
                        </button>
                    </div>
                    <div className="mt-4 whitespace-pre-wrap rounded-xl border border-white/10 bg-black/35 p-4 text-sm leading-6 text-gray-300">
                        {contest.rules_text ||
                            "No rules text was provided for this contest."}
                    </div>
                    <label className="mt-4 flex items-start gap-3 text-sm leading-6 text-gray-200">
                        <input
                            type="checkbox"
                            checked={rulesAccepted}
                            onChange={(event) =>
                                setRulesAccepted(event.target.checked)
                            }
                            className="mt-1 h-4 w-4 accent-sky-400"
                        />
                        <span>
                            I reviewed version {contest.rules_version} and understand
                            that joining alone is not a complete entry.
                        </span>
                    </label>
                    <button
                        type="button"
                        onClick={handleJoin}
                        disabled={!rulesAccepted || joinContestLoading}
                        className="mt-4 rounded-xl bg-sky-200 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.09em] text-black transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        {joinContestLoading ? "Joining…" : "Accept rules and join"}
                    </button>
                </section>
            ) : null}

            {/* ===============================================================
              TODO(api): Standings section.
              Needs: proposed/final standings rows + per-user achievements
              (GET /group/arena/contest → standings, achievements).
            ================================================================ */}

            {/* ---------------------------------------------------------------
              Organizer workspace — LIVE (staff only). Phase 1: Schedule / Open.
            ---------------------------------------------------------------- */}
            {isStaff ? (
                <section
                    aria-label="Organizer workspace"
                    className="space-y-5 rounded-2xl border border-white/10 bg-white/[0.04] p-5"
                >
                    <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-sky-200">
                            Organizer workspace
                        </p>
                        <h2 className="mt-1 font-semibold text-white">
                            Advance the contest lifecycle
                        </h2>
                        <p className="mt-2 text-sm leading-6 text-gray-500">
                            Move the contest from draft → scheduled → open. Ranking,
                            point amounts, and final results are not directly editable.
                        </p>
                    </div>

                    {/* ===========================================================
                      TODO(api): organizer stat tiles. participant_count is ALREADY
                      in the detail response (state.arena.contestParticipantCount);
                      joined / valid-entries / open-reviews still need the
                      participants + review APIs.
                      TODO(api): review exceptions list + resolve — needs review API.
                      TODO(api): Finalize contest button — needs standings + finalize.
                    ============================================================ */}

                    <div className="flex flex-wrap gap-2 border-t border-white/10 pt-4">
                        {transition ? (
                            <button
                                type="button"
                                disabled={
                                    Boolean(advanceDisabledReason) ||
                                    advanceContestLoading
                                }
                                title={advanceDisabledReason}
                                onClick={handleAdvance}
                                className="rounded-xl border border-sky-300/35 bg-sky-500/10 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.09em] text-sky-100 transition hover:bg-sky-500/15 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                {advanceContestLoading ? "Working…" : transition.label}
                            </button>
                        ) : (
                            <p className="text-xs text-gray-500">
                                No lifecycle action is available from the{" "}
                                <span className="font-semibold text-gray-300">
                                    {contest.lifecycle_status}
                                </span>{" "}
                                state yet. Later transitions (lock, grading, archive)
                                unlock as the remaining sections are enabled.
                            </p>
                        )}
                        {advanceDisabledReason ? (
                            <p className="basis-full text-xs text-gray-500">
                                {advanceDisabledReason}
                            </p>
                        ) : null}
                    </div>
                </section>
            ) : null}

            {/* ===============================================================
              TODO(api): Reverse-award modal — ORGANIZER. Needs point ledger +
              reverse-award API. Only relevant after finalization.
            ================================================================ */}
        </div>
    );
};

export default StructuredContestDetail;
