// import { ActiveSlip } from "@/lib/interfaces/interfaces";
// import { formatDateTime } from "@/lib/utils/date";
// import { useState } from "react";
// import DeadlinesOverviewModal from "../modals/DeadlinesOverviewModal";

// const MemberSettingsPanel = ({ slip }: { slip?: ActiveSlip | null }) => {
//     const [isDeadlinesModalOpen, setIsDeadlinesModalOpen] = useState(false);
//     if (!slip) {
//         return (
//             <div className="rounded-3xl border border-white/10 bg-black/60 p-6 text-sm text-gray-400">
//                 No active slip yet. Your commissioner will open the next contest soon.
//             </div>
//         );
//     }

//     return (
//         <>
//             <button
//                 type="button"
//                 onClick={() => setIsDeadlinesModalOpen(true)}
//                 className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-left text-sm font-semibold uppercase tracking-wide text-white transition hover:border-emerald-400/50"
//             >
//                 Deadlines &amp; grading overview
//                 <span aria-hidden>→</span>
//             </button>
//             <section className="space-y-4 rounded-3xl border border-white/10 bg-black/60 p-6 shadow-lg backdrop-blur">
//                 <div className="flex flex-col gap-1">
//                     <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-300">
//                         Slip details
//                     </h3>
//                     <p className="text-xs text-gray-500">
//                         Deadlines are set by your commissioner. Once the pick deadline hits, picks lock
//                         for everyone. Results finalize after the commissioner grades them.
//                     </p>
//                 </div>

//                 <div className="grid gap-3 text-sm text-gray-200 sm:grid-cols-2">
//                     <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
//                         <span className="text-xs uppercase tracking-wide text-gray-500">Slip name</span>
//                         <p className="text-white">{slip.name}</p>
//                     </div>
//                     <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
//                         <span className="text-xs uppercase tracking-wide text-gray-500">
//                             Current status
//                         </span>
//                         <p className="capitalize text-white">{slip.status}</p>
//                     </div>
//                     <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
//                         <span className="text-xs uppercase tracking-wide text-gray-500">
//                             Pick deadline
//                         </span>
//                         <p className="text-white">{formatDateTime(slip.pick_deadline_at)}</p>
//                     </div>
//                     <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
//                         <span className="text-xs uppercase tracking-wide text-gray-500">
//                             Results deadline
//                         </span>
//                         <p className="text-white">{formatDateTime(slip.results_deadline_at)}</p>
//                     </div>
//                 </div>
//             </section>
//             <DeadlinesOverviewModal
//                 open={isDeadlinesModalOpen}
//                 onClose={() => setIsDeadlinesModalOpen(false)}
//             />
//         </>
//     );
// };

// export default MemberSettingsPanel;