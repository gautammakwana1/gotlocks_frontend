import { NextResponse } from 'next/server';

/**
 * Grades Arena / League COMMUNITY picks — singles and combos alike — and credits
 * each win to the poster's global XP, under the same daily capacity the profile
 * picks use.
 *
 * Distinct from the two graders beside it: `apply-grading` and
 * `apply-combo-grading` cover profile picks, and contest entries are excluded
 * here by `feed_contest_id IS NULL`. Scheduled on the same 10-minute cycle at an
 * offset none of the other /pick jobs use.
 */
export async function GET() {
    const start = Date.now();
    try {
        console.log('Cron Job Start: -> Community Pick <-', new Date().toISOString());

        const response = await fetch(
            `${process.env.API_BASE_URL}/pick/apply-community-grading`,
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
                    message: "Backend community pick grading failed",
                    backendResponse: data,
                    durationMs: Date.now() - start
                },
                { status: 500 }
            );
        }

        console.log('Cron Job End: -> Community Pick <-', new Date().toISOString());
        return NextResponse.json({
            success: true,
            message: 'Cron job "community-grade-picks" executed successfully.',
            backendResponse: data,
            timestamp: new Date().toISOString(),
            durationMs: Date.now() - start,
        });

    } catch (error) {
        console.error('Cron job "community-grade-picks" error:', error);
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
