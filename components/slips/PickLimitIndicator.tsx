import { Slip } from "@/lib/interfaces/interfaces";

type Props = {
    used: number;
    limit: Slip["pick_limit"];
    className?: string;
    textTransform?: "uppercase" | "lowercase" | "normal-case";
};

export const PickLimitIndicator = ({
    used,
    limit,
    className = "",
    textTransform = "uppercase",
}: Props) => {
    const limitLabel = limit === "unlimited" ? "∞" : limit;
    return (
        <div
            className={`flex items-center gap-1 text-xs ${textTransform} tracking-wide text-amber-200 ${className}`}
        >
            <span className="font-semibold text-amber-200">{used}</span>
            <span className="text-amber-200/70">/</span>
            <span className="font-semibold text-amber-200">{limitLabel}</span>
            <span className="font-medium text-amber-200/70">picks</span>
        </div>
    );
};

export default PickLimitIndicator;
