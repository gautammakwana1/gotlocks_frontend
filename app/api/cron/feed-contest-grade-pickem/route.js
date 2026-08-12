import { NextResponse } from 'next/server';

/**
 * Feed contest cron 3 of 4 — GRADE SUNDAY PICK'EM cards.
 *
 * Separate from the combo job because the scoring MODEL differs, not merely the
 * configuration: a card scores each selection independently and sums them, so
 * two of five correct still pays for two. A card mid-slate has its running total
 * rewritten on every run, which is what makes the board move as games finish.
 */
export async function GET() {
    const start = Date.now();
    try {
        console.log('Cron Job Started: feed-contest-grade-pickem', new Date().toISOString());

        const response = await fetch(
            `${process.env.API_BASE_URL}/group/feed-contest/cron-grade-pickem-cards`,
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
                    message: "Backend feed contest pick'em grading failed",
                    backendResponse: data,
                    durationMs: Date.now() - start
                },
                { status: 500 }
            );
        }

        console.log('Cron Job Ended: feed-contest-grade-pickem', new Date().toISOString());
        return NextResponse.json({
            success: true,
            message: 'Cron job "feed-contest-grade-pickem" executed successfully.',
            backendResponse: data,
            timestamp: new Date().toISOString(),
            durationMs: Date.now() - start,
        });

    } catch (error) {
        console.error('Cron job "feed-contest-grade-pickem" error:', error);
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
