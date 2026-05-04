"use client";

import type { ReactNode } from "react";
import { EmbedStage } from "./engine";
import { LeagueScene1 } from "./LeagueScene1";
import { LeagueScene2 } from "./LeagueScene2";
import { LeagueScene3 } from "./LeagueScene3";

// Design defaults locked in from the design bundle (Group Tutorial.html):
// speed 1.25, duration 6, showText false. Scene 3 runs slower/longer per
// user tweak: speed 0.8, duration 7.5.
const SPEED = 1.25;
const DURATION = 6;
const SCENE3_SPEED = 0.8;
const SCENE3_DURATION = 7.5;

function StageWrap({
    children,
    speed = SPEED,
    duration = DURATION,
}: {
    children: ReactNode;
    speed?: number;
    duration?: number;
}) {
    return (
        <div style={{ position: "absolute", inset: 0 }}>
            <EmbedStage width={800} height={1000} duration={duration} speed={speed}>
                {children}
            </EmbedStage>
        </div>
    );
}

export const LeagueStep1Animation = () => (
    <StageWrap>
        <LeagueScene1 showText={false} />
    </StageWrap>
);

export const LeagueStep2Animation = () => (
    <StageWrap>
        <LeagueScene2 showText={false} />
    </StageWrap>
);

export const LeagueStep3Animation = () => (
    <StageWrap speed={SCENE3_SPEED} duration={SCENE3_DURATION}>
        <LeagueScene3 showText={false} />
    </StageWrap>
);
