"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { APP_NAME } from "@/lib/constants";
import { clearLoginWithEmailMessage, initialForgotPasswordOTPRequest, loginWithEmailRequest, resetPasswordRequest, verifyForgotPasswordOTPRequest } from "../../lib/redux/slices/authSlice";
import { useSelector } from "react-redux";
import { getLocalStorage, setLocalStorage } from "@/lib/utils/jwtUtils";
import { useToast } from "@/lib/state/ToastContext";
import type { RootState } from "@/lib/interfaces/interfaces";
import { supabase } from "@/lib/supabaseClient";
import { useAppDispatch } from "@/lib/redux/hooks";
import ForgotPasswordModal from "@/components/modals/ForgotPasswordModal";
import { EyeClosed, EyeIcon } from "lucide-react";
import Image from "next/image";
import AuthLegalNotice from "@/components/ui/AuthLegalNotic";
import { motion } from "framer-motion";

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
    const setupSession = async () => {
      if (user?.data?.user) {
        const userData = user?.data?.user;

        const {
          access_token,
          refresh_token,
          userId,
          userData: profile,
          provider,
        } = userData;

        if (access_token && refresh_token) {
          await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
        }

        setLocalStorage("accessToken", access_token);
        setLocalStorage("refresh_token", refresh_token);
        setLocalStorage("currentUser", { ...profile, userId });
        setLocalStorage("userId", userId);
        setLocalStorage("provider", provider);
        dispatch(clearLoginWithEmailMessage());
        router.push("/home");
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
    };
    setupSession();
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
        <div className="relative flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{
              opacity: 1,
              scale: [1, 1.08, 1],
            }}
            transition={{
              opacity: { duration: 0.6 },
              scale: {
                duration: 2.5,
                repeat: Infinity,
                ease: "easeInOut",
              },
            }}
            className="relative flex items-center justify-center"
          >
            <Image
              src="/gotlocks_blue_logo.svg"
              alt=""
              aria-hidden="true"
              width={52}
              height={52}
              className="h-25 w-25 object-contain sm:h-[120px] sm:w-[120px] select-none"
              priority
              draggable={false}
            />

            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                maskImage: "url(/logocolorblackborder.svg)",
                WebkitMaskImage: "url(/logocolorblackborder.svg)",
                maskSize: "contain",
                WebkitMaskSize: "contain",
                maskRepeat: "no-repeat",
                WebkitMaskRepeat: "no-repeat",
                maskPosition: "center",
                WebkitMaskPosition: "center",
              }}
            >
              <div
                className="absolute w-[30%] h-full 
                  bg-gradient-to-r 
                  from-transparent 
                  via-white/50 
                  to-transparent
                  skew-x-[-25deg]
                  animate-shine"
              />
            </div>
          </motion.div>
        </div>
        <div className="flex items-center gap-3 sm:gap-4 select-none">
          <h1>
            <Image
              src="/gotlockstext.svg"
              alt={APP_NAME}
              width={360}
              height={56}
              className="h-10 w-auto object-contain sm:h-12"
              priority
              draggable={"false"}
            />
          </h1>
        </div>
      </div>

      <div className="flex w-full max-w-md flex-col gap-4 rounded-3xl border border-white/10 bg-black/60 p-6 shadow-xl backdrop-blur">
        <button
          type="button"
          onClick={() => router.push("/account-creation")}
          className={`ui-accent-button w-full rounded-2xl py-3 text-base font-semibold uppercase tracking-wide transition`}
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
          sign in with email
        </button>

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
                email/username
              </label>
              <input
                id="email"
                type="text"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value)
                  setError(null)
                }}
                className="ui-input-accent w-full rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-base text-white outline-none transition"
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
                  className="ui-input-accent w-full rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-base text-white outline-none transition"
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

        <AuthLegalNotice />
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
