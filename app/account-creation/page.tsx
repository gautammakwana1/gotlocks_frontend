"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/redux/hooks";
import { clearRegisterUserMessage, registerUserRequest } from "@/lib/redux/slices/authSlice";
import { setLocalStorage } from "@/lib/utils/jwtUtils";
import { COLORS } from "@/lib/constants";
import { useToast } from "@/lib/state/ToastContext";
import { AuthSelector, RegisterPayload } from "@/lib/interfaces/interfaces";
import { EyeClosedIcon, EyeIcon } from "lucide-react";
import CustomDatePicker from "@/components/ui/CustomDatePicker";

interface FormData {
  firstName?: string;
  lastName?: string;
  email: string;
  password: string;
  age: string;
  dob: Date | undefined;
  username: string;
}

interface FormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  dob?: string;
  username?: string;
}

const AccountCreationPage = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const [formData, setFormData] = useState<FormData>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    age: "",
    dob: undefined,
    username: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const { setToast } = useToast();

  const { error, user, message, loading } = useSelector(
    (state: AuthSelector) => state?.user
  );

  useEffect(() => {
    if (loading) return;

    if (user && message) {
      const username = user?.user?.user_metadata?.username || "User";

      setToast(({
        id: Date.now(),
        type: "success",
        message: `Hello, ${username}!, Please Verified email or phone and try to login.`,
        duration: 4000,
      }));
      dispatch(clearRegisterUserMessage());

      const accessToken = user?.user?.access_token;
      if (accessToken) {
        setLocalStorage("accessToken", accessToken);

        setTimeout(() => {
          router.push("/home");
        }, 2000);
      } else {
        router.push("/landing-page");
      }
    } else if (error) {
      setToast(({
        id: Date.now(),
        type: "error",
        message: error,
        duration: 4000,
      }));
      dispatch(clearRegisterUserMessage());
    }
  }, [user, error, loading, message, router, setToast, dispatch]);

  const validate = useCallback((): boolean => {
    const nextErrors: FormErrors = {};

    if (!formData.firstName?.trim()) {
      nextErrors.firstName = "First name is required.";
    }

    if (!formData.lastName?.trim()) {
      nextErrors.lastName = "Last name is required.";
    }

    if (!formData.email.trim()) {
      nextErrors.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      nextErrors.email = "Please enter a valid email address.";
    }

    if (!formData.password.trim()) {
      nextErrors.password = "Password is required.";
    } else if (formData.password.length < 6) {
      nextErrors.password = "Password must be at least 6 characters.";
    }

    if (!formData.dob) {
      nextErrors.dob = "Date Of Birth is required.";
    }

    if (!formData.username.trim()) {
      nextErrors.username = "Pick a unique username.";
    } else if (formData.username.trim().length < 3) {
      nextErrors.username = "Username must be at least 3 characters.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }, [formData]);

  const handleInputChange = useCallback(
    (field: keyof FormData) => (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setFormData((prev) => ({ ...prev, [field]: value }));

      if (errors[field as keyof FormErrors]) {
        setErrors((prev) => ({ ...prev, [field]: undefined }));
      }
    },
    [errors]
  );

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!validate()) return;

      try {
        const payload: RegisterPayload = {
          fullName: `${formData.firstName?.trim()} ${formData.lastName?.trim()}`.trim(),
          username: formData.username.trim(),
          email: formData.email.trim(),
          password: formData.password.trim(),
          dob: formData.dob ? formData.dob.toISOString().split("T")[0] : "",
        };

        if (formData.age) {
          const parsedAge = Number(formData.age);
          if (!isNaN(parsedAge) && parsedAge > 0) {
            payload.age = parsedAge;
          }
        }

        dispatch(registerUserRequest(payload as RegisterPayload));
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Registration failed";

        setToast(({
          id: Date.now(),
          type: "error",
          message: errorMessage,
          duration: 4000,
        }));
      }
    },
    [formData, validate, dispatch, setToast]
  );

  const togglePasswordVisibility = useCallback(() => {
    setShowPassword((prev) => !prev);
  }, []);

  const handleGoBack = useCallback(() => {
    router.push("/landing-page");
  }, [router]);

  return (
    <div className="flex flex-col gap-10">

      <button
        type="button"
        className="w-fit text-xs uppercase tracking-wide text-gray-400 transition hover:text-white"
        onClick={handleGoBack}
        aria-label="Go back to landing page"
      >
        ← go back
      </button>

      <header className="flex flex-col gap-2">
        <span className="text-sm uppercase tracking-[0.3em] text-gray-500">
          onboarding
        </span>
        <h1
          className="text-4xl font-semibold"
          style={{ color: COLORS.ACCENT }}
        >
          welcome
        </h1>
        <p className="text-sm text-gray-400">
          Create your account to track slips, leaderboard swings, and every
          little receipt worth bragging about.
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-5 rounded-3xl border border-white/10 bg-black/60 p-6 shadow-lg backdrop-blur"
        noValidate
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-wide text-gray-400">
              first name <span className="text-red-400">*</span>
            </span>
            <input
              type="text"
              value={formData.firstName}
              onChange={(event) =>
                setFormData((prev) => ({ ...prev, firstName: event.target.value }))
              }
              className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400/70"
              placeholder="Shane"
              autoComplete="given-name"
            />
            {errors.firstName && (
              <span className="text-xs font-medium text-red-400">
                {errors.firstName}
              </span>
            )}
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-wide text-gray-400">
              last name <span className="text-red-400">*</span>
            </span>
            <input
              type="text"
              value={formData.lastName}
              onChange={(event) =>
                setFormData((prev) => ({ ...prev, lastName: event.target.value }))
              }
              className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400/70"
              placeholder="Walker"
              autoComplete="family-name"
            />
            {errors.lastName && (
              <span className="text-xs font-medium text-red-400">
                {errors.lastName}
              </span>
            )}
          </label>
        </div>
        <label className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-wide text-gray-400">
            enter your email <span className="text-red-400">*</span>
          </span>
          <input
            type="email"
            value={formData.email}
            onChange={handleInputChange("email")}
            className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400/70"
            placeholder="shane@gotlocks.com"
            autoComplete="email"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "email-error" : undefined}
          />
          {errors.email && (
            <span
              id="email-error"
              role="alert"
              className="text-xs font-medium text-red-400"
            >
              {errors.email}
            </span>
          )}
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-wide text-gray-400">
            enter in a password <span className="text-red-400">*</span>
          </span>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={formData.password}
              onChange={handleInputChange("password")}
              className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 pr-14 text-sm text-white outline-none transition focus:border-emerald-400/70"
              placeholder="set a secure password"
              autoComplete="new-password"
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? "password-error" : undefined}
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
                <EyeClosedIcon size={20} />
              )}
            </button>
          </div>
          {errors.password && (
            <span
              id="password-error"
              role="alert"
              className="text-xs font-medium text-red-400"
            >
              {errors.password}
            </span>
          )}
        </label>

        <CustomDatePicker
          label="date of birth"
          value={formData?.dob}
          onChange={(date) => setFormData({ ...formData, dob: date })}
          required
          startYear={1900}
          disableFuture
          placeholder="select your date of birth"
          note="User must be 13 years old"
        />

        <label className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-wide text-gray-400">
            pick a unique username <span className="text-red-400">*</span>
          </span>
          <input
            type="text"
            value={formData.username}
            onChange={handleInputChange("username")}
            className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400/70"
            placeholder="broknowsball"
            autoComplete="username"
            aria-invalid={!!errors.username}
            aria-describedby={errors.username ? "username-error" : undefined}
          />
          {errors.username && (
            <span
              id="username-error"
              role="alert"
              className="text-xs font-medium text-red-400"
            >
              {errors.username}
            </span>
          )}
        </label>

        <button
          type="submit"
          disabled={loading}
          className="mt-2 w-full rounded-2xl bg-white/10 py-3 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "registering..." : "register"}
        </button>
      </form>
    </div>
  );
};

export default AccountCreationPage;