// "use client";

// import { LeaderboardArchive } from "@/lib/interfaces/interfaces";
// import Image from "next/image";
// import type { CSSProperties } from "react";

// type Props = {
//     archive: LeaderboardArchive;
// };

// const columnTemplate =
//     "60px minmax(170px, 1.6fr) repeat(3, 80px) 120px minmax(220px, 2fr)";

// const clampStyles: CSSProperties = {
//     display: "-webkit-box",
//     WebkitBoxOrient: "vertical",
//     WebkitLineClamp: 2,
//     overflow: "hidden",
// };

// const formatInitials = (name: string): string => {
//     const [first, second] = name
//         .split(/\s+/)
//         .filter(Boolean)
//         .slice(0, 2);
//     if (!first) return "GL";
//     const secondInitial = second ? second[0] : "";
//     return `${first[0] ?? ""}${secondInitial}`.toUpperCase();
// };

// const formatPoints = (points: number): string =>
//     points > 0 ? `+${points}` : points.toString();

// const ArchivedLeaderboard = ({ archive }: Props) => {
//     if (archive.rows.length === 0) {
//         return (
//             <div className="rounded-2xl border border-white/10 bg-black/60 p-6 text-sm text-gray-400">
//                 No entries were captured in this snapshot.
//             </div>
//         );
//     }

//     return (
//         <div className="w-full overflow-x-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
//             <div className="min-w-[720px] rounded-2xl border border-white/10 bg-black/70">
//                 <div
//                     className="grid h-12 items-center border-b border-white/10 text-[11px] font-semibold uppercase tracking-wide text-gray-400"
//                     style={{ gridTemplateColumns: columnTemplate }}
//                 >
//                     <div className="px-3">Rank</div>
//                     <div className="px-3">Member</div>
//                     <div className="px-3 text-center">W</div>
//                     <div className="px-3 text-center">L</div>
//                     <div className="px-3 text-center">Void</div>
//                     <div className="px-3 text-center">Total</div>
//                     <div className="px-3">Top Pick Snapshot</div>
//                 </div>

//                 {archive.rows.map((row, index) => {
//                     const profileImg = row.profile_image ? `${process.env.NEXT_PUBLIC_SUPABASE_S3_URL}/${row.profile_image}` : "";
//                     return (
//                         <div
//                             key={row.userId}
//                             className={`grid h-14 items-center border-b border-white/10 text-sm last:border-b-0 ${index % 2 === 0 ? "bg-white/5" : "bg-transparent"
//                                 }`}
//                             style={{ gridTemplateColumns: columnTemplate }}
//                         >
//                             <div className="px-3 text-center text-gray-300">{row.rank}</div>
//                             <div className="flex h-full items-center gap-3 px-3">
//                                 <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-semibold text-emerald-200">
//                                     {profileImg ? (
//                                         <Image
//                                             src={profileImg}
//                                             alt="Profile image"
//                                             width={56}
//                                             height={56}
//                                             className="h-7 w-7 rounded-full object-cover"
//                                             unoptimized
//                                         />
//                                     ) : (
//                                         <span>
//                                             {formatInitials(row.username)}
//                                         </span>
//                                     )}
//                                 </span>
//                                 <span className="truncate font-medium text-white">{row.username}</span>
//                             </div>
//                             <div className="px-3 text-center text-emerald-200">{row.wins}</div>
//                             <div className="px-3 text-center text-red-400">{row.losses}</div>
//                             <div className="px-3 text-center text-gray-400">{row.voids}</div>
//                             <div className="px-3 text-center font-semibold text-white">
//                                 {row.totalPoints}
//                             </div>
//                             <div className="flex h-full flex-col justify-center gap-1 px-3">
//                                 <div
//                                     className="text-xs font-medium text-gray-200"
//                                     style={clampStyles}
//                                     title={row.topPickLabel}
//                                 >
//                                     {row.topPickLabel}
//                                 </div>
//                                 <div className="flex items-center gap-3 text-[10px] uppercase tracking-wide text-gray-500">
//                                     {row.topPickSlipName && <span>{row.topPickSlipName}</span>}
//                                     <span
//                                         className={
//                                             row.topPickPoints >= 0
//                                                 ? "text-emerald-300"
//                                                 : "text-red-400"
//                                         }
//                                     >
//                                         {formatPoints(row.topPickPoints)} pts
//                                     </span>
//                                 </div>
//                             </div>
//                         </div>
//                     )
//                 }
//                 )}
//             </div>
//         </div>
//     );
// };

// export default ArchivedLeaderboard;
