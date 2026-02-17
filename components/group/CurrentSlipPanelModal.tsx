// import { ActiveSlip, SlipStatus } from "@/lib/interfaces/interfaces";

// type CurrentSlipPanelProps = {
//     slip: ActiveSlip;
// };

// const statusBadgeStyles: Record<SlipStatus, string> = {
//     open: "bg-gray-700/70 text-gray-200",
//     locked: "bg-amber-500/20 border border-amber-400/40 text-amber-200",
//     final: "bg-emerald-500/20 border border-emerald-400/40 text-emerald-200",
//     grading: "bg-red-500/20 border border-red-400/40 text-red-200",
// };

// export const CurrentSlipPanel = ({ slip }: CurrentSlipPanelProps) => {
//     const badgeClasses = statusBadgeStyles[slip.status as SlipStatus] ?? "";
//     return (
//         <section className="rounded-3xl border border-white/10 bg-black/60 p-6 shadow-lg backdrop-blur transition">
//             <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
//                 <div>
//                     <h2 className="text-lg font-semibold text-white">{slip.name}</h2>
//                     <p className="text-sm text-gray-400">
//                         Pick deadline · {new Date(slip.pick_deadline_at).toLocaleString()}
//                     </p>
//                     <p className="text-sm text-gray-400">
//                         Results deadline · {new Date(slip.results_deadline_at).toLocaleString()}
//                     </p>
//                 </div>
//                 <span className={`self-start rounded-full px-3 py-1 text-xs uppercase tracking-wide ${badgeClasses}`}>
//                     {slip.status.toUpperCase()}
//                 </span>
//             </div>
//         </section>
//     );
// };