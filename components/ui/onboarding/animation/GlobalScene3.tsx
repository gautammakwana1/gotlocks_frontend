"use client";

import { clamp, useTime } from "./engine";
import {
    APP_BG,
    BORDER,
    FONT_MONO,
    FONT_SANS,
    TEXT,
    TEXT_MUTED,
} from "./primitives";

// Tutorial 3 · Scene 3 — "Discover & connect"
// Global feed: tabs (for you / following / winners) switch in sequence,
// each showing different pick post styles.

type Leg = { type: string; name: string; odds: string; meta: string };

type Pick = {
    user: string;
    initials: string;
    hue: number;
    league: string;
    leagueLine?: string;
    date?: string;
    pickType?: string;
    name?: string;
    odds?: string;
    globalXp: string;
    confidence: string;
    combo?: boolean;
    comboOdds?: string;
    legs?: Leg[];
    status: "win" | null;
    startT: number;
    reactT?: number;
};

const TABS = ["for you", "following", "winners"];

const FOR_YOU_PICKS: Pick[] = [
    {
        user: "dragonlocks",
        initials: "DR",
        hue: 220,
        league: "COMBO",
        leagueLine: "COMBO · 3 picks · posted at: May 2, 4:29 PM",
        globalXp: "61 XP",
        confidence: "high",
        combo: true,
        comboOdds: "+659",
        legs: [
            { type: "game lines", name: "Carolina Hurricanes Moneyline", odds: "−240", meta: "PHI @ CAR · May 2, 8:10 PM" },
            { type: "game lines", name: "Philadelphia 76ers Moneyline", odds: "+190", meta: "PHI @ BOS · May 2, 7:40 PM" },
            { type: "game lines", name: "San Francisco Giants Moneyline", odds: "−118", meta: "SF @ TB · May 2, 6:11 PM" },
        ],
        status: null,
        startT: 0.7,
    },
    {
        user: "icylocks",
        initials: "IL",
        hue: 200,
        league: "NBA",
        leagueLine: "NBA · 4 picks · posted at: May 2, 4:29 PM",
        globalXp: "57 XP",
        confidence: "high",
        combo: true,
        comboOdds: "+577",
        legs: [
            { type: "game lines", name: "Philadelphia 76ers +6.5 Spread", odds: "−106", meta: "PHI @ BOS · May 2, 7:40 PM" },
            { type: "player points", name: "Tyrese Maxey Over 23.5", odds: "−122", meta: "PHI @ BOS · May 2, 7:40 PM" },
            { type: "player points", name: "VJ Edgecombe Over 9.5", odds: "−188", meta: "PHI @ BOS · May 2, 7:40 PM" },
            { type: "player points", name: "Jayson Tatum Over 19.5", odds: "−245", meta: "PHI @ BOS · May 2, 7:40 PM" },
        ],
        status: null,
        startT: 1.3,
    },
];

const FOLLOWING_PICKS: Pick[] = [
    {
        user: "sharpshark22",
        initials: "SH",
        hue: 160,
        league: "MLB",
        leagueLine: "MLB · 4 picks · posted at: May 2, 4:28 PM",
        globalXp: "70 XP",
        confidence: "medium",
        combo: true,
        comboOdds: "+879",
        legs: [
            { type: "game lines", name: "San Francisco Giants Moneyline", odds: "−118", meta: "SF @ TB · May 2, 6:11 PM" },
            { type: "game lines", name: "Los Angeles Dodgers Moneyline", odds: "−136", meta: "LAD @ STL · May 2, 7:16 PM" },
            { type: "game lines", name: "Texas Rangers Moneyline", odds: "+110", meta: "TEX @ DET · May 2, 7:16 PM" },
            { type: "game lines", name: "Atlanta Braves Moneyline", odds: "−220", meta: "ATL @ COL · May 2, 8:11 PM" },
        ],
        status: null,
        startT: 2.9,
    },
];

const WINNERS_PICKS: Pick[] = [
    {
        user: "hailmaryking",
        initials: "HM",
        hue: 220,
        league: "NBA",
        date: "Apr 21, 7:10 PM",
        pickType: "game lines",
        name: "Philadelphia 76ers Moneyline",
        odds: "+640",
        globalXp: "60 XP",
        confidence: "high",
        status: "win",
        startT: 4.7,
        reactT: 5.6,
    },
    {
        user: "sharpshark22",
        initials: "SH",
        hue: 200,
        league: "NBA",
        date: "Apr 20, 10:40 PM",
        pickType: "game lines",
        name: "Minnesota Timberwolves Moneyline",
        odds: "+240",
        globalXp: "39 XP",
        confidence: "low",
        status: "win",
        startT: 5.2,
    },
];

export function GlobalScene3({ showText = false }: { showText?: boolean }) {
    const time = useTime();

    const tabT = clamp(time / 0.6, 0, 1);

    let activeTab = 0;
    if (time >= 2.6 && time < 4.4) activeTab = 1;
    else if (time >= 4.4) activeTab = 2;

    const currentPicks =
        activeTab === 0 ? FOR_YOU_PICKS : activeTab === 1 ? FOLLOWING_PICKS : WINNERS_PICKS;

    const contentFade = (() => {
        if (time >= 2.4 && time < 2.8) return 1 - (time - 2.4) / 0.4;
        if (time >= 4.2 && time < 4.6) return 1 - (time - 4.2) / 0.4;
        return 1;
    })();
    const contentEnter = (() => {
        if (time >= 2.6 && time < 3.0) return (time - 2.6) / 0.4;
        if (time >= 4.4 && time < 4.8) return (time - 4.4) / 0.4;
        return 1;
    })();
    const contentOpacity = Math.min(contentFade, contentEnter);

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
            <div
                style={{
                    position: "absolute",
                    top: 30,
                    left: 32,
                    right: 32,
                    display: "flex",
                    alignItems: "flex-end",
                    gap: 36,
                    opacity: tabT,
                    zIndex: 10,
                    height: 44,
                }}
            >
                {TABS.map((t, i) => (
                    <div
                        key={t}
                        style={{
                            fontSize: 22,
                            fontWeight: 700,
                            color: i === activeTab ? TEXT : TEXT_MUTED,
                            opacity: i === activeTab ? 1 : 0.55,
                            letterSpacing: "-0.01em",
                            transition: "color 250ms, opacity 250ms",
                            position: "relative",
                            paddingBottom: 8,
                            lineHeight: 1.1,
                        }}
                    >
                        {t}
                    </div>
                ))}
            </div>

            <div
                style={{
                    position: "absolute",
                    top: 100,
                    left: 32,
                    right: 32,
                    bottom: 32,
                    opacity: contentOpacity,
                    overflow: "hidden",
                }}
            >
                {currentPicks.map((p, i) => (
                    <FeedPickCard key={`${activeTab}-${i}`} pick={p} time={time} />
                ))}
            </div>

            {showText &&
                (() => {
                    const t = clamp((time - 5.5) / 0.4, 0, 1);
                    const out = clamp((time - 8.0) / 0.4, 0, 1);
                    const op = t * (1 - out);
                    if (op <= 0) return null;
                    return (
                        <div
                            style={{
                                position: "absolute",
                                left: 0,
                                right: 0,
                                bottom: 8,
                                textAlign: "center",
                                opacity: op,
                                fontFamily: FONT_MONO,
                                fontSize: 11,
                                letterSpacing: "0.24em",
                                textTransform: "uppercase",
                                color: TEXT_MUTED,
                                zIndex: 30,
                            }}
                        >
                            scroll · react · follow
                        </div>
                    );
                })()}
        </div>
    );
}

function FeedPickCard({ pick, time }: { pick: Pick; time: number }) {
    const enterT = clamp((time - pick.startT) / 0.5, 0, 1);
    if (enterT <= 0) return null;
    const enterE = enterT * (2 - enterT);
    const yOff = (1 - enterE) * 28;

    const isWin = pick.status === "win";
    const winFlashT = isWin ? clamp((time - pick.startT - 0.3) / 0.6, 0, 1) : 0;

    const reactActive =
        pick.reactT !== undefined && time >= pick.reactT && time <= pick.reactT + 1.0;
    const reactPulse =
        reactActive && pick.reactT !== undefined
            ? Math.sin(((time - pick.reactT) / 1.0) * Math.PI)
            : 0;

    return (
        <div
            style={{
                marginBottom: 18,
                opacity: enterE,
                transform: `translateY(${yOff}px)`,
                position: "relative",
            }}
        >
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: 12,
                }}
            >
                <div
                    style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        background: `linear-gradient(135deg, oklch(62% 0.12 ${pick.hue}), oklch(42% 0.08 ${pick.hue + 30}))`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#fff",
                        border: "1px solid rgba(255,255,255,0.1)",
                        flexShrink: 0,
                    }}
                >
                    {pick.initials}
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 17, fontWeight: 700 }}>{pick.user}</div>
                    <div style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 1 }}>view profile</div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <ReactChip
                        symbol="▲"
                        count={
                            reactActive || (pick.reactT !== undefined && time > pick.reactT) ? 1 : 0
                        }
                        highlight={reactPulse}
                    />
                    <ReactChip symbol="▼" count={0} />
                    {isWin && (
                        <div
                            style={{
                                padding: "4px 10px",
                                borderRadius: 999,
                                background: `rgba(34,197,94,${0.2 + winFlashT * 0.15})`,
                                border: "1px solid rgba(134,239,172,0.55)",
                                fontSize: 10,
                                fontWeight: 800,
                                color: "#bbf7d0",
                                letterSpacing: "0.1em",
                                textTransform: "uppercase",
                                textShadow: "0 0 8px rgba(134,239,172,0.6)",
                                opacity: winFlashT,
                            }}
                        >
                            WIN
                        </div>
                    )}
                </div>
            </div>

            {pick.combo ? (
                <ComboPostBody pick={pick} winFlashT={winFlashT} />
            ) : (
                <SinglePostBody pick={pick} winFlashT={winFlashT} />
            )}

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 12,
                    marginTop: 10,
                }}
            >
                <div
                    style={{
                        padding: "10px 14px",
                        borderRadius: 12,
                        background: "rgba(59,130,246,0.10)",
                        border: "1px solid rgba(125,211,252,0.3)",
                    }}
                >
                    <div style={{ fontSize: 11, color: TEXT_MUTED }}>xp</div>
                    <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>{pick.globalXp}</div>
                </div>
                <div
                    style={{
                        padding: "10px 14px",
                        borderRadius: 12,
                        background: "rgba(255,255,255,0.03)",
                        border: `1px solid ${BORDER}`,
                    }}
                >
                    <div style={{ fontSize: 11, color: TEXT_MUTED }}>confidence</div>
                    <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>
                        {pick.confidence}
                    </div>
                </div>
            </div>

            {pick.combo && pick.leagueLine && (
                <div
                    style={{
                        fontSize: 11,
                        color: TEXT_MUTED,
                        marginTop: 8,
                        fontFamily: FONT_MONO,
                        letterSpacing: "0.06em",
                        textAlign: "right",
                    }}
                >
                    {pick.leagueLine}
                </div>
            )}

            {reactPulse > 0 && (
                <div
                    style={{
                        position: "absolute",
                        right: 96,
                        top: 10,
                        transform: `translateY(${-reactPulse * 24}px)`,
                        opacity: reactPulse,
                        color: "#86efac",
                        fontFamily: FONT_MONO,
                        fontWeight: 700,
                        fontSize: 14,
                        textShadow: "0 0 8px #86efac",
                        pointerEvents: "none",
                    }}
                >
                    +1
                </div>
            )}
        </div>
    );
}

function SinglePostBody({ pick, winFlashT }: { pick: Pick; winFlashT: number }) {
    return (
        <div
            style={{
                position: "relative",
                padding: "14px 16px",
                borderRadius: 14,
                background: "linear-gradient(180deg, rgba(180,140,60,0.15), rgba(0,0,0,0.5))",
                border: `1px solid ${winFlashT > 0 ? `rgba(134,239,172,${0.3 + winFlashT * 0.3})` : "rgba(180,140,60,0.4)"}`,
                boxShadow:
                    winFlashT > 0
                        ? `0 0 ${10 + winFlashT * 30}px rgba(134,239,172,${winFlashT * 0.35})`
                        : "none",
            }}
        >
            <div
                style={{
                    fontSize: 11,
                    fontFamily: FONT_MONO,
                    color: TEXT_MUTED,
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                }}
            >
                single pick post
            </div>
            <div
                style={{
                    height: 1,
                    background: "rgba(255,255,255,0.08)",
                    margin: "8px 0",
                }}
            />
            <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 4 }}>
                {pick.pickType}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div
                    style={{
                        width: 7,
                        height: 7,
                        borderRadius: 4,
                        background: "#86efac",
                        boxShadow: "0 0 6px #86efac",
                    }}
                />
                <div
                    style={{
                        fontSize: 16,
                        fontWeight: 700,
                        color: "#a5e8e6",
                        flex: 1,
                        lineHeight: 1.2,
                    }}
                >
                    {pick.name}
                </div>
                <div
                    style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: TEXT,
                        fontVariantNumeric: "tabular-nums",
                    }}
                >
                    {pick.odds}
                </div>
            </div>
            <div
                style={{
                    fontSize: 11,
                    color: TEXT_MUTED,
                    marginTop: 6,
                    fontFamily: FONT_MONO,
                    letterSpacing: "0.06em",
                }}
            >
                {pick.league} · {pick.date}
            </div>
        </div>
    );
}

function ComboPostBody({ pick, winFlashT }: { pick: Pick; winFlashT: number }) {
    return (
        <div
            style={{
                position: "relative",
                padding: "14px 16px",
                borderRadius: 14,
                background: "linear-gradient(180deg, rgba(255,255,255,0.025), rgba(0,0,0,0.4))",
                border: `1px solid ${winFlashT > 0 ? `rgba(134,239,172,${0.3 + winFlashT * 0.3})` : "rgba(255,255,255,0.08)"}`,
                boxShadow:
                    winFlashT > 0
                        ? `0 0 ${10 + winFlashT * 30}px rgba(134,239,172,${winFlashT * 0.35})`
                        : "none",
            }}
        >
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                }}
            >
                <div
                    style={{
                        fontSize: 11,
                        fontFamily: FONT_MONO,
                        color: TEXT_MUTED,
                        letterSpacing: "0.16em",
                        textTransform: "uppercase",
                    }}
                >
                    combo pick post
                </div>
                <div
                    style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: TEXT,
                        fontVariantNumeric: "tabular-nums",
                    }}
                >
                    {pick.comboOdds}
                </div>
            </div>
            <div
                style={{
                    height: 1,
                    background: "rgba(255,255,255,0.08)",
                    margin: "8px 0",
                }}
            />

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {pick.legs?.map((leg, i) => (
                    <div
                        key={i}
                        style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 8,
                            paddingTop: i === 0 ? 0 : 6,
                        }}
                    >
                        <div
                            style={{
                                width: 7,
                                height: 7,
                                borderRadius: 4,
                                background: "#86efac",
                                boxShadow: "0 0 6px #86efac",
                                marginTop: 18,
                                flexShrink: 0,
                            }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 10, color: TEXT_MUTED, marginBottom: 2 }}>
                                {leg.type}
                            </div>
                            <div
                                style={{
                                    fontSize: 14,
                                    fontWeight: 700,
                                    color: "#a5e8e6",
                                    lineHeight: 1.2,
                                }}
                            >
                                {leg.name}
                            </div>
                            <div
                                style={{
                                    fontSize: 10,
                                    color: TEXT_MUTED,
                                    marginTop: 2,
                                    fontFamily: FONT_MONO,
                                    letterSpacing: "0.04em",
                                }}
                            >
                                {leg.meta}
                            </div>
                        </div>
                        <div
                            style={{
                                fontSize: 13,
                                fontWeight: 700,
                                color: TEXT,
                                fontVariantNumeric: "tabular-nums",
                                marginTop: 18,
                            }}
                        >
                            {leg.odds}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function ReactChip({
    symbol,
    count,
    highlight = 0,
}: {
    symbol: string;
    count: number;
    highlight?: number;
}) {
    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "5px 10px",
                borderRadius: 8,
                background:
                    highlight > 0
                        ? `rgba(125,211,252,${0.1 + highlight * 0.15})`
                        : "rgba(255,255,255,0.04)",
                border: `1px solid ${highlight > 0 ? `rgba(125,211,252,${0.4 + highlight * 0.4})` : BORDER}`,
                boxShadow:
                    highlight > 0
                        ? `0 0 ${8 + highlight * 16}px rgba(125,211,252,${highlight * 0.4})`
                        : "none",
                fontSize: 12,
                fontWeight: 700,
                color: TEXT,
                transform: `scale(${1 + highlight * 0.06})`,
            }}
        >
            <span style={{ fontSize: 9 }}>{symbol}</span>
            <span
                style={{
                    fontVariantNumeric: "tabular-nums",
                    minWidth: 6,
                    textAlign: "center",
                }}
            >
                {count}
            </span>
        </div>
    );
}
