"use client";

// import { useToast } from "@/lib/state/ToastContext";
// import type { Toast } from "@/lib/interfaces/interfaces";

// const toneClasses: Record<Toast["type"], string> = {
//   success: "bg-emerald-500/20 border-emerald-400 text-emerald-100",
//   error: "bg-red-500/20 border-red-400 text-red-100",
//   info: "bg-sky-500/20 border-sky-400 text-sky-100",
// };

// export const ToastStack = () => {
//   const { toasts, removeToast } = useToast();

//   if (!toasts.length) return null;

//   return (
//     <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4 sm:justify-end sm:pr-6">
//       <div className="flex w-full max-w-sm flex-col gap-2">
//         {toasts.map((toast, index) => (
//           <div
//             key={toast.id}
//             style={{
//               transform: `translateY(-${index * 6}px) scale(${1 - index * 0.03})`,
//               opacity: 1 - index * 0.15,
//               zIndex: 50 - index,
//             }}
//             className={`
//               pointer-events-auto flex items-start gap-3 rounded-2xl border px-4 py-3
//               shadow-lg backdrop-blur transition-all duration-300
//               ${toneClasses[toast.type]}
//             `}
//           >
//             <span className="text-sm font-medium">{toast.message}</span>

//             <button
//               type="button"
//               aria-label="Dismiss notification"
//               onClick={() => removeToast(toast.id)}
//               className="ml-auto shrink-0 text-xs uppercase tracking-wide text-gray-300 transition hover:text-white"
//             >
//               close
//             </button>
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// };
