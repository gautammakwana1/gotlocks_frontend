"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import VenueCheckInScreen from "@/components/arenas/checkin/VenueCheckInScreen";

/**
 * What the printed venue QR points at — `VENUE_CHECK_IN_PATH` + the token, as
 * `buildVenueCheckInUrl` composes it server-side.
 *
 * PUBLIC: whoever scanned the poster may have no account at all, and the page
 * still has to say whose Arena this is. `/check-in` is in AuthProvider's
 * PUBLIC_ROUTES for exactly that reason — without it a first-time customer is
 * bounced to /landing-page and the sign-in rung is unreachable.
 */
const VenueCheckInPage = () => {
    const params = useParams<{ token: string }>();
    const token = params.token as string;

    return (
        // `?returnTo=` and `?preview=customer` are read with useSearchParams,
        // which opts the whole route out of static prerendering without a
        // boundary.
        <Suspense
            fallback={
                <div className="px-5 py-10 text-sm text-gray-400" role="status">
                    Opening venue check-in…
                </div>
            }
        >
            <VenueCheckInScreen publicToken={token} />
        </Suspense>
    );
};

export default VenueCheckInPage;
