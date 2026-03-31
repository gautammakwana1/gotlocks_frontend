"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

const GroupSettingsRedirectPage = () => {
    const params = useParams<{ groupId: string }>();
    const router = useRouter();

    useEffect(() => {
        if (!params.groupId) return;
        router.replace(`/group/${params.groupId}?tab=members`);
    }, [params.groupId, router]);

    return null;
};

export default GroupSettingsRedirectPage;
