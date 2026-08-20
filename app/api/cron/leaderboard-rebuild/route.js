import { NextResponse } from 'next/server';

/**
 * Fantasy contest leaderboard cron — DRAIN THE DIRTY QUEUE.
 *
 * The precomputed board behind `GET /group/contest-leaderboard/:contest_id` is
 * marked dirty by database triggers whenever a pick, slip or badge award that
 * feeds it changes. This job rebuilds those boards in the background so a
 * member's own request never has to: read-repair still runs as a safety net,
 * but it does the rebuild INSIDE their round trip, which is exactly what the
 * precomputed tables exist to avoid.
 *
 * SCHEDULE: `9-59/2` — every two minutes, offset to start at :09.
 *
 * The OFFSET is what matters. The ten-minute grading cycle finishes at :08, so
 * starting at :09 means the first sweep of each block trails every job that
 * writes a result:
 *
 *   :00  grade-picks                  :05  finalized-slips
 *   :01  feed-contest-grade-combo     :07  community-grade-picks
 *   :02  combo-grade-picks,           :08  venue-expire-sessions
 *        feed-contest-grade-pickem    :09  leaderboard-rebuild  <- full cycle
 *   :03  feed-contest-grade-td-psychic                             is settled
 *   :04  feed-contest-finalize-expired
 *
 * The CADENCE is what bounds staleness. The sweep interval is how long a member
 * can arrive at a dirty board and pay for the rebuild inside their own request
 * via read-repair — the sweeper existing is what keeps rebuilds off the hot
 * path, not what makes them correct. Two minutes keeps that window small.
 *
 * Landing on the same minute as a grading job (:11, :13, :15, :17 …) is
 * harmless: the triggers simply mark the board dirty again and the sweep two
 * minutes later rebuilds it. Nothing here can serve a wrong number, only an
 * older one, and a pass over an empty queue is cheap.
 */
export async function GET() {
    const start = Date.now();
    try {
        console.log('Cron Job Started: leaderboard-rebuild', new Date().toISOString());

        const response = await fetch(
            `${process.env.API_BASE_URL}/group/contest-leaderboard/cron-rebuild`,
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
                    message: "Backend leaderboard sweep failed",
                    backendResponse: data,
                    durationMs: Date.now() - start
                },
                { status: 500 }
            );
        }

        console.log('Cron Job Ended: leaderboard-rebuild', new Date().toISOString());
        return NextResponse.json({
            success: true,
            message: 'Cron job "leaderboard-rebuild" executed successfully.',
            backendResponse: data,
            timestamp: new Date().toISOString(),
            durationMs: Date.now() - start,
        });

    } catch (error) {
        console.error('Cron job "leaderboard-rebuild" error:', error);
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
