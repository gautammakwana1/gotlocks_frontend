"use client";

import { useParams } from "next/navigation";
import ArenaDashboard from "@/components/arenas/ArenaDashboard";
import ArenaCheckoutReturn from "@/components/billing/ArenaCheckoutReturn";

const ArenaPage = () => {
    const params = useParams<{ arenaId: string }>();
    return (
        <>
            {/* Stripe's success_url lands here. Renders nothing unless the URL
                carries a completed checkout, so it costs the normal page view
                nothing. */}
            <ArenaCheckoutReturn arenaId={params.arenaId} />
            <ArenaDashboard arenaId={params.arenaId} />
        </>
    );
};

export default ArenaPage;
