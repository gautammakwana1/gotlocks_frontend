// import { GradingSnapshot, Member, Pick, RootState, SlipStatus } from "@/lib/interfaces/interfaces";
// import { useState } from "react";
// import { useSelector } from "react-redux";

// type GradingPanelProps = {
//     status: SlipStatus;
//     gradingEditable: boolean;
//     canLock: boolean;
//     canUnlock: boolean;
//     canFinalize: boolean;
//     canVoid: boolean;
//     gradingDirty: boolean;
//     grading: GradingSnapshot;
//     memberPicks: Array<{ pick: Pick; member: Member }>;
//     onLock: () => void;
//     onUnlock: () => void;
//     onFinalize: () => void;
//     onVoid: () => void;
//     onGetResults: () => void;
//     onResultChange: (
//         pickId: string,
//         value: "win" | "loss" | "void" | "pending"
//     ) => void;
//     onBonusChange: (pickId: string, value: string) => void;
//     onSave: () => void;
// };

// export const GradingPanel = ({
//     status,
//     gradingEditable,
//     canLock,
//     canUnlock,
//     canFinalize,
//     canVoid,
//     grading,
//     gradingDirty,
//     memberPicks,
//     onLock,
//     onUnlock,
//     onFinalize,
//     onVoid,
//     onGetResults,
//     onResultChange,
//     onBonusChange,
//     onSave,
// }: GradingPanelProps) => {
//     const { loading: slipLoader } = useSelector((state: RootState) => state.slip);
//     const { loading: pickLoader } = useSelector((state: RootState) => state.pick);
//     const [loadingButton, setLoadingButton] = useState<string | null>(null);

//     return (
//         <section
//             className={`space-y-4 rounded-3xl border border-white/10 bg-black/60 p-6 shadow-lg backdrop-blur transition ${status === "grading" ? "opacity-60" : ""
//                 }`}
//         >
//             <div className="flex flex-wrap items-center justify-between gap-3">
//                 <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-300">
//                     Grading window
//                 </h3>
//                 <button
//                     type="button"
//                     onClick={onGetResults}
//                     disabled={!gradingEditable}
//                     className="rounded-2xl border border-emerald-400/60 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-emerald-200 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
//                 >
//                     Get Results
//                 </button>
//             </div>
//             <div className="rounded-2xl border border-amber-400/40 bg-amber-500/10 px-4 py-2 text-xs text-amber-100">
//                 Any picks left pending at the results deadline will be auto-voided (0 pts) and
//                 the next slip will open automatically.
//             </div>

//             <div className="overflow-x-auto rounded-2xl border border-white/10">
//                 <table className="min-w-full text-sm text-white">
//                     <thead className="bg-white/5 text-xs uppercase tracking-wide text-gray-400">
//                         <tr>
//                             <th className="px-4 py-3 text-left font-medium">Player</th>
//                             <th className="px-4 py-3 text-left font-medium">Pick</th>
//                             <th className="px-4 py-3 text-left font-medium">Odds</th>
//                             <th className="px-4 py-3 text-left font-medium">Result</th>
//                             <th className="px-4 py-3 text-left font-medium">Bonus</th>
//                         </tr>
//                     </thead>
//                     <tbody className="bg-black/40">
//                         {memberPicks.map(({ pick, member }) => (
//                             <tr key={pick.id} className="border-t border-white/5 text-sm">
//                                 <td className="px-4 py-4 text-white uppercase">
//                                     {member?.profiles?.username ?? member?.user_id}
//                                 </td>
//                                 <td className="px-4 py-4 text-gray-200">{pick.description}</td>
//                                 <td className="px-4 py-4 text-xs text-gray-400">
//                                     {pick.odds_bracket}
//                                 </td>
//                                 <td className="px-4 py-4">
//                                     <select
//                                         value={grading[pick.id]?.result ?? "pending"}
//                                         onChange={(event) =>
//                                             onResultChange(
//                                                 pick.id,
//                                                 event.target.value as "win" | "loss" | "void" | "pending"
//                                             )
//                                         }
//                                         disabled={!gradingEditable}
//                                         className="rounded-xl border border-white/10 bg-black px-3 py-2 text-xs text-white outline-none transition focus:border-emerald-400/70 disabled:cursor-not-allowed disabled:border-white/5"
//                                     >
//                                         <option value="pending">pending</option>
//                                         <option value="win">win</option>
//                                         <option value="loss">loss</option>
//                                         <option value="void">void</option>
//                                     </select>
//                                 </td>
//                                 <td className="px-4 py-4">
//                                     <input
//                                         type="number"
//                                         value={grading[pick.id]?.bonus ?? "0"}
//                                         onChange={(event) => onBonusChange(pick.id, event.target.value)}
//                                         disabled={!gradingEditable}
//                                         className="w-20 rounded-xl border border-white/10 bg-black px-3 py-2 text-xs text-white outline-none transition focus:border-emerald-400/70 disabled:cursor-not-allowed disabled:border-white/5"
//                                     />
//                                 </td>
//                             </tr>
//                         ))}
//                     </tbody>
//                 </table>
//             </div>

//             <div className="flex flex-wrap items-center gap-3">
//                 <button
//                     type="button"
//                     onClick={() => {
//                         onSave();
//                         setLoadingButton("change")
//                     }}
//                     disabled={!gradingEditable || !gradingDirty}
//                     className="rounded-2xl bg-emerald-500/25 px-6 py-3 text-xs w-36 h-10 font-semibold uppercase tracking-wide text-emerald-100 transition hover:bg-emerald-500/35 disabled:cursor-not-allowed disabled:opacity-60"
//                 >
//                     {pickLoader && loadingButton === "change" ? "Changing..." : "Save changes"}
//                 </button>
//                 <button
//                     type="button"
//                     onClick={() => {
//                         onLock();
//                         setLoadingButton("lock")
//                     }}
//                     disabled={!canLock}
//                     className="rounded-2xl bg-amber-500/25 px-6 py-3 text-xs w-36 h-10 font-semibold uppercase tracking-wide text-amber-100 transition hover:bg-amber-500/35 disabled:cursor-not-allowed disabled:opacity-60"
//                 >
//                     {slipLoader && loadingButton === "lock" ? "Locking..." : "Mark locked"}
//                 </button>
//                 <button
//                     type="button"
//                     onClick={() => {
//                         onUnlock();
//                         setLoadingButton("unlock")
//                     }}
//                     disabled={!canUnlock}
//                     className="rounded-2xl border border-amber-400/60 px-6 py-3 text-xs w-36 h-10 font-semibold uppercase tracking-wide text-amber-200 transition hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-60"
//                 >
//                     {slipLoader && loadingButton === "unlock" ? "Unlocking..." : "Unlock slip"}
//                 </button>
//                 <button
//                     type="button"
//                     onClick={() => {
//                         onFinalize();
//                         setLoadingButton("finalize")
//                     }}
//                     disabled={!canFinalize}
//                     className="rounded-2xl border border-emerald-400/60 px-6 py-3 text-xs w-36 h-10 font-semibold uppercase tracking-wide text-emerald-200 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
//                 >
//                     {slipLoader && loadingButton === "finalize" ? "Finalizing..." : "Finalize slip"}
//                 </button>
//                 <button
//                     type="button"
//                     onClick={() => {
//                         onVoid();
//                         setLoadingButton("void")
//                     }}
//                     disabled={!canVoid}
//                     className="rounded-2xl border border-red-400/60 px-6 py-3 text-xs w-36 h-10 font-semibold uppercase tracking-wide text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
//                 >
//                     {slipLoader && loadingButton === "void" ? "Voiding..." : "Void slip"}
//                 </button>
//             </div>
//         </section>
//     )
// };