import { createClient } from "@supabase/supabase-js";

// Reuse your customStorage from before
// const customStorage = {
//     getItem: (key: string) => {
//         if (typeof window === 'undefined') return null;
//         const item = localStorage.getItem(key);
//         return item ? JSON.parse(item) : null;
//     },
//     setItem: (key: string, value: unknown) => {
//         if (typeof window !== 'undefined') {
//             localStorage.setItem(key, JSON.stringify(value));
//         }
//     },
//     removeItem: (key: string) => {
//         if (typeof window !== 'undefined') {
//             console.log(`key ------>`, key);
//             // localStorage.removeItem(key);
//         }
//     },
// };

export const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            // storage: customStorage, // If you're using the custom storage we set up
            // storageKey: 'currentUser',
        }
    }
);