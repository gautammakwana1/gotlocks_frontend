const withAlpha = (hex: string, alphaHex: string) => {
    if (hex.startsWith("#") && hex.length === 7) {
        return `${hex}${alphaHex}`;
    }
    return hex;
};

export const getHexFromGradient = (color?: string) => {
    if (!color) return undefined;
    const match = color.match(/#([0-9a-fA-F]{6})/);
    return match ? `#${match[1]}` : undefined;
};

export const resolveTierCardAppearance = (color?: string) => {
    const hex = getHexFromGradient(color);
    const style = hex
        ? {
            backgroundImage: `linear-gradient(135deg, ${withAlpha(
                hex,
                "55"
            )}, ${withAlpha(hex, "22")}, rgba(0,0,0,0))`,
        }
        : undefined;

    return {
        style,
        toneClass: style
            ? "bg-transparent"
            : color
                ? `bg-gradient-to-br ${color}`
                : "bg-white/[0.04]",
    };
};
