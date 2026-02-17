"use client"

// import { cookies } from "next/headers";

/**
 * Safely sets a value in localStorage.
 * Automatically stringifies objects and arrays.
 */
export const setLocalStorage = <T>(key: string, value: T): void => {
    try {
        const serializedValue = typeof value === "string" ? value : JSON.stringify(value);
        if (typeof window !== 'undefined') {
            localStorage.setItem(key, serializedValue);
        }
    } catch (error) {
        console.error(`Error setting localStorage key "${key}":`, error);
    }
};

/**
 * Safely retrieves and parses a value from localStorage.
 * Automatically parses JSON if possible.
 */
export const getLocalStorage = <T = string>(key: string): T | null => {
    try {
        if (typeof window !== 'undefined') {
            const value = localStorage.getItem(key);
            if (!value) return null;

            try {
                return JSON.parse(value) as T;
            } catch {
                return value as unknown as T; // Not JSON, return as string
            }
        }else{
            return null;
        }
    } catch (error) {
        console.error(`Error getting localStorage key "${key}":`, error);
        return null;
    }
};

/**
 * Removes an item from localStorage.
 */
export const removeLocalStorage = (key: string): void => {
    try {
        if (typeof window !== 'undefined') {
            localStorage.removeItem(key);
        }
    } catch (error) {
        console.error(`Error removing localStorage key "${key}":`, error);
    }
};

// export const setCookie = (key: string, value: any, options?: {
//     maxAge?: number;
//     path?: string;
//     secure?: boolean;
//     httpOnly?: boolean;
//     sameSite?: "strict" | "lax" | "none";
// }) => {
//     const cookieStore: any = cookies();
//     cookieStore.set({
//         name: key,
//         value: typeof value === "string" ? value : JSON.stringify(value),
//         path: options?.path ?? "/",
//         httpOnly: options?.httpOnly ?? false,
//         secure: options?.secure ?? true,
//         sameSite: options?.sameSite ?? "lax",
//         maxAge: options?.maxAge ?? 60 * 60 * 24 * 7, // default 7 days
//     });

//     const currentDate = new Date();
//     const expiryDate = new Date(currentDate.getTime() + (7 * 24 * 60 * 60 * 1000));
//     const expires = expiryDate.toUTCString();
//     document.cookie = `accessToken=${response.data.data.access_token}; expires=${expires}; path=/`;
// };

// /**
//  * Get a cookie value (server-side).
//  */
// export const getCookie = <T = string>(key: string): T | null => {
//     const cookieStore: any = cookies();
//     const cookie = cookieStore.get(key);
//     if (!cookie) return null;

//     try {
//         return JSON.parse(cookie.value) as T;
//     } catch {
//         return cookie.value as unknown as T;
//     }
// };

// /**
//  * Remove a cookie.
//  */
// export const removeCookie = (key: string) => {
//     const cookieStore: any = cookies();
//     cookieStore.delete(key);
// };