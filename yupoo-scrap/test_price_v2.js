function extractPriceFixedV2(title) {
    const patterns = [
        // Symbol First
        /【?[Y￥¥]\s*(\d+(?:\.\d+)?)】?/gi,
        // Number First with protection
        /(?:^|[^:])【?(\d+(?:\.\d+)?)\s*[Y￥¥]】?/gi,

        /[Y￥¥]~\s*(\d+(?:\.\d+)?)/gi,
        /(\d+(?:\.\d+)?)\s*yuan/gi,
    ];

    for (const pattern of patterns) {
        pattern.lastIndex = 0;
        const match = pattern.exec(title);
        if (match) {
            // For the protected regex, group 1 is the number
            return parseFloat(match[1]);
        }
    }
    return null;
}

const titles = [
    "🔥1:1 ￥518 RA⭐⭐H LA⭐RE⭐ DOWN JACKETS 311230515",
    "Product 500Y",
    "Ratio 1:1 500Y",
    "Ratio 1:1 Y500",
    "Price 【500Y】",
    "1:1 Y"
];

titles.forEach(t => {
    console.log(`"${t}" -> ${extractPriceFixedV2(t)}`);
});
