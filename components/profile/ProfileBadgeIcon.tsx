"use client";

import {
    Award,
    ChartColumn,
    Dices,
    Dog,
    Flame,
    Globe,
    Puzzle,
    Target,
    Trophy,
} from "lucide-react";

import { ProfileBadgeTierLevel } from "@/lib/profile/badges";

type TierVisual = {
    ringClass: string;
    glowClass: string;
    bgClass: string;
    textClass: string;
};

/** Tier-coloured medallion treatment, mirroring BadgeIcon's ring + glow style. */
const TIER_VISUALS: Record<ProfileBadgeTierLevel | "locked", TierVisual> = {
    gold: {
        ringClass: "ring-yellow-300/70",
        glowClass: "shadow-[0_0_24px_rgba(250,204,21,0.30)]",
        bgClass: "bg-gradient-to-b from-yellow-200/20 to-amber-500/10",
        textClass: "text-yellow-200",
    },
    silver: {
        ringClass: "ring-slate-200/70",
        glowClass: "shadow-[0_0_22px_rgba(226,232,240,0.22)]",
        bgClass: "bg-gradient-to-b from-slate-100/20 to-slate-400/10",
        textClass: "text-slate-100",
    },
    bronze: {
        ringClass: "ring-amber-600/70",
        glowClass: "shadow-[0_0_20px_rgba(205,127,50,0.24)]",
        bgClass: "bg-gradient-to-b from-amber-500/20 to-amber-800/10",
        textClass: "text-amber-400",
    },
    locked: {
        ringClass: "ring-white/10",
        glowClass: "",
        bgClass: "bg-white/5",
        textClass: "text-white/40",
    },
};

/** Render the Lucide icon for a given badge id. */
const renderBadgeIcon = (badgeId: string, className: string) => {
    switch (badgeId) {
        case "volume":
            return <ChartColumn className={className} aria-hidden />;
        case "combo-architect":
            return <Puzzle className={className} aria-hidden />;
        case "globetrotter":
            return <Globe className={className} aria-hidden />;
        case "win-streak":
            return <Flame className={className} aria-hidden />;
        case "win-machine":
            return <Trophy className={className} aria-hidden />;
        case "accuracy":
            return <Target className={className} aria-hidden />;
        case "underdog":
            return <Dog className={className} aria-hidden />;
        case "high-roller":
            return <Dices className={className} aria-hidden />;
        default:
            return <Award className={className} aria-hidden />;
    }
};

type Props = {
    /** Badge id from the catalog (e.g. "volume"); selects the Lucide icon. */
    badgeId: string;
    tierLevel: ProfileBadgeTierLevel | "locked";
    /** Sizing classes for the medallion (e.g. "h-12 w-12"). */
    className?: string;
    glow?: boolean;
};

export const ProfileBadgeIcon = ({
    badgeId,
    tierLevel,
    className = "h-12 w-12",
    glow = true,
}: Props) => {
    const visual = TIER_VISUALS[tierLevel];
    const locked = tierLevel === "locked";
    return (
        <span
            className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full ring-1 ${visual.ringClass
                } ${visual.bgClass} ${glow && !locked ? visual.glowClass : ""} ${className}`}
        >
            {renderBadgeIcon(
                badgeId,
                `h-1/2 w-1/2 ${visual.textClass} ${locked ? "opacity-40" : ""}`
            )}
        </span>
    );
};

export default ProfileBadgeIcon;
