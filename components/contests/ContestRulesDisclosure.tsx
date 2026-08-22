"use client";

/* ----------------------------------------------------------------------------
 * THE CONTEST RULES, as a collapsed disclosure.
 *
 * Ported from the MVP's components/contests/ContestRulesDisclosure.tsx. Two
 * surfaces use it and they need the same block parsing, which is why it is a
 * component rather than a `<p className="whitespace-pre-wrap">`:
 *
 *   Details tab   `layout="details"` — full-bleed, so the summary rule lines up
 *                 with the games disclosure directly above it.
 *   Rename form   the default layout, inside the wizard's hero card, where the
 *                 rules are shown READ ONLY: an entrant accepted this text, so
 *                 it is a record from the moment the contest publishes.
 *
 * `isRulesHeading` is what makes a stored `rules_text` read as a document rather
 * than as one long paragraph: the seeded copy separates its sections with blank
 * lines and writes each section title in caps, so a short all-caps block is
 * promoted to a heading and everything else stays prose. The 48-character cap
 * stops a genuinely shouted sentence from being mistaken for one.
 * -------------------------------------------------------------------------- */

export type ContestRulesDisclosureProps = {
    rulesText: string;
    accent?: "league" | "arena";
    className?: string;
    helperText?: string;
    layout?: "default" | "details";
};

const isRulesHeading = (block: string) =>
    block.length <= 48 && /^[A-Z][A-Z &/’-]+$/.test(block) && /[A-Z]/.test(block);

export const ContestRulesContent = ({ rulesText }: { rulesText: string }) => {
    const blocks = rulesText
        .split(/\n{2,}/)
        .map((block) => block.trim())
        .filter(Boolean);

    return (
        <div className="space-y-4">
            {blocks.map((block, index) =>
                isRulesHeading(block) ? (
                    <h4
                        key={`${block}-${index}`}
                        className="pt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-300 first:pt-0"
                    >
                        {block}
                    </h4>
                ) : (
                    <p
                        key={`${block.slice(0, 32)}-${index}`}
                        className="whitespace-pre-line text-sm leading-6 text-gray-400"
                    >
                        {block}
                    </p>
                )
            )}
        </div>
    );
};

export const ContestRulesDisclosure = ({
    rulesText,
    accent = "league",
    className = "",
    helperText = "View complete contest rules",
    layout = "default",
}: ContestRulesDisclosureProps) => (
    <details
        data-contest-rules-disclosure
        data-contest-rules-layout={layout}
        className={`group border-y border-white/10 ${layout === "details" ? "-mx-5 w-auto sm:-mx-6" : ""
            } ${className}`}
    >
        <summary
            className={`flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 py-4 outline-none transition hover:text-white focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/30 [&::-webkit-details-marker]:hidden ${layout === "details" ? "px-5 sm:px-6" : ""
                }`}
        >
            <span>
                <span
                    role="heading"
                    aria-level={3}
                    className="block text-sm font-semibold text-gray-100"
                >
                    Contest Rules
                </span>
                <span className="mt-0.5 block text-xs text-gray-500">{helperText}</span>
            </span>
            <svg
                aria-hidden="true"
                viewBox="0 0 16 16"
                className={`h-4 w-4 shrink-0 transition-transform duration-200 group-open:rotate-180 ${accent === "arena" ? "text-violet-300/70" : "text-sky-300/70"
                    }`}
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
            className={`border-t border-white/10 pb-5 pt-4 ${layout === "details" ? "px-5 sm:px-6" : ""
                }`}
        >
            <ContestRulesContent rulesText={rulesText} />
        </div>
    </details>
);

export default ContestRulesDisclosure;
