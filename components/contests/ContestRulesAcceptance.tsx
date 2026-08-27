"use client";

import { useId } from "react";
import { ContestRulesContent } from "./ContestRulesDisclosure";

/* ----------------------------------------------------------------------------
 * "I accept the current rules…" — the block a member ticks before their first
 * entry, shared by all three contest entry builders.
 *
 * THE DOCUMENT COLLAPSES; THE CHECKBOX DOES NOT. That split is the whole design.
 * A contest's rules are now a generated multi-section document — General Combo's
 * runs to eight sections — and printing it in full pushed the thing the member
 * actually has to DO several screens down, on the TD Psychic builder past the
 * sticky tray it sits above. Collapsing the checkbox with it would be worse: the
 * member would have to open a disclosure to discover there was an action inside.
 *
 * So the section always shows what is being accepted and the control to accept
 * it, and hides only the body behind a summary that names the version. Nobody is
 * asked to agree to something they cannot see — the text is one tap away and the
 * summary says so.
 *
 * Extracted from three near-identical copies (the Pick'em editor, the TD Psychic
 * builder and the General Combo pick builder). They differed only in accent, so
 * that is the only thing this takes as a knob.
 * -------------------------------------------------------------------------- */

export type ContestRulesAcceptanceAccent = "neutral" | "league" | "arena";

const ACCENT_TONES: Record<
    ContestRulesAcceptanceAccent,
    { eyebrow: string; checkbox: string; chevron: string }
> = {
    /*
     * The TD Psychic builder is deliberately neutral dark with WHITE controls —
     * the only colour on that screen is the player's own team tint. Its rules
     * block has to follow, or the accent it refuses everywhere else creeps back
     * in through this one section.
     */
    neutral: {
        eyebrow: "text-gray-400",
        checkbox: "accent-white",
        chevron: "text-gray-500",
    },
    league: {
        eyebrow: "text-sky-200",
        checkbox: "accent-sky-400",
        chevron: "text-sky-300/70",
    },
    arena: {
        eyebrow: "text-violet-200",
        checkbox: "accent-violet-400",
        chevron: "text-violet-300/70",
    },
};

export type ContestRulesAcceptanceProps = {
    accepted: boolean;
    onAcceptedChange: (accepted: boolean) => void;
    label: string;
    rulesText?: string | null;
    rulesVersion?: string | null;
    accent?: ContestRulesAcceptanceAccent;
    /** The host's own band styling — each builder frames this differently. */
    className?: string;
};

export const ContestRulesAcceptance = ({
    accepted,
    onAcceptedChange,
    label,
    rulesText,
    rulesVersion,
    accent = "league",
    className = "",
}: ContestRulesAcceptanceProps) => {
    const titleId = useId();
    const tone = ACCENT_TONES[accent];

    return (
        <section
            data-contest-rules-confirmation
            aria-label="Contest rules confirmation"
            className={className}
        >
            {rulesText ? (
                <details data-contest-rules-acceptance-disclosure className="group">
                    <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 outline-none transition hover:text-white focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/30 [&::-webkit-details-marker]:hidden">
                        <span className="min-w-0">
                            <span
                                id={titleId}
                                role="heading"
                                aria-level={3}
                                className={`block text-[10px] font-semibold uppercase tracking-[0.11em] ${tone.eyebrow}`}
                            >
                                Contest rules
                                {rulesVersion ? ` · Version ${rulesVersion}` : ""}
                            </span>
                            {/* Says which way it opens, so the summary is not just
                                a heading with a chevron next to it. */}
                            <span className="mt-0.5 block text-[11px] normal-case leading-5 text-gray-500">
                                Read the full rules before accepting
                            </span>
                        </span>
                        <svg
                            aria-hidden="true"
                            data-directional-arrow="down"
                            viewBox="0 0 16 16"
                            className={`ui-directional-arrow h-4 w-4 shrink-0 transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none ${tone.chevron}`}
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
                    <div className="mt-3 border-t border-white/10 pt-3">
                        <ContestRulesContent rulesText={rulesText} />
                    </div>
                </details>
            ) : rulesVersion ? (
                /* No text to collapse — a contest that stored none still has a
                   version worth naming above the tick. */
                <p
                    className={`text-[10px] font-semibold uppercase tracking-[0.11em] ${tone.eyebrow}`}
                >
                    Contest rules · Version {rulesVersion}
                </p>
            ) : null}

            <label className="mt-3 flex cursor-pointer items-start gap-3 text-xs normal-case leading-5 text-gray-200">
                <input
                    type="checkbox"
                    checked={accepted}
                    onChange={(event) => onAcceptedChange(event.target.checked)}
                    className={`mt-0.5 h-4 w-4 shrink-0 ${tone.checkbox}`}
                />
                <span>{label}</span>
            </label>
        </section>
    );
};

export default ContestRulesAcceptance;
