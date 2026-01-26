function extractPrice(title) {
    // Padrões de preço (ORIGINAL ORDER)
    const patterns = [
        /【?(\d+(?:\.\d+)?)\s*[Y￥¥]】?/gi,  // 460Y, 460￥, 【460Y】
        /【?[Y￥¥]\s*(\d+(?:\.\d+)?)】?/gi,  // ￥135, Y460, 【￥460】
        /[Y￥¥]~\s*(\d+(?:\.\d+)?)/gi,       // ￥~66
        /(\d+(?:\.\d+)?)\s*yuan/gi,          // 135 yuan
    ];

    for (const pattern of patterns) {
        const match = pattern.exec(title);
        if (match) {
            return parseFloat(match[1]);
        }
    }

    return null;
}

function extractPriceFixed(title) {
    // Padrões de preço (SWAPPED ORDER and IMPROVED)
    const patterns = [
        /【?[Y￥¥]\s*(\d+(?:\.\d+)?)】?/gi,  // ￥135, Y460, 【￥460】
        /(?:^|[^:])(\d+(?:\.\d+)?)\s*[Y￥¥]/gi,  // 460Y, 460￥ (Added check to avoid 1:1)
        /[Y￥¥]~\s*(\d+(?:\.\d+)?)/gi,       // ￥~66
        /(\d+(?:\.\d+)?)\s*yuan/gi,          // 135 yuan
    ];

    for (const pattern of patterns) {
        // Reset lastIndex because of 'g' flag if reusing regex objects (but here they are new)
        // Note: For regex literals in a loop, it's safer.
        // Actually, if we change the regex to be stricter for the number-symbol case:
        if (String(pattern).includes('[:')) { // Hacky check for the modified regex
            const match = pattern.exec(title);
            if (match) {
                // For (?:^|[^:])(\d+), the capture group is 1.
                return parseFloat(match[1]);
            }
        } else {
            const match = pattern.exec(title);
            if (match) {
                return parseFloat(match[1]);
            }
        }
    }
    return null;
}

// SIMPLER FIX: Just Swap?
function extractPriceSwapOnly(title) {
    const patterns = [
        /【?[Y￥¥]\s*(\d+(?:\.\d+)?)】?/gi,  // Symbol First
        /【?(\d+(?:\.\d+)?)\s*[Y￥¥]】?/gi,  // Number First
        /[Y￥¥]~\s*(\d+(?:\.\d+)?)/gi,
        /(\d+(?:\.\d+)?)\s*yuan/gi,
    ];

    for (const pattern of patterns) {
        pattern.lastIndex = 0; // Reset
        const match = pattern.exec(title);
        if (match) {
            return parseFloat(match[1]);
        }
    }
    return null;
}


const title = "🔥1:1 ￥518 RA⭐⭐H LA⭐RE⭐ DOWN JACKETS 311230515";
console.log(`Title: ${title}`);
console.log(`Original: ${extractPrice(title)}`);
console.log(`Swap Only: ${extractPriceSwapOnly(title)}`);
