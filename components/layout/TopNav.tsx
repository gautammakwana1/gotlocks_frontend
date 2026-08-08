"use client";

import { useMemo, useCallback, useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { logout } from "@/lib/redux/slices/authSlice";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { useToast } from "@/lib/state/ToastContext";
import type { CurrentUser, TutorialKeys } from "@/lib/interfaces/interfaces";
import { displayNameGradientStyle } from "@/lib/styles/text";
import Image from "next/image";
import OnboardingModal from "../modals/OnboardingModal";
import { GLOBAL_TUTORIAL, GROUP_TUTORIAL, WELCOME_TUTORIAL } from "@/lib/onboarding/tutorials";
import * as Sentry from "@sentry/nextjs";
import {
  isPrimaryNavigationHidden,
  isPrimaryNavigationTabActive,
  PRIMARY_NAVIGATION_TABS,
} from "./primaryNavigation";
import { SIDE_DRAWER_DESKTOP_WIDTH } from "./sideDrawerSizing";

type AuthUserPayload = {
  data?: {
    user?: {
      userData?: CurrentUser;
    };
  };
};

const HIDDEN_ROUTES = new Set([
  "/signin",
  "/landing-page",
  "/account-creation",
  "/auth/callback",
  "/auth/set-username",
  "/terms-and-conditions",
  "/privacy-policy"
]);

export const TopNav = () => {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [tutorialStage, setTutorialStage] = useState<TutorialKeys>(null);
  const tutorialSteps =
    tutorialStage === "home"
      ? WELCOME_TUTORIAL
      : tutorialStage === "group"
        ? GROUP_TUTORIAL
        : tutorialStage === "global"
          ? GLOBAL_TUTORIAL
          : WELCOME_TUTORIAL;
  const tutorialFinalCta = tutorialStage === "global" ? "let's go 🔒" : "finish";
  const advanceTutorial = () => {
    setTutorialStage((prev) =>
      prev === "home" ? "group" : prev === "group" ? "global" : null
    );
  };

  const { setToast } = useToast();

  const authUser = useAppSelector((state) => state.user.user) as AuthUserPayload | null;
  const reduxUser = authUser?.data?.user?.userData ?? null;
  // Read the current user from AuthContext (AuthProvider derives it from the
  // "currentUser" localStorage key and sets it before children render) instead
  // of reading localStorage during render, which would differ from SSR output.
  const storedUser = useCurrentUser();
  const currentUser = reduxUser ?? storedUser ?? null;

  // Same derivation as MainTabBar, so the header nav and the bottom bar agree
  // on which destination the onboarding flow is currently steering toward.
  const { hasSeenSocialIntro, hasSeenWelcomeIntro, hasSeenGroupIntro } =
    useAppSelector((state) => state.progress);
  const guidedTarget: "leagues" | "social" | null = !hasSeenWelcomeIntro
    ? null
    : !hasSeenGroupIntro
      ? "leagues"
      : !hasSeenSocialIntro
        ? "social"
        : null;

  const handleLockedTap = useCallback(() => {
    setToast({
      id: Date.now(),
      type: "info",
      message:
        guidedTarget === "leagues"
          ? "Tap the leagues tab to continue."
          : "Tap the global tab to continue 🔒",
      duration: 3000,
    });
  }, [guidedTarget, setToast]);

  const hideNav = useMemo(() => {
    if (!pathname) return false;
    return HIDDEN_ROUTES.has(pathname);
  }, [pathname]);

  const headerRef = useRef<HTMLElement | null>(null);

  // Publish the sticky TopNav height as a CSS variable so other views (e.g. the
  // full-height chat tab) can size themselves with `calc(100dvh - var(--topnav-height))`.
  // ResizeObserver only fires when the nav actually changes size — no scroll/resize churn.
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const setVar = () => {
      document.documentElement.style.setProperty("--topnav-height", `${el.offsetHeight}px`);
    };
    setVar();
    const ro = new ResizeObserver(setVar);
    ro.observe(el);
    return () => ro.disconnect();
  }, [hideNav, currentUser]);

  const handleLogOut = useCallback(async () => {
    try {
      // 1. Terminate Supabase session
      const { supabase } = await import("@/lib/supabaseClient");
      supabase.auth.signOut();

      // 3. Dispatch global logout to reset Redux state
      dispatch(logout());

      Sentry.setUser(null);

      setToast({
        id: Date.now(),
        type: "success",
        message: "Successfully logged out",
        duration: 3000,
      });

      router.push("/landing-page");
    } catch (error) {
      setToast({
        id: Date.now(),
        type: "error",
        message: error instanceof Error ? error.message : "Failed to log out",
        duration: 3000,
      });
    }
  }, [dispatch, router, setToast]);

  const closeMenu = () => {
    setIsAnimating(false);
    setTimeout(() => {
      setMenuOpen(false);
    }, 300);
  };

  if (hideNav || !currentUser) return null;

  return (
    <>
      <header
        ref={headerRef}
        data-app-header
        className="sticky top-0 z-30 border-b backdrop-blur lg:fixed lg:inset-x-0"
        style={{ backgroundColor: "var(--nav-bg)", borderColor: "var(--nav-border)" }}
      >
        {/* Below `lg` the hamburger is pinned left and the wordmark centered.
            At `lg` the row becomes brand / primary nav / actions, so the
            hamburger joins the flow on the right and the tabs move up here. */}
        <div className="relative flex items-center justify-end sm:justify-center gap-10 mx-auto w-full max-w-4xl px-5 py-4 lg:h-[86px] lg:max-w-7xl lg:justify-start lg:gap-6 lg:py-0">
          <div className="absolute left-5 top-1/2 -translate-y-1/2 lg:static lg:order-3 lg:ml-auto lg:translate-y-0">
            <button
              type="button"
              onClick={() => {
                setMenuOpen(true);
                setTimeout(() => setIsAnimating(true), 10);
              }}
              aria-label="Open options"
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-lg text-gray-200 transition hover:border-white/25 hover:bg-white/10 hover:text-white"
            >
              <span className="flex flex-col gap-[3px]">
                <span className="block h-[2px] w-5 rounded-full" style={{ backgroundColor: "var(--app-text)", borderColor: "var(--nav-border)" }} />
                <span className="block h-[2px] w-5 rounded-full" style={{ backgroundColor: "var(--app-text)", borderColor: "var(--nav-border)" }} />
                <span className="block h-[2px] w-5 rounded-full" style={{ backgroundColor: "var(--app-text)", borderColor: "var(--nav-border)" }} />
              </span>
            </button>
          </div>
          <div className="ml-auto flex justify-center items-end gap-2 sm:ml-0 lg:order-1 lg:ml-0 lg:shrink-0">
            <button
              type="button"
              onClick={() => router.push("/home")}
              aria-label="Go to home"
              className="translate-y-[2px] transition hover:opacity-90"
            >
              <span className="sr-only">gotlocks?</span>
              <Image
                src="/gotlockstext.svg"
                alt=""
                aria-hidden="true"
                width={210}
                height={32}
                className="h-7 w-auto object-contain sm:h-8"
                priority
                draggable={"false"}
              />
            </button>
            <Image
              src="/nocircleblack.svg"
              alt=""
              aria-hidden="true"
              width={40}
              height={39}
              className="translate-y-[2px] h-8 w-8 object-contain sm:h-9 sm:w-9"
              priority
              draggable={"false"}
            />
          </div>

          {!isPrimaryNavigationHidden(pathname) && (
            <nav
              aria-label="Primary app navigation"
              className="hidden min-w-0 flex-1 items-stretch justify-center lg:order-2 lg:flex"
            >
              <div className="grid w-full max-w-[34rem] grid-cols-5">
                {PRIMARY_NAVIGATION_TABS.map((tab) => {
                  const active = isPrimaryNavigationTabActive(pathname, tab);
                  // Mirror MainTabBar's onboarding gate: until the intros are
                  // seen, only the guided destination is reachable. Without
                  // this the desktop header would let users skip the tutorial
                  // that the bottom bar (hidden at `lg`) still enforces.
                  const isGuided = guidedTarget !== null && tab.id === guidedTarget;
                  const locked = guidedTarget !== null && tab.id !== guidedTarget;
                  const tone = locked
                    ? "cursor-not-allowed text-gray-600"
                    : active || isGuided
                      ? "text-white focus-visible:ring-sky-300"
                      : "text-gray-400 hover:text-white focus-visible:ring-white/70";
                  const commonClassName = `group relative flex min-w-0 items-center justify-center px-3 py-2 text-sm font-semibold lowercase tracking-[0.04em] transition-colors focus-visible:rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080a0f] ${tone}`;
                  const underline = (
                    <span
                      aria-hidden
                      className={`absolute inset-x-3 -bottom-2 h-0.5 rounded-full bg-gradient-to-r transition-opacity ${active || isGuided
                        ? "from-transparent via-sky-300 to-transparent opacity-100 shadow-[0_0_8px_rgba(125,211,252,0.35)]"
                        : "from-transparent via-white/35 to-transparent opacity-0 group-hover:opacity-70"
                        }`}
                    />
                  );

                  if (locked) {
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={handleLockedTap}
                        aria-label={`${tab.label} (locked)`}
                        data-desktop-tab={tab.id}
                        className={commonClassName}
                      >
                        <span>{tab.label}</span>
                        {underline}
                      </button>
                    );
                  }

                  return (
                    <Link
                      key={tab.id}
                      href={tab.href}
                      aria-current={active ? "page" : undefined}
                      data-desktop-tab={tab.id}
                      className={commonClassName}
                    >
                      <span>{tab.label}</span>
                      {underline}
                    </Link>
                  );
                })}
              </div>
            </nav>
          )}
        </div>
      </header>
      {/* The header leaves the flow at `lg` (position: fixed); reserve its height. */}
      <div
        data-app-header-spacer
        aria-hidden
        className="hidden lg:block lg:h-[var(--app-header-height)]"
      />

      {menuOpen && (
        <div className="fixed inset-0 z-40 flex">
          <button
            type="button"
            aria-label="Close menu"
            onClick={closeMenu}
            className={`h-full w-full bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${isAnimating ? "opacity-100" : "opacity-0"
              }`}
          />
          <div
            className={`ui-accent-menu-surface absolute left-0 top-0 h-full w-[80vw] min-w-[260px] overflow-y-auto p-6 ring-1 ring-white/10
              sm:w-[40vw] lg:w-full ${SIDE_DRAWER_DESKTOP_WIDTH.standard} transform transition-transform duration-300 ease-out ${isAnimating ? "translate-x-0" : "-translate-x-full"}
            `}
          >
            <div className="mb-5 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-xs uppercase tracking-[0.14em] text-gray-400">
                  quick actions
                </span>
                {currentUser && (
                  <span
                    className="allow-caps text-base font-bold text-transparent bg-clip-text"
                    style={displayNameGradientStyle}
                  >
                    {currentUser.username}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={closeMenu}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-wide text-gray-200 transition hover:border-white/25 hover:bg-white/10"
              >
                close
              </button>
            </div>

            <div className="flex flex-col gap-3 text-sm font-semibold uppercase tracking-[0.1em] text-white">
              <button
                type="button"
                onClick={() => {
                  closeMenu();
                  router.push("/app-settings");
                }}
                className="group flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:border-emerald-400/50 hover:bg-emerald-500/10"
              >
                <span>account settings</span>
                <Image
                  src="/icons/settings.png"
                  alt="settings"
                  width={24}
                  height={24}
                  className="transition-transform duration-300 group-hover:scale-110 group-hover:[transform:rotateY(180deg)]"
                  draggable={false}
                />
              </button>
              <Link
                href="/global-points-shop"
                className="group flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 transition hover:border-sky-300/50 hover:bg-sky-400/10"
                onClick={() => setMenuOpen(false)}
              >
                <span>reward room</span>
                <Image
                  src="/icons/money.png"
                  alt="coin"
                  width={24}
                  height={24}
                  className="transition-transform duration-300 group-hover:scale-110 group-hover:[transform:rotateY(180deg)]"
                  draggable={false}
                />
              </Link>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  setTutorialStage("home");
                }}
                className="group ui-accent-outline-hover flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left transition"
              >
                <span>tutorial</span>
                <Image
                  src="/icons/tutorial.png"
                  alt="tutorial"
                  width={24}
                  height={24}
                  className="transition-transform duration-300 group-hover:scale-110 group-hover:[transform:rotateY(180deg)]"
                  draggable={false}
                />
              </button>
              <Link
                href="/feedback"
                className="group flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 transition hover:border-white/25 hover:bg-white/10"
                onClick={() => setMenuOpen(false)}
              >
                <span>feedback</span>
                <Image
                  src="/icons/feedback.png"
                  alt="tutorial"
                  width={24}
                  height={24}
                  className="transition-transform duration-300 group-hover:scale-110 group-hover:[transform:rotateY(180deg)]"
                  draggable={false}
                />
              </Link>
              {currentUser && (
                <button
                  type="button"
                  onClick={() => {
                    closeMenu();
                    handleLogOut();
                  }}
                  className="group flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:border-red-400/60 hover:bg-red-500/10"
                >
                  <span>logout</span>
                  <Image
                    src="/icons/logout.png"
                    alt="tutorial"
                    width={28}
                    height={28}
                    className="transition-transform duration-300 group-hover:scale-110 group-hover:[transform:rotateY(180deg)] object-none"
                    draggable={false}
                  />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <OnboardingModal
        open={tutorialStage !== null}
        steps={tutorialSteps}
        onClose={advanceTutorial}
        finalCtaLabel={tutorialFinalCta}
      />
    </>
  );
};

export default TopNav;