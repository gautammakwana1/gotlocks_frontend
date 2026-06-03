"use client";

import { usePathname } from "next/navigation";
import { TopNav } from "./TopNav";
import MainTabBar from "./MainTabBar";

const COMPACT_ROUTES = new Set([
  "/landing-page",
  "/account-creation",
  "/cag-form",
  "/auth/callback",
  "/auth/set-username",
]);

export const AppShell = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const compact = pathname ? COMPACT_ROUTES.has(pathname) : false;
  const leagueDetailRoute = pathname ? /^\/league\/[^/]+$/.test(pathname) : false;
  const contestDetailRoute = pathname
    ? /^\/league\/[^/]+\/contests\/[^/]+$/.test(pathname)
    : false;
  const tightTop =
    pathname === "/profile" || (pathname ? pathname.startsWith("/user/") : false);
  const topPadding = leagueDetailRoute || contestDetailRoute
    ? "pt-2 sm:pt-3"
    : tightTop
      ? "pt-4 sm:pt-5"
      : "pt-8";

  return (
    <div className="relative flex min-h-[100dvh] flex-col overflow-x-hidden bg-[var(--app-bg)] text-[var(--app-text)]">
      <TopNav />
      <main
        className={`mx-auto w-full flex-1 ${compact ? "max-w-xl" : "max-w-4xl"
          } px-5 pb-36 ${topPadding} sm:px-6`}
      >
        {children}
      </main>
      <MainTabBar />
    </div>
  );
};

export default AppShell;
