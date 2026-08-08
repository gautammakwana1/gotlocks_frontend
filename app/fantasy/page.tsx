"use client";

import LeagueHub from "@/components/leagues/LeagueHub";
import OnboardingModal from "@/components/modals/OnboardingModal";
import { RootState } from "@/lib/interfaces/interfaces";
import { GROUP_TUTORIAL } from "@/lib/onboarding/tutorials";
import { updateTutorialProgressRequest } from "@/lib/redux/slices/progressSlice";
import { Suspense } from "react";
import { useDispatch, useSelector } from "react-redux";

const FantasyPage = () => {
    const dispatch = useDispatch();
    const { hasSeenGroupIntro, hasSeenWelcomeIntro } = useSelector((state: RootState) => state.progress);

    const handleCompleteLeagueIntro = () => {
        dispatch(updateTutorialProgressRequest({ tutorial_key: "group" }));
    }

    return (
        <Suspense
            fallback={
                <div className="text-sm text-gray-400" role="status">
                    Preparing Leagues…
                </div>
            }
        >
            <LeagueHub />
            <OnboardingModal
                open={hasSeenWelcomeIntro && !hasSeenGroupIntro}
                steps={GROUP_TUTORIAL}
                onClose={handleCompleteLeagueIntro}
                finalCtaLabel="finish"
            />
        </Suspense >
    )
};

export default FantasyPage;
