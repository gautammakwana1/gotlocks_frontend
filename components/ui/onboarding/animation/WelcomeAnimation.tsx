"use client";

import type { ReactNode } from "react";
import { EmbedStage } from "./engine";
import { WelcomeScene1 } from "./WelcomeScene1";
import { WelcomeScene2 } from "./WelcomeScene2";
import { WelcomeScene3 } from "./WelcomeScene3";

// Design defaults locked in from the design bundle (Welcome Tutorial.html):
// speed 1.6, duration 6, showText false, variations [3, 2, 2].
const SPEED = 1.6;
const DURATION = 6;

function StageWrap({ children }: { children: ReactNode }) {
    return (
        <div style={{ position: "absolute", inset: 0 }}>
            <EmbedStage width={800} height={1000} duration={DURATION} speed={SPEED}>
                {children}
            </EmbedStage>
        </div>
    );
}

export const WelcomeStep1Animation = () => (
    <StageWrap>
        <WelcomeScene1 showText={false} />
    </StageWrap>
);

export const WelcomeStep2Animation = () => (
    <StageWrap>
        <WelcomeScene2 showText={false} />
    </StageWrap>
);

export const WelcomeStep3Animation = () => (
    <StageWrap>
        <WelcomeScene3 showText={false} />
    </StageWrap>
);
