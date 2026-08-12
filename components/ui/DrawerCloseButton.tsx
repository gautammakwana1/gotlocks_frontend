"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";

type DrawerCloseButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children" | "type"
>;

export const DrawerCloseButton = forwardRef<
  HTMLButtonElement,
  DrawerCloseButtonProps
>(({ className = "", ...props }, ref) => (
  <button
    ref={ref}
    type="button"
    {...props}
    className={`inline-flex min-h-9 items-center justify-center rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold lowercase tracking-[0.06em] text-gray-300 transition hover:border-white/25 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 motion-reduce:transition-none ${className}`}
  >
    close
  </button>
));

DrawerCloseButton.displayName = "DrawerCloseButton";

export default DrawerCloseButton;
