"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { JSX } from "react";
import { SlipIcon } from "../ui/SvgIcons";
import { useSelector } from "react-redux";
import { RootState } from "@/lib/interfaces/interfaces";
import Image from "next/image";

type TabIconProps = { className?: string };

type TabDefinition = {
    id: string;
    label: string;
    href: string;
    icon: (props: TabIconProps) => JSX.Element;
    matchers: string[];
};

const HIDDEN_ROUTES = [
    "/landing-page",
    "/account-creation",
    "/cag-explained",
    "/cag-form",
    "/auth/set-username",
    "/auth/callback",
    "/terms-and-conditions",
    "/privacy-policy"
];

const isRouteHidden = (pathname: string | null) => {
    if (!pathname) return false;
    return HIDDEN_ROUTES.some((route) => pathname.startsWith(route));
};

export const HomeIcon = ({ className }: TabIconProps) => (
    <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className={className}
    >
        <path
            d="M4 10.5 12 4 20 10.5M6 9.5v9a1 1 0 0 0 1 1h3m8-10v9a1 1 0 0 1-1 1h-3m-6 0h6"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

export const SparkIcon = ({ className }: TabIconProps) => (
    <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        className={className}
    >
        <path
            d="M12 3.5 9.75 8.5 4.5 10.25l5.25 1.75L12 17l2.25-5 .25-.05 5-.95-5-1.75L12 3.5Zm-4 17 1-2m6 2-1.25-2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

export const PeopleIcon = ({ className }: TabIconProps) => (
    <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill="currentColor"
        className={`${className ?? ""} overflow-visible`}
    >
        <circle cx="3.4" cy="5.4" r="3.1" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="20.6" cy="5.4" r="3.1" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="12" cy="10" r="3.1" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <ellipse cx="3.4" cy="15" rx="5.4" ry="4" />
        <ellipse cx="20.6" cy="15" rx="5.4" ry="4" />
        <ellipse cx="12" cy="19.6" rx="5.4" ry="4" />
    </svg>
);

export const GlobeIcon = ({ className }: TabIconProps) => (
    <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className={className}
    >
        <circle cx="12" cy="12" r="8.5" />
        <path d="M3.5 12h17" strokeLinecap="round" />
        <path d="M12 3.5c3 3.2 3 14 0 17" strokeLinecap="round" />
        <path d="M12 3.5c-3 3.2-3 14 0 17" strokeLinecap="round" />
    </svg>
);

export const UserIcon = ({ className }: TabIconProps) => (
    <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill="currentColor"
        className={className}
    >
        <circle cx="12" cy="6.6" r="3.1" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <ellipse cx="12" cy="16.2" rx="5.4" ry="4" />
    </svg>
);

const LockBadge = () => (
    <span
        aria-hidden
        className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/90 text-[9px] leading-none text-sky-200 ring-1 ring-sky-300/50"
    >
        <Image
            src="/icons/lock.png"
            alt="tutorial"
            width={24}
            height={24}
            className="transition-transform p-[1px] duration-300 group-hover:scale-110"
            draggable={false}
        />
    </span>
);

const GuidedArrow = () => (
    <div
        aria-hidden
        className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 animate-bounce sm:-top-8"
    >
        <svg
            viewBox="0 0 24 24"
            className="h-6 w-6 text-sky-300 drop-shadow-[0_0_10px_rgba(125,211,252,0.6)]"
            fill="currentColor"
        >
            <path d="M12 22 L4 12 L9 12 L9 3 L15 3 L15 12 L20 12 Z" />
        </svg>
    </div>
);

const TabInner = ({
    tab,
    active,
    locked,
    isGuided,
}: {
    tab: TabDefinition;
    active: boolean;
    locked?: boolean;
    isGuided?: boolean;
}) => (
    <div
        className={`relative flex h-11 w-11 min-[380px]:h-14 min-[380px]:w-14 sm:h-[70px] sm:w-[70px] flex-col items-center justify-center rounded-2xl border text-[10px] font-semibold tracking-[0.08em] transition ${active
            ? "border-sky-300/70 bg-sky-400/10 shadow-[0_12px_40px_-18px_rgba(96,165,250,0.7)]"
            : isGuided
                ? "border-sky-300/70 bg-sky-400/15 shadow-[0_12px_40px_-16px_rgba(125,211,252,0.8)]"
                : "border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.08]"
            } ${locked ? "opacity-45" : ""}`}
    >
        {isGuided && <GuidedArrow />}
        <div
            className={`mb-0 sm:mb-1 flex h-8 w-8 min-[380px]:h-10 min-[380px]:w-10 items-center justify-center rounded-xl bg-gradient-to-br text-white transition ${active || isGuided
                ? "from-sky-300 via-blue-500 to-sky-300 shadow-lg shadow-blue-500/35"
                : "from-white/20 via-white/10 to-white/0 text-gray-200 group-hover:from-white/30 group-hover:via-white/20 group-hover:to-white/10"
                }`}
        >
            <tab.icon className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
        <span
            className={`hidden sm:inline lowercase ${active || isGuided ? "text-white" : "text-gray-300 group-hover:text-white"}`}
        >
            {tab.label}
        </span>
        {locked && <LockBadge />}
    </div>
);

const TabButton = ({
    tab,
    active,
    locked,
    isGuided,
    onLockedTap,
}: {
    tab: TabDefinition;
    active: boolean;
    locked?: boolean;
    isGuided?: boolean;
    onLockedTap?: () => void;
}) => {
    if (locked) {
        return (
            <button type="button" onClick={onLockedTap} className="group relative block" aria-label={`${tab.label} (locked)`}>
                <TabInner tab={tab} active={active} locked />
            </button>
        );
    }
    return (
        <Link href={tab.href} className="group relative block">
            <TabInner tab={tab} active={active} isGuided={isGuided} />
        </Link>
    );
};

export const MainTabBar = () => {
    const pathname = usePathname();
    const [hasSelection, setHasSelection] = useState(false);
    const [lockHintOpen, setLockHintOpen] = useState(false);
    const lockHintTimeoutRef = useRef<number | null>(null);

    const { hasSeenSocialIntro, hasSeenWelcomeIntro, hasSeenGroupIntro } = useSelector((state: RootState) => state.progress);

    const guidedTarget: "leaderboard" | "profile" | null = !hasSeenWelcomeIntro
        ? null
        : !hasSeenGroupIntro
            ? "leaderboard"
            : !hasSeenSocialIntro
                ? "profile"
                : null;
    const lockHintLabel =
        guidedTarget === "leaderboard"
            ? "Tap the groups tab to continue 🔒"
            : guidedTarget === "profile"
                ? "Tap your profile to continue 🔒"
                : null;

    useEffect(() => {
        const handleSelection = (event: Event) => {
            const detail = (event as CustomEvent<{ active?: boolean }>).detail;
            setHasSelection(Boolean(detail?.active));
        };
        window.addEventListener("pick-builder-selection", handleSelection);
        return () => window.removeEventListener("pick-builder-selection", handleSelection);
    }, []);

    useEffect(() => () => {
        if (lockHintTimeoutRef.current) window.clearTimeout(lockHintTimeoutRef.current);
    }, []);

    const handleLockedTap = useCallback(() => {
        setLockHintOpen(true);
        if (lockHintTimeoutRef.current) window.clearTimeout(lockHintTimeoutRef.current);
        lockHintTimeoutRef.current = window.setTimeout(() => setLockHintOpen(false), 3000);
    }, []);

    const tabs: TabDefinition[] = useMemo(
        () => [
            {
                id: "home",
                label: "home",
                href: "/home",
                icon: HomeIcon,
                matchers: ["/home"],
            },
            {
                id: "leaderboard",
                label: "groups",
                href: "/fantasy",
                icon: PeopleIcon,
                matchers: ["/fantasy", "/group"],
            },
            {
                id: "profile",
                label: "profile",
                href: "/profile",
                icon: UserIcon,
                matchers: ["/profile"],
            },
            {
                id: "social",
                label: "social",
                href: "/social",
                icon: GlobeIcon,
                matchers: ["/social", "/user"],
            },
            {
                id: "builder",
                label: "picks",
                href: "/pick-builder",
                icon: SlipIcon,
                matchers: ["/pick-builder"],
            },
        ],
        []
    );

    if (isRouteHidden(pathname)) return null;

    return (
        <>
            {lockHintLabel && lockHintOpen && (
                <div className="pointer-events-none fixed bottom-[-3px] sm:bottom-[-20px] left-0 right-0 z-50">
                    <div className="mx-auto flex justify-center px-5 sm:px-6">
                        <div
                            className={`inline-flex justify-center gap-1 min-[380px]:gap-1.5 p-1 sm:gap-2 md:origin-bottom md:scale-[1.45] ${hasSelection
                                ? "w-full max-w-[360px] sm:max-w-[390px]"
                                : ""
                                }`}
                        >
                            {tabs.map((tab) => (
                                <div
                                    key={tab.id}
                                    className="relative h-11 w-11 min-[380px]:h-14 min-[380px]:w-14 sm:h-[70px] sm:w-[70px]"
                                >
                                    {tab.id === guidedTarget && (
                                        <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 pointer-events-auto animate-in fade-in zoom-in duration-200">
                                            <div className="relative whitespace-nowrap rounded-2xl border border-sky-300/40 bg-black/90 px-4 py-3 text-center text-[12px] text-white shadow-lg shadow-blue-500/20 backdrop-blur md:scale-[0.7]">
                                                {lockHintLabel}
                                                <span
                                                    aria-hidden
                                                    className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 border-x-8 border-t-8 border-x-transparent border-t-black/90"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
            <nav className="pointer-events-none fixed bottom-3 left-0 right-0 z-40">
                <div className="pointer-events-auto mx-auto flex justify-center px-5 sm:px-6">
                    <div
                        className={`inline-flex justify-center gap-1 min-[380px]:gap-1.5 overflow-hidden border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-white/[0.03] p-1 shadow-lg shadow-blue-500/10 backdrop-blur sm:gap-2 md:origin-bottom md:scale-[1.45] ${hasSelection
                            ? "w-full max-w-[360px] rounded-b-3xl rounded-t-none border-t-0 sm:max-w-[390px]"
                            : "rounded-3xl"
                            }`}
                    >
                        {tabs.map((tab) => {
                            const active =
                                tab.matchers.find((matcher) => pathname?.startsWith(matcher)) !==
                                undefined;
                            const isGuided = guidedTarget !== null && tab.id === guidedTarget;
                            const locked =
                                guidedTarget !== null && tab.id !== guidedTarget && !active;
                            return (
                                <TabButton
                                    key={tab.id}
                                    tab={tab}
                                    active={active}
                                    locked={locked}
                                    isGuided={isGuided}
                                    onLockedTap={handleLockedTap}
                                />
                            );
                        })}
                    </div>
                </div>
            </nav>
        </>
    );
};

export default MainTabBar;
