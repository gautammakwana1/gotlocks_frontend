"use client";

import { useContext } from "react";
import { AuthContext } from "./AuthProvider";
import type { CurrentUser } from "@/lib/interfaces/interfaces";

export function useCurrentUser(): CurrentUser | null {
    const user = useContext(AuthContext);
    return user;
}
