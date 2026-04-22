'use client';

import { useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Session } from '@supabase/supabase-js';
import { getLocalStorage, setLocalStorage } from './jwtUtils';
import { CurrentUser } from '../interfaces/interfaces';

export function AuthSync() {
    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) saveCleanUser(session);
        });

        // Listen to all changes
        const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === "SIGNED_IN") {
                if (session) {
                    saveCleanUser(session);
                }
            }

            if (event === 'SIGNED_OUT') {
                localStorage.removeItem('currentUser');
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refresh_token');
                localStorage.removeItem('userId');
                localStorage.removeItem('provider');
            }
        });

        return () => listener.subscription.unsubscribe();
    }, []);

    return null;
}

export async function saveCleanUser(session: Session) {
    const { user } = session;
    if (!user) return;
    const existingUser = getLocalStorage<CurrentUser>("currentUser");

    const cleanUser = {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at,
        email: user?.email,
        username: user?.user_metadata?.username || existingUser?.username || user?.user_metadata?.preferred_username,
        full_name: user?.user_metadata?.full_name || user?.user_metadata?.name,
        avatar_url: user?.user_metadata?.avatar_url || user?.user_metadata?.picture,
        provider: user?.app_metadata?.provider,
        id: user?.id,
        userId: user?.id,
        // Add any custom fields from your users table here
    };

    setLocalStorage("currentUser", cleanUser);
    setLocalStorage("accessToken", session.access_token);
    setLocalStorage("refresh_token", session.refresh_token);
    setLocalStorage("userId", user?.id);
    setLocalStorage("provider", user?.app_metadata?.provider);
}