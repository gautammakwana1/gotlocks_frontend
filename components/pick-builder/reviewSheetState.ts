import { BuiltPickPayload, ConfidenceLevel } from "@/lib/interfaces/interfaces";
import type { Dispatch, SetStateAction } from "react";

export type ReviewSheetState = {
    collapsedSections: Record<string, boolean>;
    setCollapsedSections: Dispatch<SetStateAction<Record<string, boolean>>>;
    isOpen: boolean;
    setIsOpen: Dispatch<SetStateAction<boolean>>;
    selectedConfidence: ConfidenceLevel | null;
    setSelectedConfidence: Dispatch<SetStateAction<ConfidenceLevel | null>>;
    sameGameComboConfidences: Record<string, ConfidenceLevel | null>;
    setSameGameComboConfidences: Dispatch<
        SetStateAction<Record<string, ConfidenceLevel | null>>
    >;
    straightConfidences: Record<string, ConfidenceLevel | null>;
    setStraightConfidences: Dispatch<
        SetStateAction<Record<string, ConfidenceLevel | null>>
    >;
};

export type CachedReviewData = {
    payload: BuiltPickPayload;
    summary?: string;
    odds?: string;
    sourceTabLabel: string;
};
