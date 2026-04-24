import { NextResponse } from 'next/server';

export async function GET() {
    const start = Date.now();
    try {
        const response = await fetch(
            `${process.env.API_BASE_URL}/slip/cron-auto-finalized`,
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
                    message: "Backend slip finalize failed",
                    backendResponse: data,
                    durationMs: Date.now() - start
                },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Cron job "finalized-slips" executed successfully.',
            backendResponse: data,
            timestamp: new Date().toISOString(),
            durationMs: Date.now() - start,
        });
    } catch (err) {
        const message =
            err instanceof Error ? err.message : "Unknown error occurred";

        console.error("finalized-slips Cron Error:", message);
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
