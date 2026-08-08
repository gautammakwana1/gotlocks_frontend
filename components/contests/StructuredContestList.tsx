"use client";

import Link from "next/link";
import type {
    ContestParticipant,
} from "@/lib/domain/community";
import { formatDateTime } from "@/lib/utils/date";
import { ArenaContest } from "@/lib/interfaces/interfaces";

type ContestTone = "muted" | "sky" | "amber" | "emerald" | "red";

const toneClasses: Record<ContestTone, string> = {
    muted: "border-white/10 bg-white/[0.04] text-gray-400",
    sky: "border-sky-300/25 bg-sky-500/10 text-sky-100",
    amber: "border-amber-300/25 bg-amber-500/10 text-amber-100",
    emerald: "border-emerald-300/25 bg-emerald-500/10 text-emerald-100",
    red: "border-red-300/25 bg-red-500/10 text-red-100",
};

const lifecycleTone = (
    status: ArenaContest["lifecycle_status"],
): ContestTone => {
    if (status === "open") return "emerald";
    if (status === "locked" || status === "grading") return "amber";
    if (status === "final") return "sky";
    if (status === "canceled") return "red";
    return "muted";
};

const lifecycleLabel = (
    status: ArenaContest["lifecycle_status"],
) => status[0].toUpperCase() + status.slice(1);

const reviewLabel = (contest: ArenaContest) => {
    if (contest.review_status === "review_required") return "Review Required";
    if (contest.review_status === "proposed_standings") return "Proposed standings";
    if (contest.review_status === "pending_point_confirmation") {
        return "Pending point confirmation";
    }
    return null;
};

const participantLabel = (
    contest: ArenaContest,
    participant: ContestParticipant | undefined,
) => {
    if (!participant) {
        return contest.lifecycle_status === "open" &&
            Date.now() < Date.parse(contest.locks_at)
            ? { label: "Available to join", tone: "sky" as const }
            : null;
    }

    switch (participant.status) {
        case "eligible":
            if (Date.now() >= Date.parse(contest.locks_at)) {
                return { label: "Missed deadline", tone: "muted" as const };
            }
            return { label: "Available to join", tone: "sky" as const };
        case "opted_in":
            if (Date.now() >= Date.parse(contest.locks_at)) {
                return { label: "Missed deadline", tone: "muted" as const };
            }
            return { label: "Joined · entry required", tone: "amber" as const };
        case "entered":
            return { label: "Entry submitted", tone: "emerald" as const };
        case "locked":
            return { label: "Entry locked", tone: "sky" as const };
        case "completed":
            return { label: "Results ready", tone: "emerald" as const };
        case "missed_deadline":
            return { label: "Missed deadline", tone: "muted" as const };
        case "withdrawn":
            return { label: "Withdrawn", tone: "muted" as const };
        case "disqualified":
            return { label: "Disqualified", tone: "red" as const };
    }
};

const templateLabel = (template: ArenaContest["template"]) =>
    template
        .replaceAll("_", " ")
        .replace(/\b\w/g, (character) => character.toUpperCase());

export type StructuredContestListProps = {
    title: string;
    description?: string;
    contests: readonly ArenaContest[];
    participants: readonly ContestParticipant[];
    currentUserId: string;
    detailHref: (contest: ArenaContest) => string;
    organizer?: boolean;
    staffNoncompetitive?: boolean;
    createHref?: string;
    createDisabledReason?: string;
    emptyTitle?: string;
    emptyBody?: string;
    className?: string;
};

export const StructuredContestList = ({
    title,
    description,
    contests,
    participants,
    currentUserId,
    detailHref,
    organizer = false,
    staffNoncompetitive = false,
    createHref,
    createDisabledReason,
    emptyTitle = "No Feed contests yet",
    emptyBody = "New contests will appear here when an organizer makes them available.",
    className = "",
}: StructuredContestListProps) => {
    const sortedContests = [...contests].sort((left, right) => {
        const archivedDelta =
            Number(left.lifecycle_status === "archived") -
            Number(right.lifecycle_status === "archived");
        return archivedDelta || right.created_at.localeCompare(left.created_at);
    });

    return (
        <section
            aria-label={title}
            className={`space-y-4 rounded-2xl border border-white/10 bg-black/20 p-4 sm:p-5 ${className}`.trim()}
        >
            <header className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-white">
                        {title}
                    </h2>
                    {description ? (
                        <p className="mt-1 max-w-2xl text-xs leading-5 text-gray-500">
                            {description}
                        </p>
                    ) : null}
                </div>

                {organizer && createHref ? (
                    <Link
                        href={createHref}
                        className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-sky-300/35 bg-sky-500/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-sky-100 transition hover:border-sky-200/70 hover:bg-sky-500/15"
                    >
                        <span aria-hidden>+</span>
                        Create contest
                    </Link>
                ) : organizer && createDisabledReason ? (
                    <span
                        aria-disabled="true"
                        title={createDisabledReason}
                        className="shrink-0 rounded-xl border border-white/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-600"
                    >
                        Create unavailable
                    </span>
                ) : null}
            </header>

            {staffNoncompetitive ? (
                <div className="rounded-xl border border-amber-300/20 bg-amber-500/10 px-4 py-3">
                    <p className="text-xs font-semibold text-amber-100">
                        Organizer · noncompetitive
                    </p>
                    <p className="mt-1 text-xs leading-5 text-amber-100/70">
                        Arena owners and managers can operate contests, but cannot join, rank,
                        or earn Arena Points.
                    </p>
                </div>
            ) : null}

            {createDisabledReason ? (
                <p className="text-xs leading-5 text-amber-100/80">
                    {createDisabledReason}
                </p>
            ) : null}

            {sortedContests.length ? (
                <div className="grid gap-3 md:grid-cols-2">
                    {sortedContests.map((contest) => {
                        const participant = participants.find(
                            (candidate) =>
                                candidate.contestId === contest.id &&
                                candidate.userId === currentUserId,
                        );
                        const participantState = staffNoncompetitive
                            ? null
                            : participantLabel(contest, participant);
                        const internalReviewLabel = reviewLabel(contest);
                        // const openReviewCount = organizer
                        //     ? reviewExceptions.filter(
                        //         (exception) =>
                        //             exception.contestId === contest.id &&
                        //             exception.status === "open",
                        //     ).length
                        //     : 0;

                        return (
                            <Link
                                key={contest.id}
                                href={detailHref(contest)}
                                aria-label={`View ${contest.name} contest`}
                                className="group block rounded-xl border border-white/10 bg-black/35 p-4 transition hover:border-sky-300/55 hover:bg-white/[0.05]"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <h3 className="truncate font-semibold text-white">
                                            {contest.name}
                                        </h3>
                                        <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500">
                                            {contest.sport} · {templateLabel(contest.template)}
                                        </p>
                                    </div>
                                    <span
                                        className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] ${toneClasses[lifecycleTone(contest.lifecycle_status)]}`}
                                    >
                                        {lifecycleLabel(contest.lifecycle_status)}
                                    </span>
                                </div>

                                {contest.description ? (
                                    <p className="mt-3 line-clamp-2 text-sm leading-5 text-gray-400">
                                        {contest.description}
                                    </p>
                                ) : null}

                                <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-gray-500">
                                    <span>Locks {formatDateTime(contest.locks_at)}</span>
                                    <span className="text-right">Top {contest.winning_places}</span>
                                </div>

                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                    {participantState ? (
                                        <span
                                            className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${toneClasses[participantState.tone]}`}
                                        >
                                            {participantState.label}
                                        </span>
                                    ) : null}
                                    {internalReviewLabel ? (
                                        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${toneClasses.amber}`}>
                                            {internalReviewLabel}
                                        </span>
                                    ) : null}
                                    {/* {openReviewCount > 0 ? (
                                        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${toneClasses.red}`}>
                                            {openReviewCount} review {openReviewCount === 1 ? "exception" : "exceptions"}
                                        </span>
                                    ) : null} */}
                                </div>

                                <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.1em] text-sky-200 opacity-80 transition group-hover:opacity-100">
                                    Open contest →
                                </p>
                            </Link>
                        );
                    })}
                </div>
            ) : (
                <div className="rounded-xl border border-dashed border-white/15 bg-black/25 p-5">
                    <p className="font-semibold text-white">{emptyTitle}</p>
                    <p className="mt-2 text-sm leading-5 text-gray-500">{emptyBody}</p>
                </div>
            )}
        </section>
    );
};

export default StructuredContestList;
