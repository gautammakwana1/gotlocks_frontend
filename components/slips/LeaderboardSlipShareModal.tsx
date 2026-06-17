"use client";

import { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Member, RootState } from "@/lib/interfaces/interfaces";
import { fetchSlipByIdRequest } from "@/lib/redux/slices/slipSlice";
import { fetchAllPicksRequest } from "@/lib/redux/slices/pickSlice";
import SlipSharePreview from "./SlipSharePreview";

type LeaderboardSlipShareModalProps = {
    open: boolean;
    onClose: () => void;
    slipId: string;
    members: Member[];
};

const LeaderboardSlipShareModal = ({
    open,
    onClose,
    slipId,
    members,
}: LeaderboardSlipShareModalProps) => {
    const dispatch = useDispatch();
    const slips = useSelector((state: RootState) => state.slip.slips);
    const picksList = useSelector((state: RootState) => state.pick.picks);

    useEffect(() => {
        if (!open || !slipId) return;
        dispatch(fetchSlipByIdRequest({ slip_id: slipId }));
        dispatch(fetchAllPicksRequest({ slip_id: slipId }));
    }, [open, slipId, dispatch]);

    const slip = useMemo(
        () => slips?.find((candidate) => candidate.id === slipId) ?? null,
        [slips, slipId]
    );
    const picks = useMemo(
        () => (picksList ?? []).filter((pick) => pick.slip_id === slipId),
        [picksList, slipId]
    );

    return (
        <SlipSharePreview
            open={open}
            onClose={onClose}
            slip={slip}
            picks={picks}
            members={members}
            loading={!slip}
        />
    );
};

export default LeaderboardSlipShareModal;
