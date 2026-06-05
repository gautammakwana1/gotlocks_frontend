"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";

type Props = {
  onSelect: (native: string) => void;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  composerRef: React.RefObject<HTMLDivElement | null>;
  isMobile: boolean;
};

export default function ChatEmojiPicker({ onSelect, onClose, anchorRef, composerRef, isMobile }: Props) {
  const pickerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const onDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (pickerRef.current?.contains(target) || anchorRef.current?.contains(target)) return;
      onClose();
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [onClose, anchorRef]);

  useEffect(() => {
    if (!isMobile) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobile]);

  const picker = (
    <Picker
      data={data}
      theme="dark"
      onEmojiSelect={(emoji: { native: string }) => onSelect(emoji.native)}
      previewPosition="none"
      skinTonePosition="search"
      navPosition="top"
      autoFocus={!isMobile}
      dynamicWidth={isMobile}
      perLine={isMobile ? 8 : 9}
    />
  );

  if (isMobile) {
    if (typeof document === "undefined") return null;
    // Portal to <body> so the sheet escapes the composer's backdrop-filter
    // (which would otherwise become the fixed containing block) and the chat
    // section's overflow-hidden (which clipped the picker's top on short
    // screens). z-[60] keeps it above the fixed MainTabBar (z-50).
    return createPortal(
      <div
        ref={pickerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Emoji picker"
        style={{ bottom: 73 }}
        className="ui-sheet-up emoji-mart-glass emoji-mart-mobile fixed inset-x-2 z-[60] overflow-hidden rounded-2xl border border-sky-400/30 bg-gradient-to-br from-white/10 via-white/5 to-white/[0.03] shadow-[0_12px_40px_rgba(0,0,0,0.6),0_0_22px_-6px_rgba(59,130,246,0.45)] backdrop-blur"
      >
        {picker}
      </div>,
      document.body
    );
  }

  return (
    <div
      ref={pickerRef}
      role="dialog"
      aria-label="Emoji picker"
      className="ui-emoji-pop emoji-mart-glass absolute bottom-full right-0 z-40 mb-2 max-w-[calc(100vw-1.5rem)] origin-bottom-right overflow-hidden rounded-2xl border border-sky-400/30 bg-gradient-to-br from-white/10 via-white/5 to-white/[0.03] shadow-[0_8px_30px_-8px_rgba(0,0,0,0.6),0_0_22px_-6px_rgba(59,130,246,0.45)] backdrop-blur"
    >
      {picker}
    </div>
  );
}
