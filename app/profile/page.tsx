"use client";

import OnboardingModal from "@/components/modals/OnboardingModal";
import ProfileView from "@/components/profile/ProfileView";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { RootState } from "@/lib/interfaces/interfaces";
import { GLOBAL_TUTORIAL } from "@/lib/onboarding/tutorials";
import { fetchFollowersListRequest, fetchMemberProfileRequest } from "@/lib/redux/slices/authSlice";
import { updateTutorialProgressRequest } from "@/lib/redux/slices/progressSlice";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";

const ProfilePage = () => {
    const dispatch = useDispatch();
    const currentUser = useCurrentUser();
    const { hasSeenSocialIntro, hasSeenWelcomeIntro } = useSelector((state: RootState) => state.progress);

    useEffect(() => {
        if (currentUser?.userId) {
            dispatch(fetchMemberProfileRequest({ userId: currentUser?.userId }));
            dispatch(fetchFollowersListRequest());
        }
    }, [currentUser?.userId]);

    const handleCompleteSocialIntro = () => {
        dispatch(updateTutorialProgressRequest({ tutorial_key: "social" }));
    }

    if (!currentUser) return null;

    return (
        <ProfileView targetUserId={currentUser.userId} mode="self" currentUser={currentUser} />
        // <>
        //     <OnboardingModal
        //         open={hasSeenWelcomeIntro && !hasSeenSocialIntro}
        //         steps={GLOBAL_TUTORIAL}
        //         onClose={handleCompleteSocialIntro}
        //     />
        // </>
    );
};

export default ProfilePage;