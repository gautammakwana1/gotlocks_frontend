"use client";

import { CSSProperties, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import BackButton from "@/components/ui/BackButton";
import { GroupDataShape } from "../../../page";
import { Group, GroupSelector, Pick, Picks, PickSelector, Slip, Slips, SlipSelector } from "@/lib/interfaces/interfaces";
import { useDispatch, useSelector } from "react-redux";
import { fetchAllPicksRequest } from "@/lib/redux/slices/pickSlice";
import { clearUpdateSlipsMessage, deleteSlipRequest, fetchAllSlipsRequest } from "@/lib/redux/slices/slipSlice";
import { useToast } from "@/lib/state/ToastContext";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { fetchGroupByIdRequest } from "@/lib/redux/slices/groupsSlice";
import { JAGGED_CLIP_PATH } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils/date";
import Image from "next/image";
import { isSlipFinal } from "@/lib/slips/state";
import SlipShareModal from "@/components/slips/SlipShareModal";

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

const normalizeResult = (result: string | null | undefined) =>
    (result ?? "pending") as keyof typeof PICK_RESULT_ACCENTS;

type SlipResultsTab = "group" | "actions";

const getMemberInitials = (name?: string | null) => {
    if (!name) return "??";
    const parts = name.trim().split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] ?? "";
    const second =
        parts.length > 1 ? parts[parts.length - 1][0] : parts[0]?.[1] ?? "";
    return `${first}${second}`.toUpperCase() || "??";
};

const deepJaggedStyle: CSSProperties = {
    clipPath: JAGGED_CLIP_PATH,
    "--jagged-valley": "34px",
    "--jagged-tip": "0px",
} as CSSProperties;

const RESULTS_TABS: Array<{ id: SlipResultsTab; label: string }> = [
    { id: "group", label: "finalized group slips" },
    { id: "actions", label: "slip actions" },
];

const EM_DASH = "\u2014";
const DASH_SEPARATOR = ` ${EM_DASH} `;
const PLACEHOLDER = EM_DASH;

const extractMatchup = (description?: string | null) => {
    if (!description) return null;
    const [lead] = description.split(DASH_SEPARATOR);
    const candidate = lead?.trim();
    if (candidate && /@|\bvs\.?\b|\bv\.?\b/i.test(candidate)) {
        return candidate;
    }
    const match = description.match(
        new RegExp(`([^${EM_DASH}]*?(@|\\bvs\\.?\\b|\\bv\\.?\\b)[^${EM_DASH}]*)`, "i")
    );
    return match ? match[1].trim() : null;
};

const preventOrphanWord = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return value;
    const parts = trimmed.split(/\s+/);
    if (parts.length < 3) return value;
    const last = parts.pop();
    const penultimate = parts.pop();
    if (!last || !penultimate) return value;
    return `${parts.join(" ")} ${penultimate}\u00A0${last}`.trim();
};


const hasNestedGroup = (
    value: GroupDataShape
): value is { group?: Group | null } => {
    return Boolean(value && typeof value === "object" && "group" in value);
};

const extractGroup = (data: GroupDataShape): Group | null => {
    if (!data) {
        return null;
    }

    if (hasNestedGroup(data)) {
        return data.group ?? null;
    }

    return data;
};

const SlipResultsPage = () => {
    const params = useParams<{ groupId: string; slipId: string }>();
    const router = useRouter();
    const { setToast } = useToast();
    const dispatch = useDispatch();
    const searchParams = useSearchParams();
    const currentUser = useCurrentUser();

    const [activeTab, setActiveTab] = useState<SlipResultsTab>("group");
    const [isDeleteSlipOpen, setIsDeleteSlipOpen] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const rawGroup = useSelector((state: GroupSelector) => state.group.group);
    const group = useMemo(() => extractGroup(rawGroup as GroupDataShape), [rawGroup]);
    const { slip: slipState, loading: slipLoader, message: slipMessage } = useSelector((state: SlipSelector) => state.slip);
    const { pick: pickState } = useSelector((state: PickSelector) => state.pick);
    const slipData = slipState as { slips?: Slips } | null;
    const pickData = pickState as { picks?: Picks } | null;

    const slips: Slips = useMemo(() => {
        if (!group?.id || !slipData?.slips?.length) return [];

        return slipData?.slips;
    }, [slipData, group?.id]);

    const activeSlip = useMemo<Slip | null>(() => {
        if (!Array.isArray(slips) || !params?.slipId) return null;
        return slips.find(slip => slip.id === params.slipId) ?? null;
    }, [slips, params?.slipId]);

    useEffect(() => {
        if (!params.slipId) return;
        dispatch(fetchAllPicksRequest({ slip_id: params.slipId }));
        if (params.groupId) {
            dispatch(fetchGroupByIdRequest({ groupId: params.groupId }))
            dispatch(fetchAllSlipsRequest({ group_id: params.groupId }));
        }
    }, [dispatch, params.slipId, params.groupId]);

    useEffect(() => {
        if (!slipLoader && slipMessage) {
            setToast({
                id: Date.now(),
                type: "success",
                message: slipMessage,
                duration: 3000,
            })
            dispatch(clearUpdateSlipsMessage())
        }
    }, [setToast, slipLoader, slipMessage, dispatch, params.groupId]);

    // useEffect(() => {
    //     if (currentUser && (!group || !activeSlip)) {
    //         router.replace("/home");
    //     }
    // }, [group, router, activeSlip, currentUser]);

    // const members = useMemo(() => group?.members ?? [], [group?.members]);

    const members = useMemo(() => {
        const list = (group?.members ?? [])
            .filter((user): user is NonNullable<typeof user> => Boolean(user));
        return [...list].sort((a, b) => {
            const aName = a.profiles?.username ?? "";
            const bName = b.profiles?.username ?? "";
            return aName.localeCompare(bName, undefined, { sensitivity: "base" });
        });
    }, [group?.members]);

    const slipPicks = useMemo<Pick[]>(() => {
        if (!pickData) return [];
        if (!Array.isArray(pickData.picks) || !activeSlip?.id) return [];
        return pickData.picks.filter(pick => pick.slip_id === activeSlip?.id);
    }, [pickData, activeSlip?.id]);

    const memberLookup = useMemo(() => {
        const map = new Map<string, (typeof members)[number]>();

        members.forEach((member) => {
            if (!member.user_id) return;
            map.set(member.user_id, member);
        });

        return map;
    }, [members]);

    const picksWithMembers = useMemo(() => {
        const list = slipPicks
            .map((pick) => {
                const member = memberLookup.get(pick.user_id);
                if (!member) return null;
                return { pick, member };
            })
            .filter(
                (
                    entry
                ): entry is {
                    pick: (typeof slipPicks)[number];
                    member: (typeof members)[number];
                } => Boolean(entry)
            );
        list.sort((a, b) => {
            const aName = a.member.profiles?.username ?? "";
            const bName = b.member.profiles?.username ?? "";
            const nameCompare = aName.localeCompare(bName, undefined, {
                sensitivity: "base",
            });
            if (nameCompare !== 0) return nameCompare;
            return a.pick.description.localeCompare(b.pick.description, undefined, {
                sensitivity: "base",
            });
        });
        return list;
    }, [memberLookup, slipPicks]);

    const membersWithoutPicks = useMemo(() => {
        const pickedIds = new Set(
            slipPicks
                .map((pick) => pick.user_id)
                .filter((id): id is string => Boolean(id))
        );

        return members.filter(
            (member) => !member.user_id || !pickedIds.has(member.user_id)
        );
    }, [members, slipPicks]);

    const correctPickCount = useMemo(
        () => slipPicks.filter((pick) => pick.result === "win").length,
        [slipPicks]
    );
    const totalPickCount = slipPicks.length;
    const pickProgressLabel =
        totalPickCount > 0 && correctPickCount === totalPickCount
            ? `${correctPickCount}/${totalPickCount} perfect! 🏆`
            : `${correctPickCount}/${totalPickCount} picks correct`;
    const deadlineInline = activeSlip?.pick_deadline_at ? formatDateTime(activeSlip.pick_deadline_at) : "TBD";
    const leagueLabel =
        activeSlip?.sports &&
            activeSlip?.sports.length > 0
            ? activeSlip.sports.join(", ")
            : "multi-sport";

    const fallbackFromQuery = useMemo(() => {
        const encoded = searchParams.get("returnTo");
        if (!encoded) return null;
        try {
            const decoded = decodeURIComponent(encoded);
            return decoded.startsWith("/") ? decoded : null;
        } catch {
            return null;
        }
    }, [searchParams]);

    if (!group || !activeSlip || !currentUser) {
        return null;
    }

    const isFinalized = isSlipFinal(activeSlip);
    const fallbackPath = fallbackFromQuery ?? `/group/${group.id}?tab=slips${activeSlip.slip_type === "vibe" ? "&mode=vibe" : ""}`;
    const isCommissioner = group.created_by === currentUser.userId;
    const isCreator = activeSlip.created_by === currentUser.userId;
    const canDeleteSlip = isCommissioner || isCreator;
    const slipHeader = (
        <div className="space-y-2">
            <h1 className="truncate text-2xl font-semibold text-white sm:text-3xl">
                {activeSlip.name}
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-wide text-gray-400">
                <span>
                    Leagues: <span className="text-white">{leagueLabel}</span>
                </span>
                <span className="text-gray-600">•</span>
                <span>
                    Pick deadline:{" "}
                    <span className="inline-flex items-center gap-1 whitespace-nowrap">
                        <span className="text-white">{deadlineInline}</span>
                        <span className="text-[10px] text-gray-600">•</span>
                        <button
                            type="button"
                            onClick={() => setIsShareModalOpen(true)}
                            aria-label="Share slip"
                            title="Share slip"
                            className="inline-flex h-4 w-4 items-center justify-center text-gray-400 transition hover:text-white"
                        >
                            <svg
                                viewBox="0 0 24 24"
                                className="h-3 w-3"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.6"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden
                            >
                                <path d="M15 4h5v5" />
                                <path d="M10 14 20 4" />
                                <path d="M20 14v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5" />
                            </svg>
                        </button>
                    </span>
                </span>
            </div>
        </div>
    );

    const handleDeleteSlip = () => {
        const confirmed = window.confirm(
            "Delete this slip and remove all picks tied to it? This cannot be undone."
        );
        if (!confirmed) return;
        if (activeSlip.id) {
            dispatch(deleteSlipRequest({ slip_id: activeSlip.id }));
        }
        router.replace(fallbackPath);
    };

    return (
        <div className="flex flex-col gap-6 pb-12">
            <BackButton fallback={fallbackPath} preferFallback />

            {!isFinalized ? (
                <>
                    <header className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 p-5 shadow-lg">
                        {slipHeader}
                    </header>
                    <div className="rounded-3xl border border-white/10 bg-black/60 p-4 text-sm text-gray-300">
                        This slip is not completed yet. Manage picks and grading on the main slip page.
                    </div>
                </>
            ) : (
                <section
                    style={deepJaggedStyle}
                    className="relative overflow-hidden rounded-[32px] bg-gradient-to-b from-slate-950/85 via-slate-900/60 to-blue-300/30 p-[1.5px] shadow-lg"
                >
                    <div
                        style={{ clipPath: JAGGED_CLIP_PATH }}
                        className="relative overflow-hidden rounded-[30px] bg-slate-950/45"
                    >
                        <div
                            aria-hidden
                            className="absolute inset-0 bg-gradient-to-b from-slate-900/85 via-slate-950/60 to-slate-800/35"
                        />
                        <div
                            aria-hidden
                            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.16),transparent_60%),radial-gradient(circle_at_bottom,rgba(15,23,42,0.65),transparent_65%)]"
                        />
                        <div
                            aria-hidden
                            className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950/70 via-slate-900/40 to-transparent"
                        />
                        <div className="relative z-10 space-y-6 p-5 pb-32 sm:p-6 sm:pb-36">
                            <header className="space-y-4 border-b border-white/10 pb-5">
                                {slipHeader}
                            </header>

                            <div className="flex flex-wrap items-center gap-2 sm:justify-between">
                                <div className="flex flex-nowrap items-center gap-4 sm:gap-6">
                                    {RESULTS_TABS.map((tab) => {
                                        const isActive = activeTab === tab.id;
                                        return (
                                            <button
                                                key={tab.id}
                                                type="button"
                                                onClick={() => setActiveTab(tab.id)}
                                                className={`border-b-2 pb-1 text-[14px] font-semibold uppercase tracking-wide transition sm:text-[14px] ${isActive
                                                    ? "border-white text-white"
                                                    : "border-transparent text-gray-400 hover:border-white/40 hover:text-white"
                                                    }`}
                                            >
                                                {tab.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {activeTab === "group" && (
                                <div className="space-y-4">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div>
                                            <p className="text-xs uppercase tracking-wide text-gray-400">finalized group slips</p>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        {picksWithMembers.length === 0 ? (
                                            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-4 py-3 text-xs text-gray-400">
                                                No picks were submitted for this slip.
                                            </div>
                                        ) : (
                                            <ul className="space-y-3 list-disc pl-5 marker:text-slate-500">
                                                {picksWithMembers.map(({ pick, member }) => {
                                                    const resolvedResult = normalizeResult(pick.result);
                                                    const resultLabel =
                                                        resolvedResult === "not_found" ? "n/a" : resolvedResult;
                                                    const accent = PICK_RESULT_ACCENTS[resolvedResult];
                                                    const displayName =
                                                        member.profiles?.username ?? "Member";
                                                    const profileImg = member.profiles?.profile_image ? `${process.env.NEXT_PUBLIC_SUPABASE_S3_URL}/${member.profiles?.profile_image}` : "";
                                                    const initials = getMemberInitials(displayName);
                                                    const displayPick = pick.description ?? "No pick was submitted";
                                                    const [matchupSegment, ...lineSegments] = displayPick.split(
                                                        DASH_SEPARATOR
                                                    );
                                                    const matchupCandidate = pick.matchup;
                                                    const pickLine =
                                                        matchupCandidate && lineSegments.length > 0
                                                            ? lineSegments.join(DASH_SEPARATOR)
                                                            : displayPick;
                                                    const pickLineDisplay = preventOrphanWord(pickLine);
                                                    const oddsCopy = pick.odds_bracket ?? PLACEHOLDER;
                                                    const legsCount = pick.legs?.length ?? 0;
                                                    const legsCopy =
                                                        legsCount > 0
                                                            ? `${legsCount} legs`
                                                            : pick.is_combo
                                                                ? "combo"
                                                                : null;
                                                    const matchupCopy =
                                                        matchupCandidate ?? extractMatchup(displayPick) ?? PLACEHOLDER;
                                                    const gameTimeCopy = formatDateTime(pick.match_date);
                                                    const showMatchup = matchupCopy !== PLACEHOLDER;
                                                    const showGameTime = gameTimeCopy !== PLACEHOLDER;
                                                    const sourceTabLabel = (
                                                        pick.source_tab ??
                                                        (pick.is_combo || pick.legs?.length ? "Combo" : "Pick")
                                                    ).toLowerCase();

                                                    return (
                                                        <li key={pick.id}>
                                                            <div className="flex items-start gap-4 md:gap-5">
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
                                                                            <span>{initials}</span>
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
                                                                                <span className="block text-[8px] font-semibold uppercase tracking-wide text-slate-400 md:text-[10px]">
                                                                                    {sourceTabLabel}
                                                                                </span>
                                                                                <p
                                                                                    className="mt-1 min-w-0 whitespace-normal break-words text-[11px] font-semibold leading-snug text-cyan-200 drop-shadow-[0_1px_8px_rgba(30,58,138,0.75)] md:text-base"
                                                                                    title={displayPick}
                                                                                >
                                                                                    {pickLineDisplay}
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
                                                                                <span
                                                                                    className={`mt-1 text-[11px] font-bold md:mt-1.5 md:text-sm ${accent.text}`}
                                                                                >
                                                                                    {oddsCopy}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                        <div className="text-[10px] md:text-xs">
                                                                            {showMatchup ? (
                                                                                <span className="block truncate text-[8px] text-slate-200 md:text-[10px]">
                                                                                    {matchupCopy}
                                                                                </span>
                                                                            ) : (
                                                                                <span className="block text-[8px] text-slate-500 md:text-[10px]">
                                                                                    {PLACEHOLDER}
                                                                                </span>
                                                                            )}
                                                                            {legsCopy && (
                                                                                <span className="mt-1 block text-[8px] font-semibold uppercase tracking-wide text-slate-500 md:text-[10px]">
                                                                                    {legsCopy}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        )}

                                        {membersWithoutPicks.length > 0 && picksWithMembers.length > 0 && (
                                            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-4 py-3 text-xs text-gray-400">
                                                <p className="text-[11px] uppercase tracking-wide text-gray-500">
                                                    No picks submitted
                                                </p>
                                                <div className="mt-2 flex flex-wrap gap-2">
                                                    {membersWithoutPicks.map((member) => {
                                                        const displayName =
                                                            member.profiles?.username ?? "Member";
                                                        return (
                                                            <span
                                                                key={member.id}
                                                                className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-wide text-gray-300"
                                                            >
                                                                {displayName}
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeTab === "actions" && (
                                <div className="space-y-5">
                                    {!canDeleteSlip && (
                                        <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-gray-400">
                                            <p className="font-semibold uppercase tracking-wide text-gray-300">
                                                Slip basics
                                            </p>
                                            <p>Only the creator or commissioner can delete this slip.</p>
                                        </div>
                                    )}

                                    {canDeleteSlip && (
                                        <section className="pt-2">
                                            <button
                                                type="button"
                                                onClick={() => setIsDeleteSlipOpen((prev) => !prev)}
                                                aria-expanded={isDeleteSlipOpen}
                                                aria-controls="delete-slip-content"
                                                className="flex w-full items-start justify-between gap-4 text-left"
                                            >
                                                <div className="space-y-1">
                                                    <p className="text-sm uppercase tracking-wide text-red-300">Delete slip</p>
                                                </div>
                                                <span className="text-red-200">{isDeleteSlipOpen ? "▴" : "▾"}</span>
                                            </button>
                                            {isDeleteSlipOpen && (
                                                <div id="delete-slip-content" className="mt-4 space-y-3">
                                                    <p className="text-xs text-red-100">
                                                        delete this slip and remove all picks tied to it.
                                                    </p>
                                                    <p className="text-xs text-red-200">
                                                        This cannot be undone. Members will lose access to the slip, their
                                                        picks, and any leaderboard impact from this card.
                                                    </p>
                                                    <div className="flex justify-end">
                                                        <button
                                                            type="button"
                                                            onClick={handleDeleteSlip}
                                                            className="rounded-2xl border border-red-500/30 bg-gradient-to-br from-red-900/70 via-red-700/40 to-black/40 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-white transition hover:border-red-400/40 hover:from-red-800/80 hover:via-red-600/50"
                                                        >
                                                            Delete slip
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </section>
                                    )}
                                </div>
                            )}
                        </div>
                        {activeTab === "group" && (
                            <div className="absolute inset-x-0 bottom-8 z-10 px-5 pt-7 pb-9 sm:px-6 sm:pb-10">
                                <div className="flex items-center justify-end">
                                    <span className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-200/40 bg-gradient-to-r from-cyan-500/25 via-sky-500/15 to-indigo-500/25 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-cyan-100 md:px-5 md:py-2 md:text-xs">
                                        {pickProgressLabel}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </section>
            )}

            {canDeleteSlip && !isFinalized && (
                <section className="space-y-3 rounded-3xl border border-red-500/30 bg-red-500/5 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-red-300">
                                Danger zone
                            </p>
                            <p className="text-sm text-red-100">
                                Delete this slip and remove all attached picks.
                            </p>
                        </div>
                        <span className="rounded-full border border-red-400/60 px-3 py-1 text-[11px] uppercase tracking-wide text-red-100">
                            Creator &amp; commissioner only
                        </span>
                    </div>
                    <p className="text-xs text-red-200">
                        This action is permanent. Members will lose access to this slip and its history.
                    </p>
                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={handleDeleteSlip}
                            className="rounded-2xl bg-red-600/80 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-red-600"
                        >
                            Delete slip
                        </button>
                    </div>
                </section>
            )}

            <SlipShareModal
                open={isShareModalOpen}
                onClose={() => setIsShareModalOpen(false)}
                slip={activeSlip}
                picks={slipPicks}
                members={members}
            />
        </div>
    );
};

export default SlipResultsPage;
