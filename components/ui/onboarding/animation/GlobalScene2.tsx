"use client";

import { Easing, clamp, useTime } from "./engine";
import { APP_BG, FONT_MONO, FONT_SANS, TEXT, TEXT_MUTED } from "./primitives";

// Tutorial 3 · Scene 2 — "How you get rewarded"
// The simplified XP guide cascades into a 2-column grid.

type GlobalXpBand = {
    oddsRange: string;
    typicalValue: string;
    hue: number;
};

const GLOBAL_XP_BANDS: GlobalXpBand[] = [
    { oddsRange: "−300 or shorter", typicalValue: "About 20", hue: 290 },
    { oddsRange: "−299 to +150", typicalValue: "About 25–35", hue: 255 },
    { oddsRange: "+151 to +500", typicalValue: "About 35–55", hue: 220 },
    { oddsRange: "+501 to +1000", typicalValue: "About 55–75", hue: 185 },
    { oddsRange: "+1001 to +2500", typicalValue: "About 75–120", hue: 145 },
    { oddsRange: "+2501 to +5000", typicalValue: "About 120–175", hue: 105 },
    { oddsRange: "+5001 to +10000", typicalValue: "About 175–250", hue: 65 },
    { oddsRange: "+10001 or longer", typicalValue: "250+", hue: 25 },
];

export function GlobalScene2({ showText = false }: { showText?: boolean }) {
    const time = useTime();
    const W = 800;
    const H = 1000;

    const CARD_W = 340;
    const CARD_H = 110;
    const COL_GAP = 24;
    const ROW_GAP = 16;
    const startX = (W - (CARD_W * 2 + COL_GAP)) / 2;
    const totalH = 4 * CARD_H + 3 * ROW_GAP;
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
                {GLOBAL_XP_BANDS.map((band, i) => {
                    const col = i % 2;
                    const row = Math.floor(i / 2);
                    const x = startX + col * (CARD_W + COL_GAP);
                    const y = startY + row * (CARD_H + ROW_GAP);

                    const enterT = clamp((time - i * 0.08) / 0.55, 0, 1);
                    const enterE = Easing.easeOutCubic(enterT);
                    if (enterT <= 0) return null;

                    return (
                        <GlobalXpBandCard
                            key={band.oddsRange}
                            x={x}
                            y={y}
                            w={CARD_W}
                            h={CARD_H}
                            band={band}
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
                            exact accepted odds · approximate guide
                        </div>
                    );
                })()}
        </div>
    );
}

type GlobalXpBandCardProps = {
    x: number;
    y: number;
    w: number;
    h: number;
    band: GlobalXpBand;
    enterE: number;
};

function GlobalXpBandCard({
    x,
    y,
    w,
    h,
    band,
    enterE,
}: GlobalXpBandCardProps) {
    const baseHue = band.hue;
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
                        {band.oddsRange}
                    </div>
                    <div
                        style={{
                            marginTop: 4,
                            fontSize: 13,
                            color: "rgba(255,255,255,0.55)",
                            letterSpacing: "-0.01em",
                        }}
                    >
                        submitted odds
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
                        Typical XP
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
                        {band.typicalValue}
                    </div>
                </div>
            </div>
        </div>
    );
}
