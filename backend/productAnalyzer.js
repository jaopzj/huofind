/**
 * Product Analyzer - Extracts detailed product information from Goofish product pages
 * Enhanced with multi-strategy extraction and expanded keyword database
 */

import { chromium } from 'playwright';

/**
 * EXPANDED Keyword patterns for attribute detection
 * 3x more variations to handle different seller description styles
 */
const PATTERNS = {
    // Version/Region - EXPANDED
    version: {
        'US': [
            // Standard
            '美版', 'US版', '美国', 'US', 'USA',
            // Variations
            '美国版', '美行', '美机', '苹果美版', '美版机',
            // With spaces/separators
            '美 版', 'U.S.', 'United States', '美國', '🇺🇸',
            // Common typos/abbreviations
            'mei版', '美ban'
        ],
        'CN': [
            // Standard
            '国行', '国版', '大陆版', '中国',
            // Variations  
            '国内版', '大陆行货', '行货', '国行正品', '国产',
            '中国版', 'CH版', 'ZP版', '国行机',
            // With indicators
            '🇨🇳', 'China', 'CN版'
        ],
        'HK': [
            '港版', '港行', '香港', 'HK版',
            '香港版', '港机', '港澳版', '🇭🇰',
            'Hong Kong', 'ZA版'
        ],
        'JP': [
            '日版', '日本', 'JP版',
            '日本版', '日行', '日机', '🇯🇵',
            'Japan'
        ],
        'EU': [
            '欧版', '欧洲', 'EU版',
            '欧洲版', '🇪🇺', 'Europe', '英版', '德版', '法版'
        ],
        'KR': [
            '韩版', '韩国', 'KR版',
            '韩国版', '🇰🇷', 'Korea'
        ]
    },

    // Unlock Status - EXPANDED
    unlock: {
        'unlocked': [
            // Level 1: Direct terms
            '无锁', '官解', '解锁', '已解锁', '解锁版',
            // Level 2: Descriptive
            '全球无锁', '纯无锁', '全球通用', '全网通',
            '任意运营商', '插卡即用', '不限运营商',
            // Level 3: Additional variations
            '自由网络', 'factory unlocked', 'unlocked',
            '原生无锁', '出厂无锁', '官方解锁', '永久解锁',
            '无锁版', '通用版', '解锁机'
        ],
        'rsim': [
            // Direct terms
            '卡贴', 'RSIM', 'R-SIM', 'rsim', 'r-sim',
            // Brands
            '超雪', 'GEVEY', 'GPP', 'HEIC', 'ICCID',
            // Descriptive
            '贴膜', '信号贴', '黑解', '黑机', '贴膜锁',
            // Additional
            '卡贴机', '需要卡贴', '配卡贴', '送卡贴',
            '完美卡贴', '稳定卡贴', 'sim贴'
        ],
        'locked': [
            '有锁', '网络锁', '未解锁', '锁机',
            '运营商锁', 'locked', '锁定', '有网络锁',
            '原锁', '未官解'
        ]
    },

    // Battery patterns - EXPANDED with multiple regex
    battery: [
        /电池[健:]?康?[度:\s]?(\d{1,3})%?/,        // 电池健康度: 95%
        /电池效率[\s:]?(\d{1,3})/,                  // 电池效率: 92
        /电[量池][效:\s]?(\d{1,3})/,                // 电量效: 92  
        /(\d{1,3})%?\s*电池/,                       // 95% 电池
        /battery[:\s]?(\d{1,3})%?/i,                // Battery: 95%
        /电池容量[\s:]?(\d{1,3})/,                  // 电池容量: 95
        /续航[\s:]?(\d{1,3})/,                      // 续航: 92
        /健康度[\s:]?(\d{1,3})/,                    // 健康度: 95
        /电池寿命[\s:]?(\d{1,3})/,                  // 电池寿命: 88
        /电池状态[\s:]?(\d{1,3})/                   // 电池状态: 90
    ],

    // Storage patterns - EXPANDED
    storage: [
        /(\d{2,4})\s*[gG][bB]/,                     // 256GB, 256 GB
        /(\d+)\s*[tT][bB]/,                         // 1TB, 2 TB
        /内存[\s:]?(\d+)\s*[gG]?/,                   // 内存: 256G
        /容量[\s:]?(\d+)\s*[gG]?/,                   // 容量: 512
        /存储[\s:]?(\d+)\s*[gG]?/,                   // 存储: 128
        /(\d+)\s*[gG]内存/,                          // 256G内存
        /(\d+)\s*[gG]容量/                           // 512G容量
    ],

    // Condition/Grade - EXPANDED
    condition: {
        'A+': [
            // Numerical
            '99新', '100新', '99%新', '100%新',
            // Descriptive
            '全新', '准新', '未拆封', '未激活', '未使用',
            '完美', '无瑕疵', '零瑕疵', '无任何问题',
            // Special
            '库存机', '展示机', '样机', 'mint', 'like new',
            '完美成色', '成色完美', '外观完美', '几乎全新'
        ],
        'A': [
            // Numerical
            '95新', '96新', '97新', '98新', '95%新',
            // Descriptive
            '9成新', '靓机', '充新', '很新', '较新',
            '小瑕疵', '轻微痕迹', '正常使用痕迹',
            // English
            'excellent', 'great condition', '成色好'
        ],
        'B': [
            // Numerical
            '9成', '90新', '93新', '90%新', '85新',
            // Descriptive
            '有花', '小花', '边框花', '轻微花',
            '使用痕迹', '有使用痕迹', '正常使用',
            // English
            'good condition', 'good', '功能正常'
        ],
        'C': [
            // Numerical  
            '8成新', '80新', '85%', '7成新', '75新',
            // Descriptive
            '明显使用', '有磕碰', '有划痕', '边框磕碰',
            '屏幕花', '外观一般', '成色一般',
            // English
            'fair', 'acceptable', '瑕疵明显'
        ]
    },

    // Screen Status - EXPANDED
    screen: {
        'original': [
            // Direct
            '原装屏', '原屏', '未换屏', '原厂屏',
            // Descriptive
            '屏幕原装', '苹果原屏', '官方屏幕',
            '从未换过屏', 'original screen', '原厂显示屏',
            // Condition confirmations
            '屏幕完好', '原装显示', '原生屏'
        ],
        'replaced_original': [
            '换原装', '换过原屏', '更换原厂', '后换原装',
            '原装换屏', '换了原装屏', '换过原装屏幕',
            '后换苹果屏', '换了苹果屏', 'replaced with original'
        ],
        'replaced_replica': [
            '组装屏', '国产屏', '副厂屏', '后压屏',
            'OLED国产', '第三方屏', '非原装', '换过屏',
            '后压', '国产OLED', '换屏', 'aftermarket screen',
            '换了屏幕', '维修过屏幕'
        ]
    },

    // iPhone Model detection - EXPANDED
    model: {
        'iPhone 16 Pro Max': [
            '16promax', '16 pro max', 'iPhone16ProMax', '苹果16promax',
            '16PM', '16 PM', 'iPhone 16 Pro Max', '十六promax',
            'iphone16promax', '16pro max', '16 promax'
        ],
        'iPhone 16 Pro': [
            '16pro', '16 pro', 'iPhone16Pro', '苹果16pro',
            '16P', 'iPhone 16 Pro', '十六pro', 'iphone16pro'
        ],
        'iPhone 16 Plus': [
            '16plus', '16 plus', 'iPhone16Plus', '苹果16plus',
            'iPhone 16 Plus', '十六plus', '16+', 'iphone16plus'
        ],
        'iPhone 16': [
            'iphone16', 'iPhone 16', '苹果16', 'iPhone16',
            '苹果 16', '十六', 'ip16'
        ],
        'iPhone 15 Pro Max': [
            '15promax', '15 pro max', 'iPhone15ProMax', '苹果15promax',
            '15PM', '15 PM', 'iPhone 15 Pro Max', '十五promax',
            'iphone15promax', '15pro max', '15 promax'
        ],
        'iPhone 15 Pro': [
            '15pro', '15 pro', 'iPhone15Pro', '苹果15pro',
            '15P', 'iPhone 15 Pro', '十五pro', 'iphone15pro'
        ],
        'iPhone 15 Plus': [
            '15plus', '15 plus', 'iPhone15Plus', '苹果15plus',
            'iPhone 15 Plus', '十五plus', '15+', 'iphone15plus'
        ],
        'iPhone 15': [
            'iphone15', 'iPhone 15', '苹果15', 'iPhone15',
            '苹果 15', '十五', 'ip15'
        ],
        'iPhone 14 Pro Max': [
            '14promax', '14 pro max', 'iPhone14ProMax', '苹果14promax',
            '14PM', '14 PM', 'iPhone 14 Pro Max', 'iphone14promax'
        ],
        'iPhone 14 Pro': [
            '14pro', '14 pro', 'iPhone14Pro', '苹果14pro',
            '14P', 'iPhone 14 Pro', 'iphone14pro'
        ],
        'iPhone 14 Plus': [
            '14plus', '14 plus', 'iPhone14Plus', '苹果14plus',
            'iPhone 14 Plus', '14+', 'iphone14plus'
        ],
        'iPhone 14': [
            'iphone14', 'iPhone 14', '苹果14', 'iPhone14', 'ip14'
        ],
        'iPhone 13 Pro Max': [
            '13promax', '13 pro max', 'iPhone13ProMax', '苹果13promax',
            '13PM', 'iPhone 13 Pro Max', 'iphone13promax'
        ],
        'iPhone 13 Pro': [
            '13pro', '13 pro', 'iPhone13Pro', '苹果13pro',
            '13P', 'iPhone 13 Pro', 'iphone13pro'
        ],
        'iPhone 13 mini': [
            '13mini', '13 mini', 'iPhone13mini', '苹果13mini',
            'iPhone 13 mini', 'iphone13mini', '13 迷你'
        ],
        'iPhone 13': [
            'iphone13', 'iPhone 13', '苹果13', 'iPhone13', 'ip13'
        ],
        'iPhone 12 Pro Max': [
            '12promax', '12 pro max', 'iPhone12ProMax', '苹果12promax',
            '12PM', 'iPhone 12 Pro Max', 'iphone12promax'
        ],
        'iPhone 12 Pro': [
            '12pro', '12 pro', 'iPhone12Pro', '苹果12pro',
            '12P', 'iPhone 12 Pro', 'iphone12pro'
        ],
        'iPhone 12 mini': [
            '12mini', '12 mini', 'iPhone12mini', '苹果12mini',
            'iPhone 12 mini', 'iphone12mini', '12 迷你'
        ],
        'iPhone 12': [
            'iphone12', 'iPhone 12', '苹果12', 'iPhone12', 'ip12'
        ],
        'iPhone 11 Pro Max': [
            '11promax', '11 pro max', 'iPhone11ProMax', '苹果11promax'
        ],
        'iPhone 11 Pro': [
            '11pro', '11 pro', 'iPhone11Pro', '苹果11pro'
        ],
        'iPhone 11': [
            'iphone11', 'iPhone 11', '苹果11', 'iPhone11', 'ip11'
        ],
        'iPhone SE': [
            'iphone se', 'iPhone SE', '苹果SE', 'SE3', 'SE2', 'SE 3', 'SE 2'
        ]
    },

    // NEW: Color detection
    color: {
        'black': ['黑色', '暗夜', 'black', '深空', '石墨', '午夜'],
        'white': ['白色', 'white', '银色', 'silver', '星光'],
        'gold': ['金色', 'gold', '香槟', '金', '土豪金'],
        'blue': ['蓝色', 'blue', '远峰蓝', '海蓝', '天蓝'],
        'purple': ['紫色', 'purple', '暗紫', '深紫'],
        'red': ['红色', 'red', 'product red', '(PRODUCT)RED'],
        'green': ['绿色', 'green', '苍绿', '暗绿'],
        'pink': ['粉色', 'pink', '粉红', '玫瑰金'],
        'titanium': ['钛金属', 'titanium', '钛', '原色钛', '蓝钛', '黑钛', '白钛']
    },

    // NEW: Warranty detection
    warranty: [
        /保修[:\s]?(\d+)\s*[天月年]/,               // 保修: 30天
        /质保[:\s]?(\d+)\s*[天月年]/,               // 质保: 3月
        /包[换退][:\s]?(\d+)\s*[天月]/               // 包换: 15天
    ],

    // NEW: Accessories detection
    accessories: {
        'full': ['全套', '全配', '原装配件', '满配', '盒说全'],
        'partial': ['充电器', '数据线', '裸机+充电器', '带壳'],
        'none': ['裸机', '单机', '无配件', '无盒']
    }
};

/**
 * Enhanced Score weights for comparison algorithm
 * Based on quality + value, not just price
 */
const SCORE_WEIGHTS = {
    unlockStatus: 25,   // Unlock status is crucial for usability
    battery: 20,        // Battery health affects daily use
    condition: 20,      // Physical condition affects resale and aesthetics
    priceValue: 20,     // Price relative to quality (value score)
    sellerTrust: 10,    // Seller reputation reduces risk
    screen: 5           // Screen originality affects repair costs
};

/**
 * Market reference prices for value calculation (in CNY)
 */
const MARKET_PRICES = {
    'iPhone 16 Pro Max': { min: 8500, median: 9500, max: 11000 },
    'iPhone 16 Pro': { min: 7000, median: 8000, max: 9500 },
    'iPhone 16 Plus': { min: 5500, median: 6500, max: 7500 },
    'iPhone 16': { min: 5000, median: 5800, max: 6800 },
    'iPhone 15 Pro Max': { min: 6500, median: 7500, max: 8500 },
    'iPhone 15 Pro': { min: 5500, median: 6500, max: 7500 },
    'iPhone 15 Plus': { min: 4500, median: 5200, max: 6000 },
    'iPhone 15': { min: 4000, median: 4800, max: 5500 },
    'iPhone 14 Pro Max': { min: 5000, median: 5800, max: 6500 },
    'iPhone 14 Pro': { min: 4200, median: 5000, max: 5800 },
    'iPhone 14 Plus': { min: 3500, median: 4200, max: 4800 },
    'iPhone 14': { min: 3000, median: 3600, max: 4200 },
    'iPhone 13 Pro Max': { min: 4000, median: 4600, max: 5200 },
    'iPhone 13 Pro': { min: 3200, median: 3800, max: 4400 },
    'iPhone 13': { min: 2500, median: 3000, max: 3500 },
    'iPhone 12 Pro Max': { min: 3000, median: 3500, max: 4000 },
    'iPhone 12 Pro': { min: 2500, median: 3000, max: 3500 },
    'iPhone 12': { min: 1800, median: 2200, max: 2600 }
};

/**
 * Extract version/region from text
 */
function detectVersion(text) {
    const lowerText = text.toLowerCase();
    for (const [version, keywords] of Object.entries(PATTERNS.version)) {
        for (const keyword of keywords) {
            if (text.includes(keyword) || lowerText.includes(keyword.toLowerCase())) {
                return version;
            }
        }
    }
    return 'Unknown';
}

/**
 * Extract unlock status from text
 */
function detectUnlockStatus(text) {
    const lowerText = text.toLowerCase();

    // Check for unlocked first (higher priority)
    for (const keyword of PATTERNS.unlock.unlocked) {
        if (text.includes(keyword) || lowerText.includes(keyword.toLowerCase())) {
            return 'unlocked';
        }
    }

    // Check for RSIM
    for (const keyword of PATTERNS.unlock.rsim) {
        if (text.includes(keyword) || lowerText.includes(keyword.toLowerCase())) {
            return 'rsim';
        }
    }

    // Check for locked
    for (const keyword of PATTERNS.unlock.locked) {
        if (text.includes(keyword) || lowerText.includes(keyword.toLowerCase())) {
            return 'locked';
        }
    }

    return 'unknown';
}

/**
 * Extract battery percentage from text - ENHANCED with multiple patterns
 */
function detectBattery(text) {
    // Try each regex pattern in order
    for (const pattern of PATTERNS.battery) {
        const match = text.match(pattern);
        if (match) {
            // Find the first captured group with a value
            for (let i = 1; i < match.length; i++) {
                if (match[i]) {
                    const percentage = parseInt(match[i]);
                    if (percentage >= 50 && percentage <= 100) {
                        return percentage;
                    }
                }
            }
        }
    }
    return null;
}

/**
 * Extract storage capacity from text - ENHANCED with multiple patterns
 */
function detectStorage(text) {
    // Try each regex pattern in order
    for (const pattern of PATTERNS.storage) {
        const match = text.match(pattern);
        if (match) {
            const value = parseInt(match[1]);
            // Validate storage values (common iPhone storages)
            if ([64, 128, 256, 512, 1000, 1024, 2000, 2048].includes(value) ||
                (value >= 64 && value <= 2048)) {
                // Handle TB conversion
                if (pattern.toString().includes('tT')) {
                    return value * 1000;
                }
                return value;
            }
        }
    }
    return null;
}

/**
 * Extract condition grade from text
 */
function detectCondition(text) {
    for (const [grade, keywords] of Object.entries(PATTERNS.condition)) {
        for (const keyword of keywords) {
            if (text.includes(keyword)) {
                return grade;
            }
        }
    }
    return 'Unknown';
}

/**
 * Extract screen status from text
 */
function detectScreenStatus(text) {
    // Check for original screen first
    for (const keyword of PATTERNS.screen.original) {
        if (text.includes(keyword)) {
            return 'original';
        }
    }

    // Check for replaced with original
    for (const keyword of PATTERNS.screen.replaced_original) {
        if (text.includes(keyword)) {
            return 'replaced_original';
        }
    }

    // Check for replaced with replica
    for (const keyword of PATTERNS.screen.replaced_replica) {
        if (text.includes(keyword)) {
            return 'replaced_replica';
        }
    }

    return 'unknown';
}

/**
 * Detect iPhone model from text
 */
function detectModel(text) {
    const lowerText = text.toLowerCase().replace(/\s+/g, '');

    // Sort models by specificity (longer names first)
    const sortedModels = Object.entries(PATTERNS.model).sort((a, b) => b[0].length - a[0].length);

    for (const [model, keywords] of sortedModels) {
        for (const keyword of keywords) {
            const normalizedKeyword = keyword.toLowerCase().replace(/\s+/g, '');
            if (lowerText.includes(normalizedKeyword)) {
                return model;
            }
        }
    }
    return 'Unknown';
}

/**
 * NEW: Detect color from text
 */
function detectColor(text) {
    const lowerText = text.toLowerCase();
    for (const [color, keywords] of Object.entries(PATTERNS.color)) {
        for (const keyword of keywords) {
            if (text.includes(keyword) || lowerText.includes(keyword.toLowerCase())) {
                return color;
            }
        }
    }
    return 'unknown';
}

/**
 * NEW: Detect accessories from text
 */
function detectAccessories(text) {
    const lowerText = text.toLowerCase();
    for (const [level, keywords] of Object.entries(PATTERNS.accessories)) {
        for (const keyword of keywords) {
            if (text.includes(keyword) || lowerText.includes(keyword.toLowerCase())) {
                return level;
            }
        }
    }
    return 'unknown';
}

/**
 * NEW: Calculate value score based on quality vs market price
 * Returns a score from 0-20 where higher = better value
 */
function calculateValueScore(product, qualityScore) {
    const model = product.model;
    const price = product.price;

    if (!price || price <= 0) return 10; // Default if no price

    const marketRef = MARKET_PRICES[model];
    if (!marketRef) return 10; // Default if model not in reference

    // Calculate expected price based on quality (0-80 quality score range)
    // Higher quality = should be closer to max price
    const qualityRatio = qualityScore / 80;
    const expectedPrice = marketRef.min + (marketRef.max - marketRef.min) * qualityRatio;

    // Value = how much cheaper than expected
    // If price < expectedPrice = good value (higher score)
    // If price > expectedPrice = poor value (lower score)
    const valueDiff = expectedPrice - price;
    const priceRange = marketRef.max - marketRef.min;

    // Normalize to 0-20 scale
    let valueScore = 10 + (valueDiff / priceRange) * 10;
    valueScore = Math.max(0, Math.min(20, valueScore));

    return Math.round(valueScore);
}

/**
 * ENHANCED: Calculate individual product score
 * Now considers value (quality vs price) instead of just price comparison
 */
function calculateProductScore(product, allProducts = []) {
    let score = 0;
    const breakdown = {};

    // 1. Unlock Status (25 pts)
    const unlockScores = { unlocked: 25, rsim: 12, locked: 3, unknown: 8 };
    breakdown.unlockStatus = unlockScores[product.unlockStatus] || 8;
    score += breakdown.unlockStatus;

    // 2. Battery Health (20 pts)
    if (product.battery !== null && product.battery !== undefined) {
        if (product.battery >= 100) breakdown.battery = 20;
        else if (product.battery >= 95) breakdown.battery = 18;
        else if (product.battery >= 90) breakdown.battery = 15;
        else if (product.battery >= 85) breakdown.battery = 12;
        else if (product.battery >= 80) breakdown.battery = 8;
        else if (product.battery >= 75) breakdown.battery = 5;
        else breakdown.battery = 3;
    } else {
        // Unknown battery - estimate based on condition
        const conditionBatteryEstimate = {
            'A+': 14, 'A': 12, 'B': 9, 'C': 6, 'Unknown': 10
        };
        breakdown.battery = conditionBatteryEstimate[product.condition] || 10;
    }
    score += breakdown.battery;

    // 3. Condition (20 pts)
    const conditionScores = { 'A+': 20, 'A': 16, 'B': 10, 'C': 5, 'Unknown': 10 };
    breakdown.condition = conditionScores[product.condition] || 10;
    score += breakdown.condition;

    // Calculate quality subtotal for value calculation
    const qualitySubtotal = breakdown.unlockStatus + breakdown.battery + breakdown.condition;

    // 4. Value Score (20 pts) - quality vs market price
    breakdown.price = calculateValueScore(product, qualitySubtotal);
    score += breakdown.price;

    // 5. Seller Trust (10 pts)
    if (product.sellerTrust !== undefined) {
        breakdown.sellerTrust = Math.round((product.sellerTrust / 100) * 10);
    } else {
        breakdown.sellerTrust = 5;
    }
    score += breakdown.sellerTrust;

    // 6. Screen Status (5 pts)
    const screenScores = { original: 5, replaced_original: 3, replaced_replica: 1, unknown: 3 };
    breakdown.screen = screenScores[product.screenStatus] || 3;
    score += breakdown.screen;

    return { score, breakdown };
}

/**
 * Compare multiple products and determine winner
 */
function compareProducts(products) {
    if (!products || products.length === 0) {
        return { error: 'No products to compare' };
    }

    // Calculate scores for all products
    const scoredProducts = products.map(product => {
        const { score, breakdown } = calculateProductScore(product, products);
        return {
            ...product,
            score,
            breakdown
        };
    });

    // Sort by score (highest first)
    scoredProducts.sort((a, b) => b.score - a.score);

    // Determine winner and recommendation
    const winner = scoredProducts[0];
    const scoreDiff = scoredProducts.length > 1
        ? scoredProducts[0].score - scoredProducts[1].score
        : 0;

    let recommendation;
    if (scoredProducts.length === 1) {
        recommendation = 'Apenas um produto analisado';
    } else if (scoreDiff >= 15) {
        recommendation = `${winner.model || 'Product'} é claramente a melhor escolha`;
    } else if (scoreDiff >= 5) {
        recommendation = `${winner.model || 'Product'} oferece o melhor valor`;
    } else {
        recommendation = 'Ambos os produtos são opções semelhantes';
    }

    return {
        products: scoredProducts,
        winner: winner.id,
        winnerScore: winner.score,
        recommendation,
        maxPossibleScore: 100
    };
}

/**
 * Extract product details from a Goofish product page
 */
async function extractProductDetails(page) {
    try {
        // Wait for main content to load
        await page.waitForSelector('div[class*="price"]', { timeout: 10000 });
        await page.waitForTimeout(1500);

        const details = await page.evaluate(() => {
            // Extract price
            const priceEl = document.querySelector('div[class*="price--"], span[class*="price"]');
            let price = 0;
            if (priceEl) {
                const priceMatch = priceEl.textContent.match(/(\d+(?:\.\d+)?)/);
                if (priceMatch) price = parseFloat(priceMatch[1]);
            }

            // Extract title
            const titleEl = document.querySelector('h1, div[class*="title--"], div[class*="itemTitle"]');
            const title = titleEl?.textContent?.trim() || '';

            // Extract full description text
            const descEl = document.querySelector('div[class*="item-detail"], div[class*="detail"]');
            const description = descEl?.innerText || '';

            // Get all text for parsing
            const mainContent = document.querySelector('div[class*="main"], div[class*="container"]');
            const fullText = mainContent?.innerText || document.body.innerText;

            // Extract images - CORRECTED for Goofish structure
            // Uses correct selectors: .carouselItem img, .item-main-window-list-item img, .ant-image-img
            const images = [];
            const seenUrls = new Set();

            // Helper to validate and format image URLs
            const addImage = (src) => {
                if (!src) return;
                // Handle protocol-relative URLs
                let url = src.startsWith('//') ? 'https:' + src : src;
                // Skip placeholders, avatars, and tiny images
                if (url.includes('2-2.png') ||
                    url.includes('1-1.png') ||
                    url.includes('avatar') ||
                    url.includes('placeholder') ||
                    (url.startsWith('data:') && url.length < 200)) {
                    return;
                }
                // Only add valid http URLs
                if (url.startsWith('http') && !seenUrls.has(url)) {
                    seenUrls.add(url);
                    images.push(url);
                }
            };

            // Strategy 1: Carousel items (main gallery images)
            document.querySelectorAll('[class*="carouselItem"] img, [class*="carousel-item"] img').forEach(img => {
                addImage(img.src);
                addImage(img.getAttribute('data-src'));
            });

            // Strategy 2: Thumbnail images
            document.querySelectorAll('[class*="item-main-window-list-item"] img, [class*="fadeInImg"] img').forEach(img => {
                addImage(img.src);
                addImage(img.getAttribute('data-src'));
            });

            // Strategy 3: Ant Design images (high-res preview)
            document.querySelectorAll('.ant-image-img').forEach(img => {
                addImage(img.src);
            });

            // Strategy 4: Fallback - any other product images
            if (images.length === 0) {
                document.querySelectorAll('img').forEach(img => {
                    const src = img.src || img.getAttribute('data-src');
                    if (src && (src.includes('alicdn.com') || src.includes('tbcdn.cn'))) {
                        addImage(src);
                    }
                });
            }

            // Extract seller info
            const sellerEl = document.querySelector('a[href*="personal?userId="]');
            const sellerName = sellerEl?.textContent?.trim() || '';
            const sellerUrl = sellerEl?.href || '';

            return {
                price,
                title,
                description,
                fullText: title + ' ' + description + ' ' + fullText,
                images,
                sellerName,
                sellerUrl,
                url: window.location.href
            };
        });

        // Parse extracted text for attributes
        const combinedText = details.fullText || '';

        return {
            id: details.url.match(/id=(\d+)/)?.[1] || Date.now().toString(),
            url: details.url,
            title: details.title,
            price: details.price,
            priceFormatted: `¥ ${details.price}`,
            description: details.description,
            images: details.images,
            sellerName: details.sellerName,
            sellerUrl: details.sellerUrl,

            // Parsed attributes
            model: detectModel(combinedText),
            version: detectVersion(combinedText),
            storage: detectStorage(combinedText),
            unlockStatus: detectUnlockStatus(combinedText),
            battery: detectBattery(combinedText),
            condition: detectCondition(combinedText),
            screenStatus: detectScreenStatus(combinedText),

            // Formatted for display
            versionFormatted: formatVersion(detectVersion(combinedText)),
            unlockFormatted: formatUnlock(detectUnlockStatus(combinedText)),
            batteryFormatted: detectBattery(combinedText) !== null
                ? `${detectBattery(combinedText)}%`
                : 'Unknown',
            storageFormatted: formatStorage(detectStorage(combinedText)),
            conditionFormatted: detectCondition(combinedText),
            screenFormatted: formatScreen(detectScreenStatus(combinedText)),

            // NEW: Additional parsed attributes
            color: detectColor(combinedText),
            accessories: detectAccessories(combinedText),
            colorFormatted: formatColor(detectColor(combinedText)),
            accessoriesFormatted: formatAccessories(detectAccessories(combinedText))
        };
    } catch (error) {
        console.error('[ProductAnalyzer] Error extracting details:', error.message);
        throw error;
    }
}

// Helper formatting functions
function formatVersion(version) {
    const names = {
        'US': '🇺🇸 USA',
        'CN': '🇨🇳 China',
        'HK': '🇭🇰 Hong Kong',
        'JP': '🇯🇵 Japan',
        'EU': '🇪🇺 Europe',
        'KR': '🇰🇷 Korea',
        'Unknown': '❓ Unknown'
    };
    return names[version] || version;
}

function formatUnlock(status) {
    const names = {
        'unlocked': '🔓 Desbloqueado',
        'rsim': '📡 RSIM',
        'locked': '🔒 Bloqueado',
        'unknown': '❓ Desconhecido'
    };
    return names[status] || status;
}

function formatStorage(storage) {
    if (!storage) return 'Unknown';
    if (storage >= 1000) return `${storage / 1000}TB`;
    return `${storage}GB`;
}

function formatScreen(status) {
    const names = {
        'original': '✅ Original',
        'replaced_original': '🔄 Trocada (Original)',
        'replaced_replica': '⚠️ Trocada (Réplica)',
        'unknown': '❓ Desconhecido'
    };
    return names[status] || status;
}

function formatColor(color) {
    const names = {
        'black': '⬛ Preto',
        'white': '⬜ Branco',
        'gold': '🟨 Dourado',
        'blue': '🟦 Azul',
        'purple': '🟪 Roxo',
        'red': '🟥 Vermelho',
        'green': '🟩 Verde',
        'pink': '🩷 Rosa',
        'titanium': '🔘 Titânio',
        'unknown': '—'
    };
    return names[color] || color;
}

function formatAccessories(level) {
    const names = {
        'full': '📦 Completo',
        'partial': '📋 Parcial',
        'none': '📱 Apenas telefone',
        'unknown': '—'
    };
    return names[level] || level;
}

/**
 * Scrape multiple product pages for comparison
 */
async function scrapeProductsForComparison(productUrls, onProgress = null) {
    const emit = (stage, message, data = {}) => {
        console.log(`[ProductAnalyzer] ${message}`);
        if (onProgress) onProgress(stage, message, data);
    };

    let browser = null;
    const products = [];

    try {
        emit('launching', 'Iniciando navegador...');
        browser = await chromium.launch({ headless: true });

        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            viewport: { width: 1920, height: 1080 },
            locale: 'zh-CN'
        });

        for (let i = 0; i < productUrls.length; i++) {
            const url = productUrls[i];
            emit('scraping', `Analisando produto ${i + 1} de ${productUrls.length}...`, {
                current: i + 1,
                total: productUrls.length
            });

            // First page needs more time (cold start)
            const timeout = i === 0 ? 60000 : 30000;
            let retries = 2; // Allow 1 retry

            while (retries > 0) {
                try {
                    const page = await context.newPage();
                    await page.goto(url, { waitUntil: 'networkidle', timeout });

                    const details = await extractProductDetails(page);
                    products.push(details);

                    await page.close();
                    break; // Success, exit retry loop
                } catch (pageError) {
                    retries--;
                    console.error(`[ProductAnalyzer] Error on ${url} (retries left: ${retries}):`, pageError.message);

                    if (retries === 0) {
                        // Final failure - still add to results with error
                        products.push({
                            id: url.match(/id=(\d+)/)?.[1] || Date.now().toString(),
                            url,
                            error: pageError.message,
                            title: 'Erro ao carregar produto',
                            price: 0
                        });
                    } else {
                        // Wait before retry
                        await new Promise(r => setTimeout(r, 2000));
                        emit('scraping', `Tentando novamente produto ${i + 1}...`, {
                            current: i + 1,
                            total: productUrls.length
                        });
                    }
                }
            }

            // Small delay between requests
            if (i < productUrls.length - 1) {
                await new Promise(r => setTimeout(r, 500));
            }
        }

        emit('complete', `${products.length} produtos analisados!`, { count: products.length });

        // Compare products
        const comparison = compareProducts(products.filter(p => !p.error));

        return {
            products: comparison.products,
            winner: comparison.winner,
            winnerScore: comparison.winnerScore,
            recommendation: comparison.recommendation,
            maxPossibleScore: comparison.maxPossibleScore
        };

    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

export {
    extractProductDetails,
    compareProducts,
    calculateProductScore,
    scrapeProductsForComparison,
    detectVersion,
    detectUnlockStatus,
    detectBattery,
    detectStorage,
    detectCondition,
    detectScreenStatus,
    detectModel
};
