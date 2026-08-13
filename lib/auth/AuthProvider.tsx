"use client";

import { createContext, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getLocalStorage } from "@/lib/utils/jwtUtils";
import type { CurrentUser } from "@/lib/interfaces/interfaces";
import { AuthSync } from "../utils/useAuthSync";
import { supabase } from "../supabaseClient";

export const AuthContext = createContext<CurrentUser | null>(null);

// `/check-in` is the printed venue QR's landing page and MUST stay public: the
// customer scanning a poster in a bar may have no account yet, and the page's
// whole first rung is "sign in or create an account, then come back here".
// Bouncing them to /landing-page loses the token and the flow dead-ends.
const PUBLIC_ROUTES = ["/signin", "/pricing", "/landing-page", "/account-creation", "/auth/callback", "/auth/set-username", "/privacy-policy", "/terms-and-conditions", "/check-in"];

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();

    const [user, setUser] = useState<CurrentUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Initial check
        const initAuth = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                const storedUser = getLocalStorage<CurrentUser>("currentUser");

                // If we have a session but no localStorage yet (e.g. fresh redirect),
                // we might want to wait a bit or the AuthSync component below will handle it.
                // For now, we trust localStorage as the primary UI source for 'CurrentUser' object.
                setUser(storedUser || null);
            } catch (error) {
                console.error("Auth init error:", error);
            } finally {
                setIsLoading(false);
            }
        };

        initAuth();

        // Listen for changes to keep the context in sync
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') {
                const storedUser = getLocalStorage<CurrentUser>("currentUser");
                if (storedUser) {
                    setUser((prev) => {
                        if (prev && prev.userId === storedUser.userId) {
                            return prev;
                        }
                        return storedUser;
                    });
                }
            } else if (event === 'SIGNED_OUT') {
                setUser(null);
                setIsLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        if (isLoading) return;

        const storedUser = getLocalStorage<CurrentUser>("currentUser");
        const isPublic = PUBLIC_ROUTES.some(route => pathname?.startsWith(route));

        // Sync state if localStorage has user but state is empty (happens after redirect)
        if (storedUser && !user) {
            setUser(storedUser);
        }

        if (!storedUser && !isPublic && pathname !== "/") {
            router.replace("/landing-page");
        }
    }, [pathname, router, isLoading, user]);

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[var(--app-bg)]">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-emerald-400"></div>
            </div>
        );
    }

    return (
        <AuthContext.Provider value={user}>
            <AuthSync />
            {children}
        </AuthContext.Provider>
    );
}
