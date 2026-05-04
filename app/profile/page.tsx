"use client";

import ProfileView from "@/components/profile/ProfileView";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { fetchFollowersListRequest, fetchMemberProfileRequest } from "@/lib/redux/slices/authSlice";
import { useEffect } from "react";
import { useDispatch } from "react-redux";

const ProfilePage = () => {
    const dispatch = useDispatch();
    const currentUser = useCurrentUser();

    useEffect(() => {
        if (currentUser?.userId) {
            dispatch(fetchMemberProfileRequest({ userId: currentUser?.userId }));
            dispatch(fetchFollowersListRequest());
        }
    }, [currentUser?.userId, dispatch]);

    // const handleCompleteSocialIntro = () => {
    //     dispatch(updateTutorialProgressRequest({ tutorial_key: "social" }));
    // }

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