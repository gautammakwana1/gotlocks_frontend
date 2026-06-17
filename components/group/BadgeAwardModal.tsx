"use client";

import { useEffect, useState } from "react";

import { ContestBadgeAward } from "@/lib/interfaces/interfaces";
import { BadgeIcon } from "../badges/BadgeIcon";
import { resolveBadgeTint } from "@/lib/contests/badgeVisuals";

type Props = {
    award: ContestBadgeAward | null;
    onClose: () => void;
};

export const BadgeAwardModal = ({ award, onClose }: Props) => {
    const [flipped, setFlipped] = useState(false);

    useEffect(() => {
        setFlipped(false);
    }, [award?.definition.id]);

    useEffect(() => {
        if (!award) return;
        const handler = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [award, onClose]);

    if (!award) return null;

    const { definition } = award;
    const tint = resolveBadgeTint(definition.category, award.sport);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 py-8 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-label={`${definition.name} badge`}
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-xs"
                onClick={(event) => event.stopPropagation()}
            >
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close badge"
                    className="absolute -right-2 -top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-white/15 bg-black/70 text-sm text-white/70 transition hover:text-white"
                >
                    ✕
                </button>

                <button
                    type="button"
                    onClick={() => setFlipped((prev) => !prev)}
                    aria-label={flipped ? "Show badge icon" : "Show badge details"}
                    className="block w-full cursor-pointer bg-transparent [perspective:1200px]"
                >
                    <div
                        className={`relative aspect-square w-full transition-transform duration-500 [transform-style:preserve-3d] ${flipped ? "[transform:rotateY(-180deg)]" : ""}`}
                    >
                        <div
                            className={`absolute inset-0 flex flex-col items-center justify-center gap-4 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900/90 to-black/90 p-6 [backface-visibility:hidden] ${tint.glowClass}`}
                        >
                            <h3 className={`text-center text-xl font-semibold ${tint.textClass}`}>
                                {definition.name}
                            </h3>
                            <BadgeIcon
                                category={definition.category}
                                sport={award.sport}
                                alt={`${definition.name} badge`}
                                className="h-36 w-36 drop-shadow-xl"
                                priority
                            />
                            <span className="pointer-events-none absolute bottom-3 right-3 text-[10px] uppercase tracking-wide text-white/35">
                                tap to flip ⇄
                            </span>
                        </div>

                        <div
                            className={`absolute inset-0 flex flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900/95 to-black/95 p-6 text-center [backface-visibility:hidden] [transform:rotateY(-180deg)] ${tint.glowClass}`}
                        >
                            {definition.display.subtitle && (
                                <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${tint.textClass}`}>
                                    {definition.display.subtitle}
                                </p>
                            )}
                            <p className="text-sm leading-relaxed text-slate-200">{definition.description}</p>
                            <span className="pointer-events-none absolute bottom-3 right-3 text-[10px] uppercase tracking-wide text-white/35">
                                tap to flip ⇄
                            </span>
                        </div>
                    </div>
                </button>
            </div>
        </div>
    );
};
