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