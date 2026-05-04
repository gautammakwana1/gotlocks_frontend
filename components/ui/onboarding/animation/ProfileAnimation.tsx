"use client";

import type { ReactNode } from "react";
import { EmbedStage } from "./engine";
import { ProfileScene1 } from "./ProfileScene1";
import { ProfileScene2 } from "./ProfileScene2";
import { ProfileScene3 } from "./ProfileScene3";

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

export const ProfileStep1Animation = () => (
    <StageWrap>
        <ProfileScene1 showText={false} />
    </StageWrap>
);

export const ProfileStep2Animation = () => (
    <StageWrap duration={SCENE2_DURATION}>
        <ProfileScene2 showText={false} />
    </StageWrap>
);

export const ProfileStep3Animation = () => (
    <StageWrap>
        <ProfileScene3 showText={false} />
    </StageWrap>
);
