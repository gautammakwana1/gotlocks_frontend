import React, { useCallback, useEffect, useState } from "react";
import { Eye, EyeClosedIcon } from "lucide-react";
import { RootState } from "@/lib/interfaces/interfaces";
import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/redux/hooks";
import { useToast } from "@/lib/state/ToastContext";
import { clearInitialForgotPasswordOTPMessage, clearResetPasswordMessage, clearVerifyForgotPasswordOTPMessage } from "@/lib/redux/slices/authSlice";

type ForgotPasswordModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onInitialOTP: (email: string) => void;
    onVerifyOTP: (code: string, email: string) => void;
    onResetPassword: (email: string, resetToken: string, newPassword: string, confirmPassword: string) => void;
};

const ForgotPasswordModal = ({ isOpen, onClose, onInitialOTP, onVerifyOTP, onResetPassword }: ForgotPasswordModalProps) => {
    const dispatch = useAppDispatch();
    const { setToast } = useToast();
    const [step, setStep] = useState(1); // 1 = enter email, 2 = verify code, 3 = reset password
    const [email, setEmail] = useState("");
    const [code, setCode] = useState("");
    const [password, setPassword] = useState("");
    const [resetToken, setResetToken] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [message, setMessage] = useState("");
    const {
        loading: userLoading,
        initialForgotPasswordError,
        initialForgotPasswordMessage,
        verifyForgotPasswordError,
        verifyForgotPasswordMessage,
        refreshTokenData,
        resetPasswordError,
        resetPasswordMessage
    } = useSelector((state: RootState) => state.user);

    useEffect(() => {
        if (refreshTokenData) {
            setResetToken(refreshTokenData)
        }
    }, [refreshTokenData]);

    useEffect(() => {
        if (!userLoading && initialForgotPasswordMessage) {
            setToast({
                id: Date.now(),
                type: "success",
                message: initialForgotPasswordMessage,
                duration: 3000,
            });
            dispatch(clearInitialForgotPasswordOTPMessage());
            setStep(2);
        }
        if (!userLoading && initialForgotPasswordError) {
            setToast({
                id: Date.now(),
                type: "error",
                message: initialForgotPasswordError,
                duration: 3000,
            });
            dispatch(clearInitialForgotPasswordOTPMessage());
        }
        if (!userLoading && verifyForgotPasswordMessage) {
            setToast({
                id: Date.now(),
                type: "success",
                message: verifyForgotPasswordMessage,
                duration: 3000,
            });
            dispatch(clearVerifyForgotPasswordOTPMessage());
            setStep(3);
        }
        if (!userLoading && verifyForgotPasswordError) {
            setToast({
                id: Date.now(),
                type: "error",
                message: verifyForgotPasswordError,
                duration: 3000,
            });
            dispatch(clearVerifyForgotPasswordOTPMessage());
        }
        if (!userLoading && resetPasswordMessage) {
            setToast({
                id: Date.now(),
                type: "success",
                message: resetPasswordMessage,
                duration: 3000,
            });
            dispatch(clearResetPasswordMessage());
            setEmail("")
            setCode("")
            setPassword("")
            setConfirmPassword("")
            setResetToken("")
            setMessage("")
            setShowPassword(false)
            setShowConfirmPassword(false)
            setStep(1)
            onClose();
        }
        if (!userLoading && resetPasswordError) {
            setToast({
                id: Date.now(),
                type: "error",
                message: resetPasswordError,
                duration: 3000,
            });
            dispatch(clearResetPasswordMessage());
        }
    }, [
        dispatch,
        userLoading,
        initialForgotPasswordMessage,
        initialForgotPasswordError,
        verifyForgotPasswordError,
        verifyForgotPasswordMessage,
        resetPasswordMessage,
        resetPasswordError,
        setToast,
        onClose,
    ]);

    const handleSendCode = async () => {
        if (email) {
            onInitialOTP(email);
        }
    };

    const handleVerifyCode = async () => {
        if (email && code) {
            onVerifyOTP(code, email);
        }
    };

    const handleResetPassword = async () => {
        if (password !== confirmPassword) {
            setMessage("Passwords do not match.");
            return;
        }

        if (email && resetToken && password && confirmPassword) {
            onResetPassword(email, resetToken, password, confirmPassword);
        }
    };

    const togglePasswordVisibility = useCallback(() => {
        setShowPassword((prev) => !prev);
    }, []);

    const toggleConfirmPasswordVisibility = useCallback(() => {
        setShowConfirmPassword((prev) => !prev);
    }, []);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-3xl border border-white/10 bg-black/70 p-6 shadow-xl">
                <h2 className="mb-4 text-center text-xl font-bold tracking-wide text-white">
                    {step === 1 && "Forgot Password"}
                    {step === 2 && "Verify Code"}
                    {step === 3 && "Reset Password"}
                </h2>
                {step === 1 && (
                    <div className="flex flex-col gap-3">
                        <label className="text-xs uppercase text-gray-400">Enter your email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400"
                            placeholder="you@example.com"
                        />

                        {message && <p className="text-xs text-gray-400">{message}</p>}

                        <button
                            onClick={handleSendCode}
                            disabled={userLoading || !email}
                            className="w-full rounded-2xl bg-white/10 py-3 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-white/50 disabled:opacity-50"
                        >
                            {userLoading ? "Sending..." : "Send Code"}
                        </button>
                    </div>
                )}

                {step === 2 && (
                    <div className="flex flex-col gap-3">
                        <label className="text-xs uppercase text-gray-400">Enter verification code</label>
                        <input
                            type="text"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400"
                            placeholder="Enter code"
                        />

                        {message && <p className="text-xs text-gray-400">{message}</p>}

                        <button
                            onClick={handleVerifyCode}
                            disabled={userLoading || !code}
                            className="w-full rounded-2xl bg-white/10 py-3 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-white/50 disabled:opacity-50"
                        >
                            {userLoading ? "Verifying..." : "Submit"}
                        </button>
                    </div>
                )}

                {step === 3 && (
                    <form
                        className="flex flex-col gap-3"
                        onSubmit={(e) => {
                            e.preventDefault()
                            handleResetPassword()
                        }}
                    >
                        <label className="text-xs uppercase text-gray-400">New Password</label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400"
                                placeholder="New password"
                                autoComplete="new-password"
                            />
                            <button
                                type="button"
                                onClick={togglePasswordVisibility}
                                className="absolute inset-y-0 right-3 my-auto"
                            >
                                {showPassword ? <EyeClosedIcon size={20} /> : <Eye size={20} />}
                            </button>
                        </div>

                        <label className="text-xs uppercase text-gray-400">Confirm Password</label>
                        <div className="relative">
                            <input
                                type={showConfirmPassword ? "text" : "password"}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400"
                                placeholder="Confirm new password"
                                autoComplete="confirm-password"
                            />
                            <button
                                type="button"
                                onClick={toggleConfirmPasswordVisibility}
                                className="absolute inset-y-0 right-3 my-auto"
                            >
                                {showConfirmPassword ? <EyeClosedIcon size={20} /> : <Eye size={20} />}
                            </button>
                        </div>

                        {message && <p className="text-xs text-gray-100">{message}</p>}

                        <button
                            type="submit"
                            disabled={userLoading || !password || !confirmPassword}
                            className="w-full rounded-2xl bg-white/10 py-3 text-sm font-semibold uppercase tracking-wide text-white"
                        >
                            {userLoading ? "Updating..." : "Update Password"}
                        </button>
                    </form>
                )}

                <button
                    onClick={() => {
                        onClose()
                        setEmail("")
                        setMessage("")
                        setCode("")
                        setPassword("")
                        setConfirmPassword("")
                        setShowPassword(false)
                        setShowConfirmPassword(false)
                        setStep(1)
                    }}
                    className="mt-4 w-full text-center text-xs uppercase tracking-wide text-gray-500 hover:text-gray-300"
                >
                    close
                </button>
            </div>
        </div>
    );
};

export default ForgotPasswordModal;
