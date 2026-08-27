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
import AccountInformationSkeleton from "@/components/skeletons/app-settings/AccountInformationSkeleton";
import { getProLifetimePlanViewModel } from "@/lib/billing/proLifetime";
import {
    SettingsActionBar,
    SettingsHeader,
    SettingsPage,
    SettingsSection,
    SettingsStatus,
    SettingsSurface,
    settingsFieldLabelClassName,
    settingsInputClassName,
    settingsPrimaryButtonClassName,
    settingsSecondaryButtonClassName,
    settingsTextButtonClassName,
} from "@/components/settings/SettingsUI";

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

const formatDobWithAge = (dob?: string) => {
    if (!dob) return "";

    const date = new Date(dob);

    const formattedDate = date.toLocaleDateString("en-US", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });

    const age = calculateAge(dob);

    return `${formattedDate} • ${age} years`;
};

const membershipValueClassName =
    "text-base font-semibold leading-6 text-[var(--app-text)]";

const fieldErrorClassName = "block text-xs font-medium normal-case text-red-400";

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
    /* Drives the inline "Saving…" line and the disabled state of the whole
     * form. The OUTCOME still arrives as a toast — the effect below owns that —
     * so this only covers the round trip the MVP fills with the same line. */
    const [submitting, setSubmitting] = useState(false);
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
            setSubmitting(false);
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
            setSubmitting(false);
            setToast({
                id: Date.now(),
                type: "error",
                message: error,
                duration: 3000
            })
            dispatch(clearUpdateProfileMessage());
            if (user?.profile) {
                setForm({
                    fullName: user?.profile?.full_name ?? "",
                    username: user?.profile?.username,
                    email: user?.profile?.email,
                    age: calculateAge(user?.profile?.dob) ?? 0
                });
                setIsPublicDraft(user?.profile?.is_public);
            };
        }
    }, [dispatch, currentUser?.userId, user?.profile, loading, profileUpdateMessage, error, setToast]);

    const validate = useCallback((): boolean => {
        const nextErrors: FormErrors = {};

        if (!form.username.trim()) {
            nextErrors.username = "Pick a unique username.";
        } else if (form.username.trim().length < 3) {
            nextErrors.username = "Username must be at least 3 characters.";
        }

        if (!form.fullName.trim()) {
            nextErrors.fullName = "Full name is required.";
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

    const planView = getProLifetimePlanViewModel({
        plan: user?.profile?.plan,
        offerKind: user?.profile?.proLifetimeOfferKind,
        entitlement: user?.profile?.proLifetimeEntitlement,
    });

    const remainingUsernameChanges = 3 - (user?.profile?.username_history?.length ?? 0);

    const remainingUsernameChangesLabel =
        `You can update your username ${remainingUsernameChanges} more time${remainingUsernameChanges === 1 ? "" : "s"}. Please choose carefully, as username changes are limited.`;

    const hasIdentityChanges =
        form.username.trim() !== user?.profile?.username ||
        form.email.trim() !== user?.profile?.email ||
        form.fullName.trim() !== (user?.profile?.full_name ?? "");
    const hasPrivacyChanges = isPublicDraft !== user?.profile?.is_public;
    const isDirty = hasIdentityChanges || hasPrivacyChanges;

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!isDirty || submitting) return;
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
            setSubmitting(true);
            dispatch(updateProfileRequest(formData));
        }

        if (hasPrivacyChanges) {
            setSubmitting(true);
            dispatch(updateProfilePublicOrPrivateRequest());
        }
    };

    if (!currentUser) return null;

    if (loading && !submitting) {
        return <AccountInformationSkeleton />;
    }

    return (
        <SettingsPage>
            <SettingsHeader title="Account information" backHref="/app-settings" />

            <form onSubmit={handleSubmit} aria-busy={submitting}>
                {/* `layout="split"` is the MVP's two-column settings shape: the
                    heading and its blurb sit in a left rail from `md` up, the
                    controls in the wider right column. */}
                <SettingsSection
                    title="Basic details"
                    description="These details identify your account across Got Locks."
                    bodyClassName="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
                    layout="split"
                >
                    <label className="block space-y-2 sm:col-span-2 xl:col-span-1">
                        <span className={settingsFieldLabelClassName}>Full name</span>
                        <input
                            name="fullName"
                            value={form.fullName}
                            onChange={handleInputChange("fullName")}
                            className={settingsInputClassName}
                            autoComplete="name"
                            disabled={submitting}
                        />
                        {errors.fullName && (
                            <span className={fieldErrorClassName}>{errors.fullName}</span>
                        )}
                    </label>

                    <label className="block space-y-2">
                        <span className={settingsFieldLabelClassName}>Username</span>
                        <input
                            name="username"
                            value={form.username}
                            onChange={handleInputChange("username")}
                            className={settingsInputClassName}
                            autoComplete="username"
                            disabled={submitting || remainingUsernameChanges === 0}
                        />
                        {errors.username ? (
                            <span className={fieldErrorClassName}>{errors.username}</span>
                        ) : (
                            <span className="block text-xs font-medium normal-case text-amber-400">
                                {remainingUsernameChangesLabel}
                            </span>
                        )}
                    </label>

                    <label className="block space-y-2">
                        <span className={settingsFieldLabelClassName}>Email</span>
                        {/* A Google account's email lives with Google. The click
                            target over the disabled input is what surfaces that,
                            since a disabled control fires no events of its own. */}
                        <span
                            className="relative block"
                            onClick={() => isGoogleUser && setShowGoogleMsg(true)}
                        >
                            <input
                                name="email"
                                type="email"
                                value={form.email}
                                disabled={submitting || isGoogleUser}
                                onChange={handleInputChange("email")}
                                className={settingsInputClassName}
                                autoComplete="email"
                            />
                            {isGoogleUser && <span className="absolute inset-0 cursor-pointer" />}
                        </span>
                        {isGoogleUser && showGoogleMsg ? (
                            <span className="block text-xs font-medium normal-case text-amber-400">
                                You signed in with Google, so your email can&apos;t be updated here.
                            </span>
                        ) : errors.email ? (
                            <span className={fieldErrorClassName}>{errors.email}</span>
                        ) : null}
                    </label>

                    {/* Frontend-only: date of birth is captured at sign-up and is
                        not editable anywhere, so it reads as a stated fact. */}
                    <label className="block space-y-2">
                        <span className={settingsFieldLabelClassName}>Date of birth / age</span>
                        <input
                            readOnly
                            disabled
                            value={formatDobWithAge(user?.profile?.dob)}
                            className={settingsInputClassName}
                        />
                    </label>
                </SettingsSection>

                <SettingsSection
                    title="Profile visibility"
                    description="Choose who can open your full profile."
                    layout="split"
                >
                    <fieldset disabled={submitting}>
                        <legend className="sr-only">Account visibility</legend>
                        <SettingsSurface padding="none" className="grid gap-2 p-2 md:grid-cols-2">
                            {([
                                {
                                    value: true,
                                    title: "Public",
                                    description: "Anyone can open your profile.",
                                },
                                {
                                    value: false,
                                    title: "Private",
                                    description: "Only approved followers can open your profile.",
                                },
                            ] as const).map((option) => (
                                <label
                                    key={option.title}
                                    className={`relative flex min-h-20 cursor-pointer items-start gap-3 rounded-xl px-4 py-4 transition hover:bg-white/[0.055] ${option.value === isPublicDraft
                                        ? "bg-sky-500/[0.11] shadow-sm"
                                        : "bg-white/[0.025]"
                                        } ${submitting ? "cursor-not-allowed opacity-50" : ""}`}
                                >
                                    <input
                                        type="radio"
                                        name="accountVisibility"
                                        value={option.value ? "public" : "private"}
                                        checked={isPublicDraft === option.value}
                                        onChange={() => setIsPublicDraft(option.value)}
                                        className="peer mt-0.5 h-5 w-5 shrink-0 accent-sky-300 focus-visible:outline-none"
                                    />
                                    <span className="min-w-0">
                                        <span className="block text-sm font-semibold text-[var(--app-text)]">
                                            {option.title}
                                        </span>
                                        <span className="mt-1 block text-sm leading-5 text-[var(--text-secondary)]">
                                            {option.description}
                                        </span>
                                    </span>
                                    <span className="pointer-events-none absolute inset-0 peer-focus-visible:ring-2 peer-focus-visible:ring-inset peer-focus-visible:ring-sky-300/70" />
                                </label>
                            ))}
                        </SettingsSurface>
                    </fieldset>
                </SettingsSection>

                <SettingsSection bodyClassName="space-y-4" className="bg-white/[0.012]">
                    <SettingsStatus tone="info">
                        {submitting ? "Saving account information…" : null}
                    </SettingsStatus>

                    <SettingsActionBar>
                        <Link href="/app-settings" className={settingsSecondaryButtonClassName}>
                            Cancel
                        </Link>
                        <button
                            type="submit"
                            disabled={!isDirty || submitting}
                            className={settingsPrimaryButtonClassName}
                        >
                            {submitting ? "Saving…" : "Save changes"}
                        </button>
                    </SettingsActionBar>
                </SettingsSection>
            </form>

            <SettingsSection
                title="Account membership"
                description="Plan and membership details are managed separately from your profile edits."
                bodyClassName="space-y-4"
                layout="split"
            >
                <dl className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-x-3 gap-y-6 text-sm sm:grid-cols-2 sm:gap-x-8 lg:gap-x-10">
                    <div className="grid grid-rows-[auto_1fr] gap-2">
                        <dt className={settingsFieldLabelClassName}>Member since</dt>
                        <dd className="flex min-h-11 items-center">
                            <span suppressHydrationWarning className={membershipValueClassName}>
                                {joinedLabel}
                            </span>
                        </dd>
                    </div>
                    <div className="grid grid-rows-[auto_1fr] gap-2">
                        <dt className={settingsFieldLabelClassName}>Current plan</dt>
                        <dd className="flex min-h-11 flex-wrap items-center gap-x-2">
                            <span className={membershipValueClassName}>
                                {planView.currentPlanName}
                            </span>
                            <Link
                                href="/app-settings/plan"
                                aria-label="Manage plan"
                                className={`${settingsTextButtonClassName} px-1 underline decoration-white/25 underline-offset-4`}
                            >
                                Manage
                            </Link>
                        </dd>
                    </div>
                </dl>
                <p className="text-sm leading-6 text-[var(--text-secondary)]">
                    {planView.currentPlanSummary}
                </p>
            </SettingsSection>
        </SettingsPage>
    );
};

export default AccountInformationPage;
