// "use client";

// import { ActiveSlip, Member, Members, Picks } from "@/lib/interfaces/interfaces";
// import { formatDateTime } from "../../lib/utils/date";

// type Props = {
//   slip?: ActiveSlip | null;
//   members: Members;
//   picks: Picks;
// };

// const resultTone: Record<string, string> = {
//   win: "text-emerald-300",
//   loss: "text-red-400",
//   void: "text-gray-400",
//   pending: "text-amber-300",
// };

// export const CurrentSlipTab = ({ slip, members, picks }: Props) => {
//   if (!slip) {
//     return (
//       <div className="rounded-3xl border border-white/10 bg-black/60 p-6 text-sm text-gray-400">
//         Waiting for the next contest to start — commissioner will open Slip 1 when
//         ready.
//       </div>
//     );
//   }

//   return (
//     <section className="flex flex-col gap-5">
//       <div className="rounded-3xl border border-white/10 bg-black/60 p-6 shadow-lg backdrop-blur">
//         <div className="flex flex-col gap-1 text-xs uppercase tracking-wide text-gray-400">
//           <span>Current Slip: {slip.name}</span>
//           <span>Status: {slip.status.toUpperCase()}</span>
//           <span>Pick deadline: {formatDateTime(slip.pick_deadline_at)}</span>
//           <span>Results deadline: {formatDateTime(slip.results_deadline_at)}</span>
//         </div>
//         {slip.status === "locked" && (
//           <p className="mt-3 text-xs text-amber-300">
//             Picks are locked. Commissioner is grading results now.
//           </p>
//         )}
//         {slip.status === "final" && (
//           <p className="mt-3 text-xs text-emerald-200">
//             Finalized. Points are already on the leaderboard.
//           </p>
//         )}
//       </div>

//       <div className="space-y-3">
//         {members.map((member: Member) => {
//           const pick = picks.find(
//             (candidate) =>
//               candidate.slip_id === slip.id && candidate.user_id === member.user_id
//           );
//           const status = pick ? pick.result : "pending";
//           const tone =
//             resultTone[status === null ? "pending" : status] ?? "text-gray-400";
//           const displayName = member?.profiles?.username ?? member.user_id ?? "Member";
//           const initials = displayName.slice(0, 2).toUpperCase();

//           return (
//             <div
//               key={member.id ?? member.user_id}
//               className="flex flex-col gap-2 rounded-3xl border border-white/10 bg-black/50 p-5 shadow-inner"
//             >
//               <div className="flex items-center justify-between">
//                 <div className="flex items-center gap-3">
//                   <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20 text-sm font-semibold text-emerald-200">
//                     {initials}
//                   </span>
//                   <div>
//                     <h3 className="text-base font-semibold text-white uppercase">
//                       {displayName}
//                     </h3>
//                     <p className="text-xs uppercase tracking-wide text-gray-500">
//                       {pick ? "pick submitted" : "waiting for pick"}
//                     </p>
//                   </div>
//                 </div>
//                 <span className={`text-xs font-semibold uppercase tracking-wide ${tone}`}>
//                   {pick ? pick.result : slip.status === "grading" ? "grading" : "pending"}
//                 </span>
//               </div>

//               <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-gray-300">
//                 {pick ? (
//                   <div className="space-y-2">
//                     <p className="text-white">{pick.description}</p>
//                     <p className="text-xs text-gray-400">
//                       Odds bracket: {pick.odds_bracket}
//                     </p>
//                     <p className="text-xs text-gray-400">
//                       Points: <span className="text-white">{pick.points}</span>
//                     </p>
//                   </div>
//                 ) : (
//                   <p className="text-xs text-gray-500">
//                     — waiting for pick — member hasn’t locked anything in yet.
//                   </p>
//                 )}
//               </div>
//             </div>
//           );
//         })}
//       </div>
//     </section>
//   );
// };

// export default CurrentSlipTab;
