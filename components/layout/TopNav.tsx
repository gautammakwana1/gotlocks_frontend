"use client";

import { useMemo, useCallback, useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { logout } from "@/lib/redux/slices/authSlice";
import {
  clearAllNotificationRequest,
  markNotificationReadRequest,
} from "@/lib/redux/slices/notificationSlice";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { useToast } from "@/lib/state/ToastContext";
import type { CurrentUser, RootState, TutorialKeys } from "@/lib/interfaces/interfaces";
import { displayNameGradientStyle } from "@/lib/styles/text";
import Image from "next/image";
import OnboardingModal from "../modals/OnboardingModal";
import NotificationsFeed from "../home/NotificationFeed";
import DrawerCloseButton from "../ui/DrawerCloseButton";
import { SIDE_DRAWER_MOTION } from "../ui/sideDrawerMotion";
import { TrashIcon } from "../ui/SvgIcons";
import { getProfilePath } from "@/lib/utils/profileNavigation";
import { GLOBAL_TUTORIAL, GROUP_TUTORIAL, WELCOME_TUTORIAL } from "@/lib/onboarding/tutorials";
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

const FOCUSABLE_SELECTOR = [
  'a[href]:not([tabindex="-1"])',
  'button:not([disabled]):not([tabindex="-1"])',
  'input:not([disabled]):not([tabindex="-1"])',
  'select:not([disabled]):not([tabindex="-1"])',
  'textarea:not([disabled]):not([tabindex="-1"])',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(",");

const HIDDEN_ROUTES = new Set([
  "/signin",
  "/landing-page",
  "/account-creation",
  "/auth/callback",
  "/auth/set-username",
  "/terms-and-conditions",
  "/privacy-policy"
]);

// Escape closes, Tab cycles inside the open panel. Both header drawers are
// always mounted (so they can animate out), so the trap is what keeps focus
// from wandering into the page behind them while one is open.
const handleDrawerKeyDown = (
  event: KeyboardEvent,
  drawer: HTMLElement | null,
  onClose: () => void,
) => {
  if (event.key === "Escape") {
    event.preventDefault();
    onClose();
    return;
  }

  if (event.key !== "Tab") return;

  const focusableElements = Array.from(
    drawer?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? [],
  );
  if (focusableElements.length === 0) {
    event.preventDefault();
    drawer?.focus();
    return;
  }

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];
  const activeElement = document.activeElement;

  if (event.shiftKey && activeElement === firstElement) {
    event.preventDefault();
    lastElement.focus();
  } else if (!event.shiftKey && activeElement === lastElement) {
    event.preventDefault();
    firstElement.focus();
  } else if (!drawer?.contains(activeElement)) {
    event.preventDefault();
    firstElement.focus();
  }
};

export const TopNav = () => {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [tutorialStage, setTutorialStage] = useState<TutorialKeys>(null);
  const menuTriggerRef = useRef<HTMLButtonElement | null>(null);
  const menuCloseRef = useRef<HTMLButtonElement | null>(null);
  const menuDrawerRef = useRef<HTMLElement | null>(null);
  const notificationTriggerRef = useRef<HTMLButtonElement | null>(null);
  const notificationCloseRef = useRef<HTMLButtonElement | null>(null);
  const notificationDrawerRef = useRef<HTMLElement | null>(null);
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
  const currentUserId = currentUser?.userId ?? undefined;

  // The header owns the notification bell app-wide now, so the unread count is
  // read here. The list itself is fetched by NotificationsFeed, which stays
  // mounted inside the (always-rendered) drawer.
  const { notification } = useAppSelector((state: RootState) => state.notifications);
  const unreadNotifications = useMemo(
    () =>
      Array.isArray(notification)
        ? notification.filter((item) => !item.is_read).length
        : 0,
    [notification]
  );

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

  const handleViewProfile = useCallback(
    (userId: string) => {
      setNotificationsOpen(false);
      router.push(getProfilePath(userId, currentUserId));
    },
    [currentUserId, router]
  );

  const handleOpenGroup = useCallback(
    (groupId: string) => {
      setNotificationsOpen(false);
      router.push(`/league/${groupId}`);
    },
    [router]
  );

  const handleClearAll = useCallback(() => {
    dispatch(clearAllNotificationRequest({}));
  }, [dispatch]);

  useEffect(() => {
    if (!notificationsOpen) return;

    if (currentUserId && unreadNotifications > 0) {
      dispatch(markNotificationReadRequest({}));
    }

    const previousOverflow = document.body.style.overflow;
    const notificationTrigger = notificationTriggerRef.current;
    document.body.style.overflow = "hidden";
    notificationCloseRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      handleDrawerKeyDown(
        event,
        notificationDrawerRef.current,
        () => setNotificationsOpen(false),
      );
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      notificationTrigger?.focus();
    };
    // unreadNotifications is intentionally read, not tracked: re-running this on
    // every count change would re-lock scroll and steal focus mid-session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notificationsOpen, currentUserId, dispatch]);

  useEffect(() => {
    if (!menuOpen) return;

    const previousOverflow = document.body.style.overflow;
    const menuTrigger = menuTriggerRef.current;
    document.body.style.overflow = "hidden";
    menuCloseRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      handleDrawerKeyDown(event, menuDrawerRef.current, () => setMenuOpen(false));
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      menuTrigger?.focus();
    };
  }, [menuOpen]);

  if (hideNav || !currentUser) return null;

  return (
    <>
      <header
        ref={headerRef}
        data-app-header
        className="sticky top-0 z-30 border-b backdrop-blur lg:fixed lg:inset-x-0"
        style={{ backgroundColor: "var(--nav-bg)", borderColor: "var(--nav-border)" }}
      >
        {/* One row at every width: brand left, primary tabs centred at `lg`,
            notifications + options pinned right. Both drawers they open slide
            in from the right, so their triggers live on that edge. */}
        <div className="mx-auto flex h-[76px] w-full max-w-4xl items-center gap-2 px-5 sm:gap-3 sm:px-6 lg:h-[86px] lg:max-w-7xl lg:gap-6">
          <div
            data-header-brand
            className="flex shrink-0 items-end gap-1.5 sm:gap-2"
          >
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
                className="h-5 w-auto object-contain min-[360px]:h-6 sm:h-8"
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
              className="translate-y-[2px] h-7 w-7 object-contain min-[360px]:h-8 min-[360px]:w-8 sm:h-9 sm:w-9"
              priority
              draggable={"false"}
            />
          </div>

          {!isPrimaryNavigationHidden(pathname) && (
            <nav
              aria-label="Primary app navigation"
              className="hidden min-w-0 flex-1 items-stretch justify-center lg:flex"
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
                        ? `from-transparent ${tab.id === "arenas" ? "via-violet-300" : "via-sky-300"} to-transparent opacity-100 shadow-[0_0_8px_rgba(125,211,252,0.35)]`
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

          <div
            data-header-actions
            className="ml-auto flex shrink-0 items-center gap-2"
          >
            <button
              ref={notificationTriggerRef}
              type="button"
              onClick={() => setNotificationsOpen(true)}
              aria-label={`Open notifications${unreadNotifications ? `, ${unreadNotifications} unread` : ""
                }`}
              aria-controls="notifications-drawer"
              aria-expanded={notificationsOpen}
              aria-haspopup="dialog"
              className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 transition hover:border-sky-300/50 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080a0f] sm:h-11 sm:w-11"
              style={{ color: "var(--app-text)" }}
            >
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                className="h-[18px] w-[18px] sm:h-5 sm:w-5"
              >
                <path
                  d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path d="M10 21h4" strokeLinecap="round" />
              </svg>
              {unreadNotifications > 0 && (
                <span
                  aria-hidden
                  className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-sky-400 ring-2 ring-slate-950 sm:right-2 sm:top-2"
                />
              )}
            </button>

            <button
              ref={menuTriggerRef}
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Open options"
              aria-controls="options-drawer"
              aria-expanded={menuOpen}
              aria-haspopup="dialog"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-lg text-gray-200 transition hover:border-white/25 hover:bg-white/10 hover:text-white sm:h-11 sm:w-11"
            >
              <span className="flex flex-col gap-[3px]">
                <span className="block h-[2px] w-5 rounded-full" style={{ backgroundColor: "var(--app-text)", borderColor: "var(--nav-border)" }} />
                <span className="block h-[2px] w-5 rounded-full" style={{ backgroundColor: "var(--app-text)", borderColor: "var(--nav-border)" }} />
                <span className="block h-[2px] w-5 rounded-full" style={{ backgroundColor: "var(--app-text)", borderColor: "var(--nav-border)" }} />
              </span>
            </button>
          </div>
        </div>
      </header>
      {/* The header leaves the flow at `lg` (position: fixed); reserve its height. */}
      <div
        data-app-header-spacer
        aria-hidden
        className="hidden lg:block lg:h-[var(--app-header-height)]"
      />

      <div
        className={`fixed inset-0 z-50 ${notificationsOpen ? "pointer-events-auto" : "pointer-events-none"
          }`}
        aria-hidden={!notificationsOpen}
        inert={!notificationsOpen}
      >
        <button
          type="button"
          aria-label="Dismiss notifications"
          tabIndex={-1}
          onClick={() => setNotificationsOpen(false)}
          className={`absolute inset-0 ${SIDE_DRAWER_MOTION.backdrop} ${notificationsOpen
            ? SIDE_DRAWER_MOTION.backdropOpen
            : SIDE_DRAWER_MOTION.backdropClosed
            }`}
        />
        <aside
          ref={notificationDrawerRef}
          id="notifications-drawer"
          data-notifications-drawer
          role="dialog"
          aria-modal="true"
          aria-labelledby="notifications-drawer-title"
          tabIndex={-1}
          className={`absolute inset-y-0 left-0 right-0 flex max-w-none flex-col bg-slate-950 shadow-2xl sm:left-auto sm:w-full sm:max-w-md sm:border-l sm:border-white/10 ${SIDE_DRAWER_MOTION.panel} ${SIDE_DRAWER_DESKTOP_WIDTH.standard
            } ${notificationsOpen
              ? SIDE_DRAWER_MOTION.open
              : SIDE_DRAWER_MOTION.closedRight
            }`}
        >
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 sm:px-6">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400">
                activity
              </p>
              <h2
                id="notifications-drawer-title"
                className="mt-1 text-lg font-semibold text-white"
              >
                Notifications
              </h2>
            </div>
            <DrawerCloseButton
              ref={notificationCloseRef}
              onClick={() => setNotificationsOpen(false)}
              aria-label="close notifications"
            />
          </div>
          <div className="flex items-center justify-end border-b border-white/10 px-5 py-2 sm:px-6">
            {notificationsOpen && Array.isArray(notification) && notification.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[9px] uppercase tracking-[0.16em] text-gray-400 transition hover:border-white/20 hover:bg-white/10 hover:text-white sm:text-[10px] sm:tracking-[0.18em]"
              >
                <TrashIcon className="h-3 w-3 shrink-0" />
                <span>clear all</span>
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6">
            <NotificationsFeed
              onOpenProfile={handleViewProfile}
              onOpenGroup={handleOpenGroup}
            />
          </div>
        </aside>
      </div>

      <div
        className={`fixed inset-0 z-40 ${menuOpen ? "pointer-events-auto" : "pointer-events-none"
          }`}
        aria-hidden={!menuOpen}
        inert={!menuOpen}
      >
        <button
          type="button"
          aria-label="Dismiss options"
          tabIndex={-1}
          onClick={() => setMenuOpen(false)}
          className={`absolute inset-0 ${SIDE_DRAWER_MOTION.backdrop} ${menuOpen
            ? SIDE_DRAWER_MOTION.backdropOpen
            : SIDE_DRAWER_MOTION.backdropClosed
            }`}
        />
        <aside
          ref={menuDrawerRef}
          id="options-drawer"
          data-options-drawer
          role="dialog"
          aria-modal="true"
          aria-labelledby="options-drawer-title"
          tabIndex={-1}
          className={`ui-accent-menu-surface absolute inset-y-0 right-0 h-full w-[80vw] min-w-[260px] overflow-y-auto p-6 ring-1 ring-white/10 sm:w-[40vw] lg:w-full ${SIDE_DRAWER_DESKTOP_WIDTH.standard} ${SIDE_DRAWER_MOTION.panel} ${menuOpen
            ? SIDE_DRAWER_MOTION.open
            : SIDE_DRAWER_MOTION.closedRight
            }`}
        >
          <div className="mb-5 flex items-center justify-between">
            <div className="flex flex-col">
              <span
                id="options-drawer-title"
                className="text-xs uppercase tracking-[0.14em] text-gray-400"
              >
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
            <DrawerCloseButton
              ref={menuCloseRef}
              onClick={() => setMenuOpen(false)}
              aria-label="close options"
            />
          </div>

          <div className="flex flex-col gap-3 text-sm font-semibold uppercase tracking-[0.1em] text-white">
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                router.push("/app-settings");
              }}
              className="group flex items-center justify-end rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:border-emerald-400/50 hover:bg-emerald-500/10 gap-5"
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
              className="group flex items-center justify-end gap-5 rounded-xl border border-white/10 bg-white/5 px-4 py-3 transition hover:border-violet-300/50 hover:bg-violet-400/10"
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
              className="group ui-accent-outline-hover flex items-center justify-end gap-5 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left transition"
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
              className="group flex items-center justify-end gap-5 rounded-xl border border-white/10 bg-white/5 px-4 py-3 transition hover:border-white/25 hover:bg-white/10"
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
                  setMenuOpen(false);
                  handleLogOut();
                }}
                className="group flex items-center justify-end gap-5 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:border-red-400/60 hover:bg-red-500/10"
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
        </aside>
      </div>

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
