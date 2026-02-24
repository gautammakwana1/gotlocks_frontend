"use client";

import { useMemo, useCallback, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { logout } from "@/lib/redux/slices/authSlice";
import { getLocalStorage, removeLocalStorage } from "@/lib/utils/jwtUtils";
import { COLORS } from "@/lib/constants";
import { clearFetchAllGroupMessage } from "@/lib/redux/slices/groupsSlice";
import { useToast } from "@/lib/state/ToastContext";
import type { CurrentUser } from "@/lib/interfaces/interfaces";
import { displayNameGradientStyle } from "@/lib/styles/text";
import { LogOutIcon, MessageSquareMoreIcon, Settings } from "lucide-react";

type AuthUserPayload = {
  data?: {
    user?: {
      userData?: CurrentUser;
    };
  };
};

const HIDDEN_ROUTES = new Set([
  "/landing-page",
  "/account-creation",
  "/auth/callback",
  "/auth/set-username"
]);

const accentStyle = { color: COLORS.ACCENT } as const;

export const TopNav = () => {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const { setToast } = useToast();

  const authUser = useAppSelector((state) => state.user.user) as AuthUserPayload | null;
  const reduxUser = authUser?.data?.user?.userData ?? null;
  const storedUser = getLocalStorage<CurrentUser>("currentUser");
  const currentUser = reduxUser ?? storedUser ?? null;

  const hideNav = useMemo(() => {
    if (!pathname) return false;
    return HIDDEN_ROUTES.has(pathname);
  }, [pathname]);

  const handleLogOut = useCallback(() => {
    try {
      removeLocalStorage(`sb-${process.env.NEXT_PUBLIC_SUPABASE_PROJECT_REF}-auth-token`);
      removeLocalStorage("currentUser");
      removeLocalStorage("accessToken");
      removeLocalStorage("refresh_token");
      removeLocalStorage("userId");
      removeLocalStorage("provider");

      dispatch(logout());
      setToast({
        id: Date.now(),
        type: "success",
        message: "Successfully logged out",
        duration: 3000,
      });

      router.push("/landing-page");
      dispatch(clearFetchAllGroupMessage());
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

  // const handleFeedback = () => {
  //   const email = "feedback@gotlocks.com";
  //   const subject = encodeURIComponent("Feedback from Gotlocks User");
  //   const body = encodeURIComponent(
  //     `Hi there,\n\nI'd like to share my feedback:\n\n[Please write your feedback here]\n\nBest regards,`
  //   );

  //   window.open(
  //     `https://mail.google.com/mail/u/0/?view=cm&fs=1&to=${email}&su=${subject}&body=${body}`,
  //     "_blank"
  //   );
  // };

  if (hideNav) return null;

  return (
    <>
      <header
        className="sticky top-0 z-30 border-b backdrop-blur"
        style={{ backgroundColor: "var(--nav-bg)", borderColor: "var(--nav-border)" }}
      >
        <div className="relative mx-auto w-full max-w-4xl px-5 py-4">
          <div className="absolute left-5 top-1/2 -translate-y-1/2">
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
          <div className="flex justify-center items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/home")}
              className="text-lg font-extrabold uppercase tracking-[0.18em] text-white transition hover:text-emerald-200"
              style={accentStyle}
            >
              gotlocks?
            </button>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 bg-white/10 text-sm text-gray-300">
              ◻︎
            </div>
          </div>

          {/* <button
            type="button"
            onClick={toggleTheme}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-lg text-gray-200 transition hover:border-emerald-300/60 hover:bg-white/10 hover:text-white"
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button> */}
        </div>
      </header>

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
            className={`absolute left-0 top-0 h-full w-[80vw] min-w-[260px] bg-gradient-to-b from-white/8 via-white/5 to-black/80 p-6 shadow-2xl shadow-emerald-500/20 ring-1 ring-white/10
              sm:w-[40vw] lg:w-[25vw] transform transition-transform duration-300 ease-out ${isAnimating ? "translate-x-0" : "-translate-x-full"}
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
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:border-emerald-400/50 hover:bg-emerald-500/10"
              >
                <span>account settings</span>
                <Settings size={18} />
              </button>
              {currentUser && (
                <button
                  type="button"
                  onClick={() => {
                    closeMenu();
                    handleLogOut();
                  }}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:border-red-400/60 hover:bg-red-500/10"
                >
                  <span>logout</span>
                  <LogOutIcon size={18} />
                </button>
              )}
              <Link
                href="/feedback"
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 transition hover:border-white/25 hover:bg-white/10"
                onClick={closeMenu}
              >
                <span>feedback</span>
                <MessageSquareMoreIcon size={18} />
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TopNav;