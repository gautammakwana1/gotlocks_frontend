import { NextResponse } from 'next/server';

/**
 * Venue Check-In housekeeping — sweeps every check-in session past its
 * expires_at into 'expired'.
 *
 * HOUSEKEEPING, NOT ENFORCEMENT. Every reader on the entry path already tests
 * `expires_at` against the clock as well as the status — `getActiveVenueCheckInSession`
 * does both halves on purpose — so a lapsed session unlocks nothing while it
 * waits to be swept. This job exists so the stored rows stop disagreeing with
 * those readers: the staff panel's "N checked in now", the disable confirmation's
 * revocation count and the activity numbers all read `status` directly.
 *
 * That is also why the schedule is relaxed rather than urgent. Ten minutes of
 * drift costs an over-count on a staff panel, never an entry somebody should not
 * have had.
 *
 * The backend batches 500 at a time inside a ~50 s budget and returns
 * `timedOut: true` when it ran out of room with work left. That is not an error —
 * the next tick continues — but it is the signal that the schedule is too slow
 * for the volume, so it is logged loudly rather than buried in the payload.
 */
export async function GET() {
    const start = Date.now();
    try {
        console.log('Cron Job Started: venue-expire-sessions', new Date().toISOString());

        const response = await fetch(
            `${process.env.API_BASE_URL}/group/venue/cron-expire-sessions`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    "Authorization": `Bearer ${process.env.CRON_SECRET}`
                },
                cache: "no-store",
            }
        );

        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Backend venue session expiry failed",
                    backendResponse: data,
                    durationMs: Date.now() - start
                },
                { status: 500 }
            );
        }

        if (data?.timedOut) {
            console.warn(
                'Cron Job "venue-expire-sessions" hit its time budget with work left —',
                `expired ${data.expired} in ${data.batches} batches.`,
                'Sessions are still being swept on the next tick, but the schedule may be too slow for this volume.'
            );
        }

        console.log('Cron Job Ended: venue-expire-sessions', new Date().toISOString());
        return NextResponse.json({
            success: true,
            message: 'Cron job "venue-expire-sessions" executed successfully.',
            backendResponse: data,
            timestamp: new Date().toISOString(),
            durationMs: Date.now() - start,
        });

    } catch (error) {
        console.error('Cron job "venue-expire-sessions" error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error.message,
                durationMs: Date.now() - start
            },
            { status: 500 }
        );
    }
}
