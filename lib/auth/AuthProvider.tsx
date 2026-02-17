"use client";

import { createContext, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getLocalStorage } from "@/lib/utils/jwtUtils";
import type { CurrentUser } from "@/lib/interfaces/interfaces";
import { AuthSync } from "../utils/useAuthSync";

export const AuthContext = createContext<CurrentUser | null>(null);

const PUBLIC_ROUTES = ["/landing-page", "/account-creation"];

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();

    const [user, setUser] = useState<CurrentUser | null>(null);

    useEffect(() => {
        const storedUser = getLocalStorage<CurrentUser>("currentUser");
        setUser(storedUser || null);

        const isPublic = PUBLIC_ROUTES.includes(pathname);

        // Check against the fresh storedUser, not the state that might be stale for this cycle
        if (!storedUser && !isPublic) {
            router.replace("/landing-page");
        }
    }, [pathname, router]);

    return (
        <AuthContext.Provider value={user}>
            <AuthSync />
            {children}
        </AuthContext.Provider>
    );
}
