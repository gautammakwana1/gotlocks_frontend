"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { JSX } from "react";

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
    "/auth/callback"
];

const isRouteHidden = (pathname: string | null) => {
    if (!pathname) return false;
    return HIDDEN_ROUTES.some((route) => pathname.startsWith(route));
};

const HomeIcon = ({ className }: TabIconProps) => (
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

const SparkIcon = ({ className }: TabIconProps) => (
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

const PeopleIcon = ({ className }: TabIconProps) => (
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

const GlobeIcon = ({ className }: TabIconProps) => (
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

const UserIcon = ({ className }: TabIconProps) => (
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

const TabButton = ({
    tab,
    active,
}: {
    tab: TabDefinition;
    active: boolean;
}) => (
    <Link href={tab.href} className="group block">
        <div
            className={`relative flex h-11 w-11 min-[380px]:h-14 min-[380px]:w-14 sm:h-[70px] sm:w-[70px] flex-col items-center justify-center rounded-2xl border text-[10px] font-semibold tracking-[0.08em] transition ${active
                ? "border-emerald-300/70 bg-emerald-400/10 shadow-[0_12px_40px_-18px_rgba(52,211,153,0.9)]"
                : "border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.08]"
                }`}
        >
            <div
                className={`mb-0 sm:mb-1 flex h-8 w-8 min-[380px]:h-10 min-[380px]:w-10 items-center justify-center rounded-xl bg-gradient-to-br text-white transition ${active
                    ? "from-emerald-300 via-emerald-500 to-emerald-300 shadow-lg shadow-emerald-500/40"
                    : "from-white/20 via-white/10 to-white/0 text-gray-200 group-hover:from-white/30 group-hover:via-white/20 group-hover:to-white/10"
                    }`}
            >
                <tab.icon className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <span
                className={`hidden sm:inline lowercase ${active ? "text-white" : "text-gray-300 group-hover:text-white"
                    }`}
            >
                {tab.label}
            </span>
        </div>
    </Link>
);

export const MainTabBar = () => {
    const pathname = usePathname();
    const [hasSelection, setHasSelection] = useState(false);

    useEffect(() => {
        const handleSelection = (event: Event) => {
            const detail = (event as CustomEvent<{ active?: boolean }>).detail;
            setHasSelection(Boolean(detail?.active));
        };
        window.addEventListener("pick-builder-selection", handleSelection);
        return () => window.removeEventListener("pick-builder-selection", handleSelection);
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
                matchers: ["/social", "/users"],
            },
            {
                id: "builder",
                label: "picks",
                href: "/pick-builder",
                icon: SparkIcon,
                matchers: ["/pick-builder"],
            },
        ],
        []
    );

    if (isRouteHidden(pathname)) return null;

    return (
        <nav className="pointer-events-none fixed bottom-3 left-0 right-0 z-40">
            <div className="pointer-events-auto mx-auto flex justify-center px-5 sm:px-6">
                <div
                    className={`inline-flex justify-center gap-1 min-[380px]:gap-1.5 overflow-hidden border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-white/[0.03] p-1 shadow-lg shadow-emerald-500/10 backdrop-blur sm:gap-2 md:origin-bottom md:scale-[1.45] ${hasSelection
                        ? "w-full max-w-[360px] rounded-b-3xl rounded-t-none border-t-0 sm:max-w-[390px]"
                        : "rounded-3xl"
                        }`}
                >
                    {tabs.map((tab) => {
                        const active =
                            tab.matchers.find((matcher) => pathname?.startsWith(matcher)) !==
                            undefined;
                        return <TabButton key={tab.id} tab={tab} active={active} />;
                    })}
                </div>
            </div>
        </nav>
    );
};

export default MainTabBar;
