"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactElement } from "react";
import { SlipIcon } from "../ui/SvgIcons";
import { useSelector } from "react-redux";
import { RootState } from "@/lib/interfaces/interfaces";
import Image from "next/image";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import dockStyles from "./BottomDock.module.css";

type TabIconProps = { className?: string };

type TabAccent = "sky" | "violet";

type TabDefinition = {
    id: string;
    label: string;
    href: string;
    icon: (props: TabIconProps) => ReactElement;
    matchers: string[];
    /**
     * Which brand colour this tab lights up in. Defaults to the app's sky; Arenas
     * carry violet, the same identity they use on their own screens.
     */
    accent?: TabAccent;
};

/**
 * Written out as whole class strings on purpose — Tailwind scans source text, so
 * a composed `border-${accent}-300/70` would never be generated.
 */
const TAB_ACCENT: Record<TabAccent, {
    activeFrame: string;
    guidedFrame: string;
    iconGradient: string;
}> = {
    sky: {
        activeFrame:
            "sm:border-sky-300/70 sm:bg-sky-400/10 sm:shadow-[0_12px_40px_-18px_rgba(96,165,250,0.7)]",
        guidedFrame:
            "border-sky-300/70 bg-sky-400/15 shadow-[0_12px_40px_-16px_rgba(125,211,252,0.8)]",
        iconGradient: "from-sky-300 via-blue-500 to-sky-300 shadow-lg shadow-blue-500/35",
    },
    violet: {
        activeFrame:
            "sm:border-violet-300/70 sm:bg-violet-400/10 sm:shadow-[0_12px_40px_-18px_rgba(167,139,250,0.7)]",
        guidedFrame:
            "border-violet-300/70 bg-violet-400/15 shadow-[0_12px_40px_-16px_rgba(196,181,253,0.8)]",
        iconGradient:
            "from-violet-300 via-violet-500 to-fuchsia-300 shadow-lg shadow-violet-500/35",
    },
};

const HIDDEN_ROUTES = [
    "/landing-page",
    "/account-creation",
    "/cag-explained",
    "/cag-form",
    "/auth/set-username",
    "/auth/callback",
    "/terms-and-conditions",
    "/privacy-policy",
    "/not-found"
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
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <path d="m3.75 10.55 7.15-6.1a1.7 1.7 0 0 1 2.2 0l7.15 6.1" />
        <path d="M5.6 9.8v8.35c0 .9.75 1.65 1.65 1.65h9.5c.9 0 1.65-.75 1.65-1.65V9.8" />
        <path
            d="M9.4 19.8v-4a2.6 2.6 0 0 1 5.2 0v4H9.4Z"
            fill="currentColor"
            stroke="none"
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

const ArenaIcon = ({ className }: TabIconProps) => (
    <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill="none"
        className={className}
    >
        <path
            fill="currentColor"
            d="M3 10.15c2.45-2.15 5.7-3.3 9-3.3s6.55 1.15 9 3.3v1.75c-2.75-1.55-5.75-2.3-9-2.3s-6.25.75-9 2.3v-1.75Z"
        />
        <path
            fill="currentColor"
            d="M5.5 8.75V3.35h.8v.55l3.1 1.35-3.1 1.4v2.1h-.8ZM11.6 7.15V1.4h.8v.55l3.45 1.45-3.45 1.5v2.25h-.8ZM17.7 8.75v-5.2h.8v.55l3.05 1.35-3.05 1.4v1.9h-.8Z"
        />
        <path
            fill="currentColor"
            fillOpacity="0.82"
            fillRule="evenodd"
            clipRule="evenodd"
            d="M3.2 12.35c2.7-1.45 5.65-2.15 8.8-2.15s6.1.7 8.8 2.15V20H3.2v-7.65ZM4.7 20v-4.05a2.05 2.05 0 0 1 4.1 0V20H4.7Zm4.95 0v-5.25a2.35 2.35 0 0 1 4.7 0V20h-4.7Zm5.55 0v-4.05a2.05 2.05 0 0 1 4.1 0V20h-4.1Z"
        />
        <path fill="currentColor" d="M2.1 19.85h19.8v1.5H2.1z" />
    </svg>
);

export const GlobeIcon = ({ className }: TabIconProps) => (
    <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill="none"
        className={className}
    >
        <circle
            cx="12"
            cy="12"
            r="9"
            stroke="currentColor"
            strokeWidth="1.6"
        />
        <path
            fill="currentColor"
            transform="translate(1.75 0)"
            d="M5.1 8.2c.6-2.05 2.15-3.65 4.25-4.45l1.1.3.65.85 1.1-.65 1.15.6-.55.9.95.7-.6 1-1.35.1-.8 1.05-1.15-.25-1.1 1.1-1.2-.25-.75.95-.95-.8-.75-1.15Zm3.3 1.05 1.2.3.9.8 1 .45-.4.8-.9-.4-.7-.65-1-.15-.1-1.15Zm1.25 1.4 1.9.2 1.45.9.7 1.25-.65 1.2-.2 1.45-1 1-.6 1.75-1.15 1.6-.55-1.75-.7-1.5.2-1.4-.85-1.2.35-1.2-.5-1.1 1.6-1.2Z"
        />
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
}) => {
    const accent = TAB_ACCENT[tab.accent ?? "sky"];
    return (
    <div
        className={`${dockStyles.dockTab} relative flex w-full flex-col items-center justify-center rounded-none bg-transparent text-[10px] font-semibold tracking-[0.08em] transition sm:rounded-[20px] sm:border ${active
            ? accent.activeFrame
            : isGuided
                ? accent.guidedFrame
                : "sm:border-white/10 sm:bg-white/[0.03] sm:hover:border-white/25 sm:hover:bg-white/[0.08]"
            } ${locked ? "opacity-45" : ""}`}
    >
        {isGuided && <GuidedArrow />}
        <div
            className={`mb-1 flex h-12 w-[calc(100%-0.25rem)] max-w-[52px] items-center justify-center rounded-2xl bg-gradient-to-br text-white transition ${active || isGuided
                ? accent.iconGradient
                : "from-white/20 via-white/10 to-white/0 text-gray-200 group-hover:from-white/30 group-hover:via-white/20 group-hover:to-white/10"
                }`}
        >
            <tab.icon className="h-6 w-6" />
        </div>
        <span
            className={`inline leading-none lowercase ${active || isGuided ? "text-white" : "text-gray-300 group-hover:text-white"}`}
        >
            {tab.label}
        </span>
        {locked && !active && <LockBadge />}
    </div>
    );
};

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
            <button type="button" onClick={onLockedTap} className="group relative block min-w-0 flex-1" aria-label={`${tab.label} (locked)`}>
                <TabInner tab={tab} active={active} locked />
            </button>
        );
    }
    return (
        <Link href={tab.href} className="group relative block min-w-0 flex-1">
            <TabInner tab={tab} active={active} isGuided={isGuided} />
        </Link>
    );
};

export const MainTabBar = () => {
    const pathname = usePathname();
    const currentUser = useCurrentUser();
    const [hasSelection, setHasSelection] = useState(false);
    const [lockHintOpen, setLockHintOpen] = useState(false);
    const lockHintTimeoutRef = useRef<number | null>(null);

    const { hasSeenSocialIntro, hasSeenWelcomeIntro, hasSeenGroupIntro } = useSelector((state: RootState) => state.progress);

    const guidedTarget: "leagues" | "social" | null = !hasSeenWelcomeIntro
        ? null
        : !hasSeenGroupIntro
            ? "leagues"
            : !hasSeenSocialIntro
                ? "social"
                : null;
    const lockHintLabel =
        guidedTarget === "leagues"
            ? "Tap the groups tab to continue."
            : guidedTarget === "social"
                ? "Tap the global tab to continue 🔒"
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
                id: "profile",
                label: "profile",
                href: "/profile",
                icon: UserIcon,
                matchers: ["/profile"],
            },
            {
                id: "leagues",
                label: "leagues",
                href: "/fantasy",
                icon: PeopleIcon,
                matchers: ["/fantasy", "/league"],
            },
            {
                id: "arenas",
                label: "arenas",
                href: "/arena",
                icon: ArenaIcon,
                matchers: ["/arenas", "/arena"],
                // Arenas are violet everywhere else in the app; the dock follows.
                accent: "violet",
            },
            {
                id: "social",
                label: "global",
                href: "/social",
                icon: GlobeIcon,
                matchers: ["/social", "/user"],
            }
        ],
        []
    );

    if (isRouteHidden(pathname) || !currentUser) return null;

    return (
        <>
            {lockHintLabel && lockHintOpen && (
                <div data-main-tabbar className="pointer-events-none fixed bottom-[-3px] sm:bottom-[-20px] left-0 right-0 z-50 lg:hidden">
                    <div className="mx-auto flex justify-center px-5 sm:px-6">
                        <div
                            className={`inline-flex justify-center gap-1 min-[380px]:gap-1.5 p-1 sm:gap-2 sm:origin-bottom sm:scale-[1.45] ${hasSelection
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
            <nav
                data-main-tabbar
                aria-label="Primary app navigation"
                className={`${dockStyles.viewportAnchor} ${dockStyles.dockPosition} pointer-events-none fixed z-40 lg:hidden`}
            >
                <div className={`${dockStyles.dockGutter} pointer-events-auto mx-auto flex justify-center`}>
                    <div
                        className={`${dockStyles.scaledFrame} flex justify-center gap-0 overflow-hidden border-x-0 border-y border-white/10 bg-[#080a0f] px-1 pb-2 pt-1 sm:gap-2 sm:border sm:p-1 ${hasSelection
                            ? "shadow-none sm:rounded-b-[24px] sm:rounded-t-none"
                            : "shadow-lg shadow-blue-500/10 sm:rounded-[24px]"
                            }`}
                    >
                        {tabs.map((tab) => {
                            const active =
                                tab.matchers.find((matcher) => pathname?.startsWith(matcher)) !==
                                undefined;
                            const isGuided = guidedTarget !== null && tab.id === guidedTarget;
                            const locked = guidedTarget !== null && tab.id !== guidedTarget;
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
