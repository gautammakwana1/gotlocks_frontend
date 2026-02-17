"use client";

import React from "react";

type LoaderProps = {
    message?: string;
    size?: number;
};

const Loader: React.FC<LoaderProps> = ({ message = "Loading...", size = 40 }) => {
    return (
        <div className="flex flex-col items-center justify-center gap-3 py-6">
            <div
                className="animate-spin rounded-full border-4 border-white/20 border-t-emerald-400"
                style={{
                    width: size,
                    height: size,
                }}
            ></div>

            <p className="text-sm text-gray-400">{message}</p>
        </div>
    );
};

export default Loader;
