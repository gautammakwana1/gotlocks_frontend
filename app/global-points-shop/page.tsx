"use client";

import { greenGradientBox } from "@/lib/styles/containers";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { FormEvent, ReactNode, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { clearRedeemGlobalPointsMessage, fetchProgressByUserIdRequest, redeemGlobalPointsRequest } from "@/lib/redux/slices/progressSlice";
import { RootState } from "@/lib/interfaces/interfaces";
import { useToast } from "@/lib/state/ToastContext";

const pointFormatter = new Intl.NumberFormat("en-US");
const rewardSlots = [0, 1, 2];

type RewardSelection = {
    bucketPoints: number;
    slotIndex: number;
};

const redemptionBuckets = [
    {
        points: 1000,
        title: "Redeem 1,000 pts",
        description: "Starter-tier rewards.",
    },
    {
        points: 5000,
        title: "Redeem 5,000 pts",
        description: "Mid-tier rewards and bundles.",
    },
    {
        points: 20000,
        title: "Redeem 20,000 pts",
        description: "Top-tier premium rewards.",
    },
];

const ChevronIcon = ({ open }: { open: boolean }) => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className={`h-5 w-5 transition ${open ? "rotate-180" : ""}`}
    >
        <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
    </svg>
);

const GlobalPointsShopPage = () => {
    const dispatch = useDispatch();
    const { setToast } = useToast();
    const currentUser = useCurrentUser();
    const currentUserId = currentUser?.userId ?? undefined;
    const [openBuckets, setOpenBuckets] = useState<Record<number, boolean>>({});
    const [selectedReward, setSelectedReward] = useState<RewardSelection | null>(null);
    const [pendingRedemption, setPendingRedemption] = useState<RewardSelection | null>(null);

    const { progress, loading, message, error } = useSelector((state: RootState) => state.progress);

    useEffect(() => {
        if (currentUserId) {
            dispatch(fetchProgressByUserIdRequest({ user_id: currentUserId }));
        }
    }, [currentUserId]);

    useEffect(() => {
        if (!loading && message) {
            setToast({
                id: Date.now(),
                type: "success",
                message: message,
                duration: 3000
            })
            dispatch(clearRedeemGlobalPointsMessage());
        }
        if (!loading && error) {
            setToast({
                id: Date.now(),
                type: "error",
                message: error,
                duration: 3000
            })
            dispatch(clearRedeemGlobalPointsMessage());
        }
    }, [loading, message, error]);

    const currentBalance = progress?.lifetime_xp ?? 0;

    const handleToggleBucket = (bucketPoints: number) => {
        const isOpen = openBuckets[bucketPoints] ?? false;

        if (isOpen && selectedReward?.bucketPoints === bucketPoints) {
            setSelectedReward(null);
        }

        setOpenBuckets((prev) => ({
            ...prev,
            [bucketPoints]: !isOpen,
        }));
    };

    const handleSelectReward = (
        bucketPoints: number,
        slotIndex: number,
        canAfford: boolean
    ) => {
        if (!canAfford) return;

        setSelectedReward((prev) =>
            prev?.bucketPoints === bucketPoints && prev.slotIndex === slotIndex
                ? null
                : { bucketPoints, slotIndex }
        );
    };

    const closeRedeemModal = () => setPendingRedemption(null);

    const handleConfirmRedemption = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!pendingRedemption) return;
        dispatch(redeemGlobalPointsRequest({ points: pendingRedemption.bucketPoints }));
        setPendingRedemption(null);
        setSelectedReward(null);
    };

    if (!currentUser) return null;

    return (
        <div className="mx-auto w-full max-w-4xl" style={{ animation: "homeFadeUp 240ms ease-out both" }}>
            <div>
                <header className="flex items-start justify-between gap-4 border-b border-[var(--border-soft)] pb-5 sm:gap-6 sm:pb-6">
                    <div className="min-w-0">
                        <h1 className="text-2xl font-semibold tracking-tight text-[var(--app-text)] sm:text-3xl">
                            <span className="block sm:inline">Global</span>
                            <span className="block sm:inline sm:ml-2">Points Shop</span>
                        </h1>
                    </div>
                    <div className="shrink-0 pt-1 text-right">
                        <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                            Current balance
                        </p>
                        <p className="mt-2 text-3xl font-semibold tracking-tight text-[var(--app-text)] sm:text-4xl">
                            {pointFormatter.format(currentBalance)}
                        </p>
                        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                            global points
                        </p>
                    </div>
                </header>

                <section className="divide-y divide-[var(--border-soft)]">
                    {redemptionBuckets.map((bucket) => {
                        const remainingPoints = Math.max(bucket.points - currentBalance, 0);
                        const canAfford = remainingPoints === 0;
                        const isOpen = openBuckets[bucket.points] ?? false;
                        const isSelectedBucket = selectedReward?.bucketPoints === bucket.points;
                        const canRedeem = canAfford && isSelectedBucket;

                        return (
                            <div key={bucket.points} className="py-4">
                                <div className="flex items-start justify-between gap-4 sm:gap-6">
                                    <button
                                        type="button"
                                        onClick={() => handleToggleBucket(bucket.points)}
                                        className="group flex min-w-0 flex-1 items-start justify-between gap-3 text-left"
                                        aria-expanded={isOpen}
                                    >
                                        <div className="min-w-0">
                                            <p className="text-lg font-medium tracking-tight text-[var(--app-text)] sm:text-xl">
                                                {bucket.title}
                                            </p>
                                            <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
                                                {bucket.description}
                                            </p>
                                        </div>
                                    </button>
                                    <div className="w-[132px] shrink-0 space-y-3 text-right">
                                        <div className="grid grid-cols-[92px_20px] justify-end items-center gap-1.5">
                                            <button
                                                type="button"
                                                disabled={!canRedeem}
                                                onClick={() => {
                                                    if (!selectedReward || selectedReward.bucketPoints !== bucket.points) return;
                                                    setPendingRedemption(selectedReward);
                                                }}
                                                className={`w-[92px] rounded-2xl px-2.5 py-2 text-xs font-semibold uppercase tracking-[0.04em] transition ${canRedeem
                                                    ? "bg-emerald-500/25 text-emerald-100 hover:bg-emerald-500/35"
                                                    : "border border-white/10 bg-white/5 text-[var(--text-muted)] disabled:cursor-not-allowed"
                                                    }`}
                                            >
                                                Redeem
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleToggleBucket(bucket.points)}
                                                className="flex h-9 w-5 items-center justify-center text-[var(--text-muted)] transition hover:text-[var(--app-text)]"
                                                aria-expanded={isOpen}
                                                aria-label={`${isOpen ? "Collapse" : "Expand"} ${bucket.title}`}
                                            >
                                                <ChevronIcon open={isOpen} />
                                            </button>
                                        </div>
                                        <p className="text-[10px] uppercase tracking-[0.12em] leading-tight text-[var(--text-muted)]">
                                            {canAfford ? (
                                                isSelectedBucket ? (
                                                    "selected"
                                                ) : (
                                                    "available"
                                                )
                                            ) : (
                                                <>
                                                    <span className="block">{pointFormatter.format(remainingPoints)}</span>
                                                    <span className="mt-0.5 block">pts away</span>
                                                </>
                                            )}
                                        </p>
                                    </div>
                                </div>

                                {isOpen ? (
                                    <div className="mt-4 grid grid-cols-3 gap-3">
                                        {rewardSlots.map((slotIndex) => {
                                            const isSelected =
                                                selectedReward?.bucketPoints === bucket.points &&
                                                selectedReward.slotIndex === slotIndex;

                                            return (
                                                <button
                                                    key={slotIndex}
                                                    type="button"
                                                    onClick={() =>
                                                        handleSelectReward(bucket.points, slotIndex, canAfford)
                                                    }
                                                    disabled={!canAfford}
                                                    aria-pressed={isSelected}
                                                    aria-label={`Select ${pointFormatter.format(bucket.points)} point reward option ${slotIndex + 1}`}
                                                    className={`h-20 rounded-2xl border transition ${isSelected
                                                        ? "border-emerald-300/70 bg-emerald-500/10 shadow-[0_0_0_1px_rgba(52,211,153,0.35)]"
                                                        : "border-white/10 bg-white/5 hover:border-white/20"
                                                        } ${!canAfford ? "cursor-not-allowed opacity-50" : ""}`}
                                                >
                                                    <span className="sr-only">
                                                        Reward option {slotIndex + 1}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                ) : null}
                            </div>
                        );
                    })}
                </section>
            </div>

            {pendingRedemption && (
                <ModalShell onClose={closeRedeemModal} maxWidthClass="max-w-sm">
                    <form onSubmit={handleConfirmRedemption} className="space-y-4">
                        <div className="space-y-1 text-center">
                            <h3 className="text-base font-semibold text-white">Redeem points</h3>
                            <p className="text-xs text-gray-400">
                                Redeem {pointFormatter.format(pendingRedemption.bucketPoints)} global points
                                for this reward?
                            </p>
                        </div>
                        <div className="flex justify-center gap-3">
                            <button
                                type="button"
                                onClick={closeRedeemModal}
                                className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-gray-200 transition hover:border-white/30 hover:text-white"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="rounded-xl border border-emerald-400/60 bg-emerald-500/20 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-emerald-100 transition hover:border-emerald-300/80 hover:text-white"
                            >
                                Confirm redeem
                            </button>
                        </div>
                    </form>
                </ModalShell>
            )}
        </div>
    );
};

const ModalShell = ({
    children,
    onClose,
    maxWidthClass = "max-w-3xl",
    maxHeightClass = "max-h-[90vh]",
    overflowClassName = "overflow-y-auto",
    contentClassName = "",
}: {
    children: ReactNode;
    onClose: () => void;
    maxWidthClass?: string;
    maxHeightClass?: string;
    overflowClassName?: string;
    contentClassName?: string;
}) => (
    <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm"
        onClick={onClose}
    >
        <div
            className={`relative w-full ${maxWidthClass} ${maxHeightClass} ${overflowClassName} ${contentClassName} rounded-3xl border border-white/10 bg-black p-5 shadow-2xl`}
            onClick={(event) => event.stopPropagation()}
        >
            {children}
        </div>
    </div>
);

export default GlobalPointsShopPage;
