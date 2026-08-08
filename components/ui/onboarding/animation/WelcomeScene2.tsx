"use client";


import { clamp, Easing, useTime } from "./engine";
import { APP_BG, Avatar, BORDER, BRAND_HIGHLIGHT, FONT_MONO, FONT_SANS, PointsBurst, TEXT, TEXT_MUTED } from "./primitives";

// Scene 2 V2 — Leaderboard Race.
// Stable identities, points tick up live, rows reorder by rank,
// "you" row glows and rises. Flying +points bursts on "you".
export function WelcomeScene2({
    compact = false,
    showText = false,
}: {
    compact?: boolean;
    showText?: boolean;
}) {
    const time = useTime();

    type Person = {
        name: string;
        hue: number;
        basePts: number;
        growth: number;
        you?: boolean;
    };

    const people: Person[] = [
        { name: "ColdBloodKing", hue: 280, basePts: 180, growth: 8 },
        { name: "SharpShark22", hue: 220, basePts: 120, growth: 55, you: true },
        { name: "LockdNLoaded", hue: 160, basePts: 155, growth: 12 },
        { name: "GrindsetGuru", hue: 40, basePts: 140, growth: 10 },
        { name: "IcyLines", hue: 340, basePts: 130, growth: 6 },
        { name: "NightOwlPicks", hue: 200, basePts: 105, growth: 4 },
        { name: "HailMaryKing", hue: 80, basePts: 95, growth: 3 },
        { name: "ChalkEater", hue: 300, basePts: 85, growth: 2 },
    ];

    const visiblePeople = compact ? people.slice(0, 5) : people;
    const points = visiblePeople.map((p) => ({
        ...p,
        // round to nearest 5 so displayed values always end in 0 or 5
        pts:
            Math.round(
                (p.basePts +
                    p.growth * Easing.easeOutCubic(clamp((time - 0.8) / 3, 0, 1)) * 3) /
                5
            ) * 5,
    }));

    const sorted = [...points].sort((a, b) => b.pts - a.pts);
    const headerTop = compact ? 38 : 80;
    const horizontalInset = compact ? 64 : 100;
    const rowsTop = compact ? 125 : 210;
    const rowsInset = compact ? 54 : 80;
    const rowGap = compact ? 67 : 80;

    return (
        <div style={{ position: "absolute", inset: 0, background: APP_BG, overflow: "hidden" }}>
            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    background: `radial-gradient(circle at 50% 40%, rgba(59,130,246,0.12), transparent 55%)`,
                }}
            />

            {/* Header */}
            <div
                style={{
                    position: "absolute",
                    top: headerTop,
                    left: horizontalInset,
                    right: horizontalInset,
                    opacity: clamp(time / 0.4, 0, 1),
                    transform: `translateY(${(1 - clamp(time / 0.4, 0, 1)) * -10}px)`,
                }}
            >
                <div
                    style={{
                        fontSize: compact ? 13 : 14,
                        fontFamily: FONT_MONO,
                        color: BRAND_HIGHLIGHT,
                        letterSpacing: "0.14em",
                        textTransform: "uppercase",
                    }}
                >
                    sunday degens · leaderboard
                </div>
                <div
                    style={{
                        fontFamily: FONT_SANS,
                        fontSize: compact ? 38 : 48,
                        fontWeight: 700,
                        color: TEXT,
                        marginTop: compact ? 5 : 8,
                        letterSpacing: "-0.03em",
                    }}
                >
                    week 7 · live
                    <span
                        style={{
                            marginLeft: 12,
                            width: 10,
                            height: 10,
                            borderRadius: 5,
                            background: "#fde047",
                            display: "inline-block",
                            boxShadow: `0 0 ${8 + 4 * Math.sin(time * 8)}px #fde047`,
                            opacity: 0.5 + 0.5 * Math.sin(time * 6),
                            verticalAlign: "middle",
                        }}
                    />
                </div>
            </div>

            {/* Leaderboard rows — absolute positioning, reorder via CSS transition */}
            <div
                style={{
                    position: "absolute",
                    top: rowsTop,
                    left: rowsInset,
                    right: rowsInset,
                }}
            >
                {points.map((p, i) => {
                    const rank = sorted.findIndex((x) => x.name === p.name) + 1;
                    const y = (rank - 1) * rowGap;
                    const enterDelay = 0.3 + i * 0.1;
                    const enterT = clamp((time - enterDelay) / 0.4, 0, 1);

                    const justUp = p.you && time > 1.5;
                    const glow = justUp ? 0.3 + 0.3 * Math.sin(time * 3) : 0;

                    return (
                        <div
                            key={p.name}
                            style={{
                                position: "absolute",
                                top: y,
                                left: 0,
                                right: 0,
                                transition: "top 600ms cubic-bezier(0.4, 0, 0.2, 1)",
                                opacity: enterT,
                                transform: `translateX(${(1 - Easing.easeOutCubic(enterT)) * -30}px)`,
                                willChange: "top, transform, opacity",
                            }}
                        >
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: compact ? 14 : 16,
                                    padding: compact ? "10px 16px" : "14px 20px",
                                    background: p.you
                                        ? compact
                                            ? "linear-gradient(90deg, rgba(57,255,20,0.14), rgba(34,197,94,0.075) 58%, rgba(134,239,172,0.025))"
                                            : "rgba(59,130,246,0.14)"
                                        : "rgba(255,255,255,0.03)",
                                    border: `1px solid ${p.you
                                            ? compact
                                                ? BORDER
                                                : "rgba(125,211,252,0.5)"
                                            : BORDER
                                        }`,
                                    borderRadius: compact ? 12 : 14,
                                    boxShadow: p.you
                                        ? compact
                                            ? `0 0 ${18 + 16 * glow}px rgba(74,222,128,${0.16 + 0.2 * glow})`
                                            : `0 0 ${20 + 20 * glow}px rgba(96,165,250,${0.3 + 0.3 * glow})`
                                        : "none",
                                    position: "relative",
                                }}
                            >
                                <div
                                    style={{
                                        width: compact ? 34 : 40,
                                        textAlign: "center",
                                        fontFamily: FONT_MONO,
                                        fontSize: compact ? 22 : 26,
                                        fontWeight: 700,
                                        color:
                                            rank === 1
                                                ? "#fde047"
                                                : rank <= 3
                                                    ? BRAND_HIGHLIGHT
                                                    : TEXT_MUTED,
                                    }}
                                >
                                    {rank}
                                </div>
                                <Avatar
                                    initials={p.name.slice(0, 2).toUpperCase()}
                                    size={compact ? 42 : 50}
                                    hue={p.hue}
                                    ring={p.you}
                                    ringColor={compact && p.you ? "#86efac" : undefined}
                                />
                                <div
                                    style={{
                                        flex: 1,
                                        fontSize: compact ? 21 : 24,
                                        fontWeight: p.you ? 700 : 500,
                                        color: TEXT,
                                        fontFamily: FONT_SANS,
                                        whiteSpace: "nowrap",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                    }}
                                >
                                    {p.name}
                                </div>
                                <div
                                    style={{
                                        fontFamily: FONT_MONO,
                                        fontSize: compact ? 24 : 30,
                                        fontWeight: 700,
                                        color: TEXT,
                                        fontVariantNumeric: "tabular-nums",
                                        minWidth: compact ? 72 : 86,
                                        textAlign: "right",
                                    }}
                                >
                                    {p.pts}
                                </div>
                                {p.you && time > 2 && (
                                    <div
                                        style={{
                                            position: "absolute",
                                            right: compact ? -6 : -8,
                                            top: "50%",
                                            transform: "translateY(-50%)",
                                            fontFamily: FONT_MONO,
                                            fontSize: compact ? 15 : 17,
                                            fontWeight: 700,
                                            color: "#86efac",
                                            textShadow: "0 0 10px #86efac",
                                            opacity: 0.5 + 0.5 * Math.sin(time * 4),
                                        }}
                                    >
                                        ↑
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Flying +points bursts from "you" row */}
            {time > 1.5 &&
                [0, 1, 2].map((i) => {
                    const t0 = 1.5 + i * 0.9;
                    const localT = clamp((time - t0) / 0.9, 0, 1);
                    if (localT <= 0 || localT >= 1) return null;
                    const youRank = sorted.findIndex((x) => x.you) + 1;
                    const y =
                        rowsTop +
                        (youRank - 1) * rowGap +
                        (compact ? 18 : 24) -
                        localT * (compact ? 70 : 100);
                    return (
                        <PointsBurst
                            key={i}
                            x={compact ? 660 : 620}
                            y={y}
                            value={["+25", "+50", "W"][i]}
                            color="#86efac"
                            opacity={1 - localT}
                            scale={0.9 + 0.3 * localT}
                        />
                    );
                })}

            {/* Tagline (off by default) */}
            {showText && time > 4.5 && (
                <div
                    style={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        bottom: compact ? 24 : 50,
                        textAlign: "center",
                        opacity: clamp((time - 4.5) / 0.4, 0, 1),
                    }}
                >
                    <div
                        style={{
                            fontFamily: FONT_SANS,
                            fontSize: compact ? 26 : 30,
                            fontWeight: 700,
                            color: TEXT,
                            letterSpacing: "-0.025em",
                        }}
                    >
                        settle <span style={{ color: BRAND_HIGHLIGHT }}>the debate.</span>
                    </div>
                </div>
            )}
        </div>
    );
}
