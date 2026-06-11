import Image from "next/image";

import { ContestBadgeCategory } from "@/lib/interfaces/interfaces";
import { getBadgeIconSrc, resolveBadgeTint } from "@/lib/contests/badgeVisuals";

/**
 * The source PNGs carry a baked-in white ring + transparent corners outside the
 * gold medallion. We clip to a circle and scale the art up slightly so that
 * white ring is cropped away, leaving just the gold medallion.
 */
const CROP_SCALE = "scale-[1.12]";

type Props = {
    category: ContestBadgeCategory;
    sport?: string | null;
    tinted?: boolean;
    glow?: boolean;
    alt: string;
    className?: string;
    priority?: boolean;
};

export const BadgeIcon = ({
    category,
    sport,
    tinted = true,
    glow = true,
    alt,
    className = "",
    priority,
}: Props) => {
    const src = getBadgeIconSrc(category);
    const tint = resolveBadgeTint(category, sport);
    return (
        <span
            className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full ${tinted ? `ring-1 ${tint.ringClass}` : ""
                } ${tinted && glow ? tint.glowClass : ""} ${className}`}
        >
            <Image
                src={src}
                alt={alt}
                width={200}
                height={200}
                className={`h-full w-full object-contain ${CROP_SCALE}`}
                priority={priority}
            />
        </span>
    );
};
