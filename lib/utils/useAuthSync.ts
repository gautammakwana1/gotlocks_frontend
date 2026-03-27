'use client';

import { useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Session } from '@supabase/supabase-js';
import { setLocalStorage } from './jwtUtils';

export function AuthSync() {
    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) saveCleanUser(session);
        });

        // Listen to all changes
        const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === "INITIAL_SESSION") {
                if (session) {
                    saveCleanUser(session);
                }
            }

            // if (event === 'SIGNED_OUT') {
            //     localStorage.removeItem('currentUser');
            // }
        });

        return () => listener.subscription.unsubscribe();
    }, []);

    return null;
}

function saveCleanUser(session: Session) {
    const { user } = session;
    if (!user) return;
    const cleanUser = {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at,
        email: user?.email,
        username: user?.user_metadata?.preferred_username || user?.user_metadata?.username || user?.email?.split('@')[0],
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