"use client";

import { useMemo, useRef, useState, type CSSProperties } from "react";
import { JAGGED_CLIP_PATH } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils/date";
import Image from "next/image";
import { toJpeg } from "html-to-image";
import { Member, Pick, Slip } from "@/lib/interfaces/interfaces";
import { useToast } from "@/lib/state/ToastContext";
import { UserIcon } from "../layout/MainTabBar";
import { generateProfileImageUrl } from "@/lib/utils/helpers";
import { getLeagueComboOddsSummary } from "@/lib/slips/groupComboOdds";

type SlipShareModalProps = {
    open: boolean;
    onClose: () => void;
    slip: Slip;
    picks: Pick[];
    members: Member[];
};

const EM_DASH = "\u2014";
const PLACEHOLDER = EM_DASH;

const deepJaggedStyle = {
    clipPath: JAGGED_CLIP_PATH,
    "--jagged-valley": "34px",
    "--jagged-tip": "0px",
} as CSSProperties;

const PICK_RESULT_ACCENTS = {
    win: {
        dot: "bg-emerald-300/80",
        ring: "shadow-[0_0_0_4px_rgba(16,185,129,0.12)]",
        text: "text-emerald-200",
        avatar: "ring-1 ring-emerald-300/40 ring-offset-1 ring-offset-black/60",
    },
    loss: {
        dot: "bg-red-300/80",
        ring: "shadow-[0_0_0_4px_rgba(248,113,113,0.12)]",
        text: "text-red-200",
        avatar: "ring-1 ring-red-300/40 ring-offset-1 ring-offset-black/60",
    },
    void: {
        dot: "bg-amber-300/80",
        ring: "shadow-[0_0_0_4px_rgba(251,191,36,0.12)]",
        text: "text-amber-200",
        avatar: "ring-1 ring-amber-300/40 ring-offset-1 ring-offset-black/60",
    },
    not_found: {
        dot: "bg-amber-300/80",
        ring: "shadow-[0_0_0_4px_rgba(251,191,36,0.12)]",
        text: "text-amber-200",
        avatar: "ring-1 ring-amber-300/40 ring-offset-1 ring-offset-black/60",
    },
    pending: {
        dot: "bg-gray-300/80",
        ring: "shadow-[0_0_0_4px_rgba(148,163,184,0.12)]",
        text: "text-gray-200",
        avatar: "ring-1 ring-slate-400/35 ring-offset-1 ring-offset-black/60",
    },
} as const;

const SlipShareModal = ({ open, onClose, slip, picks, members }: SlipShareModalProps) => {
    const { setToast } = useToast();
    const [imageSaving, setImageSaving] = useState(false);
    const sectionRef = useRef<HTMLElement | null>(null);

    const picksWithMembers = useMemo(() => {
        const memberLookup = new Map(members.map((member) => [member.user_id, member]));
        const list = picks
            .map((pick) => {
                const member = memberLookup.get(pick.user_id);
                if (!member) return null;
                return { pick, member };
            })
            .filter(
                (
                    entry
                ): entry is {
                    pick: Pick;
                    member: Member;
                } => Boolean(entry)
            );
        list.sort((a, b) => {
            const aName = a.member.profiles?.username ?? "";
            const bName = b.member.profiles?.username ?? "";
            const nameCompare = aName.localeCompare(bName, undefined, { sensitivity: "base" });
            if (nameCompare !== 0) return nameCompare;
            return a.pick.description.localeCompare(b.pick.description, undefined, {
                sensitivity: "base",
            });
        });
        return list;
    }, [members, picks]);

    const groupComboOddsSummary = useMemo(
        () => getLeagueComboOddsSummary(slip, picks),
        [slip, picks]
    );
    if (!open) return null;

    const deadlineInline = slip?.pick_deadline_at ? formatDateTime(slip.pick_deadline_at) : "TBD";
    const leagueLabel =
        slip?.sports && slip.sports.length > 0 ? slip.sports.join(", ") : "multi-sport";

    const handleSaveImage = async () => {
        if (!sectionRef.current) return;
        setImageSaving(true);
        try {
            const dataUrl = await toJpeg(sectionRef.current, {
                cacheBust: true,
                pixelRatio: 2,
                backgroundColor: "transparent",
            });

            const link = document.createElement("a");
            link.download = `${slip.name || "slip"}-picks.jpeg`;
            link.href = dataUrl;
            link.click();
        } catch (err) {
            setToast({
                id: Date.now(),
                type: "info",
                message: "Failed to generate image",
                duration: 3000
            })
        } finally {
            setImageSaving(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto custom-scrollbar rounded-3xl border border-white/10 bg-black p-5 shadow-2xl"
                onClick={(event) => event.stopPropagation()}
            >
                <section
                    ref={sectionRef}
                    style={deepJaggedStyle}
                    className="relative overflow-hidden rounded-[28px] bg-gradient-to-b from-slate-950/85 via-slate-900/60 to-blue-300/30 p-[1.5px] shadow-lg"
                >
                    <div
                        style={{ clipPath: JAGGED_CLIP_PATH }}
                        className="relative overflow-hidden rounded-[26px] bg-slate-950/45"
                    >
                        <div
                            aria-hidden
                            className="absolute inset-0 bg-gradient-to-b from-slate-900/85 via-slate-950/60 to-slate-800/35"
                        />
                        <div
                            aria-hidden
                            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.16),transparent_60%),radial-gradient(circle_at_bottom,rgba(15,23,42,0.65),transparent_65%)]"
                        />
                        <div className="relative z-10 space-y-6 p-5 pb-24 sm:p-6 sm:pb-28">
                            <header className="space-y-2 border-b border-white/10 pb-4">
                                <h1 className="truncate text-2xl font-semibold text-white sm:text-3xl">
                                    {slip.name}
                                </h1>
                                <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-wide text-gray-400">
                                    <span>
                                        Leagues: <span className="text-white">{leagueLabel}</span>
                                    </span>
                                    <span className="text-gray-600">•</span>
                                    <span>
                                        Pick deadline: <span className="text-white">{deadlineInline}</span>
                                    </span>
                                </div>
                            </header>

                            {picksWithMembers.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-4 py-3 text-xs text-gray-400">
                                    No picks were submitted for this slip.
                                </div>
                            ) : (
                                <ul className="space-y-3 pb-3">
                                    {picksWithMembers.map(({ pick, member }) => {
                                        const displayName = member.profiles?.username ?? "Member";
                                        // const initials = getMemberInitials(displayName);
                                        const displayPick = pick.description ?? "No pick was submitted";
                                        const oddsCopy = pick.odds_bracket ?? PLACEHOLDER;
                                        const sourceTabLabel = (
                                            pick.source_tab ??
                                            (pick.is_combo || pick.legs?.length ? "Combo" : "Pick")
                                        ).toLowerCase();
                                        const profileImg = generateProfileImageUrl(member?.profiles?.profile_image);
                                        const gameTimeCopy = formatDateTime(pick.match_date);
                                        const showGameTime = gameTimeCopy !== PLACEHOLDER;
                                        const resolvedResult = pick.result ?? "pending";
                                        const resultLabel =
                                            resolvedResult === "not_found" ? "n/a" : resolvedResult;
                                        const accent = PICK_RESULT_ACCENTS[resolvedResult];

                                        return (
                                            <li key={pick.id} className="relative pl-5" >
                                                <span className={`absolute left-0 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full ${resolvedResult === "win" ? "bg-emerald-400" : resolvedResult === "loss" ? "bg-red-400" : resolvedResult === "not_found" ? "bg-amber-400" : "bg-cyan-300/80"}`} />
                                                <div className="flex items-center gap-4 md:gap-5">
                                                    <div className="flex flex-col items-center gap-1.5">
                                                        <div
                                                            className={`mt-1 flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-slate-800 text-xs font-semibold uppercase text-slate-100 ${accent.avatar}`}
                                                        >
                                                            {profileImg ? (
                                                                <Image
                                                                    src={profileImg}
                                                                    alt="Profile image"
                                                                    width={56}
                                                                    height={56}
                                                                    className={`tracking-wide rounded-full object-cover h-8 w-8`}
                                                                    draggable={false}
                                                                    onDragStart={(e) => e.preventDefault()}
                                                                    unoptimized
                                                                />
                                                            ) : (
                                                                <UserIcon className="h-6 w-6 text-white/80 sm:h-6 sm:w-6" />
                                                            )}
                                                        </div>
                                                        <span
                                                            className={`text-[8px] font-semibold uppercase tracking-wide md:text-[10px] ${accent.text}`}
                                                        >
                                                            {resultLabel}
                                                        </span>
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex min-h-0 w-full flex-1 flex-col justify-between gap-1 md:gap-2">
                                                            <div className="flex items-start justify-between gap-2 pr-1 md:gap-2 md:pr-4">
                                                                <div className="min-w-0 flex-1">
                                                                    <span className="block text-[9px] font-semibold uppercase tracking-wide text-slate-400 md:text-[10px]">
                                                                        {displayName}
                                                                    </span>
                                                                    <span className="block text-[8px] font-semibold uppercase tracking-wide text-slate-500 md:text-[9px]">
                                                                        {sourceTabLabel}
                                                                    </span>
                                                                    <p
                                                                        className={`min-w-0 whitespace-normal break-words text-[11px] font-semibold leading-snug md:text-base ${accent.text}`}
                                                                        title={displayPick}
                                                                    >
                                                                        {displayPick}
                                                                    </p>
                                                                </div>
                                                                <div className="flex shrink-0 flex-col items-end text-right">
                                                                    {showGameTime ? (
                                                                        <span className="block text-[8px] text-slate-300 md:text-[10px]">
                                                                            {gameTimeCopy}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="block text-[8px] text-transparent md:text-[10px]">
                                                                            {PLACEHOLDER}
                                                                        </span>
                                                                    )}
                                                                    <span className={`flex mt-1 text-[11px] font-bold md:mt-1.5 md:text-sm ${accent.text}`}>
                                                                        {oddsCopy}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}

                            {groupComboOddsSummary && (
                                <div className="flex justify-end pt-1">
                                    <p className="text-right text-[10px] font-semibold uppercase tracking-wide text-gray-400 md:text-[11px]">
                                        <span>
                                            League Combo+ odds:
                                        </span>
                                        <span className="ml-2 text-sm font-bold text-cyan-100 md:text-base">
                                            {groupComboOddsSummary.label}
                                        </span>
                                    </p>
                                </div>
                            )}

                            <div className="pt-8">
                                <div className="flex items-center gap-3">
                                    <div className="h-px flex-1 bg-white/10" />
                                    <Image
                                        src="/gotlockstext.svg"
                                        alt=""
                                        aria-hidden="true"
                                        width={120}
                                        height={18}
                                        className="h-3 w-auto object-contain opacity-75 md:h-4"
                                    />
                                    <div className="h-px flex-1 bg-white/10" />
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <div className="mt-5 flex justify-end gap-3">
                    <button
                        type="button"
                        className={`ui-accent-button rounded-2xl px-5 py-2 text-xs font-semibold uppercase tracking-wide transition ${imageSaving ? "cursor-not-allowed opacity-60 pointer-events-none" : "cursor-pointer"}`}
                        onClick={handleSaveImage}
                        disabled={imageSaving}
                    >
                        Save image and share
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-2xl border border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-300 transition hover:border-white/30 hover:text-white"
                        aria-label="Close share modal"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div >
    );
};

export default SlipShareModal;
