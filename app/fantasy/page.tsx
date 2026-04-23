"use client";

import OnboardingModal from "@/components/modals/OnboardingModal";
import GroupsTab from "@/components/profile/GroupsTab";
import { RootState } from "@/lib/interfaces/interfaces";
import { GROUP_TUTORIAL } from "@/lib/onboarding/tutorials";
import { updateTutorialProgressRequest } from "@/lib/redux/slices/progressSlice";
import { useDispatch, useSelector } from "react-redux";

const FantasyPage = () => {
    const dispatch = useDispatch();
    const { hasSeenGroupIntro, hasSeenWelcomeIntro } = useSelector((state: RootState) => state.progress);

    const handleCompleteGroupIntro = () => {
        dispatch(updateTutorialProgressRequest({ tutorial_key: "groups" }));
    }

    return (
        <>
            <GroupsTab />
            <OnboardingModal
                open={hasSeenWelcomeIntro && !hasSeenGroupIntro}
                steps={GROUP_TUTORIAL}
                onClose={handleCompleteGroupIntro}
            />
        </>
    )
};

export default FantasyPage;
