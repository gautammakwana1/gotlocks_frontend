// "use client";

// import { useEffect, useState } from "react";
// import { Group, GroupSelector } from "@/lib/interfaces/interfaces";
// import { useDispatch, useSelector } from "react-redux";
// import { clearUpdateGroupMessage, updateGroupRequest } from "@/lib/redux/slices/groupsSlice";
// import { useToast } from "@/lib/state/ToastContext";
// import { Link, Pencil } from "lucide-react";

// type Props = {
//   group: Group | null;
//   isCommissioner: boolean;
// };

// export const GroupHeader = ({ group, isCommissioner }: Props) => {
//   const dispatch = useDispatch();
//   const { setToast } = useToast();
//   const [copied, setCopied] = useState(false);
//   const [isEditing, setIsEditing] = useState(false);
//   const [groupName, setGroupName] = useState(group?.name || "");
//   const [groupDescription, setGroupDescription] = useState(group?.description || "");

//   const { loading, message } = useSelector((state: GroupSelector) => state.group);

//   const memberType = isCommissioner ? "Commissioner" : "Member";

//   const copyInvite = async () => {
//     try {
//       await navigator.clipboard.writeText(group?.invite_code ?? "");
//       setCopied(true);
//       setTimeout(() => setCopied(false), 2200);
//     } catch (error) {
//       console.error("Clipboard error", error);
//     }
//   };

//   useEffect(() => {
//     if (!loading && message) {
//       setToast({
//         id: Date.now(),
//         type: "success",
//         message: message,
//         duration: 3000
//       });
//       dispatch(clearUpdateGroupMessage());
//     }
//   }, [message, loading, setToast, dispatch]);

//   const handleEdit = () => {
//     setIsEditing(true);
//   };

//   const handleCancel = () => {
//     setIsEditing(false);
//     setGroupName(group?.name || "");
//     setGroupDescription(group?.description || "");
//   };

//   const handleSave = () => {
//     if (group?.id) {
//       dispatch(updateGroupRequest({ name: groupName, description: groupDescription, group_id: group?.id }));
//     }

//     setIsEditing(false);
//     setGroupName(group?.name || "");
//     setGroupDescription(group?.description || "");
//   };

//   return (
//     <section className="flex flex-col gap-4 text-white">
//       <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-wide text-gray-300">
//         <span className="rounded-full border border-emerald-400/50 px-3 py-1 text-emerald-200">
//           {group?.sport_type}
//         </span>
//         <span className="rounded-full border border-white/20 px-3 py-1 text-gray-200">
//           {memberType}
//         </span>
//         <button
//           type="button"
//           onClick={copyInvite}
//           className="flex items-center gap-2 rounded-full border border-white/10 px-3 py-1 text-gray-200 transition hover:border-emerald-400/50 hover:text-white"
//         >
//           <span aria-hidden><Link size={15} /></span>
//           invite code {group?.invite_code}
//         </button>
//         {copied && (
//           <span className="text-[11px] uppercase tracking-wide text-emerald-200">
//             copied!
//           </span>
//         )}
//       </div>
//       <div className="flex justify-between">
//         {isEditing ? (
//           <input
//             type="text"
//             value={groupName}
//             onChange={(e) => setGroupName(e.target.value)}
//             className="rounded-lg border border-white/20 bg-black/40 px-3 py-2 text-base font-semibold text-white outline-none focus:border-emerald-400/70"
//             placeholder="Enter Group Name"
//           />
//         ) : (
//           <h1 className="text-3xl font-semibold">{group?.name}</h1>
//         )}
//         {memberType === "Commissioner" && (
//           <button
//             onClick={handleEdit}
//             className="rounded-xl border border-gray-400/60 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-gray-200 transition hover:bg-red-500/20 hover:border-red-400/60 hover:text-red-200"
//           >
//             <Pencil size={15} />
//           </button>
//         )
//         }
//       </div>
//       {isEditing ? (
//         <input
//           type="text"
//           value={groupDescription}
//           onChange={(e) => setGroupDescription(e.target.value)}
//           className="rounded-lg border border-white/20 bg-black/40 px-3 py-2 text-base font-semibold text-white outline-none focus:border-emerald-400/70"
//           placeholder="Enter Group Description"
//         />
//       ) : (
//         <p className="text-gray-200">{group?.description}</p>
//       )}
//       {isEditing && (
//         <div className="flex gap-3">
//           <button
//             onClick={handleSave}
//             className="rounded-xl bg-emerald-600/80 px-4 py-2 text-sm font-semibold hover:bg-emerald-500 transition"
//           >
//             {"Save Changes"}
//           </button>
//           <button
//             onClick={handleCancel}
//             className="rounded-xl border border-white/20 px-4 py-2 text-sm font-semibold hover:bg-white/5 transition"
//           >
//             Cancel
//           </button>
//         </div>
//       )}
//     </section>
//   );
// };

// export default GroupHeader;
