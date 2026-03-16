"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { useToast } from "@/lib/state/ToastContext";
import { changePasswordRequest, clearChangePasswordMessage } from "@/lib/redux/slices/authSlice";
import { RootState } from "@/lib/interfaces/interfaces";
import FootballAnimation from "@/components/animations/FootballAnimation";
import { EyeClosedIcon, EyeIcon } from "lucide-react";
import { getLocalStorage } from "@/lib/utils/jwtUtils";

interface FormData {
    currentPassword?: string;
    nextPassword?: string;
    confirmPassword?: string;
}

interface FormErrors {
    currentPassword?: string;
    nextPassword?: string;
    confirmPassword?: string;
}

const inputClassName =
    "w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-[var(--app-text)] outline-none transition focus:border-white/20";

const ChangePasswordPage = () => {
    const dispatch = useDispatch();
    const currentUser = useCurrentUser();
    const { setToast } = useToast();
    const [form, setForm] = useState({
        currentPassword: "",
        nextPassword: "",
        confirmPassword: "",
    });
    const [errors, setErrors] = useState<FormErrors>({});
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const authProvider = getLocalStorage("provider");

    const { loading, resetPasswordMessage, resetPasswordError } = useSelector((state: RootState) => state.user);

    useEffect(() => {
        if (!loading && resetPasswordMessage) {
            setToast({
                id: Date.now(),
                type: "success",
                message: resetPasswordMessage,
                duration: 3000
            })
            dispatch(clearChangePasswordMessage());
        }
        if (!loading && resetPasswordError) {
            setToast({
                id: Date.now(),
                type: "error",
                message: resetPasswordError,
                duration: 3000
            })
            dispatch(clearChangePasswordMessage());
        }
    }, [dispatch, loading, resetPasswordMessage, resetPasswordError, setToast]);

    const validate = useCallback((): boolean => {
        const nextErrors: FormErrors = {};

        if (!form.currentPassword?.trim()) {
            nextErrors.currentPassword = "Current Password is required.";
        }

        if (!form.nextPassword?.trim()) {
            nextErrors.nextPassword = "New Password is required.";
        } else if (form.nextPassword.length < 6) {
            nextErrors.nextPassword = "Password must be at least 6 characters.";
        }

        if (form.currentPassword === form.nextPassword) {
            nextErrors.nextPassword = "Current & New Password must be different.";
        }

        if (!form.confirmPassword.trim()) {
            nextErrors.confirmPassword = "Confirm Password is required.";
        }

        if (form.nextPassword !== form.confirmPassword) {
            nextErrors.confirmPassword = "New & Confirm Password do not match.";
        }

        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    }, [form]);

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!validate()) return;

        if (form.currentPassword && form.nextPassword && form.confirmPassword) {
            if (form.nextPassword !== form.confirmPassword) {
                setToast({ id: Date.now(), type: "error", message: "New passwords do not match.", duration: 3000 });
                return;
            }
            dispatch(changePasswordRequest({ oldPassword: form.currentPassword, newPassword: form.nextPassword, confirmPassword: form.confirmPassword }));
        }

        setForm({
            currentPassword: "",
            nextPassword: "",
            confirmPassword: "",
        });
    };

    const handleInputChange = useCallback(
        (field: keyof FormData) => (event: React.ChangeEvent<HTMLInputElement>) => {
            const value = event.target.value;
            setForm((prev) => ({ ...prev, [field]: value }));

            if (errors[field as keyof FormErrors]) {
                setErrors((prev) => ({ ...prev, [field]: undefined }));
            }
        },
        [errors]
    );

    const togglePasswordVisibility = useCallback((passwordType: string) => {
        if (passwordType === "current") {
            setShowCurrentPassword((prev) => !prev);
        }
        if (passwordType === "new") {
            setShowNewPassword((prev) => !prev);
        }
        if (passwordType === "confirm") {
            setShowConfirmPassword((prev) => !prev);
        }
    }, []);

    if (!currentUser) return null;

    if (loading) {
        return (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
                <div className="w-48 max-w-[70vw] sm:w-60">
                    <FootballAnimation />
                </div>
            </div>
        )
    }

    return (
        <div className="mx-auto w-full max-w-2xl space-y-6">
            <header className="space-y-3 border-b border-[var(--border-soft)] pb-5">
                <Link
                    href="/app-settings"
                    className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)] transition hover:text-[var(--app-text)]"
                >
                    account settings
                </Link>
                <h1 className="text-2xl font-semibold tracking-tight text-[var(--app-text)]">
                    Change your password
                </h1>
                <p className="text-sm leading-6 text-[var(--text-secondary)]">
                    Update the password you use to sign in to this account.
                </p>
            </header>

            <form onSubmit={handleSubmit} className="space-y-4">
                <label className="block space-y-2">
                    <span className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                        Current password
                    </span>
                    <div className="relative">
                        <input
                            type={showCurrentPassword ? "text" : "password"}
                            value={form.currentPassword}
                            onChange={handleInputChange("currentPassword")}
                            className={`${inputClassName} disabled:cursor-not-allowed`}
                            autoComplete="current-password"
                            disabled={authProvider === "google"}
                        />
                        <button
                            type="button"
                            className="absolute inset-y-0 right-3 my-auto text-xs uppercase tracking-wide text-gray-400 transition hover:text-white"
                            onClick={() => togglePasswordVisibility("current")}
                            aria-label={showCurrentPassword ? "Hide password" : "Show password"}
                            disabled={authProvider === "google"}
                        >
                            {showCurrentPassword ? (
                                <EyeIcon size={20} />
                            ) : (
                                <EyeClosedIcon size={20} />
                            )}
                        </button>
                    </div>
                    {errors.currentPassword && (
                        <span className="text-xs font-medium text-red-400">
                            {errors.currentPassword}
                        </span>
                    )}
                </label>

                <label className="block space-y-2">
                    <span className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                        New password
                    </span>
                    <div className="relative">
                        <input
                            type={showNewPassword ? "text" : "password"}
                            value={form.nextPassword}
                            onChange={handleInputChange("nextPassword")}
                            className={`${inputClassName} disabled:cursor-not-allowed`}
                            autoComplete="new-password"
                            disabled={authProvider === "google"}
                        />
                        <button
                            type="button"
                            className="absolute inset-y-0 right-3 my-auto text-xs uppercase tracking-wide text-gray-400 transition hover:text-white"
                            onClick={() => togglePasswordVisibility("new")}
                            aria-label={showNewPassword ? "Hide password" : "Show password"}
                            disabled={authProvider === "google"}
                        >
                            {showNewPassword ? (
                                <EyeIcon size={20} />
                            ) : (
                                <EyeClosedIcon size={20} />
                            )}
                        </button>
                    </div>
                    {errors.nextPassword && (
                        <span className="text-xs font-medium text-red-400">
                            {errors.nextPassword}
                        </span>
                    )}
                </label>

                <label className="block space-y-2">
                    <span className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                        Confirm new password
                    </span>
                    <div className="relative">
                        <input
                            type={showConfirmPassword ? "text" : "password"}
                            value={form.confirmPassword}
                            onChange={handleInputChange("confirmPassword")}
                            className={`${inputClassName} disabled:cursor-not-allowed`}
                            autoComplete="new-password"
                            disabled={authProvider === "google"}
                        />
                        <button
                            type="button"
                            className="absolute inset-y-0 right-3 my-auto text-xs uppercase tracking-wide text-gray-400 transition hover:text-white"
                            onClick={() => togglePasswordVisibility("confirm")}
                            aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                            disabled={authProvider === "google"}
                        >
                            {showConfirmPassword ? (
                                <EyeIcon size={20} />
                            ) : (
                                <EyeClosedIcon size={20} />
                            )}
                        </button>
                    </div>
                    {errors.confirmPassword && (
                        <span className="text-xs font-medium text-red-400">
                            {errors.confirmPassword}
                        </span>
                    )}
                </label>

                <div className="flex flex-wrap gap-3 pt-2">
                    <button
                        type="submit"
                        className="rounded-full border border-white/10 bg-[var(--app-text)] px-4 py-2 text-sm font-medium text-[var(--app-bg)] transition hover:opacity-90 disabled:bg-white/50 disabled:cursor-not-allowed"
                        disabled={!form.currentPassword || !form.nextPassword || !form.confirmPassword || (authProvider === "google")}
                    >
                        Save password
                    </button>
                    <Link
                        href="/app-settings"
                        className="rounded-full border border-white/10 px-4 py-2 text-sm text-[var(--app-text)] transition hover:border-white/20 hover:bg-white/5"
                    >
                        Back
                    </Link>
                </div>
            </form>
        </div>
    );
};

export default ChangePasswordPage;
