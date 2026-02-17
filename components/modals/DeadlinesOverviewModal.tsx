import { useEffect } from "react";

type DeadlinesOverviewModalProps = {
    open: boolean;
    onClose: () => void;
};

const DeadlinesOverviewModal = ({ open, onClose }: DeadlinesOverviewModalProps) => {
    useEffect(() => {
        if (!open) return;
        const handler = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                onClose();
            }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 py-8"
            role="dialog"
            aria-modal="true"
            aria-labelledby="deadlines-overview-title"
            onClick={onClose}
        >
            <div
                className="max-h-full w-full max-w-3xl overflow-hidden rounded-3xl border border-white/10 bg-black/85 shadow-2xl backdrop-blur"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="flex items-start justify-between gap-4 border-b border-white/10 px-6 py-4">
                    <div className="space-y-1">
                        <h2 id="deadlines-overview-title" className="text-lg font-semibold text-white">
                            Deadlines &amp; grading overview
                        </h2>
                        <p className="text-xs text-gray-400">
                            Quick refresher on how deadlines, grading, and slips stay in sync.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full border border-white/15 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-gray-300 transition hover:border-white/35 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
                        aria-label="Close deadlines and grading overview"
                    >
                        X
                    </button>
                </div>

                <div className="max-h-[70vh] space-y-6 overflow-y-auto px-6 py-6 text-sm text-gray-300">
                    <section className="space-y-2">
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-emerald-200">
                            What are deadlines and why do we need them?
                        </h3>
                        <p>
                            Deadlines are a light way to enforce the rules for your contest. They make sure
                            everyone is playing on the same schedule and that each slip can be graded and
                            closed out cleanly.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-emerald-200">
                            Pick deadline
                        </h3>
                        <p>
                            The <strong>pick deadline</strong> is the cutoff time for everyone in the group to
                            submit their picks.
                        </p>
                        <ul className="list-disc space-y-2 pl-5">
                            <li>
                                All members must have their picks in <strong>before the pick deadline</strong>.
                            </li>
                            <li>
                                Once the deadline passes, the slip is <strong>locked</strong> so picks are set
                                before games begin.
                            </li>
                            <li>
                                For example, in an NFL group you might set a deadline before the Sunday games so
                                everyone is locked in ahead of kickoff.
                            </li>
                            <li>
                                If these timings don&#39;t work for your group, you can <strong>adjust the pick deadline</strong> to match
                                your sport, timezone, or even daily-style slips.
                            </li>
                        </ul>
                    </section>

                    <section className="space-y-3">
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-emerald-200">
                            Results deadline
                        </h3>
                        <p>
                            After picks are locked and games start, the <strong>grading window</strong> opens for
                            the commissioner.
                        </p>
                        <ul className="list-disc space-y-2 pl-5">
                            <li>
                                During this time, the commissioner can grade picks using the
                                <strong>&ldquo;Get results&ldquo;</strong> button or by manually updating outcomes in real time.
                            </li>
                            <li>The <strong>results deadline</strong> is the cutoff for finishing grading.</li>
                            <li>
                                By default, it&#39;s set to about <strong>two days after the pick deadline</strong> to
                                give the commissioner enough time to review and grade all picks.
                            </li>
                        </ul>
                        <p>
                            If the default window is too long or too short, you can
                            <strong>customize the results deadline</strong> to fit how your group plays.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-emerald-200">
                            What is the grading window?
                        </h3>
                        <p>
                            The <strong>grading window</strong> is the period between the pick deadline and the
                            results deadline where the commissioner finalizes each slip.
                        </p>
                        <p>During the grading window, the commissioner can:</p>
                        <ul className="list-disc space-y-2 pl-5">
                            <li>See a <strong>consolidated view</strong> of all members&#39; picks.</li>
                            <li>
                                <strong>Lock the slip early</strong> if everyone has submitted and the group has
                                agreed.
                            </li>
                            <li>
                                <strong>Unlock the slip</strong> (before games start) if someone needs to change a
                                pick.
                            </li>
                            <li>
                                <strong>Grade in real time</strong> as games finish, or wait until all games are
                                done and use the auto <strong>&ldquo;Get results&ldquo;</strong> option.
                            </li>
                            <li>
                                <strong>Save results and finalize the slip</strong> to move the contest on to the
                                next week or next slip.
                            </li>
                        </ul>
                        <p>
                            The results deadline exists so a contest is never stuck in grading forever. However,
                            the commissioner is still responsible for reviewing and confirming results so
                            everything stays clean and fair for the group.
                        </p>
                        <p>
                            If a commissioner becomes inactive or isn&#39;t keeping up with grading, the group can
                            ask them to <strong>transfer the commissioner role</strong> to someone else who can
                            manage deadlines and results more reliably.
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default DeadlinesOverviewModal;