import { NextResponse } from 'next/server';

/**
 * Feed contest cron 4 of 4 — FINALIZE. locked|grading -> final.
 *
 * MUST be scheduled after the two grading jobs (see vercel.json): whatever they
 * settle first is read here rather than recomputed, and only what they could not
 * resolve gets voided. Per contest it runs a last grader sweep, voids unresolved
 * legs, ranks the board, awards the winning_places window, writes the points
 * ledger and group rollup, then flips the contest LAST — which is what makes it
 * safe to re-run after a partial failure.
 */
export async function GET() {
    const start = Date.now();
    try {
        console.log('Cron Job Started: feed-contest-finalize-expired', new Date().toISOString());

        const response = await fetch(
            `${process.env.API_BASE_URL}/group/feed-contest/cron-finalize-expired`,
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
                    message: "Backend feed contest finalization failed",
                    backendResponse: data,
                    durationMs: Date.now() - start
                },
                { status: 500 }
            );
        }

        console.log('Cron Job Ended: feed-contest-finalize-expired', new Date().toISOString());
        return NextResponse.json({
            success: true,
            message: 'Cron job "feed-contest-finalize-expired" executed successfully.',
            backendResponse: data,
            timestamp: new Date().toISOString(),
            durationMs: Date.now() - start,
        });

    } catch (error) {
        console.error('Cron job "feed-contest-finalize-expired" error:', error);
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
