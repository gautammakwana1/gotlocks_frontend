import { describe, expect, it } from "vitest";
import { getProfilePath } from "./profileNavigation";

describe("getProfilePath", () => {
    it("routes the current user to the profile tab", () => {
        expect(getProfilePath("user-1", "user-1")).toBe("/profile");
    });

    it("routes other users to the public profile page", () => {
        expect(getProfilePath("user-2", "user-1")).toBe("/users/user-2");
    });

    it("falls back to the public profile page without a current user id", () => {
        expect(getProfilePath("user-2")).toBe("/users/user-2");
    });
});
