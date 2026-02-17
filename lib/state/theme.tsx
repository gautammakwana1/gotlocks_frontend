"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

type Theme = "dark" | "light";

type ThemeContextValue = {
    theme: Theme;
    toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const getInitialTheme = (): Theme => {
    if (typeof window === "undefined") return "dark";
    const stored = window.localStorage.getItem("gotlocks-theme");
    if (stored === "light" || stored === "dark") return stored;
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
};

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
    const [theme, setTheme] = useState<Theme>("dark");

    useEffect(() => {
        setTheme(getInitialTheme());
    }, []);

    useEffect(() => {
        const root = document.documentElement;
        root.dataset.theme = theme;
        root.classList.remove("theme-dark", "theme-light");
        root.classList.add(`theme-${"dark"}`);
        window.localStorage.setItem("gotlocks-theme", "dark");
    }, [theme]);

    const value = useMemo<ThemeContextValue>(
        () => ({
            theme,
            toggleTheme: () => setTheme((prev) => (prev === "dark" ? "light" : "dark")),
        }),
        [theme]
    );

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error("useTheme must be used within ThemeProvider");
    }
    return context;
};
