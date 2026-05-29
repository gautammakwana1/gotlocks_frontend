"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { generateProfileImageUrl } from "@/lib/utils/helpers";
import { UserIcon } from "@/components/layout/MainTabBar";

type ChatMessage = {
  id: string;
  authorId: string;
  authorName: string;
  authorImage?: string | null;
  body: string;
  createdAt: string;
  outgoing?: boolean;
};

type Props = {
  groupId?: string;
};

const SEED_MESSAGES: ChatMessage[] = [
  {
    id: "seed-1",
    authorId: "alice",
    authorName: "Alice",
    body: "Hey everyone! 👋",
    createdAt: new Date(new Date().setHours(10, 30, 0, 0)).toISOString(),
  },
  {
    id: "seed-2",
    authorId: "me",
    authorName: "You",
    body: "Hi Alice! How's it going?",
    createdAt: new Date(new Date().setHours(10, 31, 0, 0)).toISOString(),
    outgoing: true,
  },
  {
    id: "seed-3",
    authorId: "bob",
    authorName: "Bob",
    body: "Good morning all 🌞",
    createdAt: new Date(new Date().setHours(10, 32, 0, 0)).toISOString(),
  },
  {
    id: "seed-4",
    authorId: "charlie",
    authorName: "Charlie",
    body: "Let's win this contest! 💪",
    createdAt: new Date(new Date().setHours(10, 33, 0, 0)).toISOString(),
  },
];

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

const PaperclipIcon = ({ className }: { className?: string }) => (
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
    <path d="m21 12-8.5 8.5a5.5 5.5 0 0 1-7.78-7.78l9-9a3.7 3.7 0 1 1 5.23 5.23l-9 9a1.85 1.85 0 1 1-2.62-2.62l8.3-8.3" />
  </svg>
);

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
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/[0.05] text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-200"
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
  const currentUser = useCurrentUser();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>(SEED_MESSAGES);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    setMessages(SEED_MESSAGES);
  }, [groupId]);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages.length]);

  const grouped = useMemo(() => {
    const buckets: Array<{ label: string; items: ChatMessage[] }> = [];
    messages.forEach((message) => {
      const label = dayLabel(message.createdAt);
      const last = buckets[buckets.length - 1];
      if (last && last.label === label) {
        last.items.push(message);
      } else {
        buckets.push({ label, items: [message] });
      }
    });
    return buckets;
  }, [messages]);

  const handleSend = () => {
    const text = draft.trim();
    if (!text || !currentUser) return;
    const next: ChatMessage = {
      id: `${Date.now()}`,
      authorId: currentUser.userId,
      authorName: currentUser.username || "You",
      body: text,
      createdAt: new Date().toISOString(),
      outgoing: true,
    };
    setMessages((prev) => [...prev, next]);
    setDraft("");
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const canSend = draft.trim().length > 0 && Boolean(currentUser);

  return (
    <section className="flex flex-col overflow-hidden rounded-lg border border-white/10 bg-black/40 shadow-inner">
      <div
        ref={scrollRef}
        className="leaderboard-scroll flex max-h-[60vh] min-h-[420px] flex-col gap-5 overflow-y-auto px-4 py-5 sm:px-5"
      >
        {grouped.map((bucket) => (
          <div key={bucket.label} className="flex flex-col gap-4">
            <div className="flex justify-center">
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-400">
                {bucket.label}
              </span>
            </div>
            {bucket.items.map((message) => (
              <MessageRow key={message.id} message={message} />
            ))}
          </div>
        ))}
      </div>

      <div className="border-t border-white/10 bg-black/60 px-3 py-3 sm:px-4">
        <div className="flex items-end gap-2">
          <div className="flex flex-1 items-end gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 transition focus-within:border-sky-400/60">
            <textarea
              ref={inputRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              rows={1}
              className="ui-input-accent min-h-[24px] max-h-32 flex-1 resize-none bg-transparent text-sm text-white placeholder:text-gray-500 outline-none"
            />
            <button
              type="button"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-400 transition hover:text-sky-200"
              aria-label="Add emoji"
              tabIndex={-1}
            >
              <SmileIcon className="h-5 w-5" />
            </button>
          </div>
          <button
            type="button"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-gray-300 transition hover:border-white/25 hover:text-white"
            aria-label="Attach file"
            tabIndex={-1}
          >
            <PaperclipIcon className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={!canSend}
            className="ui-accent-button flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Send message"
          >
            <SendIcon className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-2 px-1 text-[10px] uppercase tracking-[0.16em] text-gray-600">
          Press Enter to send • Shift + Enter for a new line
        </p>
      </div>
    </section>
  );
};

const MessageRow = ({ message }: { message: ChatMessage }) => {
  if (message.outgoing) {
    return (
      <div className="flex items-end justify-end gap-2">
        <div className="flex max-w-[78%] flex-col items-end gap-1">
          <div className="rounded-2xl rounded-br-md border border-sky-400/30 bg-sky-500/20 px-3 py-2 text-sm text-sky-50 shadow-[0_8px_24px_-18px_rgba(59,130,246,0.6)]">
            <p className="whitespace-pre-wrap break-words">{message.body}</p>
          </div>
          <span className="px-1 text-[10px] uppercase tracking-[0.14em] text-gray-500">
            {formatClockTime(message.createdAt)}
          </span>
        </div>
        <Avatar name={message.authorName} image={message.authorImage} />
      </div>
    );
  }

  return (
    <div className="flex items-end gap-2">
      <Avatar name={message.authorName} image={message.authorImage} />
      <div className="flex max-w-[78%] flex-col items-start gap-1">
        <span
          className={`px-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${authorAccent(
            message.authorId
          )}`}
        >
          {message.authorName}
        </span>
        <div className="rounded-2xl rounded-bl-md border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-gray-100">
          <p className="whitespace-pre-wrap break-words">{message.body}</p>
        </div>
        <span className="px-1 text-[10px] uppercase tracking-[0.14em] text-gray-500">
          {formatClockTime(message.createdAt)}
        </span>
      </div>
    </div>
  );
};

export default GroupChatTab;
