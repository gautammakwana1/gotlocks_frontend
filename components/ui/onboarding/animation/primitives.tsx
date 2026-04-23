"use client";

import type { CSSProperties } from "react";

// Palette + fonts — mirror the design bundle's gotlocks aesthetic.
export const BRAND = "#60a5fa";
export const BRAND_STRONG = "#3b82f6";
export const BRAND_HIGHLIGHT = "#93c5fd";
export const BRAND_TEXT = "#dbeafe";
export const APP_BG = "#030303";
export const CARD_BG = "#0b0b0b";
export const TEXT = "#f8fafc";
export const TEXT_MUTED = "#94a3b8";
export const TEXT_SECONDARY = "#cbd5e1";
export const BORDER = "rgba(255,255,255,0.08)";
export const BORDER_STRONG = "rgba(255,255,255,0.14)";
export const AMBER = "#fb923c";
export const AMBER_SOFT = "rgba(251,146,60,0.18)";
export const AMBER_GLOW = "rgba(251,146,60,0.35)";

export const FONT_SANS =
    "'Geist', 'Inter', system-ui, -apple-system, sans-serif";
export const FONT_MONO =
    "'Geist Mono', 'JetBrains Mono', ui-monospace, SFMono-Regular, monospace";

type AvatarProps = {
    initials?: string;
    size?: number;
    hue?: number;
    ring?: boolean;
};

export function Avatar({ initials = "SR", size = 32, hue = 220, ring = false }: AvatarProps) {
    return (
        <div
            style={{
                width: size,
                height: size,
                borderRadius: size,
                background: `linear-gradient(135deg, oklch(62% 0.12 ${hue}), oklch(38% 0.08 ${hue + 30}))`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontFamily: FONT_SANS,
                fontWeight: 600,
                fontSize: size * 0.4,
                letterSpacing: "-0.01em",
                flexShrink: 0,
                boxShadow: ring ? `0 0 0 2px ${BRAND}, 0 0 0 4px ${APP_BG}` : "none",
            }}
        >
            {initials}
        </div>
    );
}

type PointsBurstProps = {
    x: number;
    y: number;
    value?: string;
    color?: string;
    scale?: number;
    opacity?: number;
    style?: CSSProperties;
};

export function PointsBurst({
    x,
    y,
    value = "+50",
    color = "#86efac",
    scale = 1,
    opacity = 1,
}: PointsBurstProps) {
    return (
        <div
            style={{
                position: "absolute",
                left: x,
                top: y,
                transform: `translate(-50%, -50%) scale(${scale})`,
                opacity,
                fontFamily: FONT_MONO,
                fontWeight: 700,
                fontSize: 20,
                color,
                textShadow: `0 0 12px ${color}`,
                pointerEvents: "none",
                willChange: "transform, opacity",
            }}
        >
            {value}
        </div>
    );
}
