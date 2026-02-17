"use client";

import { useParams } from "next/navigation";
import BackButton from "@/components/ui/BackButton";
import ProfileView from "@/components/profile/ProfileView";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";

const UserProfilePage = () => {
    const params = useParams<{ userId: string }>();
    const currentUser = useCurrentUser();

    if (!currentUser) return null;

    return (
        <div className="space-y-6">
            <BackButton fallback="/profile" />
            <ProfileView targetUserId={params.userId} mode="public" showFollowControls currentUser={currentUser} />
        </div>
    );
};

export default UserProfilePage;
