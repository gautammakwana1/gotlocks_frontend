"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, TouchEvent } from "react";
import {
    ARENA_REWARD_PODIUM_PLACES,
    ARENA_REWARD_PICKUP_INSTRUCTIONS_MAX,
    ARENA_REWARD_PRIZE_DESCRIPTION_MAX,
    ARENA_REWARD_PRIZE_TITLE_MAX,
    ARENA_REWARD_PRIZE_VALUE_MAX,
    emptyArenaRewardPrize,
    formatContestPlacement,
    type ArenaRewardDraft,
    type ArenaRewardPlace,
} from "@/lib/contests/arenaReward";

/* ----------------------------------------------------------------------------
 * THE REWARD EDITOR — ported from the MVP's
 * components/contests/ArenaContestRewardEditor.tsx.
 *
 * TWO MODES, because a reward is only half editable once a contest is live:
 *
 *   "full"         the wizard's Reward step. Everything is on the table —
 *                  whether to offer prizes at all, how winners receive them,
 *                  which places pay, and the attestation.
 *   "prizes_only"  the Settings tab, after publication. ONLY the wording of
 *                  what each place receives. The settlement method, the venue
 *                  and the contact email are the deal a member accepted when
 *                  they entered, so they render as a read-only summary and the
 *                  backend rebuilds them from the stored row whatever the body
 *                  says.
 *
 * THE PLACEMENT RULE, which is not cosmetic: places must run consecutively from
 * 1st. Ticking 3rd selects 1st and 2nd as well; unticking 2nd offers to discard
 * 2nd AND 3rd. A reward with a gap in it is one the editor could never reopen,
 * and the backend refuses to write one.
 *
 * THE ATTESTATION RESETS on every change — `update()` clears
 * `organizerConfirmed` unless the patch is the checkbox itself, and a change of
 * venue or inbox underneath the editor clears it too. A signature has to be
 * given against the offer it is actually signing.
 * -------------------------------------------------------------------------- */

export type ArenaContestRewardVenueOption = {
    name: string;
    address: string;
};

export type ArenaContestRewardEditorProps = {
    value: ArenaRewardDraft;
    /** The provider named in the attestation — the Arena, never the contest. */
    arenaName: string;
    activeVenue: ArenaContestRewardVenueOption | null;
    rewardContactEmail: string | null;
    mode?: "full" | "prizes_only";
    /** Focuses and marks the field a failed save pointed at. */
    invalidPrizeField?: {
        place: ArenaRewardPlace;
        field: "title" | "description";
    } | null;
    prizeErrorMessageId?: string;
    /** Non-empty blocks prize configuration and states why, inline. */
    prizeSetupDisabledReason?: string;
    disabled?: boolean;
    onChange: (value: ArenaRewardDraft) => void;
};

const prizeRangeAnnouncement = (place: ArenaRewardPlace) =>
    place === 1
        ? "Podium prizes now include 1st place only."
        : place === 2
            ? "Podium prizes now include 1st and 2nd places."
            : "Podium prizes now include all three places.";

export const ArenaContestRewardEditor = ({
    value,
    arenaName,
    activeVenue,
    rewardContactEmail,
    mode = "full",
    invalidPrizeField = null,
    prizeErrorMessageId,
    prizeSetupDisabledReason,
    disabled = false,
    onChange,
}: ArenaContestRewardEditorProps) => {
    const prizesOnly = mode === "prizes_only";
    const prizeConfigurationDisabled = disabled || Boolean(prizeSetupDisabledReason);
    const placementHelpId = useId();
    const prizeSetupDisabledReasonId = useId();
    const [pendingPrizeRange, setPendingPrizeRange] = useState<ArenaRewardPlace | null>(null);
    const [showFirstPlaceNotice, setShowFirstPlaceNotice] = useState(false);
    const [placementAnnouncement, setPlacementAnnouncement] = useState("");
    const orderedPrizes = useMemo(
        () => [...value.prizes].sort((left, right) => left.place - right.place),
        [value.prizes]
    );
    const [activePrizePlace, setActivePrizePlace] = useState<ArenaRewardPlace>(
        orderedPrizes[0]?.place ?? 1
    );
    const rewardEditorRef = useRef<HTMLElement>(null);
    const swipeStart = useRef<{ x: number; y: number } | null>(null);
    const activePrizeIndex = Math.max(
        0,
        orderedPrizes.findIndex((prize) => prize.place === activePrizePlace)
    );
    const activePrize = orderedPrizes[activePrizeIndex] ?? null;
    const prizesPendingRemoval = pendingPrizeRange
        ? value.prizes.filter((prize) => prize.place > pendingPrizeRange)
        : [];

    /*
     * The signature is against a specific venue and a specific inbox. If either
     * changes underneath the editor — the owner sets a venue in the drawer, or
     * saves a contact email inline — the box unticks itself rather than carrying
     * a confirmation of terms that are no longer the ones on screen.
     */
    const fulfillmentSourceKey =
        value.settlementMethod === "in_person"
            ? `in_person:${activeVenue?.name ?? ""}:${activeVenue?.address ?? ""}`
            : `virtual:${rewardContactEmail ?? ""}`;
    const previousFulfillmentSourceKey = useRef(fulfillmentSourceKey);

    useEffect(() => {
        if (previousFulfillmentSourceKey.current === fulfillmentSourceKey) return;
        previousFulfillmentSourceKey.current = fulfillmentSourceKey;
        if (value.organizerConfirmed) {
            onChange({ ...value, organizerConfirmed: false });
        }
    }, [fulfillmentSourceKey, onChange, value]);

    // The viewed place can vanish under the carousel when a range shrinks.
    useEffect(() => {
        if (orderedPrizes.length === 0) return;
        if (orderedPrizes.some((prize) => prize.place === activePrizePlace)) return;
        setActivePrizePlace(orderedPrizes[orderedPrizes.length - 1].place);
    }, [activePrizePlace, orderedPrizes]);

    // A failed save names the offending field; page to it, then focus it.
    useEffect(() => {
        if (
            !invalidPrizeField ||
            !orderedPrizes.some((prize) => prize.place === invalidPrizeField.place)
        ) {
            return;
        }
        if (activePrizePlace !== invalidPrizeField.place) {
            setActivePrizePlace(invalidPrizeField.place);
            return;
        }
        const frame = window.requestAnimationFrame(() => {
            rewardEditorRef.current
                ?.querySelector<HTMLElement>(
                    `[data-arena-prize-field="${invalidPrizeField.place}-${invalidPrizeField.field}"]`
                )
                ?.focus();
        });
        return () => window.cancelAnimationFrame(frame);
    }, [activePrizePlace, invalidPrizeField, orderedPrizes]);

    const update = (patch: Partial<ArenaRewardDraft>) => {
        setPendingPrizeRange(null);
        setShowFirstPlaceNotice(false);
        onChange({
            ...value,
            ...patch,
            // Any edit invalidates the signature — except ticking the box itself.
            organizerConfirmed:
                "organizerConfirmed" in patch ? Boolean(patch.organizerConfirmed) : false,
        });
    };

    const applyPrizeRange = (
        place: ArenaRewardPlace,
        nextActivePlace: ArenaRewardPlace = place
    ) => {
        update({
            prizes: ARENA_REWARD_PODIUM_PLACES.filter((candidate) => candidate <= place).map(
                (candidate) =>
                    value.prizes.find((prize) => prize.place === candidate) ??
                    emptyArenaRewardPrize(candidate)
            ),
        });
        setActivePrizePlace(nextActivePlace);
        setPlacementAnnouncement(prizeRangeAnnouncement(place));
    };

    const requestPrizeToggle = (place: ArenaRewardPlace) => {
        const selected = value.prizes.some((prize) => prize.place === place);
        if (!selected) {
            applyPrizeRange(place);
            return;
        }
        if (place === 1) {
            setPendingPrizeRange(null);
            setShowFirstPlaceNotice(true);
            setPlacementAnnouncement("");
            return;
        }
        // Confirmed rather than immediate: unticking 2nd discards 3rd's copy too.
        setShowFirstPlaceNotice(false);
        setPendingPrizeRange((place - 1) as ArenaRewardPlace);
        setPlacementAnnouncement("");
    };

    const showPrize = (place: ArenaRewardPlace) => {
        if (!value.prizes.some((prize) => prize.place === place)) return;
        setActivePrizePlace(place);
        setPlacementAnnouncement(`Viewing ${formatContestPlacement(place)} prize details.`);
    };

    const showPrizeAtIndex = (index: number) => {
        const prize = orderedPrizes[index];
        if (prize) showPrize(prize.place);
    };

    const handleCarouselKeyDown = (event: KeyboardEvent<HTMLElement>) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === "ArrowLeft") {
            event.preventDefault();
            showPrizeAtIndex(activePrizeIndex - 1);
        } else if (event.key === "ArrowRight") {
            event.preventDefault();
            showPrizeAtIndex(activePrizeIndex + 1);
        }
    };

    const handleTouchStart = (event: TouchEvent<HTMLElement>) => {
        const target = event.target;
        // A swipe that starts on a control is that control's, not the carousel's.
        if (
            target instanceof Element &&
            target.closest("button, input, textarea, select, a, label")
        ) {
            swipeStart.current = null;
            return;
        }
        const touch = event.touches[0];
        swipeStart.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
    };

    const handleTouchEnd = (event: TouchEvent<HTMLElement>) => {
        const start = swipeStart.current;
        swipeStart.current = null;
        const touch = event.changedTouches[0];
        if (!start || !touch) return;
        const horizontalDelta = touch.clientX - start.x;
        const verticalDelta = touch.clientY - start.y;
        if (
            Math.abs(horizontalDelta) < 48 ||
            Math.abs(horizontalDelta) <= Math.abs(verticalDelta)
        ) {
            return;
        }
        showPrizeAtIndex(horizontalDelta < 0 ? activePrizeIndex + 1 : activePrizeIndex - 1);
    };

    const updatePrize = (
        place: ArenaRewardPlace,
        patch: Partial<{ title: string; description: string; approximateValue: string }>
    ) =>
        update({
            prizes: value.prizes.map((prize) =>
                prize.place === place ? { ...prize, ...patch } : prize
            ),
        });

    return (
        <section
            ref={rewardEditorRef}
            aria-labelledby="arena-reward-editor-title"
            data-arena-reward-editor={mode}
            className="space-y-5"
        >
            <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-violet-200">
                    {prizesOnly ? "Contest settings" : "Arena rewards"}
                </p>
                <h2
                    id="arena-reward-editor-title"
                    className="mt-2 text-2xl font-semibold normal-case text-white"
                >
                    {prizesOnly ? "Update podium prizes" : "Offer prizes?"}
                </h2>
                <p className="mt-2 text-sm normal-case leading-6 text-gray-400">
                    {prizesOnly
                        ? "Change what each podium finisher receives. The existing settlement method stays in place."
                        : `Add optional prizes supplied and fulfilled by ${arenaName}.`}
                </p>
            </div>

            {!prizesOnly ? (
                <div className="grid gap-3 sm:grid-cols-2">
                    {[
                        { enabled: false, label: "No prizes" },
                        { enabled: true, label: "Add prizes" },
                    ].map((option) => {
                        const selected = value.enabled === option.enabled;
                        const optionDisabled =
                            disabled || (option.enabled && Boolean(prizeSetupDisabledReason));
                        return (
                            <button
                                key={option.label}
                                type="button"
                                data-arena-reward-option={option.enabled ? "add" : "none"}
                                aria-pressed={selected}
                                aria-describedby={
                                    option.enabled && prizeSetupDisabledReason
                                        ? prizeSetupDisabledReasonId
                                        : undefined
                                }
                                disabled={optionDisabled}
                                onClick={() =>
                                    update({
                                        enabled: option.enabled,
                                        // Switching prizes ON opens with 1st place
                                        // already selected — it is never optional.
                                        prizes:
                                            option.enabled && value.prizes.length === 0
                                                ? [emptyArenaRewardPrize(1)]
                                                : value.prizes,
                                    })
                                }
                                className={`rounded-xl border px-4 py-3 text-left text-sm font-semibold normal-case transition disabled:cursor-not-allowed disabled:opacity-50 ${selected
                                    ? "border-violet-300/55 bg-violet-500/15 text-white"
                                    : "border-white/10 bg-black/25 text-gray-300 hover:border-white/25"
                                    }`}
                            >
                                {option.label}
                            </button>
                        );
                    })}
                </div>
            ) : null}

            {!prizesOnly && prizeSetupDisabledReason ? (
                <p
                    id={prizeSetupDisabledReasonId}
                    role="status"
                    className="rounded-xl border border-amber-300/25 bg-amber-500/10 p-4 text-sm normal-case leading-6 text-amber-100"
                >
                    {prizeSetupDisabledReason}
                </p>
            ) : null}

            {value.enabled ? (
                <div
                    className={
                        prizesOnly
                            ? "space-y-6"
                            : "space-y-6 rounded-2xl border border-violet-300/20 bg-violet-500/[0.06] p-4 sm:p-5"
                    }
                >
                    {!prizesOnly ? (
                        <fieldset>
                            <legend className="text-xs font-semibold normal-case text-gray-200">
                                How will winners receive their prizes?
                            </legend>
                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                {(
                                    [
                                        {
                                            method: "in_person",
                                            label: "In-person pickup",
                                            helper: "Winners collect at your active Arena venue.",
                                        },
                                        {
                                            method: "virtual",
                                            label: "Virtual delivery",
                                            helper:
                                                "Winners coordinate through your Arena Contact Email.",
                                        },
                                    ] as const
                                ).map((option) => {
                                    const selected = value.settlementMethod === option.method;
                                    return (
                                        <button
                                            key={option.method}
                                            type="button"
                                            aria-label={option.label}
                                            aria-pressed={selected}
                                            disabled={prizeConfigurationDisabled}
                                            onClick={() =>
                                                update({ settlementMethod: option.method })
                                            }
                                            className={`rounded-xl border px-4 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${selected
                                                ? "border-violet-300/55 bg-violet-500/15"
                                                : "border-white/10 bg-black/25 hover:border-white/25"
                                                }`}
                                        >
                                            <span className="block text-sm font-semibold normal-case text-white">
                                                {option.label}
                                            </span>
                                            <span className="mt-1 block text-xs normal-case leading-5 text-gray-500">
                                                {option.helper}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </fieldset>
                    ) : null}

                    {!prizesOnly && value.settlementMethod === "in_person" ? (
                        <section
                            aria-label="In-person prize pickup"
                            data-arena-reward-venue
                            className="space-y-4 rounded-xl border border-white/10 bg-black/25 p-4"
                        >
                            <div>
                                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-500">
                                    Pickup venue required
                                </p>
                                {activeVenue ? (
                                    <div className="mt-1 text-sm normal-case leading-6 text-gray-300">
                                        <p className="font-semibold text-gray-100">
                                            {activeVenue.name}
                                        </p>
                                        <p>{activeVenue.address}</p>
                                    </div>
                                ) : (
                                    <p
                                        role="status"
                                        className="mt-1 text-sm normal-case leading-6 text-amber-100"
                                    >
                                        Set up an active Arena venue before publishing an
                                        in-person reward.
                                    </p>
                                )}
                            </div>
                            <label className="block text-xs font-semibold normal-case text-gray-200">
                                Pickup instructions
                                <textarea
                                    rows={3}
                                    value={value.pickupInstructions}
                                    maxLength={ARENA_REWARD_PICKUP_INSTRUCTIONS_MAX}
                                    disabled={prizeConfigurationDisabled}
                                    onChange={(event) =>
                                        update({ pickupInstructions: event.target.value })
                                    }
                                    placeholder="Tell winners when to visit and who to ask for."
                                    className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-sm font-normal normal-case leading-6 text-white outline-none transition placeholder:text-gray-600 focus:border-violet-300/50 disabled:cursor-not-allowed disabled:opacity-50"
                                />
                            </label>
                        </section>
                    ) : !prizesOnly ? (
                        <section
                            aria-label="Virtual prize delivery"
                            data-arena-reward-contact
                            className="rounded-xl border border-white/10 bg-black/25 p-4"
                        >
                            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-500">
                                Arena contact email
                            </p>
                            {rewardContactEmail ? (
                                <>
                                    <a
                                        href={`mailto:${rewardContactEmail}`}
                                        className="mt-1 block text-sm font-semibold normal-case text-violet-100"
                                    >
                                        {rewardContactEmail}
                                    </a>
                                    <p className="mt-1 text-xs normal-case leading-5 text-gray-500">
                                        Winners use this Arena-managed email to coordinate virtual
                                        delivery.
                                    </p>
                                </>
                            ) : (
                                <p
                                    role="status"
                                    className="mt-1 text-sm normal-case leading-6 text-amber-100"
                                >
                                    Set up the Arena Contact Email before adding or changing
                                    contest prizes.
                                </p>
                            )}
                        </section>
                    ) : (
                        /* prizes_only: the settlement half, read-only. Frozen with
                           the rest of the deal a member accepted when they entered. */
                        <section
                            aria-label="Prize settlement"
                            data-arena-reward-settlement-readonly
                            className="divide-y divide-white/10 border-y border-white/10"
                        >
                            <div className="flex flex-col gap-1 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-500">
                                    Settlement
                                </p>
                                <p className="text-sm normal-case text-gray-200 sm:text-right">
                                    {value.settlementMethod === "in_person"
                                        ? `In-person pickup${activeVenue?.name ? ` at ${activeVenue.name}` : ""
                                        }`
                                        : "Virtual delivery"}
                                </p>
                            </div>
                            <div className="flex flex-col gap-1 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-500">
                                    {value.settlementMethod === "in_person" ? "Pickup" : "Contact"}
                                </p>
                                <p className="break-words text-sm normal-case text-gray-300 sm:text-right">
                                    {value.settlementMethod === "in_person"
                                        ? activeVenue?.address ?? "Original pickup details"
                                        : rewardContactEmail ?? "Original Arena contact email"}
                                </p>
                            </div>
                            {value.settlementMethod === "in_person" && value.pickupInstructions ? (
                                <div className="flex flex-col gap-1 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-500">
                                        Instructions
                                    </p>
                                    <p className="text-sm normal-case leading-6 text-gray-300 sm:max-w-xl sm:text-right">
                                        {value.pickupInstructions}
                                    </p>
                                </div>
                            ) : null}
                        </section>
                    )}

                    <fieldset aria-describedby={placementHelpId}>
                        <legend className="text-xs font-semibold normal-case text-gray-200">
                            Prize placements
                        </legend>
                        <p id={placementHelpId} className="sr-only">
                            First place is always included. Selecting a higher place also includes
                            every place before it.
                        </p>
                        <div className="mt-3 grid grid-cols-3 gap-2">
                            {ARENA_REWARD_PODIUM_PLACES.map((place) => {
                                const selected = value.prizes.some(
                                    (prize) => prize.place === place
                                );
                                const viewing = selected && activePrize?.place === place;
                                const label = formatContestPlacement(place);
                                return (
                                    <div
                                        key={place}
                                        data-arena-reward-placement={place}
                                        data-selected={selected ? "true" : "false"}
                                        data-current={viewing ? "true" : "false"}
                                        className={`relative overflow-hidden rounded-xl border text-center text-xs font-semibold transition ${selected
                                            ? "border-white/20 bg-white/[0.035] text-gray-100"
                                            : "border-white/10 bg-black/20 text-gray-500"
                                            } ${viewing
                                                ? "border-violet-300/40 bg-violet-400/[0.045] ring-1 ring-inset ring-violet-200/30"
                                                : ""
                                            }`}
                                    >
                                        <button
                                            type="button"
                                            aria-label={`View ${label} prize`}
                                            aria-current={viewing ? "true" : undefined}
                                            disabled={!selected}
                                            onClick={() => showPrize(place)}
                                            className="flex min-h-16 w-full items-center justify-start py-2.5 pl-10 pr-3 text-left outline-none transition hover:bg-white/[0.025] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-100/70 disabled:cursor-default"
                                        >
                                            <span
                                                aria-hidden="true"
                                                data-arena-reward-placement-icon={place}
                                                data-selected={selected ? "true" : "false"}
                                                className={`text-xs font-semibold normal-case transition ${selected ? "text-violet-100" : "text-gray-600"
                                                    }`}
                                            >
                                                {label}
                                            </span>
                                        </button>
                                        <label
                                            className={`absolute left-1.5 top-1/2 z-10 inline-flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full ${prizeConfigurationDisabled
                                                ? "cursor-not-allowed opacity-45"
                                                : ""
                                                }`}
                                        >
                                            <input
                                                type="checkbox"
                                                aria-label={`${label} prize`}
                                                aria-describedby={placementHelpId}
                                                checked={selected}
                                                disabled={prizeConfigurationDisabled}
                                                onChange={() => requestPrizeToggle(place)}
                                                className="peer sr-only"
                                            />
                                            <span
                                                aria-hidden="true"
                                                data-arena-reward-placement-check={place}
                                                data-selected={selected ? "true" : "false"}
                                                className={`inline-flex h-5 w-5 items-center justify-center rounded-full border transition peer-focus-visible:ring-2 peer-focus-visible:ring-violet-100/70 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[#111] ${selected
                                                    ? "border-violet-200/80 bg-violet-200 text-violet-950"
                                                    : "border-white/25 bg-black/35 text-transparent hover:border-white/40"
                                                    }`}
                                            >
                                                <svg viewBox="0 0 12 12" className="h-3 w-3">
                                                    <path
                                                        d="m2.5 6.2 2.1 2.1 4.9-5"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth="1.8"
                                                    />
                                                </svg>
                                            </span>
                                        </label>
                                    </div>
                                );
                            })}
                        </div>
                        <p className="sr-only" role="status" aria-live="polite">
                            {placementAnnouncement}
                        </p>
                        {showFirstPlaceNotice ? (
                            <div
                                role="alert"
                                className="mt-3 rounded-xl border border-amber-300/20 bg-amber-500/[0.07] p-3"
                            >
                                <p className="text-xs normal-case leading-5 text-amber-100">
                                    1st Place stays selected whenever prizes are enabled.
                                </p>
                                <div className="mt-3 flex justify-end">
                                    <button
                                        type="button"
                                        disabled={prizeConfigurationDisabled}
                                        onClick={() => {
                                            setShowFirstPlaceNotice(false);
                                            setPlacementAnnouncement("1st Place prize kept.");
                                        }}
                                        className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold normal-case text-gray-300 transition hover:border-white/25 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        Got it
                                    </button>
                                </div>
                            </div>
                        ) : pendingPrizeRange ? (
                            <div
                                role="alert"
                                className="mt-3 rounded-xl border border-amber-300/20 bg-amber-500/[0.07] p-3"
                            >
                                <p className="text-xs normal-case leading-5 text-amber-100">
                                    Remove the{" "}
                                    {prizesPendingRemoval.length === 1 ? "prize" : "prizes"} for{" "}
                                    {prizesPendingRemoval
                                        .map((prize) => formatContestPlacement(prize.place))
                                        .join(" and ")}
                                    ? {prizesPendingRemoval.length === 1 ? "Its" : "Their"} title,
                                    description, and value will be discarded.
                                </p>
                                <div className="mt-3 flex flex-wrap justify-end gap-2">
                                    <button
                                        type="button"
                                        disabled={prizeConfigurationDisabled}
                                        onClick={() => {
                                            setPendingPrizeRange(null);
                                            setPlacementAnnouncement("Prize details kept.");
                                        }}
                                        className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold normal-case text-gray-300 transition hover:border-white/25 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        Keep prizes
                                    </button>
                                    <button
                                        type="button"
                                        disabled={prizeConfigurationDisabled}
                                        onClick={() =>
                                            applyPrizeRange(
                                                pendingPrizeRange,
                                                activePrizePlace > pendingPrizeRange
                                                    ? pendingPrizeRange
                                                    : activePrizePlace
                                            )
                                        }
                                        className="rounded-lg border border-amber-200/30 bg-amber-300/10 px-3 py-2 text-xs font-semibold normal-case text-amber-100 transition hover:bg-amber-300/15 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        Remove{" "}
                                        {prizesPendingRemoval.length === 1 ? "prize" : "prizes"}
                                    </button>
                                </div>
                            </div>
                        ) : null}
                    </fieldset>

                    {activePrize ? (
                        <section
                            role="region"
                            aria-roledescription="carousel"
                            aria-label="Podium prize details"
                            data-arena-reward-prize-carousel
                            data-active-prize-place={activePrize.place}
                            tabIndex={0}
                            onKeyDown={handleCarouselKeyDown}
                            onTouchStart={handleTouchStart}
                            onTouchEnd={handleTouchEnd}
                            onTouchCancel={() => {
                                swipeStart.current = null;
                            }}
                            className="touch-pan-y rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-violet-200/55"
                        >
                            <section
                                key={activePrize.place}
                                role="group"
                                aria-roledescription="slide"
                                aria-labelledby={`arena-prize-${activePrize.place}-title`}
                                data-arena-reward-prizes
                                data-arena-reward-prize={activePrize.place}
                                className="overflow-hidden rounded-xl border border-white/10 bg-black/20"
                            >
                                <div className="flex min-h-12 items-center justify-between gap-3 border-b border-white/10 px-2">
                                    <button
                                        type="button"
                                        aria-label="Previous prize"
                                        disabled={activePrizeIndex === 0}
                                        onClick={() => showPrizeAtIndex(activePrizeIndex - 1)}
                                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-400 transition hover:bg-white/[0.04] hover:text-white disabled:cursor-not-allowed disabled:opacity-25"
                                    >
                                        <svg
                                            aria-hidden="true"
                                            viewBox="0 0 16 16"
                                            className="h-4 w-4"
                                        >
                                            <path
                                                d="m10 3-5 5 5 5"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth="1.5"
                                            />
                                        </svg>
                                    </button>
                                    <h3
                                        id={`arena-prize-${activePrize.place}-title`}
                                        className="min-w-0 text-center text-sm font-semibold normal-case text-white"
                                    >
                                        {formatContestPlacement(activePrize.place)} Prize
                                    </h3>
                                    <button
                                        type="button"
                                        aria-label="Next prize"
                                        disabled={activePrizeIndex === orderedPrizes.length - 1}
                                        onClick={() => showPrizeAtIndex(activePrizeIndex + 1)}
                                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-400 transition hover:bg-white/[0.04] hover:text-white disabled:cursor-not-allowed disabled:opacity-25"
                                    >
                                        <svg
                                            aria-hidden="true"
                                            viewBox="0 0 16 16"
                                            className="h-4 w-4"
                                        >
                                            <path
                                                d="m6 3 5 5-5 5"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth="1.5"
                                            />
                                        </svg>
                                    </button>
                                </div>
                                <div className="space-y-4 p-4">
                                    <label className="block text-xs font-semibold normal-case text-gray-200">
                                        Title
                                        <input
                                            data-arena-prize-field={`${activePrize.place}-title`}
                                            value={activePrize.title}
                                            required
                                            maxLength={ARENA_REWARD_PRIZE_TITLE_MAX}
                                            aria-invalid={
                                                invalidPrizeField?.place === activePrize.place &&
                                                    invalidPrizeField.field === "title"
                                                    ? true
                                                    : undefined
                                            }
                                            aria-describedby={
                                                invalidPrizeField?.place === activePrize.place &&
                                                    invalidPrizeField.field === "title"
                                                    ? prizeErrorMessageId
                                                    : undefined
                                            }
                                            disabled={prizeConfigurationDisabled}
                                            onChange={(event) =>
                                                updatePrize(activePrize.place, {
                                                    title: event.target.value,
                                                })
                                            }
                                            placeholder="$50 Gift Card"
                                            className="mt-2 w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-sm font-normal normal-case text-white outline-none transition placeholder:text-gray-600 focus:border-violet-300/50 disabled:cursor-not-allowed disabled:opacity-50"
                                        />
                                    </label>
                                    <label className="block text-xs font-semibold normal-case text-gray-200">
                                        Description
                                        <textarea
                                            data-arena-prize-field={`${activePrize.place}-description`}
                                            rows={3}
                                            value={activePrize.description}
                                            required
                                            maxLength={ARENA_REWARD_PRIZE_DESCRIPTION_MAX}
                                            aria-invalid={
                                                invalidPrizeField?.place === activePrize.place &&
                                                    invalidPrizeField.field === "description"
                                                    ? true
                                                    : undefined
                                            }
                                            aria-describedby={
                                                invalidPrizeField?.place === activePrize.place &&
                                                    invalidPrizeField.field === "description"
                                                    ? prizeErrorMessageId
                                                    : undefined
                                            }
                                            disabled={prizeConfigurationDisabled}
                                            onChange={(event) =>
                                                updatePrize(activePrize.place, {
                                                    description: event.target.value,
                                                })
                                            }
                                            placeholder="Describe the prize and any important details."
                                            className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-sm font-normal normal-case leading-6 text-white outline-none transition placeholder:text-gray-600 focus:border-violet-300/50 disabled:cursor-not-allowed disabled:opacity-50"
                                        />
                                    </label>
                                    <label className="block text-xs font-semibold normal-case text-gray-200">
                                        Approximate value
                                        <span className="ml-1 font-normal text-gray-500">
                                            Optional
                                        </span>
                                        <input
                                            aria-label="Approximate value"
                                            value={activePrize.approximateValue}
                                            maxLength={ARENA_REWARD_PRIZE_VALUE_MAX}
                                            disabled={prizeConfigurationDisabled}
                                            onChange={(event) =>
                                                updatePrize(activePrize.place, {
                                                    approximateValue: event.target.value,
                                                })
                                            }
                                            placeholder="$50"
                                            className="mt-2 w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-sm font-normal normal-case text-white outline-none transition placeholder:text-gray-600 focus:border-violet-300/50 disabled:cursor-not-allowed disabled:opacity-50"
                                        />
                                    </label>
                                </div>
                            </section>
                        </section>
                    ) : null}

                    <div
                        className={
                            prizesOnly
                                ? "border-y border-white/10 py-3"
                                : "rounded-xl border border-white/10 bg-black/25 px-4 py-3"
                        }
                    >
                        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-500">
                            Provider
                        </p>
                        <p className="mt-1 text-sm font-semibold normal-case text-gray-200">
                            Provided by {arenaName}
                        </p>
                    </div>

                    {/* The attestation. Its wording is stored IN FULL on every
                        signature server-side, so this copy has to match
                        ARENA_REWARD_ATTESTATION_TEXT word for word. */}
                    <label className="flex cursor-pointer items-start gap-3 text-xs normal-case leading-5 text-gray-300">
                        <input
                            type="checkbox"
                            checked={value.organizerConfirmed}
                            disabled={prizeConfigurationDisabled}
                            onChange={(event) =>
                                update({ organizerConfirmed: event.target.checked })
                            }
                            className="mt-0.5 h-4 w-4 shrink-0 accent-violet-400 disabled:cursor-not-allowed"
                        />
                        <span>
                            I confirm that I am authorized to offer these prizes on behalf of{" "}
                            {arenaName}, that the prize and settlement details are accurate, that no
                            purchase is required to participate, and that {arenaName} is responsible
                            for providing each advertised prize to its eligible recipient.
                        </span>
                    </label>
                </div>
            ) : null}

            {disabled ? (
                <p className="text-xs normal-case leading-5 text-gray-500">
                    {prizesOnly
                        ? "Prize updates are not available in the current Arena state."
                        : "Reward settlement is read-only here after the first accepted entry or contest lock. Existing podium prizes can be updated from Contest Settings."}
                </p>
            ) : null}
        </section>
    );
};

export default ArenaContestRewardEditor;
