"use client";

import { Easing, clamp, useTime } from "./engine";
import {
    APP_BG,
    BRAND,
    BRAND_HIGHLIGHT,
    BRAND_STRONG,
    FONT_MONO,
    FONT_SANS,
    TEXT_MUTED,
} from "./primitives";

// Tutorial 2 · Scene 1 — "Two roles in every group"
// Center group node, single commissioner emerges left, members cluster right,
// connecting lines draw outward, pulse traffic loops.

const memberOffsets = [
    { dx: -50, dy: -22 },
    { dx: 2, dy: -60 },
    { dx: 55, dy: -22 },
    { dx: -30, dy: 38 },
    { dx: 35, dy: 38 },
];

export function LeagueScene1({ showText = false }: { showText?: boolean }) {
    const time = useTime();
    const W = 800;
    const H = 1000;

    const groupCenter = { x: W / 2, y: H / 2 - 30 };
    const commNode = { x: W / 2 - 260, y: H / 2 - 30 };
    const membersAnchor = { x: W / 2 + 260, y: H / 2 - 30 };

    const groupT = Easing.easeOutCubic(clamp(time / 0.7, 0, 1));

    const commT = clamp((time - 0.9) / 0.7, 0, 1);
    const commE = Easing.easeOutBack(commT);

    const membersStart = 0.9;
    const lineT = Easing.easeOutCubic(clamp((time - 1.8) / 0.7, 0, 1));

    const pulseStart = 2.6;
    const pulseLoop = 1.4;
    const pulseLocal = (time - pulseStart) % pulseLoop;
    const pulseActive = time > pulseStart && pulseLocal >= 0 && pulseLocal <= 0.9;
    const pulseT = pulseLocal / 0.9;

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
                    <pattern id="t2s1grid" width="80" height="80" patternUnits="userSpaceOnUse">
                        <path d="M 80 0 L 0 0 0 80" fill="none" stroke="#fff" strokeWidth="0.5" />
                    </pattern>
                </defs>
                <rect width={W} height={H} fill="url(#t2s1grid)" />
            </svg>

            {lineT > 0 && (
                <svg
                    width={W}
                    height={H}
                    style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
                >
                    <line
                        x1={groupCenter.x - 97}
                        y1={groupCenter.y}
                        x2={groupCenter.x - 97 + (commNode.x + 66 - (groupCenter.x - 97)) * lineT}
                        y2={groupCenter.y}
                        stroke={BRAND}
                        strokeWidth="1.5"
                        strokeOpacity="0.5"
                        strokeLinecap="round"
                    />
                    <line
                        x1={groupCenter.x + 97}
                        y1={groupCenter.y}
                        x2={groupCenter.x + 97 + (membersAnchor.x - 92 - (groupCenter.x + 97)) * lineT}
                        y2={groupCenter.y}
                        stroke={BRAND}
                        strokeWidth="1.5"
                        strokeOpacity="0.5"
                        strokeLinecap="round"
                    />

                    {pulseActive && (() => {
                        const ax1 = groupCenter.x - 97;
                        const ax2 = commNode.x + 66;
                        const x = ax1 + (ax2 - ax1) * pulseT;
                        const fade =
                            pulseT < 0.15 ? pulseT / 0.15 : pulseT > 0.85 ? (1 - pulseT) / 0.15 : 1;
                        return (
                            <circle
                                cx={x}
                                cy={groupCenter.y}
                                r={4}
                                fill={BRAND_HIGHLIGHT}
                                opacity={fade}
                                style={{ filter: `drop-shadow(0 0 6px ${BRAND})` }}
                            />
                        );
                    })()}
                    {pulseActive && (() => {
                        const bx1 = groupCenter.x + 97;
                        const bx2 = membersAnchor.x - 92;
                        const x = bx1 + (bx2 - bx1) * pulseT;
                        const fade =
                            pulseT < 0.15 ? pulseT / 0.15 : pulseT > 0.85 ? (1 - pulseT) / 0.15 : 1;
                        return (
                            <circle
                                cx={x}
                                cy={groupCenter.y}
                                r={4}
                                fill={BRAND_HIGHLIGHT}
                                opacity={fade}
                                style={{ filter: `drop-shadow(0 0 6px ${BRAND})` }}
                            />
                        );
                    })()}
                </svg>
            )}

            {groupT > 0 && (
                <>
                    <div
                        style={{
                            position: "absolute",
                            left: groupCenter.x,
                            top: groupCenter.y,
                            width: 2,
                            height: 2,
                            borderRadius: "50%",
                            boxShadow: `0 0 ${44 + 18 * Math.sin(time * 1.6)}px ${20 + 8 * Math.sin(time * 1.6)}px rgba(96,165,250,0.18)`,
                            transform: "translate(-50%, -50%)",
                        }}
                    />
                    <div
                        style={{
                            position: "absolute",
                            left: groupCenter.x,
                            top: groupCenter.y,
                            width: 190,
                            height: 190,
                            borderRadius: "50%",
                            border: `1.5px solid ${BRAND}`,
                            transform: `translate(-50%, -50%) scale(${0.85 + 0.15 * groupT})`,
                            opacity: groupT * 0.45,
                        }}
                    />
                    <div
                        style={{
                            position: "absolute",
                            left: groupCenter.x,
                            top: groupCenter.y,
                            width: 140,
                            height: 140,
                            borderRadius: "50%",
                            background: `radial-gradient(circle at 35% 30%, ${BRAND_HIGHLIGHT}, ${BRAND_STRONG} 70%, #1d4ed8 100%)`,
                            transform: `translate(-50%, -50%) scale(${Easing.easeOutBack(groupT)})`,
                            boxShadow: `0 0 44px rgba(96,165,250,0.6)`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <svg
                            width="72"
                            height="72"
                            viewBox="0 0 72 72"
                            fill="none"
                            style={{ transform: "rotate(-32deg)" }}
                        >
                            <ellipse cx="36" cy="36" rx="30" ry="16" fill="#fff" />
                            <path
                                d="M 8 36 L 64 36"
                                stroke="#1d4ed8"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                            />
                            <path
                                d="M 28 31 L 28 41 M 32 31 L 32 41 M 36 31 L 36 41 M 40 31 L 40 41 M 44 31 L 44 41"
                                stroke="#1d4ed8"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                            />
                            <path
                                d="M 22 36 L 18 36 M 50 36 L 54 36"
                                stroke="#1d4ed8"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                            />
                        </svg>
                    </div>
                    <div
                        style={{
                            position: "absolute",
                            left: groupCenter.x,
                            top: groupCenter.y + 108,
                            transform: "translateX(-50%)",
                            fontFamily: FONT_MONO,
                            fontSize: 15,
                            color: TEXT_MUTED,
                            letterSpacing: "0.22em",
                            textTransform: "uppercase",
                            opacity: groupT,
                            whiteSpace: "nowrap",
                        }}
                    >
                        the league
                    </div>
                </>
            )}

            {commT > 0 && (
                <div
                    style={{
                        position: "absolute",
                        left: commNode.x,
                        top: commNode.y,
                        transform: `translate(-50%, -50%) scale(${commE})`,
                        opacity: commT,
                    }}
                >
                    <div
                        style={{
                            width: 124,
                            height: 124,
                            borderRadius: "50%",
                            background: `radial-gradient(circle at 35% 30%, ${BRAND_HIGHLIGHT}, ${BRAND} 75%)`,
                            boxShadow: `0 0 30px rgba(96,165,250,0.5)`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            border: `2px solid ${APP_BG}`,
                        }}
                    >
                        <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
                            <circle
                                cx="30"
                                cy="22"
                                r="9"
                                stroke="#fff"
                                strokeWidth="3.2"
                                fill="none"
                            />
                            <path
                                d="M 12 50 C 12 40, 21 36, 30 36 C 39 36, 48 40, 48 50"
                                stroke="#fff"
                                strokeWidth="3.2"
                                fill="none"
                                strokeLinecap="round"
                            />
                        </svg>
                    </div>
                    <div
                        style={{
                            position: "absolute",
                            left: "50%",
                            top: 138,
                            transform: "translateX(-50%)",
                            fontFamily: FONT_MONO,
                            fontSize: 15,
                            color: BRAND_HIGHLIGHT,
                            letterSpacing: "0.18em",
                            textTransform: "uppercase",
                            whiteSpace: "nowrap",
                        }}
                    >
                        commissioner
                    </div>
                    <div
                        style={{
                            position: "absolute",
                            left: "50%",
                            top: 160,
                            transform: "translateX(-50%)",
                            fontSize: 18,
                            color: TEXT_MUTED,
                            whiteSpace: "nowrap",
                        }}
                    >
                        creates · grades · adjusts
                    </div>
                </div>
            )}

            {memberOffsets.map((m, i) => {
                const t = clamp((time - membersStart - i * 0.08) / 0.55, 0, 1);
                const e = Easing.easeOutBack(t);
                if (t <= 0) return null;
                const hue = 200 + i * 22;
                return (
                    <div
                        key={i}
                        style={{
                            position: "absolute",
                            left: membersAnchor.x + m.dx,
                            top: membersAnchor.y + m.dy,
                            transform: `translate(-50%, -50%) scale(${e})`,
                            opacity: t,
                            width: 60,
                            height: 60,
                            borderRadius: "50%",
                            background: `linear-gradient(135deg, oklch(62% 0.12 ${hue}), oklch(40% 0.08 ${hue + 30}))`,
                            border: `2px solid ${APP_BG}`,
                            boxShadow: `0 0 16px rgba(96,165,250,0.3)`,
                        }}
                    />
                );
            })}
            {(() => {
                const t = clamp((time - membersStart) / 0.55, 0, 1);
                if (t <= 0) return null;
                return (
                    <>
                        <div
                            style={{
                                position: "absolute",
                                left: membersAnchor.x,
                                top: membersAnchor.y + 122,
                                transform: "translateX(-50%)",
                                opacity: t,
                                fontFamily: FONT_MONO,
                                fontSize: 18,
                                color: BRAND_HIGHLIGHT,
                                letterSpacing: "0.18em",
                                textTransform: "uppercase",
                            }}
                        >
                            members
                        </div>
                        <div
                            style={{
                                position: "absolute",
                                left: membersAnchor.x,
                                top: membersAnchor.y + 144,
                                transform: "translateX(-50%)",
                                opacity: t,
                                fontSize: 18,
                                color: TEXT_MUTED,
                                whiteSpace: "nowrap",
                            }}
                        >
                            join · pick · climb
                        </div>
                    </>
                );
            })()}

            {showText && (() => {
                const t = clamp((time - 4.6) / 0.4, 0, 1);
                const out = clamp((time - 8.0) / 0.4, 0, 1);
                const op = t * (1 - out);
                if (op <= 0) return null;
                return (
                    <div
                        style={{
                            position: "absolute",
                            left: 0,
                            right: 0,
                            bottom: 60,
                            textAlign: "center",
                            opacity: op,
                            fontFamily: FONT_MONO,
                            fontSize: 12,
                            letterSpacing: "0.24em",
                            textTransform: "uppercase",
                            color: TEXT_MUTED,
                        }}
                    >
                        one runs it · the rest play
                    </div>
                );
            })()}
        </div>
    );
}
