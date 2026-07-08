import { NextResponse } from 'next/server';

export async function GET() {
    const start = Date.now();
    try {
        const response = await fetch(
            `${process.env.API_BASE_URL}/notification/cron-cleanup-push-receipts`,
            {
                method: 'GET',
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
                    message: "Backend Dead Push Notification clean failed",
                    backendResponse: data,
                    durationMs: Date.now() - start
                },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Cron job "Clean Push Receipts" executed successfully.',
            backendResponse: data,
            timestamp: new Date().toISOString(),
            durationMs: Date.now() - start,
        });
    } catch (err) {
        const message =
            err instanceof Error ? err.message : "Unknown error occurred";

        console.error("Clean Push Receipts Cron Error:", message);
        return NextResponse.json(
            {
                success: false,
                error: message,
                durationMs: Date.now() - start
            },
            { status: 500 }
        );
    }
}
