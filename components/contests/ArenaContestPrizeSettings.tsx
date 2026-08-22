"use client";

import { useEffect, useId, useMemo, useState } from "react";
import Link from "next/link";
import { useDispatch, useSelector } from "react-redux";
import {
    arenaRewardPrizesPayload,
    arenaRewardSummary,
    type ArenaRewardDraft,
    type ArenaRewardPlace,
} from "@/lib/contests/arenaReward";
import type { FeedContestReward, RootState } from "@/lib/interfaces/interfaces";
import {
    clearFeedContestRewardPrizesState,
    updateFeedContestRewardPrizesRequest,
} from "@/lib/redux/slices/feedContestSlice";
import { useToast } from "@/lib/state/ToastContext";
import ArenaContestRewardEditor from "./ArenaContestRewardEditor";

/* ----------------------------------------------------------------------------
 * PODIUM PRIZES on the Settings tab — ported from the MVP's
 * components/contests/ArenaContestPrizeSettings.tsx.
 *
 * The ONE reward write allowed after a contest has gone live, and it edits
 * WORDING only. `PATCH /reward/:contest_id/prizes` rebuilds the settlement half
 * from the stored row and ignores anything a body says about it, because the
 * method, the venue, the pickup instructions and the contact email are the deal
 * a member accepted when they entered. The SET of paid places is frozen with
 * them — the editor is mounted in `prizes_only` mode, whose placement
 * checkboxes are inert, so the array this posts always carries exactly the
 * places the reward already has.
 *
 * ADDING a reward is not possible here at all. It rides along with the contest
 * on create, because the legal disclosure has to be inside `rules_text` on the
 * very first version of the row — so the "Add prizes" link is offered only while
 * the contest is still a DRAFT, where the wizard can still author one. A
 * published contest without prizes says so and stops.
 *
 * ONE DELIBERATE DIVERGENCE from the MVP: it also gates the prizes-only SAVE on
 * the Arena having a valid contact email. Our backend does not, and should not —
 * an in-person reward never used that inbox, and an owner who cleared it after
 * publishing would otherwise be locked out of fixing a typo in a prize they are
 * still on the hook for. The gate belongs to the CREATE path, where the wizard
 * enforces it.
 * -------------------------------------------------------------------------- */

const draftFromReward = (reward: FeedContestReward): ArenaRewardDraft => ({
    enabled: true,
    settlementMethod: reward.settlement_method,
    prizes: [...reward.prizes]
        .sort((left, right) => left.place - right.place)
        .map((prize) => ({
            place: prize.place as ArenaRewardPlace,
            title: prize.title,
            description: prize.description,
            approximateValue: prize.approximate_value ?? "",
        })),
    pickupInstructions: reward.pickup_instructions ?? "",
    // Re-taken on every save — the checkbox starts ticked because the stored
    // reward already carries a signature, and `update()` clears it the moment
    // the organizer changes a word.
    organizerConfirmed: true,
});

export type ArenaContestPrizeSettingsProps = {
    contestId: string;
    /** NULL when this contest shipped without prizes. */
    reward: FeedContestReward | null;
    /** Organizer authority AND a writable Arena AND a live contest. */
    editable: boolean;
    /**
     * The wizard, for a contest that can still AUTHOR a reward — drafts only.
     * Omit on anything published: the backend answers 409 there.
     */
    addRewardHref?: string;
    /** Finalized contests still allow a wording fix; the copy says what that means. */
    finalized?: boolean;
};

export const ArenaContestPrizeSettings = ({
    contestId,
    reward,
    editable,
    addRewardHref,
    finalized = false,
}: ArenaContestPrizeSettingsProps) => {
    const dispatch = useDispatch();
    const { setToast } = useToast();
    const { rewardPrizesLoading, rewardPrizesMessage, rewardPrizesError } = useSelector(
        (state: RootState) => state.feedContest
    );
    const [draft, setDraft] = useState<ArenaRewardDraft | null>(() =>
        reward ? draftFromReward(reward) : null
    );
    const [error, setError] = useState<string>();
    const [saved, setSaved] = useState(false);
    const [invalidPrizeField, setInvalidPrizeField] = useState<{
        place: ArenaRewardPlace;
        field: "title" | "description";
    } | null>(null);
    const prizeErrorMessageId = useId();

    // Re-seeded whenever the stored reward changes — including from this
    // component's own save, which patches the detail slot.
    useEffect(() => {
        setDraft(reward ? draftFromReward(reward) : null);
        setError(undefined);
        setInvalidPrizeField(null);
    }, [reward]);

    // One place reports the write, then clears the slice so a re-render cannot
    // report it twice.
    useEffect(() => {
        if (!rewardPrizesMessage && !rewardPrizesError) return;
        setToast({
            id: Date.now(),
            type: rewardPrizesError ? "error" : "success",
            message: rewardPrizesError ?? rewardPrizesMessage ?? "",
            duration: 4000,
        });
        if (rewardPrizesError) {
            setError(rewardPrizesError);
            setSaved(false);
        } else {
            setSaved(true);
            setError(undefined);
        }
        dispatch(clearFeedContestRewardPrizesState());
    }, [dispatch, rewardPrizesError, rewardPrizesMessage, setToast]);

    const normalizedPrizes = useMemo(
        () => (draft ? arenaRewardPrizesPayload(draft) : []),
        [draft]
    );
    const storedPrizes = useMemo(
        () =>
            reward
                ? [...reward.prizes]
                    .sort((left, right) => left.place - right.place)
                    .map((prize) => ({
                        place: prize.place,
                        title: prize.title,
                        description: prize.description,
                        approximate_value: prize.approximate_value ?? null,
                    }))
                : [],
        [reward]
    );
    const dirty =
        Boolean(reward && draft) &&
        JSON.stringify(normalizedPrizes) !== JSON.stringify(storedPrizes);

    const reportError = (message: string) => {
        setSaved(false);
        setError(message);
        setToast({ id: Date.now(), type: "error", message, duration: 4000 });
    };

    const handleSave = () => {
        if (!draft || !reward || !dirty || rewardPrizesLoading) return;

        const incompletePrize = normalizedPrizes.find(
            (prize) => !prize.title || !prize.description
        );
        if (incompletePrize) {
            setInvalidPrizeField({
                place: incompletePrize.place as ArenaRewardPlace,
                field: incompletePrize.title ? "description" : "title",
            });
            reportError("Every selected podium prize needs a title and description.");
            return;
        }
        if (!draft.organizerConfirmed) {
            reportError(
                `Confirm that ${reward.provider_name_snapshot} is responsible for the updated prizes.`
            );
            return;
        }

        setError(undefined);
        setSaved(false);
        setInvalidPrizeField(null);
        dispatch(
            updateFeedContestRewardPrizesRequest({
                contest_id: contestId,
                prizes: normalizedPrizes,
                organizer_confirmed: draft.organizerConfirmed,
            })
        );
    };

    return (
        <details
            aria-label="Podium prizes"
            data-arena-contest-prize-settings
            className="group px-5 sm:px-6"
        >
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-5 outline-none transition hover:text-white focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-300/40 [&::-webkit-details-marker]:hidden">
                <span className="min-w-0">
                    <span className="block text-sm font-semibold uppercase tracking-[0.12em] text-white">
                        Podium prizes
                    </span>
                    <span
                        data-arena-contest-prize-settings-summary
                        className="mt-1 block text-xs normal-case leading-5 text-gray-500"
                    >
                        {reward
                            ? arenaRewardSummary(reward.prizes.length, reward.settlement_method)
                            : "No prizes were offered"}
                    </span>
                </span>
                <span className="flex shrink-0 items-center gap-3">
                    {reward && editable ? (
                        <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-violet-200">
                            Update prizes
                        </span>
                    ) : null}
                    <svg
                        aria-hidden="true"
                        viewBox="0 0 16 16"
                        className="h-4 w-4 text-gray-500 transition-transform duration-200 group-open:rotate-180"
                    >
                        <path
                            d="m4 6 4 4 4-4"
                            fill="none"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="1.5"
                        />
                    </svg>
                </span>
            </summary>

            <div className="-mx-5 border-t border-white/10 px-5 py-6 sm:-mx-6 sm:px-6">
                {!reward || !draft ? (
                    <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm normal-case leading-6 text-gray-400">
                            {addRewardHref
                                ? "No prizes are configured. Add prizes and settlement details before publishing this draft."
                                : "No prizes were offered. A contest published without prizes cannot add them later — its rules would not mention the prize an entrant accepted."}
                        </p>
                        {addRewardHref ? (
                            <Link
                                href={addRewardHref}
                                className="inline-flex min-h-10 shrink-0 items-center rounded-lg border border-violet-300/35 px-3.5 py-2 text-xs font-semibold normal-case text-violet-100 transition hover:bg-violet-500/10"
                            >
                                Add prizes
                            </Link>
                        ) : null}
                    </div>
                ) : (
                    <div className="space-y-6">
                        {finalized ? (
                            <p className="text-xs normal-case leading-5 text-gray-500">
                                Prize updates appear with the finalized podium. Results,
                                placements, entries, and Arena Points stay locked.
                            </p>
                        ) : null}
                        <ArenaContestRewardEditor
                            value={draft}
                            arenaName={reward.provider_name_snapshot}
                            activeVenue={
                                reward.venue_name_snapshot && reward.venue_address_snapshot
                                    ? {
                                        name: reward.venue_name_snapshot,
                                        address: reward.venue_address_snapshot,
                                    }
                                    : null
                            }
                            rewardContactEmail={reward.reward_contact_email_snapshot}
                            mode="prizes_only"
                            invalidPrizeField={invalidPrizeField}
                            prizeErrorMessageId={prizeErrorMessageId}
                            disabled={!editable}
                            onChange={(next) => {
                                setDraft(next);
                                setError(undefined);
                                setSaved(false);
                                setInvalidPrizeField(null);
                            }}
                        />

                        {error ? (
                            <p
                                id={prizeErrorMessageId}
                                role="alert"
                                className="text-sm normal-case text-amber-100"
                            >
                                {error}
                            </p>
                        ) : null}

                        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-white/10 pt-5">
                            {saved && !dirty ? (
                                <p role="status" className="mr-auto text-xs text-emerald-200">
                                    Prizes saved.
                                </p>
                            ) : null}
                            <button
                                type="button"
                                disabled={!dirty || rewardPrizesLoading}
                                onClick={() => {
                                    setDraft(draftFromReward(reward));
                                    setError(undefined);
                                    setSaved(false);
                                    setInvalidPrizeField(null);
                                }}
                                className="min-h-10 rounded-lg px-3.5 py-2 text-xs font-semibold normal-case text-gray-300 transition hover:bg-white/[0.05] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={
                                    !editable ||
                                    !dirty ||
                                    !draft.organizerConfirmed ||
                                    rewardPrizesLoading
                                }
                                onClick={handleSave}
                                className="min-h-10 rounded-lg bg-violet-100 px-3.5 py-2 text-xs font-semibold normal-case text-violet-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                {rewardPrizesLoading ? "Saving…" : "Save prizes"}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </details>
    );
};

export default ArenaContestPrizeSettings;
