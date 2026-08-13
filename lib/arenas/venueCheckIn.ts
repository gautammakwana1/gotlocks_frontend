/* ----------------------------------------------------------------------------
 * VENUE CHECK-IN — the client-side half of the policy, ported from the MVP's
 * lib/arenas/checkin/{policy,location}.ts.
 *
 * Only the parts a BROWSER needs live here: the option lists the setup form
 * offers, and the adapter that reads this device's location. The geofence
 * decision itself is deliberately NOT ported — `venue.helper.ts` owns it
 * server-side, reads the coordinates on that one path and answers with a
 * verdict rather than a location, and a second copy here would be a second
 * chance for the two to disagree about who is inside the room.
 *
 * The three numbers below are the SAME product decision as
 * `src/utils/venueConstant.ts`; the configure endpoint validates against its own
 * copy, so a drift here surfaces as a 400 rather than a wrong save.
 * -------------------------------------------------------------------------- */

/** group_venues.verification_radius_meters — a CHECK constraint, not a hint. */
export const VENUE_RADIUS_OPTIONS_METERS = [100, 150, 250] as const;
export const DEFAULT_VENUE_RADIUS_METERS = 150;

/** 240 minutes is what turns a 6:00 PM check-in into a 10:00 PM deadline. */
export const VENUE_CHECK_IN_DURATION_OPTIONS_MINUTES = [120, 240, 360] as const;
export const DEFAULT_VENUE_CHECK_IN_DURATION_MINUTES = 240;

/**
 * A reading vaguer than this cannot place anyone inside a 100–250 m circle. The
 * form refuses to SAVE one, because every later check-in is measured against
 * this point forever: a venue pinned from a ±800 m cell-tower fix puts the
 * geofence around the wrong block and every "you must be at the venue" refusal
 * afterwards is really this save's fault.
 */
export const VENUE_MAX_ACCEPTABLE_ACCURACY_METERS = 200;

/** Accuracy the watcher settles for early rather than burning the full timeout. */
export const VENUE_TARGET_ACCURACY_METERS = 50;

export const VENUE_LOCATION_TIMEOUT_MS = 10_000;

export type VenueLocationReading = {
    latitude: number;
    longitude: number;
    accuracyMeters: number;
};

export type VenueGeolocationFailureOutcome =
    | "permission_denied"
    | "location_unavailable"
    | "timed_out"
    | "unsupported"
    | "canceled";

export type VenueGeolocationResult =
    | { ok: true; reading: VenueLocationReading }
    | { ok: false; outcome: VenueGeolocationFailureOutcome };

export type VenueGeolocationRequestOptions = {
    timeoutMs?: number;
    targetAccuracyMeters?: number;
    signal?: AbortSignal;
};

export interface VenueGeolocationAdapter {
    requestBestReading(
        options: VenueGeolocationRequestOptions
    ): Promise<VenueGeolocationResult>;
}

/**
 * `watchPosition`, not `getCurrentPosition`: the first fix a phone returns is
 * routinely a coarse network estimate, and the GPS one arrives a second or two
 * later. Watching keeps the BEST reading seen so far, settles as soon as one is
 * good enough, and falls back to that best reading when the timeout fires —
 * which is the difference between "we couldn't locate you" and "we located you
 * to ±60 m", the second of which is perfectly usable for a 150 m geofence.
 */
export const browserVenueGeolocationAdapter: VenueGeolocationAdapter = {
    requestBestReading(options) {
        if (typeof navigator === "undefined" || !navigator.geolocation) {
            return Promise.resolve<VenueGeolocationResult>({
                ok: false,
                outcome: "unsupported",
            });
        }
        if (options.signal?.aborted) {
            return Promise.resolve<VenueGeolocationResult>({
                ok: false,
                outcome: "canceled",
            });
        }

        const timeoutMs = options.timeoutMs ?? VENUE_LOCATION_TIMEOUT_MS;
        const targetAccuracyMeters =
            options.targetAccuracyMeters ?? VENUE_TARGET_ACCURACY_METERS;

        return new Promise<VenueGeolocationResult>((resolve) => {
            let settled = false;
            let bestReading: VenueLocationReading | null = null;
            let watchId: number | null = null;
            let timeoutId: ReturnType<typeof setTimeout> | null = null;

            const finish = (result: VenueGeolocationResult) => {
                if (settled) return;
                settled = true;
                if (watchId !== null) navigator.geolocation.clearWatch(watchId);
                if (timeoutId !== null) clearTimeout(timeoutId);
                options.signal?.removeEventListener("abort", handleAbort);
                resolve(result);
            };
            const handleAbort = () => finish({ ok: false, outcome: "canceled" });

            options.signal?.addEventListener("abort", handleAbort, { once: true });
            timeoutId = setTimeout(() => {
                finish(
                    bestReading
                        ? { ok: true, reading: bestReading }
                        : { ok: false, outcome: "timed_out" }
                );
            }, timeoutMs);

            watchId = navigator.geolocation.watchPosition(
                (position) => {
                    const reading: VenueLocationReading = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracyMeters: position.coords.accuracy,
                    };
                    if (!bestReading || reading.accuracyMeters < bestReading.accuracyMeters) {
                        bestReading = reading;
                    }
                    if (reading.accuracyMeters <= targetAccuracyMeters) {
                        finish({ ok: true, reading });
                    }
                },
                (error) => {
                    if (error.code === error.PERMISSION_DENIED) {
                        finish({ ok: false, outcome: "permission_denied" });
                        return;
                    }
                    if (error.code === error.POSITION_UNAVAILABLE) {
                        finish({ ok: false, outcome: "location_unavailable" });
                        return;
                    }
                    finish({ ok: false, outcome: "timed_out" });
                },
                { enableHighAccuracy: true, maximumAge: 0, timeout: timeoutMs }
            );
        });
    },
};

/** One sentence per way the browser can refuse, each naming the fix. */
export const VENUE_LOCATION_ERROR_COPY: Record<
    VenueGeolocationFailureOutcome,
    string
> = {
    permission_denied:
        "Location access was denied. Enable it for this site, then try again from inside the venue.",
    location_unavailable:
        "We couldn’t read this device’s location. Check Location Services and try again.",
    timed_out:
        "We couldn’t get a reliable reading. Move near an entrance or window and try again.",
    unsupported:
        "This browser can’t capture the venue location. Try the device’s standard browser.",
    canceled: "Location confirmation was canceled.",
};
