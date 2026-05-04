"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppDispatch } from "../../lib/redux/hooks";
import type { Group } from "@/lib/interfaces/interfaces";
import { clearCreateGroupMessage, createGroupRequest } from "@/lib/redux/slices/groupsSlice";
import { useSelector } from "react-redux";
import { useToast } from "@/lib/state/ToastContext";
import { GroupSelector } from "@/lib/interfaces/interfaces";
import BackButton from "@/components/ui/BackButton";
import FootballAnimation from "@/components/animations/FootballAnimation";
import { accentGradientBox } from "@/lib/styles/containers";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { checkAnyRestrictedWords } from "@/lib/utils/helpers";
import { CopyIcon } from "@/components/ui/SvgIcons";

interface FormData {
  name: string;
  description?: string;
}

interface FormErrors {
  name?: string;
  description?: string;
}

const CagFormPage = () => {
  const router = useRouter();
  const currentUser = useCurrentUser();
  const dispatch = useAppDispatch();
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
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

  const validate = useCallback((): boolean => {
    const nextErrors: FormErrors = {};

    if (!form.name?.trim()) {
      nextErrors.name = "Group name is required.";
    }

    if (form.name.length > 25) {
      nextErrors.name = "Group name must be 25 characters or less.";
    }

    if (form.description.length > 50) {
      nextErrors.description = "Group description must be 50 characters or less.";
    }

    const containsNameRestricted = checkAnyRestrictedWords(form.name);
    if (containsNameRestricted) {
      nextErrors.name = "Group name contains inappropriate language.";
    }

    const containsDescriptionRestricted = checkAnyRestrictedWords(form.description || "");
    if (containsDescriptionRestricted) {
      nextErrors.description = "Group description contains inappropriate language.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }, [form]);

  const handleCreate = () => {
    if (!currentUser) {
      router.push("/landing-page");
      return;
    }

    if (!validate()) return;

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

  const handleInputChange = useCallback(
    (field: keyof FormData) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = event.target.value;
      setForm((prev) => ({ ...prev, [field]: value }));

      if (errors[field as keyof FormErrors]) {
        setErrors((prev) => ({ ...prev, [field]: undefined }));
      }
    },
    [errors]
  );

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
            <span className="ml-auto" >League created</span>
          ) : (
            <>
              <BackButton fallback="/home" />
              <span>League Creation</span>
            </>
          )}
        </div>

        {!showSuccess && (
          <div className={`${accentGradientBox} p-6`}>
            <h1 className="text-2xl font-semibold text-white">Create a league</h1>
            <p className="mt-2 text-sm text-gray-400">
              Leagues can host multiple slips at once. Create the league, share the code, and
              start opening slips whenever you’re ready.
            </p>

            <div className="mt-6 flex flex-col gap-4">
              <label className="flex flex-col gap-2">
                <span className="text-xs uppercase tracking-wide text-gray-400">
                  league name
                </span>
                <input
                  value={form.name}
                  onChange={handleInputChange("name")}
                  className="ui-input-accent rounded-2xl border border-white/10 bg-black px-4 py-3 text-base text-white outline-none transition"
                  placeholder="Sunday Locks"
                />
                {errors.name && (
                  <span className="text-xs font-medium text-red-400">
                    {errors.name}
                  </span>
                )}
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-xs uppercase tracking-wide text-gray-400">
                  description (optional)
                </span>
                <textarea
                  value={form.description}
                  onChange={handleInputChange("description")}
                  className="ui-input-accent min-h-[96px] rounded-2xl border border-white/10 bg-black px-4 py-3 text-base text-white outline-none transition"
                  placeholder="Multi-sport slips, leaderboard or just for vibes."
                />
                {errors.description && (
                  <span className="text-xs font-medium text-red-400">
                    {errors.description}
                  </span>
                )}
              </label>

              <button
                type="button"
                onClick={handleCreate}
                disabled={!form.name.trim() || loading}
                className="ui-accent-button self-start rounded-2xl px-6 py-3 text-xs font-semibold uppercase tracking-wide transition disabled:cursor-not-allowed disabled:opacity-40"
              >
                create league
              </button>
            </div>
          </div>
        )}

        {showSuccess && createdId && inviteCode && (
          <div className={`${accentGradientBox} space-y-4 p-6 text-sm text-gray-300`}>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">League ready</h2>
              <div className="ui-accent-text flex items-center gap-2 text-xs uppercase tracking-wide">
                <span className="text-blue-200/70">code</span>
                <span className="text-sm font-semibold text-white">{inviteCode}</span>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="ui-accent-button rounded-lg p-2 transition"
                  aria-label="Copy invite code"
                >
                  <CopyIcon />
                </button>
              </div>
            </div>
            <p>
              Share the invite code above to bring your crew in. Once they join, head to
              the League Dashboard to create slips and open them for picks. When games
              finish, review the slip, adjust grading if needed, and publish results to
              the leaderboard.
            </p>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => router.push(`/league/${createdId}`)}
                className="ui-accent-button rounded-2xl px-5 py-2 text-xs font-semibold uppercase tracking-wide transition"
              >
                go to league
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default CagFormPage;
