"use client";

import Image from "next/image";
import { useState } from "react";

/* ----------------------------------------------------------------------------
 * The 40px ringed member plate used by every gold standings board
 * (StandingsCard's `StandingIdentity`). Ported from the MVP's
 * components/community/LifetimeStandingAvatar.tsx.
 *
 * One deliberate difference from the MVP: this build renders REAL profile
 * images off the API (callers resolve them through `generateProfileImageUrl`),
 * and those URLs can 404 for a deleted or half-uploaded avatar. The MVP's mock
 * store can never miss, so it has no error path; here a failed load degrades
 * back to the initials plate — the same fallback app/social/page.tsx already
 * hand-rolls with its own `imgError` state.
 * -------------------------------------------------------------------------- */

type LifetimeStandingAvatarProps = {
  avatarUrl?: string;
  displayName: string;
  handle: string;
  rank: number;
};

const initialsFor = (displayName: string, handle: string) => {
  const source = displayName.trim() || handle.replace(/^@/, "");
  const parts = source.split(/\s+/).filter(Boolean);
  return (parts.length > 1
    ? `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`
    : parts[0]?.slice(0, 2) ?? "")
    .toUpperCase();
};

export const getLifetimeStandingAvatarTone = (rank: number) =>
  rank === 1
    ? {
        name: "gold",
        frame:
          "border-amber-200/60 bg-amber-950/30 ring-amber-300/25 shadow-[0_0_16px_rgba(251,191,36,0.16)]",
        fallback:
          "bg-gradient-to-br from-amber-200 via-amber-400 to-orange-600 text-amber-950",
      }
    : rank === 2
      ? {
          name: "silver",
          frame:
            "border-slate-200/55 bg-slate-950/30 ring-slate-200/20 shadow-[0_0_14px_rgba(226,232,240,0.12)]",
          fallback:
            "bg-gradient-to-br from-slate-100 via-slate-400 to-slate-700 text-slate-950",
        }
      : rank === 3
        ? {
            name: "bronze",
            frame:
              "border-orange-300/55 bg-orange-950/25 ring-orange-300/20 shadow-[0_0_14px_rgba(249,115,22,0.12)]",
            fallback:
              "bg-gradient-to-br from-orange-200 via-orange-500 to-orange-800 text-orange-950",
          }
        : {
            name: "gold-muted",
            frame: "border-amber-200/25 bg-amber-950/15 ring-amber-300/10",
            fallback:
              "bg-gradient-to-br from-amber-200/80 via-amber-500/70 to-amber-900 text-amber-950",
          };

export const LifetimeStandingAvatar = ({
  avatarUrl,
  displayName,
  handle,
  rank,
}: LifetimeStandingAvatarProps) => {
  const tone = getLifetimeStandingAvatarTone(rank);
  /*
   * Keyed on the URL rather than a bare boolean: a standings list re-sorts in
   * place, so React reuses this instance for a different member and a stale
   * `true` would blank an avatar that loads perfectly well.
   */
  const [failedAvatarUrl, setFailedAvatarUrl] = useState<string | null>(null);
  const showImage = Boolean(avatarUrl) && failedAvatarUrl !== avatarUrl;

  return (
    <span
      aria-hidden="true"
      data-lifetime-standing-avatar
      data-avatar-kind={showImage ? "image" : "initials"}
      data-lifetime-standing-avatar-tone={tone.name}
      className={`grid h-10 w-10 shrink-0 place-items-center rounded-full border p-[3px] ring-1 ${tone.frame}`}
    >
      <span
        className={`grid h-full w-full place-items-center overflow-hidden rounded-full text-[10px] font-black uppercase tracking-[0.08em] ${tone.fallback}`}
      >
        {showImage && avatarUrl ? (
          <Image
            src={avatarUrl}
            alt=""
            aria-hidden="true"
            width={36}
            height={36}
            unoptimized
            onError={() => setFailedAvatarUrl(avatarUrl)}
            className="h-full w-full object-cover"
          />
        ) : (
          initialsFor(displayName, handle)
        )}
      </span>
    </span>
  );
};

export default LifetimeStandingAvatar;
