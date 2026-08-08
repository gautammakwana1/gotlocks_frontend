"use client";

import { Provider } from "react-redux";
import store from "../lib/redux/store";
import { SessionContextProvider } from '@supabase/auth-helpers-react';
import { supabase } from "@/lib/supabaseClient";
import { Toaster } from "sonner";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import AppRuntime from "@/components/layout/AppRuntime";
import { usePathname } from "next/navigation";

const PUBLIC_ROUTES = new Set([
  "/",
  "/pricing",
  "/privacy-policy",
  "/terms-and-conditions",
  "/support",
]);

export const AppProviders = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();

  if (pathname && PUBLIC_ROUTES.has(pathname)) {
    return children;
  }
  return (
    <Provider store={store}>
      <SessionContextProvider supabaseClient={supabase}>
        {/* <AuthSync /> */}
        <AuthProvider>
          <AppRuntime>
            {children}
            <Toaster
              position="bottom-right"
              theme="dark"
              richColors
              closeButton
            />
          </AppRuntime>
        </AuthProvider>
      </SessionContextProvider>
    </Provider>
  );
};

export default AppProviders;
