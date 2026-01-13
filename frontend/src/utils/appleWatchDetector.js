/**
 * Apple Watch detector utility
 * Detects model, size, battery, condition, color, and material from product names
 */

/**
 * Detect Apple Watch model from product name
 */
export function detectAppleWatchModel(product) {
    const name = (product.nameTranslated || product.name || '').toLowerCase();
    const originalName = (product.nameOriginal || product.name || '').toLowerCase();
    const fullText = `${name} ${originalName}`;

    const patterns = [
        // Ultra series (check first - more specific)
        { regex: /ultra\s*2|ultra2/i, model: 'Ultra 2' },
        { regex: /ultra(?!\s*2)/i, model: 'Ultra' },

        // Standard series
        { regex: /\bs10\b|series\s*10|s\s*10/i, model: 'Series 10' },
        { regex: /\bs9\b|series\s*9|s\s*9/i, model: 'Series 9' },
        { regex: /\bs8\b|series\s*8|s\s*8/i, model: 'Series 8' },
        { regex: /\bs7\b|series\s*7|s\s*7/i, model: 'Series 7' },
        { regex: /\bs6\b|series\s*6|s\s*6/i, model: 'Series 6' },
        { regex: /\bs5\b|series\s*5|s\s*5/i, model: 'Series 5' },
        { regex: /\bs4\b|series\s*4|s\s*4/i, model: 'Series 4' },
        { regex: /\bs3\b|series\s*3|s\s*3/i, model: 'Series 3' },

        // SE series
        { regex: /\bse\s*2\b|se2\b/i, model: 'SE 2' },
        { regex: /\bse\b(?!\s*2)/i, model: 'SE' },
    ];

    for (const { regex, model } of patterns) {
        if (regex.test(fullText)) {
            return model;
        }
    }

    // Check for generic Apple Watch mention
    if (/apple\s*watch|苹果.*手表|iwatch/i.test(fullText)) {
        return 'Apple Watch';
    }

    return null;
}

/**
 * Detect watch size (mm)
 */
export function detectWatchSize(product) {
    const name = (product.nameTranslated || product.name || '').toLowerCase();
    const originalName = (product.nameOriginal || product.name || '').toLowerCase();
    const fullText = `${name} ${originalName}`;

    const sizePatterns = [
        { regex: /49\s*mm/i, size: '49mm' },
        { regex: /45\s*mm/i, size: '45mm' },
        { regex: /44\s*mm/i, size: '44mm' },
        { regex: /42\s*mm/i, size: '42mm' },
        { regex: /41\s*mm/i, size: '41mm' },
        { regex: /40\s*mm/i, size: '40mm' },
        { regex: /38\s*mm/i, size: '38mm' },
    ];

    for (const { regex, size } of sizePatterns) {
        if (regex.test(fullText)) {
            return size;
        }
    }

    return null;
}

/**
 * Detect battery health percentage
 */
export function detectBatteryHealth(product) {
    const name = (product.nameTranslated || product.name || '').toLowerCase();
    const originalName = (product.nameOriginal || product.name || '').toLowerCase();
    const fullText = `${name} ${originalName}`;

    // Pattern: 电池XX% or battery XX%
    const batteryMatch = fullText.match(/电池\s*(?:健康)?\s*(\d{1,3})\s*%|battery\s*(?:health)?\s*(\d{1,3})\s*%/i);
    if (batteryMatch) {
        const percentage = parseInt(batteryMatch[1] || batteryMatch[2], 10);
        if (percentage > 0 && percentage <= 100) {
            return percentage;
        }
    }

    return null;
}

/**
 * Detect condition/quality
 */
export function detectCondition(product) {
    const name = (product.nameTranslated || product.name || '').toLowerCase();
    const originalName = (product.nameOriginal || product.name || '').toLowerCase();
    const fullText = `${name} ${originalName}`;

    const conditionPatterns = [
        { regex: /全新|brand\s*new|unopened/i, condition: '全新', score: 100 },
        { regex: /几乎全新|almost\s*new|like\s*new/i, condition: '几乎全新', score: 99 },
        { regex: /99新|99%\s*new/i, condition: '99新', score: 99 },
        { regex: /98新|98%\s*new/i, condition: '98新', score: 98 },
        { regex: /97新|97%\s*new/i, condition: '97新', score: 97 },
        { regex: /95新|95%\s*new/i, condition: '95新', score: 95 },
        { regex: /9成新|90新|90%\s*new/i, condition: '9成新', score: 90 },
        { regex: /成色(\d+)新/i, condition: null, score: null }, // Will extract dynamically
    ];

    for (const { regex, condition, score } of conditionPatterns) {
        const match = fullText.match(regex);
        if (match) {
            if (condition === null) {
                // Dynamic extraction for 成色XX新
                const extractedScore = parseInt(match[1], 10);
                return { condition: `${extractedScore}新`, score: extractedScore };
            }
            return { condition, score };
        }
    }

    return null;
}

/**
 * Detect watch color
 */
export function detectWatchColor(product) {
    const name = (product.nameTranslated || product.name || '').toLowerCase();
    const originalName = (product.nameOriginal || product.name || '').toLowerCase();
    const fullText = `${name} ${originalName}`;

    const colorPatterns = [
        { regex: /银色|silver/i, color: '银色', colorEn: 'Silver' },
        { regex: /星光色|starlight/i, color: '星光色', colorEn: 'Starlight' },
        { regex: /午夜色|midnight/i, color: '午夜色', colorEn: 'Midnight' },
        { regex: /石墨色|graphite/i, color: '石墨色', colorEn: 'Graphite' },
        { regex: /金色|gold/i, color: '金色', colorEn: 'Gold' },
        { regex: /红色|product\s*red|\(red\)/i, color: '红色', colorEn: 'Red' },
        { regex: /黑色|black/i, color: '黑色', colorEn: 'Black' },
        { regex: /白色|white/i, color: '白色', colorEn: 'White' },
        { regex: /蓝色|blue/i, color: '蓝色', colorEn: 'Blue' },
        { regex: /绿色|green/i, color: '绿色', colorEn: 'Green' },
        { regex: /橙色|orange/i, color: '橙色', colorEn: 'Orange' },
        { regex: /粉色|pink/i, color: '粉色', colorEn: 'Pink' },
        { regex: /自然色|natural/i, color: '自然色', colorEn: 'Natural' },
    ];

    for (const { regex, color, colorEn } of colorPatterns) {
        if (regex.test(fullText)) {
            return { color, colorEn };
        }
    }

    return null;
}

/**
 * Detect watch material (case)
 */
export function detectWatchMaterial(product) {
    const name = (product.nameTranslated || product.name || '').toLowerCase();
    const originalName = (product.nameOriginal || product.name || '').toLowerCase();
    const fullText = `${name} ${originalName}`;

    const materialPatterns = [
        { regex: /钛金属|titanium/i, material: '钛金属', materialEn: 'Titanium' },
        { regex: /不锈钢|stainless\s*steel/i, material: '不锈钢', materialEn: 'Stainless Steel' },
        { regex: /铝金属|铝|aluminum|aluminium/i, material: '铝金属', materialEn: 'Aluminum' },
        { regex: /陶瓷|ceramic/i, material: '陶瓷', materialEn: 'Ceramic' },
    ];

    for (const { regex, material, materialEn } of materialPatterns) {
        if (regex.test(fullText)) {
            return { material, materialEn };
        }
    }

    // Default to Aluminum if Apple Watch detected but no material specified
    return null;
}

/**
 * Detect connectivity type
 */
export function detectConnectivity(product) {
    const name = (product.nameTranslated || product.name || '').toLowerCase();
    const originalName = (product.nameOriginal || product.name || '').toLowerCase();
    const fullText = `${name} ${originalName}`;

    if (/蜂窝|cellular|lte|esim/i.test(fullText)) {
        return 'GPS + Cellular';
    }
    if (/gps(?!\s*\+|\s*蜂窝)/i.test(fullText)) {
        return 'GPS';
    }

    return null;
}

/**
 * Extract unique watch models from products
 */
export function extractUniqueWatchModels(products) {
    const models = new Set();

    for (const product of products) {
        const model = detectAppleWatchModel(product);
        if (model && model !== 'Apple Watch') {
            models.add(model);
        }
    }

    // Sort models logically
    const sortOrder = ['Ultra 2', 'Ultra', 'Series 10', 'Series 9', 'Series 8', 'Series 7', 'Series 6', 'Series 5', 'Series 4', 'Series 3', 'SE 2', 'SE'];
    return Array.from(models).sort((a, b) => {
        const indexA = sortOrder.indexOf(a);
        const indexB = sortOrder.indexOf(b);
        if (indexA === -1 && indexB === -1) return a.localeCompare(b);
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
    });
}

/**
 * Extract unique watch sizes from products
 */
export function extractUniqueWatchSizes(products) {
    const sizes = new Set();

    for (const product of products) {
        const size = detectWatchSize(product);
        if (size) {
            sizes.add(size);
        }
    }

    // Sort sizes numerically
    return Array.from(sizes).sort((a, b) => {
        const numA = parseInt(a, 10);
        const numB = parseInt(b, 10);
        return numB - numA; // Descending (larger first)
    });
}

/**
 * Extract unique colors from products
 */
export function extractUniqueWatchColors(products) {
    const colors = new Map();

    for (const product of products) {
        const colorInfo = detectWatchColor(product);
        if (colorInfo) {
            colors.set(colorInfo.color, colorInfo.colorEn);
        }
    }

    return Array.from(colors.entries()).map(([color, colorEn]) => ({ color, colorEn }));
}

/**
 * Extract unique materials from products
 */
export function extractUniqueWatchMaterials(products) {
    const materials = new Map();

    for (const product of products) {
        const materialInfo = detectWatchMaterial(product);
        if (materialInfo) {
            materials.set(materialInfo.material, materialInfo.materialEn);
        }
    }

    return Array.from(materials.entries()).map(([material, materialEn]) => ({ material, materialEn }));
}
