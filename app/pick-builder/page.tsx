import { Suspense } from "react";
import PickBuilderClientPage from "@/components/pick-builder/PickBuilderClient";
import FootballAnimation from "@/components/animations/FootballAnimation";

export default function PickBuilderPage() {
    return (
        <Suspense fallback={
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
                <div className="w-48 max-w-[70vw] sm:w-60">
                    <FootballAnimation />
                </div>
            </div>
        }>
            <PickBuilderClientPage />
        </Suspense>
    );
}