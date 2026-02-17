import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CommissionerTab from "../CommissionerTab";
import type { ActiveSlip, Group, Member, Pick } from "@/lib/interfaces/interfaces";

describe("CommissionerTab delete group flow", () => {
    const baseGroup: Group = {
        id: "sunday-locks",
        name: "Sunday Locks",
        sport_type: "nfl",
        invite_code: "JOINME",
        created_by: "u1",
        members: ["u1", "u2"],
        contest_style: "infinite",
        contest_end_date: null,
        active_slip_id: "slip-1",
    };

    const baseSlip: ActiveSlip = {
        id: "slip-1",
        group_id: "sunday-locks",
        index: 1,
        name: "Slip 1",
        pick_deadline_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        results_deadline_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        status: "open",
    };

    const users: Member[] = [
        { id: "u1", user_id: "u1", profiles: { username: "Owner" } },
        { id: "u2", user_id: "u2", profiles: { username: "Member" } },
    ];

    const baseProps = {
        group: baseGroup,
        slip: baseSlip,
        users,
        picks: [] as Pick[],
        currentUserId: "u1",
        onRenameSlip: () => { },
        onUpdateDeadlines: () => { },
        onGradePick: () => { },
        onOverrideSlipStatus: () => { },
        onStartNextContest: () => { },
        onRemoveMember: () => { },
        onTransferCommissioner: () => { },
    };

    it("requires matching phrase + acknowledgement before calling delete", async () => {
        const user = userEvent.setup();

        render(<CommissionerTab {...baseProps} />);

        const openButton = screen.getByRole("button", { name: /^Delete Group$/i });
        await user.click(openButton);

        const confirmButton = screen.getByRole("button", { name: /Delete group permanently/i });
        expect(confirmButton).toBeDisabled();

        const phraseInput = screen.getByLabelText(/Type DELETE sunday-locks to confirm/i);
        await user.type(phraseInput, "delete sunday-locks");
        expect(confirmButton).toBeDisabled();

        await user.clear(phraseInput);
        await user.type(phraseInput, "DELETE sunday-locks");
        expect(confirmButton).toBeDisabled();

        const checkbox = screen.getByLabelText(/I understand this action is permanent/i);
        await user.click(checkbox);
        expect(confirmButton).toBeEnabled();

        await user.click(confirmButton);
    });

    it("hides the danger zone for non-commissioners", () => {
        render(
            <CommissionerTab
                {...baseProps}
                group={{ ...baseGroup, created_by: "u2" }}
                currentUserId="u1"
            />
        );

        expect(screen.queryByRole("button", { name: /^Delete Group$/i })).not.toBeInTheDocument();
    });
});
