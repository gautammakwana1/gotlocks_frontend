"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { useToast } from "@/lib/state/ToastContext";
import { useDispatch, useSelector } from "react-redux";
import { clearUpdateProfileMessage, fetchMemberProfileRequest, updateProfilePublicOrPrivateRequest, updateProfileRequest } from "@/lib/redux/slices/authSlice";
import { Profile } from "@/lib/interfaces/interfaces";
import { calculateAge, checkAnyRestrictedWords, checkForReservedWords } from "@/lib/utils/helpers";
import FootballAnimation from "@/components/animations/FootballAnimation";

type AuthSliceState = {
    user: {
        profile?: Profile | null;
    } | null;
    loading: boolean;
    error: string | null;
    message: string | null;
    profileUpdateMessage?: string;
};

type RootState = {
    user: AuthSliceState;
};

interface FormData {
    fullName?: string;
    username?: string;
    email?: string;
    age?: number;
}

interface FormErrors {
    fullName?: string;
    username?: string;
    email?: string;
}

const inputClassName =
    "w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-[var(--app-text)] outline-none transition focus:border-white/20 disabled:text-white/50";

const AccountInformationPage = () => {
    const dispatch = useDispatch();
    const router = useRouter();
    const currentUser = useCurrentUser();
    const { setToast } = useToast();
    const [form, setForm] = useState({
        fullName: "",
        username: "",
        email: "",
        age: 0,
    });
    const [errors, setErrors] = useState<FormErrors>({});
    const [isPublicDraft, setIsPublicDraft] = useState(true);
    const { user, loading, profileUpdateMessage, error } = useSelector((state: RootState) => state.user);
    const [showGoogleMsg, setShowGoogleMsg] = useState(false);
    const isGoogleUser = user?.profile?.provider === "google";

    useEffect(() => {
        if (currentUser?.userId) {
            dispatch(fetchMemberProfileRequest({ userId: currentUser?.userId }));
        }
    }, [dispatch, currentUser?.userId]);

    useEffect(() => {
        if (!user?.profile) return;

        setForm({
            fullName: user?.profile?.full_name ?? "",
            username: user?.profile?.username,
            email: user?.profile?.email,
            age: calculateAge(user?.profile?.dob) ?? 0
        });
        setIsPublicDraft(user?.profile?.is_public);
    }, [user?.profile, router]);

    useEffect(() => {
        if (!loading && profileUpdateMessage) {
            setToast({
                id: Date.now(),
                type: "success",
                message: profileUpdateMessage,
                duration: 3000
            })
            dispatch(clearUpdateProfileMessage());
            if (currentUser?.userId) {
                dispatch(fetchMemberProfileRequest({ userId: currentUser?.userId }));
            }
        }
        if (!loading && error) {
            setToast({
                id: Date.now(),
                type: "error",
                message: error,
                duration: 3000
            })
            dispatch(clearUpdateProfileMessage());
        }
    }, [dispatch, currentUser?.userId, loading, profileUpdateMessage, error, setToast]);

    const validate = useCallback((): boolean => {
        const nextErrors: FormErrors = {};

        if (!form.username.trim()) {
            nextErrors.username = "Pick a unique username.";
        } else if (form.username.trim().length < 3) {
            nextErrors.username = "Username must be at least 3 characters.";
        }

        if (!form.fullName.trim()) {
            nextErrors.fullName = "Full Name us required.";
        }

        if (!form.email.trim()) {
            nextErrors.email = "Email is required.";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
            nextErrors.email = "Please enter a valid email address.";
        }

        const containsNameRestricted = checkAnyRestrictedWords(form.username);
        if (containsNameRestricted) {
            nextErrors.username = "Username contains inappropriate language.";
        }

        const containsReserveWords = checkForReservedWords(form.username);
        if (containsReserveWords) {
            nextErrors.username = "Username contains reserved words.";
        }

        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    }, [form]);

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

    const joinedLabel = user?.profile?.created_at
        ? new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(
            new Date(user?.profile?.created_at)
        )
        : "Recently joined";

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!validate()) return;

        const usernameChanged = form.username.trim() !== user?.profile?.username;
        const emailChanged = form.email.trim() !== user?.profile?.email;
        const fullNameChanged = form.fullName.trim() !== user?.profile?.full_name;
        const formData = new FormData();

        formData.append("username", form.username.trim());

        if (emailChanged) {
            formData.append("email", form.email.trim());
        }

        if (fullNameChanged) {
            formData.append("fullName", form.fullName.trim());
        }

        if (usernameChanged || emailChanged || fullNameChanged) {
            dispatch(updateProfileRequest(formData));
        }

        if (isPublicDraft !== user?.profile?.is_public) {
            dispatch(updateProfilePublicOrPrivateRequest());
        }
    };

    if (!currentUser) return null;

    if (loading) {
        return (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
                <div className="w-48 max-w-[70vw] sm:w-60">
                    <FootballAnimation />
                </div>
            </div>
        )
    };

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
                    Account information
                </h1>
                <p className="text-sm leading-6 text-[var(--text-secondary)]">
                    View and edit the basic details tied to your account.
                </p>
            </header>

            <form onSubmit={handleSubmit} className="space-y-4">
                <label className="block space-y-2">
                    <span className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                        Full name
                    </span>
                    <input
                        value={form.fullName}
                        onChange={handleInputChange("fullName")}
                        className={inputClassName}
                        autoComplete="name"
                    />
                    {errors.fullName && (
                        <span className="text-xs font-medium text-red-400">
                            {errors.fullName}
                        </span>
                    )}
                </label>

                <label className="block space-y-2">
                    <span className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                        Username
                    </span>
                    <input
                        value={form.username}
                        onChange={handleInputChange("username")}
                        className={inputClassName}
                        autoComplete="username"
                    />
                    {errors.username && (
                        <span className="text-xs font-medium text-red-400">
                            {errors.username}
                        </span>
                    )}
                </label>

                <label className="block space-y-2">
                    <span className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                        Email
                    </span>
                    <div className="relative" onClick={() => isGoogleUser && setShowGoogleMsg(true)}>
                        <input
                            type="email"
                            value={form.email}
                            disabled={user?.profile?.provider === "google"}
                            onChange={handleInputChange("email")}
                            className={`${inputClassName} disabled:cursor-not-allowed`}
                            autoComplete="email"
                        />
                        {isGoogleUser && (
                            <div className="absolute inset-0 cursor-pointer" />
                        )}
                    </div>
                    {isGoogleUser && showGoogleMsg ? (
                        <span className="text-xs font-medium text-amber-400">
                            You signed in with Google, so your email can&apos;t be updated here.
                        </span>
                    ) : errors.email ? (
                        <span className="text-xs font-medium text-red-400">
                            {errors.email}
                        </span>
                    ) : null}
                </label>
                <label className="block space-y-2">
                    <span className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                        Age
                    </span>
                    <input
                        value={calculateAge(user?.profile?.dob)}
                        onChange={handleInputChange("age")}
                        className={inputClassName}
                        disabled
                    />
                </label>

                <div className="space-y-2">
                    <span className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                        Account visibility
                    </span>
                    <button
                        type="button"
                        onClick={() => setIsPublicDraft((prev) => !prev)}
                        className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:border-white/20"
                    >
                        <div>
                            <p className="text-sm font-medium text-[var(--app-text)]">
                                {isPublicDraft ? "Public" : "Private"}
                            </p>
                        </div>
                        <span
                            className={`flex h-6 w-11 items-center rounded-full border px-1 transition ${isPublicDraft
                                ? "justify-start border-white/15 bg-white/10"
                                : "justify-end border-emerald-400/50 bg-emerald-500/20"
                                }`}
                        >
                            <span className="h-4 w-4 rounded-full bg-[var(--app-text)]" />
                        </span>
                    </button>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-[var(--text-secondary)]">
                    Member since {joinedLabel}
                </div>

                <div className="flex flex-wrap gap-3 pt-2">
                    <button
                        type="submit"
                        className="rounded-full border border-white/10 bg-[var(--app-text)] px-4 py-2 text-sm font-medium text-[var(--app-bg)] transition hover:opacity-90"
                    >
                        Save changes
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

export default AccountInformationPage;
