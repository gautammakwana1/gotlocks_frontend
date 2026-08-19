"use client";

import { useRouter } from "next/navigation";

type Props = {
    label?: string;
    fallback?: string;
    className?: string;
    preferFallback?: boolean;
    alignSelf?: "start" | "center";
    /** Intercepts the back action (e.g. to confirm unsaved changes) instead of navigating. */
    onBack?: () => void;
};

export const BackButton = ({
    label = "back",
    fallback = "/home",
    className,
    preferFallback = false,
    alignSelf = "start",
    onBack,
}: Props) => {
    const router = useRouter();

    const handleBack = () => {
        if (onBack) {
            onBack();
            return;
        }

        if (!preferFallback && typeof window !== "undefined" && window.history.length > 1) {
            router.back();
            return;
        }
        router.push(fallback);
    };

    return (
        <button
            type="button"
            onClick={handleBack}
            className={`${alignSelf === "center" ? "self-center" : "self-start"
                } text-xs lowercase tracking-wide text-gray-400 transition hover:text-white ${className ?? ""}`}
        >
            ← {label}
        </button>
    );
};

export default BackButton;
