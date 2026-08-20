"use client";

import { usePathname } from "next/navigation";
import { TopNav } from "./TopNav";
import MainTabBar from "./MainTabBar";
import dockStyles from "./BottomDock.module.css";

const COMPACT_ROUTES = new Set([
  "/landing-page",
  "/account-creation",
  "/cag-form",
  "/auth/callback",
  "/auth/set-username",
]);

const isWideWorkspaceRoute = (pathname: string) =>
  pathname === "/home" ||
  pathname === "/profile" ||
  pathname === "/social" ||
  pathname === "/fantasy" ||
  pathname === "/arena" ||
  pathname === "/locks" ||
  pathname === "/pick-builder" ||
  pathname === "/feedback" ||
  pathname === "/global-points-shop" ||
  pathname.startsWith("/app-settings") ||
  pathname.startsWith("/user/") ||
  pathname.startsWith("/league/") ||
  pathname.startsWith("/arena/");

export const AppShell = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const compact = pathname ? COMPACT_ROUTES.has(pathname) : false;
  const wideWorkspace = pathname ? isWideWorkspaceRoute(pathname) : false;
  const groupDetailRoute = pathname
    ? /^\/(?:league|arena)\/[^/]+$/.test(pathname)
    : false;
  const contestDetailRoute = pathname
    ? /^\/league\/[^/]+\/contests\/[^/]+$/.test(pathname)
    : false;
  const structuredContestRoute = pathname
    ? /^\/arena\/[^/]+\/contests\/(?:create|[^/]+)$/.test(pathname) ||
    // …/feed-contests/create, …/feed-contests/<id>, and that id's /edit + /entry.
    // Both surfaces run the same screens off /group/feed-contest/*.
    /^\/(?:league|arena)\/[^/]+\/feed-contests\/(?:create|[^/]+(?:\/(?:edit|entry))?)$/.test(pathname)
    : false;
  const tightTop =
    pathname === "/profile" || (pathname ? pathname.startsWith("/user/") : false);
  const topPadding = pathname === "/home"
    ? "pt-0"
    : groupDetailRoute || contestDetailRoute || structuredContestRoute
      ? "pt-2 sm:pt-3"
      : tightTop
        // Profile routes own their top spacing inside ProfileHeader's card
        // (pt-4 sm:pt-5), so the shell adds none of its own.
        ? "pt-0"
        : "pt-8";

  return (
    <div
      data-app-shell
      data-app-scale="desktop"
      className="relative flex min-h-[100dvh] flex-col overflow-x-hidden bg-[var(--app-bg)] text-[var(--app-text)]"
    >
      <TopNav />
      <main
        className={`mx-auto w-full flex-1 ${compact
          ? "max-w-xl lg:max-w-4xl"
          : wideWorkspace
            ? "max-w-4xl lg:max-w-7xl"
            : "max-w-4xl"
          } ${dockStyles.appContentClearance} px-5 sm:px-6`}
      >
        {children}
      </main>
      <MainTabBar />
    </div>
  );
};

export default AppShell;
