
type SkeletonRow = {
    outgoing: boolean;
    width: string;
    cont?: boolean;
    corners: string;
};

const SKELETON_ROWS: SkeletonRow[] = [
    { outgoing: false, width: "w-40 sm:w-52", corners: "rounded-2xl rounded-tl-sm rounded-bl-md" },
    { outgoing: false, width: "w-28 sm:w-36", cont: true, corners: "rounded-2xl rounded-tl-md" },
    { outgoing: true, width: "w-32 sm:w-44", corners: "rounded-2xl rounded-tr-sm" },
    { outgoing: false, width: "w-44 sm:w-60", corners: "rounded-2xl rounded-tl-sm" },
    { outgoing: true, width: "w-36 sm:w-48", corners: "rounded-2xl rounded-tr-sm" },
];

export const ChatSkeleton = () => (
    <div className="flex animate-pulse flex-col">
        <div className="mb-3 flex justify-center">
            <div className="h-5 w-16 rounded-full bg-white/[0.06]" />
        </div>
        {SKELETON_ROWS.map((row, index) =>
            row.outgoing ? (
                <div key={index} className={`flex justify-end pl-10 ${index === 0 ? "" : "mt-3"}`}>
                    <div className={`h-12 ${row.width} max-w-[75%] bg-sky-500/15 ${row.corners}`} />
                </div>
            ) : (
                <div key={index} className={`flex items-start gap-2.5 pr-10 ${index === 0 ? "" : row.cont ? "mt-0.5" : "mt-3"}`}>
                    {row.cont ? (
                        <span className="w-9 shrink-0" aria-hidden />
                    ) : (
                        <div className="h-9 w-9 shrink-0 rounded-full bg-white/[0.06]" />
                    )}
                    <div className="flex max-w-[78%] flex-col items-start">
                        {!row.cont && <div className="mb-1 h-3 w-20 rounded bg-white/[0.08]" />}
                        <div className={`h-12 ${row.width} max-w-full bg-white/[0.05] ${row.corners}`} />
                    </div>
                </div>
            )
        )}
    </div>
);
