"use client";


import { clamp, Easing, useTime } from "./engine";
import { APP_BG, Avatar, BORDER, BRAND_HIGHLIGHT, FONT_MONO, FONT_SANS, PointsBurst, TEXT, TEXT_MUTED } from "./primitives";

// Scene 2 V2 — Leaderboard Race.
// Stable identities, points tick up live, rows reorder by rank,
// "you" row glows and rises. Flying +points bursts on "you".
export function WelcomeScene2({ showText = false }: { showText?: boolean }) {
    const time = useTime();

    type Person = {
        name: string;
        hue: number;
        basePts: number;
        growth: number;
        you?: boolean;
    };

    const people: Person[] = [
        { name: "stacks", hue: 280, basePts: 180, growth: 8 },
        { name: "you", hue: 220, basePts: 120, growth: 55, you: true },
        { name: "kt.bets", hue: 160, basePts: 155, growth: 12 },
        { name: "dv.kim", hue: 40, basePts: 140, growth: 10 },
        { name: "ml.park", hue: 340, basePts: 130, growth: 6 },
        { name: "ab.rush", hue: 200, basePts: 105, growth: 4 },
    ];

    const points = people.map((p) => ({
        ...p,
        pts: Math.floor(
            p.basePts +
            p.growth * Easing.easeOutCubic(clamp((time - 0.8) / 3, 0, 1)) * 3
        ),
    }));

    const sorted = [...points].sort((a, b) => b.pts - a.pts);

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
                    top: 80,
                    left: 100,
                    right: 100,
                    opacity: clamp(time / 0.4, 0, 1),
                    transform: `translateY(${(1 - clamp(time / 0.4, 0, 1)) * -10}px)`,
                }}
            >
                <div
                    style={{
                        fontSize: 11,
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
                        fontSize: 34,
                        fontWeight: 700,
                        color: TEXT,
                        marginTop: 6,
                        letterSpacing: "-0.03em",
                    }}
                >
                    week 14 · live
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
            <div style={{ position: "absolute", top: 200, left: 100, right: 100 }}>
                {points.map((p, i) => {
                    const rank = sorted.findIndex((x) => x.name === p.name) + 1;
                    const y = (rank - 1) * 72;
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
                                    gap: 14,
                                    padding: "14px 18px",
                                    background: p.you
                                        ? "rgba(59,130,246,0.14)"
                                        : "rgba(255,255,255,0.03)",
                                    border: `1px solid ${p.you ? "rgba(125,211,252,0.5)" : BORDER}`,
                                    borderRadius: 14,
                                    boxShadow: p.you
                                        ? `0 0 ${20 + 20 * glow}px rgba(96,165,250,${0.3 + 0.3 * glow})`
                                        : "none",
                                    position: "relative",
                                }}
                            >
                                <div
                                    style={{
                                        width: 32,
                                        textAlign: "center",
                                        fontFamily: FONT_MONO,
                                        fontSize: 18,
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
                                    size={38}
                                    hue={p.hue}
                                    ring={p.you}
                                />
                                <div
                                    style={{
                                        flex: 1,
                                        fontSize: 17,
                                        fontWeight: p.you ? 700 : 500,
                                        color: TEXT,
                                        fontFamily: FONT_SANS,
                                    }}
                                >
                                    {p.name}
                                    {p.you && (
                                        <span
                                            style={{
                                                marginLeft: 6,
                                                fontSize: 11,
                                                color: BRAND_HIGHLIGHT,
                                                fontFamily: FONT_MONO,
                                            }}
                                        >
                                            (you)
                                        </span>
                                    )}
                                </div>
                                <div
                                    style={{
                                        fontFamily: FONT_MONO,
                                        fontSize: 20,
                                        fontWeight: 700,
                                        color: TEXT,
                                        fontVariantNumeric: "tabular-nums",
                                        minWidth: 60,
                                        textAlign: "right",
                                    }}
                                >
                                    {p.pts}
                                </div>
                                {p.you && time > 2 && (
                                    <div
                                        style={{
                                            position: "absolute",
                                            right: -8,
                                            top: "50%",
                                            transform: "translateY(-50%)",
                                            fontFamily: FONT_MONO,
                                            fontSize: 14,
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
                    const y = 200 + (youRank - 1) * 72 + 20 - localT * 100;
                    return (
                        <PointsBurst
                            key={i}
                            x={620}
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
                        bottom: 90,
                        textAlign: "center",
                        opacity: clamp((time - 4.5) / 0.4, 0, 1),
                    }}
                >
                    <div
                        style={{
                            fontFamily: FONT_SANS,
                            fontSize: 30,
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
