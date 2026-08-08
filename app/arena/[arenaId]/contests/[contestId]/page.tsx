"use client";

import { useParams } from "next/navigation";
import StructuredContestDetail from "@/components/contests/StructuredContestDetail";

// Thin wrapper like /arena/[arenaId]/page.tsx: the detail component reads the
// contest, arena role, and hosting state from Redux and enforces its own access —
// every operate rule (role, unlock, hosting, lifecycle) is re-checked server-side.
const ArenaContestDetailPage = () => {
    const params = useParams<{ arenaId: string; contestId: string }>();
    return (
        <StructuredContestDetail
            arenaId={params.arenaId}
            contestId={params.contestId}
        />
    );
};

export default ArenaContestDetailPage;
