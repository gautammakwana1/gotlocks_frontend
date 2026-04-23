"use client";
import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { saveCleanUser } from "@/lib/utils/useAuthSync";
import { Session } from "@supabase/supabase-js";

export default function AuthCallbackPage() {
    const router = useRouter();

    useEffect(() => {
        let isNavigating = false;
        let timeoutId: ReturnType<typeof setTimeout> | null = null;

        const handleSession = async (session: Session | null) => {
            if (isNavigating) return;
            isNavigating = true;
            if (timeoutId) clearTimeout(timeoutId);

            try {
                if (session) {
                    await saveCleanUser(session);
                }

                if (session?.user) {
                    const metadata = session.user.user_metadata || {};

                    // Identify if this is a fresh signup (created just now)
                    const createdAt = new Date(session.user.created_at).getTime();
                    const lastSignInAt = new Date(session.user.last_sign_in_at || "").getTime();
                    const isNewUser = Math.abs(lastSignInAt - createdAt) < 10000; // Within 10 seconds

                    // If username or DOB is missing, or it's a fresh signup, redirect to onboarding.
                    if (!metadata.username || isNewUser) {
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

        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
                if (session && !isNavigating) {
                    handleSession(session);
                }
            }
        });

        // Also check getSession in case the event fired before we subscribed,
        // or if there is no session to be found.
        supabase.auth.getSession().then(({ data: { session }, error }) => {
            if (error) {
                console.error("Error getting session:", error);
            }

            if (session && !isNavigating) {
                handleSession(session);
            } else if (!session && !isNavigating) {
                // In production, getSession() might return null while hash is still being processed.
                // We only handle "null" session if there's no hash at all or we've waited long enough.
                const hash = window.location.hash;
                const hasAuthParts = hash.includes("access_token") || hash.includes("error") || hash.includes("code");

                if (!hasAuthParts) {
                    handleSession(null);
                } else {
                    console.log("No session yet, but auth hash detected. Waiting for onAuthStateChange...");
                }
            }
        });

        // Fallback timeout: if after 5 seconds nothing has happened, we assume it failed
        timeoutId = setTimeout(() => {
            if (!isNavigating) {
                console.warn("Auth callback timed out waiting for session");
                handleSession(null);
            }
        }, 5000);

        return () => {
            authListener?.subscription.unsubscribe();
            if (timeoutId) clearTimeout(timeoutId);
        };
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
