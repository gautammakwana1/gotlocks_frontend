import { NextResponse } from 'next/server';

/**
 * Fantasy contest leaderboard cron — SEED BOARDS THAT DO NOT EXIST YET.
 *
 * The dirty-queue triggers only ever UPDATE a board row; they never INSERT one.
 * That is deliberate — `startNewContestRound` creates a fresh leaderboard every
 * round, so blindly materializing a board for every contest would build rows
 * nobody ever reads. The consequence is that a contest which has never been
 * read has nothing for the triggers to mark, so the sweeper cannot see it.
 *
 * This job closes that gap: it inserts board rows for ACTIVE contests that lack
 * one, each seeded DIRTY, so `leaderboard-rebuild` builds them on its next pass.
 *
 * WHY ONCE A DAY, AT 06:00 UTC. It is a backstop, not part of the scoring
 * cycle. A board that a member actually opens is created by read-repair inside
 * that request, so the only rows this ever seeds belong to contests nobody has
 * looked at yet — there is nothing to gain from running it more often, and it
 * scans contests rather than a queue. 06:00 UTC is deliberately outside the
 * evening window when the grading jobs are busiest.
 */
export async function GET() {
    const start = Date.now();
    try {
        console.log('Cron Job Started: leaderboard-backfill', new Date().toISOString());

        const response = await fetch(
            `${process.env.API_BASE_URL}/group/contest-leaderboard/cron-backfill`,
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
                    message: "Backend leaderboard backfill failed",
                    backendResponse: data,
                    durationMs: Date.now() - start
                },
                { status: 500 }
            );
        }

        console.log('Cron Job Ended: leaderboard-backfill', new Date().toISOString());
        return NextResponse.json({
            success: true,
            message: 'Cron job "leaderboard-backfill" executed successfully.',
            backendResponse: data,
            timestamp: new Date().toISOString(),
            durationMs: Date.now() - start,
        });

    } catch (error) {
        console.error('Cron job "leaderboard-backfill" error:', error);
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
