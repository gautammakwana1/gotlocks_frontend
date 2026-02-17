"use client";

type ProfileTallyProps = {
    wins: number;
    losses: number;
    pending: number;
};

const ProfileTally = ({
    wins,
    losses,
    pending
}: ProfileTallyProps) => {
    const items = [
        { label: "W", value: wins, tone: "text-emerald-100" },
        { label: "L", value: losses, tone: "text-red-100" },
        { label: "P", value: pending, tone: "text-blue-100" },
    ];

    return (
        <section className="rounded-3xl border border-[var(--border-soft)] bg-[var(--surface-1)] p-4 shadow-[var(--shadow-soft)]">
            <div className="flex flex-wrap gap-2">
                {items.map((item) => (
                    <div
                        key={item.label}
                        className="min-w-[84px] rounded-2xl border border-white/10 bg-white/5 px-3 py-2"
                    >
                        <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
                            {item.label}
                        </p>
                        <p className={`text-lg font-semibold ${item.tone}`}>{item.value}</p>
                    </div>
                ))}
            </div>
        </section>
    );
};

export default ProfileTally;
