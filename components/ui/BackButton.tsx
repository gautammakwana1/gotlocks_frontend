"use client";

import { useRouter } from "next/navigation";

type Props = {
    label?: string;
    fallback?: string;
    className?: string;
    preferFallback?: boolean;
};

export const BackButton = ({
    label = "Back",
    fallback = "/home",
    className,
    preferFallback = false,
}: Props) => {
    const router = useRouter();

    const handleBack = () => {
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
            className={`self-start text-xs uppercase tracking-wide text-gray-400 transition hover:text-white ${className ?? ""}`}
        >
            ← {label}
        </button>
    );
};

export default BackButton;
