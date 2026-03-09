import { RESTRICTED_WORDS } from "../constants";

export const getShortTeamName = (teamName: string) => {
    const words = teamName.split(" ");

    if (words.length > 2) {
        return words.slice(0, 2).join(" ");
    }

    if (words.length === 2 && teamName.length <= 18) {
        return teamName;
    }

    if (words.length === 2 && teamName.length > 18) {
        const first = words[0].slice(0, 3);
        return `${first}. ${words[1]}`;
    }

    return teamName;
};

export const checkAnyRestrictedWords = (input: string) => {
    if (!input) return false;

    let normalized = input.toLowerCase();

    // replace common leetspeak characters
    const leetMap: Record<string, string> = {
        "@": "a",
        "4": "a",
        "3": "e",
        "1": "i",
        "!": "i",
        "0": "o",
        "$": "s",
        "5": "s",
        "7": "t",
    };

    normalized = normalized
        .split("")
        .map((c) => leetMap[c] || c)
        .join("");

    normalized = normalized.replace(/[^a-z0-9]/g, "");

    normalized = normalized.replace(/(.)\1+/g, "$1");

    return RESTRICTED_WORDS.some((word) =>
        normalized.includes(word)
    );
};

export const getMemberInitials = (name?: string | null) => {
    if (!name) return "??";
    const parts = name.trim().split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] ?? "";
    const second =
        parts.length > 1 ? parts[parts.length - 1][0] : parts[0]?.[1] ?? "";
    return `${first}${second}`.toUpperCase() || "??";
};