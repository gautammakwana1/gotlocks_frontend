"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

const LeagueLeaderboardRedirectPage = () => {
    const params = useParams<{ leagueId: string }>();
    const router = useRouter();

    useEffect(() => {
        if (!params.leagueId) return;
        router.replace(`/league/${params.leagueId}`);
    }, [params.leagueId, router]);

    return null;
};

export default LeagueLeaderboardRedirectPage;
