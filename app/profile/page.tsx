"use client";

import ProfileView from "@/components/profile/ProfileView";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { fetchFollowersListByIdRequest, fetchFollowersListRequest, fetchFollowingListByIdRequest, fetchFollowingListRequest, fetchMemberProfileRequest } from "@/lib/redux/slices/authSlice";
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
    }, [currentUser?.userId]);

    if (!currentUser) return null;

    return <ProfileView targetUserId={currentUser.userId} mode="self" currentUser={currentUser} />;
};

export default ProfilePage;