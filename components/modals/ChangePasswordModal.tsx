import { useState } from "react";

interface ChangePasswordModalProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (currentPassword: string, newPassword: string) => void;
    loading?: boolean;
    error?: string;
}

export const ChangePasswordModal = ({
    open,
    onClose,
    onSubmit,
    loading = false,
    error,
}: ChangePasswordModalProps) => {
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [localError, setLocalError] = useState("");

    if (!open) return null;

    const handleSubmit = () => {
        if (!currentPassword || !newPassword || !confirmPassword) {
            setLocalError("All fields are required");
            return;
        }
        if (newPassword !== confirmPassword) {
            setLocalError("New passwords do not match");
            return;
        }
        if (newPassword.length < 6) {
            setLocalError("New password must be at least 6 characters");
            return;
        }

        onSubmit(currentPassword, newPassword);
    };

    const closeAndReset = () => {
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setLocalError("");
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="relative w-full max-w-md rounded-3xl border border-white/10 bg-black/80 p-8 shadow-2xl backdrop-blur-xl">
                <button
                    onClick={closeAndReset}
                    className="absolute right-4 top-4 text-gray-400 transition hover:text-white"
                >
                    X
                </button>

                <h2 className="mb-6 text-2xl font-bold uppercase tracking-wider text-emerald-300">
                    Change Password
                </h2>

                {(error || localError) && (
                    <div className="mb-4 rounded-lg border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-300">
                        {error || localError}
                    </div>
                )}

                <div className="space-y-5">
                    <div>
                        <label className="mb-2 block text-xs uppercase tracking-wider text-gray-400">
                            Current Password
                        </label>
                        <input
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-white placeholder-gray-500 outline-none focus:border-emerald-400/70"
                            placeholder="Enter current password"
                            disabled={loading}
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-xs uppercase tracking-wider text-gray-400">
                            New Password
                        </label>
                        <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-white placeholder-gray-500 outline-none focus:border-emerald-400/70"
                            placeholder="Enter new password"
                            disabled={loading}
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-xs uppercase tracking-wider text-gray-400">
                            Confirm New Password
                        </label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-white placeholder-gray-500 outline-none focus:border-emerald-400/70"
                            placeholder="Confirm new password"
                            disabled={loading}
                        />
                    </div>
                </div>

                <div className="mt-8 flex gap-3">
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="flex-1 rounded-xl bg-emerald-600/80 py-3 text-sm font-bold uppercase tracking-wide text-white transition hover:bg-emerald-500 disabled:opacity-50"
                    >
                        {loading ? "Updating..." : "Update Password"}
                    </button>
                    <button
                        onClick={closeAndReset}
                        disabled={loading}
                        className="flex-1 rounded-xl border border-white/20 py-3 text-sm font-bold uppercase tracking-wide text-gray-300 transition hover:bg-white/5"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};