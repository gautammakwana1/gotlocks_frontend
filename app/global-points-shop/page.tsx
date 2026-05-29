"use client";

import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchProgressByUserIdRequest } from "@/lib/redux/slices/progressSlice";
import { RootState } from "@/lib/interfaces/interfaces";
import { getLevelProgress, getTotalXpToReachLevel } from "@/lib/utils/progression";

const numberFormatter = new Intl.NumberFormat("en-US");

type ShopReward = {
    name: string;
    kind: "Virtual";
    price: "Free" | `$${number}`;
};

type ShopTier = {
    level: number;
    title: string;
    rewards: ShopReward[];
};

const rewardTiers: ShopTier[] = [
    {
        level: 5,
        title: "Starter Access",
        rewards: [
            { name: "Profile frame", kind: "Virtual", price: "Free" },
            { name: "Pick card theme", kind: "Virtual", price: "Free" },
            { name: "Reaction sticker pack", kind: "Virtual", price: "$4" },
        ],
    },
    {
        level: 15,
        title: "Riser Access",
        rewards: [
            { name: "Badge slot", kind: "Virtual", price: "Free" },
            { name: "Profile banner", kind: "Virtual", price: "$8" },
            { name: "League flair set", kind: "Virtual", price: "$12" },
        ],
    },
    {
        level: 25,
        title: "Contender Access",
        rewards: [
            { name: "Avatar frame", kind: "Virtual", price: "Free" },
            { name: "Animated profile glow", kind: "Virtual", price: "$15" },
            { name: "Premium reaction pack", kind: "Virtual", price: "$20" },
        ],
    },
    {
        level: 35,
        title: "Legend Access",
        rewards: [
            { name: "Legend profile treatment", kind: "Virtual", price: "Free" },
            { name: "Legend badge trail", kind: "Virtual", price: "$28" },
            { name: "Winner card theme", kind: "Virtual", price: "$55" },
        ],
    },
];

const GlobalPointsShopPage = () => {
    const dispatch = useDispatch();
    const currentUser = useCurrentUser();
    const currentUserId = currentUser?.userId ?? undefined;

    const { progress } = useSelector((state: RootState) => state.progress);

    useEffect(() => {
        if (currentUserId) {
            dispatch(fetchProgressByUserIdRequest({ user_id: currentUserId }));
        }
    }, [currentUserId, dispatch]);

    const currentBalance = progress?.lifetime_xp ?? 0;

    const userProgress = getLevelProgress(currentBalance);
    const totalXp = currentBalance;

    if (!currentUser) return null;

    return (
        <div className="mx-auto w-full max-w-4xl" style={{ animation: "homeFadeUp 240ms ease-out both" }}>
            <header className="flex items-end justify-between gap-4 border-b border-[var(--border-soft)] pb-5 sm:gap-6 sm:pb-6">
                <div className="min-w-0 flex-1">
                    <h1 className="text-2xl font-semibold tracking-tight text-[var(--app-text)] sm:text-3xl">
                        Reward Room
                    </h1>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
                        Rewards unlock automatically as your profile level rises.
                    </p>
                </div>
                <div className="ml-auto shrink-0 text-right">
                    <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                        Profile level
                    </p>
                    <p className="mt-2 text-3xl font-semibold tracking-tight text-[var(--app-text)] sm:text-4xl">
                        {userProgress.level}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                        {numberFormatter.format(totalXp)} total XP
                    </p>
                </div>
            </header>

            <section className="divide-y divide-[var(--border-soft)]">
                {rewardTiers.map((tier) => {
                    const unlocked = userProgress.level >= tier.level;
                    const xpRequired = getTotalXpToReachLevel(tier.level);
                    const xpRemaining = Math.max(0, xpRequired - currentBalance);

                    return (
                        <div key={tier.level} className="py-5">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                    <p className="text-lg font-medium tracking-tight text-[var(--app-text)] sm:text-xl">
                                        Level {tier.level} · {tier.title}
                                    </p>
                                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                                        {unlocked
                                            ? "Unlocked"
                                            : `Earn ${numberFormatter.format(
                                                xpRemaining
                                            )} more XP to unlock these rewards`}
                                    </p>
                                </div>
                                <span
                                    className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${unlocked
                                        ? "border-emerald-300/40 bg-emerald-400/10 text-emerald-100"
                                        : "border-white/10 bg-white/5 text-[var(--text-muted)]"
                                        }`}
                                >
                                    {unlocked ? "available" : "locked"}
                                </span>
                            </div>

                            <div className="mt-4 grid gap-3 sm:grid-cols-3">
                                {tier.rewards.map((reward) => (
                                    <div
                                        key={`${tier.level}-${reward.name}`}
                                        className={`min-h-[118px] rounded-xl border p-4 transition ${unlocked
                                            ? "border-white/12 bg-white/[0.055]"
                                            : "border-white/10 bg-white/[0.025] opacity-55"
                                            }`}
                                    >
                                        <div className="flex h-full flex-col justify-between gap-4">
                                            <div>
                                                <p className="text-sm font-semibold text-[var(--app-text)]">
                                                    {reward.name}
                                                </p>
                                                <p className="mt-2 text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
                                                    {reward.kind}
                                                </p>
                                            </div>
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-sm font-semibold text-sky-100">
                                                    {reward.price}
                                                </span>
                                                <span className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
                                                    {unlocked ? "access" : `lvl ${tier.level}`}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </section>
        </div>
    );
};

export default GlobalPointsShopPage;
