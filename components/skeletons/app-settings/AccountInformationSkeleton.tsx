
import React from "react";

const AccountInformationSkeleton = () => {
    return (
        <div className="mx-auto w-full max-w-2xl space-y-6 animate-pulse">
            {/* Header Skeleton */}
            <header className="space-y-3 border-b border-white/10 pb-5">
                <div className="h-3 w-32 rounded bg-white/5" />
                <div className="h-8 w-64 rounded bg-white/10" />
                <div className="h-4 w-full max-w-md rounded bg-white/5" />
            </header>

            {/* Form Skeleton */}
            <div className="space-y-6">
                {/* Full Name Field */}
                <div className="space-y-2">
                    <div className="h-3 w-20 rounded bg-white/5 uppercase" />
                    <div className="h-11 w-full rounded-2xl bg-white/5" />
                </div>

                {/* Username Field */}
                <div className="space-y-2">
                    <div className="h-3 w-20 rounded bg-white/5 uppercase" />
                    <div className="h-11 w-full rounded-2xl bg-white/5" />
                    <div className="h-3 w-full max-w-sm rounded bg-white/5" />
                </div>

                {/* Email Field */}
                <div className="space-y-2">
                    <div className="h-3 w-20 rounded bg-white/5 uppercase" />
                    <div className="h-11 w-full rounded-2xl bg-white/5" />
                </div>

                {/* DOB / Age Field */}
                <div className="space-y-2">
                    <div className="h-3 w-20 rounded bg-white/5 uppercase" />
                    <div className="h-11 w-full rounded-2xl bg-white/5" />
                </div>

                {/* Account Visibility Field */}
                <div className="space-y-2">
                    <div className="h-3 w-32 rounded bg-white/5 uppercase" />
                    <div className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                        <div className="h-4 w-16 rounded bg-white/10" />
                        <div className="h-6 w-11 rounded-full bg-white/10" />
                    </div>
                </div>

                {/* Member Since Badge */}
                <div className="h-11 w-full rounded-2xl bg-white/5" />

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3 pt-2">
                    <div className="h-10 w-32 rounded-full bg-white/10" />
                    <div className="h-10 w-20 rounded-full border border-white/10 bg-white/5" />
                </div>
            </div>
        </div>
    );
};

export default AccountInformationSkeleton;
