/* ----------------------------------------------------------------------------
 * ARENA CONTEST REWARDS — the shared vocabulary.
 *
 * A real-world prize attached to an Arena contest's podium, offered, supplied
 * and handed over BY THE ARENA. Gotlocks never provides, funds, ships or
 * guarantees one, and nothing here moves money — which is why the organizer has
 * to sign an attestation, and why "approximate value" is a free-text LABEL
 * rather than a currency amount.
 *
 * ARENA ONLY. A League Feed contest can never carry a reward: the backend
 * refuses `arena_reward` on a League context (400) and the database enforces it
 * through a composite foreign key.
 *
 * Every rule below mirrors the backend's `validateArenaRewardInput`
 * (helpers/reward.helper.ts:152) and the MVP's `validateArenaReward`
 * (StructuredContestDetail.tsx:1691), including the error wording — those
 * strings are what the wizard renders inline against the offending field, so a
 * client message that disagrees with the server's is worse than no client check
 * at all.
 * -------------------------------------------------------------------------- */

export type ArenaRewardPlace = 1 | 2 | 3;
export type ArenaRewardSettlementMethod = "in_person" | "virtual";

/** Which podium places may carry a prize. Three, and only three. */
export const ARENA_REWARD_PODIUM_PLACES: readonly ArenaRewardPlace[] = [1, 2, 3];

export const ARENA_REWARD_PRIZE_TITLE_MAX = 80;
export const ARENA_REWARD_PRIZE_DESCRIPTION_MAX = 500;
export const ARENA_REWARD_PRIZE_VALUE_MAX = 40;
export const ARENA_REWARD_PICKUP_INSTRUCTIONS_MAX = 500;
export const ARENA_REWARD_CONTACT_EMAIL_MAX = 254;

/**
 * Placements must run CONSECUTIVELY from 1st. Verbatim from the backend's
 * `ARENA_REWARD_PLACEMENT_SEQUENCE_ERROR`, which took it from the MVP.
 *
 * Not cosmetic: the MVP's own editor refuses to reopen a reward with a gap in
 * it, so accepting "1st and 3rd" writes a row the organizer could never edit
 * again from the app that created it.
 */
export const ARENA_REWARD_PLACEMENT_SEQUENCE_ERROR =
    "Choose prizes for consecutive podium places starting with 1st: 1st only, 1st and 2nd, or all three.";

/** The organizer-authored half of one podium prize, as the editor holds it. */
export type ArenaRewardPrizeDraft = {
    place: ArenaRewardPlace;
    title: string;
    description: string;
    /** A LABEL — "$50", "About £20", "Two tickets" — never a number. */
    approximateValue: string;
};

/** The Reward step's whole answer, including "no prizes". */
export type ArenaRewardDraft = {
    enabled: boolean;
    settlementMethod: ArenaRewardSettlementMethod;
    prizes: ArenaRewardPrizeDraft[];
    pickupInstructions: string;
    /** The attestation. An unsigned offer must never reach the server. */
    organizerConfirmed: boolean;
};

/** "1st Place" / "2nd Place" / "3rd Place" — the " Place" suffix is part of it. */
export const formatContestPlacement = (place: number) => {
    const absolute = Math.abs(place);
    const lastTwo = absolute % 100;
    const suffix =
        lastTwo >= 11 && lastTwo <= 13
            ? "th"
            : absolute % 10 === 1
                ? "st"
                : absolute % 10 === 2
                    ? "nd"
                    : absolute % 10 === 3
                        ? "rd"
                        : "th";
    return `${place}${suffix} Place`;
};

/** TRUE for [1], [1,2] and [1,2,3] — and for nothing else. */
export const hasContiguousArenaRewardPrizePlaces = (places: readonly number[]) => {
    const sorted = [...places].sort((left, right) => left - right);
    return sorted.every((place, index) => place === index + 1);
};

export const emptyArenaRewardPrize = (place: ArenaRewardPlace): ArenaRewardPrizeDraft => ({
    place,
    title: "",
    description: "",
    approximateValue: "",
});

/** The Reward step's starting answer: no prizes, in-person if switched on. */
export const createEmptyArenaRewardDraft = (): ArenaRewardDraft => ({
    enabled: false,
    settlementMethod: "in_person",
    prizes: [],
    pickupInstructions: "",
    organizerConfirmed: false,
});

/**
 * The Arena's fulfilment inbox, normalised the way the column's CHECK expects:
 * trimmed and lower-cased.
 */
export const normalizeArenaRewardContactEmail = (value: string | null | undefined) =>
    (value ?? "").trim().toLowerCase();

/**
 * Deliberately STRICTLY INSIDE the backend's rule rather than a mirror of it —
 * the same allowlist `isValidRewardContactEmail` uses. Every value this accepts
 * satisfies the column's CHECK by construction, which is the only property that
 * matters on the client: a rejected exotic address is a message the user can act
 * on, an accepted one the server then refuses is a 500 they cannot.
 */
export const isValidArenaRewardContactEmail = (value: string) =>
    value.length >= 3 &&
    value.length <= ARENA_REWARD_CONTACT_EMAIL_MAX &&
    value === value.toLowerCase() &&
    /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/.test(
        value
    );

/**
 * The prize array as the API takes it — trimmed, canonically sorted, with a
 * blank approximate value collapsed to null.
 *
 * Sorted because the backend compares the SET of paid places between a stored
 * reward and a prizes-only edit by joining them in order; an unsorted array
 * reads as a placement change and is refused with a 409.
 */
export const arenaRewardPrizesPayload = (draft: ArenaRewardDraft) =>
    draft.prizes
        .map((prize) => ({
            place: prize.place,
            title: prize.title.trim(),
            description: prize.description.trim(),
            approximate_value: prize.approximateValue.trim() || null,
        }))
        .sort((left, right) => left.place - right.place);

/**
 * The `arena_reward` key for `/create`, `/create-draft` and `/publish-draft`.
 *
 * Returns `{ enabled: false }` rather than `undefined` for "no prizes", because
 * that is a complete answer to the Reward step and the backend accepts it as
 * one — which is what lets the wizard post its step state verbatim.
 *
 * The venue, the contact email and the provider name are deliberately ABSENT:
 * every one of those is a claim about who is legally on the hook for a prize, so
 * the server reads them from its own state and refuses to take them from a body.
 */
export const arenaRewardPayload = (draft: ArenaRewardDraft) =>
    draft.enabled
        ? {
            enabled: true as const,
            settlement_method: draft.settlementMethod,
            prizes: arenaRewardPrizesPayload(draft),
            pickup_instructions:
                draft.settlementMethod === "in_person"
                    ? draft.pickupInstructions.trim() || null
                    : null,
            organizer_confirmed: draft.organizerConfirmed,
        }
        : { enabled: false as const };

/**
 * The organizer-authored half validated, in the backend's own order and with its
 * own wording. Returns the first problem, or null.
 *
 * `venueConfigured` / `contactEmailConfigured` describe the ARENA, not the
 * draft: an in-person reward needs an active venue to snapshot and a virtual one
 * needs the Arena's inbox, and the server answers 409 for either. Passing the
 * role-appropriate message in keeps a manager from being told to go fix
 * something only the permanent owner can.
 */
export const validateArenaRewardDraft = ({
    draft,
    arenaName,
    winningPlaces,
    venueConfigured,
    contactEmailConfigured,
    venueRequiredMessage,
    contactEmailRequiredMessage,
}: {
    draft: ArenaRewardDraft;
    arenaName: string;
    /** The contest's paid places. A prize above it can never be awarded. */
    winningPlaces?: number | null;
    venueConfigured: boolean;
    contactEmailConfigured: boolean;
    venueRequiredMessage: string;
    contactEmailRequiredMessage: string;
}): string | null => {
    if (!draft.enabled) return null;

    if (!contactEmailConfigured) return contactEmailRequiredMessage;

    if (draft.prizes.length === 0) return "Choose at least one prize placement.";

    const places = draft.prizes.map((prize) => prize.place);
    const uniquePlaces = new Set(places);
    if (uniquePlaces.size !== places.length) {
        return "Choose each podium prize placement only once.";
    }
    if (places.some((place) => !ARENA_REWARD_PODIUM_PLACES.includes(place))) {
        return `Prize placement must be one of: ${ARENA_REWARD_PODIUM_PLACES.join(", ")}.`;
    }
    if (!hasContiguousArenaRewardPrizePlaces([...uniquePlaces])) {
        return ARENA_REWARD_PLACEMENT_SEQUENCE_ERROR;
    }

    const ordered = [...draft.prizes].sort((left, right) => left.place - right.place);
    for (const prize of ordered) {
        const title = prize.title.trim();
        const description = prize.description.trim();
        if (!title || !description) {
            return `${formatContestPlacement(prize.place)} needs a prize title and description.`;
        }
        if (title.length > ARENA_REWARD_PRIZE_TITLE_MAX) {
            return `${formatContestPlacement(prize.place)} prize title cannot exceed ${ARENA_REWARD_PRIZE_TITLE_MAX} characters.`;
        }
        if (description.length > ARENA_REWARD_PRIZE_DESCRIPTION_MAX) {
            return `${formatContestPlacement(prize.place)} prize description cannot exceed ${ARENA_REWARD_PRIZE_DESCRIPTION_MAX} characters.`;
        }
        if (prize.approximateValue.trim().length > ARENA_REWARD_PRIZE_VALUE_MAX) {
            return `${formatContestPlacement(prize.place)} approximate value cannot exceed ${ARENA_REWARD_PRIZE_VALUE_MAX} characters.`;
        }
    }

    if (typeof winningPlaces === "number" && Number.isFinite(winningPlaces)) {
        const unwinnable = ordered.find((prize) => prize.place > winningPlaces);
        if (unwinnable) {
            return `This contest pays ${winningPlaces} ${winningPlaces === 1 ? "place" : "places"
                }. Remove the ${formatContestPlacement(unwinnable.place)} prize, or raise the number of paid places.`;
        }
    }

    if (draft.settlementMethod === "in_person") {
        if (!venueConfigured) return venueRequiredMessage;
        const instructions = draft.pickupInstructions.trim();
        if (!instructions) return "Add pickup instructions for the podium prizes.";
        if (instructions.length > ARENA_REWARD_PICKUP_INSTRUCTIONS_MAX) {
            return `Pickup instructions cannot exceed ${ARENA_REWARD_PICKUP_INSTRUCTIONS_MAX} characters.`;
        }
    }

    if (!draft.organizerConfirmed) {
        return `Confirm that ${arenaName} is authorized and responsible for these prizes.`;
    }

    return null;
};

/** The one-line summary the Settings disclosure and the Review row both use. */
export const arenaRewardSummary = (
    prizeCount: number,
    settlementMethod: ArenaRewardSettlementMethod
) =>
    `${prizeCount} ${prizeCount === 1 ? "prize" : "prizes"} · ${settlementMethod === "in_person" ? "In-person pickup" : "Virtual delivery"
    }`;
