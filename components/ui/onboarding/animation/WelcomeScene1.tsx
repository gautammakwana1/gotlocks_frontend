"use client";

import { clamp, Easing, useTime } from "./engine";
import { APP_BG, Avatar, BRAND_HIGHLIGHT, FONT_MONO, PointsBurst, TEXT_MUTED } from "./primitives";

// Scene 1 V3 — Crowd Converge.
// Ring of 12 avatars converges inward, lock icon materializes in the center,
// points bursts radiate outward.
export function WelcomeScene1({ showText = false }: { showText?: boolean }) {
    const time = useTime();

    const count = 12;
    const initialsList = ["SR", "JM", "KT", "ML", "DV", "AB", "RC", "TN", "EW", "PQ", "LH", "OZ"];
    const avatars = Array.from({ length: count }).map((_, i) => ({
        initials: initialsList[i],
        hue: 200 + ((i * 30) % 200),
        delay: 0.1 + (i % 6) * 0.1,
    }));

    const centerX = 400;
    const centerY = 500;
    const ringR = 340;

    return (
        <div style={{ position: "absolute", inset: 0, background: APP_BG, overflow: "hidden" }}>
            {/* Radial glow pulse */}
            <div
                style={{
                    position: "absolute",
                    left: centerX,
                    top: centerY,
                    width: 2,
                    height: 2,
                    boxShadow: `0 0 ${80 + 40 * Math.sin(time * 3)}px ${40 + 20 * Math.sin(time * 3)}px rgba(59,130,246,0.18)`,
                    borderRadius: "50%",
                }}
            />

            {/* Concentric rings */}
            {[1, 2, 3].map((r) => (
                <div
                    key={r}
                    style={{
                        position: "absolute",
                        left: centerX - 160 * r,
                        top: centerY - 160 * r,
                        width: 320 * r,
                        height: 320 * r,
                        border: `1px solid rgba(96,165,250,${0.1 / r})`,
                        borderRadius: "50%",
                        opacity: Math.max(0, 1 - r * 0.3),
                    }}
                />
            ))}

            {/* Avatars — orbit + converge */}
            {avatars.map((a, i) => {
                const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
                const enterT = clamp((time - a.delay) / 0.5, 0, 1);
                const enter = Easing.easeOutBack(enterT);

                const convergeT = clamp((time - 2.5) / 1.2, 0, 1);
                const c = Easing.easeInOutCubic(convergeT);
                const r = ringR * (1 - c * 0.85);

                const x = centerX + Math.cos(angle) * r;
                const y = centerY + Math.sin(angle) * r;

                const opacity = time > 3.8 ? clamp(1 - (time - 3.8) / 0.4, 0, 1) : enter;
                const scale = enter * (1 - c * 0.3);

                return (
                    <div
                        key={i}
                        style={{
                            position: "absolute",
                            left: x,
                            top: y,
                            transform: `translate(-50%, -50%) scale(${scale})`,
                            opacity,
                            willChange: "transform, opacity",
                        }}
                    >
                        <Avatar initials={a.initials} size={60} hue={a.hue} />
                    </div>
                );
            })}

            {/* Central lock — viewBox padded so art is visually centered */}
            {time > 3.5 && (
                <div
                    style={{
                        position: "absolute",
                        left: "50%",
                        top: "50%",
                        transform: `translate(-50%, -50%) scale(${0.9 + 0.1 * clamp((time - 3.5) / 0.4, 0, 1)})`,
                        opacity: clamp((time - 3.5) / 0.4, 0, 1),
                        lineHeight: 0,
                    }}
                >
                    <svg
                        viewBox="0 0 64 64"
                        width="180"
                        height="180"
                        fill="none"
                        style={{
                            filter: "drop-shadow(0 0 32px rgba(96,165,250,0.6))",
                            display: "block",
                        }}
                    >
                        <g transform="translate(0, -5)">
                            <rect x="12" y="28" width="40" height="30" rx="4" fill={BRAND_HIGHLIGHT} />
                            <path
                                d="M20 28 V20 a12 12 0 0 1 24 0 V28"
                                stroke={BRAND_HIGHLIGHT}
                                strokeWidth="5"
                                strokeLinecap="round"
                            />
                            <circle cx="32" cy="41" r="3.5" fill="#030303" />
                            <rect x="30.5" y="41" width="3" height="8" rx="1.5" fill="#030303" />
                        </g>
                    </svg>
                </div>
            )}

            {/* Points bursts radiating (compensated -14px for lock's 5-unit visual lift) */}
            {time > 3.8 &&
                [0, 1, 2, 3, 4, 5].map((i) => {
                    const localT = clamp((time - 3.8 - i * 0.05) / 1.2, 0, 1);
                    const angle = (i / 6) * Math.PI * 2 + time * 0.5;
                    const dist = 60 + 240 * Easing.easeOutCubic(localT);
                    const opacity = 1 - localT;
                    return (
                        <PointsBurst
                            key={i}
                            x={centerX + Math.cos(angle) * dist}
                            y={centerY + Math.sin(angle) * dist - 14}
                            value={["+50", "+25", "+100", "W", "+75", "W"][i]}
                            color={i % 2 === 0 ? "#86efac" : BRAND_HIGHLIGHT}
                            opacity={opacity}
                            scale={0.8 + 0.4 * localT}
                        />
                    );
                })}

            {/* Tagline (off by default) */}
            {showText && time > 4.2 && (
                <div
                    style={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        bottom: 80,
                        textAlign: "center",
                        opacity: clamp((time - 4.2) / 0.4, 0, 1),
                    }}
                >
                    <div
                        style={{
                            fontFamily: FONT_MONO,
                            fontSize: 11,
                            color: TEXT_MUTED,
                            letterSpacing: "0.2em",
                            textTransform: "uppercase",
                        }}
                    >
                        your crew · your picks · your record
                    </div>
                </div>
            )}
        </div>
    );
}
