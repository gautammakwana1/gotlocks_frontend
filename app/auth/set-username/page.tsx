"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/redux/hooks";
import { clearUpdateProfileMessage, updateProfileRequest } from "@/lib/redux/slices/authSlice";
import { COLORS } from "@/lib/constants";
import { useToast } from "@/lib/state/ToastContext";
import { RootState } from "@/lib/interfaces/interfaces";
import { getLocalStorage } from "@/lib/utils/jwtUtils";
import CustomDatePicker from "@/components/ui/CustomDatePicker";

const SetUsernamePage = () => {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const { setToast } = useToast();

    const [username, setUsername] = useState("");
    const [dob, setDob] = useState<Date | undefined>();
    const [error, setError] = useState<string | null>(null);

    const { error: authError, profileUpdateMessage, loading } = useSelector(
        (state: RootState) => state.user
    );

    useEffect(() => {
        // Check if we have a valid session to even be here
        const accessToken = getLocalStorage("accessToken");
        if (!accessToken) {
            router.replace("/landing-page");
        }
    }, [router]);

    useEffect(() => {
        if (loading) return;

        if (profileUpdateMessage) {
            setToast({
                id: Date.now(),
                type: "success",
                message: profileUpdateMessage,
                duration: 4000,
            });
            dispatch(clearUpdateProfileMessage());
            router.push("/home");
        } else if (authError) {
            setToast({
                id: Date.now(),
                type: "error",
                message: authError,
                duration: 4000,
            });
            dispatch(clearUpdateProfileMessage());
        }
    }, [profileUpdateMessage, authError, loading, router, setToast, dispatch, username, dob]);

    const validate = useCallback((): boolean => {
        if (!username.trim()) {
            setError("Username is required.");
            return false;
        }
        if (username.trim().length < 3) {
            setError("Username must be at least 3 characters.");
            return false;
        }
        if (!/^[a-zA-Z0-9_-]+$/.test(username.trim())) {
            setError("Username can only contain letters, numbers, underscores, and dashes.");
            return false;
        }
        if (!dob) {
            setError("Date of birth is required.");
            return false;
        }

        setError(null);
        return true;
    }, [username, dob]);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!validate()) return;

        const formData = new FormData();
        formData.append("username", username.trim());
        if (dob) {
            formData.append("dob", dob.toISOString().split("T")[0]);
        }

        dispatch(updateProfileRequest(formData as FormData));
    };

    return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-10 bg-[var(--app-bg)] px-5 text-white">
            <header className="flex flex-col gap-2 text-center">
                <span className="text-sm uppercase tracking-[0.3em] text-gray-500">
                    Almost There
                </span>
                <h1
                    className="text-4xl font-semibold"
                    style={{ color: COLORS.ACCENT }}
                >
                    Set a Username
                </h1>
                <p className="text-sm text-gray-400">
                    Pick a unique handle to be identified by in the league.
                </p>
            </header>

            <form
                onSubmit={handleSubmit}
                className="flex w-full max-w-md flex-col gap-5 rounded-3xl border border-white/10 bg-black/60 p-6 shadow-lg backdrop-blur"
                noValidate
            >
                <label className="flex flex-col gap-2">
                    <span className="text-xs uppercase tracking-wide text-gray-400">
                        Username <span className="text-red-400">*</span>
                    </span>
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => {
                            setUsername(e.target.value);
                            setError(null);
                        }}
                        className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400/70"
                        placeholder="broknowsball"
                        autoComplete="username"
                    />
                </label>
                <CustomDatePicker
                    label="Date of Birth"
                    value={dob}
                    onChange={setDob}
                    required
                    startYear={1900}
                    disableFuture
                    placeholder="Select your date of birth"
                    note="User must be 13 years old"
                />
                {error && (
                    <span className="text-xs font-medium text-red-400">
                        {error}
                    </span>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="mt-2 w-full rounded-2xl bg-white/10 py-3 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {loading ? "Setting Username..." : "Complete Signup"}
                </button>
            </form>
        </div>
    );
};

export default SetUsernamePage;
