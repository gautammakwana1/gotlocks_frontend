import { NextResponse } from 'next/server';

/**
 * Feed contest cron 1 of 4 — LOCK.
 *
 * Locks every OPEN contest whose locks_at has passed and settles its field.
 * Runs first in the chain: nothing can be graded until its contest is locked.
 */
export async function GET() {
    const start = Date.now();
    try {
        console.log('Cron Job Started: feed-contest-lock-expired', new Date().toISOString());

        const response = await fetch(
            `${process.env.API_BASE_URL}/group/feed-contest/cron-lock-expired`,
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
                    message: "Backend feed contest lock failed",
                    backendResponse: data,
                    durationMs: Date.now() - start
                },
                { status: 500 }
            );
        }

        console.log('Cron Job Ended: feed-contest-lock-expired', new Date().toISOString());
        return NextResponse.json({
            success: true,
            message: 'Cron job "feed-contest-lock-expired" executed successfully.',
            backendResponse: data,
            timestamp: new Date().toISOString(),
            durationMs: Date.now() - start,
        });

    } catch (error) {
        console.error('Cron job "feed-contest-lock-expired" error:', error);
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
