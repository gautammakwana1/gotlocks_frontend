"use client";

import { useId } from "react";
import { formatContestPlacement } from "@/lib/contests/arenaReward";
import type { FeedContestReward } from "@/lib/interfaces/interfaces";

/* ----------------------------------------------------------------------------
 * THE PODIUM PRIZES, as a reader sees them — ported from the MVP's
 * components/contests/ArenaContestRewardCard.tsx.
 *
 * TWO VARIANTS, and they are not styling preferences:
 *
 *   "review"   the wizard's last step. A standalone violet card, always open,
 *              because the organizer is being asked to check it before signing.
 *   "details"  the contest's Details tab. Full-bleed and COLLAPSED behind a
 *              summary line, so it sits in the same stack of disclosures as
 *              Included games and Contest rules rather than shouting over them.
 *
 * Everything below the header is shared: a reader has to recognise the same
 * prize list in both places.
 * -------------------------------------------------------------------------- */

/**
 * What the card needs. A stored {@link FeedContestReward} satisfies it as-is;
 * the Review step builds the same shape from the draft plus the Arena's own
 * venue and inbox, which is exactly what the server will snapshot.
 */
export type ArenaContestRewardCardValue = Pick<
    FeedContestReward,
    | "settlement_method"
    | "prizes"
    | "pickup_instructions"
    | "venue_name_snapshot"
    | "venue_address_snapshot"
    | "reward_contact_email_snapshot"
    | "provider_name_snapshot"
>;

export type ArenaContestRewardCardVariant = "review" | "details";

export const ArenaContestRewardCard = ({
    reward,
    className = "",
    variant = "review",
}: {
    reward: ArenaContestRewardCardValue;
    className?: string;
    variant?: ArenaContestRewardCardVariant;
}) => {
    const titleId = useId();
    const prizes = [...reward.prizes].sort((left, right) => left.place - right.place);
    const isDetails = variant === "details";
    const settlementLabel =
        reward.settlement_method === "in_person" ? "In-person pickup" : "Virtual delivery";

    const rewardBody = (
        <>
            <ol
                aria-label="Podium prize placements"
                className={[
                    "mt-4 divide-y border-y",
                    isDetails
                        ? "divide-white/10 border-white/10"
                        : "divide-violet-200/15 border-violet-200/15",
                ].join(" ")}
            >
                {prizes.map((prize) => (
                    <li
                        key={prize.place}
                        data-arena-contest-prize={prize.place}
                        className={[
                            "grid sm:grid-cols-[6.5rem_1fr] sm:gap-4",
                            isDetails ? "gap-1 py-3" : "gap-2 py-4",
                        ].join(" ")}
                    >
                        <p
                            className={[
                                "font-semibold uppercase tracking-[0.1em]",
                                isDetails ? "text-[10px] text-gray-500" : "text-xs text-violet-200",
                            ].join(" ")}
                        >
                            {formatContestPlacement(prize.place)}
                        </p>
                        <div className="min-w-0">
                            <h4
                                className={[
                                    "font-semibold normal-case text-white",
                                    isDetails ? "text-sm leading-5" : "text-base leading-6",
                                ].join(" ")}
                            >
                                {prize.title}
                            </h4>
                            <p
                                className={[
                                    "mt-1 text-sm normal-case leading-6",
                                    isDetails ? "text-gray-400" : "text-gray-300",
                                ].join(" ")}
                            >
                                {prize.description}
                            </p>
                            {prize.approximate_value ? (
                                <p
                                    className={[
                                        isDetails ? "mt-1" : "mt-2",
                                        "text-xs normal-case text-gray-400",
                                    ].join(" ")}
                                >
                                    <span className="text-gray-500">Approx. value</span>{" "}
                                    <span className="font-semibold text-gray-200">
                                        {prize.approximate_value}
                                    </span>
                                </p>
                            ) : null}
                        </div>
                    </li>
                ))}
            </ol>

            <section
                aria-label="Prize settlement"
                data-arena-reward-settlement={reward.settlement_method}
                className={
                    isDetails ? "py-4" : "mt-4 rounded-xl border border-white/10 bg-black/25 p-4"
                }
            >
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-500">
                    {settlementLabel}
                </p>
                {reward.settlement_method === "in_person" ? (
                    <div className="mt-2 text-sm normal-case leading-6 text-gray-300">
                        {reward.venue_name_snapshot ? (
                            <p className="font-semibold text-gray-100">
                                {reward.venue_name_snapshot}
                            </p>
                        ) : null}
                        {reward.venue_address_snapshot ? (
                            <p>{reward.venue_address_snapshot}</p>
                        ) : null}
                        {!reward.venue_name_snapshot && !reward.venue_address_snapshot ? (
                            <p>Venue details unavailable.</p>
                        ) : null}
                        {reward.pickup_instructions ? (
                            <p className="mt-2 border-t border-white/10 pt-2 text-xs leading-5 text-gray-400">
                                {reward.pickup_instructions}
                            </p>
                        ) : null}
                    </div>
                ) : reward.reward_contact_email_snapshot ? (
                    <div className="mt-2">
                        <p className="text-xs normal-case leading-5 text-gray-500">
                            Contact the Arena to coordinate delivery.
                        </p>
                        <a
                            href={`mailto:${reward.reward_contact_email_snapshot}`}
                            className="mt-1 inline-block break-all rounded-sm text-sm font-semibold normal-case text-violet-100 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300/70"
                        >
                            {reward.reward_contact_email_snapshot}
                        </a>
                    </div>
                ) : (
                    <p className="mt-2 text-sm normal-case text-gray-400">
                        Contact details unavailable.
                    </p>
                )}
            </section>

            <dl
                className={[
                    "border-t pt-4 text-xs",
                    isDetails ? "border-white/10" : "mt-4 border-violet-200/15",
                ].join(" ")}
            >
                <div>
                    <dt className="text-gray-500">Provided by</dt>
                    <dd className="mt-0.5 font-semibold normal-case text-gray-200">
                        {reward.provider_name_snapshot}
                    </dd>
                </div>
            </dl>
            <p
                className={[
                    isDetails ? "mt-3" : "mt-4",
                    "text-xs normal-case leading-5 text-gray-500",
                ].join(" ")}
            >
                Prize fulfillment is handled by the Arena organizer.
            </p>
        </>
    );

    return (
        <section
            aria-labelledby={titleId}
            data-arena-contest-reward
            data-arena-contest-reward-variant={variant}
            className={[
                isDetails
                    ? "-mx-5 w-auto border-y border-white/10 sm:-mx-6"
                    : "rounded-2xl border border-violet-300/25 bg-violet-500/[0.08] p-4 sm:p-5",
                className,
            ].join(" ")}
        >
            {isDetails ? (
                <details className="group" data-arena-contest-reward-disclosure>
                    <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 outline-none transition hover:text-white focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/30 sm:px-6 [&::-webkit-details-marker]:hidden">
                        <span className="min-w-0">
                            <h3 id={titleId} className="text-sm font-semibold text-gray-100">
                                Podium prizes
                            </h3>
                            <span className="mt-0.5 block truncate text-xs normal-case text-gray-500">
                                {prizes.length} {prizes.length === 1 ? "prize" : "prizes"} ·{" "}
                                {settlementLabel}
                            </span>
                        </span>
                        <svg
                            aria-hidden="true"
                            viewBox="0 0 16 16"
                            data-directional-arrow="down"
                            className="ui-directional-arrow h-4 w-4 shrink-0 text-violet-300/70 transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
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
                    </summary>
                    <div
                        data-arena-contest-reward-details-panel
                        className="border-t border-white/10 px-5 pb-5 sm:px-6"
                    >
                        {rewardBody}
                    </div>
                </details>
            ) : (
                <>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-violet-200">
                        Arena rewards
                    </p>
                    <h3 id={titleId} className="mt-1 text-lg font-semibold text-white">
                        Podium prizes
                    </h3>
                    {rewardBody}
                </>
            )}
        </section>
    );
};

export default ArenaContestRewardCard;
