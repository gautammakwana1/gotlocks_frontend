import { formatContestDateTime } from "@/lib/contests/feedContestCatalog";
import type { VenueCheckInDetailData } from "@/lib/interfaces/interfaces";

/* ----------------------------------------------------------------------------
 * "Check in at the venue to enter" — the MVP's VenueContestAccessPanel
 * (gotlocks.app_mvp2/components/contests/StructuredContestDetail.tsx:2855),
 * shown on a venue-required contest whenever the member has no live session.
 *
 * The three sentences below ARE the product's explanation of the feature, so
 * they are the MVP's verbatim. What is added here is the second paragraph's
 * variation: the server distinguishes a first-timer from someone whose session
 * expired and from someone whose session was revoked, and "scan the QR to check
 * in" is the wrong sentence for the last two — one did everything right and the
 * window closed, the other cannot fix it at the QR at all.
 * -------------------------------------------------------------------------- */

export type VenueContestAccessPanelProps = {
    /** The venue as `/group/venue/detail` describes it, when it has been read. */
    venue?: VenueCheckInDetailData["venue_check_in"]["venue"] | null;
    /** `session.last_status` — 'expired' and 'revoked' each get their own copy. */
    lastStatus?: string | null;
    lastExpiresAt?: string | null;
    revocationReason?: string | null;
    /** Drops the outer radius so the panel can sit flush inside another card. */
    compact?: boolean;
};

const situationCopy = ({
    lastStatus,
    lastExpiresAt,
    revocationReason,
}: Pick<
    VenueContestAccessPanelProps,
    "lastStatus" | "lastExpiresAt" | "revocationReason"
>) => {
    if (lastStatus === "revoked") {
        return {
            heading: "Your venue check-in was ended",
            body:
                revocationReason?.trim() ||
                "This Arena's staff ended your check-in session. Scan the venue QR again while you're at the location to start a new one.",
        };
    }
    if (lastStatus === "expired") {
        return {
            heading: "Your venue check-in has expired",
            body: lastExpiresAt
                ? `It ended ${formatContestDateTime(lastExpiresAt)}. Scan this Arena's venue QR again while you're at the location to start a new session.`
                : "Scan this Arena's venue QR again while you're at the location to start a new session.",
        };
    }
    return {
        heading: "Check in at the venue to enter",
        body: "Scan this Arena's venue QR while you're at the location. gotLocks will verify your location once and unlock your contest entry session.",
    };
};

export const VenueContestAccessPanel = ({
    venue,
    lastStatus,
    lastExpiresAt,
    revocationReason,
    compact = false,
}: VenueContestAccessPanelProps) => {
    const { heading, body } = situationCopy({
        lastStatus,
        lastExpiresAt,
        revocationReason,
    });

    return (
        <section
            aria-label="Venue check-in required"
            data-venue-entry-access="required"
            className={`${compact ? "" : "rounded-2xl"} border border-violet-300/25 bg-violet-500/[0.08] p-5`}
        >
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-violet-200">
                In-person contest
            </p>
            <h2 className="mt-2 text-lg font-semibold text-white">{heading}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-300">{body}</p>
            {venue?.name ? (
                <p className="mt-3 text-sm font-semibold text-white">
                    {venue.name}
                    {venue.display_address ? (
                        <span className="ml-2 font-normal text-gray-400">
                            {venue.display_address}
                        </span>
                    ) : null}
                </p>
            ) : null}
            <p className="mt-4 text-sm font-semibold text-violet-100">
                Scan venue QR → Verify location → Build entry
            </p>
            <p className="mt-3 text-xs leading-5 text-gray-500">
                This contest requires an active venue check-in before an entry can be
                accepted. Your location is not continuously tracked.
                {venue?.check_in_duration_minutes
                    ? ` A check-in lasts ${venue.check_in_duration_minutes / 60} hours.`
                    : ""}
            </p>
            <p className="mt-4 inline-flex rounded-xl border border-violet-200/30 bg-violet-500/10 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.09em] text-violet-100">
                Scan the venue QR to enter
            </p>
        </section>
    );
};

export default VenueContestAccessPanel;
