/*
 * Single source of truth for the five primary destinations. MainTabBar renders
 * them as the docked bottom bar below `lg`; TopNav renders them inline in the
 * header at `lg` and above, where the bottom dock is hidden.
 */

export type PrimaryNavigationTabId =
  | "home"
  | "profile"
  | "leagues"
  | "arenas"
  | "social";

export type PrimaryNavigationTab = {
  id: PrimaryNavigationTabId;
  label: string;
  href: string;
  matchers: readonly string[];
};

export const PRIMARY_NAVIGATION_TABS = [
  { id: "home", label: "home", href: "/home", matchers: ["/home"] },
  { id: "profile", label: "profile", href: "/profile", matchers: ["/profile"] },
  {
    id: "leagues",
    label: "leagues",
    href: "/fantasy",
    matchers: ["/fantasy", "/league"],
  },
  {
    id: "arenas",
    label: "arenas",
    href: "/arena",
    matchers: ["/arenas", "/arena"],
  },
  {
    id: "social",
    label: "global",
    href: "/social",
    matchers: ["/social", "/user"],
  },
] as const satisfies readonly PrimaryNavigationTab[];

const HIDDEN_ROUTE_PREFIXES = [
  "/landing-page",
  "/account-creation",
  "/cag-explained",
  "/cag-form",
  "/auth/set-username",
  "/auth/callback",
  "/terms-and-conditions",
  "/privacy-policy",
  "/not-found",
] as const;

export const isPrimaryNavigationHidden = (pathname: string | null) => {
  if (!pathname) return false;

  return HIDDEN_ROUTE_PREFIXES.some((route) => pathname.startsWith(route));
};

/* Arena plan/upgrade screens live under /app-settings but belong to Arenas. */
export const isArenaNavigationRoute = (pathname: string | null) =>
  Boolean(
    pathname?.startsWith("/arenas") ||
      pathname?.startsWith("/arena") ||
      pathname?.startsWith("/app-settings/plan/arena/"),
  );

export const isPrimaryNavigationTabActive = (
  pathname: string | null,
  tab: PrimaryNavigationTab,
) =>
  tab.id === "arenas" && isArenaNavigationRoute(pathname)
    ? true
    : tab.matchers.some((matcher) => pathname?.startsWith(matcher));
