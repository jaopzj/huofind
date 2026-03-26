import { chromium } from 'playwright';
import { extractSellerInfo, calculateTrustScore, formatSellerData } from './sellerAnalyzer.js';
import browserPool from './browserPool.js';

/**
 * Scraper para perfis de vendedores da Goofish
 * 
 * Supports two modes:
 * 1. Direct mode (scrapeSellerProducts) - creates own browser, used for standalone calls
 * 2. Pooled mode (scrapeWithPool) - uses browser pool, recommended for queue workers
 * 
 * Seletores baseados em análise real do DOM:
 * - Cards: a[class^="feeds-item-wrap"] ou [class*="cardWarp"]
 * - Título: div do conteúdo, primeiro span com texto
 * - Preço: span após símbolo ¥
 * - Imagem: primeiro img dentro do card
 */
class GoofishScraper {
    constructor() {
        this.browser = null;
        this.userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0'
        ];
    }

    /**
     * Configura interceptação da API MTOP do Goofish para capturar dados do vendedor.
     * Deve ser chamado ANTES de page.goto().
     * @param {Page} page - Página Playwright
     * @returns {{ getData: () => Object|null, cleanup: () => void }}
     */
    _setupApiCapture(page) {
        let mtopHeadData = null;
        let resolveCapture;
        const capturedPromise = new Promise(resolve => { resolveCapture = resolve; });

        const handler = async (response) => {
            const url = response.url();
            if (url.includes('user.page.head') || url.includes('idle.web.user.page')) {
                try {
                    const body = await response.text();
                    let jsonStr = body;
                    const m = body.match(/mtopjsonp\d*\((.+)\)$/s);
                    if (m) jsonStr = m[1];
                    const parsed = JSON.parse(jsonStr);
                    if (parsed.ret?.some(r => r.includes('SUCCESS')) && parsed.data && Object.keys(parsed.data).length > 0) {
                        mtopHeadData = parsed.data;
                        console.log('[Scraper] API MTOP capturada: user.page.head');
                    }
                } catch (e) {
                    // Ignora erros de parse
                }
                resolveCapture();
            }
        };
        page.on('response', handler);
        return {
            getData: () => mtopHeadData,
            /** Aguarda a resposta da API ser processada (com timeout) */
            waitForData: (timeoutMs = 8000) => Promise.race([
                capturedPromise,
                new Promise(resolve => setTimeout(resolve, timeoutMs))
            ]),
            cleanup: () => page.removeListener('response', handler)
        };
    }

    extractUserId(url) {
        const match = url.match(/userId=(\d+)/);
        return match ? match[1] : null;
    }

    getRandomUserAgent() {
        return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
    }

    async randomDelay(min = 300, max = 600) {
        const delay = Math.floor(Math.random() * (max - min + 1)) + min;
        await new Promise(resolve => setTimeout(resolve, delay));
    }

    /**
     * Scrape products with optional progress callback for real-time updates
     * @param {string} url - Seller profile URL
     * @param {number} limit - Max products to extract
     * @param {Function} onProgress - Optional callback(stage, message, data)
     */
    async scrapeSellerProducts(url, limit = 50, onProgress = null, existingSellerInfo = null) {
        const emit = (stage, message, data = {}) => {
            console.log(`[Scraper] ${message}`);
            if (onProgress) onProgress(stage, message, data);
        };
        const userId = this.extractUserId(url);
        if (!userId) {
            throw new Error('URL inválida: userId não encontrado');
        }

        emit('connecting', 'Conectando ao vendedor...', { userId });

        try {
            this.browser = await chromium.launch({
                headless: true,
                args: ['--disable-blink-features=AutomationControlled']
            });

            const context = await this.browser.newContext({
                userAgent: this.getRandomUserAgent(),
                viewport: { width: 1920, height: 1080 },
                locale: 'zh-CN',
                timezoneId: 'Asia/Shanghai'
            });

            // Anti-detecção
            await context.addInitScript(() => {
                Object.defineProperty(navigator, 'webdriver', { get: () => false });
            });

            const page = await context.newPage();

            // Capturar dados da API MTOP antes da navegação
            const apiCapture = this._setupApiCapture(page);

            emit('navigating', 'Navegando para página do vendedor...');
            await page.goto(url, {
                waitUntil: 'load',
                timeout: 30000
            });

            // Aguarda API MTOP ser capturada (com timeout de 8s)
            await apiCapture.waitForData();

            // Se já temos info do vendedor, usamos ela e pulamos a extração
            let sellerInfo = null;
            let trustResult = null;

            if (existingSellerInfo) {
                emit('verifying', 'Verificando vendedor (dados em cache)...');
                sellerInfo = existingSellerInfo;
                emit('seller_verified', `Vendedor: ${sellerInfo.nickname || userId}`, { score: sellerInfo.trustScore });
            } else {
                emit('verifying', 'Verificando vendedor...');
                try {
                    const rawInfo = await extractSellerInfo(page, apiCapture.getData());
                    trustResult = calculateTrustScore(rawInfo);
                    sellerInfo = formatSellerData(rawInfo, trustResult);
                    emit('seller_verified', `Vendedor: ${sellerInfo.nickname || userId}`, { score: trustResult.score });
                } catch (sellerError) {
                    console.error('[Scraper] Erro ao extrair info do vendedor:', sellerError.message);
                    if (sellerError.message === 'PAGE_BLOCKED') throw sellerError;
                }
            }

            apiCapture.cleanup();

            // Tenta aguardar cards específicos (timeout REDUZIDO)
            try {
                await page.waitForSelector('a[class*="feeds-item-wrap"], [class*="cardWarp"], [class*="ItemCard"]', {
                    timeout: 8000
                });
                emit('cards_found', 'Produtos detectados na página!');
            } catch (e) {
                emit('scrolling', 'Carregando mais produtos...');
            }

            // Smart Scrolling: Continue until we have enough products OR no new products appear
            emit('scrolling', 'Carregando produtos...');
            const MAX_SCROLLS = 50; // Prevent infinite loops
            const PRODUCTS_PER_SCROLL = 10; // Approximate products loaded per scroll
            let lastCardCount = 0;
            let noNewCardsCount = 0;

            for (let scrollAttempt = 0; scrollAttempt < MAX_SCROLLS; scrollAttempt++) {
                // Check how many cards are currently loaded
                const currentCardCount = await page.evaluate(() => {
                    return document.querySelectorAll('a[class*="feeds-item-wrap"], a[class*="cardWarp"], div[class*="feeds-item-wrap"], div[class*="cardWarp"]').length;
                });

                // If we have enough products, stop scrolling
                if (currentCardCount >= limit) {
                    emit('scrolling', `Produtos suficientes carregados: ${currentCardCount}/${limit}`);
                    break;
                }

                // Check if new products were loaded
                if (currentCardCount === lastCardCount) {
                    noNewCardsCount++;
                    // If 3 consecutive scrolls yield no new products, seller has no more
                    if (noNewCardsCount >= 3) {
                        emit('scrolling', `Vendedor tem apenas ${currentCardCount} produtos disponíveis`);
                        break;
                    }
                } else {
                    noNewCardsCount = 0;
                    lastCardCount = currentCardCount;
                }

                // Scroll down
                await page.evaluate(() => window.scrollBy(0, window.innerHeight));
                await this.randomDelay(400, 700);

                // Progress update every 10 scrolls
                if ((scrollAttempt + 1) % 10 === 0) {
                    emit('scrolling', `Carregando... ${currentCardCount} produtos encontrados`);
                }
            }

            // Extraction Phase: Scroll through page again, collecting products incrementally
            // This is necessary because Goofish uses virtualization (only visible items are in DOM)
            emit('extracting', 'Extraindo produtos...');
            console.log('[Scraper] Extraindo produtos...');

            // Scroll back to top
            await page.evaluate(() => window.scrollTo(0, 0));
            await this.randomDelay(500, 800);

            // Collect products incrementally during scroll
            const allProducts = new Map(); // Use Map to deduplicate by ID
            const MAX_EXTRACTION_SCROLLS = 200; // Increased for larger limits with virtualization
            let extractionScrolls = 0;
            let lastProductCount = 0;
            let stagnantScrolls = 0;
            let lastScrollPosition = 0;
            const expectedProducts = lastCardCount; // Remember how many we saw during loading phase

            while (allProducts.size < limit && extractionScrolls < MAX_EXTRACTION_SCROLLS) {
                // Extract products currently visible in the viewport
                const visibleProducts = await page.evaluate(() => {
                    const items = [];
                    const cards = document.querySelectorAll('a[class*="feeds-item-wrap"], a[class*="cardWarp"], div[class*="feeds-item-wrap"], div[class*="cardWarp"]');

                    cards.forEach((card) => {
                        try {
                            const productUrl = card.tagName === 'A' ? card.href : (card.querySelector('a')?.href || '');
                            if (!productUrl.includes('/item')) return;

                            // Extract product ID
                            let productId = null;
                            const idMatch = productUrl.match(/id=(\d+)/);
                            if (idMatch) {
                                productId = idMatch[1];
                            } else {
                                const itemIdMatch = productUrl.match(/item\/(\d+)/);
                                if (itemIdMatch) productId = itemIdMatch[1];
                            }
                            if (!productId) return;

                            // Extract title
                            let title = '';
                            const allSpans = card.querySelectorAll('span');
                            for (const span of allSpans) {
                                const text = span.textContent?.trim();
                                if (text && text.length > 10 && text.length < 300 &&
                                    !text.includes('¥') && !text.match(/^\d+$/) &&
                                    !text.includes('人想要') && !text.includes('人付款')) {
                                    title = text;
                                    break;
                                }
                            }
                            if (!title) {
                                const cardText = card.textContent?.trim();
                                const cleanText = cardText?.replace(/¥[\d,.]+/g, '').replace(/\d+人(想要|付款)/g, '').trim();
                                if (cleanText && cleanText.length > 5) title = cleanText.slice(0, 100);
                            }

                            // Extract price
                            let price = 0;
                            const priceNumberSpan = card.querySelector('span[class*="number"], [class*="priceText"]');
                            if (priceNumberSpan) {
                                const priceText = priceNumberSpan.textContent?.replace(/[^\d.]/g, '').trim();
                                if (priceText) price = parseFloat(priceText);
                            }
                            if (!price) {
                                const priceWrap = card.querySelector('div[class*="price-wrap"], [class*="priceWrap"]');
                                if (priceWrap) {
                                    const wrapText = priceWrap.textContent?.replace(/[^\d.]/g, '').trim();
                                    if (wrapText) price = parseFloat(wrapText);
                                }
                            }
                            if (!price) {
                                const priceMatch = (card.textContent || '').match(/¥\s*([\d,.]+)/);
                                if (priceMatch) price = parseFloat(priceMatch[1].replace(',', '.'));
                            }

                            // ========================================
                            // IMAGE EXTRACTION - Target specific feeds-image class
                            // ========================================

                            let imageUrl = '';

                            // 1. PRIORITY: Look for product image with feeds-image class
                            const feedsImg = card.querySelector('img[class*="feeds-image"]');
                            if (feedsImg) {
                                const src = feedsImg.getAttribute('data-actualsrc') ||
                                    feedsImg.getAttribute('data-src') ||
                                    feedsImg.getAttribute('data-lazy-src') ||
                                    feedsImg.getAttribute('src') ||
                                    feedsImg.src;

                                if (src && src.length > 30 && !src.includes('base64')) {
                                    // Reject known placeholder patterns
                                    const isPlaceholder = /tps-\d+-\d+\.png/i.test(src) ||
                                        /blank\.(gif|png|jpg)/i.test(src) ||
                                        /placeholder/i.test(src);
                                    if (!isPlaceholder) {
                                        imageUrl = src;
                                    }
                                }
                            }

                            // 2. Fallback: check canvas with data-src (lazy loading)
                            if (!imageUrl) {
                                const canvas = card.querySelector('canvas[class*="feeds-image"]');
                                if (canvas) {
                                    const cSrc = canvas.getAttribute('data-src') || canvas.getAttribute('data-actualsrc');
                                    if (cSrc && cSrc.length > 30 && !cSrc.includes('base64') && !/tps-\d+-\d+\.png/i.test(cSrc)) {
                                        imageUrl = cSrc;
                                    }
                                }
                            }

                            // 3. Normalize URL if found
                            if (imageUrl) {
                                if (imageUrl.startsWith('//')) imageUrl = 'https:' + imageUrl;
                            }

                            // If no valid image found, imageUrl stays empty
                            // Frontend will display "Sem imagem" placeholder

                            // Clean and normalize URL
                            if (imageUrl) {
                                if (imageUrl.startsWith('//')) imageUrl = 'https:' + imageUrl;

                                // Remove common Alibaba thumbnail suffixes
                                imageUrl = imageUrl.replace(/(_\d+x\d+.*?\.(jpg|png|webp|jpeg|gif))$/i, '');
                                imageUrl = imageUrl.replace(/(\_\.\w+)$/i, '');
                            }

                            if (title || price > 0) {
                                items.push({
                                    id: productId,
                                    name: title || `Produto #${productId}`,
                                    price,
                                    priceFormatted: price > 0 ? `¥ ${price}` : '¥ --',
                                    url: productUrl,
                                    images: imageUrl ? [imageUrl] : []
                                });
                            }
                        } catch (err) {
                            // Ignore individual errors
                        }
                    });
                    return items;
                });

                // Add newly found products to the collection
                for (const product of visibleProducts) {
                    const existing = allProducts.get(product.id);

                    // Add if new
                    if (!existing && allProducts.size < limit) {
                        allProducts.set(product.id, product);
                    }
                    // Update if existing product was poor (no image) and we found a better one
                    else if (existing && (!existing.images || existing.images.length === 0) && (product.images && product.images.length > 0)) {
                        allProducts.set(product.id, product);
                    }
                }

                // Get current scroll position to detect if we're at the end
                const scrollInfo = await page.evaluate(() => ({
                    scrollY: window.scrollY,
                    scrollHeight: document.documentElement.scrollHeight,
                    clientHeight: window.innerHeight
                }));

                const atPageEnd = scrollInfo.scrollY + scrollInfo.clientHeight >= scrollInfo.scrollHeight - 100;

                // Check for stagnation (no new products found)
                if (allProducts.size === lastProductCount) {
                    stagnantScrolls++;

                    // Only stop if we've truly exhausted AND collected a reasonable amount
                    // OR if we've been stagnant for a very long time
                    const collectedEnough = allProducts.size >= Math.min(limit, expectedProducts * 0.9);

                    // If we're at page end AND no new products AND we've collected most of what we saw
                    if (atPageEnd && stagnantScrolls >= 8 && collectedEnough) {
                        console.log(`[Scraper] Reached end of page with ${allProducts.size} products (expected ~${expectedProducts}).`);
                        break;
                    }

                    // If stagnant but we haven't collected enough, try harder
                    if (stagnantScrolls >= 10 && !collectedEnough) {
                        // Scroll back up and try again from different position
                        await page.evaluate(() => window.scrollTo(0, Math.random() * document.documentElement.scrollHeight * 0.5));
                        await this.randomDelay(800, 1200);
                        stagnantScrolls = 5; // Reset partially to give more chances
                    }

                    // Increased threshold to 20 AND require scroll position to not advance
                    if (stagnantScrolls >= 20 && scrollInfo.scrollY === lastScrollPosition) {
                        console.log(`[Scraper] No new products after ${stagnantScrolls} scrolls at same position, collected ${allProducts.size}/${limit}.`);
                        break;
                    }

                    // If stuck, try a larger scroll jump to skip virtualized recycled elements
                    if (stagnantScrolls >= 5 && stagnantScrolls % 5 === 0) {
                        await page.evaluate(() => window.scrollBy(0, window.innerHeight * 3));
                        await this.randomDelay(800, 1200);
                    }
                } else {
                    stagnantScrolls = 0;
                    lastProductCount = allProducts.size;
                }

                lastScrollPosition = scrollInfo.scrollY;

                // Scroll down for next batch (larger scroll to avoid revisiting same products)
                await page.evaluate(() => window.scrollBy(0, window.innerHeight * 2));
                await this.randomDelay(500, 800);
                extractionScrolls++;

                // Progress update
                if (extractionScrolls % 10 === 0) {
                    emit('extracting', `Extraindo... ${allProducts.size}/${limit} produtos`);
                }
            }

            const products = Array.from(allProducts.values());

            emit('products_found', `${products.length} produtos encontrados!`, { count: products.length });

            // Se não encontrou produtos, captura debug
            if (products.length === 0) {
                console.log('[Scraper] Nenhum produto encontrado. Debug info:');

                const debugInfo = await page.evaluate(() => {
                    // Lista todas as classes que contêm 'feeds' ou 'card' ou 'item'
                    const relevantElements = document.querySelectorAll('*[class]');
                    const classes = new Set();
                    relevantElements.forEach(el => {
                        const className = el.className;
                        if (typeof className === 'string' &&
                            (className.includes('feeds') ||
                                className.includes('card') ||
                                className.includes('Card') ||
                                className.includes('item') ||
                                className.includes('Item'))) {
                            classes.add(className.split(' ')[0]);
                        }
                    });
                    return Array.from(classes).slice(0, 30);
                });

                console.log('[Scraper] Classes relevantes:', debugInfo);

                // Conta links de item
                const itemLinksCount = await page.evaluate(() => {
                    return document.querySelectorAll('a[href*="/item"]').length;
                });
                console.log(`[Scraper] Links para /item encontrados: ${itemLinksCount}`);
            }

            await this.browser.close();
            this.browser = null;

            // sellerInfo já está formatado (via formatSellerData ou existingSellerInfo)
            const formattedSellerInfo = sellerInfo || null;

            return {
                sellerId: userId,
                sellerInfo: formattedSellerInfo,
                productCount: products.length,
                products: products.map(p => ({ ...p, sellerId: userId }))
            };

        } catch (error) {
            console.error('[Scraper] Erro:', error.message);

            if (this.browser) {
                await this.browser.close();
                this.browser = null;
            }

            throw error;
        }
    }

    /**
     * Scrape products using the browser pool
     * Recommended for queue workers - more memory efficient
     * @param {string} url - Seller profile URL
     * @param {number} limit - Max products to extract
     * @param {Function} onProgress - Optional callback(stage, message, data)
     * @param {Object} existingSellerInfo - Cached seller info to skip re-extraction
     */
    async scrapeWithPool(url, limit = 50, onProgress = null, existingSellerInfo = null) {
        const emit = (stage, message, data = {}) => {
            console.log(`[Scraper] ${message}`);
            if (onProgress) onProgress(stage, message, data);
        };

        const userId = this.extractUserId(url);
        if (!userId) {
            throw new Error('URL inválida: userId não encontrado');
        }

        emit('connecting', 'Conectando ao vendedor...', { userId });

        // Acquire browser from pool
        const { page, release } = await browserPool.acquire();

        try {
            // Capturar dados da API MTOP antes da navegação
            const apiCapture = this._setupApiCapture(page);

            emit('navigating', 'Navegando para página do vendedor...');
            await page.goto(url, {
                waitUntil: 'load',
                timeout: 30000
            });

            // Aguarda API MTOP ser capturada (com timeout de 8s)
            await apiCapture.waitForData();

            // Extract seller info if not cached
            let sellerInfo = null;
            let trustResult = null;

            if (existingSellerInfo) {
                emit('verifying', 'Verificando vendedor (dados em cache)...');
                sellerInfo = existingSellerInfo;
                emit('seller_verified', `Vendedor: ${sellerInfo.nickname || userId}`, { score: sellerInfo.trustScore });
            } else {
                emit('verifying', 'Verificando vendedor...');
                try {
                    const { extractSellerInfo, calculateTrustScore, formatSellerData } = await import('./sellerAnalyzer.js');
                    const rawInfo = await extractSellerInfo(page, apiCapture.getData());
                    trustResult = calculateTrustScore(rawInfo);
                    sellerInfo = formatSellerData(rawInfo, trustResult);
                    emit('seller_verified', `Vendedor: ${sellerInfo.nickname || userId}`, { score: trustResult.score });
                } catch (sellerError) {
                    console.error('[Scraper] Erro ao extrair info do vendedor:', sellerError.message);
                    if (sellerError.message === 'PAGE_BLOCKED') throw sellerError;
                }
            }

            apiCapture.cleanup();

            // Wait for cards
            try {
                await page.waitForSelector('a[class*="feeds-item-wrap"], [class*="cardWarp"], [class*="ItemCard"]', {
                    timeout: 8000
                });
                emit('cards_found', 'Produtos detectados na página!');
            } catch (e) {
                emit('scrolling', 'Carregando mais produtos...');
            }

            // Smart scrolling - same logic as scrapeSellerProducts
            emit('scrolling', 'Carregando produtos...');
            const MAX_SCROLLS = 50;
            let lastCardCount = 0;
            let noNewCardsCount = 0;

            for (let scrollAttempt = 0; scrollAttempt < MAX_SCROLLS; scrollAttempt++) {
                const currentCardCount = await page.evaluate(() => {
                    return document.querySelectorAll('a[class*="feeds-item-wrap"], a[class*="cardWarp"], div[class*="feeds-item-wrap"], div[class*="cardWarp"]').length;
                });

                if (currentCardCount >= limit) {
                    emit('scrolling', `Produtos suficientes carregados: ${currentCardCount}/${limit}`);
                    break;
                }

                if (currentCardCount === lastCardCount) {
                    noNewCardsCount++;
                    if (noNewCardsCount >= 3) {
                        emit('scrolling', `Vendedor tem apenas ${currentCardCount} produtos disponíveis`);
                        break;
                    }
                } else {
                    noNewCardsCount = 0;
                    lastCardCount = currentCardCount;
                }

                await page.evaluate(() => window.scrollBy(0, window.innerHeight));
                await this.randomDelay(400, 700);

                if ((scrollAttempt + 1) % 10 === 0) {
                    emit('scrolling', `Carregando... ${currentCardCount} produtos encontrados`);
                }
            }

            // Extraction phase - simplified version using same extraction logic
            emit('extracting', 'Extraindo produtos...');
            await page.evaluate(() => window.scrollTo(0, 0));
            await this.randomDelay(500, 800);

            const allProducts = new Map();
            const MAX_EXTRACTION_SCROLLS = 200;
            let extractionScrolls = 0;
            let lastProductCount = 0;
            let stagnantScrolls = 0;
            let lastScrollPosition = 0;
            const expectedProducts = lastCardCount; // Remember how many we saw during loading phase

            while (allProducts.size < limit && extractionScrolls < MAX_EXTRACTION_SCROLLS) {
                const visibleProducts = await page.evaluate(() => {
                    const items = [];
                    const cards = document.querySelectorAll('a[class*="feeds-item-wrap"], a[class*="cardWarp"], div[class*="feeds-item-wrap"], div[class*="cardWarp"]');

                    cards.forEach((card) => {
                        try {
                            const productUrl = card.tagName === 'A' ? card.href : (card.querySelector('a')?.href || '');
                            if (!productUrl.includes('/item')) return;

                            let productId = null;
                            const idMatch = productUrl.match(/id=(\d+)/);
                            if (idMatch) productId = idMatch[1];
                            else {
                                const itemIdMatch = productUrl.match(/item\/(\d+)/);
                                if (itemIdMatch) productId = itemIdMatch[1];
                            }
                            if (!productId) return;

                            let title = '';
                            const allSpans = card.querySelectorAll('span');
                            for (const span of allSpans) {
                                const text = span.textContent?.trim();
                                if (text && text.length > 10 && text.length < 300 &&
                                    !text.includes('¥') && !text.match(/^\d+$/) &&
                                    !text.includes('人想要') && !text.includes('人付款')) {
                                    title = text;
                                    break;
                                }
                            }

                            let price = 0;
                            const priceMatch = (card.textContent || '').match(/¥\s*([\d,.]+)/);
                            if (priceMatch) price = parseFloat(priceMatch[1].replace(',', '.'));

                            // ========================================
                            // IMAGE EXTRACTION - Target specific feeds-image class
                            // ========================================

                            let imageUrl = '';

                            // 1. PRIORITY: Look for product image with feeds-image class
                            const feedsImg = card.querySelector('img[class*="feeds-image"]');
                            if (feedsImg) {
                                const src = feedsImg.getAttribute('data-actualsrc') ||
                                    feedsImg.getAttribute('data-src') ||
                                    feedsImg.getAttribute('data-lazy-src') ||
                                    feedsImg.getAttribute('src') ||
                                    feedsImg.src;

                                if (src && src.length > 30 && !src.includes('base64')) {
                                    const isPlaceholder = /tps-\d+-\d+\.png/i.test(src) ||
                                        /blank\.(gif|png|jpg)/i.test(src) ||
                                        /placeholder/i.test(src);
                                    if (!isPlaceholder) {
                                        imageUrl = src;
                                    }
                                }
                            }

                            // 2. Fallback: check canvas with feeds-image class
                            if (!imageUrl) {
                                const canvas = card.querySelector('canvas[class*="feeds-image"]');
                                if (canvas) {
                                    const cSrc = canvas.getAttribute('data-src') || canvas.getAttribute('data-actualsrc');
                                    if (cSrc && cSrc.length > 30 && !cSrc.includes('base64') && !/tps-\d+-\d+\.png/i.test(cSrc)) {
                                        imageUrl = cSrc;
                                    }
                                }
                            }

                            // 3. Normalize URL
                            if (imageUrl && imageUrl.startsWith('//')) {
                                imageUrl = 'https:' + imageUrl;
                            }

                            if (title || price > 0) {
                                items.push({
                                    id: productId,
                                    name: title || `Produto #${productId}`,
                                    price,
                                    priceFormatted: price > 0 ? `¥ ${price}` : '¥ --',
                                    url: productUrl,
                                    images: imageUrl ? [imageUrl] : []
                                });
                            }
                        } catch (err) { }
                    });
                    return items;
                });

                for (const product of visibleProducts) {
                    const existing = allProducts.get(product.id);
                    if (!existing && allProducts.size < limit) {
                        allProducts.set(product.id, product);
                    } else if (existing && (!existing.images || existing.images.length === 0) && (product.images && product.images.length > 0)) {
                        allProducts.set(product.id, product);
                    }
                }

                const scrollInfo = await page.evaluate(() => ({
                    scrollY: window.scrollY,
                    scrollHeight: document.documentElement.scrollHeight,
                    clientHeight: window.innerHeight
                }));

                const atPageEnd = scrollInfo.scrollY + scrollInfo.clientHeight >= scrollInfo.scrollHeight - 100;

                if (allProducts.size === lastProductCount) {
                    stagnantScrolls++;

                    const collectedEnough = allProducts.size >= Math.min(limit, expectedProducts * 0.9);

                    if (atPageEnd && stagnantScrolls >= 8 && collectedEnough) break;

                    if (stagnantScrolls >= 10 && !collectedEnough) {
                        await page.evaluate(() => window.scrollTo(0, Math.random() * document.documentElement.scrollHeight * 0.5));
                        await this.randomDelay(800, 1200);
                        stagnantScrolls = 5;
                    }

                    if (stagnantScrolls >= 20 && scrollInfo.scrollY === lastScrollPosition) break;

                    if (stagnantScrolls >= 5 && stagnantScrolls % 5 === 0) {
                        await page.evaluate(() => window.scrollBy(0, window.innerHeight * 3));
                        await this.randomDelay(800, 1200);
                    }
                } else {
                    stagnantScrolls = 0;
                    lastProductCount = allProducts.size;
                }

                lastScrollPosition = scrollInfo.scrollY;
                await page.evaluate(() => window.scrollBy(0, window.innerHeight * 2));
                await this.randomDelay(500, 800);
                extractionScrolls++;

                if (extractionScrolls % 10 === 0) {
                    emit('extracting', `Extraindo... ${allProducts.size}/${limit} produtos`);
                }
            }

            const products = Array.from(allProducts.values());
            emit('products_found', `${products.length} produtos encontrados!`, { count: products.length });

            // sellerInfo já está formatado (via formatSellerData ou existingSellerInfo)
            const formattedSellerInfo = sellerInfo || null;

            return {
                sellerId: userId,
                sellerInfo: formattedSellerInfo,
                productCount: products.length,
                products: products.map(p => ({ ...p, sellerId: userId }))
            };

        } catch (error) {
            console.error('[Scraper] Erro:', error.message);
            throw error;
        } finally {
            await release();
        }
    }

    generateMockData(userId, limit = 50) {
        const mockProducts = [];
        const categories = [
            { name: '苹果手机 iPhone 15 Pro Max 256GB', basePrice: 8999 },
            { name: '索尼 PlayStation 5 游戏机', basePrice: 3999 },
            { name: '戴森 V15 无线吸尘器', basePrice: 4299 },
            { name: '苹果 AirPods Pro 第二代', basePrice: 1499 },
            { name: '任天堂 Switch OLED 游戏机', basePrice: 2299 }
        ];

        const count = Math.min(limit, 50);

        for (let i = 0; i < count; i++) {
            const category = categories[i % categories.length];
            const priceVariation = 0.5 + Math.random() * 0.4;
            const price = Math.round(category.basePrice * priceVariation);

            mockProducts.push({
                id: `mock-${userId}-${i}`,
                name: category.name,
                price,
                priceFormatted: `¥ ${price.toFixed(2)}`,
                url: `https://www.goofish.com/item/${1000000 + i}`,
                images: [`https://picsum.photos/400/400?random=${i}`],
                sellerId: userId
            });
        }

        return {
            sellerId: userId,
            productCount: mockProducts.length,
            products: mockProducts,
            isMock: true
        };
    }
}

export default new GoofishScraper();
