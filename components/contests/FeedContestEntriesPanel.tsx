"use client";

import { formatContestDateTime } from "@/lib/contests/feedContestCatalog";
import type {
    FeedContestEntriesData,
    FeedContestEntryRow,
} from "@/lib/interfaces/interfaces";
import type { FeedContestEntryFormat } from "@/components/social/pick-card/types";
import ContestEntryFeedCard from "./ContestEntryFeedCard";
import type { FeedContestAccent } from "./FeedContestDetail";

/* ----------------------------------------------------------------------------
 * The FIELD of one Feed contest — GET /group/feed-contest/entries/:contest_id.
 *
 * Re-ported 2026-08-14 against the MVP's current Entries tab
 * (StructuredContestDetail.tsx:4850). TWO STACKED SECTIONS, always in this
 * order, whatever the contest's status:
 *
 *   1. the RECEIPT article — the viewer's own entry, or their invitation to
 *      build one. Two shapes: with an entry it reads as a record (eyebrow +
 *      status on the right); without one the status IS the heading and the join
 *      link takes the right edge.
 *   2. the FIELD — "Accepted entries / All entries". ALWAYS rendered. Before the
 *      lock it explains why it is empty instead of looking broken.
 *
 * What this REPLACED: a My-entry / All-entries sub-tab switch that the MVP does
 * not have. Over there the two sections never compete for the same space, so
 * nothing needs toggling — which is why the field below filters out `is_own`.
 * Showing the whole list under a receipt would print the viewer's entry twice.
 *
 * Also GONE with that redesign: the organizer "Contest configuration" block
 * (eyebrow "Organizer settings" + Participants / Awaiting entry / Valid entries
 * tiles) that used to sit at the top. The MVP deleted it — two of its three
 * tiles were hardcoded 0 here anyway for want of a per-status breakdown.
 *
 * The hidden-until-lock rule is the SERVER's, enforced in its query rather than
 * in its response shaping: before the lock, other members' rows arrive with
 * `pick: null` and only the caller's own carries detail. This component
 * therefore renders `row.is_revealed` and never re-derives visibility from the
 * lifecycle status — an organizer is not exempt either.
 * -------------------------------------------------------------------------- */

/**
 * The MVP's `getFeedZebraRowClassName` (components/social/feedRowTone.ts) —
 * the same tone `FeedList` stripes its own rows with, so a list of one-item
 * FeedLists reads as one continuous feed rather than as separate cards.
 */
const zebraRowClassName = (index: number) =>
    index % 2 === 1 ? "bg-white/[0.025]" : undefined;

const participantStatusLabel = (status: string | null | undefined) => {
    switch (status) {
        case "entered":
            return "Entered";
        case "opted_in":
            return "Awaiting entry";
        case "locked":
            return "Locked";
        case "completed":
            return "Completed";
        case "withdrawn":
            return "Withdrawn";
        case "disqualified":
            return "Disqualified";
        case "missed_deadline":
            return "Missed deadline";
        case "eligible":
            return "Eligible";
        default:
            return "—";
    }
};

const memberInitials = (name: string) => (name || "??").slice(0, 2).toUpperCase();

type ParticipantTone = "sky" | "amber" | "emerald" | "muted" | "red";

/**
 * The MVP's "Your entry" copy matrix (StructuredContestDetail.tsx:536-589). The
 * heading always prints; the BODY is a sentence only where there is something to
 * say that the heading does not already say.
 *
 * "Entry submitted" returns NO body on purpose — the receipt card sits directly
 * underneath it, so a paragraph explaining that the entry exists and can be
 * replaced was narrating the thing the member is already looking at. The pill
 * beneath the card is what offers the replace.
 *
 * Precedence is deliberate: the deadline and a stale rules acceptance both
 * OVERRIDE the stored status, because a member sitting at `opted_in` past lock
 * has missed the contest whatever the row still says.
 */
const participantCopy = (
    status: string | null | undefined,
    hasParticipation: boolean,
    rulesCurrent: boolean,
    deadlinePassed: boolean,
    pointsLabel: string
): { title: string; body: string | null; tone: ParticipantTone } => {
    if (!hasParticipation) {
        return deadlinePassed
            ? {
                title: "Entry window closed",
                body: `The deadline passed before you submitted an entry. No rank, ${pointsLabel}, or award can be recorded.`,
                tone: "muted",
            }
            : {
                title: "Available to enter",
                body: "Choose your picks and submit before the contest locks.",
                tone: "sky",
            };
    }
    const preEntry = status === "eligible" || status === "opted_in";
    if (deadlinePassed && preEntry) {
        return {
            title: "Missed deadline",
            body: `No complete valid entry was received. You are not ranked and earn no ${pointsLabel} or award.`,
            tone: "muted",
        };
    }
    if (!rulesCurrent && preEntry) {
        return {
            title: "Rules acceptance required",
            body: "The rules changed after your previous acceptance. Review the current version before entering.",
            tone: "amber",
        };
    }
    switch (status) {
        case "eligible":
            return {
                title: "Available to enter",
                body: "Choose your picks and submit before the contest locks.",
                tone: "sky",
            };
        case "opted_in":
            return {
                title: "Entry setup in progress",
                body: "This older saved rules acceptance does not claim an entry. Submit a complete valid entry before lock.",
                tone: "amber",
            };
        case "entered":
            return {
                title: "Entry submitted",
                body: null,
                tone: "emerald",
            };
        case "locked":
            return {
                title: "Entry locked",
                body: "Your accepted entry is read-only while results and your live rank update automatically.",
                tone: "sky",
            };
        case "completed":
            return {
                title: "Contest complete",
                body: "Your result is available in the frozen final rank.",
                tone: "emerald",
            };
        case "missed_deadline":
            return {
                title: "Missed deadline",
                body: `No complete valid entry was received. You are not ranked and earn no ${pointsLabel} or award.`,
                tone: "muted",
            };
        case "withdrawn":
            return {
                title: "Withdrawn",
                body: "This participation record is no longer active.",
                tone: "muted",
            };
        case "disqualified":
            // The MVP prints the organizer's stated reason here; our entries read
            // carries no `disqualification_reason`, so the generic line stands in.
            return {
                title: "Disqualified",
                body: `This entry is ineligible for ranking, ${pointsLabel}, and achievements.`,
                tone: "red",
            };
        default:
            return {
                title: "Available to enter",
                body: "Choose your picks and submit before the contest locks.",
                tone: "sky",
            };
    }
};

const participantToneTextClasses: Record<
    Exclude<ParticipantTone, "sky">,
    string
> = {
    amber: "text-amber-100",
    emerald: "text-emerald-100",
    muted: "text-gray-300",
    red: "text-red-100",
};

const participantToneTextClass = (tone: ParticipantTone, accent: FeedContestAccent) =>
    tone === "sky"
        ? accent === "arena"
            ? "text-violet-100"
            : "text-sky-100"
        : participantToneTextClasses[tone];

/**
 * A row whose pick is NOT on the response — the MVP's non-combo branch of the
 * accepted-entries list. Reached for a withdrawn or disqualified entrant (whose
 * row is kept deliberately, so the field reads as the record) and for anyone
 * else's entry before the lock.
 */
const EntryStubContent = ({ row }: { row: FeedContestEntryRow }) => {
    const memberName = row.member.username ?? "Member";
    return (
        <div className="px-5 py-5 sm:px-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                    <div
                        aria-hidden="true"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold uppercase text-slate-100"
                    >
                        {memberInitials(memberName)}
                    </div>
                    <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">{memberName}</p>
                        <p className="mt-0.5 text-xs text-gray-500">
                            {row.entered_at
                                ? `Accepted ${formatContestDateTime(row.entered_at)}`
                                : `Submitted ${formatContestDateTime(row.submitted_at)}`}
                        </p>
                    </div>
                </div>
                <span className="shrink-0 rounded-full border border-white/10 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-gray-400">
                    {participantStatusLabel(row.participant_status)}
                </span>
            </div>
            <p className="mt-2 text-sm leading-5 text-gray-300">
                This entry is hidden until the contest locks.
            </p>
        </div>
    );
};

export type FeedContestEntriesPanelProps = {
    entries: FeedContestEntriesData | null;
    loading: boolean;
    error: string | null;
    /**
     * Tints the "Your entry" heading in its sky/violet state. The POINTS wording
     * deliberately does not use it — that comes from the response's own
     * `contest.context_type`, which is the same fact and one the client cannot
     * get wrong.
     */
    accent?: FeedContestAccent;
    /** Drives the profile link on each entry card. */
    currentUserId?: string;
    /**
     * The contest's flat per-correct-pick bonus, for a Sunday Pick'em card's
     * per-selection scoring breakdown.
     *
     * Passed in rather than read off `entries.contest`: `runFeedContestEntries`
     * selects a narrow contest projection that does not include it, while the
     * detail read this panel already sits inside does carry it. Absent, each
     * tile still shows its total and dashes the split.
     */
    pickemCorrectBonus?: number | null;
    /**
     * The contest this panel belongs to, for each entry card's header line.
     *
     * REQUIRED in practice even though the panel sits inside that very contest:
     * naming the format ("Feed TD Psychic Contest Entry") is what tells a card
     * apart from a General Combo, and the same declaration is what routes the
     * entry to `TdPsychicPickCard` or `PickemPickCard` rather than to the parlay
     * leg list. Without these two the header still renders — with a dangling
     * separator and a link to nowhere.
     *
     * Passed in rather than read off `entries.contest`: `runFeedContestEntries`
     * returns a narrow projection, and the detail read this panel sits inside
     * already holds both.
     */
    /**
     * The MOVING public quote per scorer, for the viewer.s OWN accepted TD card
     * while the contest is still open. A TD leg carries no price of its own
     * until the shared capture, so without this every square on an open card
     * sits bare — which is the state this tab was in.
     *
     * Passed to the own-entry receipt ALONE. A live quote on another member.s
     * pick is neither theirs to act on nor the price it will be graded at, and
     * the MVP gates it the same way (StructuredContestDetail.tsx:5261).
     */
    contestName?: string;
    contestHref?: string;
    /**
     * A draft has no field yet, so it replaces the whole panel with the
     * publish prompt — no receipt, no privacy notice. Passed in rather than read
     * off the entries response so the prompt renders before that read lands (and
     * at all, since only an organizer may read a draft's entries).
     */
    isDraft?: boolean;
    /**
     * The MVP's `participatingStaffPrivacyActive`. Arena staff who opted their
     * OWN contest in to staff participation are eligible to compete, so the
     * field stays hidden from them until lock even though their role could
     * otherwise read it — and the privacy notice says exactly that.
     */
    staffParticipationPrivacy?: boolean;
    /**
     * May this viewer read the field at all. False before the lock for anyone
     * who is themselves competing — a live participant must not read the field
     * early, whatever else they can do.
     */
    canViewAllEntries?: boolean;
    /**
     * Is this viewer eligible to compete. With an accepted entry it decides
     * whether the receipt article renders at all (the MVP's
     * `showOwnEntryReceipt`): a non-competing organizer sees only the field.
     */
    canParticipate?: boolean;
    /**
     * The caller's own participation status, from the DETAIL read's
     * `contest.my_participation` — the entries envelope does not carry it.
     * Drives the "Your entry" heading and body.
     */
    myParticipationStatus?: string | null;
    /** Has the viewer a participation row at all. */
    hasParticipation?: boolean;
    /** FALSE when the rules changed after the viewer's last acceptance. */
    rulesCurrent?: boolean;
    /** Past `locks_at` — overrides the stored status in the copy matrix. */
    deadlinePassed?: boolean;
    /** Set only while the contest has yet to open; renders the "Entries open" line. */
    opensAtLabel?: string | null;
    /** Rendered under the caller's own receipt — the "build entry" CTA. */
    action?: React.ReactNode;
    /**
     * The JOIN call to action, for a viewer with no participation row yet.
     * Set, it takes over the header: the kicker reads "Entry status", the title
     * drops its tone tint, and this link sits on the header's right edge instead
     * of the pill button under the receipt. That is the MVP's split — someone
     * who has not joined is being invited, not shown a record.
     */
    joinAction?: React.ReactNode;
};

export const FeedContestEntriesPanel = ({
    entries,
    loading,
    error,
    currentUserId,
    pickemCorrectBonus,
    contestName,
    contestHref,
    isDraft = false,
    staffParticipationPrivacy = false,
    canViewAllEntries = false,
    canParticipate = false,
    myParticipationStatus = null,
    hasParticipation = false,
    rulesCurrent = true,
    deadlinePassed = false,
    opensAtLabel = null,
    accent = "league",
    action,
    joinAction,
}: FeedContestEntriesPanelProps) => {
    // Checked FIRST, ahead of the loading and error states: a draft's field does
    // not exist yet, so there is nothing to load and nothing to fail. The MVP
    // gates its receipt on `phase !== "draft"` for the same reason.
    if (isDraft) {
        return (
            <div
                aria-label="Contest entries"
                className="-mx-5 divide-y divide-white/10 overflow-visible border-y border-white/10 sm:-mx-6"
            >
                <section className="px-5 py-5 sm:px-6">
                    <h2 className="font-semibold text-white">
                        Publish this draft to open entries
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-gray-500">
                        Finish the contest setup and publish when you are ready for
                        participants to submit entries.
                    </p>
                </section>
            </div>
        );
    }

    if (loading && !entries) {
        return (
            <div
                role="status"
                className="rounded-xl border border-white/10 bg-black/25 px-4 py-5 text-sm text-gray-400"
            >
                Loading entries…
            </div>
        );
    }

    if (error && !entries) {
        return (
            <div
                role="alert"
                className="rounded-xl border border-rose-300/20 bg-rose-500/5 px-4 py-5 text-sm text-rose-100"
            >
                {error}
            </div>
        );
    }

    if (!entries) return null;

    // Inside a contest a pick is worth League / Arena Points, never global XP —
    // the entries response names the surface, so the wording follows the data
    // rather than the accent prop.
    const pointsLabel =
        entries.contest.context_type === "arena" ? "Arena Points" : "League Points";
    // Same source as the wording above: the response names the surface, so the
    // card accent cannot drift from the points vocabulary.
    const cardAccent = entries.contest.context_type === "arena" ? "violet" : "sky";
    /*
     * Which builder produced these entries. Read from the CONTEST rather than
     * from any row: a Pick'em card is stored as `is_combo` exactly like a combo,
     * so the row itself cannot say, and mis-reading it would render a card as a
     * parlay leg list. `entry_model` is the authoritative column; `template` is
     * checked too because both travel on this envelope and they cannot disagree.
     */
    const entryFormat: FeedContestEntryFormat =
        entries.contest.entry_model === "td_psychic_card" ||
        entries.contest.template === "td_psychic"
            ? "td_psychic"
            : entries.contest.entry_model === "pickem_card" ||
                entries.contest.template === "sunday_pickem"
              ? "sunday_pickem"
              : "general_combo";
    const participantState = participantCopy(
        myParticipationStatus,
        hasParticipation,
        rulesCurrent,
        deadlinePassed,
        pointsLabel
    );

    const ownRow = entries.entries.find((row) => row.is_own) ?? null;
    const ownEntry = ownRow?.pick ?? null;

    /*
     * EVERY format renders through `ContestEntryFeedCard` — General Combo,
     * Pick'em and TD Psychic alike — which is what the MVP does and what stops
     * this tab drawing a TD card one way and the Feed drawing it another.
     *
     * The card decides its own shape from the declared `entryFormat`: a TD entry
     * gets its ordered row of three square scorer cards, a Pick'em entry gets its
     * paged team tiles, and only a real General Combo gets the parlay leg list.
     *
     * `TdPsychicEntryCard` is now referenced by nothing — the same state the MVP
     * leaves its own copy in. It is kept on disk rather than deleted because it
     * is the only component that knows how to draw the two-state
     * `Public data` / `Odds at lock` square on its own.
     */

    /*
     * The receipt and the field are shown TOGETHER, not as alternatives.
     *
     * This replaced a My-entry / All-entries sub-tab switch that the MVP does
     * not have: over there the viewer's own entry is always the article at the
     * top and the section beneath it is always the REST of the field, so the two
     * never compete for the same space and nothing has to be toggled. Which is
     * why the list below filters out `is_own` — the alternative is showing the
     * viewer their own entry twice.
     */
    const otherRows = entries.entries.filter((row) => !row.is_own);

    /**
     * The MVP's `showOwnEntryReceipt`. A viewer who cannot compete and holds no
     * entry has no receipt to show — an organizer of a staff-noncompetitive
     * Arena contest drops straight to the field.
     */
    const showOwnEntryReceipt = canParticipate || hasParticipation || Boolean(ownEntry);

    /**
     * The MVP's `canRevealOtherEntryContents`. Staff privacy wins over the role:
     * an Arena owner eligible to compete in their own contest must not read the
     * field early just because they could otherwise.
     */
    const canRevealOtherEntryContents = canViewAllEntries && !staffParticipationPrivacy;

    return (
        <div
            aria-label="Contest entries"
            className="-mx-5 divide-y divide-white/10 overflow-visible border-b border-white/10 sm:-mx-6"
        >
            {/* THE RECEIPT ARTICLE — two shapes, never both.
                With an entry it is a record: an eyebrow and the status on the
                right. Without one it is an invitation: the status becomes the
                heading and the join link takes the right edge. */}
            {showOwnEntryReceipt ? (
                <article className="px-5 py-5 sm:px-6">
                    {ownEntry ? (
                        <section aria-label="Your entry receipt">
                            <div className="flex items-center justify-between gap-4">
                                <h2 className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-500">
                                    Your entry receipt
                                </h2>
                                <p
                                    className={`shrink-0 text-[10px] font-semibold uppercase tracking-[0.1em] ${participantToneTextClass(
                                        participantState.tone,
                                        accent
                                    )}`}
                                >
                                    {participantState.title}
                                </p>
                            </div>
                            {participantState.body ? (
                                <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-400">
                                    {participantState.body}
                                </p>
                            ) : null}
                            {opensAtLabel ? (
                                <p
                                    className={`mt-3 text-sm font-semibold ${accent === "arena" ? "text-violet-200" : "text-sky-200"
                                        }`}
                                >
                                    Entries open {opensAtLabel}.
                                </p>
                            ) : null}
                            {/* Bled to the full panel width — the feed card owns
                                its own px-5/sm:px-6 gutter. */}
                            <div className="-mx-5 mt-1 sm:-mx-6">
                                <ContestEntryFeedCard
                                    row={ownRow!}
                                    pick={ownEntry}
                                    contextualPointsLabel={pointsLabel}
                                    currentUserId={currentUserId}
                                    accent={cardAccent}
                                    entryFormat={entryFormat}
                                    pickemCorrectBonus={pickemCorrectBonus}
                                    contestName={contestName}
                                    contestHref={contestHref}
                                />
                            </div>
                        </section>
                    ) : (
                        <>
                            <div
                                data-entry-join-state={joinAction ? "available" : undefined}
                                className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3"
                            >
                                <div className="min-w-0">
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500">
                                        Entry status
                                    </p>
                                    <h2
                                        className={`mt-1 text-base font-semibold ${joinAction
                                            ? "text-white"
                                            : participantToneTextClass(
                                                participantState.tone,
                                                accent
                                            )
                                            }`}
                                    >
                                        {participantState.title}
                                    </h2>
                                </div>
                                {joinAction ?? null}
                            </div>
                            {participantState.body ? (
                                <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-400">
                                    {participantState.body}
                                </p>
                            ) : null}
                            {opensAtLabel ? (
                                <p
                                    className={`mt-3 text-sm font-semibold ${accent === "arena" ? "text-violet-200" : "text-sky-200"
                                        }`}
                                >
                                    Entries open {opensAtLabel}.
                                </p>
                            ) : null}
                        </>
                    )}

                    {/* The build/replace pill. Never alongside `joinAction`: the
                        MVP shows this only to someone already in the contest. */}
                    {action && !joinAction ? (
                        <div className="mt-4 flex justify-end">{action}</div>
                    ) : null}
                </article>
            ) : null}

            {/* THE FIELD — always rendered, whatever the status. Before the lock
                it states WHY it is empty rather than looking broken. */}
            <section aria-labelledby="accepted-entries-heading">
                <header className="flex flex-wrap items-end justify-between gap-2 px-5 py-4 sm:px-6">
                    <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-500">
                            Accepted entries
                        </p>
                        <h2
                            id="accepted-entries-heading"
                            className="mt-1 font-semibold text-white"
                        >
                            All entries
                        </h2>
                    </div>
                    {/* The paginated TOTAL, not the rendered row count — past
                        page 1 the two disagree, and the total is the honest
                        answer to "how many were submitted". */}
                    <span className="text-xs text-gray-500">
                        {entries.summary.entered_count} submitted
                    </span>
                </header>

                {!canRevealOtherEntryContents ? (
                    staffParticipationPrivacy || ownEntry ? (
                        <div
                            data-contest-entry-privacy={
                                staffParticipationPrivacy
                                    ? "eligible-staff-until-lock"
                                    : "until-lock"
                            }
                            className="border-t border-white/10 px-5 py-6 sm:px-6"
                        >
                            <h3 className="font-semibold text-white">
                                Entries stay private until lock
                            </h3>
                            <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500">
                                {staffParticipationPrivacy
                                    ? ownEntry
                                        ? "Because your owner or manager role is eligible to participate, other entry contents stay hidden until this contest locks—even if you do not enter. Your own entry remains visible above."
                                        : "Because your owner or manager role is eligible to participate, other entry contents stay hidden until this contest locks—even if you do not enter. Your entry controls remain visible above."
                                    : "You can review your own accepted entry above. Other entry contents become visible when this contest locks."}
                            </p>
                        </div>
                    ) : (
                        <p className="border-t border-white/10 px-5 py-6 text-sm text-gray-500 sm:px-6">
                            Entry contents become visible when this contest locks.
                        </p>
                    )
                ) : otherRows.length ? (
                    <ul className="divide-y divide-white/10 border-t border-white/10">
                        {otherRows.map((row, index) => (
                            <li key={row.id} className={zebraRowClassName(index)}>
                                {row.pick ? (
                                    <ContestEntryFeedCard
                                        row={row}
                                        pick={row.pick}
                                        contextualPointsLabel={pointsLabel}
                                        currentUserId={currentUserId}
                                        accent={cardAccent}
                                        entryFormat={entryFormat}
                                        pickemCorrectBonus={pickemCorrectBonus}
                                        // The field's rows carry the contest header
                                        // too. Omitting these left every card in the
                                        // list with a dangling "· Feed Combo Contest
                                        // Entry" and a link to nowhere, while the
                                        // viewer's own entry above it read correctly.
                                        contestName={contestName}
                                        contestHref={contestHref}
                                    />
                                ) : (
                                    <EntryStubContent row={row} />
                                )}
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="border-t border-white/10 px-5 py-6 text-sm text-gray-500 sm:px-6">
                        {ownEntry
                            ? "Your entry is shown above. No other complete valid entries have been accepted yet."
                            : "No complete valid entries have been accepted yet."}
                    </p>
                )}
            </section>
        </div>
    );
};

export default FeedContestEntriesPanel;
