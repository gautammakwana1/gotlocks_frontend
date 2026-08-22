import { PickReaction } from "@/lib/interfaces/interfaces";
import { ReactionThumbIcon } from "../ui/SvgIcons";
import { getFeedDesktopSizing } from "./feedDesktopSizing";
import type { PickCardScale } from "./pick-card/types";

type PostReactionButtonsProps = {
    up: number;
    down: number;
    userReaction: PickReaction | null | undefined;
    onReaction: (reaction: PickReaction) => void;
    className?: string;
    /** Matches the buttons to their community shell (Arena reads violet). */
    accent?: "sky" | "violet";
    /** "structured" adds the Feed tab's desktop scale-up. */
    scale?: PickCardScale;
};

export const PostReactionButtons = ({
    up,
    down,
    userReaction,
    onReaction,
    className = "",
    accent = "sky",
    scale = "legacy",
}: PostReactionButtonsProps) => {
    const sizing = getFeedDesktopSizing(scale === "structured");
    const activeUpTone =
        accent === "violet"
            ? "border-violet-300/70 bg-violet-500/20 text-violet-100"
            : "border-sky-300/70 bg-sky-500/20 text-sky-100";

    return (
        <div
            data-feed-post-reactions
            className={`flex items-center gap-2 ${sizing.reactionGroup} ${className}`.trim()}
        >
            <button
                type="button"
                onClick={() => onReaction("up")}
                aria-pressed={userReaction === "up"}
                aria-label={`Like post (${up})`}
                className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide transition ${sizing.reactionButton} ${userReaction === "up"
                    ? activeUpTone
                    : "border-white/10 bg-white/5 text-[var(--text-secondary)] hover:border-white/30 hover:text-white"
                    }`}
            >
                <ReactionThumbIcon reaction="up" className={`h-3.5 w-3.5 ${sizing.reactionIcon}`.trimEnd()} />
                <span className={`tabular-nums text-[11px] ${sizing.reactionCount}`.trimEnd()}>{up}</span>
            </button>
            <button
                type="button"
                onClick={() => onReaction("down")}
                aria-pressed={userReaction === "down"}
                aria-label={`Dislike post (${down})`}
                className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide transition ${sizing.reactionButton} ${userReaction === "down"
                    ? "border-rose-300/70 bg-rose-500/20 text-rose-100"
                    : "border-white/10 bg-white/5 text-[var(--text-secondary)] hover:border-white/30 hover:text-white"
                    }`}
            >
                <ReactionThumbIcon reaction="down" className={`h-3.5 w-3.5 ${sizing.reactionIcon}`.trimEnd()} />
                <span className={`tabular-nums text-[11px] ${sizing.reactionCount}`.trimEnd()}>{down}</span>
            </button>
        </div>
    );
};

export default PostReactionButtons;
