// "use client";

// import { useEffect, useMemo, useState } from "react";
// import { fromLocalInputValue, toLocalInputValue } from "../../lib/utils/date";
// import { useDispatch, useSelector } from "react-redux";
// import { clearStartNewContestMessage, markedUnlockSlipRequest, markFinalizeSlipRequest, markLockSlipRequest, markVoidedSlipRequest, startNewContestRequest, updateSlipsRequest } from "@/lib/redux/slices/slipSlice";
// import { DeleteGroupModal } from "./DeleteGroupModal";
// import { DeleteGroupConfirmationModal } from "./ConfirmDeleteGroupModal";
// import { clearConfirmDeleteGroupMessage, confirmDeleteGroupRequest, fetchGroupByIdRequest, initialGroupDeleteRequest } from "@/lib/redux/slices/groupsSlice";
// import { useRouter } from "next/navigation";
// import { DeadlineEditor } from "./DeadlineEditorModal";
// import { GradingPanel } from "./GradingPanelModal";
// import { CurrentSlipPanel } from "./CurrentSlipPanelModal";
// import { useToast } from "@/lib/state/ToastContext";
// import { ActiveSlip, GradingSnapshot, Group, Member, Members, Pick, Picks, RootState, SlipStatus } from "@/lib/interfaces/interfaces";
// import { clearFetchAllPicksMessage, fetchAllPicksRequest, updatePicksRequest } from "@/lib/redux/slices/pickSlice";
// import DeadlinesOverviewModal from "../modals/DeadlinesOverviewModal";

// type Props = {
//   group: Group;
//   slip?: ActiveSlip | null;
//   users: Members;
//   picks: Picks;
//   currentUserId: string;
//   onRenameSlip: (name: string) => void;
//   onOverrideSlipStatus: (
//     status: "open" | "locked" | "finalized" | "voided"
//   ) => void;
//   onRemoveMember: (payload: { groupId: string; userId: string }) => void;
//   onTransferCommissioner: (payload: {
//     groupId: string;
//     newCommissionerId: string;
//   }) => void;
// };

// const addDays = (iso: string, days: number) => {
//   const base = new Date(iso);
//   base.setDate(base.getDate() + days);
//   return base.toISOString();
// };

// const logAction = (action: string, actorId: string) => {
//   console.log({
//     action,
//     timestamp: new Date().toISOString(),
//     actorId,
//   });
// };

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

// export const CommissionerTab = ({
//   group,
//   slip,
//   users,
//   picks,
//   currentUserId,
//   onRenameSlip: _unusedRename,
//   onRemoveMember,
//   onTransferCommissioner,
// }: Props) => {
//   void _unusedRename;
//   const dispatch = useDispatch();
//   const router = useRouter();
//   const isMobile = useIsMobile();

//   const activeSlip = slip;
//   const [pickDeadlineInput, setPickDeadlineInput] = useState(
//     slip ? toLocalInputValue(slip.pick_deadline_at) : ""
//   );
//   const [resultsDeadlineInput, setResultsDeadlineInput] = useState(
//     slip ? toLocalInputValue(slip.results_deadline_at) : ""
//   );

//   useEffect(() => {
//     if (slip?.pick_deadline_at && slip.results_deadline_at) {
//       setPickDeadlineInput(toLocalInputValue(slip.pick_deadline_at));
//       setResultsDeadlineInput(toLocalInputValue(slip.results_deadline_at));
//     }
//   }, [slip?.pick_deadline_at, slip?.results_deadline_at]);
//   const buildInitialGrading = (
//     slipId: string | undefined,
//     currentPicks: Picks
//   ): GradingSnapshot => {
//     if (!slipId) return {};
//     const initial: GradingSnapshot = {};
//     currentPicks
//       .filter((pick) => pick.slip_id === slipId)
//       .forEach((pick) => {
//         initial[pick.id] = {
//           result: pick.result ?? "pending",
//           bonus: pick.bonus ?? "0",
//         };
//       });
//     return initial;
//   };

//   const [grading, setGrading] = useState<GradingSnapshot>(() =>
//     buildInitialGrading(activeSlip?.id, picks)
//   );

//   const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
//   const [isConfirmDeleteModalOpen, setIsConfirmDeleteModalOpen] = useState(false);
//   const [deleteConfirmation, setDeleteConfirmation] = useState("");
//   const [deleteConfirmationCode, setDeleteConfirmationCode] = useState("");
//   const [deleteAcknowledged, setDeleteAcknowledged] = useState(false);
//   const [deleteError, setDeleteError] = useState<string | null>(null);
//   const [isDeletingGroup, setIsDeletingGroup] = useState(false);
//   const [isDeadlinesModalOpen, setIsDeadlinesModalOpen] = useState(false);
//   const { setToast } = useToast();

//   const { error: groupError, deleteMessage } = useSelector((state: RootState) => state.group);
//   const { error: slipError, message: slipMessage } = useSelector((state: RootState) => state.slip);
//   const { error: pickError, message: pickMessage } = useSelector((state: RootState) => state.pick);

//   const confirmationPhrase = useMemo(() => `DELETE ${group.name}`, [group.name]);
//   const isGroupOwner = group.created_by === currentUserId;

//   useEffect(() => {
//     if (isDeleteModalOpen) return;
//     setDeleteConfirmation("");
//     setDeleteError(null);
//     setDeleteAcknowledged(false);
//     setIsDeletingGroup(false);
//   }, [isDeleteModalOpen]);

//   useEffect(() => {
//     if (deleteMessage && !groupError) {
//       setToast({
//         id: Date.now(),
//         type: "success",
//         message: "Group Deleted successfully.",
//         duration: 4000,
//       });
//       dispatch(clearConfirmDeleteGroupMessage());
//       setIsConfirmDeleteModalOpen(false);
//       router.replace("/home");
//     }
//     if (groupError && !deleteMessage) {
//       setDeleteError(groupError);
//       setToast({
//         id: Date.now(),
//         type: "error",
//         message: groupError,
//         duration: 4000,
//       });
//       dispatch(clearConfirmDeleteGroupMessage());
//     }
//     if (!slipError && slipMessage) {
//       setToast({
//         id: Date.now(),
//         type: "success",
//         message: slipMessage,
//         duration: 4000,
//       });
//       if (group.id) {
//         dispatch(clearStartNewContestMessage());
//         dispatch(fetchGroupByIdRequest({ groupId: group.id }));
//       }
//     }
//     if (!pickError && pickMessage) {
//       dispatch(clearFetchAllPicksMessage());
//       dispatch(fetchAllPicksRequest({ slip_id: activeSlip?.id }))
//     }
//   }, [
//     deleteMessage,
//     groupError,
//     dispatch,
//     router,
//     setToast,
//     slipMessage,
//     slipError,
//     pickError,
//     pickMessage,
//     group.id,
//     activeSlip?.id
//   ]);

//   useEffect(() => {
//     setGrading(buildInitialGrading(activeSlip?.id, picks));
//   }, [activeSlip?.id, picks]);

//   const memberPicks = useMemo(() => {
//     if (!activeSlip) return [];
//     return picks
//       .filter((pick) => pick.slip_id === activeSlip.id)
//       .map((pick) => {
//         const member = users.find((user) => user.user_id === pick.user_id);
//         if (!member) return null;
//         return { pick, member };
//       })
//       .filter(
//         (entry): entry is { pick: Pick; member: Member } => Boolean(entry)
//       );
//   }, [activeSlip, picks, users]);

//   const gradingDirty = useMemo(() => {
//     return memberPicks.some(({ pick }) => {
//       const snapshot = grading[pick.id];
//       if (!snapshot) return false;
//       const originalResult = pick.result ?? "pending";
//       return snapshot.result !== originalResult;
//     });
//   }, [memberPicks, grading]);

//   const handleCloseDeleteModal = () => {
//     setIsDeleteModalOpen(false);
//   };

//   const handleCloseConfirmDeleteModal = () => {
//     setIsConfirmDeleteModalOpen(false);
//   };

//   const handleDeleteGroup = async () => {
//     if (!isGroupOwner) {
//       setDeleteError("Only the commissioner can delete this group.");
//       return;
//     }

//     const phraseMatches = deleteConfirmation === confirmationPhrase;
//     if (!phraseMatches || !deleteAcknowledged || isDeletingGroup) {
//       return;
//     }

//     try {
//       setIsDeletingGroup(true);
//       setDeleteError(null);
//       if (group?.id) dispatch(initialGroupDeleteRequest({ group_id: group?.id }));
//       setIsDeleteModalOpen(false);
//       setIsConfirmDeleteModalOpen(true);
//     } catch (error) {
//       const message =
//         error instanceof Error ? error.message : "Failed to delete group.";
//       setDeleteError(message);
//     }
//   };

//   const handleConfirmDeleteGroup = async () => {
//     if (!isGroupOwner) {
//       setDeleteError("Only the commissioner can delete this group.");
//       return;
//     }
//     try {
//       setDeleteError(null);
//       if (group?.id) dispatch(confirmDeleteGroupRequest({ group_id: group?.id, otp: deleteConfirmationCode }));
//     } catch (error) {
//       const message =
//         error instanceof Error ? error.message : "Failed to delete group.";
//       setDeleteError(message);
//     }
//   }

//   const deleteZoneSection = isGroupOwner ? (
//     <section className="rounded-3xl border border-red-500/30 bg-red-500/5 p-6 shadow-lg backdrop-blur">
//       <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
//         <div>
//           <p className="text-xs font-semibold uppercase tracking-wide text-red-300">
//             Danger zone
//           </p>
//           <p className="mt-1 text-sm text-red-100">
//             Permanently delete <span className="font-semibold">{group.name}</span> and
//             remove every member, leaderboard, pick, and archive tied to this group.
//           </p>
//         </div>
//         <button
//           type="button"
//           aria-label="Delete group"
//           onClick={() => {
//             setDeleteError(null);
//             setIsDeleteModalOpen(true);
//           }}
//           className="rounded-2xl border border-red-400/60 bg-red-500/10 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-red-100 transition hover:bg-red-500/20"
//         >
//           Delete Group
//         </button>
//       </div>
//     </section>
//   ) : null;

//   const deleteModal = (
//     <DeleteGroupModal
//       open={isDeleteModalOpen}
//       groupName={group.name}
//       confirmationPhrase={confirmationPhrase}
//       confirmationValue={deleteConfirmation}
//       acknowledged={deleteAcknowledged}
//       hasPermission={isGroupOwner}
//       isDeleting={isDeletingGroup}
//       errorMessage={deleteError}
//       onConfirmationChange={(value: string) => setDeleteConfirmation(value)}
//       onAcknowledgedChange={(value: boolean) => setDeleteAcknowledged(value)}
//       onClose={handleCloseDeleteModal}
//       onDelete={handleDeleteGroup}
//     />
//   );

//   const confirmDeleteModal = (
//     <DeleteGroupConfirmationModal
//       open={isConfirmDeleteModalOpen}
//       confirmationValue={deleteConfirmationCode}
//       hasPermission={isGroupOwner}
//       isDeleting={isDeletingGroup}
//       errorMessage={deleteError}
//       onConfirmationChange={(value: string) => setDeleteConfirmationCode(value)}
//       onClose={handleCloseConfirmDeleteModal}
//       onConfirm={handleConfirmDeleteGroup}
//     />
//   );

//   if (!activeSlip) {
//     return (
//       <div className="flex flex-col gap-6">
//         <div className="rounded-3xl border border-white/10 bg-black/60 p-6 text-sm text-gray-400">
//           No active slip to manage. Start the next slip to unlock commissioner controls.
//         </div>
//         {deleteZoneSection}
//         {deleteModal}
//         {confirmDeleteModal}
//       </div>
//     );
//   }

//   const status = activeSlip.status as SlipStatus;
//   const nowMs = Date.now();
//   const pickDeadlineMs = new Date(activeSlip.pick_deadline_at).getTime();

//   const deadlineActive = status === "open";
//   const gradingEditable = status === "locked";

//   const canLock = status === "open";
//   const canUnlock = status === "locked" && nowMs < pickDeadlineMs;
//   const canFinalize = status === "locked";
//   const canVoid = status === "locked" || status === "final";

//   const handlePickDeadlineChange = (value: string) => {
//     setPickDeadlineInput(value);
//     const iso = fromLocalInputValue(value);
//     if (!iso) return;
//     const shifted = addDays(iso, 2);
//     setResultsDeadlineInput(toLocalInputValue(shifted));
//   };

//   const handleDeadlineSubmit = () => {
//     if (!deadlineActive) return;
//     if (!pickDeadlineInput || !resultsDeadlineInput) return;

//     const pickIso = fromLocalInputValue(pickDeadlineInput);
//     const resultsIso = fromLocalInputValue(resultsDeadlineInput);
//     if (!pickIso || !resultsIso) return;

//     if (new Date(pickIso).getTime() <= pickDeadlineMs) {
//       alert("Pick deadline can only move forward in time.");
//       return;
//     }

//     dispatch(updateSlipsRequest({
//       pick_deadline_at: pickIso,
//       results_deadline_at: resultsIso,
//       group_id: group?.id,
//       slip_id: activeSlip?.id
//     }));
//     dispatch(fetchAllPicksRequest({ slip_id: activeSlip.id }));
//   };

//   const handleResultChange = (
//     pickId: string,
//     value: "win" | "loss" | "void" | "pending"
//   ) => {
//     setGrading((prev) => ({
//       ...prev,
//       [pickId]: {
//         ...prev[pickId],
//         result: value,
//       },
//     }));
//   };

//   const handleBonusChange = (pickId: string, bonus: string) => {
//     setGrading((prev) => ({
//       ...prev,
//       [pickId]: {
//         ...prev[pickId],
//         bonus,
//       },
//     }));
//   };

//   const applyGrading = () => {
//     const gradingPayload = Object.entries(grading).map(([pickId, snapshot]) => {
//       const bonusValue = Number(snapshot.bonus) || 0;

//       return {
//         id: pickId,
//         result: snapshot.result,
//         bonus: bonusValue
//       };
//     });
//     if (group?.id) dispatch(updatePicksRequest({ grading: gradingPayload, group_id: group?.id }));
//     dispatch(fetchAllPicksRequest({ slip_id: activeSlip.id }));
//   };

//   const handleLock = () => {
//     if (!canLock) return;
//     if (
//       !window.confirm(
//         "Once locked, members can no longer change their picks."
//       )
//     ) {
//       return;
//     }
//     dispatch(markLockSlipRequest({
//       slip_id: activeSlip?.id
//     }));
//     dispatch(fetchAllPicksRequest({ slip_id: activeSlip.id }));
//   };
//   const handleUnlock = () => {
//     if (!canUnlock) return;
//     if (
//       !window.confirm(
//         "Unlock this slip? Members will be able to adjust picks until the pick deadline."
//       )
//     ) {
//       return;
//     }
//     dispatch(markedUnlockSlipRequest({
//       slip_id: activeSlip?.id
//     }));
//     dispatch(fetchAllPicksRequest({ slip_id: activeSlip.id }));
//   };
//   const handleFinalize = () => {
//     if (!canFinalize) return;
//     if (
//       !window.confirm(
//         "Finalize results? Make sure you have saved any grading. This will lock scoring for this Slip."
//       )
//     ) {
//       return;
//     }
//     if (activeSlip?.id && group.id) {
//       dispatch(markFinalizeSlipRequest({ slip_id: activeSlip?.id, group_id: group.id }));
//     }
//     dispatch(fetchAllPicksRequest({ slip_id: activeSlip.id }));
//   };

//   const handleVoid = () => {
//     if (!canVoid) return;
//     if (
//       !window.confirm(
//         "Void this slip? It will be excluded from scoring but remain visible."
//       )
//     ) {
//       return;
//     }
//     if (activeSlip?.id && group.id) {
//       dispatch(markVoidedSlipRequest({ slip_id: activeSlip.id, group_id: group.id }));
//     }
//     dispatch(fetchAllPicksRequest({ slip_id: activeSlip.id }));
//   };

//   const handleStartNextContest = () => {
//     if (
//       !window.confirm(
//         "Start a new contest? This archives the current slips and resets the leaderboard."
//       )
//     ) {
//       return;
//     }
//     if (group.id) {
//       dispatch(startNewContestRequest({ group_id: group.id }));
//       dispatch(fetchGroupByIdRequest({ groupId: group.id }));
//     }
//   };

//   return (
//     <div className="flex flex-col gap-6">
//       <button
//         type="button"
//         onClick={() => setIsDeadlinesModalOpen(true)}
//         className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-left text-sm font-semibold uppercase tracking-wide text-white transition hover:border-emerald-400/50"
//       >
//         Deadlines &amp; grading overview
//         <span aria-hidden>→</span>
//       </button>

//       <CurrentSlipPanel slip={activeSlip} />

//       <DeadlineEditor
//         active={deadlineActive}
//         status={status}
//         pickDeadlineInput={pickDeadlineInput}
//         resultsDeadlineInput={resultsDeadlineInput}
//         onPickDeadlineChange={handlePickDeadlineChange}
//         onResultsDeadlineChange={setResultsDeadlineInput}
//         onSave={handleDeadlineSubmit}
//       />

//       <GradingPanel
//         status={status}
//         gradingEditable={gradingEditable}
//         canLock={canLock}
//         canUnlock={canUnlock}
//         canFinalize={canFinalize}
//         canVoid={canVoid}
//         gradingDirty={gradingDirty}
//         grading={grading}
//         memberPicks={memberPicks}
//         onLock={handleLock}
//         onUnlock={handleUnlock}
//         onFinalize={handleFinalize}
//         onVoid={handleVoid}
//         onGetResults={() => {
//           const simulated = memberPicks.reduce<GradingSnapshot>((acc, item) => {
//             acc[item.pick.id] = {
//               result:
//                 grading[item.pick.id]?.result === "pending"
//                   ? "win"
//                   : grading[item.pick.id]?.result ?? item.pick.result,
//               bonus: grading[item.pick.id]?.bonus ?? "0",
//             };
//             return acc;
//           }, {});
//           setGrading(simulated);
//           logAction("fetch_results", currentUserId);
//         }}
//         onResultChange={handleResultChange}
//         onBonusChange={handleBonusChange}
//         onSave={applyGrading}
//       />
//       <div className="flex justify-end">
//         <button
//           type="button"
//           onClick={() => {
//             handleStartNextContest()
//           }}
//           className="rounded-2xl border border-emerald-400/60 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-emerald-200 transition hover:bg-emerald-500/20"
//         >
//           Start next contest
//         </button>
//       </div>

//       <section className="space-y-4 rounded-3xl border border-white/10 bg-black/60 p-6 shadow-lg backdrop-blur">
//         <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
//           <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-300">
//             Modify members
//           </h3>
//           <span className="text-xs uppercase tracking-wide text-gray-500">
//             remove members • transfer commissioner
//           </span>
//         </div>

//         {/* Desktop: Table Layout | Mobile: Card Layout */}
//         {isMobile ? (
//           /* MOBILE: Vertical Cards */
//           <div className="space-y-3">
//             {users?.map((memberData) => {
//               const isCommissioner = memberData.user_id === group.created_by;
//               const isSelf = memberData.user_id === currentUserId;
//               const username = memberData?.profiles?.username ?? memberData.user_id;

//               return (
//                 <div
//                   key={memberData.user_id}
//                   className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm"
//                 >
//                   <div className="flex items-start justify-between mb-3">
//                     <div>
//                       <p className="font-semibold uppercase text-gray-100">{username}</p>
//                       <p className="text-xs uppercase tracking-wide text-gray-400 mt-1">
//                         {isCommissioner ? "commissioner" : "member"}
//                       </p>
//                     </div>
//                     {isCommissioner && (
//                       <span className="rounded-full bg-emerald-500/20 px-2.5 py-1 text-xs font-bold uppercase text-emerald-300">
//                         Owner
//                       </span>
//                     )}
//                   </div>

//                   <div className="flex flex-wrap gap-2">
//                     <button
//                       type="button"
//                       disabled={isCommissioner || isSelf}
//                       onClick={() => {
//                         if (!window.confirm(`Remove ${username} from the group?`)) return;
//                         onRemoveMember({
//                           groupId: group?.id || "",
//                           userId: memberData.user_id ?? "",
//                         });
//                         logAction("remove_member", currentUserId);
//                       }}
//                       className="flex-1 min-w-[120px] rounded-xl border border-red-400/60 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
//                     >
//                       Remove
//                     </button>

//                     {!isCommissioner && (
//                       <button
//                         type="button"
//                         onClick={() => {
//                           if (
//                             !window.confirm(
//                               `Transfer commissioner role to ${username}? You will lose commissioner controls.`
//                             )
//                           )
//                             return;
//                           onTransferCommissioner({
//                             groupId: group?.id || "",
//                             newCommissionerId: memberData.id ?? "",
//                           });
//                           logAction("transfer_commissioner", currentUserId);
//                         }}
//                         className="flex-1 min-w-[120px] rounded-xl border border-emerald-400/60 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-emerald-200 transition hover:bg-emerald-500/20"
//                       >
//                         Make commissioner
//                       </button>
//                     )}
//                   </div>
//                 </div>
//               );
//             })}
//           </div>
//         ) : (
//           /* DESKTOP: Original Table Layout (unchanged visually) */
//           <div className="overflow-x-auto rounded-2xl border border-white/10">
//             <table className="min-w-full text-sm text-white">
//               <thead className="bg-white/5 text-xs uppercase tracking-wide text-gray-400">
//                 <tr>
//                   <th className="px-4 py-3 text-left font-medium">Member</th>
//                   <th className="px-4 py-3 text-left font-medium">Role</th>
//                   <th className="px-4 py-3 text-left font-medium">Actions</th>
//                 </tr>
//               </thead>
//               <tbody className="bg-black/40">
//                 {users?.map((memberData) => {
//                   const isCommissioner = memberData.user_id === group.created_by;
//                   const isSelf = memberData.user_id === currentUserId;

//                   return (
//                     <tr key={memberData.user_id} className="border-t border-white/5">
//                       <td className="px-4 py-3 text-gray-100 uppercase">
//                         {memberData?.profiles?.username ?? memberData.user_id}
//                       </td>
//                       <td className="px-4 py-3 text-xs uppercase tracking-wide">
//                         {isCommissioner ? "commissioner" : "member"}
//                       </td>
//                       <td className="px-4 py-3">
//                         <div className="flex flex-wrap gap-2">
//                           <button
//                             type="button"
//                             disabled={isCommissioner || isSelf}
//                             onClick={() => {
//                               if (
//                                 !window.confirm(
//                                   `Remove ${memberData?.profiles?.username ?? "this user"} from the group?`
//                                 )
//                               )
//                                 return;
//                               onRemoveMember({
//                                 groupId: group?.id || "",
//                                 userId: memberData.user_id ?? "",
//                               });
//                               logAction("remove_member", currentUserId);
//                             }}
//                             className="rounded-2xl border border-red-400/60 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
//                           >
//                             Remove
//                           </button>
//                           {!isCommissioner && (
//                             <button
//                               type="button"
//                               onClick={() => {
//                                 if (
//                                   !window.confirm(
//                                     `Transfer commissioner role to ${memberData?.profiles?.username ?? memberData.user_id ?? "this user"
//                                     }? You will lose commissioner controls.`
//                                   )
//                                 )
//                                   return;
//                                 onTransferCommissioner({
//                                   groupId: group?.id || "",
//                                   newCommissionerId: memberData.id ?? "",
//                                 });
//                                 logAction("transfer_commissioner", currentUserId);
//                               }}
//                               className="rounded-2xl border border-emerald-400/60 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-emerald-200 transition hover:bg-emerald-500/20"
//                             >
//                               Make commissioner
//                             </button>
//                           )}
//                         </div>
//                       </td>
//                     </tr>
//                   );
//                 })}
//               </tbody>
//             </table>
//           </div>
//         )}

//         <p className="text-xs text-gray-500">
//           Removing a member immediately hides this group from their “your groups” list
//           and removes them from the leaderboard display.
//         </p>
//       </section>

//       <DeadlinesOverviewModal
//         open={isDeadlinesModalOpen}
//         onClose={() => setIsDeadlinesModalOpen(false)}
//       />

//       {deleteZoneSection}
//       {deleteModal}
//       {confirmDeleteModal}
//     </div>
//   );
// };

// export default CommissionerTab;


