// "use client";

// import { useMemo, useRef, useState, useEffect } from "react";
// import { ChatMessage, Members } from "@/lib/interfaces/interfaces";

// type UserIdentity = {
//   userId?: string;
// } | null;

// type Props = {
//   messages: ChatMessage[];
//   users: Members;
//   currentUser?: UserIdentity;
//   onSend: (text: string) => void;
// };

// const formatTimestamp = (iso: string) =>
//   new Date(iso).toLocaleTimeString(undefined, {
//     hour: "numeric",
//     minute: "2-digit",
//   });

// export const ChatTab = ({
//   messages,
//   users,
//   currentUser,
//   onSend,
// }: Props) => {
//   const listRef = useRef<HTMLDivElement | null>(null);
//   const [text, setText] = useState("");

//   const sortedMessages = useMemo(
//     () =>
//       [...messages].sort(
//         (a, b) =>
//           new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
//       ),
//     [messages]
//   );

//   useEffect(() => {
//     if (!listRef.current) return;
//     listRef.current.scrollTop = listRef.current.scrollHeight;
//   }, [sortedMessages]);

//   const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
//     event.preventDefault();
//     if (!text.trim()) return;
//     onSend(text);
//     setText("");
//   };

//   return (
//     <section className="flex h-[520px] flex-col rounded-3xl border border-white/10 bg-black/60 shadow-inner">
//       <div
//         ref={listRef}
//         className="flex-1 space-y-3 overflow-y-auto px-5 py-6"
//       >
//         {sortedMessages.length === 0 ? (
//           <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-gray-400">
//             No messages yet — start the chat!
//           </div>
//         ) : (
//           sortedMessages.map((message) => {
//             const sender = users.find((user) => user.user_id === message.sender_id);
//             const isSelf = sender?.user_id === currentUser?.userId;
//             return (
//               <div
//                 key={message.id}
//                 className={`flex flex-col gap-1 ${isSelf ? "items-end" : "items-start"
//                   }`}
//               >
//                 <div
//                   className={`max-w-[80%] rounded-3xl px-4 py-3 text-sm ${isSelf
//                     ? "bg-emerald-500/25 text-emerald-100"
//                     : "bg-white/5 text-gray-100"
//                     }`}
//                 >
//                   {message.text}
//                 </div>
//                 <span className="text-[10px] uppercase tracking-wide text-gray-500">
//                   {sender?.profiles?.username ?? "Unknown"} ·{" "}
//                   {formatTimestamp(message.created_at)}
//                 </span>
//               </div>
//             );
//           })
//         )}
//       </div>
//       <form
//         onSubmit={handleSubmit}
//         className="flex items-center gap-3 border-t border-white/10 bg-black/70 px-5 py-4 rounded-2xl"
//       >
//         <input
//           type="text"
//           value={text}
//           onChange={(event) => setText(event.target.value)}
//           placeholder="drop your take..."
//           className="flex-1 rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400/70"
//         />
//         <button
//           type="submit"
//           className="rounded-2xl bg-emerald-500/25 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-emerald-100 transition hover:bg-emerald-500/35"
//         >
//           send
//         </button>
//       </form>
//     </section>
//   );
// };

// export default ChatTab;
