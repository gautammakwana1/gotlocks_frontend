"use client";

import type { ReactNode } from "react";
import { EmbedStage } from "./engine";
import { GlobalScene1 } from "./GlobalScene1";
import { GlobalScene2 } from "./GlobalScene2";
import { GlobalScene3 } from "./GlobalScene3";

// Design defaults locked in from the design bundle (Profile Tutorial.html):
// speed 1.15, duration 7.5, showText false. Scene 2 runs shorter per user
// tweak: duration 4.
const SPEED = 1.15;
const DURATION = 7.5;
const SCENE2_DURATION = 4;

function StageWrap({
    children,
    duration = DURATION,
}: {
    children: ReactNode;
    duration?: number;
}) {
    return (
        <div style={{ position: "absolute", inset: 0 }}>
            <EmbedStage width={800} height={1000} duration={duration} speed={SPEED}>
                {children}
            </EmbedStage>
        </div>
    );
}

export const GlobalStep1Animation = () => (
    <StageWrap>
        <GlobalScene1 showText={false} />
    </StageWrap>
);

export const GlobalStep2Animation = () => (
    <StageWrap duration={SCENE2_DURATION}>
        <GlobalScene2 showText={false} />
    </StageWrap>
);

export const GlobalStep3Animation = () => (
    <StageWrap>
        <GlobalScene3 showText={false} />
    </StageWrap>
);
