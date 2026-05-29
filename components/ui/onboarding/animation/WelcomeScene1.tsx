"use client";

import { clamp, Easing, useTime } from "./engine";
import { APP_BG, BRAND_HIGHLIGHT, FONT_MONO, TEXT_MUTED } from "./primitives";

// Scene 1 V3 — Central lock surrounded by graffiti-style number stickers
// and scattered sparkle dots popping all over the canvas.
export function WelcomeScene1({ showText = false }: { showText?: boolean }) {
    const time = useTime();

    const centerX = 400;
    const centerY = 500;
    const RED = "#fca5a5";
    const STICKERS = [
        // col 1 (left edge)
        { x: 80, y: 140, val: "+100", color: "#86efac", rot: -8, size: 28, delay: 0.15 },
        { x: 110, y: 300, val: "+250", color: BRAND_HIGHLIGHT, rot: 6, size: 30, delay: 0.45 },
        { x: 70, y: 460, val: "-125", color: RED, rot: -12, size: 26, delay: 0.75 },
        { x: 130, y: 620, val: "+350", color: "#fde047", rot: 5, size: 30, delay: 1.05 },
        { x: 90, y: 760, val: "+175", color: "#86efac", rot: -4, size: 28, delay: 1.35 },
        // col 2 (inner left)
        { x: 220, y: 200, val: "+150", color: "#fde047", rot: 10, size: 26, delay: 0.3 },
        { x: 240, y: 380, val: "-200", color: RED, rot: -6, size: 28, delay: 0.6 },
        { x: 200, y: 540, val: "+300", color: "#fb923c", rot: 8, size: 32, delay: 0.9 },
        { x: 250, y: 700, val: "-175", color: RED, rot: -10, size: 28, delay: 1.2 },
        // col 3 (inner right)
        { x: 560, y: 180, val: "+425", color: "#fb923c", rot: 12, size: 30, delay: 0.2 },
        { x: 580, y: 350, val: "+125", color: "#86efac", rot: -7, size: 26, delay: 0.5 },
        { x: 550, y: 520, val: "+200", color: BRAND_HIGHLIGHT, rot: 5, size: 30, delay: 0.8 },
        { x: 590, y: 680, val: "-100", color: RED, rot: -9, size: 26, delay: 1.1 },
        // col 4 (right edge)
        { x: 700, y: 260, val: "+150", color: "#86efac", rot: 9, size: 28, delay: 0.35 },
        { x: 720, y: 420, val: "+500", color: BRAND_HIGHLIGHT, rot: -6, size: 32, delay: 0.65 },
        { x: 680, y: 590, val: "+100", color: "#fde047", rot: 7, size: 26, delay: 0.95 },
        { x: 710, y: 750, val: "-150", color: RED, rot: -5, size: 28, delay: 1.25 },
        // top center (above lock)
        { x: 330, y: 60, val: "+275", color: "#86efac", rot: 8, size: 28, delay: 1.5 },
        { x: 480, y: 70, val: "+100", color: BRAND_HIGHLIGHT, rot: -10, size: 26, delay: 1.65 },
        // bottom center (below lock)
        { x: 340, y: 820, val: "+225", color: "#86efac", rot: -7, size: 28, delay: 1.75 },
        { x: 470, y: 835, val: "+375", color: "#fb923c", rot: 9, size: 30, delay: 1.85 },
    ];

    const DOTS = [
        { x: 150, y: 230, c: "#86efac", d: 0.4 },
        { x: 290, y: 150, c: "#fde047", d: 0.55 },
        { x: 450, y: 250, c: "#fb923c", d: 0.7 },
        { x: 640, y: 140, c: BRAND_HIGHLIGHT, d: 0.85 },
        { x: 740, y: 340, c: "#86efac", d: 1.0 },
        { x: 640, y: 580, c: "#f0abfc", d: 1.15 },
        { x: 500, y: 780, c: "#fde047", d: 1.3 },
        { x: 280, y: 830, c: "#86efac", d: 1.45 },
        { x: 160, y: 700, c: BRAND_HIGHLIGHT, d: 1.6 },
        { x: 60, y: 520, c: "#fb923c", d: 0.9 },
        { x: 340, y: 350, c: "#f0abfc", d: 1.0 },
        { x: 620, y: 760, c: "#86efac", d: 1.4 },
        { x: 200, y: 90, c: BRAND_HIGHLIGHT, d: 1.7 },
        { x: 700, y: 870, c: "#fde047", d: 1.8 },
    ];

    return (
        <div style={{ position: "absolute", inset: 0, background: APP_BG, overflow: "hidden" }}>
            {/* Soft ambient vignette behind lock */}
            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    background: `radial-gradient(circle at ${centerX}px ${centerY}px, rgba(59,130,246,0.18), transparent 45%)`,
                    pointerEvents: "none",
                }}
            />

            {/* Central lock — appears immediately */}
            <div
                style={{
                    position: "absolute",
                    left: "50%",
                    top: "50%",
                    transform: `translate(-50%, -50%) scale(${0.9 + 0.1 * clamp(time / 0.4, 0, 1)})`,
                    opacity: clamp(time / 0.4, 0, 1),
                    lineHeight: 0,
                    zIndex: 10,
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

            {/* Graffiti / sticker scatter — enter, hold, drift-fade at tail */}
            {STICKERS.map((s, i) => {
                const localT = clamp((time - s.delay) / 0.35, 0, 1);
                if (localT <= 0) return null;
                const enter = Easing.easeOutBack(localT);
                const fadeOut = clamp((time - s.delay - 2.4) / 0.8, 0, 1);
                const opacity = enter * (1 - fadeOut);
                if (opacity <= 0) return null;
                return (
                    <div
                        key={i}
                        style={{
                            position: "absolute",
                            left: s.x,
                            top: s.y,
                            transform: `translate(-50%, -50%) rotate(${s.rot}deg) scale(${enter})`,
                            opacity,
                            fontFamily: FONT_MONO,
                            fontSize: s.size,
                            fontWeight: 800,
                            color: s.color,
                            letterSpacing: "0.02em",
                            textShadow: `0 0 12px ${s.color}66, 0 0 2px ${s.color}`,
                            whiteSpace: "nowrap",
                            lineHeight: 1,
                            pointerEvents: "none",
                            willChange: "transform, opacity",
                        }}
                    >
                        {s.val}
                    </div>
                );
            })}

            {/* Scattered sparkle dots */}
            {DOTS.map((d, i) => {
                const localT = clamp((time - d.d) / 1.4, 0, 1);
                if (localT <= 0 || localT >= 1) return null;
                const pulse = localT < 0.2 ? localT / 0.2 : 1 - (localT - 0.2) / 0.8;
                return (
                    <div
                        key={`d-${i}`}
                        style={{
                            position: "absolute",
                            left: d.x,
                            top: d.y,
                            width: 8,
                            height: 8,
                            borderRadius: 4,
                            background: d.c,
                            transform: `translate(-50%, -50%) scale(${0.6 + pulse * 0.8})`,
                            opacity: pulse * 0.85,
                            boxShadow: `0 0 12px ${d.c}`,
                            pointerEvents: "none",
                        }}
                    />
                );
            })}

            {/* Tagline (off by default) */}
            {showText && time > 1.0 && (
                <div
                    style={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        bottom: 80,
                        textAlign: "center",
                        opacity: clamp((time - 1.0) / 0.4, 0, 1),
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
