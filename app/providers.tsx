"use client";

import { Provider } from "react-redux";
import store from "../lib/redux/store";
import { SessionContextProvider } from '@supabase/auth-helpers-react';
import { supabase } from "@/lib/supabaseClient";
import { ThemeProvider } from "@/lib/state/theme";
import { Toaster } from "sonner";
import { AuthProvider } from "@/lib/auth/AuthProvider";

export const AppProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <ThemeProvider>
      <Provider store={store}>
        <SessionContextProvider supabaseClient={supabase}>
          {/* <AuthSync /> */}
          <AuthProvider>
            {children}
            <Toaster
              position="bottom-right"
              theme="dark"
              richColors
              closeButton
            />
          </AuthProvider>
        </SessionContextProvider>
      </Provider>
    </ThemeProvider>
  );
};

export default AppProviders;
