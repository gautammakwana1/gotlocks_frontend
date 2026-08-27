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
import {
    SettingsActionBar,
    SettingsHeader,
    SettingsPage,
    SettingsSection,
    SettingsStatus,
    settingsFieldLabelClassName,
    settingsInputClassName,
    settingsPrimaryButtonClassName,
    settingsSecondaryButtonClassName,
} from "@/components/settings/SettingsUI";

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

/* Room for the reveal button, which is absolutely positioned over the field. */
const passwordInputClassName = `${settingsInputClassName} pr-12`;

const fieldErrorClassName = "block text-xs font-medium normal-case text-red-400";

const revealButtonClassName =
    "absolute inset-y-0 right-3 my-auto flex h-11 w-8 items-center justify-center text-gray-400 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-50";

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
    const [showGoogleMsg, setShowGoogleMsg] = useState(false);
    const isGoogleUser = authProvider === "google";

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
            nextErrors.currentPassword = "Current password is required.";
        }

        if (!form.nextPassword?.trim()) {
            nextErrors.nextPassword = "New password is required.";
        } else if (form.nextPassword.length < 6) {
            nextErrors.nextPassword = "Password must be at least 6 characters.";
        }

        if (form.currentPassword.trim() === form.nextPassword.trim()) {
            nextErrors.nextPassword = "Current and new password must be different.";
        }

        if (!form.confirmPassword.trim()) {
            nextErrors.confirmPassword = "Confirm password is required.";
        }

        if (form.nextPassword.trim() !== form.confirmPassword.trim()) {
            nextErrors.confirmPassword = "New and confirm password do not match.";
        }

        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    }, [form]);

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!validate()) return;

        if (form.currentPassword && form.nextPassword && form.confirmPassword) {
            dispatch(changePasswordRequest({ oldPassword: form.currentPassword?.trim(), newPassword: form.nextPassword?.trim(), confirmPassword: form.confirmPassword?.trim() }));
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

    /* The MVP's live field hints — stated as the field is filled rather than
       held back until submit, so the rule is visible before it is broken. */
    const passwordMeetsLength = form.nextPassword.length >= 6;
    const confirmationStarted = form.confirmPassword.length > 0;
    const passwordsMatch =
        confirmationStarted && form.nextPassword === form.confirmPassword;
    const formReady =
        !isGoogleUser &&
        form.currentPassword.length > 0 &&
        passwordMeetsLength &&
        passwordsMatch;

    return (
        <SettingsPage>
            <SettingsHeader title="Change your password" backHref="/app-settings" />

            <form onSubmit={handleSubmit}>
                <SettingsSection
                    title="Password"
                    description="Verify your current password, then choose the replacement."
                    bodyClassName="space-y-7"
                    layout="split"
                >
                    <label className="block space-y-2">
                        <span className={settingsFieldLabelClassName}>Current password</span>
                        {/* A Google account has no password to rotate. The overlay is
                            what surfaces that, since the disabled input fires nothing. */}
                        <span
                            className="relative block"
                            onClick={() => isGoogleUser && setShowGoogleMsg(true)}
                        >
                            <input
                                name="currentPassword"
                                type={showCurrentPassword ? "text" : "password"}
                                value={form.currentPassword}
                                onChange={handleInputChange("currentPassword")}
                                className={passwordInputClassName}
                                autoComplete="current-password"
                                disabled={isGoogleUser}
                            />
                            <button
                                type="button"
                                className={revealButtonClassName}
                                onClick={() => togglePasswordVisibility("current")}
                                aria-label={showCurrentPassword ? "Hide password" : "Show password"}
                                disabled={isGoogleUser}
                            >
                                {showCurrentPassword ? <EyeIcon size={20} /> : <EyeClosedIcon size={20} />}
                            </button>
                            {isGoogleUser && <span className="absolute inset-0 cursor-pointer" />}
                        </span>
                        {errors.currentPassword && (
                            <span className={fieldErrorClassName}>{errors.currentPassword}</span>
                        )}
                    </label>

                    <div className="grid gap-4 md:grid-cols-2">
                        <label className="block space-y-2">
                            <span className={settingsFieldLabelClassName}>New password</span>
                            <span className="relative block">
                                <input
                                    name="newPassword"
                                    aria-label="New password"
                                    type={showNewPassword ? "text" : "password"}
                                    value={form.nextPassword}
                                    onChange={handleInputChange("nextPassword")}
                                    className={passwordInputClassName}
                                    autoComplete="new-password"
                                    minLength={6}
                                    disabled={isGoogleUser}
                                    aria-describedby="new-password-requirement"
                                />
                                <button
                                    type="button"
                                    className={revealButtonClassName}
                                    onClick={() => togglePasswordVisibility("new")}
                                    aria-label={showNewPassword ? "Hide password" : "Show password"}
                                    disabled={isGoogleUser}
                                >
                                    {showNewPassword ? <EyeIcon size={20} /> : <EyeClosedIcon size={20} />}
                                </button>
                            </span>
                            {errors.nextPassword ? (
                                <span className={fieldErrorClassName}>{errors.nextPassword}</span>
                            ) : (
                                <span
                                    id="new-password-requirement"
                                    className={`block text-xs normal-case leading-5 ${form.nextPassword.length > 0 && !passwordMeetsLength
                                        ? "text-amber-200"
                                        : "text-[var(--text-muted)]"
                                        }`}
                                >
                                    Use at least 6 characters.
                                </span>
                            )}
                        </label>

                        <label className="block space-y-2">
                            <span className={settingsFieldLabelClassName}>Confirm new password</span>
                            <span className="relative block">
                                <input
                                    name="confirmPassword"
                                    aria-label="Confirm new password"
                                    type={showConfirmPassword ? "text" : "password"}
                                    value={form.confirmPassword}
                                    onChange={handleInputChange("confirmPassword")}
                                    className={passwordInputClassName}
                                    autoComplete="new-password"
                                    minLength={6}
                                    disabled={isGoogleUser}
                                    aria-invalid={confirmationStarted && !passwordsMatch}
                                    aria-describedby={confirmationStarted ? "password-match-status" : undefined}
                                />
                                <button
                                    type="button"
                                    className={revealButtonClassName}
                                    onClick={() => togglePasswordVisibility("confirm")}
                                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                                    disabled={isGoogleUser}
                                >
                                    {showConfirmPassword ? <EyeIcon size={20} /> : <EyeClosedIcon size={20} />}
                                </button>
                            </span>
                            {errors.confirmPassword ? (
                                <span className={fieldErrorClassName}>{errors.confirmPassword}</span>
                            ) : confirmationStarted ? (
                                <span
                                    id="password-match-status"
                                    role={passwordsMatch ? "status" : "alert"}
                                    className={`block text-xs normal-case leading-5 ${passwordsMatch ? "text-emerald-200" : "text-red-200"
                                        }`}
                                >
                                    {passwordsMatch ? "Passwords match." : "New passwords do not match."}
                                </span>
                            ) : null}
                        </label>
                    </div>

                    <div className="space-y-4 pt-1">
                        <SettingsStatus tone="info">
                            {isGoogleUser && showGoogleMsg
                                ? "Your account is linked with Google sign-in, so you don’t have a password to update."
                                : null}
                        </SettingsStatus>

                        <SettingsActionBar>
                            <Link href="/app-settings" className={settingsSecondaryButtonClassName}>
                                Cancel
                            </Link>
                            <button
                                type="submit"
                                disabled={!formReady}
                                className={settingsPrimaryButtonClassName}
                            >
                                Save password
                            </button>
                        </SettingsActionBar>
                    </div>
                </SettingsSection>
            </form>
        </SettingsPage>
    );
};

export default ChangePasswordPage;
