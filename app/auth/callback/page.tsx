"use client";
import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AuthCallbackPage() {
    const router = useRouter();
    useEffect(() => {
        const finalize = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();

                if (session?.user) {
                    const metadata = session.user.user_metadata || {};
                    // If username is missing, redirect to set it.
                    if (!metadata.username) {
                        router.replace("/auth/set-username");
                        return;
                    }
                }
            } catch (err) {
                console.error("Error finalizing session:", err);
            }
            // Default redirect
            router.replace("/home");
        };
        finalize();
    }, [router]);

    return (
        <div className="flex min-h-screen items-center justify-center bg-[var(--app-bg)] text-white">
            <div className="flex flex-col items-center gap-4">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-emerald-400"></div>
                <p className="animate-pulse text-sm font-medium uppercase tracking-widest text-emerald-400">
                    Finalizing...
                </p>
            </div>
        </div>
    );
}
