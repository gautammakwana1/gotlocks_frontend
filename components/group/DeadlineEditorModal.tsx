// import { SlipStatus } from "@/lib/interfaces/interfaces";

// type DeadlineEditorProps = {
//     active: boolean;
//     status: SlipStatus;
//     pickDeadlineInput: string;
//     resultsDeadlineInput: string;
//     onPickDeadlineChange: (value: string) => void;
//     onResultsDeadlineChange: (value: string) => void;
//     onSave: () => void;
// };

// export const DeadlineEditor = ({
//     active,
//     status,
//     pickDeadlineInput,
//     resultsDeadlineInput,
//     onPickDeadlineChange,
//     onResultsDeadlineChange,
//     onSave,
// }: DeadlineEditorProps) => (
//     <section
//         className={`rounded-3xl border border-white/10 bg-black/60 p-6 shadow-lg backdrop-blur transition ${active ? "" : "opacity-60"
//             }`}
//     >
//         <div className="flex items-center justify-between gap-3">
//             <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-300">
//                 Deadline management
//             </h3>
//             {!active && (
//                 <span className="text-xs uppercase tracking-wide text-gray-500">
//                     Locked while slip is {status}
//                 </span>
//             )}
//         </div>
//         <p className="mt-2 text-xs text-gray-500">
//             Adjust the pick window. Results deadline re-aligns two days after the pick lock.
//         </p>
//         <div className="mt-4 grid gap-4 sm:grid-cols-2">
//             <label className="flex flex-col gap-2">
//                 <span className="text-xs uppercase tracking-wide text-gray-400">
//                     Pick deadline
//                 </span>
//                 <input
//                     type="datetime-local"
//                     value={pickDeadlineInput}
//                     onChange={(event) => onPickDeadlineChange(event.target.value)}
//                     disabled={!active}
//                     className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400/70 disabled:cursor-not-allowed disabled:border-white/5"
//                 />
//             </label>
//             <label className="flex flex-col gap-2">
//                 <span className="text-xs uppercase tracking-wide text-gray-400">
//                     Results deadline
//                 </span>
//                 <input
//                     type="datetime-local"
//                     value={resultsDeadlineInput}
//                     onChange={(event) => onResultsDeadlineChange(event.target.value)}
//                     disabled={!active}
//                     className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400/70 disabled:cursor-not-allowed disabled:border-white/5"
//                 />
//             </label>
//         </div>
//         <button
//             type="button"
//             onClick={onSave}
//             disabled={!active}
//             className="mt-4 rounded-2xl bg-emerald-500/25 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-emerald-100 transition hover:bg-emerald-500/35 disabled:cursor-not-allowed disabled:opacity-60"
//         >
//             Save deadlines
//         </button>
//     </section>
// );
