"use client";

import Link from "next/link";
import { formatDateTime } from "@/lib/utils/date";
import type { ArenaContest, FeedContest } from "@/lib/interfaces/interfaces";

/* ----------------------------------------------------------------------------
 * One contest preview card, ported from the MVP's `renderContestCard`
 * (gotlocks.app_mvp2/components/contests/StructuredContestList.tsx:300-374).
 *
 * Two things about the MVP's card are easy to "fix" by mistake:
 *   - it carries NO lifecycle chip. The accordion section the card sits in is
 *     already labelled Open / Locked / Finalized, so repeating it per card is
 *     noise. The top-right slot is the entrant count instead.
 *   - every card is the SAME height (`contestPreviewCardSizeClassName`) with the
 *     timing row pushed down by `mt-auto`, so a two-column grid lines up even
 *     when one contest has a description and its neighbour does not.
 * -------------------------------------------------------------------------- */

export type ContestTone = "muted" | "sky" | "amber" | "emerald" | "red";
export type ContestAccent = "sky" | "violet";
export type ContestCardPresentation = "panel" | "hub";

/** The MVP's `contestPreviewCardSizeClassName`. */
export const contestPreviewCardSizeClassName =
    "flex min-h-[190px] flex-col lg:min-h-[220px]";

const toneClasses: Record<Exclude<ContestTone, "sky">, string> = {
    muted: "border-white/10 bg-white/[0.04] text-gray-400",
    amber: "border-amber-300/25 bg-amber-500/10 text-amber-100",
    emerald: "border-emerald-300/25 bg-emerald-500/10 text-emerald-100",
    red: "border-red-300/25 bg-red-500/10 text-red-100",
};

export const contestAccentTone = {
    sky: {
        status: "border-sky-300/25 bg-sky-500/10 text-sky-100",
        create:
            "border-sky-300/35 bg-sky-500/10 text-sky-100 hover:border-sky-200/70 hover:bg-sky-500/15",
        cardHover: "hover:border-sky-300/55",
        hubCardHover: "hover:border-sky-300/60",
        action: "text-sky-200",
    },
    violet: {
        status: "border-violet-300/25 bg-violet-500/10 text-violet-100",
        create:
            "border-violet-300/35 bg-violet-500/10 text-violet-100 hover:border-violet-200/70 hover:bg-violet-500/15",
        cardHover: "hover:border-violet-300/55",
        hubCardHover: "hover:border-violet-300/60",
        action: "text-violet-200",
    },
} as const;

/** The `sky` tone is the accent's, so a violet surface has no blue chips on it. */
export const getContestToneClasses = (tone: ContestTone, accent: ContestAccent) =>
    tone === "sky" ? contestAccentTone[accent].status : toneClasses[tone];

/**
 * Kept for the callers that still colour by lifecycle. The CARD no longer does —
 * see the header note — but the tone map itself is shared vocabulary.
 */
export const contestToneClasses: Record<ContestTone, string> = {
    ...toneClasses,
    sky: contestAccentTone.sky.status,
};

const isFuture = (value: string | null | undefined, now: number) =>
    Boolean(value) && Date.parse(value as string) > now;

/**
 * The viewer's own standing with this contest. Accepts either the domain
 * participant or the list endpoint's `my_participation`.
 *
 * A contest that is not open answers only for the three states that outlive the
 * deadline — before the lock there is nothing useful to say about a member who
 * never joined.
 */
export const contestParticipantLabel = (
    contest: ArenaContest,
    participant: { status: string } | null | undefined,
    now: number = Date.now()
): { label: string; tone: ContestTone } | null => {
    const isLive =
        contest.lifecycle_status === "open" &&
        !contest.canceled_at &&
        !contest.archived_at;

    if (!isLive) {
        if (participant?.status === "locked") {
            return { label: "Entry locked", tone: "sky" };
        }
        if (participant?.status === "completed") {
            return { label: "Results ready", tone: "emerald" };
        }
        if (participant?.status === "disqualified") {
            return { label: "Disqualified", tone: "red" };
        }
        return null;
    }

    const opensLater = isFuture(contest.opens_at, now);
    const deadlinePassed = now >= Date.parse(contest.locks_at);

    if (!participant) {
        return !opensLater && !deadlinePassed
            ? { label: "Available to enter", tone: "sky" }
            : null;
    }

    switch (participant.status) {
        case "eligible":
            if (opensLater) return null;
            return deadlinePassed
                ? { label: "Missed deadline", tone: "muted" }
                : { label: "Available to enter", tone: "sky" };
        case "opted_in":
            return deadlinePassed
                ? { label: "Missed deadline", tone: "muted" }
                : { label: "Entry setup · submit required", tone: "amber" };
        case "entered":
            return { label: "Entry submitted", tone: "emerald" };
        case "locked":
            return { label: "Entry locked", tone: "sky" };
        case "completed":
            return { label: "Results ready", tone: "emerald" };
        case "missed_deadline":
            return { label: "Missed deadline", tone: "muted" };
        case "withdrawn":
            return { label: "Withdrawn", tone: "muted" };
        case "disqualified":
            return { label: "Disqualified", tone: "red" };
        default:
            return null;
    }
};

export const contestTemplateLabel = (template: string) => {
    if (template === "multi_pick") return "General Combo";
    if (template === "sunday_pickem") return "NFL Sunday Pick’em";
    return template
        .replaceAll("_", " ")
        .replace(/\b\w/g, (character) => character.toUpperCase());
};

/**
 * Every sport, joined — NOT collapsed to "Multi". A two-sport slate is exactly
 * the thing a member wants to read off the card before opening it.
 */
const contestSportsLabel = (contest: FeedContest) =>
    contest.sports?.filter(Boolean).length
        ? contest.sports!.filter(Boolean).join(" · ")
        : contest.sport;

/**
 * What the card says about time, which depends entirely on where the contest is:
 * a draft names its deadline, an open contest names whichever of open/lock is
 * next, a locked one says results are settling, and an ended one is stamped.
 */
const contestTimingLabel = (contest: FeedContest, now: number) => {
    if (contest.archived_at) return `Archived ${formatDateTime(contest.archived_at)}`;
    if (contest.canceled_at) return `Canceled ${formatDateTime(contest.canceled_at)}`;
    if (contest.lifecycle_status === "draft") {
        return `Not published · Locks ${formatDateTime(contest.locks_at)}`;
    }
    if (contest.lifecycle_status === "open" || contest.lifecycle_status === "scheduled") {
        return isFuture(contest.opens_at, now)
            ? `Opens ${formatDateTime(contest.opens_at)}`
            : `Locks ${formatDateTime(contest.locks_at)}`;
    }
    if (contest.lifecycle_status === "locked" || contest.lifecycle_status === "grading") {
        return "Live standings · Settles after the final matchup";
    }
    return contest.finalized_at
        ? `Finalized ${formatDateTime(contest.finalized_at)}`
        : "Finalized results";
};

export type FeedContestCardProps = {
    contest: FeedContest;
    /** Omit to render a non-navigable card — a surface with no detail route yet. */
    href?: string;
    participant?: { status: string } | null;
    /** Organizer-operated contests never show a join/entry state. */
    hideParticipantState?: boolean;
    /**
     * The contest's capacity, when it has one. `null` hides the remaining-spots
     * line entirely — which is what an uncapped contest should show, not "0".
     */
    participantLimit?: number | null;
    accent?: ContestAccent;
    presentation?: ContestCardPresentation;
};

export const FeedContestCard = ({
    contest,
    href,
    participant,
    hideParticipantState = false,
    participantLimit = null,
    accent = "sky",
    presentation = "hub",
}: FeedContestCardProps) => {
    const now = Date.now();
    const accentTone = contestAccentTone[accent];
    const isHub = presentation === "hub";

    const entryCount = contest.participant_count ?? 0;
    const remainingSpots =
        participantLimit === null || participantLimit === undefined
            ? null
            : Math.max(0, participantLimit - entryCount);

    const baseParticipantState = hideParticipantState
        ? null
        : contestParticipantLabel(contest, participant ?? contest.my_participation, now);
    // A full contest cannot be entered, whatever the member's own status says.
    const participantState =
        baseParticipantState?.label === "Available to enter" && remainingSpots === 0
            ? { label: "Contest full", tone: "muted" as const }
            : baseParticipantState;

    const cardClassName = `group ${contestPreviewCardSizeClassName} border border-white/10 p-4 transition ${
        isHub
            ? `rounded-lg bg-white/[0.04] hover:bg-white/[0.07] ${accentTone.hubCardHover}`
            : `rounded-xl bg-black/35 hover:bg-white/[0.05] ${accentTone.cardHover}`
    }`;

    const body = (
        <>
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <h4 className="truncate text-sm font-semibold text-white">
                        {contest.name}
                    </h4>
                    <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500">
                        {contestSportsLabel(contest)} · {contestTemplateLabel(contest.template)}
                    </p>
                </div>
                <span className="shrink-0 text-right text-[11px] font-medium tabular-nums text-gray-400">
                    {entryCount} joined
                    {remainingSpots !== null ? (
                        <span className="block text-gray-500">
                            {remainingSpots} {remainingSpots === 1 ? "spot" : "spots"} remaining
                        </span>
                    ) : null}
                </span>
            </div>

            {contest.description ? (
                <p className="mt-3 line-clamp-2 min-h-10 shrink-0 text-sm leading-5 text-gray-400">
                    {contest.description}
                </p>
            ) : null}

            {/* `mt-auto` is what makes every card in a row end at the same place. */}
            <div className="mt-auto grid grid-cols-[minmax(0,1fr)_auto] gap-2 pt-3 text-xs text-gray-500">
                <span className="truncate">{contestTimingLabel(contest, now)}</span>
                <span>Top {contest.winning_places}</span>
            </div>

            {participantState ? (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span
                        className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${getContestToneClasses(participantState.tone, accent)}`}
                    >
                        {participantState.label}
                    </span>
                </div>
            ) : null}
        </>
    );

    if (!href) {
        return <div className={cardClassName}>{body}</div>;
    }

    return (
        <Link
            href={href}
            aria-label={`View ${contest.name} contest`}
            className={cardClassName}
        >
            {body}
        </Link>
    );
};

export default FeedContestCard;
