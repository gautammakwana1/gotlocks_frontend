import { CustomDatePickerProps } from "@/lib/interfaces/interfaces";
import { Calendar1 } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { DayPicker } from "react-day-picker";

export default function CustomDatePicker({
    label,
    value,
    onChange,
    required = false,
    startYear = 1900,
    endYear = new Date().getFullYear(),
    disableFuture = false,
    error,
    placeholder = "Select date",
    className = "",
    note,
}: CustomDatePickerProps) {
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [month, setMonth] = useState<Date>(value ?? new Date());
    const containerRef = useRef<HTMLLabelElement | null>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                containerRef.current &&
                !containerRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () =>
            document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Sync month when value changes
    useEffect(() => {
        if (value) {
            setMonth(value);
        }
    }, [value]);

    return (
        <label
            ref={containerRef}
            className={`flex flex-col gap-2 relative ${className}`}
        >
            {label && (
                <span className="text-xs uppercase tracking-wide text-gray-400">
                    {label} {required && <span className="text-red-400">*</span>}
                </span>
            )}

            <div className="relative">
                <input
                    type="text"
                    readOnly
                    value={value ? value.toLocaleDateString() : ""}
                    placeholder={placeholder}
                    onClick={() => setIsOpen((prev) => !prev)}
                    className="w-full cursor-pointer rounded-2xl border border-white/10 bg-black px-4 py-3 pr-10 text-sm text-white outline-none transition focus:border-emerald-400/70"
                />

                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                    <Calendar1 size={18} />
                </span>
            </div>

            <div
                className={`
                        absolute
                        left-1/2
                        -translate-x-1/2
                        sm:left-0 sm:translate-x-0
                        top-[65px]
                        z-50
                        mt-2
                        w-fit
                        max-w-[340px]
                        rounded-2xl
                        bg-black/95
                        backdrop-blur-xl
                        p-3 sm:p-4
                        shadow-[0_0_30px_rgba(16,185,129,0.15)]
                        border border-emerald-400/70
                        text-white
                        transition-all duration-300 ease-out
                        ${isOpen ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 -translate-y-2 pointer-events-none"}
                        sm:max-w-none
                    `}
            >
                <div className="scale-[0.95] sm:scale-100 origin-top">
                    <DayPicker
                        mode="single"
                        selected={value}
                        month={month}
                        onMonthChange={(newMonth: Date) => setMonth(newMonth)}
                        onSelect={(date: Date | undefined) => {
                            onChange(date);
                            if (date) setMonth(date);
                            setIsOpen(false);
                        }}
                        captionLayout="dropdown"
                        startMonth={new Date(startYear, 0)}
                        endMonth={new Date(endYear, 11)}
                        disabled={
                            disableFuture ? { after: new Date() } : undefined
                        }
                        footer={`Note: ${note}`}
                        className="text-sm sm:text-base"
                        classNames={{
                            caption: "flex justify-center gap-3",
                            dropdown: `
                                        bg-black
                                        text-white
                                        border border-emerald-400/70
                                        rounded-lg
                                        px-3
                                        py-2
                                        text-sm
                                        outline-none
                                        hover:border-emerald-400
                                        transition
                                        cursor-pointer
                                    `,
                            dropdown_month: "min-w-[120px]",
                            dropdown_year: "min-w-[90px]",
                            caption_label: "hidden",
                            today: "text-emerald-400",
                            footer: "text-[11px] text-gray-400 mt-2 italic",
                        }}
                    />
                </div>
            </div>

            {error && (
                <span
                    role="alert"
                    className="text-xs font-medium text-red-400"
                >
                    {error}
                </span>
            )}
        </label>
    );
};
