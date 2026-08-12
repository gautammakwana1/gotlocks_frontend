"use client";

import { useParams } from "next/navigation";
import ContextualMemberCard from "@/components/community/ContextualMemberCard";

/**
 * One League member's record inside THIS League — reached from the Members tab.
 *
 * A League has two halves an Arena does not: slip (Fantasy) contests and the
 * League Feed. The card renders the Fantasy section only when the stats endpoint
 * reports `applies.fantasy`, so it stays correct if a League ever runs without
 * slips.
 */
const LeagueMemberCardPage = () => {
    const params = useParams<{ leagueId: string; userId: string }>();
    return (
        <ContextualMemberCard
            context="league"
            communityId={params.leagueId}
            userId={params.userId}
        />
    );
};

export default LeagueMemberCardPage;
