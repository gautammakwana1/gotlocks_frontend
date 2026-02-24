import { Suspense } from "react";
import PickBuilderClientPage from "@/components/pick-builder/PickBuilderClient";

export default function PickBuilderPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <PickBuilderClientPage />
        </Suspense>
    );
}