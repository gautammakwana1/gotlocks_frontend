"use client";

import { ConfidenceLevel } from "@/lib/interfaces/interfaces";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type ConfidenceOption = {
    value: ConfidenceLevel;
    label: string;
    textClassName: string;
    dotClassName: string;
};

const CONFIDENCE_OPTIONS: ConfidenceOption[] = [
    {
        value: "HIGH",
        label: "high",
        textClassName: "text-emerald-100",
        dotClassName: "bg-emerald-300",
    },
    {
        value: "MEDIUM",
        label: "medium",
        textClassName: "text-amber-100",
        dotClassName: "bg-amber-300",
    },
    {
        value: "LOW",
        label: "low",
        textClassName: "text-rose-100",
        dotClassName: "bg-rose-300",
    },
];

const MENU_GAP = 8;
const VIEWPORT_PADDING = 12;

type Props = {
    value: ConfidenceLevel | null;
    onChange: (value: ConfidenceLevel) => void;
    disabled?: boolean;
};

const ConfidenceDropdown = ({ value, onChange, disabled = false }: Props) => {
    const [open, setOpen] = useState(false);
    const [menuPosition, setMenuPosition] = useState<{
        top: number;
        left: number;
        width: number;
    } | null>(null);
    const wrapperRef = useRef<HTMLDivElement | null>(null);
    const menuRef = useRef<HTMLDivElement | null>(null);
    const selectedOption =
        CONFIDENCE_OPTIONS.find((option) => option.value === value) ?? null;

    useEffect(() => {
        if (!open) return;

        const updatePosition = () => {
            const wrapper = wrapperRef.current;
            if (!wrapper) return;

            const rect = wrapper.getBoundingClientRect();
            const menuHeight =
                menuRef.current?.offsetHeight ?? CONFIDENCE_OPTIONS.length * 34 + 12;
            const width = Math.min(rect.width, window.innerWidth - VIEWPORT_PADDING * 2);
            const left = Math.min(
                Math.max(rect.left, VIEWPORT_PADDING),
                window.innerWidth - width - VIEWPORT_PADDING
            );
            const shouldOpenUpward =
                rect.bottom + MENU_GAP + menuHeight > window.innerHeight - VIEWPORT_PADDING;
            const top = shouldOpenUpward
                ? Math.max(VIEWPORT_PADDING, rect.top - menuHeight - MENU_GAP)
                : rect.bottom + MENU_GAP;

            setMenuPosition({ top, left, width });
        };

        updatePosition();
        const rafId = window.requestAnimationFrame(updatePosition);

        const handlePointerDown = (event: PointerEvent) => {
            const target = event.target as Node | null;
            if (!target) return;
            if (wrapperRef.current?.contains(target)) return;
            if (menuRef.current?.contains(target)) return;
            setOpen(false);
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setOpen(false);
            }
        };

        document.addEventListener("pointerdown", handlePointerDown);
        document.addEventListener("keydown", handleEscape);
        window.addEventListener("resize", updatePosition);
        window.addEventListener("scroll", updatePosition, true);
        return () => {
            window.cancelAnimationFrame(rafId);
            document.removeEventListener("pointerdown", handlePointerDown);
            document.removeEventListener("keydown", handleEscape);
            window.removeEventListener("resize", updatePosition);
            window.removeEventListener("scroll", updatePosition, true);
        };
    }, [open]);

    const handleSelect = (next: ConfidenceLevel) => {
        onChange(next);
        setOpen(false);
    };

    return (
        <div ref={wrapperRef} className="relative mt-1">
            <button
                type="button"
                onClick={() => !disabled && setOpen((prev) => !prev)}
                disabled={disabled}
                aria-expanded={open}
                aria-haspopup="listbox"
                className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-left shadow-[inset_0_0_8px_rgba(15,23,42,0.18)] transition hover:border-white/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
                <span className="flex min-w-0 items-center gap-2">
                    <span
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${selectedOption?.dotClassName ?? "bg-slate-500"
                            }`}
                    />
                    <span
                        className={`truncate text-[10px] font-semibold lowercase ${selectedOption?.textClassName ?? "text-slate-500"
                            }`}
                    >
                        {selectedOption?.label ?? "select"}
                    </span>
                </span>
                <span className="shrink-0 text-[10px] text-slate-500" aria-hidden>
                    <svg
                        viewBox="0 0 16 16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        className={`h-3 w-3 transition ${open ? "rotate-180" : ""}`}
                    >
                        <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </span>
            </button>

            {open && menuPosition
                ? createPortal(
                    <div
                        ref={menuRef}
                        role="listbox"
                        aria-label="Confidence"
                        className="fixed z-[140] rounded-xl border border-white/10 bg-[#050505]/96 p-1 shadow-[0_18px_40px_rgba(0,0,0,0.45)] backdrop-blur"
                        style={{
                            top: menuPosition.top,
                            left: menuPosition.left,
                            width: menuPosition.width,
                        }}
                    >
                        {CONFIDENCE_OPTIONS.map((option) => {
                            const active = option.value === value;
                            return (
                                <button
                                    key={option.value}
                                    type="button"
                                    role="option"
                                    aria-selected={active}
                                    onClick={() => handleSelect(option.value)}
                                    className={`flex w-full items-center justify-between gap-3 rounded-lg px-2 py-2 text-left transition ${active ? "bg-white/12" : "hover:bg-white/8"
                                        }`}
                                >
                                    <span className="flex min-w-0 items-center gap-2">
                                        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${option.dotClassName}`} />
                                        <span
                                            className={`text-[10px] font-semibold lowercase ${option.textClassName}`}
                                        >
                                            {option.label}
                                        </span>
                                    </span>
                                    {active ? (
                                        <span className="text-emerald-200" aria-hidden>
                                            <svg
                                                viewBox="0 0 16 16"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                className="h-3.5 w-3.5"
                                            >
                                                <path
                                                    d="M3 8l3 3 7-7"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                />
                                            </svg>
                                        </span>
                                    ) : (
                                        <span className="h-3.5 w-3.5" aria-hidden />
                                    )}
                                </button>
                            );
                        })}
                    </div>,
                    document.body
                )
                : null}
        </div>
    );
};

export default ConfidenceDropdown;
