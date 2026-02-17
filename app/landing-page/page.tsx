"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { APP_NAME, COLORS } from "@/lib/constants";
import { clearLoginWithEmailMessage, initialForgotPasswordOTPRequest, loginWithEmailRequest, resetPasswordRequest, verifyForgotPasswordOTPRequest } from "../../lib/redux/slices/authSlice";
import { useSelector } from "react-redux";
import { getLocalStorage, setLocalStorage } from "@/lib/utils/jwtUtils";
import { useToast } from "@/lib/state/ToastContext";
import type { RootState } from "@/lib/interfaces/interfaces";
import { supabase } from "@/lib/supabaseClient";
import { displayNameGradientStyle } from "@/lib/styles/text";
import { useAppDispatch } from "@/lib/redux/hooks";
import ForgotPasswordModal from "@/components/modals/ForgotPasswordModal";
import { EyeClosed, EyeIcon } from "lucide-react";

const LandingPage = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setError] = useState<string | null>(null);
  const [showManualSignIn, setShowManualSignIn] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const { setToast } = useToast();
  const { error, user: authUser, message, loading } = useSelector((state: RootState) => state.user);
  const user = authUser;

  useEffect(() => {
    const storedUser = getLocalStorage("currentUser");
    const storedAccessToken = getLocalStorage("accessToken");
    const storedRefreshToken = getLocalStorage("refresh_token");
    const storedProvider = getLocalStorage("provider");
    const storedUserId = getLocalStorage("userId");
    if (storedUser && storedAccessToken && storedRefreshToken && storedProvider && storedUserId) {
      router.push("/home")
    }
  }, [router]);

  useEffect(() => {
    if (user?.data?.user) {
      const userData = user?.data?.user;
      const { access_token, refresh_token, userId, userData: profile, provider } = userData;
      if (!loading && message) {
        setLocalStorage("accessToken", access_token);
        setLocalStorage("refresh_token", refresh_token);
        setLocalStorage("currentUser", { ...profile, userId });
        setLocalStorage("userId", userId);
        setLocalStorage("provider", provider);
        dispatch(clearLoginWithEmailMessage());
        router.push("/home");
      }
    } else if (error) {
      setToast({
        id: Date.now(),
        type: "error",
        message: error,
        duration: 4000,
      });
      dispatch(clearLoginWithEmailMessage());
    }

    if (user?.url) {
      window.location.href = user?.url;
    }
  }, [user, error, loading, message, dispatch, router, setToast]);

  const handleManualSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim()) {
      setError("Email is Required.")
      return;
    }
    if (!password.trim()) {
      setError("Password is Required.")
      return;
    }
    dispatch(loginWithEmailRequest({ loginId: email, password }));
  };

  const handleGoogleAuth = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: process.env.NEXT_PUBLIC_CALLBACK_URL,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent select_account',
        },
      },
    });

    if (error) {
      console.error('Login error:', error)
      alert('Login failed')
    }
    setShowManualSignIn(false);
    setError(null);
  };

  const togglePasswordVisibility = useCallback(() => {
    setShowPassword((prev) => !prev);
  }, []);

  const handleInitialPasswordOTP = (usermail: string) => {
    if (usermail) {
      dispatch(initialForgotPasswordOTPRequest({ email: usermail }))
    }
  };

  const handleVerifyPasswordOTP = (code: string, email: string) => {
    if (code && email) {
      dispatch(verifyForgotPasswordOTPRequest({ otp: code, email }));
    }
  };

  const handleResetPassword = (email: string, resetToken: string, newPassword: string, confirmPassword: string) => {
    if (email && resetToken && newPassword && confirmPassword) {
      dispatch(resetPasswordRequest({ email, resetToken, newPassword, confirmPassword }));
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-64px)] flex-col items-center justify-center gap-10 pb-20 text-white">
      <div className="flex w-full max-w-md flex-col items-center gap-4 text-center">
        <h1
          className="allow-caps text-5xl font-extrabold text-transparent bg-clip-text"
          style={{
            ...displayNameGradientStyle,
            backgroundImage: `linear-gradient(130deg, ${COLORS.ACCENT} 0%, ${COLORS.ACCENT} 100%)`,
            color: COLORS.ACCENT,
          }}
        >
          {APP_NAME.toLowerCase()}
        </h1>
      </div>

      <div className="flex w-full max-w-md flex-col gap-4 rounded-3xl border border-white/10 bg-black/60 p-6 shadow-xl backdrop-blur">
        <button
          type="button"
          onClick={() => router.push("/account-creation")}
          className={`w-full rounded-2xl border border-emerald-400/50 bg-gradient-to-br from-emerald-500/35 via-emerald-400/15 to-black/40 py-3 text-base font-semibold uppercase tracking-wide text-emerald-100 transition hover:border-emerald-300/70 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300`}
        >
          create an account
        </button>

        <button
          type="button"
          onClick={() => {
            setShowManualSignIn(true);
            setError(null);
          }}
          className="w-full rounded-2xl border border-white/15 px-4 py-3 text-base font-semibold uppercase tracking-wide text-white transition hover:border-white/35 hover:bg-white/5"
          aria-expanded={showManualSignIn}
        >
          sign in with username
        </button>

        {/* TODO Phase 2:
            - Trigger Supabase Google OAuth sign-in.
            - After OAuth succeeds, check if the profile has a username.
            - If missing, route to a dedicated "Set Username" screen so the user chooses a unique handle (stored as User.name).
            - Persist the username/profile in Supabase, then redirect into the main app.
            - If the username already exists, skip onboarding and drop them into their groups list.
        */}
        <button
          type="button"
          onClick={handleGoogleAuth}
          className="w-full rounded-2xl border border-white/15 px-4 py-3 text-base font-semibold uppercase tracking-wide text-white transition hover:border-white/35 hover:bg-white/5"
        >
          sign in with Google
        </button>

        {showManualSignIn && (
          <form className="mt-2 flex flex-col gap-3" onSubmit={handleManualSubmit}>
            <div className="flex flex-col gap-1">
              <label htmlFor="email" className="text-xs uppercase text-gray-400">
                email
              </label>
              <input
                id="email"
                type="text"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value)
                  setError(null)
                }}
                className="w-full rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white caret-emerald-300 outline-none transition focus:border-[rgba(0,255,153,0.6)]"
                placeholder="shane@gotlocks.com"
                autoComplete="email"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="password" className="text-xs uppercase text-gray-400">
                password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value)
                    setError(null)
                  }}
                  className="w-full rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white caret-emerald-300 outline-none transition focus:border-[rgba(0,255,153,0.6)]"
                  placeholder="locks123"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-3 my-auto text-xs uppercase tracking-wide text-gray-400 transition hover:text-white"
                  onClick={togglePasswordVisibility}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeIcon size={20} />
                  ) : (
                    <EyeClosed size={20} />
                  )}
                </button>
              </div>
            </div>

            {errors && (
              <span className="text-xs font-medium text-red-400">{errors}</span>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-2xl bg-white/10 py-3 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "signing in..." : "sign in"}
            </button>
            <Link
              href="#"
              className="text-xs uppercase tracking-wide text-gray-500 transition hover:text-gray-200"
              aria-disabled
              onClick={() => setShowForgotPassword(true)}
            >
              forgot password?
            </Link>
          </form>
        )}
      </div>

      <ForgotPasswordModal
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
        onInitialOTP={handleInitialPasswordOTP}
        onVerifyOTP={handleVerifyPasswordOTP}
        onResetPassword={handleResetPassword}
      />
    </div >
  );
};

export default LandingPage;
