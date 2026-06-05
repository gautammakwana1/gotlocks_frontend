"use client";

type Props = {
    /** Diameter in px. */
    size?: number;
    /** Number of spokes (iOS uses 12). */
    bars?: number;
    /** Seconds for one full revolution. */
    speed?: number;
    className?: string;
};

/**
 * iOS / Safari style activity indicator — a ring of tapered spokes whose
 * opacity fades around the circle, giving the signature "comet tail" spin.
 * Colour comes from the current text color (`currentColor`), so set it via a
 * Tailwind `text-*` class on this element or an ancestor.
 */
const IosSpinner = ({ size = 20, bars = 12, speed = 1, className = "" }: Props) => {
    const thickness = Math.max(2, size * 0.09);
    const length = size * 0.27;
    const radius = size * 0.18;
    const angle = 360 / bars;

    return (
        <span
            role="status"
            aria-label="Loading"
            className={className}
            style={{ position: "relative", display: "inline-block", width: size, height: size }}
        >
            {Array.from({ length: bars }).map((_, i) => (
                <span
                    key={i}
                    aria-hidden
                    style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        width: length,
                        height: thickness,
                        marginTop: -thickness / 2,
                        borderRadius: thickness,
                        background: "currentColor",
                        transformOrigin: "0% 50%",
                        transform: `rotate(${angle * i}deg) translateX(${radius}px)`,
                        animation: `ios-spinner-fade ${speed}s linear infinite`,
                        animationDelay: `${((i / bars) - 1) * speed}s`,
                    }}
                />
            ))}
        </span>
    );
};

export default IosSpinner;
