"use client";

const BadgesStrip = () => {
    const placeholders = ["Locked badge", "Locked badge", "Locked badge"];

    return (
        <section className="space-y-4 rounded-3xl border border-[var(--border-soft)] bg-[var(--surface-1)] p-5 shadow-[var(--shadow-soft)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
                        badges
                    </p>
                    <p className="text-sm text-[var(--text-secondary)]">
                        Showcase milestone badges and streaks. Coming soon.
                    </p>
                </div>
                <button
                    type="button"
                    disabled
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-wide text-[var(--text-secondary)]"
                >
                    View all
                </button>
            </div>

            <div className="flex flex-wrap gap-2">
                {placeholders.map((label, index) => (
                    <span
                        key={`${label}-${index}`}
                        className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-wide text-[var(--text-secondary)]"
                    >
                        {label}
                    </span>
                ))}
            </div>
        </section>
    );
};

export default BadgesStrip;
