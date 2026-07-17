"use client";

import { Easing, clamp, useTime } from "./engine";
import {
    APP_BG,
    BRAND,
    BRAND_HIGHLIGHT,
    BRAND_STRONG,
    BRAND_TEXT,
    FONT_MONO,
    FONT_SANS,
    TEXT,
    TEXT_MUTED,
} from "./primitives";

// Tutorial 3 · Scene 1 — "Your public profile"
// Profile composition: avatar + level ring at top, username + level chip,
// then a horizontal strip of stat tiles that pop in and tick up.

type Stat = {
    id: string;
    end: number;
    sub: string;
    accent: string;
    startT: number;
    tickStart: number;
    tickDur: number;
};

const STATS: Stat[] = [
    { id: "globalXp", end: 7500, sub: "xp", accent: "#fcd34d", startT: 1.4, tickStart: 2.0, tickDur: 2.0 },
    { id: "wins", end: 184, sub: "wins", accent: "#86efac", startT: 1.55, tickStart: 2.15, tickDur: 1.85 },
    { id: "losses", end: 71, sub: "losses", accent: "#fca5a5", startT: 1.7, tickStart: 2.3, tickDur: 1.7 },
    { id: "followers", end: 550, sub: "followers", accent: "#bef0ff", startT: 1.85, tickStart: 2.45, tickDur: 1.55 },
    { id: "following", end: 451, sub: "following", accent: "#bef0ff", startT: 2.0, tickStart: 2.6, tickDur: 1.4 },
];

export function GlobalScene1({ showText = false }: { showText?: boolean }) {
    const time = useTime();
    const W = 800;
    const H = 1000;
    const cx = W / 2;
    const avatarCy = 320;

    const coreT = Easing.easeOutCubic(clamp(time / 0.7, 0, 1));
    const ringT = Easing.easeInOutCubic(clamp((time - 0.7) / 0.9, 0, 1)) * 0.78;
    const usernameT = clamp((time - 0.9) / 0.5, 0, 1);

    return (
        <div
            style={{
                position: "absolute",
                inset: 0,
                background: APP_BG,
                overflow: "hidden",
                fontFamily: FONT_SANS,
            }}
        >
            <svg
                width={W}
                height={H}
                style={{ position: "absolute", inset: 0, opacity: 0.05 }}
            >
                <defs>
                    <pattern id="t3s1grid" width="80" height="80" patternUnits="userSpaceOnUse">
                        <path d="M 80 0 L 0 0 0 80" fill="none" stroke="#fff" strokeWidth="0.5" />
                    </pattern>
                </defs>
                <rect width={W} height={H} fill="url(#t3s1grid)" />
            </svg>

            {coreT > 0 &&
                (() => {
                    const ringR = 110;
                    const C = 2 * Math.PI * ringR;
                    const off = C * (1 - ringT);
                    return (
                        <svg
                            width={W}
                            height={H}
                            style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
                        >
                            <circle
                                cx={cx}
                                cy={avatarCy}
                                r={ringR}
                                fill="none"
                                stroke="rgba(255,255,255,0.07)"
                                strokeWidth="6"
                            />
                            <circle
                                cx={cx}
                                cy={avatarCy}
                                r={ringR}
                                fill="none"
                                stroke={BRAND}
                                strokeWidth="6"
                                strokeLinecap="round"
                                strokeDasharray={C}
                                strokeDashoffset={off}
                                transform={`rotate(-90 ${cx} ${avatarCy})`}
                                style={{ filter: `drop-shadow(0 0 8px ${BRAND})` }}
                            />
                        </svg>
                    );
                })()}

            {coreT > 0 && (
                <>
                    <div
                        style={{
                            position: "absolute",
                            left: cx,
                            top: avatarCy,
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            transform: "translate(-50%,-50%)",
                            boxShadow: `0 0 ${50 + 14 * Math.sin(time * 1.6)}px ${22 + 8 * Math.sin(time * 1.6)}px rgba(96,165,250,0.18)`,
                        }}
                    />
                    <div
                        style={{
                            position: "absolute",
                            left: cx,
                            top: avatarCy,
                            width: 170,
                            height: 170,
                            borderRadius: "50%",
                            transform: `translate(-50%,-50%) scale(${Easing.easeOutBack(coreT)})`,
                            background: `radial-gradient(circle at 35% 30%, ${BRAND_HIGHLIGHT}, ${BRAND_STRONG} 65%, #1d4ed8 100%)`,
                            border: `3px solid ${APP_BG}`,
                            boxShadow: "0 0 40px rgba(96,165,250,0.55)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <svg width="78" height="78" viewBox="0 0 78 78" fill="none">
                            <circle
                                cx="39"
                                cy="29"
                                r="11"
                                stroke="#fff"
                                strokeWidth="3.4"
                                fill="none"
                            />
                            <path
                                d="M 14 64 C 14 53, 25 49, 39 49 C 53 49, 64 53, 64 64"
                                stroke="#fff"
                                strokeWidth="3.4"
                                fill="none"
                                strokeLinecap="round"
                            />
                        </svg>
                    </div>
                </>
            )}

            {usernameT > 0 && (
                <div
                    style={{
                        position: "absolute",
                        left: cx,
                        top: avatarCy + 156,
                        transform: "translate(-50%, 0)",
                        opacity: usernameT,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 10,
                    }}
                >
                    <div
                        style={{
                            fontSize: 32,
                            fontWeight: 700,
                            letterSpacing: "-0.02em",
                            color: TEXT,
                            whiteSpace: "nowrap",
                        }}
                    >
                        dragonlocks
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div
                            style={{
                                padding: "5px 14px",
                                borderRadius: 999,
                                background: "rgba(96,165,250,0.14)",
                                border: "1px solid rgba(125,211,252,0.45)",
                                fontSize: 13,
                                fontWeight: 700,
                                letterSpacing: "0.04em",
                                color: BRAND_TEXT,
                            }}
                        >
                            Lvl 13
                        </div>
                        <div
                            style={{
                                fontFamily: FONT_MONO,
                                fontSize: 11,
                                color: TEXT_MUTED,
                                letterSpacing: "0.18em",
                                textTransform: "uppercase",
                            }}
                        >
                            340 xp to next
                        </div>
                    </div>
                </div>
            )}

            <div
                style={{
                    position: "absolute",
                    top: avatarCy + 280,
                    left: 40,
                    right: 40,
                    display: "grid",
                    gridTemplateColumns: "repeat(5, 1fr)",
                    gap: 14,
                }}
            >
                {STATS.map((s, i) => {
                    const enterT = clamp((time - s.startT) / 0.5, 0, 1);
                    if (enterT <= 0) return null;
                    const enterE = Easing.easeOutBack(enterT);

                    const tickT = clamp((time - s.tickStart) / s.tickDur, 0, 1);
                    const tickE = Easing.easeOutCubic(tickT);
                    const value = Math.round(s.end * tickE);
                    const formatted = value.toLocaleString();

                    const tickPulse = tickT > 0 && tickT < 1 ? Math.sin(tickT * Math.PI) * 0.6 : 0;
                    const finishedAt = s.tickStart + s.tickDur;
                    const HOLD = 0.4;
                    const FADE_STEP = 0.2;
                    const FADE_DUR = 0.55;
                    const cascadeStart = finishedAt + HOLD + i * FADE_STEP;
                    let holdFade = 0;
                    if (tickT >= 1) {
                        const dt = time - cascadeStart;
                        if (dt < 0) holdFade = 1;
                        else if (dt < FADE_DUR) holdFade = 1 - dt / FADE_DUR;
                        else holdFade = 0;
                    }
                    const pulse = Math.max(tickPulse, holdFade);

                    return (
                        <div
                            key={s.id}
                            style={{
                                padding: "18px 14px",
                                borderRadius: 16,
                                background:
                                    pulse > 0
                                        ? "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))"
                                        : "rgba(255,255,255,0.04)",
                                border: `1px solid ${pulse > 0 ? s.accent : "rgba(255,255,255,0.10)"}`,
                                boxShadow:
                                    pulse > 0
                                        ? `0 0 ${20 + pulse * 28}px ${s.accent}55`
                                        : "0 8px 24px rgba(0,0,0,0.3)",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                transform: `translateY(${(1 - enterE) * 28}px) scale(${enterE * (1 + pulse * 0.04)})`,
                                opacity: enterT,
                                backdropFilter: "blur(6px)",
                            }}
                        >
                            <div
                                style={{
                                    fontSize: 26,
                                    fontWeight: 800,
                                    color: TEXT,
                                    fontFamily: FONT_SANS,
                                    fontVariantNumeric: "tabular-nums",
                                    letterSpacing: "-0.01em",
                                    textShadow: pulse > 0 ? `0 0 12px ${s.accent}` : "none",
                                }}
                            >
                                {formatted}
                            </div>
                            <div
                                style={{
                                    fontFamily: FONT_MONO,
                                    fontSize: 9,
                                    color: TEXT_MUTED,
                                    letterSpacing: "0.18em",
                                    textTransform: "uppercase",
                                    marginTop: 6,
                                    textAlign: "center",
                                    whiteSpace: "nowrap",
                                }}
                            >
                                {s.sub}
                            </div>
                        </div>
                    );
                })}
            </div>

            {showText &&
                (() => {
                    const t = clamp((time - 5.0) / 0.4, 0, 1);
                    const out = clamp((time - 6.6) / 0.4, 0, 1);
                    const op = t * (1 - out);
                    if (op <= 0) return null;
                    return (
                        <div
                            style={{
                                position: "absolute",
                                left: 0,
                                right: 0,
                                bottom: 50,
                                textAlign: "center",
                                opacity: op,
                                fontFamily: FONT_MONO,
                                fontSize: 12,
                                letterSpacing: "0.24em",
                                textTransform: "uppercase",
                                color: TEXT_MUTED,
                            }}
                        >
                            every pick · every stat · public
                        </div>
                    );
                })()}
        </div>
    );
}
