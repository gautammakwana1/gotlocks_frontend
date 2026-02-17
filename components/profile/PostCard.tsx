"use client";

import { Pick, PickReaction, PickResult, PickType, RootState } from "@/lib/interfaces/interfaces";
import { clearCreatePickReactionMessage, createPickReactionRequest, fetchPostPicksByUserIdRequest } from "@/lib/redux/slices/pickSlice";
import { formatDateTime } from "@/lib/utils/date";
import { formatTierPrimary, getTierMetaForPick } from "@/lib/utils/scoring";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

type PostCardProps = {
    pick: Pick;
    displayName: string;
    mode: "self" | "public";
    canDelete: boolean;
    onDelete: (pickId: string) => void;
};

const resultTone = (result: PickResult) => {
    switch (result) {
        case "win":
            return "border-emerald-300/60 bg-emerald-500/15 text-emerald-100";
        case "loss":
            return "border-red-400/60 bg-red-500/15 text-red-100";
        case "void":
            return "border-yellow-300/60 bg-yellow-500/15 text-yellow-100";
        case "not_found":
            return "border-yellow-300/60 bg-yellow-500/15 text-yellow-100";
        case "pending":
            return "border-blue-300/50 bg-blue-500/10 text-blue-100";
        default:
            return "border-white/10 bg-white/5 text-[var(--text-secondary)]";
    }
};

const EM_DASH = "\u2014";
const DASH_SEPARATOR = ` ${EM_DASH} `;
const PLACEHOLDER = EM_DASH;
const META_SEPARATOR = " \u00b7 ";
const UP_TRIANGLE = "\u25B2";
const DOWN_TRIANGLE = "\u25BC";

const withAlpha = (hex: string, alphaHex: string) => {
    if (hex.startsWith("#") && hex.length === 7) {
        return `${hex}${alphaHex}`;
    }
    return hex;
};

const getHexFromGradient = (color?: string) => {
    if (!color) return undefined;
    const match = color.match(/#([0-9a-fA-F]{6})/);
    return match ? `#${match[1]}` : undefined;
};

const getTierCardStyle = (color?: string) => {
    const hex = getHexFromGradient(color);
    if (!hex) return undefined;
    return {
        backgroundImage: `linear-gradient(135deg, ${withAlpha(
            hex,
            "55"
        )}, ${withAlpha(hex, "22")}, rgba(0,0,0,0))`,
    };
};

const resolveLegCategoryLabel = (market?: string) => {
    if (!market) return null;
    const upper = market.toUpperCase();
    if (upper.includes("MONEYLINE") || upper.includes("POINT SPREAD") || upper.includes("TOTAL")) {
        return "game lines";
    }
    if (upper.includes("PASSING")) return "passing props";
    if (upper.includes("RECEIVING") || upper.includes("RECEPTION")) return "receiving props";
    if (upper.includes("RUSHING")) return "rushing props";
    if (upper.includes("TD")) return "td scorer props";
    return market.replace(/Player\s+/i, "Player ").toLowerCase();
};

const extractPickLine = (description: string) => {
    const [matchupSegment, ...lineSegments] = description.split(DASH_SEPARATOR);
    const candidate = matchupSegment?.trim();
    const hasMatchup = candidate && /@|\bvs\.?\b|\bv\.?\b/i.test(candidate);
    if (hasMatchup && lineSegments.length > 0) {
        return lineSegments.join(DASH_SEPARATOR);
    }
    return description;
};

const extractMatchup = (description?: string | null) => {
    if (!description) return null;
    const [lead] = description.split(DASH_SEPARATOR);
    const candidate = lead?.trim();
    if (candidate && /@|\bvs\.?\b|\bv\.?\b/i.test(candidate)) {
        return candidate;
    }
    const match = description.match(
        new RegExp(`([^${EM_DASH}]*?(@|\\bvs\\.?\\b|\\bv\\.?\\b)[^${EM_DASH}]*)`, "i")
    );
    return match ? match[1].trim() : null;
};

const PostCard = ({ pick, displayName, mode, canDelete, onDelete }: PostCardProps) => {
    const dispatch = useDispatch();
    const [collapsed, setCollapsed] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement | null>(null);
    const { loading, message } = useSelector((state: RootState) => state.pick)

    useEffect(() => {
        if (loading || !message) return;
        dispatch(clearCreatePickReactionMessage())
        dispatch(fetchPostPicksByUserIdRequest({ user_id: pick.user_id }));
    }, [message, loading, dispatch, pick.user_id]);

    useEffect(() => {
        if (!menuOpen) return;
        const handlePointerDown = (event: PointerEvent) => {
            const target = event.target as Node | null;
            if (!target || menuRef.current?.contains(target)) return;
            setMenuOpen(false);
        };
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setMenuOpen(false);
            }
        };
        document.addEventListener("pointerdown", handlePointerDown);
        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("pointerdown", handlePointerDown);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [menuOpen]);

    if (pick.pick_type !== PickType.POST) return null;

    const tierMeta = getTierMetaForPick({
        odds: pick.odds_bracket,
        label: pick.difficulty_label,
        points: pick.points,
        mode: "global",
    });
    const tierPrimary = tierMeta
        ? `${formatTierPrimary(tierMeta.tier)}${tierMeta.points ? ` • ${tierMeta.points} pts` : ""
        }`
        : "Tier -";
    const tierCardStyle = tierMeta?.color ? getTierCardStyle(tierMeta.color) : undefined;
    const tierCardTone = tierCardStyle
        ? "bg-transparent"
        : tierMeta?.color
            ? `bg-gradient-to-br ${tierMeta.color}`
            : "bg-white/[0.04]";
    const confidenceLabel = pick.confidence ? pick.confidence.toLowerCase() : null;
    const confidenceTone =
        confidenceLabel === "high"
            ? "text-emerald-100"
            : confidenceLabel === "medium"
                ? "text-amber-100"
                : confidenceLabel === "low"
                    ? "text-rose-100"
                    : "text-slate-500";
    const comboLabel = pick.is_combo
        ? `combo${pick.legs?.length ? ` · ${pick.legs.length} legs` : ""}`
        : null;
    const resultLabel = (pick.result ?? "pending") as PickResult;
    const resultDisplay = resultLabel === "not_found" ? "n/a" : resultLabel;
    // const pointsValue = resultLabel === "pending" ? null : getPickPoints(pick);
    // const pointsLabel =
    //     pointsValue === null ? "—" : `${pointsValue > 0 ? "+" : ""}${pointsValue} pts`;
    const timestamp = pick.created_at ?? pick.updated_at ?? new Date().toISOString();
    const showResultChip = pick.result && pick.result !== "pending";
    const sportLabel = pick.sport?.toString().toUpperCase() || "SPORT";
    const displayPick = pick.description ?? "No pick was submitted";
    const pickLine = extractPickLine(displayPick);
    const matchupCopy = extractMatchup(displayPick) ?? PLACEHOLDER;
    const gameTimeCopy = formatDateTime(pick.selection?.gameStartTime);
    const showMatchup = matchupCopy !== PLACEHOLDER;
    const showGameTime = gameTimeCopy !== PLACEHOLDER;
    const oddsCopy = pick.odds_bracket ?? PLACEHOLDER;
    const legsCount = pick.legs?.length ?? 0;
    const legsCopy = legsCount > 0 ? `${legsCount} picks` : pick.is_combo ? "combo" : null;
    const postedLine = `${legsCopy ? `${legsCopy} \u00b7 ` : ""}${formatDateTime(timestamp)}`;
    const isComboPost = Boolean(pick.is_combo || (pick.legs?.length ?? 0) > 0);
    const baseSourceTabLabel = pick.source_tab ?? (isComboPost ? "Combo" : "Pick");
    const normalizedSourceTabLabel = baseSourceTabLabel.toLowerCase();
    const sourceTabLabel = isComboPost
        ? normalizedSourceTabLabel === "combo"
            ? "combo pick post"
            : normalizedSourceTabLabel
        : "single pick post";
    const showComboLegs = Boolean(pick.is_combo && pick.legs && pick.legs.length > 0);
    const isSelfProfile = mode === "self";
    const profilePicture = pick.profiles?.profile_image ? `${process.env.NEXT_PUBLIC_SUPABASE_S3_URL}/${pick.profiles?.profile_image}` : undefined;
    const up = pick.up ?? 0;
    const down = pick.down ?? 0;
    const userReaction = pick.reaction ?? undefined;
    const upActive = userReaction === "up";
    const downActive = userReaction === "down";
    const displayLabel =
        displayName.length > 12 ? `${displayName.slice(0, 12)}\u2026` : displayName;

    const handleReaction = (reaction: PickReaction) => {
        if (reaction && pick.id) {
            dispatch(createPickReactionRequest({ pick_id: pick.id, action: reaction === "up" ? "liked" : "dislike" }));
        }
    };

    return (
        <div className="py-4">
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 pb-3 sm:px-6">
                <div className="flex min-w-0 items-center gap-2">
                    <div className="-ml-1 flex min-w-0 items-center gap-3 rounded-xl border border-transparent py-1 pl-0 pr-2 text-left">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold uppercase text-slate-100">
                            {profilePicture ? (
                                <Image
                                    src={profilePicture}
                                    alt="Profile image"
                                    width={56}
                                    height={56}
                                    className={`tracking-wide rounded-full object-cover h-8 w-8`}
                                    draggable={false}
                                    onDragStart={(e) => e.preventDefault()}
                                    unoptimized
                                />
                            ) : (
                                <span className="tracking-wide">
                                    {displayName.slice(0, 2)}
                                </span>
                            )}
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-[var(--app-text)]">
                                <span className="sm:hidden">{displayLabel}</span>
                                <span className="hidden sm:inline">{displayName}</span>
                            </p>
                        </div>
                    </div>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                    <div className="flex items-center gap-2">
                        {collapsed && (
                            <span className="text-[12px] font-semibold text-slate-100">
                                {oddsCopy}
                            </span>
                        )}
                        <button
                            type="button"
                            onClick={() => handleReaction("up")}
                            aria-pressed={upActive}
                            className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide transition ${upActive
                                ? "border-emerald-300/70 bg-emerald-500/20 text-emerald-100"
                                : "border-white/10 bg-white/5 text-[var(--text-secondary)] hover:border-white/30 hover:text-white"
                                }`}
                        >
                            <span aria-hidden="true">{UP_TRIANGLE}</span>
                            <span className="tabular-nums text-[11px]">{up}</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => handleReaction("down")}
                            aria-pressed={downActive}
                            className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide transition ${downActive
                                ? "border-rose-300/70 bg-rose-500/20 text-rose-100"
                                : "border-white/10 bg-white/5 text-[var(--text-secondary)] hover:border-white/30 hover:text-white"
                                }`}
                        >
                            <span aria-hidden="true">{DOWN_TRIANGLE}</span>
                            <span className="tabular-nums text-[11px]">{down}</span>
                        </button>
                    </div>
                    {showResultChip && (
                        <span
                            className={`rounded-full px-3 py-1 text-[11px] uppercase tracking-wide ${resultTone(
                                resultLabel
                            )}`}
                        >
                            {resultDisplay}
                        </span>
                    )}
                    {canDelete && (
                        <div className="relative" ref={menuRef}>
                            <button
                                type="button"
                                onClick={() => setMenuOpen((open) => !open)}
                                aria-haspopup="menu"
                                aria-expanded={menuOpen}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/10 text-[14px] text-[var(--text-secondary)] transition hover:border-white/30 hover:text-white"
                            >
                                {"\u22EF"}
                            </button>
                            {menuOpen && (
                                <div className="absolute right-0 z-20 mt-2 w-32 rounded-lg border border-white/10 bg-black/90 p-1 shadow-lg">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setMenuOpen(false);
                                            onDelete(pick.id);
                                        }}
                                        className="w-full rounded-md px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-rose-100 transition hover:bg-rose-500/10 hover:text-rose-50"
                                    >
                                        Delete
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                    <button
                        type="button"
                        onClick={() => setCollapsed((prev) => !prev)}
                        aria-expanded={!collapsed}
                        aria-label={collapsed ? "Expand post" : "Collapse post"}
                        className={`inline-flex h-4 w-4 items-center justify-center text-[10px] font-semibold transition ${collapsed
                            ? "text-[var(--text-secondary)] hover:text-white"
                            : "text-white/90 hover:text-white"
                            }`}
                    >
                        {collapsed ? "\u25BC" : "\u25B2"}
                    </button>
                </div>
            </div>

            {!collapsed && (
                <div className="space-y-3 px-5 sm:px-6">
                    <div
                        className={`flex flex-col gap-2 sm:flex-row ${showComboLegs ? "sm:items-start" : "sm:items-stretch"
                            }`}
                    >
                        <div
                            className={`order-2 flex w-full gap-2 sm:order-1 sm:w-[140px] sm:flex-col ${showComboLegs ? "sm:self-start" : "sm:self-stretch"
                                }`}
                        >
                            <div
                                className={`w-full flex-1 rounded-xl border border-white/10 p-2.5 shadow-[inset_0_0_10px_rgba(15,23,42,0.2)] ${showComboLegs ? "sm:flex-none" : ""
                                    } ${tierCardTone}`}
                                style={tierCardStyle}
                            >
                                <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                    tier
                                </span>
                                <span className="mt-1 block text-xs font-semibold text-white">
                                    {tierPrimary}
                                </span>
                            </div>
                            <div
                                className={`w-full flex-1 rounded-xl border border-white/10 bg-white/[0.04] p-2.5 shadow-[inset_0_0_10px_rgba(15,23,42,0.2)] ${showComboLegs ? "sm:flex-none" : ""
                                    }`}
                            >
                                <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                    confidence
                                </span>
                                <span className={`mt-1 block text-xs font-semibold ${confidenceTone}`}>
                                    {confidenceLabel ?? "—"}
                                </span>
                            </div>
                        </div>

                        <div className="order-1 flex-1 rounded-xl border border-white/10 bg-white/[0.04] p-3 shadow-[inset_0_0_10px_rgba(15,23,42,0.2)] sm:order-2">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                    <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                        {sourceTabLabel}
                                    </span>
                                    {!showComboLegs && (
                                        <>
                                            <div className="mt-2 h-px w-full bg-white/10" />
                                            <div className="mt-2 flex min-w-0 items-baseline justify-between gap-3">
                                                <p
                                                    className="min-w-0 flex-1 whitespace-normal break-words text-sm font-semibold leading-snug text-cyan-100"
                                                    title={displayPick}
                                                >
                                                    {pickLine}
                                                </p>
                                                <span className="shrink-0 text-[12px] font-semibold text-slate-100">
                                                    {oddsCopy}
                                                </span>
                                            </div>
                                        </>
                                    )}
                                </div>
                                {showComboLegs && (
                                    <div className="flex flex-col items-end">
                                        <span className="text-[12px] font-semibold text-slate-100">
                                            {oddsCopy}
                                        </span>
                                    </div>
                                )}
                            </div>
                            {showComboLegs && <div className="mt-3 h-px w-full bg-white/10" />}
                            {showComboLegs ? (
                                <>
                                    <ul className="mt-3 space-y-2">
                                        {pick.legs?.map((leg, index) => {
                                            const legPickLine = extractPickLine(leg.description);
                                            const legMatchup = extractMatchup(leg.description);
                                            const legTime = formatDateTime(leg.selection?.gameStartTime);
                                            const legMeta = [legMatchup, legTime !== PLACEHOLDER ? legTime : null]
                                                .filter(Boolean)
                                                .join(META_SEPARATOR);
                                            const legCategory = resolveLegCategoryLabel(leg.selection?.market);
                                            return (
                                                <li
                                                    key={`${leg.description}-${index}`}
                                                    className="flex items-start justify-between gap-3"
                                                >
                                                    <div className="min-w-0 flex items-start gap-2">
                                                        <span className="mt-2 h-1.5 w-1.5 rounded-full bg-cyan-300/80" />
                                                        <div className="min-w-0">
                                                            {legCategory && (
                                                                <span className="block text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                                                                    {legCategory}
                                                                </span>
                                                            )}
                                                            <p className="min-w-0 text-[12px] font-semibold leading-snug text-cyan-200">
                                                                {legPickLine}
                                                            </p>
                                                            {legMeta && (
                                                                <p className="mt-1 text-[10px] text-slate-400">{legMeta}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col items-end gap-1 pt-2">
                                                        <span className="text-[11px] font-semibold text-slate-100">
                                                            {leg.odds_bracket ?? PLACEHOLDER}
                                                        </span>
                                                    </div>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </>
                            ) : (
                                <div className="mt-2 text-[11px] text-slate-300">
                                    <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                        matchup
                                    </span>
                                    {showMatchup ? (
                                        <span className="mt-0.5 block truncate text-[11px] text-slate-200">
                                            {matchupCopy}
                                        </span>
                                    ) : (
                                        <span className="mt-0.5 block text-[11px] text-slate-500">
                                            {PLACEHOLDER}
                                        </span>
                                    )}
                                    {showGameTime && (
                                        <span className="mt-0.5 block truncate text-[11px] text-slate-200">
                                            {gameTimeCopy}
                                        </span>
                                    )}
                                    {legsCopy && (
                                        <span className="mt-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                            {legsCopy}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-wide text-[var(--text-secondary)]">
                            {!showComboLegs && comboLabel && (
                                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-gray-200">
                                    {comboLabel}
                                </span>
                            )}
                        </div>
                        <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
                            {sportLabel + " · " + postedLine}
                        </div>
                    </div>
                </div>
            )}
            {collapsed && (
                <div className="px-5 sm:px-6">
                    <div className="flex justify-end text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
                        {sportLabel + " · " + postedLine}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PostCard;
