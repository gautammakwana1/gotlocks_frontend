"use client";

import { clamp, Easing, useTime } from "./engine";
import { AMBER, AMBER_GLOW, AMBER_SOFT, APP_BG, Avatar, FONT_MONO, FONT_SANS, TEXT, TEXT_MUTED } from "./primitives";

// Scene 3 V2 — Follow Graph.
// Central "YOU" avatar, 6 surrounding nodes. Dashed lines sprout outward
// with traveling dots. Each surrounding node gets a "follow" or "following"
// label pill in amber (only those two labels — no tailed/fire/etc).
export function WelcomeScene3({ showText = false }: { showText?: boolean }) {
    const time = useTime();

    const cx = 400;
    const cy = 500;

    type Node = {
        initials: string;
        hue: number;
        x: number;
        y: number;
        delay: number;
        label: "follow" | "following";
    };

    const nodes: Node[] = [
        { initials: "ST", hue: 280, x: cx - 240, y: cy - 180, delay: 0.8, label: "follow" },
        { initials: "KT", hue: 160, x: cx + 240, y: cy - 180, delay: 1.1, label: "following" },
        { initials: "DV", hue: 40, x: cx - 280, y: cy + 20, delay: 1.4, label: "follow" },
        { initials: "ML", hue: 340, x: cx + 280, y: cy + 20, delay: 1.7, label: "following" },
        { initials: "AB", hue: 200, x: cx - 200, y: cy + 200, delay: 2.0, label: "follow" },
        { initials: "RC", hue: 320, x: cx + 200, y: cy + 200, delay: 2.3, label: "following" },
    ];

    return (
        <div style={{ position: "absolute", inset: 0, background: APP_BG, overflow: "hidden" }}>
            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    background: `radial-gradient(circle at ${cx}px ${cy}px, rgba(251,146,60,0.14), transparent 55%)`,
                }}
            />

            {/* Connection lines with traveling pulses */}
            <svg
                style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    pointerEvents: "none",
                }}
                viewBox="0 0 800 1000"
                preserveAspectRatio="none"
            >
                {nodes.map((n, i) => {
                    const lineT = clamp((time - n.delay - 0.2) / 0.5, 0, 1);
                    const eased = Easing.easeOutCubic(lineT);
                    const pulse = (time * 1.5 + i * 0.5) % 1;
                    return (
                        <g key={i}>
                            <line
                                x1={cx}
                                y1={cy}
                                x2={n.x}
                                y2={n.y}
                                stroke={AMBER}
                                strokeWidth={1.5}
                                strokeDasharray="4 4"
                                opacity={eased * 0.5}
                            />
                            {lineT >= 1 && (
                                <circle
                                    cx={cx + (n.x - cx) * pulse}
                                    cy={cy + (n.y - cy) * pulse}
                                    r={4}
                                    fill={AMBER}
                                    opacity={1 - pulse * 0.3}
                                />
                            )}
                        </g>
                    );
                })}
            </svg>

            {/* Central YOU avatar */}
            <div
                style={{
                    position: "absolute",
                    left: cx,
                    top: cy,
                    transform: `translate(-50%, -50%) scale(${0.9 + 0.1 * clamp(time / 0.5, 0, 1)})`,
                    opacity: clamp(time / 0.4, 0, 1),
                }}
            >
                <div
                    style={{
                        width: 120,
                        height: 120,
                        borderRadius: 60,
                        background: `linear-gradient(135deg, oklch(62% 0.14 220), oklch(38% 0.08 250))`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontFamily: FONT_SANS,
                        fontWeight: 700,
                        fontSize: 44,
                        color: "#fff",
                        boxShadow: `0 0 ${40 + 20 * Math.sin(time * 3)}px ${AMBER_GLOW}, 0 0 0 4px ${APP_BG}, 0 0 0 6px ${AMBER}`,
                        position: "relative",
                    }}
                >
                    YOU
                </div>
                <div
                    style={{
                        position: "absolute",
                        left: "50%",
                        top: 130,
                        transform: "translateX(-50%)",
                        fontFamily: FONT_MONO,
                        fontSize: 10,
                        color: AMBER,
                        letterSpacing: "0.2em",
                        textTransform: "uppercase",
                        whiteSpace: "nowrap",
                    }}
                >
                    lvl {Math.floor(4 + clamp(time / 4, 0, 1) * 8)} ·{" "}
                    {Math.floor(clamp(time / 4, 0, 1) * 1240)} xp
                </div>
            </div>

            {/* Surrounding nodes with follow/following labels only */}
            {nodes.map((n, i) => {
                const enterT = clamp((time - n.delay) / 0.4, 0, 1);
                const enter = Easing.easeOutBack(enterT);
                return (
                    <div
                        key={i}
                        style={{
                            position: "absolute",
                            left: n.x,
                            top: n.y,
                            transform: `translate(-50%, -50%) scale(${enter})`,
                            opacity: enter,
                        }}
                    >
                        <Avatar initials={n.initials} size={70} hue={n.hue} />
                        {time > n.delay + 0.5 && (
                            <div
                                style={{
                                    position: "absolute",
                                    left: "50%",
                                    top: 78,
                                    transform: "translateX(-50%)",
                                    padding: "3px 9px",
                                    borderRadius: 10,
                                    background: AMBER_SOFT,
                                    border: `1px solid ${AMBER}`,
                                    fontFamily: FONT_MONO,
                                    fontSize: 10,
                                    fontWeight: 700,
                                    color: AMBER,
                                    whiteSpace: "nowrap",
                                    opacity: clamp((time - n.delay - 0.5) / 0.3, 0, 1),
                                }}
                            >
                                {n.label}
                            </div>
                        )}
                    </div>
                );
            })}

            {/* Header */}
            <div
                style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    top: 80,
                    textAlign: "center",
                    opacity: clamp(time / 0.4, 0, 1),
                }}
            >
                <div
                    style={{
                        fontSize: 11,
                        fontFamily: FONT_MONO,
                        color: AMBER,
                        letterSpacing: "0.2em",
                        textTransform: "uppercase",
                    }}
                >
                    global feed
                </div>
                <div
                    style={{
                        fontFamily: FONT_SANS,
                        fontSize: 30,
                        fontWeight: 700,
                        color: TEXT,
                        marginTop: 6,
                        letterSpacing: "-0.025em",
                    }}
                >
                    follow who&apos;s <span style={{ color: AMBER }}>actually hitting</span>
                </div>
            </div>

            {/* Tagline (off by default) */}
            {showText && time > 4 && (
                <div
                    style={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        bottom: 70,
                        textAlign: "center",
                        opacity: clamp((time - 4) / 0.4, 0, 1),
                    }}
                >
                    <div
                        style={{
                            fontFamily: FONT_MONO,
                            fontSize: 11,
                            color: TEXT_MUTED,
                            letterSpacing: "0.18em",
                            textTransform: "uppercase",
                        }}
                    >
                        react · tail · follow
                    </div>
                </div>
            )}
        </div>
    );
}
