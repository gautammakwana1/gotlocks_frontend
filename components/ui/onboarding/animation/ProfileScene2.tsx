"use client";

import { Easing, clamp, useTime } from "./engine";
import { APP_BG, FONT_MONO, FONT_SANS, TEXT, TEXT_MUTED } from "./primitives";

// Tutorial 3 · Scene 2 — "How you get rewarded"
// 14 tier cards cascade into a 2-column grid sized to fit the stage.

type Tier = { n: number; range: string; pts: number; hue: number };

const TIERS: Tier[] = [
    { n: 1, range: "−300 or less", pts: 5, hue: 290 },
    { n: 2, range: "−299 to −150", pts: 15, hue: 270 },
    { n: 3, range: "−149 to +150", pts: 25, hue: 245 },
    { n: 4, range: "+151 to +450", pts: 35, hue: 225 },
    { n: 5, range: "+451 to +850", pts: 45, hue: 200 },
    { n: 6, range: "+851 to +1350", pts: 60, hue: 180 },
    { n: 7, range: "+1351 to +1950", pts: 75, hue: 160 },
    { n: 8, range: "+1951 to +3000", pts: 90, hue: 140 },
    { n: 9, range: "+3001 to +5000", pts: 120, hue: 120 },
    { n: 10, range: "+5001 to +8000", pts: 150, hue: 100 },
    { n: 11, range: "+8001 to +11000", pts: 180, hue: 80 },
    { n: 12, range: "+11001 to +15000", pts: 210, hue: 60 },
    { n: 13, range: "+15001 to +25000", pts: 240, hue: 40 },
    { n: 14, range: "+25001 or greater", pts: 300, hue: 22 },
];

export function ProfileScene2({ showText = false }: { showText?: boolean }) {
    const time = useTime();
    const W = 800;
    const H = 1000;

    const CARD_W = 340;
    const CARD_H = 110;
    const COL_GAP = 24;
    const ROW_GAP = 16;
    const startX = (W - (CARD_W * 2 + COL_GAP)) / 2;
    const totalH = 7 * CARD_H + 6 * ROW_GAP;
    const startY = (H - totalH) / 2;

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
            <div style={{ position: "absolute", inset: 0 }}>
                {TIERS.map((tier, i) => {
                    const col = i % 2;
                    const row = Math.floor(i / 2);
                    const x = startX + col * (CARD_W + COL_GAP);
                    const y = startY + row * (CARD_H + ROW_GAP);

                    const enterT = clamp((time - i * 0.08) / 0.55, 0, 1);
                    const enterE = Easing.easeOutCubic(enterT);
                    if (enterT <= 0) return null;

                    return (
                        <TierCard
                            key={tier.n}
                            x={x}
                            y={y}
                            w={CARD_W}
                            h={CARD_H}
                            tier={tier}
                            enterE={enterE}
                        />
                    );
                })}
            </div>

            {showText &&
                (() => {
                    const t = clamp((time - 2.4) / 0.4, 0, 1);
                    const out = clamp((time - 8.0) / 0.4, 0, 1);
                    const op = t * (1 - out);
                    if (op <= 0) return null;
                    return (
                        <div
                            style={{
                                position: "absolute",
                                left: 0,
                                right: 0,
                                bottom: 24,
                                textAlign: "center",
                                opacity: op,
                                fontFamily: FONT_MONO,
                                fontSize: 11,
                                letterSpacing: "0.24em",
                                textTransform: "uppercase",
                                color: TEXT_MUTED,
                                zIndex: 25,
                            }}
                        >
                            bolder odds · bigger reward
                        </div>
                    );
                })()}
        </div>
    );
}

type TierCardProps = {
    x: number;
    y: number;
    w: number;
    h: number;
    tier: Tier;
    enterE: number;
};

function TierCard({ x, y, w, h, tier, enterE }: TierCardProps) {
    const baseHue = tier.hue;
    const bg = `radial-gradient(circle at 0% 0%, oklch(38% 0.13 ${baseHue} / 0.85), oklch(20% 0.06 ${baseHue} / 0.55) 55%, #0a0a0a 100%)`;

    const scale = enterE;
    const opacity = enterE;

    return (
        <div
            style={{
                position: "absolute",
                left: x,
                top: y,
                width: w,
                height: h,
                borderRadius: 18,
                background: bg,
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                padding: "16px 20px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                transform: `scale(${scale})`,
                transformOrigin: "center",
                opacity,
                overflow: "hidden",
            }}
        >
            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    background:
                        "linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.06) 50%, transparent 70%)",
                    transform: `translateX(${(1 - enterE) * -120}%)`,
                    pointerEvents: "none",
                }}
            />

            <div
                style={{
                    position: "relative",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                }}
            >
                <div>
                    <div
                        style={{
                            fontSize: 22,
                            fontWeight: 800,
                            color: TEXT,
                            letterSpacing: "-0.01em",
                        }}
                    >
                        Tier {tier.n}
                    </div>
                    <div
                        style={{
                            marginTop: 4,
                            fontSize: 13,
                            color: "rgba(255,255,255,0.55)",
                            letterSpacing: "-0.01em",
                        }}
                    >
                        {tier.range}
                    </div>
                </div>
                <div style={{ textAlign: "right" }}>
                    <div
                        style={{
                            fontSize: 11,
                            color: "rgba(255,255,255,0.55)",
                            letterSpacing: "0.04em",
                        }}
                    >
                        Win
                    </div>
                    <div
                        style={{
                            fontSize: 18,
                            fontWeight: 800,
                            color: "#86efac",
                            fontVariantNumeric: "tabular-nums",
                            letterSpacing: "-0.01em",
                        }}
                    >
                        +{tier.pts}
                    </div>
                </div>
            </div>
        </div>
    );
}
