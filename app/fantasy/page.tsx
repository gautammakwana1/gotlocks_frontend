"use client";

import OnboardingModal from "@/components/modals/OnboardingModal";
import LeaguesTab from "@/components/profile/GroupsTab";
import { RootState } from "@/lib/interfaces/interfaces";
import { LEAGUE_TUTORIAL } from "@/lib/onboarding/tutorials";
import { updateTutorialProgressRequest } from "@/lib/redux/slices/progressSlice";
import { useDispatch, useSelector } from "react-redux";

const FantasyPage = () => {
    const dispatch = useDispatch();
    const { hasSeenGroupIntro, hasSeenWelcomeIntro } = useSelector((state: RootState) => state.progress);

    const handleCompleteLeagueIntro = () => {
        dispatch(updateTutorialProgressRequest({ tutorial_key: "league" }));
    }

    return (
        <>
            <LeaguesTab />
            <OnboardingModal
                open={hasSeenWelcomeIntro && !hasSeenGroupIntro}
                steps={LEAGUE_TUTORIAL}
                onClose={handleCompleteLeagueIntro}
            />
        </>
    )
};

export default FantasyPage;
