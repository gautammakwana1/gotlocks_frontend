import { NextResponse } from 'next/server';

/**
 * Feed contest cron 2 of 4 — GRADE GENERAL COMBO entries.
 *
 * Scoped to the multi_pick template on purpose: a combo pays nothing unless
 * every leg lands, so it is graded as one priced parlay. Pick'em cards score
 * per leg and get their own job.
 */
export async function GET() {
    const start = Date.now();
    try {
        console.log('Cron Job Started: feed-contest-grade-combo', new Date().toISOString());

        const response = await fetch(
            `${process.env.API_BASE_URL}/group/feed-contest/cron-grade-combo-entries`,
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
                    message: "Backend feed contest combo grading failed",
                    backendResponse: data,
                    durationMs: Date.now() - start
                },
                { status: 500 }
            );
        }

        console.log('Cron Job Ended: feed-contest-grade-combo', new Date().toISOString());
        return NextResponse.json({
            success: true,
            message: 'Cron job "feed-contest-grade-combo" executed successfully.',
            backendResponse: data,
            timestamp: new Date().toISOString(),
            durationMs: Date.now() - start,
        });

    } catch (error) {
        console.error('Cron job "feed-contest-grade-combo" error:', error);
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
