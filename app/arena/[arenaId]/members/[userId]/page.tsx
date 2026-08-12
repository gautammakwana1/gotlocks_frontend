"use client";

import { useParams } from "next/navigation";
import ContextualMemberCard from "@/components/community/ContextualMemberCard";

/**
 * One Arena member's record inside THIS Arena — reached from the Members tab.
 *
 * Deliberately not the global profile: everything here is scoped to the Arena
 * (its points, its contests, its community picks), and the global profile is one
 * link away in the header.
 */
const ArenaMemberCardPage = () => {
    const params = useParams<{ arenaId: string; userId: string }>();
    return (
        <ContextualMemberCard
            context="arena"
            communityId={params.arenaId}
            userId={params.userId}
        />
    );
};

export default ArenaMemberCardPage;
