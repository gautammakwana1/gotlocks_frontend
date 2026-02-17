"use client";

import ProfileView from "@/components/profile/ProfileView";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";

const ProfilePage = () => {
    const currentUser = useCurrentUser();

    if (!currentUser) return null;

    return <ProfileView targetUserId={currentUser.userId} mode="self" currentUser={currentUser} />;
};

export default ProfilePage;