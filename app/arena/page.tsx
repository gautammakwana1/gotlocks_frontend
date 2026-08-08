"use client";

import { Suspense } from "react";
import ArenaHub from "@/components/arenas/ArenaHub";

const ArenasPage = () => (
    <Suspense
        fallback={
            <div className="text-sm text-gray-400" role="status">
                Preparing Arenas…
            </div>
        }
    >
        <ArenaHub />
    </Suspense>
);

export default ArenasPage;
