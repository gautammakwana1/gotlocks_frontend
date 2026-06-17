"use client";

import { Member, Pick, Slip } from "@/lib/interfaces/interfaces";
import SlipSharePreview from "./SlipSharePreview";

type SlipShareModalProps = {
    open: boolean;
    onClose: () => void;
    slip: Slip;
    picks: Pick[];
    members: Member[];
};

const SlipShareModal = ({ open, onClose, slip, picks, members }: SlipShareModalProps) => (
    <SlipSharePreview
        open={open}
        onClose={onClose}
        slip={slip}
        picks={picks}
        members={members}
    />
);

export default SlipShareModal;
