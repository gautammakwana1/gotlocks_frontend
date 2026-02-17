// "use client";

// import { Group, GroupSelector, Leaderboard, Members, Pick, Picks, Slip, Slips } from "@/lib/interfaces/interfaces";
// import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
// import type { CSSProperties } from "react";
// import { useSelector } from "react-redux";
// import Image from "next/image";
// import FootballAnimation from "../animations/FootballAnimation";

// type Props = {
//   group: Group | null;
//   slips: Slips;
//   users: Members;
//   leaderboard: Leaderboard[];
//   picks: Picks;
// };

// const PICK_COL_WIDTH = 260;
// const RESULT_COL_WIDTH = 120;
// const ODDS_COL_WIDTH = 130;

// const pickClampStyles: CSSProperties = {
//   display: "-webkit-box",
//   WebkitLineClamp: 2,
//   WebkitBoxOrient: "vertical",
//   overflow: "hidden",
// };

// const getBandClass = (slip: Slip): string =>
//   slip.index % 2 === 1 ? "bg-emerald-500/5" : "bg-white/5";

// const useIsMobile = () => {
//   const [isMobile, setIsMobile] = useState(false);

//   useEffect(() => {
//     const mql = window.matchMedia("(max-width: 639px)");
//     const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);

//     setIsMobile(mql.matches);
//     mql.addEventListener("change", onChange);

//     return () => mql.removeEventListener("change", onChange);
//   }, []);

//   return isMobile;
// };

// type ResultBadgeTone =
//   | "text-emerald-300"
//   | "text-red-400"
//   | "text-gray-400"
//   | "text-gray-500";

// type ResultBadge = {
//   label: string;
//   tone: ResultBadgeTone;
// };

// const resultLabel = (pick?: Pick, slip?: Slip): ResultBadge => {
//   if (slip?.status === "voided") {
//     return { label: "voided", tone: "text-gray-400" };
//   }

//   if (!pick) {
//     return { label: "—", tone: "text-gray-500" };
//   }

//   switch (pick.result) {
//     case "win":
//       return { label: "✓", tone: "text-emerald-300" };
//     case "loss":
//       return { label: "✕", tone: "text-red-400" };
//     case "void":
//       return { label: "voided", tone: "text-gray-400" };
//     default:
//       return { label: "—", tone: "text-gray-500" };
//   }
// };

// export const LeaderboardTab = ({
//   slips,
//   leaderboard
// }: Props) => {
//   const isMobile = useIsMobile();
//   const scrollerRef = useRef<HTMLDivElement>(null);
//   const [containerWidth, setContainerWidth] = useState<number>(() =>
//     typeof window !== "undefined" ? window.innerWidth : 360
//   );

//   // Keep the latest slip fully on-screen by sizing it to the measured scroller width
//   // minus the sticky columns (falls back to viewport width during SSR).

//   const MEMBER_W = isMobile ? 60 : 220;   // ---------------->
//   const TOTAL_W = isMobile ? 54 : 90;
//   const ROW_H = isMobile ? 52 : 72;
//   const HEADER_H = isMobile ? 40 : 56;
//   const effectiveWidth = containerWidth || (typeof window !== "undefined" ? window.innerWidth : 360);
//   const mobileSlipWidth = Math.max(effectiveWidth - (MEMBER_W + TOTAL_W) - 4, 0);
//   const SLIP_TEMPLATE = isMobile
//     ? "0.6fr 0.5fr 0.7fr"
//     : `${PICK_COL_WIDTH}px ${RESULT_COL_WIDTH}px ${ODDS_COL_WIDTH}px`;

//   const SLIP_MIN_W = isMobile
//     ? `${mobileSlipWidth}px`
//     : `${PICK_COL_WIDTH + RESULT_COL_WIDTH + ODDS_COL_WIDTH}px`;

//   const orderedSlips = useMemo(
//     () =>
//       [...slips]
//         .filter((slip) => !slip.archived)
//         .sort((a, b) => b.index - a.index),
//     [slips]
//   );

//   const { loadingLeaderboard } = useSelector((state: GroupSelector) => state.group);

//   useEffect(() => {
//     scrollerRef.current?.scrollTo({ left: 0, behavior: "auto" });
//   }, []);

//   useLayoutEffect(() => {
//     const node = scrollerRef.current;
//     if (!node) return;

//     const updateWidth = () => {
//       setContainerWidth(node.clientWidth);
//     };

//     updateWidth();
//     const observer =
//       typeof ResizeObserver !== "undefined"
//         ? new ResizeObserver(() => updateWidth())
//         : null;

//     window.addEventListener("resize", updateWidth);
//     observer?.observe(node);

//     return () => {
//       window.removeEventListener("resize", updateWidth);
//       observer?.disconnect();
//     };
//   }, []);

//   if (loadingLeaderboard) {
//     return (
//       <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
//         <div className="w-48 max-w-[70vw] sm:w-60">
//           <FootballAnimation />
//         </div>
//       </div>
//     )
//   }

//   return (
//     <div
//       ref={scrollerRef}
//       className="overflow-x-auto overscroll-x-contain rounded-3xl border border-white/10 bg-black/60"
//     >
//       <div className="min-w-max text-xs md:text-sm text-white">
//         <div className="flex">
//           <div
//             className="sticky left-0 z-40 border-r border-white/10 bg-black"
//             style={{ width: MEMBER_W }}
//           >
//             <div
//               className="sticky top-0 z-50 flex items-center border-b border-white/10 bg-black px-2 md:px-4 text-[10px] md:text-xs uppercase tracking-wide text-gray-400"
//               style={{ height: HEADER_H }}
//             >
//               Member
//             </div>
//             {leaderboard.map(({ username, user_id, profile_image }) => {
//               const displayName = username ?? "Member";
//               const initials = displayName.slice(0, 2).toUpperCase();
//               const profileImg = profile_image ? `${process.env.NEXT_PUBLIC_SUPABASE_S3_URL}/${profile_image}` : "";
//               return (
//                 <div
//                   key={user_id}
//                   className="flex items-center gap-2 md:gap-3 border-b border-white/10 px-2 md:px-4"
//                   style={{ height: ROW_H }}
//                 >
//                   <span className="flex h-7 w-7 md:h-9 md:w-9 items-center justify-center rounded-full bg-emerald-500/20 text-[11px] md:text-sm font-semibold text-emerald-200">
//                     {profileImg ? (
//                       <Image
//                         src={profileImg}
//                         alt="Profile image"
//                         width={56}
//                         height={56}
//                         className="h-7 w-7 rounded-full object-cover"
//                         unoptimized
//                       />
//                     ) : (
//                       <span>
//                         {initials}
//                       </span>
//                     )}
//                     {/* {initials} */}
//                   </span>
//                   {/* ------------------> */}
//                   {!isMobile && (
//                     <span className="truncate text-xs md:text-sm font-semibold text-white">
//                       {displayName}
//                     </span>
//                   )}
//                 </div>
//               );
//             })}
//           </div>

//           <div
//             className="sticky z-40 border-r border-white/10 bg-black"
//             style={{ width: TOTAL_W, left: MEMBER_W }}
//           >
//             <div
//               className="sticky top-0 z-50 flex items-center border-b border-white/10 bg-black px-2 md:px-4 text-[10px] md:text-xs uppercase tracking-wide text-gray-400"
//               style={{ height: HEADER_H }}
//             >
//               Total
//             </div>
//             {leaderboard.map(({ user_id, cumulative_points }) => (
//               <div
//                 key={`${user_id}-cumulative`}
//                 className="flex items-center border-b border-white/10 px-2 md:px-4 text-xs md:text-sm font-semibold text-white"
//                 style={{ height: ROW_H }}
//               >
//                 {cumulative_points}
//               </div>
//             ))}
//           </div>

//           <div className="relative z-10 flex-1 min-w-0">
//             <div className="flex">
//               {orderedSlips.map((slip) => {
//                 const band = getBandClass(slip);
//                 const headerText =
//                   slip.status === "voided"
//                     ? `${slip.name} (Voided)`
//                     : slip.name;

//                 if (slip.status === "open" || slip.status === "locked") return;

//                 return (
//                   <div
//                     key={slip.id}
//                     className={`relative border-r border-white/10 ${band}`}
//                     style={{
//                       minWidth: SLIP_MIN_W,
//                     }}
//                   >
//                     <div
//                       className="sticky top-0 z-30 grid border-b border-white/10 bg-black/85 uppercase tracking-wide text-gray-400"
//                       style={{
//                         height: HEADER_H,
//                         gridTemplateColumns: SLIP_TEMPLATE,
//                       }}
//                     >
//                       <div className="flex items-center px-1.5 md:px-4 leading-tight" title={headerText}>
//                         <span className="whitespace-pre-line text-[10px] md:text-xs">{`${slip.name}\nPicks`}</span>
//                       </div>
//                       <div className="flex items-center px-1.5 md:px-4 text-[10px] md:text-xs">Result</div>
//                       <div className="flex items-center px-1.5 md:px-4 text-[10px] md:text-xs">Odds</div>
//                     </div>
//                     {leaderboard.map(({ user_id, slips }) => (
//                       slips?.map((slipData) => {
//                         const { odds_bracket, pick_description, pick_result, slip_id, slip_points, bonus_points } = slipData;
//                         if (slip.id !== slip_id) return;

//                         const pick = {
//                           result: pick_result,
//                           id: slip_id,
//                           slip_id: slip_id,
//                           user_id: user_id,
//                           description: pick_description,
//                           odds_bracket: odds_bracket,
//                           points: slip_points
//                         }

//                         const displayPick =
//                           slip.status === "voided"
//                             ? "Voided"
//                             : pick_description ?? "—";

//                         const displayOdds =
//                           slip.status === "voided"
//                             ? "—"
//                             : odds_bracket ?? "—";

//                         const badge = resultLabel(pick, slip);
//                         const calculatedSlipPoints = (slip_points ?? 0) + (bonus_points ?? 0);

//                         return (
//                           <div
//                             key={`${user_id}-${slip_id}`}
//                             className="grid border-b border-white/10"
//                             style={{
//                               gridTemplateColumns: SLIP_TEMPLATE,
//                               height: ROW_H,
//                             }}
//                           >
//                             <div className="flex h-full items-center px-1.5 md:px-4">
//                               <span
//                                 className="text-xs md:text-sm leading-tight md:leading-snug text-gray-200"
//                                 style={pickClampStyles}
//                                 title={displayPick}
//                               >
//                                 {displayPick}
//                               </span>
//                             </div>

//                             <div className="flex h-full items-center px-1.5 md:px-4">
//                               {(() => {
//                                 if (!pick && slip?.status !== "voided") {
//                                   return (
//                                     <span className="text-[10px] md:text-xs text-gray-500">—</span>
//                                   );
//                                 }

//                                 if (badge.label === "voided") {
//                                   return (
//                                     <span className="text-[10px] md:text-xs lowercase text-gray-400">voided</span>
//                                   );
//                                 }

//                                 if (pick && pick_result !== "void") {
//                                   return (
//                                     <span
//                                       className={`inline-flex items-center rounded-full border border-white/15 bg-white/5 px-1.5 py-0.5 text-[10px] md:px-2 md:py-1 md:text-xs font-medium ${badge.tone}`}
//                                     >
//                                       <span className="mr-1 text-[10px] md:text-[11px]">{badge.label}</span>
//                                       <span>
//                                         {calculatedSlipPoints > 0
//                                           ? `+${calculatedSlipPoints}`
//                                           : calculatedSlipPoints}
//                                       </span>
//                                     </span>
//                                   );
//                                 }

//                                 return (
//                                   <span className="text-[10px] md:text-xs text-gray-500">—</span>
//                                 );
//                               })()}
//                             </div>

//                             <div
//                               className="flex h-full items-center px-1.5 md:px-4 text-[11px] md:text-xs text-gray-300 truncate"
//                               title={displayOdds}
//                             >
//                               {displayOdds}
//                             </div>
//                           </div>
//                         );
//                       })
//                     ))}
//                   </div>
//                 );
//               })}
//             </div>
//           </div>
//         </div>
//       </div>
//     </div >
//   );
// };

// export default LeaderboardTab;

// // Cleanup (pre-push):
// // - Unified slip grid constants + clamp styling for row alignment
// // - Ensured result pill honors voided slips and slip-point display
// // - Added helper typings to avoid future React/TS warnings
