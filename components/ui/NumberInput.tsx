"use client";

import { useEffect, useRef, useState } from "react";

type Props = Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "value" | "onChange" | "type"
> & {
    value: number;
    onValueChange: (value: number) => void;
    min?: number;
    max?: number;
};

// Render a finite number as a string; anything non-finite becomes an empty
// field rather than the literal text "NaN"/"Infinity".
const toBuffer = (value: number) => (Number.isFinite(value) ? String(value) : "");

const NumberInput = ({ value, onValueChange, min, max, onFocus, onBlur, ...rest }: Props) => {
    const [buffer, setBuffer] = useState(() => toBuffer(value));
    const focusedRef = useRef(false);

    useEffect(() => {
        if (!focusedRef.current) setBuffer(toBuffer(value));
    }, [value]);

    const clamp = (n: number) => {
        let next = n;
        if (typeof min === "number") next = Math.max(min, next);
        if (typeof max === "number") next = Math.min(max, next);
        return next;
    };

    return (
        <input
            {...rest}
            type="number"
            min={min}
            max={max}
            value={buffer}
            onFocus={(event) => {
                focusedRef.current = true;
                onFocus?.(event);
            }}
            onChange={(event) => {
                const raw = event.target.value;
                setBuffer(raw);
                // Allow empty / lone "-" while typing without touching the model.
                if (raw === "" || raw === "-") return;
                const parsed = Number(raw);
                if (Number.isNaN(parsed)) return;
                onValueChange(clamp(parsed));
            }}
            onBlur={(event) => {
                focusedRef.current = false;
                const raw = event.target.value.trim();
                const parsed = Number(raw);
                if (raw === "" || Number.isNaN(parsed)) {
                    // Restore the last committed value rather than forcing 0.
                    setBuffer(toBuffer(value));
                } else {
                    const clamped = clamp(parsed);
                    setBuffer(String(clamped));
                    onValueChange(clamped);
                }
                onBlur?.(event);
            }}
        />
    );
};

export default NumberInput;
