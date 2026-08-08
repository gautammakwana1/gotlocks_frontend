"use client";

import {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from "react";

export const clamp = (v: number, min: number, max: number) =>
    Math.max(min, Math.min(max, v));

export const Easing = {
    linear: (t: number) => t,
    easeInQuad: (t: number) => t * t,
    easeOutQuad: (t: number) => t * (2 - t),
    easeInCubic: (t: number) => t * t * t,
    easeOutCubic: (t: number) => (--t) * t * t + 1,
    easeInOutCubic: (t: number) =>
        t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
    easeOutBack: (t: number) => {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    },
};

type TimelineValue = { time: number; duration: number };

const TimelineContext = createContext<TimelineValue>({ time: 0, duration: 6 });

export const useTime = () => useContext(TimelineContext).time;

type EmbedStageProps = {
    width?: number;
    height?: number;
    duration?: number;
    speed?: number;
    background?: string;
    children: ReactNode;
};

/**
 * Auto-scaling animation canvas. Renders a fixed virtual viewport (default 800x1000)
 * and scales it to fit the parent container. Loops on a requestAnimationFrame tick.
 */
export function EmbedStage({
    width = 800,
    height = 1000,
    duration = 6,
    speed = 1,
    background = "#030303",
    children,
}: EmbedStageProps) {
    const [time, setTime] = useState(0);
    const [scale, setScale] = useState(1);
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const rafRef = useRef<number | null>(null);
    const lastTsRef = useRef<number | null>(null);

    useEffect(() => {
        if (!containerRef.current) return;
        const el = containerRef.current;
        const measure = () => {
            const s = Math.min(el.clientWidth / width, el.clientHeight / height);
            setScale(Math.max(0.05, s));
        };
        measure();

        if (typeof ResizeObserver === "undefined") {
            window.addEventListener("resize", measure);
            return () => window.removeEventListener("resize", measure);
        }

        const ro = new ResizeObserver(measure);
        ro.observe(el);
        return () => ro.disconnect();
    }, [width, height]);

    useEffect(() => {
        if (typeof window.matchMedia !== "function") return;

        const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
        const updateMotionPreference = () => setPrefersReducedMotion(mediaQuery.matches);

        updateMotionPreference();
        mediaQuery.addEventListener("change", updateMotionPreference);
        return () => mediaQuery.removeEventListener("change", updateMotionPreference);
    }, []);

    useEffect(() => {
        if (
            prefersReducedMotion ||
            typeof window.requestAnimationFrame !== "function" ||
            typeof window.cancelAnimationFrame !== "function"
        ) {
            return;
        }

        lastTsRef.current = null;
        const step = (ts: number) => {
            if (lastTsRef.current == null) lastTsRef.current = ts;
            const dt = ((ts - lastTsRef.current) / 1000) * speed;
            lastTsRef.current = ts;
            setTime((t) => {
                let next = t + dt;
                if (next >= duration) next = next % duration;
                return next;
            });
            rafRef.current = window.requestAnimationFrame(step);
        };
        rafRef.current = window.requestAnimationFrame(step);
        return () => {
            if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
            lastTsRef.current = null;
        };
    }, [duration, prefersReducedMotion, speed]);

    const visibleTime = prefersReducedMotion ? duration * 0.6 : time;
    const ctxValue = useMemo(
        () => ({ time: visibleTime, duration }),
        [duration, visibleTime],
    );

    return (
        <div
            ref={containerRef}
            style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                background,
            }}
        >
            <div
                style={{
                    width,
                    height,
                    background,
                    position: "relative",
                    transform: `scale(${scale})`,
                    transformOrigin: "center",
                    flexShrink: 0,
                    overflow: "hidden",
                }}
            >
                <TimelineContext.Provider value={ctxValue}>
                    {children}
                </TimelineContext.Provider>
            </div>
        </div>
    );
}
