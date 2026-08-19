import { NextResponse } from 'next/server';

/**
 * Feed contest cron — FREEZE THE SHARED TD PSYCHIC LOCK PRICES.
 *
 * The one job in this family that is not grading, and the one the whole TD
 * Psychic template rests on: it reads the latest trusted quote at or before each
 * contest's `locks_at` for every distinct scorer on an accepted card, stores one
 * immutable capture, and writes those prices onto the cards. The SAME scorer
 * therefore carries the SAME hidden price on every member's card — which is the
 * only way the correct-scorer tiebreak can compare two cards at all.
 *
 * ORDER IS A CORRECTNESS REQUIREMENT, not a preference. This must run AFTER
 * `feed-contest-lock-expired` and BEFORE `feed-contest-grade-td-psychic`: the
 * capture only looks at contests already flipped to a gradable status, and after
 * grading the cards would have been swept with no price and no grader key.
 *
 * WHICH IS WHY `feed-contest-lock-expired` RUNS EVERY TWO MINUTES rather than
 * every ten, and this one minute behind it. A TD Psychic contest's `locks_at` is
 * forced server-side to earliest kickoff MINUS FIVE MINUTES, so the capture has
 * a five-minute window before the ball is in the air — and it cannot even SEE a
 * contest until the lock job has flipped it. On a ten-minute lock cadence a
 * contest locking at 13:04 is still 'open' at 13:04, 13:06 and 13:08, first
 * becomes visible at 13:10, and gets captured three minutes AFTER kickoff: every
 * member holding a scorer in that game is then priced at a live in-play quote,
 * frozen immutably onto their card, and that price drives both the points award
 * and the correct-scorer tiebreak. Only contests locking in the last ~3 minutes
 * of each block would have made it. On the two-minute cadence, with this job one
 * minute behind the lock, the lag is 1-3 minutes — inside the lead and inside the
 * backend's 300s "late capture" threshold.
 *
 * The lock job is idempotent and the capture skips contests already captured, so
 * the extra runs cost a no-op query each.
 */
export async function GET() {
    const start = Date.now();
    try {
        console.log('Cron Job Started: feed-contest-capture-td-prices', new Date().toISOString());

        const response = await fetch(
            `${process.env.API_BASE_URL}/group/feed-contest/cron-capture-td-lock-prices`,
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
                    message: "Backend TD Psychic lock-price capture failed",
                    backendResponse: data,
                    durationMs: Date.now() - start
                },
                { status: 500 }
            );
        }

        console.log('Cron Job Ended: feed-contest-capture-td-prices', new Date().toISOString());
        return NextResponse.json({
            success: true,
            message: 'Cron job "feed-contest-capture-td-prices" executed successfully.',
            backendResponse: data,
            timestamp: new Date().toISOString(),
            durationMs: Date.now() - start,
        });

    } catch (error) {
        console.error('Cron job "feed-contest-capture-td-prices" error:', error);
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
