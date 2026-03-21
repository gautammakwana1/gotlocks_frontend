import { describe, expect, it } from "vitest";
import {
    extractMatchup,
    extractPickLine,
    formatPickMetaLine,
    parsePickDescription,
} from "./pickDescription";

describe("pickDescription", () => {
    it("parses legacy hyphen-separated matchup descriptions", () => {
        const description = "UNC @ Duke - Over 151.5 Total Points";

        expect(extractPickLine(description)).toBe("Over 151.5 Total Points");
        expect(extractMatchup(description)).toBe("UNC @ Duke");
        expect(parsePickDescription(description)).toEqual({
            matchup: "UNC @ Duke",
            pickLine: "Over 151.5 Total Points",
        });
    });

    it("parses canonical em dash matchup descriptions", () => {
        const description = "Celtics @ Knicks — Under 221.5 Total Points";

        expect(extractPickLine(description)).toBe("Under 221.5 Total Points");
        expect(extractMatchup(description)).toBe("Celtics @ Knicks");
    });

    it("does not split non-matchup descriptions", () => {
        const description = "Jayson Tatum - Over 29.5 Points";

        expect(extractPickLine(description)).toBe(description);
        expect(extractMatchup(description)).toBeNull();
        expect(parsePickDescription(description)).toEqual({
            matchup: null,
            pickLine: description,
        });
    });

    it("falls back to provided matchup when the pick line has no embedded matchup", () => {
        const description = "Akron Zips Moneyline";

        expect(extractPickLine(description)).toBe(description);
        expect(extractMatchup(description, "AKRON @ TTU")).toBe("AKRON @ TTU");
        expect(parsePickDescription(description, "AKRON @ TTU")).toEqual({
            matchup: "AKRON @ TTU",
            pickLine: description,
        });
    });

    it("formats matchup and game time into one meta line", () => {
        expect(
            formatPickMetaLine({
                description: "Akron Zips Moneyline",
                matchup: "AKRON @ TTU",
                gameStartTime: "2026-03-20T16:40:00.000Z",
            })
        ).toBe("AKRON @ TTU · Mar 20, 12:40 PM");
    });
});
