"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { generateProfileImageUrl } from "@/lib/utils/helpers";
import { UserIcon } from "@/components/layout/MainTabBar";
import { supabase } from "@/lib/supabaseClient";
import { useDispatch, useSelector } from "react-redux";
import { fetchGroupChatsByGroupIdRequest, sendMessageRequest, loadOlderGroupChatsRequest, clearOlderGroupChats, deleteMessageByIdRequest } from "@/lib/redux/slices/groupsSlice";
import { ChatMessage, GroupSelector } from "@/lib/interfaces/interfaces";
import { ChatSkeleton } from "../skeletons/leagues/ChatSkeleton";
import { ThreeDotIcon, TrashIcon, CopyIcon } from "../ui/SvgIcons";
import { useToast } from "@/lib/state/ToastContext";

const ChatEmojiPicker = dynamic(() => import("./ChatEmojiPicker"), {
  ssr: false,
  loading: () => null,
});

type Props = {
  groupId?: string;
};

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 639px)");
    const update = () => setIsMobile(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);
  return isMobile;
};

const formatClockTime = (iso: string) =>
  new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

const dayLabel = (iso: string) => {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (sameDay(date, today)) return "Today";
  if (sameDay(date, yesterday)) return "Yesterday";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
};

const MAX_COMPOSER_HEIGHT = 144;

const tabBarReserve = (width: number) => {
  if (width >= 768) return 128; // md: 70px tab scaled 1.45 + gap
  if (width >= 640) return 96; // sm: 70px tab + gap
  return 88; // mobile: 44/56px tab + gap
};
const MIN_CHAT_HEIGHT = 320;

const GROUP_GAP_MS = 5 * 60 * 1000;
const inSameGroup = (a: ChatMessage, b: ChatMessage) =>
  a.sender_id === b.sender_id &&
  Math.abs(new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) <= GROUP_GAP_MS;

const bubbleRadius = (isOwn: boolean, isFirst: boolean, isLast: boolean) =>
  isOwn
    ? `rounded-tl-2xl rounded-bl-2xl ${isFirst ? "rounded-tr-sm" : "rounded-tr-md"} ${isLast ? "rounded-br-2xl" : "rounded-br-md"}`
    : `rounded-tr-2xl rounded-br-2xl ${isFirst ? "rounded-tl-sm" : "rounded-tl-md"} ${isLast ? "rounded-bl-2xl" : "rounded-bl-md"}`;

const authorAccent = (authorId: string): string => {
  const palette = [
    "text-sky-300",
    "text-amber-200",
    "text-fuchsia-300",
    "text-emerald-300",
    "text-rose-300",
    "text-indigo-300",
  ];
  let hash = 0;
  for (let i = 0; i < authorId.length; i += 1) {
    hash = (hash * 31 + authorId.charCodeAt(i)) | 0;
  }
  return palette[Math.abs(hash) % palette.length];
};

const SmileIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.7}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden
  >
    <circle cx="12" cy="12" r="9" />
    <path d="M8 14s1.5 2 4 2 4-2 4-2" />
    <line x1="9" y1="9" x2="9.01" y2="9" />
    <line x1="15" y1="9" x2="15.01" y2="9" />
  </svg>
);

const SendIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden
  >
    <path d="M22 2 11 13" />
    <path d="M22 2 15 22l-4-9-9-4 20-7Z" />
  </svg>
);

const Avatar = ({
  name,
  image,
  size = 36,
}: {
  name: string;
  image?: string | null;
  size?: number;
}) => {
  const src = image ? generateProfileImageUrl(image) : null;
  return (
    <span
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/[0.05] text-[8px] sm:text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-200 ring-1 ring-white/10 ring-inset shadow-[0_2px_8px_-4px_rgba(0,0,0,0.6)]"
      style={{ width: size, height: size }}
      aria-hidden
    >
      {src ? (
        <Image
          src={src}
          alt={name}
          width={size}
          height={size}
          className="h-full w-full object-cover"
          draggable={false}
          unoptimized
        />
      ) : (
        <UserIcon className="h-1/2 w-1/2 text-white/80" />
      )}
    </span>
  );
};

export const GroupChatTab = ({ groupId }: Props) => {
  const dispatch = useDispatch();
  const currentUser = useCurrentUser();
  const chatRootRef = useRef<HTMLElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const emojiButtonRef = useRef<HTMLButtonElement | null>(null);
  const composerRef = useRef<HTMLDivElement | null>(null);
  const isMobile = useIsMobile();
  const { setToast } = useToast();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [isEmojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [actionMenu, setActionMenu] = useState<{ message: ChatMessage; top: number; left: number } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ChatMessage | null>(null);
  const { chatMessages, loadingChats, chatsHasMore, chatsNextCursor, loadingOlderChats, olderChats } =
    useSelector((state: GroupSelector) => state.group);

  const messagesRef = useRef<ChatMessage[]>([]);
  const olderRequestRef = useRef(false);
  const prependRestoreRef = useRef<{ prevHeight: number; prevTop: number } | null>(null);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    if (groupId) {
      dispatch(fetchGroupChatsByGroupIdRequest({ group_id: groupId }));
    }
  }, [groupId]);

  useEffect(() => {
    setMessages([]);
    olderRequestRef.current = false;
    prependRestoreRef.current = null;
  }, [groupId]);

  useEffect(() => {
    if (!chatMessages) return;
    setMessages(chatMessages.map((message) => message));
  }, [chatMessages, currentUser?.userId]);

  useEffect(() => {
    if (!groupId || !currentUser) return;

    const channel = supabase
      .channel(`group-chat-${groupId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "group_messages",
          filter: `group_id=eq.${groupId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const row = payload.new as {
              id?: string;
              group_id?: string;
              sender_id?: string;
              message?: string;
              message_type: "text" | "emoji";
              sender_username: string;
              sender_full_name?: string;
              sender_profile_image?: string;
              created_at?: string;
            };
            if (!row?.id || !row.sender_id) return;

            const realMessage: ChatMessage = {
              id: row.id as string,
              group_id: row.group_id as string,
              message_type: row.message_type,
              sender_id: row.sender_id as string,
              sender_username: row?.sender_username ?? row?.sender_full_name ?? "Member",
              sender_profile_image: row?.sender_profile_image ?? undefined,
              message: row.message ?? "",
              created_at: row.created_at ?? new Date().toISOString(),
              is_deleted: false,
              pending: false,
            };

            setMessages((prev) => {
              // Already reconciled (dedupe duplicate INSERT events).
              if (prev.some((message) => message.id === realMessage.id)) return prev;

              // Reconcile the sender's own optimistic (temp-id) message with the
              // real DB row so its id/created_at match the database UUID.
              if (row.sender_id === currentUser.userId) {
                const pendingIndex = prev.findIndex(
                  (message) =>
                    message.pending &&
                    message.message === realMessage.message &&
                    message.message_type === realMessage.message_type
                );
                if (pendingIndex !== -1) {
                  const nextMessages = [...prev];
                  nextMessages[pendingIndex] = {
                    ...prev[pendingIndex],
                    id: realMessage.id,
                    created_at: realMessage.created_at,
                    pending: false,
                  };
                  return nextMessages;
                }
              }

              return [...prev, realMessage];
            });
          }

          if (payload.eventType === "UPDATE") {
            const row = payload.new as {
              id?: string;
              message?: string;
              is_deleted?: boolean;
              updated_at?: string;
            };
            if (!row?.id) return;

            setMessages((prev) =>
              prev.map((message) =>
                message.id === row.id
                  ? {
                    ...message,
                    message: row.message ?? message.message,
                    is_deleted: row.is_deleted ?? message.is_deleted,
                    updated_at: row.updated_at ?? message.updated_at,
                  }
                  : message
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, currentUser]);

  useLayoutEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    if (prependRestoreRef.current) {
      const { prevHeight, prevTop } = prependRestoreRef.current;
      node.scrollTop = node.scrollHeight - prevHeight + prevTop;
      prependRestoreRef.current = null;
      return;
    }
    node.scrollTop = node.scrollHeight;
  }, [messages.length]);

  const loadOlderMessages = useCallback(() => {
    if (olderRequestRef.current || loadingOlderChats || !chatsHasMore || !chatsNextCursor || !groupId) return;
    olderRequestRef.current = true;
    dispatch(loadOlderGroupChatsRequest({ group_id: groupId, cursor: chatsNextCursor }));
  }, [loadingOlderChats, chatsHasMore, chatsNextCursor, groupId, dispatch]);

  useEffect(() => {
    if (!olderChats) return;
    const prev = messagesRef.current;
    const seen = new Set(prev.map((message) => message.id));
    const fresh = olderChats.filter((message) => !seen.has(message.id));
    if (fresh.length) {
      const node = scrollRef.current;
      if (node) prependRestoreRef.current = { prevHeight: node.scrollHeight, prevTop: node.scrollTop };
      setMessages([...fresh, ...prev]);
    }
    dispatch(clearOlderGroupChats());
  }, [olderChats, dispatch]);

  useEffect(() => {
    if (!loadingOlderChats) olderRequestRef.current = false;
  }, [loadingOlderChats]);

  const handleScroll = useCallback(() => {
    const node = scrollRef.current;
    if (!node) return;
    if (node.scrollTop < 100 && chatsHasMore && !olderRequestRef.current) {
      loadOlderMessages();
    }
  }, [chatsHasMore, loadOlderMessages]);

  const grouped = useMemo(() => {
    const buckets: Array<{ label: string; items: ChatMessage[] }> = [];
    messages.forEach((message) => {
      const label = dayLabel(message.created_at);
      const last = buckets[buckets.length - 1];
      if (last && last.label === label) {
        last.items.push(message);
      } else {
        buckets.push({ label, items: [message] });
      }
    });
    return buckets.map((bucket) => ({
      label: bucket.label,
      items: bucket.items.map((message, index, items) => ({
        message,
        isFirstInGroup: index === 0 || !inSameGroup(items[index - 1], message),
        isLastInGroup: index === items.length - 1 || !inSameGroup(message, items[index + 1]),
      })),
    }));
  }, [messages]);

  const handleSend = () => {
    const text = draft.trim();
    if (!text || !currentUser || !groupId) return;
    const next: ChatMessage = {
      id: `temp-${Date.now()}`,
      group_id: groupId,
      sender_id: currentUser.userId,
      sender_username: currentUser.username || "Message",
      message: text,
      message_type: "text",
      created_at: new Date().toISOString(),
      is_deleted: false,
      pending: true,
    };
    setMessages((prev) => [...prev, next]);
    setDraft("");
    if (groupId && text) {
      dispatch(sendMessageRequest({ group_id: groupId, message: text }));
    }
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const openActionMenu = useCallback((message: ChatMessage, rect: DOMRect) => {
    const MENU_W = 176;
    const MENU_H = 96;
    let left = rect.right - MENU_W;
    left = Math.max(8, Math.min(left, window.innerWidth - MENU_W - 8));
    let top = rect.bottom + 6;
    if (top + MENU_H > window.innerHeight) top = Math.max(8, rect.top - MENU_H - 6);
    setActionMenu({ message, top, left });
  }, []);

  const handleCopy = useCallback(
    async (message: ChatMessage) => {
      setActionMenu(null);
      const text = message.message ?? "";
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(text);
        } else {
          const ta = document.createElement("textarea");
          ta.value = text;
          ta.setAttribute("readonly", "");
          ta.style.position = "absolute";
          ta.style.left = "-9999px";
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          document.body.removeChild(ta);
        }
        setToast({ id: Date.now(), type: "success", message: "Message copied.", duration: 2500 });
      } catch {
        setToast({ id: Date.now(), type: "error", message: "Unable to copy message.", duration: 2500 });
      }
    },
    [setToast]
  );

  const confirmDelete = useCallback(() => {
    const message = pendingDelete;
    if (!message || !groupId) return;
    setMessages((prev) =>
      prev.map((item) =>
        item.id === message.id
          ? { ...item, is_deleted: true, updated_at: new Date().toISOString() }
          : item
      )
    );
    dispatch(deleteMessageByIdRequest({ chat_id: message.id, group_id: groupId }));
    setPendingDelete(null);
  }, [pendingDelete, groupId, dispatch]);

  useEffect(() => {
    if (!actionMenu) return;
    const close = () => setActionMenu(null);
    const node = scrollRef.current;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActionMenu(null);
    };
    node?.addEventListener("scroll", close, { passive: true });
    window.addEventListener("resize", close);
    document.addEventListener("keydown", onKey);
    return () => {
      node?.removeEventListener("scroll", close);
      window.removeEventListener("resize", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [actionMenu]);

  const insertEmoji = useCallback(
    (native: string) => {
      const el = inputRef.current;
      const start = el?.selectionStart ?? draft.length;
      const end = el?.selectionEnd ?? draft.length;
      setDraft(draft.slice(0, start) + native + draft.slice(end));
      requestAnimationFrame(() => {
        el?.focus();
        const pos = start + native.length;
        el?.setSelectionRange(pos, pos);
      });
      if (isMobile) setEmojiPickerOpen(false);
    },
    [draft, isMobile]
  );

  const closeEmojiPicker = useCallback(() => {
    setEmojiPickerOpen(false);
    emojiButtonRef.current?.focus();
  }, []);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    const resize = () => {
      el.style.height = "auto";
      const next = Math.min(el.scrollHeight, MAX_COMPOSER_HEIGHT);
      el.style.height = `${next}px`;
      el.style.overflowY = el.scrollHeight > MAX_COMPOSER_HEIGHT ? "auto" : "hidden";
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [draft]);

  // Lock page scroll while the Chat tab is open so only the message list scrolls
  // and the composer stays pinned above the MainTabBar. Locking <html> (not just
  // <body>) keeps the page frozen even when ChatEmojiPicker toggles body overflow.
  // useEffect(() => {
  //   window.scrollTo(0, 0);
  //   const docEl = document.documentElement;
  //   const body = document.body;
  //   const prevDocOverflow = docEl.style.overflow;
  //   const prevBodyOverflow = body.style.overflow;
  //   docEl.style.overflow = "hidden";
  //   body.style.overflow = "hidden";
  //   return () => {
  //     docEl.style.overflow = prevDocOverflow;
  //     body.style.overflow = prevBodyOverflow;
  //   };
  // }, []);

  useEffect(() => {
    const el = chatRootRef.current;
    if (!el) return;
    const fit = () => {
      const top = el.getBoundingClientRect().top;
      const available = window.innerHeight - top - tabBarReserve(window.innerWidth);
      el.style.height = `${Math.max(available, MIN_CHAT_HEIGHT)}px`;
    };
    fit();
    window.addEventListener("resize", fit);
    window.addEventListener("orientationchange", fit);
    return () => {
      window.removeEventListener("resize", fit);
      window.removeEventListener("orientationchange", fit);
    };
  }, [messages.length]);

  const canSend = draft.trim().length > 0 && Boolean(currentUser);

  return (
    <section
      ref={chatRootRef}
      className="flex min-h-0 flex-col overflow-hidden sm:rounded-lg sm:border sm:border-white/10 bg-black/40 shadow-inner"
    >
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="leaderboard-scroll flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-1 py-5 sm:px-1"
      >
        {loadingChats && <ChatSkeleton />}
        {grouped.map((bucket) => (
          <div key={bucket.label} className="flex flex-col">
            <div className="mb-3 flex justify-center">
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-400">
                {bucket.label}
              </span>
            </div>
            {bucket.items.map(({ message, isFirstInGroup, isLastInGroup }, index) => (
              <MessageRow
                key={message.id}
                message={message}
                currentUserId={currentUser?.userId}
                isFirstInGroup={isFirstInGroup}
                isLastInGroup={isLastInGroup}
                marginClass={index === 0 ? "" : isFirstInGroup ? "mt-3" : "mt-0.5"}
                onOpenMenu={openActionMenu}
              />
            ))}
          </div>
        ))}
      </div>

      <div ref={composerRef} className="relative border-y border-white/10 bg-black/40 px-3 py-3 backdrop-blur sm:px-4">
        {isEmojiPickerOpen && (
          <ChatEmojiPicker
            isMobile={isMobile}
            anchorRef={emojiButtonRef}
            composerRef={composerRef}
            onClose={closeEmojiPicker}
            onSelect={insertEmoji}
          />
        )}
        <div className="flex items-center gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.08] via-white/[0.04] to-white/[0.02] px-3.5 py-2 backdrop-blur transition-all duration-200 hover:border-white/20 focus-within:border-sky-400/60 focus-within:shadow-[0_0_0_3px_rgba(59,130,246,0.12)]">
            <textarea
              ref={inputRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              rows={1}
              style={{ overflowWrap: "anywhere", wordBreak: "break-word" }}
              className="ui-input-accent no-focus-ring leaderboard-scroll block min-h-[24px] max-h-[144px] flex-1 resize-none whitespace-pre-wrap break-words bg-transparent py-0 text-base leading-6 text-white placeholder:text-gray-500 outline-none"
            />
            <button
              ref={emojiButtonRef}
              type="button"
              onClick={() => setEmojiPickerOpen((open) => !open)}
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition hover:bg-white/5 hover:text-sky-200 ${isEmojiPickerOpen ? "bg-white/5 text-sky-300" : "text-gray-400"
                }`}
              aria-label="Add emoji"
              aria-haspopup="dialog"
              aria-expanded={isEmojiPickerOpen}
            >
              <SmileIcon className="h-5 w-5" />
            </button>
          </div>
          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={handleSend}
              disabled={!canSend}
              className="ui-accent-button flex h-11 w-11 shrink-0 items-center justify-center rounded-full shadow-[0_0_18px_-2px_rgba(59,130,246,0.45)] transition-all duration-200 hover:scale-105 hover:shadow-[0_0_24px_-2px_rgba(59,130,246,0.6)] active:scale-95 focus-visible:ring-2 focus-visible:ring-sky-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:hover:scale-100"
              aria-label="Send message"
            >
              <SendIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {actionMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onMouseDown={() => setActionMenu(null)}
            onTouchStart={() => setActionMenu(null)}
            aria-hidden
          />
          <div
            role="menu"
            className="fixed z-50 w-44 overflow-hidden rounded-2xl border border-white/10 bg-black/90 p-1.5 text-sm text-white shadow-xl backdrop-blur"
            style={{ top: actionMenu.top, left: actionMenu.left }}
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => handleCopy(actionMenu.message)}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-gray-100 transition hover:bg-white/10"
            >
              <CopyIcon />
              Copy
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                const message = actionMenu.message;
                setActionMenu(null);
                setPendingDelete(message);
              }}
              className="mt-0.5 flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-red-300 transition hover:bg-red-500/15"
            >
              <TrashIcon className="h-4 w-4" />
              Delete message
            </button>
          </div>
        </>
      )}

      {pendingDelete && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setPendingDelete(null);
          }}
        >
          <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-black p-5 shadow-2xl">
            <div className="space-y-4">
              <div className="space-y-1 text-center">
                <h3 className="text-base font-semibold text-white">Delete message?</h3>
                <p className="text-xs text-gray-400">
                  This message will be removed for everyone. This action cannot be undone.
                </p>
              </div>
              <div className="flex justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setPendingDelete(null)}
                  className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-gray-200 transition hover:border-white/30 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  className="rounded-xl border border-red-400/60 bg-red-500/20 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-red-100 transition hover:border-red-300/80 hover:text-white"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

const ProhibitIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.7}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden
  >
    <circle cx="12" cy="12" r="9" />
    <line x1="5.6" y1="5.6" x2="18.4" y2="18.4" />
  </svg>
);

const DeletedMessageNote = () => (
  <span className="inline-flex items-center gap-1.5 italic text-gray-400">
    <ProhibitIcon className="h-3.5 w-3.5 shrink-0 opacity-70" />
    This message was deleted
  </span>
);

const MessageRow = ({
  message,
  currentUserId,
  isFirstInGroup,
  isLastInGroup,
  marginClass,
  onOpenMenu,
}: {
  message: ChatMessage;
  currentUserId?: string;
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
  marginClass: string;
  onOpenMenu?: (message: ChatMessage, rect: DOMRect) => void;
}) => {
  const isOwnMessage = Boolean(currentUserId && message.sender_id === currentUserId);
  const isDeleted = message.is_deleted;
  const canAct = Boolean(onOpenMenu) && !isDeleted && !message.pending;
  const timeIso = isDeleted ? message.updated_at ?? message.created_at : message.created_at;
  const bubbleRef = useRef<HTMLDivElement | null>(null);
  const pressTimer = useRef<number | null>(null);

  const clearPress = () => {
    if (pressTimer.current) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  // Long-press (touch) opens the actions menu on mobile / tablet.
  const handleTouchStart = () => {
    if (!canAct) return;
    clearPress();
    pressTimer.current = window.setTimeout(() => {
      const rect = bubbleRef.current?.getBoundingClientRect();
      if (rect) onOpenMenu?.(message, rect);
    }, 450);
  };

  if (isOwnMessage) {
    return (
      <div className={`ui-message-in group flex justify-end pl-10 ${marginClass}`}>
        <div
          ref={bubbleRef}
          onTouchStart={canAct ? handleTouchStart : undefined}
          onTouchEnd={canAct ? clearPress : undefined}
          onTouchMove={canAct ? clearPress : undefined}
          onContextMenu={canAct ? (event) => event.preventDefault() : undefined}
          style={{ overflowWrap: "anywhere", wordBreak: "break-word", WebkitTouchCallout: "none" }}
          className={`relative flex min-w-0 max-w-[75%] flex-col gap-1 border px-3.5 py-2 text-[12px] sm:text-sm ${
            isDeleted
              ? "border-white/10 bg-white/[0.05] text-gray-400"
              : "border-sky-400/30 bg-gradient-to-br from-sky-500/30 via-blue-500/20 to-blue-600/15 text-sky-50 shadow-[0_8px_28px_-16px_rgba(59,130,246,0.7)]"
          } [@media(pointer:coarse)]:select-none ${bubbleRadius(
            true,
            isFirstInGroup,
            isLastInGroup
          )}`}
        >
          {canAct && (
            <button
              type="button"
              onClick={(event) => onOpenMenu?.(message, event.currentTarget.getBoundingClientRect())}
              className="absolute right-full top-1/2 mr-1 hidden h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-gray-400 opacity-0 transition hover:bg-white/10 hover:text-white focus-visible:opacity-100 group-hover:opacity-100 sm:flex"
              aria-label="Message actions"
              aria-haspopup="menu"
            >
              <ThreeDotIcon vertical={true} />
            </button>
          )}
          <p className="whitespace-pre-wrap">
            {isDeleted ? <DeletedMessageNote /> : message.message}
          </p>
          <span className={`self-end text-[8px] sm:text-[10px] font-medium leading-none ${isDeleted ? "text-gray-500" : "text-sky-100/60"}`}>
            {formatClockTime(timeIso)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`ui-message-in flex items-start gap-2.5 pr-10 ${marginClass}`}>
      {isFirstInGroup ? (
        <Avatar name={message.sender_username} image={message.sender_profile_image} />
      ) : (
        <span className="w-9 shrink-0" aria-hidden />
      )}
      <div
        className={`flex min-w-0 max-w-[78%] flex-col gap-1 border px-3.5 py-2 text-[12px] sm:text-sm ${
          isDeleted
            ? "border-white/10 bg-white/[0.03] text-gray-400"
            : "border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.035] text-gray-100 shadow-[0_4px_16px_-8px_rgba(0,0,0,0.6)]"
        } ${bubbleRadius(
          false,
          isFirstInGroup,
          isLastInGroup
        )}`}
      >
        {isFirstInGroup && (
          <span className={`text-[13px] font-semibold leading-tight ${authorAccent(message.sender_id)}`}>
            {message.sender_username}
          </span>
        )}
        <p className="whitespace-pre-wrap" style={{ overflowWrap: "anywhere", wordBreak: "break-word" }}>
          {isDeleted ? <DeletedMessageNote /> : message.message}
        </p>
        <span className="self-end text-[8px] sm:text-[10px] font-medium leading-none text-gray-400/70">
          {formatClockTime(timeIso)}
        </span>
      </div>
    </div>
  );
};

export default GroupChatTab;
