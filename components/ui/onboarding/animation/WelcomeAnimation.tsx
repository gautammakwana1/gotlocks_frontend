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

function StageWrap({
    children,
    height = 1000,
    speed = SPEED,
}: {
    children: ReactNode;
    height?: number;
    speed?: number;
}) {
    return (
        <div style={{ position: "absolute", inset: 0 }}>
            <EmbedStage width={800} height={height} duration={DURATION} speed={speed}>
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

export const WelcomeStep2Animation = ({ compact = false }: { compact?: boolean }) => (
    <StageWrap height={compact ? 500 : 1000} speed={compact ? 0.65 : SPEED}>
        <WelcomeScene2 compact={compact} showText={false} />
    </StageWrap>
);

export const WelcomeStep3Animation = () => (
    <StageWrap>
        <WelcomeScene3 showText={false} />
    </StageWrap>
);
