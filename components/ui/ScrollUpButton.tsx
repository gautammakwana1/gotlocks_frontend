"use client";

import { ChevronUpDownIcon } from "./SvgIcons";

type ScrollUpButtonProps = {
    scrollToTop: () => void;
};

const ScrollUpButton = ({ scrollToTop }: ScrollUpButtonProps) => {
    return (
        <button
            onClick={scrollToTop}
            aria-label="Scroll to top"
            className={`
                group fixed bottom-24 right-5 sm:bottom-12 sm:right-12 z-50 flex h-8 w-8 sm:h-12 sm:w-12 items-center justify-center rounded-full 
                bg-gradient-to-br from-sky-300 via-blue-500 to-sky-300
                text-white shadow-[0_8px_30px_rgba(56,189,248,0.45)]
                backdrop-blur-xl
                transition-all duration-300
                opacity-80
                hover:scale-110
                hover:shadow-[0_12px_45px_rgba(14,165,233,0.65)]
                hover:opacity-100
                active:scale-95
                animate-[float_3s_ease-in-out_infinite]
            `}
        >
            {/* Glow Ring */}
            <span
                className="absolute inset-0 rounded-full bg-sky-400/30 blur-xl opacity-0 transition duration-300 group-hover:opacity-100"
            />

            {/* Pulse Animation */}
            <span
                className="absolute inset-0 rounded-full border border-white/20 animate-ping opacity-100"
            />

            {/* Icon */}
            <ChevronUpDownIcon className="relative z-10 h-6 w-6 transition-transform duration-300 group-hover:-translate-y-1 rotate-180" />
        </button>
    );
};

export default ScrollUpButton;
