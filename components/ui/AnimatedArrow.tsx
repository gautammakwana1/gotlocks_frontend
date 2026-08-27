import type { ReactNode } from "react";

export type AnimatedArrowDirection = "left" | "right" | "up" | "up-right" | "down";

const DEFAULT_ARROW: Record<AnimatedArrowDirection, ReactNode> = {
    left: "←",
    right: "→",
    up: "↑",
    "up-right": "↗",
    down: "↓",
};

/**
 * A directional glyph that nudges toward its own direction when the control
 * wrapping it is hovered or focused. The movement is pure CSS — see the
 * `.ui-directional-arrow` block in app/globals.css — so the arrow costs no
 * render work and never shifts layout.
 *
 * The `data-directional-arrow` attribute is what the stylesheet keys off, so a
 * bare `<svg>` chevron can opt into the same affordance without going through
 * this component (see PickReviewSheet / ConfidenceDropdown).
 */
export const AnimatedArrow = ({
    direction,
    className,
    children,
}: {
    direction: AnimatedArrowDirection;
    className?: string;
    children?: ReactNode;
}) => (
    <span
        aria-hidden="true"
        data-directional-arrow={direction}
        className={`ui-directional-arrow ${className ?? ""}`.trim()}
    >
        {children ?? DEFAULT_ARROW[direction]}
    </span>
);

export default AnimatedArrow;
