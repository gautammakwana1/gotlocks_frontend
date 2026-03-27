"use client";

import { useParams, useRouter } from "next/navigation";
import BackButton from "@/components/ui/BackButton";
import ProfileView from "@/components/profile/ProfileView";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import PublicProfilePostAlertsMenu from "@/components/profile/PublicProfilePostAlertsMenu";
import PublicProfileActionsMenu from "@/components/profile/PublicProfileActionMenu";
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { fetchFollowersListByIdRequest, fetchFollowingListByIdRequest, fetchMemberProfileRequest } from "@/lib/redux/slices/authSlice";

const UserProfilePage = () => {
    const params = useParams<{ userId: string }>();
    const router = useRouter();
    const dispatch = useDispatch();
    const currentUser = useCurrentUser();

    useEffect(() => {

        if (params.userId === currentUser?.userId) {
            router.replace("/profile");
        }
    }, [params.userId, router, currentUser?.userId]);

    useEffect(() => {
        if (params.userId) {
            dispatch(fetchMemberProfileRequest({ userId: params.userId }));
            dispatch(fetchFollowersListByIdRequest({ user_id: params.userId }));
            dispatch(fetchFollowingListByIdRequest({ user_id: params.userId }));
        }
    }, [params.userId]);

    if (!currentUser || params.userId === currentUser?.userId) return null;

    return (
        <div className="space-y-0.5">
            <div className="flex items-center justify-between gap-3">
                <BackButton
                    fallback="/profile"
                    className="self-center flex h-7 items-center text-[10px] tracking-[0.14em] sm:h-8 sm:text-[11px]"
                />
                <div className="flex items-center gap-1.5 sm:gap-2">
                    <PublicProfilePostAlertsMenu targetUserId={params.userId} mode="public" />
                    <PublicProfileActionsMenu targetUserId={params.userId} mode="public" />
                </div>
            </div>
            <ProfileView targetUserId={params.userId} mode="public" showFollowControls currentUser={currentUser} />
        </div>
    );
};

export default UserProfilePage;
