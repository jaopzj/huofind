/**
 * Product Analyzer - Extracts detailed product information from Goofish product pages
 * Uses keyword-based parsing for Chinese product listings
 */

import { chromium } from 'playwright';

/**
 * Keyword patterns for attribute detection
 */
const PATTERNS = {
    // Version/Region
    version: {
        'US': ['美版', 'US版', '美国'],
        'CN': ['国行', '国版', '大陆版'],
        'HK': ['港版', '港行'],
        'JP': ['日版', '日本'],
        'EU': ['欧版', '欧洲'],
        'KR': ['韩版', '韩国']
    },

    // Unlock Status
    unlock: {
        'unlocked': ['全球无锁', '纯无锁', '无锁', '官解', '已解锁', '解锁版'],
        'rsim': ['卡贴', 'RSIM', 'rsim', 'R-SIM', '贴膜锁', '超雪'],
        'locked': ['有锁', '网络锁', '未解锁', '锁机']
    },

    // Battery patterns - extract percentage
    battery: /电池.*?(\d{1,3})%?|电池效率[\s:]?(\d{1,3})|电池健康[\s:]?(\d{1,3})/,

    // Storage patterns
    storage: /(\d{2,4})\s*[gG][bB]?|(\d+)\s*[tT][bB]?/i,

    // Condition/Grade
    condition: {
        'A+': ['99新', '全新', '准新', '99%', '几乎全新', '完美'],
        'A': ['95新', '95%', '靓机', '充新', '很新'],
        'B': ['9成新', '90新', '小花', '轻微', '有使用痕迹'],
        'C': ['8成新', '80新', '明显使用', '有磕碰', '边框花']
    },

    // Screen Status
    screen: {
        'original': ['原装屏', '原屏', '未换屏', '原厂屏', '屏幕原装'],
        'replaced_original': ['换过原装屏', '换原屏', '更换原装', '后换原屏'],
        'replaced_replica': ['组装屏', '国产屏', '副厂屏', '后压屏', '换过屏']
    },

    // iPhone Model detection
    model: {
        'iPhone 16 Pro Max': ['16promax', '16 pro max', 'iPhone16ProMax', '苹果16promax'],
        'iPhone 16 Pro': ['16pro', '16 pro', 'iPhone16Pro', '苹果16pro'],
        'iPhone 16 Plus': ['16plus', '16 plus', 'iPhone16Plus', '苹果16plus'],
        'iPhone 16': ['iphone16', 'iPhone 16', '苹果16'],
        'iPhone 15 Pro Max': ['15promax', '15 pro max', 'iPhone15ProMax', '苹果15promax'],
        'iPhone 15 Pro': ['15pro', '15 pro', 'iPhone15Pro', '苹果15pro'],
        'iPhone 15 Plus': ['15plus', '15 plus', 'iPhone15Plus', '苹果15plus'],
        'iPhone 15': ['iphone15', 'iPhone 15', '苹果15'],
        'iPhone 14 Pro Max': ['14promax', '14 pro max', 'iPhone14ProMax', '苹果14promax'],
        'iPhone 14 Pro': ['14pro', '14 pro', 'iPhone14Pro', '苹果14pro'],
        'iPhone 14 Plus': ['14plus', '14 plus', 'iPhone14Plus', '苹果14plus'],
        'iPhone 14': ['iphone14', 'iPhone 14', '苹果14'],
        'iPhone 13 Pro Max': ['13promax', '13 pro max', 'iPhone13ProMax', '苹果13promax'],
        'iPhone 13 Pro': ['13pro', '13 pro', 'iPhone13Pro', '苹果13pro'],
        'iPhone 13': ['iphone13', 'iPhone 13', '苹果13'],
        'iPhone 12 Pro Max': ['12promax', '12 pro max', 'iPhone12ProMax', '苹果12promax'],
        'iPhone 12 Pro': ['12pro', '12 pro', 'iPhone12Pro', '苹果12pro'],
        'iPhone 12': ['iphone12', 'iPhone 12', '苹果12'],
        'iPhone SE': ['iphone se', 'iPhone SE', '苹果SE']
    }
};

/**
 * Score weights for comparison algorithm
 */
const SCORE_WEIGHTS = {
    unlockStatus: 25,   // Unlock status is crucial
    battery: 20,        // Battery health matters
    condition: 20,      // Physical condition
    price: 20,          // Price competitiveness
    sellerTrust: 10,    // Seller reputation
    screen: 5           // Screen originality
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
 * Extract battery percentage from text
 */
function detectBattery(text) {
    const match = text.match(PATTERNS.battery);
    if (match) {
        // Return first captured group that has a value
        const percentage = parseInt(match[1] || match[2] || match[3]);
        if (percentage >= 0 && percentage <= 100) {
            return percentage;
        }
    }
    return null;
}

/**
 * Extract storage capacity from text
 */
function detectStorage(text) {
    const match = text.match(PATTERNS.storage);
    if (match) {
        if (match[2]) {
            // TB match
            return parseInt(match[2]) * 1000;
        }
        return parseInt(match[1]);
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
 * Calculate individual product score
 */
function calculateProductScore(product, allProducts = []) {
    let score = 0;
    const breakdown = {};

    // 1. Unlock Status (25 pts)
    const unlockScores = { unlocked: 25, rsim: 10, locked: 0, unknown: 5 };
    breakdown.unlockStatus = unlockScores[product.unlockStatus] || 5;
    score += breakdown.unlockStatus;

    // 2. Battery Health (20 pts)
    if (product.battery !== null) {
        if (product.battery >= 100) breakdown.battery = 20;
        else if (product.battery >= 95) breakdown.battery = 17;
        else if (product.battery >= 90) breakdown.battery = 14;
        else if (product.battery >= 85) breakdown.battery = 10;
        else if (product.battery >= 80) breakdown.battery = 6;
        else breakdown.battery = 3;
    } else {
        breakdown.battery = 10; // Unknown battery
    }
    score += breakdown.battery;

    // 3. Condition (20 pts)
    const conditionScores = { 'A+': 20, 'A': 16, 'B': 10, 'C': 5, 'Unknown': 8 };
    breakdown.condition = conditionScores[product.condition] || 8;
    score += breakdown.condition;

    // 4. Price competitiveness (20 pts) - calculated relative to other products
    if (allProducts.length > 1 && product.price > 0) {
        const prices = allProducts.filter(p => p.price > 0).map(p => p.price);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);

        if (maxPrice > minPrice) {
            // Lower price = higher score
            const priceRatio = 1 - (product.price - minPrice) / (maxPrice - minPrice);
            breakdown.price = Math.round(priceRatio * 20);
        } else {
            breakdown.price = 15; // Same price
        }
    } else {
        breakdown.price = 15; // Single product
    }
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
            screenFormatted: formatScreen(detectScreenStatus(combinedText))
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
