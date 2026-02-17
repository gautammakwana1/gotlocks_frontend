"use client";

import BackButton from "@/components/ui/BackButton";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { useRouter } from "next/navigation";

const CagExplainedPage = () => {
  const currentUser = useCurrentUser();
  const router = useRouter();

  if (!currentUser) return null;
  return (
    <div className="flex flex-col gap-8 text-gray-200">
      <div className="flex items-center justify-between text-xs uppercase tracking-wide text-gray-500">
        <BackButton />
        <span>Group Creation</span>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/20">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-200">step 1</p>
          <h2 className="mt-2 text-lg font-semibold text-white">Create your league</h2>
          <p className="mt-2 text-sm text-gray-300">
            Name your group and add a quick description. You’ll be the commissioner, with a few extra controls to manage the league.
          </p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/20">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-200">step 2</p>
          <h2 className="mt-2 text-lg font-semibold text-white">Share the code</h2>
          <p className="mt-2 text-sm text-gray-300">
            Your invite code is ready instantly. Send it to friends so they can join right away.
          </p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/20">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-200">step 3</p>
          <h2 className="mt-2 text-lg font-semibold text-white">Start scoring</h2>
          <p className="mt-2 text-sm text-gray-300">
            Kick off a slip and add your picks. When the games finish, picks get graded and points hit the leaderboard. Bragging rights? Earned.
          </p>
        </div>
      </section>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => router.push("/cag-form")}
          className="rounded-2xl border border-emerald-400/50 bg-gradient-to-br from-emerald-500/35 via-emerald-400/15 to-black/40 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-emerald-100 transition hover:border-emerald-300/70 hover:text-white"
        >
          get started
        </button>
      </div>
    </div>
  );
};

export default CagExplainedPage;
