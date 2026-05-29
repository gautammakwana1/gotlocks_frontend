"use client";

import { clamp, Easing, useTime } from "./engine";
import { AMBER, AMBER_GLOW, AMBER_SOFT, APP_BG, Avatar, FONT_MONO, FONT_SANS } from "./primitives";

// Scene 3 V2 — Follow Graph.
// Central "YOU" avatar; 16 nodes evenly distributed on a ring (radius 320),
// appearing in a shuffled order with mixed follow/following labels in amber.
export function WelcomeScene3(_props: { showText?: boolean } = {}) {
    const time = useTime();

    const cx = 400;
    const cy = 500;

    const count = 16;
    const radius = 320;
    const followPattern = [
        true, false, true, false, false, true, false, true,
        true, false, true, false, false, true, false, true,
    ];
    const hues = [280, 160, 40, 340, 200, 320, 100, 240, 20, 180, 300, 60, 140, 260, 360, 80];
    const initialsList = ["ST", "KT", "DV", "ML", "AB", "RC", "JN", "EW", "PZ", "LH", "OZ", "TN", "BR", "KV", "HY", "MG"];
    // Shuffled delay order — avatars appear non-sequentially around the ring
    const delayOrder = [7, 2, 13, 0, 11, 5, 15, 3, 9, 1, 14, 6, 10, 4, 12, 8];

    type Node = {
        initials: string;
        hue: number;
        x: number;
        y: number;
        delay: number;
        label: "follow" | "following";
    };

    const nodes: Node[] = Array.from({ length: count }).map((_, i) => {
        // offset start angle slightly so no avatar sits exactly above/below center
        const angle = (i / count) * Math.PI * 2 - Math.PI / 2 + Math.PI / count;
        const orderIndex = delayOrder.indexOf(i);
        return {
            initials: initialsList[i],
            hue: hues[i],
            x: cx + Math.cos(angle) * radius,
            y: cy + Math.sin(angle) * radius,
            delay: 0.4 + orderIndex * 0.15,
            label: followPattern[i] ? "follow" : "following",
        };
    });

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
                        <Avatar initials={n.initials} size={54} hue={n.hue} />
                        {time > n.delay + 0.5 && (
                            <div
                                style={{
                                    position: "absolute",
                                    left: "50%",
                                    top: 60,
                                    transform: "translateX(-50%)",
                                    padding: "2px 7px",
                                    borderRadius: 8,
                                    background: AMBER_SOFT,
                                    border: `1px solid ${AMBER}`,
                                    fontFamily: FONT_MONO,
                                    fontSize: 9,
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
        </div>
    );
}
