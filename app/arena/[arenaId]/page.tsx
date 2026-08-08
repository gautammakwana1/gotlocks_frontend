"use client";

import { useParams } from "next/navigation";
import ArenaDashboard from "@/components/arenas/ArenaDashboard";

const ArenaPage = () => {
    const params = useParams<{ arenaId: string }>();
    return <ArenaDashboard arenaId={params.arenaId} />;
};

export default ArenaPage;
