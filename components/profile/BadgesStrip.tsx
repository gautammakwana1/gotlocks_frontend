"use client";

import { useState } from "react";

import {
    CATEGORY_LABELS,
    formatBadgeAmount,
    type ProfileBadgeProgress,
    type ProfileBadgeTierLevel,
} from "@/lib/profile/badges";
import ProfileBadgeIcon from "./ProfileBadgeIcon";
import { Pick } from "@/lib/interfaces/interfaces";

type BadgesStripProps = {
    postPicks: Pick[];
    variant?: "card" | "plain";
    profileBadges: ProfileBadgeProgress[];
};

const TIER_LABEL: Record<ProfileBadgeTierLevel, string> = {
    bronze: "Bronze",
    silver: "Silver",
    gold: "Gold",
};

const TIER_BAR: Record<ProfileBadgeTierLevel | "locked", string> = {
    gold: "bg-yellow-300",
    silver: "bg-slate-200",
    bronze: "bg-amber-600",
    locked: "bg-white/30",
};

const currentTierLevel = (
    badge: ProfileBadgeProgress
): ProfileBadgeTierLevel | "locked" => badge.earnedTier?.level ?? "locked";

const BadgesStrip = ({ postPicks, variant = "card", profileBadges }: BadgesStripProps) => {
    const [activeId, setActiveId] = useState<string | null>(null);

    const earnedCount = profileBadges.filter((badge) => badge.earnedTier).length;
    const activeBadge = activeId
        ? profileBadges.find((badge) => badge.definition.id === activeId) ?? null
        : null;

    return (
        <section
            className={
                variant === "card"
                    ? "space-y-4 rounded-3xl border border-[var(--border-soft)] bg-[var(--surface-1)] p-5 shadow-[var(--shadow-soft)]"
                    : "space-y-4"
            }
        >
            <div className="flex flex-wrap items-center justify-between gap-3">
                {variant === "card" ? (
                    <div>
                        <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
                            badges
                        </p>
                        <p className="text-sm text-[var(--text-secondary)]">
                            Milestone badges earned across your picks.
                        </p>
                    </div>
                ) : (
                    <span />
                )}
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-wide text-[var(--text-secondary)]">
                    {earnedCount}/{profileBadges.length} earned
                </span>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {profileBadges.map((badge) => {
                    const level = currentTierLevel(badge);
                    const locked = level === "locked";
                    return (
                        <button
                            key={badge.definition.id}
                            type="button"
                            onClick={() => setActiveId(badge.definition.id)}
                            className={`flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-center transition hover:border-white/20 hover:bg-white/[0.06] ${locked ? "opacity-60" : ""
                                }`}
                        >
                            <ProfileBadgeIcon badgeId={badge.definition.id} tierLevel={level} />
                            <div className="space-y-0.5">
                                <p className="text-xs font-semibold text-white">
                                    {badge.definition.name}
                                </p>
                                <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
                                    {badge.earnedTier ? TIER_LABEL[badge.earnedTier.level] : "Locked"}
                                </p>
                            </div>
                            <div className="w-full space-y-1">
                                <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
                                    <div
                                        className={`h-full rounded-full ${TIER_BAR[level]}`}
                                        style={{ width: `${badge.progressPercent}%` }}
                                    />
                                </div>
                                <p className="text-[10px] text-[var(--text-secondary)]">
                                    {badge.progressLabel}
                                </p>
                            </div>
                        </button>
                    );
                })}
            </div>

            {activeBadge && (
                <BadgeDetailModal
                    badge={activeBadge}
                    onClose={() => setActiveId(null)}
                />
            )}
        </section>
    );
};

type BadgeDetailModalProps = {
    badge: ProfileBadgeProgress;
    onClose: () => void;
};

const BadgeDetailModal = ({ badge, onClose }: BadgeDetailModalProps) => {
    const { definition, currentValue, earnedTier } = badge;
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            onClick={onClose}
        >
            <div
                className="w-full max-w-sm rounded-3xl border border-white/10 bg-black p-5 shadow-2xl"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="flex flex-col items-center gap-3 text-center">
                    <ProfileBadgeIcon
                        badgeId={definition.id}
                        tierLevel={earnedTier?.level ?? "locked"}
                        className="h-16 w-16"
                    />
                    <div className="space-y-1">
                        <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
                            {CATEGORY_LABELS[definition.category]}
                        </p>
                        <h3 className="text-base font-semibold text-white">{definition.name}</h3>
                        <p className="text-xs text-[var(--text-secondary)]">
                            {definition.description}
                        </p>
                    </div>
                </div>

                <ul className="mt-5 space-y-2">
                    {definition.tiers.map((t) => {
                        const reached = currentValue >= t.threshold;
                        const isCurrent = earnedTier?.level === t.level;
                        return (
                            <li
                                key={t.level}
                                className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-sm ${isCurrent
                                    ? "border-white/40 bg-white/10"
                                    : reached
                                        ? "border-white/15 bg-white/[0.04]"
                                        : "border-white/10 bg-transparent opacity-60"
                                    }`}
                            >
                                <span className="flex items-center gap-2">
                                    <span className="font-semibold text-white">
                                        {TIER_LABEL[t.level]}
                                    </span>
                                </span>
                                <span className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                                    {formatBadgeAmount(definition, t.threshold)}
                                    {reached && <span className="text-emerald-300">✓</span>}
                                </span>
                            </li>
                        );
                    })}
                </ul>

                <button
                    type="button"
                    onClick={onClose}
                    className="mt-5 w-full rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-gray-200 transition hover:border-white/30 hover:text-white"
                >
                    Close
                </button>
            </div>
        </div>
    );
};

export default BadgesStrip;
