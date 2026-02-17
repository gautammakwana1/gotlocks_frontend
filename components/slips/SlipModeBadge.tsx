import { Slip } from "@/lib/interfaces/interfaces";

type Props = {
    isGraded: Slip["isGraded"];
    variant?: "pill" | "text";
};

const baseClasses =
    "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold lowercase tracking-wide whitespace-nowrap";
const textClasses = "text-xs font-semibold uppercase tracking-wide whitespace-nowrap";

export const SlipModeBadge = ({ isGraded, variant = "pill" }: Props) => {
    if (variant === "text") {
        return (
            <span
                className={`${textClasses} ${isGraded ? "text-emerald-200" : "text-gray-300"
                    }`}
            >
                {isGraded ? "leaderboard slip" : "vibe slip"}
            </span>
        );
    }

    return (
        <span
            className={`${baseClasses} ${isGraded
                ? "border-emerald-400/60 bg-emerald-500/15 text-emerald-100"
                : "border-white/15 bg-white/5 text-gray-300"
                }`}
        >
            {isGraded ? "leaderboard slip" : "vibe slip"}
        </span>
    );
};

export default SlipModeBadge;
