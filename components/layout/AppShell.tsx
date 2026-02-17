"use client";

import { usePathname } from "next/navigation";
import { TopNav } from "./TopNav";
import MainTabBar from "./MainTabBar";

const COMPACT_ROUTES = new Set([
  "/landing-page",
  "/account-creation",
  "/cag-form",
  "/auth/set-username",
]);

export const AppShell = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const compact = pathname ? COMPACT_ROUTES.has(pathname) : false;
  const tightTop =
    pathname === "/profile" || (pathname ? pathname.startsWith("/users/") : false);
  const topPadding = tightTop ? "pt-4 sm:pt-5" : "pt-8";

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-[var(--app-bg)] text-[var(--app-text)]">
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
