import { Router } from 'express';
import { authMiddleware } from '../authMiddleware.js';
import browserPool from '../browserPool.js';
import scraper from '../scraper.js';
import { translateProducts } from '../translator.js';
import cache from '../cache.js';
import { extractSellerInfo, calculateTrustScore, formatSellerData } from '../sellerAnalyzer.js';
import { scrapeProductsForComparison } from '../productAnalyzer.js';
import {
    miningLimitMiddleware,
    consumeCredit,
    refundCredit,
    startMiningSession,
    endMiningSession,
    TIER_MINING_MAX_PRODUCTS
} from '../miningLimits.js';
import { notifyMiningComplete, notifyCreditsLow, notifyCreditSpent } from '../notificationService.js';
import metrics from '../metrics.js';

const router = Router();

// Cache for seller evaluations (avoids re-evaluating the same seller)
const sellerCache = new Map();

/**
 * Returns the sellerCache Map so other modules can access cached seller data.
 */
export function getSellerCache() {
    return sellerCache;
}

/**
 * POST /api/evaluate-seller
 * Quick seller evaluation without product scraping
 */
router.post('/evaluate-seller', async (req, res) => {
    try {
        const { url } = req.body;

        if (!url) {
            return res.status(400).json({ error: 'URL do vendedor é obrigatória' });
        }

        if (!url.includes('goofish.com') && !url.includes('xianyu.com')) {
            return res.status(400).json({ error: 'URL deve ser do Goofish' });
        }

        const userId = scraper.extractUserId(url);
        if (!userId) {
            return res.status(400).json({ error: 'userId não encontrado na URL' });
        }

        // Check seller evaluation cache
        if (sellerCache.has(userId)) {
            console.log(`[Server] Retornando avaliação do cache: ${userId}`);
            return res.json({ sellerInfo: sellerCache.get(userId), fromCache: true });
        }

        console.log(`[Server] Avaliando vendedor: ${userId}`);

        const { page, release } = await browserPool.acquire();

        try {
            // Capturar dados da API MTOP antes da navegação (com Promise para aguardar)
            let mtopHeadData = null;
            let resolveCapture;
            const capturedPromise = new Promise(resolve => { resolveCapture = resolve; });
            const apiHandler = async (response) => {
                const rUrl = response.url();
                if (rUrl.includes('user.page.head') || rUrl.includes('idle.web.user.page')) {
                    try {
                        const body = await response.text();
                        let jsonStr = body;
                        const m = body.match(/mtopjsonp\d*\((.+)\)$/s);
                        if (m) jsonStr = m[1];
                        const parsed = JSON.parse(jsonStr);
                        if (parsed.ret?.some(r => r.includes('SUCCESS')) && parsed.data && Object.keys(parsed.data).length > 0) {
                            mtopHeadData = parsed.data;
                        }
                    } catch (e) {}
                    resolveCapture();
                }
            };
            page.on('response', apiHandler);

            await page.goto(url, { waitUntil: 'load', timeout: 30000 });

            // Aguarda API MTOP ser processada (com timeout de 8s)
            await Promise.race([
                capturedPromise,
                new Promise(resolve => setTimeout(resolve, 8000))
            ]);

            const sellerInfo = await extractSellerInfo(page, mtopHeadData);
            page.removeListener('response', apiHandler);

            const trustResult = calculateTrustScore(sellerInfo);
            const formattedSellerInfo = formatSellerData(sellerInfo, trustResult);

            // Store in cache
            sellerCache.set(userId, formattedSellerInfo);

            console.log(`[Server] Vendedor avaliado: ${sellerInfo.nickname || userId} - ${trustResult.score}pts (${trustResult.classification})`);

            res.json({ sellerInfo: formattedSellerInfo });
        } finally {
            await release();
        }

    } catch (error) {
        if (error.message === 'QUEUE_FULL') {
            metrics.recordError('browser_pool', 'Queue full');
            return res.status(503).json({ error: 'Servidor ocupado, tente novamente em instantes' });
        }
        if (error.message === 'PAGE_BLOCKED') {
            metrics.recordError('evaluate_seller', 'Blocked by Captcha');
            return res.status(403).json({ 
                error: 'Acesso temporariamente bloqueado pelo Goofish (Captcha)', 
                code: 'PAGE_BLOCKED',
                message: 'O Goofish solicitou uma verificação de segurança. Tente novamente em alguns minutos ou use um link de outro vendedor.'
            });
        }
        metrics.recordError('evaluate_seller', error.message);
        console.error('[Server] Erro ao avaliar vendedor:', error.message);
        res.status(500).json({ error: 'Erro ao avaliar vendedor', details: error.message });
    }
});

/**
 * GET /api/mine-stream
 * Server-Sent Events endpoint for real-time mining progress
 */
router.get('/mine-stream', authMiddleware, miningLimitMiddleware, async (req, res) => {
    const { url, limit = 50 } = req.query;

    if (!url) {
        return res.status(400).json({ error: 'URL do vendedor é obrigatória' });
    }

    if (!url.includes('goofish.com') && !url.includes('xianyu.com')) {
        return res.status(400).json({ error: 'URL deve ser do Goofish' });
    }

    const sellerId = scraper.extractUserId(url);
    if (!sellerId) {
        return res.status(400).json({ error: 'userId não encontrado na URL' });
    }

    // Validate tier product limit
    const userTier = req.user.tier || 'guest';
    const tierMaxProducts = TIER_MINING_MAX_PRODUCTS[userTier] || 30;
    const requestedLimit = parseInt(limit);

    if (requestedLimit > tierMaxProducts) {
        console.log(`[Server] Limite de produtos excedido para tier ${userTier}: ${requestedLimit}/${tierMaxProducts}`);
        return res.status(403).json({
            error: 'Limite de produtos excedido',
            message: `Seu plano (${userTier}) permite minerar até ${tierMaxProducts} produtos por vez.`,
            code: 'TIER_PRODUCT_LIMIT_EXCEEDED',
            limit: tierMaxProducts,
            requested: requestedLimit
        });
    }

    const userId = req.user.id;

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders();

    const sendEvent = (event, data) => {
        res.write(`event: ${event}\n`);
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    // Check cache first
    const cacheKey = `${sellerId}_${limit}`;
    if (cache.has(cacheKey)) {
        console.log(`[Server] Retornando dados do cache: ${sellerId}`);
        sendEvent('progress', { stage: 'cache', message: 'Carregando do cache...' });
        const cachedData = cache.get(cacheKey);

        let sellerInfoFromCache;
        if (cachedData.sellerInfo) {
            sellerInfoFromCache = { ...cachedData.sellerInfo, sellerId: sellerId };
        } else if (sellerCache.has(sellerId)) {
            sellerInfoFromCache = { ...sellerCache.get(sellerId), sellerId: sellerId };
        } else {
            sellerInfoFromCache = { sellerId: sellerId };
        }

        sendEvent('complete', { ...cachedData, sellerInfo: sellerInfoFromCache, fromCache: true });
        return res.end();
    }

    // Check seller cache to reuse verification data
    let existingSellerInfo = null;
    if (sellerCache.has(sellerId)) {
        existingSellerInfo = sellerCache.get(sellerId);
        console.log(`[Server] Reutilizando dados do vendedor do cache: ${sellerId}`);
    }

    // Start tracking mining session
    startMiningSession(userId, url);
    const miningStartTime = Date.now();

    try {
        const onProgress = (stage, message, data = {}) => {
            sendEvent('progress', { stage, message, ...data });
        };

        sendEvent('progress', { stage: 'starting', message: 'Iniciando mineração...', miningInfo: req.miningInfo });

        const result = await scraper.scrapeSellerProducts(url, parseInt(limit), onProgress, existingSellerInfo);

        // LOG-03: Don't consume credit if scraping returned 0 products
        if (!result.products || result.products.length === 0) {
            console.log(`[Server] Mineração retornou 0 produtos para ${sellerId}, crédito não consumido`);
            sendEvent('error', { message: 'Nenhum produto encontrado para este vendedor. Seu crédito não foi consumido.' });
            return;
        }

        // LOG-03: Translation with fallback — if translation fails, deliver untranslated products
        sendEvent('progress', { stage: 'translating', message: 'Traduzindo produtos...', total: result.products.length });

        try {
            const translatedProducts = await translateProducts(result.products);
            result.products = translatedProducts;
        } catch (translateError) {
            console.warn('[Server] Tradução falhou, entregando produtos sem tradução:', translateError.message);
            sendEvent('progress', { stage: 'translating', message: 'Tradução indisponível, entregando produtos originais...' });
        }

        // Cache result
        cache.set(cacheKey, result);

        let finalSellerInfo;
        if (result.sellerInfo) {
            finalSellerInfo = { ...result.sellerInfo, sellerId: sellerId };
            sellerCache.set(sellerId, result.sellerInfo);
            console.log(`[Server] Using fresh sellerInfo from scraper, cached for future use`);
        } else if (existingSellerInfo) {
            finalSellerInfo = { ...existingSellerInfo, sellerId: sellerId };
            console.log(`[Server] Using existingSellerInfo from cache`);
        } else {
            finalSellerInfo = { sellerId: sellerId };
            console.log(`[Server] No sellerInfo available, using minimal object`);
        }

        // LOG-03: Send complete event FIRST, then consume credit
        // If SSE send fails, credit is not consumed
        sendEvent('complete', {
            ...result,
            sellerInfo: finalSellerInfo,
            miningInfo: req.miningInfo
        });

        // LOG-03: Consume credit only after successful delivery
        const creditResult = await consumeCredit(userId);
        if (creditResult === null) {
            console.warn(`[Server] Falha ao consumir crédito de ${userId}, mas dados foram entregues`);
        }

        sendEvent('progress', { stage: 'done', message: 'Mineração concluída!' });

        metrics.recordMining(Date.now() - miningStartTime, result.productCount);
        console.log(`[Server] Mineração SSE concluída: ${result.productCount} produtos | sellerId: ${sellerId}`);

        // FEAT-01: Auto-notifications (fire-and-forget, don't block response)
        const sellerName = finalSellerInfo?.name || finalSellerInfo?.nickname || null;
        notifyMiningComplete(userId, result.productCount, sellerName).catch(() => {});
        if (creditResult !== null) {
            notifyCreditSpent(userId, 1, 'mining', creditResult).catch(() => {});
            if (creditResult <= 3) {
                notifyCreditsLow(userId, creditResult).catch(() => {});
            }
        }

    } catch (error) {
        metrics.recordError('mining', error.message);
        console.error('[Server] Erro na mineração SSE:', error.message);
        const errorCode = error.message === 'PAGE_BLOCKED' ? 'PAGE_BLOCKED' : 'MINING_ERROR';
        sendEvent('error', { 
            code: errorCode, 
            message: error.message === 'PAGE_BLOCKED' 
                ? 'O Goofish bloqueou o acesso temporariamente (Captcha). Tente novamente em instantes.' 
                : error.message 
        });
    } finally {
        endMiningSession(userId);
    }

    res.end();
});

/**
 * POST /api/mine
 * Start product mining from a seller
 */
router.post('/mine', async (req, res) => {
    try {
        const { url, limit = 50, useMock = false } = req.body;

        if (!url) {
            return res.status(400).json({ error: 'URL do vendedor é obrigatória' });
        }

        if (!url.includes('goofish.com') && !url.includes('xianyu.com')) {
            return res.status(400).json({ error: 'URL deve ser do Goofish (goofish.com ou xianyu.com)' });
        }

        const userId = scraper.extractUserId(url);
        if (!userId) {
            return res.status(400).json({ error: 'userId não encontrado na URL' });
        }

        const cacheKey = `${userId}_${limit}`;

        if (cache.has(cacheKey)) {
            console.log(`[Server] Retornando dados do cache para vendedor: ${userId} (limite: ${limit})`);
            const cachedData = cache.get(cacheKey);
            return res.json({ ...cachedData, fromCache: true });
        }

        console.log(`[Server] Iniciando mineração para: ${url} (limite: ${limit})`);

        let result;

        if (useMock) {
            console.log('[Server] Usando dados mock...');
            result = scraper.generateMockData(userId, limit);
        } else {
            try {
                result = await scraper.scrapeSellerProducts(url, limit);
            } catch (scrapeError) {
                console.error('[Server] Scraping falhou, usando mock data:', scrapeError.message);
                result = scraper.generateMockData(userId, limit);
            }
        }

        console.log('[Server] Traduzindo produtos...');
        const translatedProducts = await translateProducts(result.products);
        result.products = translatedProducts;

        cache.set(cacheKey, result);

        console.log(`[Server] Mineração concluída: ${result.productCount} produtos`);
        res.json(result);

    } catch (error) {
        console.error('[Server] Erro na mineração:', error);
        res.status(500).json({ error: 'Erro ao minerar produtos', details: error.message });
    }
});

/**
 * GET /api/products/:sellerId
 * Return cached products with filters
 */
router.get('/products/:sellerId', (req, res) => {
    try {
        const { sellerId } = req.params;
        const { keyword, minPrice, maxPrice, sort, limit, offset } = req.query;

        const data = cache.get(sellerId);
        if (!data) {
            return res.status(404).json({ error: 'Vendedor não encontrado. Execute a mineração primeiro.' });
        }

        let products = [...data.products];

        // Filter by keyword
        if (keyword) {
            const kw = keyword.toLowerCase();
            products = products.filter(p =>
                p.nameOriginal?.toLowerCase().includes(kw) ||
                p.nameTranslated?.toLowerCase().includes(kw) ||
                p.name?.toLowerCase().includes(kw)
            );
        }

        if (minPrice) {
            products = products.filter(p => p.price >= parseFloat(minPrice));
        }

        if (maxPrice) {
            products = products.filter(p => p.price <= parseFloat(maxPrice));
        }

        // Sort
        if (sort) {
            switch (sort) {
                case 'price_asc':
                    products.sort((a, b) => a.price - b.price);
                    break;
                case 'price_desc':
                    products.sort((a, b) => b.price - a.price);
                    break;
                case 'name_asc':
                    products.sort((a, b) => (a.nameTranslated || a.name).localeCompare(b.nameTranslated || b.name));
                    break;
                case 'name_desc':
                    products.sort((a, b) => (b.nameTranslated || b.name).localeCompare(a.nameTranslated || a.name));
                    break;
            }
        }

        // Pagination
        const offsetNum = parseInt(offset) || 0;
        const limitNum = parseInt(limit) || products.length;
        const paginatedProducts = products.slice(offsetNum, offsetNum + limitNum);

        res.json({
            sellerId,
            totalCount: products.length,
            products: paginatedProducts
        });

    } catch (error) {
        console.error('[Server] Erro ao buscar produtos:', error);
        res.status(500).json({ error: 'Erro ao buscar produtos', details: error.message });
    }
});

/**
 * POST /api/compare
 * Compare multiple products with scored analysis (max 4)
 */
router.post('/compare', async (req, res) => {
    try {
        const { products } = req.body;

        if (!products || !Array.isArray(products) || products.length < 2) {
            return res.status(400).json({
                error: 'At least 2 products are required for comparison'
            });
        }

        if (products.length > 4) {
            return res.status(400).json({
                error: 'Maximum 4 products can be compared at once'
            });
        }

        const productUrls = products.map(p => p.url).filter(Boolean);

        if (productUrls.length < 2) {
            return res.status(400).json({
                error: 'Valid product URLs are required'
            });
        }

        console.log(`[Server] Comparing ${productUrls.length} products...`);

        const result = await scrapeProductsForComparison(productUrls, (stage, message) => {
            console.log(`[Compare] ${message}`);
        });

        console.log(`[Server] Comparison complete. Winner: ${result.winner} with ${result.winnerScore} points`);

        res.json(result);

    } catch (error) {
        console.error('[Server] Comparison error:', error);
        res.status(500).json({
            error: 'Error comparing products',
            details: error.message
        });
    }
});

export default router;
