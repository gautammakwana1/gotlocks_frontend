import { NextResponse } from 'next/server';

export async function GET(req) {
    if (req.headers.get("x-vercel-cron") !== "1") {
        return new Response("Unauthorized", { status: 401 });
    }
    const start = Date.now();
    try {
        console.log('Cron Job Start: -> Combo Pick <-', new Date().toISOString());
        if (!process.env.CRON_SECRET) {
            throw new Error("CRON_SECRET is not defined in Vercel env");
        }

        const response = await fetch(
            `${process.env.API_BASE_URL}/pick/apply-combo-grading`,
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
                    message: "Backend grading failed",
                    backendResponse: data,
                    durationMs: Date.now() - start
                },
                { status: 500 }
            );
        }
        console.log('Cron Job Ended: -> Combo Pick <-', new Date().toISOString());
        return NextResponse.json({
            success: true,
            message: 'Cron job "grade-picks" executed successfully.',
            backendResponse: data,
            timestamp: new Date().toISOString(),
            durationMs: Date.now() - start,
        });
    } catch (err) {
        const message =
            err instanceof Error ? err.message : "Unknown error occurred";

        console.error("Unknown Cron Error:", message);
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
