import { NextResponse } from 'next/server';

/**
 * Feed contest cron — GRADE TD PSYCHIC cards.
 *
 * Its own job because the model is neither of the other two. A combo pays only
 * if every leg lands; a Pick'em card sums its selections. A TD card does both
 * halves separately: only a perfect 3-of-3 earns points (from the COMBINED
 * lock-time price), while the correct COUNT still decides placement — so a card
 * sitting at one loss with two scorers left is not finished, unlike a combo.
 *
 * Refuses any contest whose lock prices were never captured, rather than
 * settling its field at zero. That is why this runs AFTER
 * `feed-contest-capture-td-prices` (:03 against its every-two-minutes) and
 * before `feed-contest-finalize-expired` (:04), which reads what this settled
 * instead of recomputing it and voids only what could not be resolved.
 */
export async function GET() {
    const start = Date.now();
    try {
        console.log('Cron Job Started: feed-contest-grade-td-psychic', new Date().toISOString());

        const response = await fetch(
            `${process.env.API_BASE_URL}/group/feed-contest/cron-grade-td-psychic-cards`,
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
                    message: "Backend TD Psychic card grading failed",
                    backendResponse: data,
                    durationMs: Date.now() - start
                },
                { status: 500 }
            );
        }

        console.log('Cron Job Ended: feed-contest-grade-td-psychic', new Date().toISOString());
        return NextResponse.json({
            success: true,
            message: 'Cron job "feed-contest-grade-td-psychic" executed successfully.',
            backendResponse: data,
            timestamp: new Date().toISOString(),
            durationMs: Date.now() - start,
        });

    } catch (error) {
        console.error('Cron job "feed-contest-grade-td-psychic" error:', error);
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
