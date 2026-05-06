"use client";

import { Easing, clamp, useTime } from "./engine";
import { APP_BG, FONT_SANS, TEXT } from "./primitives";

// Tutorial 2 · Scene 2 — "The leaderboard slip"
// User taps a matchup → drills into Player Points → taps Cade O 29.5 →
// sheet rises with tier "Edge · 25 pts" → taps "post to slip".

const TEXT_DIM = "#7a8aa6";
const TEXT_DIMMER = "#566380";
const CYAN = "#7dd3fc";

export function GroupScene2(_props: { showText?: boolean } = {}) {
    const time = useTime();

    const listInT = clamp(time / 0.5, 0, 1);
    const cursorToMatchT = clamp((time - 0.6) / 0.6, 0, 1);
    const matchTapT = clamp((time - 1.3) / 0.3, 0, 1);
    const transitionT = clamp((time - 1.7) / 0.7, 0, 1);

    const detailReadyT = clamp((time - 2.4) / 0.3, 0, 1);
    const cursorToCadeT = clamp((time - 2.7) / 0.6, 0, 1);
    const cadeTapT = clamp((time - 3.3) / 0.3, 0, 1);
    const sheetUpT = clamp((time - 3.6) / 0.5, 0, 1);
    const cursorToPostT = clamp((time - 4.2) / 0.7, 0, 1);
    const postTapT = clamp((time - 4.9) / 0.3, 0, 1);
    const fadeOutT = clamp((time - 6.0) / 0.5, 0, 1);

    const CADE = { x: 614, y: 300 };
    const POST = { x: 684, y: 916 };
    const MATCH = { x: 400, y: 390 };

    const cursorPos = (() => {
        if (time < 0.6) return { x: 720, y: 940, opacity: 0 };
        if (time < 1.3) {
            const t = Easing.easeOutCubic(cursorToMatchT);
            return {
                x: 720 - (720 - MATCH.x) * t,
                y: 940 - (940 - MATCH.y) * t,
                opacity: t,
            };
        }
        if (time < 1.7) return { x: MATCH.x, y: MATCH.y, opacity: 1 };
        if (time < 2.4) return { x: MATCH.x, y: MATCH.y, opacity: 1 - transitionT };
        if (time < 2.7) return { x: 720, y: 920, opacity: detailReadyT };
        if (time < 3.3) {
            const t = Easing.easeOutCubic(cursorToCadeT);
            return {
                x: 720 - (720 - CADE.x) * t,
                y: 920 - (920 - CADE.y) * t,
                opacity: 1,
            };
        }
        if (time < 4.2) return { x: CADE.x, y: CADE.y, opacity: 1 };
        if (time < 4.9) {
            const t = Easing.easeInOutCubic(cursorToPostT);
            return {
                x: CADE.x + (POST.x - CADE.x) * t,
                y: CADE.y + (POST.y - CADE.y) * t,
                opacity: 1,
            };
        }
        if (time < 5.5) return { x: POST.x, y: POST.y, opacity: 1 };
        return { x: POST.x, y: POST.y, opacity: 1 - fadeOutT };
    })();

    const matchTapRipple = (() => {
        const dt = time - 1.3;
        return dt >= 0 && dt < 0.5 ? Easing.easeOutCubic(dt / 0.5) : 0;
    })();
    const cadeTapRipple = (() => {
        const dt = time - 3.3;
        return dt >= 0 && dt < 0.5 ? Easing.easeOutCubic(dt / 0.5) : 0;
    })();

    const showDetail = time >= 2.0;
    const showList = time < 2.5;

    return (
        <div
            style={{
                position: "absolute",
                inset: 0,
                overflow: "hidden",
                background: APP_BG,
                fontFamily: FONT_SANS,
                color: TEXT,
                opacity: 1 - fadeOutT,
            }}
        >
            {showList && (
                <div
                    style={{
                        position: "absolute",
                        inset: 0,
                        padding: "36px 40px",
                        opacity: listInT * (1 - transitionT),
                        transform: `translateY(${transitionT * -60}px)`,
                    }}
                >
                    <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.02em" }}>
                        5/1 NBA Games
                    </div>
                    <div style={{ marginTop: 8, fontSize: 16, color: TEXT_DIM, fontWeight: 500 }}>
                        Add a pick from the leagues this slip supports.
                    </div>

                    <div style={{ marginTop: 22, height: 1, background: "rgba(255,255,255,0.08)" }} />

                    <div style={{ marginTop: 22, display: "flex", gap: 26 }}>
                        <DateTab label="Today" />
                        <DateTab label="May 1" active />
                        <DateTab label="May 2" />
                        <DateTab label="May 3" />
                    </div>

                    <div style={{ marginTop: 22 }}>
                        <div
                            style={{
                                display: "inline-block",
                                fontSize: 15,
                                fontWeight: 700,
                                paddingBottom: 6,
                                borderBottom: `2px solid ${CYAN}`,
                            }}
                        >
                            NBA
                        </div>
                    </div>

                    <div
                        style={{
                            marginTop: 30,
                            display: "flex",
                            alignItems: "baseline",
                            justifyContent: "space-between",
                        }}
                    >
                        <div style={{ fontSize: 18, fontWeight: 700 }}>choose a matchup</div>
                        <div style={{ fontSize: 14, color: TEXT_DIM }}>game lines + props</div>
                    </div>

                    <MatchupRow
                        away="Detroit Pistons"
                        home="Orlando Magic"
                        timeLabel="May 1, 7:00 PM"
                        cells={[
                            { spread: "-3.5", spreadOdds: "-110", money: "-162", total: "O 211.5", totalOdds: "-110" },
                            { spread: "+3.5", spreadOdds: "-110", money: "+136", total: "U 211.5", totalOdds: "-110" },
                        ]}
                        rowHighlight={matchTapT > 0 ? clamp(matchTapT * 1.5, 0, 1) : 0}
                        tapRipple={matchTapRipple}
                    />

                    <div style={{ marginTop: 22, height: 1, background: "rgba(255,255,255,0.06)" }} />

                    <div style={{ marginTop: 22 }}>
                        <MatchupRow
                            away="Cleveland Cavaliers"
                            home="Toronto Raptors"
                            timeLabel="May 1, 7:30 PM"
                            cells={[
                                { spread: "-3.5", spreadOdds: "-118", money: "-170", total: "O 220.5", totalOdds: "-110" },
                                { spread: "+3.5", spreadOdds: "-102", money: "+142", total: "U 220.5", totalOdds: "-110" },
                            ]}
                        />
                    </div>
                </div>
            )}

            {showDetail && (
                <div
                    style={{
                        position: "absolute",
                        inset: 0,
                        padding: "36px 40px",
                        opacity: detailReadyT,
                        transform: `translateY(${(1 - detailReadyT) * 60}px)`,
                    }}
                >
                    <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.01em" }}>
                        Detroit Pistons at Orlando Magic
                    </div>
                    <div style={{ marginTop: 4, fontSize: 14, color: TEXT_DIM }}>May 1, 7:00 PM</div>

                    <div
                        style={{
                            marginTop: 18,
                            display: "flex",
                            gap: 22,
                            alignItems: "center",
                        }}
                    >
                        <MarketTab label="Game lines" />
                        <MarketTab label="Player points" active />
                        <MarketTab label="Player threes" />
                        <MarketTab label="Player rebounds" />
                    </div>

                    <div style={{ marginTop: 18, height: 1, background: "rgba(255,255,255,0.08)" }} />

                    <div
                        style={{
                            marginTop: 24,
                            display: "flex",
                            alignItems: "baseline",
                            justifyContent: "space-between",
                        }}
                    >
                        <div style={{ fontSize: 18, fontWeight: 700 }}>Player Points</div>
                        <div style={{ fontSize: 14, color: TEXT_DIM }}>^</div>
                    </div>

                    <div
                        style={{
                            marginTop: 16,
                            display: "grid",
                            gridTemplateColumns: "1fr 84px 84px",
                            alignItems: "center",
                            gap: 12,
                            fontSize: 13,
                            color: TEXT_DIM,
                            paddingRight: 4,
                        }}
                    >
                        <div>Player</div>
                        <div style={{ textAlign: "center", lineHeight: 1.2 }}>
                            Over
                            <br />
                            line
                        </div>
                        <div style={{ textAlign: "center", lineHeight: 1.2 }}>
                            Under
                            <br />
                            line
                        </div>
                    </div>

                    <div style={{ marginTop: 14, display: "flex", flexDirection: "column" }}>
                        <PlayerRow
                            name="Cade Cunningham"
                            team="DET"
                            over="O 29.5"
                            overOdds="-114"
                            under="U 29.5"
                            underOdds="-112"
                            highlight={
                                cadeTapT > 0 ? clamp(cadeTapT * 1.5, 0, 1) : sheetUpT > 0 ? 1 : 0
                            }
                            tapRipple={cadeTapRipple}
                        />
                        <PlayerRow
                            name="Paolo Banchero"
                            team="ORL"
                            over="O 23.5"
                            overOdds="-109"
                            under="U 23.5"
                            underOdds="-117"
                            dimmed={sheetUpT > 0.4}
                        />
                        <PlayerRow
                            name="Desmond Bane"
                            team="ORL"
                            over="O 19.5"
                            overOdds="-115"
                            under="U 19.5"
                            underOdds="-111"
                            dimmed={sheetUpT > 0.4}
                        />
                        <PlayerRow
                            name="Tobias Harris"
                            team="DET"
                            over="O 14.5"
                            overOdds="-108"
                            under="U 14.5"
                            underOdds="-118"
                            dimmed={sheetUpT > 0.4}
                        />
                    </div>

                    {sheetUpT > 0 && <SelectedPickSheet sheetT={sheetUpT} postTapT={postTapT} />}
                </div>
            )}

            <Cursor pos={cursorPos} />
        </div>
    );
}

function DateTab({ label, active = false }: { label: string; active?: boolean }) {
    return (
        <div
            style={{
                fontSize: 16,
                fontWeight: active ? 700 : 500,
                color: active ? TEXT : TEXT_DIM,
                paddingBottom: 6,
                borderBottom: active ? `2px solid ${CYAN}` : "none",
            }}
        >
            {label}
        </div>
    );
}

function MarketTab({ label, active = false }: { label: string; active?: boolean }) {
    return (
        <div
            style={{
                fontSize: 15,
                fontWeight: active ? 700 : 500,
                color: active ? TEXT : TEXT_DIM,
                paddingBottom: 6,
                borderBottom: active ? `2px solid ${CYAN}` : "none",
                whiteSpace: "nowrap",
            }}
        >
            {label}
        </div>
    );
}

type Cell = {
    spread: string;
    spreadOdds: string;
    money: string;
    total: string;
    totalOdds: string;
};

type MatchupRowProps = {
    away: string;
    home: string;
    timeLabel: string;
    cells: [Cell, Cell];
    rowHighlight?: number;
    tapRipple?: number;
};

function MatchupRow({
    away,
    home,
    timeLabel,
    cells,
    rowHighlight = 0,
    tapRipple = 0,
}: MatchupRowProps) {
    return (
        <div
            style={{
                marginTop: 24,
                position: "relative",
                padding: "14px 14px",
                margin: "24px -14px 0",
                borderRadius: 16,
                background:
                    rowHighlight > 0 ? `rgba(125,211,252,${0.08 + rowHighlight * 0.1})` : "transparent",
                boxShadow:
                    rowHighlight > 0
                        ? `0 0 ${14 + rowHighlight * 22}px rgba(125,211,252,${0.2 + rowHighlight * 0.3}), inset 0 0 0 1px rgba(125,211,252,${0.3 + rowHighlight * 0.4})`
                        : "none",
            }}
        >
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 84px 84px 84px",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 12,
                    fontSize: 13,
                    color: TEXT_DIM,
                }}
            >
                <div />
                <div style={{ textAlign: "center" }}>Spread</div>
                <div style={{ textAlign: "center" }}>Money</div>
                <div style={{ textAlign: "center" }}>Total</div>
            </div>

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 84px 84px 84px",
                    alignItems: "center",
                    gap: 10,
                    rowGap: 10,
                }}
            >
                <div
                    style={{
                        gridRow: "1 / span 2",
                        display: "flex",
                        flexDirection: "column",
                        gap: 4,
                    }}
                >
                    <div style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.2 }}>
                        {away} @<br />
                        {home}
                    </div>
                    <div style={{ fontSize: 13, color: TEXT_DIM, marginTop: 2 }}>{timeLabel}</div>
                </div>
                <OddsCell value={cells[0].spread} sub={cells[0].spreadOdds} />
                <OddsCell value={cells[0].money} sub={null} />
                <OddsCell value={cells[0].total} sub={cells[0].totalOdds} />
                <OddsCell value={cells[1].spread} sub={cells[1].spreadOdds} />
                <OddsCell value={cells[1].money} sub={null} />
                <OddsCell value={cells[1].total} sub={cells[1].totalOdds} />
            </div>

            {tapRipple > 0 && (
                <div
                    style={{
                        position: "absolute",
                        left: "50%",
                        top: "50%",
                        width: 380 * tapRipple,
                        height: 380 * tapRipple,
                        borderRadius: "50%",
                        border: `2px solid rgba(125,211,252,${1 - tapRipple})`,
                        transform: "translate(-50%, -50%)",
                        pointerEvents: "none",
                    }}
                />
            )}
        </div>
    );
}

type OddsCellProps = {
    value: string;
    sub: string | null;
    highlight?: number;
    tapRipple?: number;
};

function OddsCell({ value, sub, highlight = 0, tapRipple = 0 }: OddsCellProps) {
    return (
        <div
            style={{
                position: "relative",
                width: 84,
                height: 56,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 2,
                border: `1px solid rgba(125,211,252,${0.3 + highlight * 0.55})`,
                borderRadius: 10,
                background:
                    highlight > 0 ? `rgba(125,211,252,${0.1 + highlight * 0.18})` : "transparent",
                boxShadow:
                    highlight > 0
                        ? `0 0 ${10 + highlight * 18}px rgba(125,211,252,${0.2 + highlight * 0.4})`
                        : "none",
                overflow: "hidden",
                boxSizing: "border-box",
            }}
        >
            <div style={{ fontSize: 14, fontWeight: 700, color: TEXT, lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: 11, color: TEXT_DIM, lineHeight: 1, minHeight: 11 }}>
                {sub || " "}
            </div>
            {tapRipple > 0 && (
                <div
                    style={{
                        position: "absolute",
                        left: "50%",
                        top: "50%",
                        width: 200 * tapRipple,
                        height: 200 * tapRipple,
                        borderRadius: "50%",
                        border: `2px solid rgba(125,211,252,${1 - tapRipple})`,
                        transform: "translate(-50%, -50%)",
                        pointerEvents: "none",
                    }}
                />
            )}
        </div>
    );
}

type PlayerRowProps = {
    name: string;
    team: string;
    over: string;
    overOdds: string;
    under: string;
    underOdds: string;
    highlight?: number;
    tapRipple?: number;
    dimmed?: boolean;
};

function PlayerRow({
    name,
    team,
    over,
    overOdds,
    under,
    underOdds,
    highlight = 0,
    tapRipple = 0,
    dimmed = false,
}: PlayerRowProps) {
    return (
        <div
            style={{
                display: "grid",
                gridTemplateColumns: "1fr 84px 84px",
                alignItems: "center",
                gap: 12,
                paddingTop: 16,
                paddingBottom: 16,
                paddingRight: 4,
                borderTop: "1px solid rgba(255,255,255,0.05)",
                opacity: dimmed ? 0.45 : 1,
            }}
        >
            <div>
                <div style={{ fontSize: 17, fontWeight: 700 }}>{name}</div>
                <div style={{ fontSize: 13, color: TEXT_DIM, marginTop: 2 }}>{team}</div>
            </div>
            <OddsCell value={over} sub={overOdds} highlight={highlight} tapRipple={tapRipple} />
            <OddsCell value={under} sub={underOdds} />
        </div>
    );
}

function SelectedPickSheet({ sheetT, postTapT }: { sheetT: number; postTapT: number }) {
    const PICK_COLOR = "#a5e8e6";
    const sheetY = (1 - Easing.easeOutCubic(sheetT)) * 360;
    const buttonScale = 1 - postTapT * 0.08;
    const buttonGlow = postTapT > 0 ? Easing.easeOutCubic(postTapT) : 0;

    return (
        <div
            style={{
                position: "absolute",
                left: 24,
                right: 24,
                bottom: 24,
                transform: `translateY(${sheetY}px)`,
                background: "linear-gradient(180deg, rgba(20,28,42,0.96), rgba(8,12,22,0.98))",
                backdropFilter: "blur(8px)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 24,
                padding: "20px 22px 22px",
                boxShadow: "0 -20px 60px rgba(0,0,0,0.6)",
                zIndex: 30,
            }}
        >
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 14,
                }}
            >
                <div>
                    <div style={{ fontSize: 13, color: TEXT_DIM, fontWeight: 500 }}>Selected Pick</div>
                    <div style={{ fontSize: 19, fontWeight: 800, marginTop: 2 }}>1 pick selected</div>
                </div>
                <div
                    style={{
                        width: 26,
                        height: 26,
                        borderRadius: 13,
                        border: "1px solid rgba(255,255,255,0.2)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 13,
                        color: TEXT_DIM,
                    }}
                >
                    ⌄
                </div>
            </div>

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "auto 1fr auto",
                    gap: 12,
                    alignItems: "flex-start",
                    paddingTop: 14,
                    borderTop: "1px solid rgba(255,255,255,0.06)",
                }}
            >
                <div
                    style={{
                        width: 26,
                        height: 26,
                        borderRadius: 13,
                        border: "1.4px solid rgba(244,114,128,0.65)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        marginTop: 2,
                    }}
                >
                    <div style={{ width: 12, height: 1.4, background: "rgba(244,114,128,0.85)" }} />
                </div>
                <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: TEXT_DIM, fontWeight: 500 }}>Player points</div>
                    <div
                        style={{
                            fontSize: 19,
                            fontWeight: 700,
                            color: PICK_COLOR,
                            letterSpacing: "-0.01em",
                            marginTop: 3,
                            lineHeight: 1.25,
                        }}
                    >
                        Cade Cunningham - Over 29.5 Points
                    </div>
                    <div style={{ fontSize: 12, color: TEXT_DIMMER, marginTop: 4 }}>
                        DET @ ORL · May 1, 7:00 PM
                    </div>
                </div>
                <div
                    style={{
                        fontSize: 17,
                        fontWeight: 700,
                        color: TEXT,
                        fontVariantNumeric: "tabular-nums",
                    }}
                >
                    -114
                </div>
            </div>

            <div
                style={{
                    marginTop: 18,
                    padding: "14px 18px",
                    borderRadius: 12,
                    background:
                        "linear-gradient(135deg, rgba(96,165,250,0.18), rgba(56,189,248,0.08))",
                    border: "1px solid rgba(125,211,252,0.35)",
                }}
            >
                <div
                    style={{
                        fontSize: 12,
                        color: TEXT_DIM,
                        fontWeight: 500,
                        letterSpacing: "0.01em",
                    }}
                >
                    tier
                </div>
                <div style={{ fontSize: 17, fontWeight: 800, marginTop: 3, letterSpacing: "-0.01em" }}>
                    Edge · 25 pts
                </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
                <div
                    style={{
                        padding: "12px 26px",
                        border: `1.4px solid rgba(125,211,252,${0.6 + buttonGlow * 0.4})`,
                        borderRadius: 999,
                        background:
                            buttonGlow > 0
                                ? `linear-gradient(180deg, rgba(125,211,252,${0.18 + buttonGlow * 0.18}), rgba(125,211,252,0.06))`
                                : "rgba(125,211,252,0.04)",
                        fontSize: 16,
                        fontWeight: 700,
                        color: TEXT,
                        boxShadow:
                            buttonGlow > 0
                                ? `0 0 ${20 + buttonGlow * 30}px rgba(125,211,252,${0.3 + buttonGlow * 0.4})`
                                : "none",
                        transform: `scale(${buttonScale})`,
                    }}
                >
                    post to slip
                </div>
            </div>
        </div>
    );
}

type CursorPos = { x: number; y: number; opacity: number };

function Cursor({ pos }: { pos: CursorPos }) {
    if (pos.opacity <= 0) return null;
    return (
        <div
            style={{
                position: "absolute",
                left: pos.x,
                top: pos.y,
                width: 36,
                height: 42,
                pointerEvents: "none",
                opacity: pos.opacity,
                zIndex: 40,
                filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.5))",
            }}
        >
            <svg width="36" height="42" viewBox="0 0 36 42" fill="none">
                <path
                    d="M4 3 L4 32 L11 25 L15 35 L19 33 L15 23 L26 22 Z"
                    fill="white"
                    stroke="black"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                />
            </svg>
        </div>
    );
}
