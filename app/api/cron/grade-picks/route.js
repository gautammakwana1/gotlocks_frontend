import { NextResponse } from 'next/server';


export async function GET(request) {
    const authHeader = request.headers.get('authorization');
    // if (process.env.NODE_ENV === 'production') {
    //     if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    //         return new Response('Unauthorized', { status: 401 });
    //     }
    // }
    const start = Date.now();
    try {
        console.log('Cron Job Started: grade-picks', new Date().toISOString());

        const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_BASE_URL}/pick/apply-grading`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
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
        console.log('Cron Job Ended: grade-picks', new Date().toISOString());
        return NextResponse.json({
            success: true,
            message: 'Cron job "grade-picks" executed successfully.',
            backendResponse: data,
            timestamp: new Date().toISOString(),
            durationMs: Date.now() - start,
        });

    } catch (error) {
        console.error('Cron job "grade-picks" error:', error);
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
