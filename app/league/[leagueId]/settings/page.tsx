"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

const GroupSettingsRedirectPage = () => {
    const params = useParams<{ leagueId: string }>();
    const router = useRouter();

    useEffect(() => {
        if (!params.leagueId) return;
        router.replace(`/league/${params.leagueId}?tab=settings`);
    }, [params.leagueId, router]);

    return null;
};

export default GroupSettingsRedirectPage;
