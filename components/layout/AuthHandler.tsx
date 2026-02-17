'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useSession } from '@supabase/auth-helpers-react';
import { supabase } from '@/lib/supabaseClient';

export default function AuthHandler() {
    const user = useUser();
    const session = useSession();
    const router = useRouter();

    useEffect(() => {
        const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {

            if (event === 'SIGNED_IN') {
                router.push('/home'); // or refresh, etc.
            }

            if (event === 'SIGNED_OUT') {
                router.push('/');
            }
        });

        return () => listener.subscription.unsubscribe();
    }, [router]);

    // Optional: show loading while checking session
    if (session === undefined) return <div>Loading...</div>;

    return null; // This component just handles auth
}