"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppDispatch } from "../../lib/redux/hooks";
import type { Group } from "@/lib/interfaces/interfaces";
import { clearCreateGroupMessage, createGroupRequest } from "@/lib/redux/slices/groupsSlice";
import { useSelector } from "react-redux";
import { useToast } from "@/lib/state/ToastContext";
import { GroupSelector } from "@/lib/interfaces/interfaces";
import BackButton from "@/components/ui/BackButton";
import FootballAnimation from "@/components/animations/FootballAnimation";
import { greenGradientBox } from "@/lib/styles/containers";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";

const CagFormPage = () => {
  const router = useRouter();
  const currentUser = useCurrentUser();
  const dispatch = useAppDispatch();
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const { setToast } = useToast();

  const [form, setForm] = useState({
    name: "",
    description: "",
  });

  const { group, error, message, loading } = useSelector(
    (state: GroupSelector) => state?.group
  );


  useEffect(() => {
    if (group && group.id && group.invite_code) {
      setCreatedId(group.id);
      setInviteCode(group.invite_code);
    }
  }, [group]);

  const showSuccess = createdId && inviteCode;

  useEffect(() => {
    if (!loading && message) {
      setToast({
        id: Date.now(),
        type: "success",
        message,
        duration: 3000,
      });
    }

    if (!loading && error) {
      setToast({
        id: Date.now(),
        type: "error",
        message: error,
        duration: 3000,
      });
    }
    dispatch(clearCreateGroupMessage());
  }, [message, error, loading, setToast, dispatch]);

  const handleCreate = () => {
    if (!currentUser) {
      router.push("/landing-page");
      return;
    }
    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
    };
    const newGroup: Group = {
      name: payload.name,
      description: payload.description,
      is_enable_secondary_leaderboard: false
    };
    dispatch(createGroupRequest(newGroup));
  };

  const handleCopyCode = async () => {
    if (!inviteCode) return;
    try {
      await navigator.clipboard.writeText(inviteCode);
      setToast({
        id: Date.now(),
        type: "success",
        message: "Invite code copied.",
        duration: 3000
      });
    } catch {
      setToast({
        id: Date.now(),
        type: "error",
        message: "Could not copy invite code.",
        duration: 3000
      });
    }
  };

  if (loading || !currentUser) {
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-48 max-w-[70vw] sm:w-60">
        <FootballAnimation />
      </div>
    </div>
  }

  return (
    <>
      <div className="flex flex-col gap-8 text-white">
        <div className="flex items-center justify-between text-xs uppercase tracking-wide text-gray-500">
          {showSuccess ? (
            <span className="ml-auto" >Group created</span>
          ) : (
            <>
              <BackButton fallback="/home" />
              <span>Group Creation</span>
            </>
          )}
        </div>

        {!showSuccess && (
          <div className={`${greenGradientBox} p-6`}>
            <h1 className="text-2xl font-semibold text-white">Create a group</h1>
            <p className="mt-2 text-sm text-gray-400">
              Groups can host multiple slips at once. Create the group, share the code, and
              start opening slips whenever you’re ready.
            </p>

            <div className="mt-6 flex flex-col gap-4">
              <label className="flex flex-col gap-2">
                <span className="text-xs uppercase tracking-wide text-gray-400">
                  group name
                </span>
                <input
                  value={form.name}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                  className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400/70"
                  placeholder="Sunday Locks"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-xs uppercase tracking-wide text-gray-400">
                  description (optional)
                </span>
                <textarea
                  value={form.description}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, description: event.target.value }))
                  }
                  className="min-h-[96px] rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400/70"
                  placeholder="Multi-sport slips, leaderboard or just for vibes."
                />
              </label>

              <button
                type="button"
                onClick={handleCreate}
                disabled={!form.name.trim()}
                className="self-start rounded-2xl bg-emerald-500/25 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-emerald-100 transition hover:bg-emerald-500/35 disabled:cursor-not-allowed disabled:opacity-40"
              >
                create group
              </button>
            </div>
          </div>
        )}

        {showSuccess && createdId && inviteCode && (
          <div className={`${greenGradientBox} space-y-4 p-6 text-sm text-gray-300`}>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Group ready</h2>
              <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-emerald-100">
                <span className="text-emerald-100/70">code</span>
                <span className="text-sm font-semibold text-white">{inviteCode}</span>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="rounded-lg border border-emerald-400/40 bg-emerald-500/10 p-2 text-emerald-100 transition hover:border-emerald-300/70 hover:text-white"
                  aria-label="Copy invite code"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                </button>
              </div>
            </div>
            <p>
              Share the invite code above to bring your crew in. Once they join, head to
              the Group Dashboard to create slips and open them for picks. When games
              finish, review the slip, adjust grading if needed, and publish results to
              the leaderboard.
            </p>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => router.push(`/group/${createdId}`)}
                className="rounded-2xl border border-emerald-400/50 bg-gradient-to-br from-emerald-500/35 via-emerald-400/15 to-black/40 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-emerald-100 transition hover:border-emerald-300/70 hover:text-white"
              >
                go to group
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default CagFormPage;
