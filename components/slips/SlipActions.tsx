"use client";

import type { ReactNode } from "react";

type Props = {
    children?: ReactNode;
    className?: string;
};

export default function SlipActions({ children, className }: Props) {
    return (
        <div
            className={`rounded-3xl border border-white/10 bg-black/60 p-4 text-sm text-gray-300 ${className ?? ""}`}
        >
            {children ?? (
                <div className="text-xs text-gray-500">
                    {/* TODO: implement SlipActions */}
                    SlipActions placeholder
                </div>
            )}
        </div>
    );
}
