"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { useAppSelector } from "@/lib/redux/hooks";
import { RootState } from "@/lib/interfaces/interfaces";

export default function SentryUserTracker() {
    const { user } = useAppSelector((state: RootState) => state.user);

    useEffect(() => {
        if (user) {
            Sentry.setUser({
                id: user.data?.user?.userId,
                email: user.data?.user?.userData?.email,
            });

            console.log("✅ Sentry user set:", user.data?.user?.userData?.email);
        } else {
            Sentry.setUser(null);

            console.log("🚪 Sentry user cleared");
        }
    }, [user]);

    return null;
}