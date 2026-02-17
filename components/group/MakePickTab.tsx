// "use client";

// import { useEffect, useMemo, useState } from "react";
// import { ODDS_BRACKETS } from "../../lib/constants";
// import { formatDateTime, isPast } from "../../lib/utils/date";
// import { ScoringModal } from "../modals/ScoringModal";
// import { ActiveSlip, Group, LeaderboardEntry, Picks, RootState } from "@/lib/interfaces/interfaces";
// import { useSelector } from "react-redux";

// type UserIdentity = {
//   userId?: string;
// } | null;

// type Props = {
//   group: Group | null;
//   slip?: ActiveSlip | null;
//   currentUser?: UserIdentity;
//   picks: Picks;
//   leaderboard: LeaderboardEntry[];
//   onSubmitPick: (payload: { description: string; oddsBracket: string }) => void;
//   isCommissioner: boolean;
// };

// export const MakePickTab = ({
//   group,
//   slip,
//   currentUser,
//   picks,
//   leaderboard,
//   onSubmitPick,
//   isCommissioner,
// }: Props) => {
//   const [description, setDescription] = useState("");
//   const [oddsBracket, setOddsBracket] = useState(ODDS_BRACKETS[2].label);
//   const [showModal, setShowModal] = useState(false);
//   const [showTipsModal, setShowTipsModal] = useState(false);
//   const [autoMsg, setAutoMsg] = useState<string | null>(null);
//   const [autoErr, setAutoErr] = useState<string | null>(null);

//   const { loading } = useSelector((state: RootState) => state.pick);

//   const pick = useMemo(() => {
//     if (!slip || !currentUser) return undefined;
//     return picks.find(
//       (entry) => entry.slip_id === slip.id && entry.user_id === currentUser.userId
//     );
//   }, [picks, slip, currentUser]);

//   const slipRow = useMemo(() => {
//     if (!slip || !currentUser) return undefined;
//     return leaderboard.find(
//       (entry) =>
//         entry.slip_id === slip.id &&
//         entry.user_id === currentUser.userId &&
//         entry.group_id === group?.id
//     );
//   }, [leaderboard, slip, currentUser, group?.id]);

//   useEffect(() => {
//     if (pick) {
//       setDescription(pick.description);
//       setOddsBracket(pick.odds_bracket);
//     }
//   }, [pick]);

//   const locked =
//     !slip ||
//     slip.status !== "open" ||
//     isPast(slip.pick_deadline_at ?? "") ||
//     !currentUser;

//   const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
//     event.preventDefault();
//     if (!locked) {
//       onSubmitPick({ description, oddsBracket });
//     }
//   };

//   const guessBracketFromText = (text: string): string | null => {
//     const match = text.match(/([+-]?\d{2,4})/);
//     if (!match) return null;
//     const value = parseInt(match[1], 10);
//     const labelFor = (n: number) => {
//       if (n <= -250) return "–250 or shorter";
//       if (n >= -249 && n <= 0) return "–249 to 0";
//       if (n >= 1 && n <= 250) return "+1 to +250";
//       if (n >= 251 && n <= 500) return "+251 to +500";
//       if (n >= 501) return "+501 and up";
//       return null;
//     };
//     const label = labelFor(value);
//     if (!label) return null;
//     const exists = ODDS_BRACKETS.find((bracket) => bracket.label === label)?.label;
//     return exists ?? label;
//   };

//   if (!slip) {
//     return (
//       <div className="rounded-3xl border border-white/10 bg-black/60 p-6 text-sm text-gray-400">
//         No active slip yet. Commissioner will launch the next contest soon.
//       </div>
//     );
//   }

//   return (
//     <>
//       <section className="flex flex-col gap-5 rounded-3xl border border-white/10 bg-black/50 p-6 shadow-lg backdrop-blur">
//         <div className="flex flex-col gap-2">
//           <div className="flex flex-wrap items-center justify-between gap-3 text-xs uppercase tracking-wide text-gray-400">
//             <span>role: {isCommissioner ? "commissioner" : "member"}</span>
//             <span>deadline: {formatDateTime(slip.pick_deadline_at)}</span>
//           </div>
//           <button
//             type="button"
//             onClick={() => setShowTipsModal(true)}
//             className="self-start text-xs font-semibold uppercase tracking-wide text-rose-200 transition hover:text-rose-100"
//           >
//             Tips →
//           </button>
//         </div>

//         <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-gray-300">
//           {pick ? (
//             <div className="space-y-2">
//               <span className="text-xs uppercase text-gray-500">
//                 your current pick
//               </span>
//               <p className="text-white">{pick.description}</p>
//               <p className="text-xs text-gray-400">
//                 Odds bracket: {pick.odds_bracket}
//               </p>
//               <p className="text-xs text-gray-400">
//                 Status: {pick.result ? pick.result.toUpperCase(): ""} · slip points {pick.points}
//               </p>
//               {slipRow && (
//                 <p className="text-xs text-gray-500">
//                   Cumulative: {slipRow.cumulative_points}
//                 </p>
//               )}
//             </div>
//           ) : (
//             <p className="text-sm text-gray-400">
//               No pick yet. Lock something in before the deadline hits.
//             </p>
//           )}
//         </div>

//         <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
//           <label className="flex flex-col gap-2">
//             <span className="text-xs uppercase tracking-wide text-gray-400">
//               lock in your pick
//             </span>
//             <textarea
//               value={description}
//               onChange={(event) => setDescription(event.target.value)}
//               className="min-h-[96px] rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400/70 disabled:opacity-50"
//               placeholder="Jonathon Taylor ATD"
//               disabled={locked}
//               maxLength={140}
//             />
//           </label>
//           <label className="flex flex-col gap-2">
//             <div className="flex items-center justify-between">
//               <span className="text-xs uppercase tracking-wide text-gray-400">
//                 manually select odds range
//               </span>
//               <button
//                 type="button"
//                 onClick={() => {
//                   setAutoErr(null);
//                   setAutoMsg(null);
//                   if (!description.trim()) {
//                     setAutoErr("Type your pick first, then click Get odds range.");
//                     return;
//                   }
//                   const suggestion = guessBracketFromText(description);
//                   if (!suggestion) {
//                     setAutoErr("Couldn't guess from your text. Select a range manually.");
//                     return;
//                   }
//                   setOddsBracket(suggestion);
//                   setAutoMsg(`Suggested odds range: ${suggestion} (you can change it)`);
//                 }}
//                 disabled={locked}
//                 className="rounded-2xl border border-emerald-400/60 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-200 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
//               >
//                 get odds range
//               </button>
//             </div>

//             {autoMsg && <span className="text-[11px] text-emerald-300">{autoMsg}</span>}
//             {autoErr && <span className="text-[11px] text-red-300">{autoErr}</span>}

//             <select
//               value={oddsBracket}
//               onChange={(event) => setOddsBracket(event.target.value)}
//               disabled={locked}
//               className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400/70 disabled:opacity-50"
//             >
//               {ODDS_BRACKETS.map((bracket) => (
//                 <option key={bracket.label} value={bracket.label}>
//                   {bracket.label} → {bracket.points} pts
//                 </option>
//               ))}
//             </select>
//           </label>

//           <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-gray-400">
//             <button
//               type="button"
//               onClick={() => setShowModal(true)}
//               className="text-xs font-semibold uppercase tracking-wide text-rose-200 transition hover:text-emerald-200"
//             >
//               view full scoring →
//             </button>
//             <span>
//               {locked
//                 ? "Picks locked — wait for results."
//                 : "You can resubmit until the pick deadline. Only the last one counts."}
//             </span>
//           </div>

//           <button
//             type="submit"
//             disabled={locked || !description.trim()}
//             className="self-start rounded-2xl bg-emerald-500/25 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-emerald-100 transition hover:bg-emerald-500/35 disabled:cursor-not-allowed disabled:opacity-40"
//           >
//             {pick ? loading ? "updating pick..." : "update pick" : loading ? "submitting pick..." : "submit pick"}
//           </button>
//         </form>
//       </section>

//       <TipsModal open={showTipsModal} onClose={() => setShowTipsModal(false)} />
//       <ScoringModal open={showModal} onClose={() => setShowModal(false)} />
//     </>
//   );
// };

// const TipsModal = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
//   useEffect(() => {
//     if (!open) return;
//     const handler = (event: KeyboardEvent) => {
//       if (event.key === "Escape") onClose();
//     };
//     window.addEventListener("keydown", handler);
//     return () => window.removeEventListener("keydown", handler);
//   }, [open, onClose]);

//   if (!open) return null;

//   return (
//     <div
//       className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 py-8"
//       role="dialog"
//       aria-modal="true"
//       onClick={onClose}
//     >
//       <div
//         className="max-h-full w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-black/80 shadow-2xl backdrop-blur"
//         onClick={(event) => event.stopPropagation()}
//       >
//         <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
//           <h2 className="text-lg font-semibold text-white">Tips for making your pick</h2>
//           <button
//             type="button"
//             onClick={onClose}
//             className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-wide text-gray-300 transition hover:text-white"
//             aria-label="Close tips"
//           >
//             X
//           </button>
//         </div>
//         <div className="max-h-[70vh] overflow-y-auto px-6 py-6 text-sm text-gray-200">
//           <div className="space-y-4">
//             <div className="flex gap-3 rounded-2xl border border-white/5 bg-white/5 px-4 py-3 leading-relaxed">
//               <span className="mt-1 text-rose-200">•</span>
//               <p>
//                 Type in your pick, then tap &ldquo;Get odds range.&ldquo; We&#39;ll look up the details and
//                 suggest the odds range that best matches your pick.
//               </p>
//             </div>
//             <div className="flex gap-3 rounded-2xl border border-white/5 bg-white/5 px-4 py-3 leading-relaxed">
//               <span className="mt-1 text-rose-200">•</span>
//               <p>
//                 If the suggested odds range doesn&#39;t look right, you can still adjust it
//                 manually. Final points are reviewed by your group leader, so stick to the
//                 honor system and keep it fair.
//               </p>
//             </div>
//             <div className="flex gap-3 rounded-2xl border border-white/5 bg-white/5 px-4 py-3 leading-relaxed">
//               <span className="mt-1 text-rose-200">•</span>
//               <p>
//                 You can edit your pick up until the picks deadline shown at the top of this
//                 screen. Change it as many times as you want before it locks.
//               </p>
//             </div>
//             <div className="flex gap-3 rounded-2xl border border-white/5 bg-white/5 px-4 py-3 leading-relaxed">
//               <span className="mt-1 text-rose-200">•</span>
//               <p>
//                 The commissioner can lock the slip early once everyone&#39;s picks are in, so
//                 don&#39;t wait until the last second.
//               </p>
//             </div>
//             <div className="flex gap-3 rounded-2xl border border-white/5 bg-white/5 px-4 py-3 leading-relaxed">
//               <span className="mt-1 text-rose-200">•</span>
//               <p>
//                 For more details on deadlines and grading, go to Group settings → &ldquo;Deadlines
//                 & grading overview.&ldquo;
//               </p>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default MakePickTab;
