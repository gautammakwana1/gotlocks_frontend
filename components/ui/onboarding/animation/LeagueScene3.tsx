"use client";

import type { ReactNode } from "react";
import { Easing, clamp, useTime } from "./engine";
import { APP_BG, FONT_SANS, TEXT } from "./primitives";

// Tutorial 2 · Scene 3 — "Just for fun? Vibe slips"
// Three-beat sequence — one hero card at a time, League Combo+ pill on top.
// Beat 1: YOUR single pick lands.
// Beat 2: dragonlocks' 3-leg combo slides in.
// Beat 3: edgeevan's same-game combo slides in.
// League Combo+ odds pill flashes cyan as the value climbs.

const TEXT_DIM = "#7a8aa6";
const TEXT_DIMMER = "#5a6a86";
const CYAN_DOT = "#22d3ee";
const PICK_NAME = "#a5e8e6";

const americanToDecimal = (am: number) =>
    am >= 0 ? 1 + am / 100 : 1 + 100 / Math.abs(am);

const decimalToAmerican = (dec: number) => {
    if (dec >= 2) return Math.round((dec - 1) * 100);
    return -Math.round(100 / (dec - 1));
};

const formatAmerican = (am: number) => (am >= 0 ? "+" : "−") + Math.abs(am);

export function LeagueScene3(_props: { showText?: boolean } = {}) {
    const time = useTime();

    const beat1Out = clamp((time - 2.0) / 0.4, 0, 1);
    const beat2In = clamp((time - 2.2) / 0.4, 0, 1);
    const beat2Out = clamp((time - 4.2) / 0.4, 0, 1);
    const beat3In = clamp((time - 4.4) / 0.4, 0, 1);

    const yourCardT = clamp((time - 0.2) / 0.5, 0, 1);
    const yourPickRowT = clamp((time - 0.7) / 0.5, 0, 1);

    const dragonHeaderT = clamp((time - 2.5) / 0.4, 0, 1);
    const dragonCombo1T = clamp((time - 2.9) / 0.35, 0, 1);
    const dragonCombo2T = clamp((time - 3.2) / 0.35, 0, 1);
    const dragonCombo3T = clamp((time - 3.5) / 0.35, 0, 1);
    const dragonOddsT = clamp((time - 3.8) / 0.35, 0, 1);

    const edgeHeaderT = clamp((time - 4.7) / 0.4, 0, 1);
    const edgeCombo1T = clamp((time - 5.1) / 0.35, 0, 1);
    const edgeCombo2T = clamp((time - 5.4) / 0.35, 0, 1);
    const edgeOddsT = clamp((time - 5.7) / 0.35, 0, 1);

    const KEYS = [
        { t: 0.7, dec: americanToDecimal(-110) },
        { t: 2.9, dec: americanToDecimal(-110) },
        { t: 3.2, dec: americanToDecimal(-110) * americanToDecimal(100) },
        { t: 3.5, dec: americanToDecimal(-110) * americanToDecimal(100) * americanToDecimal(-106) },
        { t: 3.95, dec: americanToDecimal(1830) },
        { t: 5.1, dec: americanToDecimal(1830) },
        { t: 5.4, dec: americanToDecimal(1830) * americanToDecimal(-114) },
        { t: 5.85, dec: americanToDecimal(4745) },
    ];

    const comboDecimal = (() => {
        if (time < KEYS[0].t) return null;
        for (let i = 0; i < KEYS.length - 1; i++) {
            if (time >= KEYS[i].t && time < KEYS[i + 1].t) {
                const span = KEYS[i + 1].t - KEYS[i].t;
                const local = span > 0 ? (time - KEYS[i].t) / span : 1;
                const eased = Easing.easeInOutCubic(local);
                return KEYS[i].dec + (KEYS[i + 1].dec - KEYS[i].dec) * eased;
            }
        }
        return KEYS[KEYS.length - 1].dec;
    })();

    const comboOddsValue =
        comboDecimal == null ? null : formatAmerican(decimalToAmerican(comboDecimal));

    const flashTimes = [3.95, 5.85];
    const comboPulse = (() => {
        let p = 0;
        flashTimes.forEach((u) => {
            const dt = time - u;
            if (dt >= 0 && dt < 0.7) p = Math.max(p, Math.sin((dt / 0.7) * Math.PI));
        });
        return p;
    })();

    return (
        <div
            style={{
                position: "absolute",
                inset: 0,
                overflow: "hidden",
                background: APP_BG,
                fontFamily: FONT_SANS,
                color: TEXT,
            }}
        >
            <div
                style={{
                    position: "absolute",
                    top: "calc(50% - 270px)",
                    left: "50%",
                    transform: `translate(-50%, -50%) scale(${1 + comboPulse * 0.06})`,
                    transformOrigin: "center",
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "12px 22px",
                    borderRadius: 999,
                    background:
                        comboPulse > 0
                            ? `linear-gradient(180deg, rgba(125,211,252,${0.12 + comboPulse * 0.18}), rgba(255,255,255,0.04))`
                            : "rgba(255,255,255,0.04)",
                    border: `1px solid rgba(125,211,252,${0.18 + comboPulse * 0.5})`,
                    boxShadow:
                        comboPulse > 0
                            ? `0 0 ${20 + comboPulse * 40}px rgba(125,211,252,${0.25 + comboPulse * 0.4})`
                            : "0 4px 16px rgba(0,0,0,0.3)",
                    opacity: clamp(time / 0.4, 0, 1),
                    zIndex: 20,
                }}
            >
                <div
                    style={{
                        fontSize: 12,
                        color: TEXT_DIM,
                        fontWeight: 600,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                    }}
                >
                    League Combo+
                </div>
                <div
                    style={{
                        fontSize: 26,
                        fontWeight: 800,
                        color: comboPulse > 0 ? "#bef0ff" : TEXT,
                        fontFamily: FONT_SANS,
                        fontVariantNumeric: "tabular-nums",
                        minWidth: 100,
                        textAlign: "right",
                        letterSpacing: "-0.02em",
                        textShadow:
                            comboPulse > 0
                                ? `0 0 ${10 + comboPulse * 20}px rgba(125,211,252,${0.4 + comboPulse * 0.4})`
                                : "none",
                    }}
                >
                    {comboOddsValue ?? "—"}
                </div>
            </div>

            <div
                style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -48%)",
                    width: 680,
                    height: 460,
                }}
            >
                <HeroCard enterT={yourCardT} exitT={beat1Out} show={time < 2.4}>
                    <CardHeader
                        initials="SH"
                        name="Your pick"
                        badge="single pick"
                        comboOdds="−110"
                        comboOddsT={yourPickRowT}
                        t={yourCardT}
                    />
                    <PickRowApp
                        t={yourPickRowT}
                        dotColor={CYAN_DOT}
                        type="game lines"
                        name="Under 211.5 Total Points"
                        meta="DET @ ORL · May 1, 7:00 PM"
                        odds="−110"
                        pickColor={PICK_NAME}
                        textDim={TEXT_DIM}
                        textDimmer={TEXT_DIMMER}
                    />
                </HeroCard>

                <HeroCard enterT={beat2In} exitT={beat2Out} show={time >= 2.0 && time < 4.6}>
                    <CardHeader
                        initials="DR"
                        name="dragonlocks"
                        badge="3-leg combo pick"
                        comboOdds="+655"
                        comboOddsT={dragonOddsT}
                        t={dragonHeaderT}
                    />
                    <PickRowApp
                        t={dragonCombo1T}
                        dotColor={CYAN_DOT}
                        type="player points"
                        name="CJ McCollum Over 19.5 Points"
                        meta="NY @ ATL · Apr 30, 7:10 PM"
                        odds="+100"
                        pickColor={PICK_NAME}
                        textDim={TEXT_DIM}
                        textDimmer={TEXT_DIMMER}
                    />
                    <Divider t={dragonCombo2T} />
                    <PickRowApp
                        t={dragonCombo2T}
                        dotColor={CYAN_DOT}
                        type="game lines"
                        name="Under 212.5 Total Points"
                        meta="BOS @ PHI · Apr 30, 8:10 PM"
                        odds="−106"
                        pickColor={PICK_NAME}
                        textDim={TEXT_DIM}
                        textDimmer={TEXT_DIMMER}
                    />
                    <Divider t={dragonCombo3T} />
                    <PickRowApp
                        t={dragonCombo3T}
                        dotColor={CYAN_DOT}
                        type="player points"
                        name="Rudy Gobert Over 9.5 Points"
                        meta="DEN @ MIN · Apr 30, 9:40 PM"
                        odds="−106"
                        pickColor={PICK_NAME}
                        textDim={TEXT_DIM}
                        textDimmer={TEXT_DIMMER}
                    />
                </HeroCard>

                <HeroCard enterT={beat3In} exitT={0} show={time >= 4.2}>
                    <CardHeader
                        initials="ED"
                        name="edgeevan"
                        badge="same game combo"
                        comboOdds="+257"
                        comboOddsT={edgeOddsT}
                        t={edgeHeaderT}
                    />
                    <PickRowApp
                        t={edgeCombo1T}
                        dotColor={CYAN_DOT}
                        type="game lines"
                        name="New York Knicks −2.5 Spread"
                        meta="NY @ ATL · Apr 30, 7:10 PM"
                        odds="−114"
                        pickColor={PICK_NAME}
                        textDim={TEXT_DIM}
                        textDimmer={TEXT_DIMMER}
                    />
                    <Divider t={edgeCombo2T} />
                    <PickRowApp
                        t={edgeCombo2T}
                        dotColor={CYAN_DOT}
                        type="player points"
                        name="Jalen Brunson Over 26.5 Points"
                        meta="NY @ ATL · Apr 30, 7:10 PM"
                        odds="−111"
                        pickColor={PICK_NAME}
                        textDim={TEXT_DIM}
                        textDimmer={TEXT_DIMMER}
                    />
                </HeroCard>
            </div>
        </div>
    );
}

type HeroCardProps = {
    enterT: number;
    exitT: number;
    show: boolean;
    children: ReactNode;
};

function HeroCard({ enterT, exitT, show, children }: HeroCardProps) {
    if (!show) return null;
    const inProgress = Easing.easeOutCubic(enterT);
    const outProgress = Easing.easeInCubic(exitT);
    const opacity = inProgress * (1 - outProgress);
    const yOffset = (1 - inProgress) * 30 + outProgress * -40;
    const scale = 0.96 + 0.04 * inProgress - 0.04 * outProgress;

    return (
        <div
            style={{
                position: "absolute",
                inset: 0,
                opacity,
                transform: `translateY(${yOffset}px) scale(${scale})`,
                transformOrigin: "center",
                background: "rgba(255,255,255,0.025)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 22,
                padding: "28px 34px 32px",
                boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
                display: "flex",
                flexDirection: "column",
                gap: 4,
            }}
        >
            {children}
        </div>
    );
}

type CardHeaderProps = {
    initials: string;
    name: string;
    badge: string;
    comboOdds: string;
    comboOddsT: number;
    t: number;
};

function CardHeader({ initials, name, badge, comboOdds, comboOddsT, t }: CardHeaderProps) {
    return (
        <div style={{ marginBottom: 18, opacity: t }}>
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    marginBottom: 16,
                }}
            >
                <AvatarInitials initials={initials} size={44} />
                <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.01em" }}>
                    {name}
                </div>
            </div>
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingBottom: 14,
                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <ComboBadgeApp />
                    <div style={{ fontSize: 14, color: TEXT_DIM, fontWeight: 500 }}>{badge}</div>
                </div>
                <div
                    style={{
                        fontSize: 20,
                        fontWeight: 700,
                        color: TEXT,
                        fontFamily: FONT_SANS,
                        fontVariantNumeric: "tabular-nums",
                        opacity: comboOddsT,
                    }}
                >
                    {comboOdds}
                </div>
            </div>
        </div>
    );
}

function Divider({ t }: { t: number }) {
    return (
        <div
            style={{
                height: 1,
                background: "rgba(255,255,255,0.05)",
                margin: "12px 0",
                opacity: t,
            }}
        />
    );
}

function AvatarInitials({ initials = "", size = 36 }: { initials?: string; size?: number }) {
    return (
        <div
            style={{
                width: size,
                height: size,
                borderRadius: size / 2,
                background: "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))",
                border: "1px solid rgba(255,255,255,0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: size * 0.36,
                fontWeight: 700,
                color: "rgba(255,255,255,0.85)",
                fontFamily: FONT_SANS,
                letterSpacing: "0.02em",
                flexShrink: 0,
            }}
        >
            {initials}
        </div>
    );
}

function ComboBadgeApp() {
    return (
        <div
            style={{
                width: 22,
                height: 22,
                borderRadius: 11,
                border: "1.4px solid rgba(244,114,128,0.6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(244,114,128,0.05)",
            }}
        >
            <div style={{ width: 10, height: 1.4, background: "rgba(244,114,128,0.85)" }} />
        </div>
    );
}

type PickRowAppProps = {
    t: number;
    dotColor: string;
    type: string;
    name: string;
    meta: string;
    odds: string;
    pickColor: string;
    textDim: string;
    textDimmer: string;
};

function PickRowApp({
    t,
    dotColor,
    type,
    name,
    meta,
    odds,
    pickColor,
    textDim,
    textDimmer,
}: PickRowAppProps) {
    if (t <= 0) return null;
    return (
        <div
            style={{
                opacity: t,
                transform: `translateY(${(1 - t) * 6}px)`,
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: 12,
                padding: "4px 0",
            }}
        >
            <div style={{ minWidth: 0 }}>
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 5,
                    }}
                >
                    <span
                        style={{
                            width: 7,
                            height: 7,
                            borderRadius: 4,
                            background: dotColor,
                            boxShadow: `0 0 6px ${dotColor}`,
                            flexShrink: 0,
                        }}
                    />
                    <span style={{ fontSize: 13, color: textDim, fontWeight: 500 }}>{type}</span>
                </div>
                <div
                    style={{
                        fontSize: 19,
                        fontWeight: 700,
                        color: pickColor,
                        letterSpacing: "-0.01em",
                        marginLeft: 15,
                        lineHeight: 1.25,
                    }}
                >
                    {name}
                </div>
                <div
                    style={{
                        marginTop: 5,
                        fontSize: 13,
                        color: textDimmer,
                        marginLeft: 15,
                    }}
                >
                    {meta}
                </div>
            </div>
            <div
                style={{
                    fontSize: 19,
                    fontWeight: 700,
                    color: TEXT,
                    fontFamily: FONT_SANS,
                    fontVariantNumeric: "tabular-nums",
                    alignSelf: "flex-start",
                }}
            >
                {odds}
            </div>
        </div>
    );
}
