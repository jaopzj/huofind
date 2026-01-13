import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import scraper from './scraper.js';
import { translateProducts } from './translator.js';
import cache from './cache.js';
import { extractSellerInfo, calculateTrustScore, formatSellerData } from './sellerAnalyzer.js';
import { scrapeProductsForComparison } from './productAnalyzer.js';
import { chromium } from 'playwright';

// Auth imports
import { registerUser, loginUser, refreshAccessToken, logoutUser } from './auth.js';
import { authMiddleware, optionalAuthMiddleware } from './authMiddleware.js';

// Mining limits system (unified)
import {
    miningLimitMiddleware,
    incrementMiningCount,
    startMiningSession,
    endMiningSession,
    getUserMiningData,
    TIER_LIMITS
} from './miningLimits.js';
import { TIERS, getTierInfo } from './tiers.js';
import browserPool from './browserPool.js';
import {
    getSavedSellers,
    saveSeller,
    updateSeller,
    deleteSeller,
    SELLER_ICONS
} from './savedSellers.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());

// Cache para avaliações de vendedor (evita reavaliar o mesmo vendedor)
const sellerCache = new Map();

// Cache para taxa de câmbio (atualiza a cada 1 hora)
let exchangeRateCache = {
    rate: null,
    lastUpdate: 0
};

/**
 * GET /api/exchange-rate
 * Retorna a taxa de câmbio CNY -> BRL
 * Usa cache de 1 hora para evitar muitas requisições
 */
app.get('/api/exchange-rate', async (req, res) => {
    try {
        const ONE_HOUR = 60 * 60 * 1000;
        const now = Date.now();

        // Retorna cache se ainda válido
        if (exchangeRateCache.rate && (now - exchangeRateCache.lastUpdate) < ONE_HOUR) {
            return res.json({
                rate: exchangeRateCache.rate,
                fromCache: true,
                lastUpdate: exchangeRateCache.lastUpdate
            });
        }

        console.log('[Server] Buscando taxa de câmbio CNY -> BRL...');

        // Usa API gratuita de câmbio
        const response = await fetch('https://api.exchangerate-api.com/v4/latest/CNY');

        if (!response.ok) {
            throw new Error('Falha ao buscar taxa de câmbio');
        }

        const data = await response.json();
        const brlRate = data.rates?.BRL;

        if (!brlRate) {
            throw new Error('Taxa BRL não encontrada');
        }

        // Atualiza cache
        exchangeRateCache = {
            rate: brlRate,
            lastUpdate: now
        };

        console.log(`[Server] Taxa de câmbio: 1 CNY = ${brlRate.toFixed(4)} BRL`);

        res.json({
            rate: brlRate,
            fromCache: false,
            lastUpdate: now
        });

    } catch (error) {
        console.error('[Server] Erro ao buscar taxa de câmbio:', error.message);

        // Fallback: taxa aproximada se a API falhar
        const fallbackRate = 0.80; // ~0.80 BRL por Yuan (valor aproximado)

        res.json({
            rate: exchangeRateCache.rate || fallbackRate,
            fromCache: true,
            error: 'Usando taxa em cache ou aproximada',
            lastUpdate: exchangeRateCache.lastUpdate || now
        });
    }
});

// ============================================
// AUTH ROUTES
// ============================================

/**
 * POST /api/auth/register
 * Register a new user
 */
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password, name } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                error: 'Email e senha são obrigatórios',
                code: 'MISSING_FIELDS'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                error: 'Senha deve ter pelo menos 6 caracteres',
                code: 'WEAK_PASSWORD'
            });
        }

        const result = await registerUser(email, password, name);

        if (result.error) {
            return res.status(400).json(result);
        }

        res.status(201).json(result);
    } catch (err) {
        console.error('[Server] Register error:', err);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

/**
 * POST /api/auth/login
 * Login user with email and password
 */
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                error: 'Email e senha são obrigatórios',
                code: 'MISSING_FIELDS'
            });
        }

        const result = await loginUser(email, password);

        if (result.error) {
            return res.status(401).json(result);
        }

        res.json(result);
    } catch (err) {
        console.error('[Server] Login error:', err);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
app.post('/api/auth/refresh', async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({
                error: 'Refresh token é obrigatório',
                code: 'MISSING_TOKEN'
            });
        }

        const result = await refreshAccessToken(refreshToken);

        if (result.error) {
            return res.status(401).json(result);
        }

        res.json(result);
    } catch (err) {
        console.error('[Server] Refresh error:', err);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

/**
 * POST /api/auth/logout
 * Logout user (invalidate refresh token)
 */
app.post('/api/auth/logout', async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (refreshToken) {
            await logoutUser(refreshToken);
        }

        res.json({ success: true, message: 'Logout realizado com sucesso' });
    } catch (err) {
        console.error('[Server] Logout error:', err);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

/**
 * GET /api/auth/me
 * Get current user info (requires auth)
 */
app.get('/api/auth/me', authMiddleware, (req, res) => {
    res.json({ user: req.user });
});

// ============================================
// END AUTH ROUTES
// ============================================

/**
 * POST /api/evaluate-seller
 * Avalia rapidamente o vendedor sem scraping de produtos
 * Retorna assim que o usuário cola o link
 */
app.post('/api/evaluate-seller', async (req, res) => {
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

        // Verifica cache de avaliação de vendedor
        if (sellerCache.has(userId)) {
            console.log(`[Server] Retornando avaliação do cache: ${userId}`);
            return res.json({ sellerInfo: sellerCache.get(userId), fromCache: true });
        }

        console.log(`[Server] Avaliando vendedor: ${userId}`);

        // Abre navegador apenas para avaliar o vendedor (rápido)
        const browser = await chromium.launch({ headless: true });
        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            viewport: { width: 1920, height: 1080 },
            locale: 'zh-CN'
        });
        const page = await context.newPage();

        await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
        await new Promise(resolve => setTimeout(resolve, 2000));

        const sellerInfo = await extractSellerInfo(page);
        const trustResult = calculateTrustScore(sellerInfo);
        const formattedSellerInfo = formatSellerData(sellerInfo, trustResult);

        await browser.close();

        // Armazena no cache
        sellerCache.set(userId, formattedSellerInfo);

        console.log(`[Server] Vendedor avaliado: ${sellerInfo.nickname || userId} - ${trustResult.score}pts (${trustResult.classification})`);

        res.json({ sellerInfo: formattedSellerInfo });

    } catch (error) {
        console.error('[Server] Erro ao avaliar vendedor:', error.message);
        res.status(500).json({ error: 'Erro ao avaliar vendedor', details: error.message });
    }
});

/**
 * GET /api/mine-stream
 * Server-Sent Events endpoint for real-time mining progress
 * REQUER autenticação - verifica limites no Supabase
 */
app.get('/api/mine-stream', authMiddleware, miningLimitMiddleware, async (req, res) => {
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

    // User ID from auth middleware (always present now)
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
        sendEvent('complete', { ...cachedData, fromCache: true });
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

    try {
        // Progress callback for scraper
        const onProgress = (stage, message, data = {}) => {
            sendEvent('progress', { stage, message, ...data });
        };

        sendEvent('progress', { stage: 'starting', message: 'Iniciando mineração...', miningInfo: req.miningInfo });

        // Scrape with progress updates, passing existing seller info
        const result = await scraper.scrapeSellerProducts(url, parseInt(limit), onProgress, existingSellerInfo);

        // Translate with progress
        sendEvent('progress', { stage: 'translating', message: 'Traduzindo produtos...', total: result.products.length });

        const translatedProducts = await translateProducts(result.products);
        result.products = translatedProducts;

        // Cache result
        cache.set(cacheKey, result);

        // Increment mining count in Supabase
        await incrementMiningCount(userId);

        sendEvent('progress', { stage: 'done', message: 'Mineração concluída!' });
        sendEvent('complete', { ...result, miningInfo: req.miningInfo });

        console.log(`[Server] Mineração SSE concluída: ${result.productCount} produtos`);

    } catch (error) {
        console.error('[Server] Erro na mineração SSE:', error.message);
        sendEvent('error', { message: error.message });
    } finally {
        // End mining session tracking
        endMiningSession(userId);
    }

    res.end();
});

/**
 * POST /api/mine
 * Inicia mineração de produtos de um vendedor
 */
app.post('/api/mine', async (req, res) => {
    try {
        const { url, limit = 50, useMock = false } = req.body;

        if (!url) {
            return res.status(400).json({ error: 'URL do vendedor é obrigatória' });
        }

        // Valida formato da URL
        if (!url.includes('goofish.com') && !url.includes('xianyu.com')) {
            return res.status(400).json({ error: 'URL deve ser do Goofish (goofish.com ou xianyu.com)' });
        }

        const userId = scraper.extractUserId(url);
        if (!userId) {
            return res.status(400).json({ error: 'userId não encontrado na URL' });
        }

        // Chave do cache inclui o limite para permitir diferentes quantidades
        const cacheKey = `${userId}_${limit}`;

        // Verifica cache (inclui limite na chave)
        if (cache.has(cacheKey)) {
            console.log(`[Server] Retornando dados do cache para vendedor: ${userId} (limite: ${limit})`);
            const cachedData = cache.get(cacheKey);
            return res.json({ ...cachedData, fromCache: true });
        }

        console.log(`[Server] Iniciando mineração para: ${url} (limite: ${limit})`);

        let result;

        // Usa mock data para desenvolvimento ou se scraping real falhar
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

        // Traduz os nomes dos produtos
        console.log('[Server] Traduzindo produtos...');
        const translatedProducts = await translateProducts(result.products);
        result.products = translatedProducts;

        // Armazena no cache com chave que inclui o limite
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
 * Retorna produtos cacheados com filtros
 */
app.get('/api/products/:sellerId', (req, res) => {
    try {
        const { sellerId } = req.params;
        const { keyword, minPrice, maxPrice, sort, limit, offset } = req.query;

        // Busca no cache
        const data = cache.get(sellerId);
        if (!data) {
            return res.status(404).json({ error: 'Vendedor não encontrado. Execute a mineração primeiro.' });
        }

        let products = [...data.products];

        // Filtro por palavra-chave (busca no nome original e traduzido)
        if (keyword) {
            const kw = keyword.toLowerCase();
            products = products.filter(p =>
                p.nameOriginal?.toLowerCase().includes(kw) ||
                p.nameTranslated?.toLowerCase().includes(kw) ||
                p.name?.toLowerCase().includes(kw)
            );
        }

        // Filtro por preço mínimo
        if (minPrice) {
            products = products.filter(p => p.price >= parseFloat(minPrice));
        }

        // Filtro por preço máximo
        if (maxPrice) {
            products = products.filter(p => p.price <= parseFloat(maxPrice));
        }

        // Ordenação
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

        // Paginação
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
 * Compares multiple products and returns scored analysis
 * Max 4 products at a time
 */
app.post('/api/compare', async (req, res) => {
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

        // Extract URLs from products
        const productUrls = products.map(p => p.url).filter(Boolean);

        if (productUrls.length < 2) {
            return res.status(400).json({
                error: 'Valid product URLs are required'
            });
        }

        console.log(`[Server] Comparing ${productUrls.length} products...`);

        // Scrape and compare products
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

/**
 * GET /api/health
 * Health check with system status
 */
app.get('/api/health', async (req, res) => {
    try {
        const browserStats = browserPool.getStats();

        res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            browserPool: browserStats,
            tiers: Object.values(TIERS).map(t => ({
                name: t.name,
                displayName: t.displayName,
                limit: t.miningLimit === Infinity ? 'unlimited' : t.miningLimit
            }))
        });
    } catch (err) {
        res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            error: err.message
        });
    }
});

/**
 * GET /api/tiers
 * Get available subscription tiers
 */
app.get('/api/tiers', (req, res) => {
    res.json({
        tiers: Object.values(TIERS).map(t => getTierInfo(t.name))
    });
});

/**
 * GET /api/user/mining-status
 * Get current user's mining usage based on tier
 */
app.get('/api/user/mining-status', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const data = await getUserMiningData(userId);
        const limit = TIER_LIMITS[data.tier] || TIER_LIMITS.guest;

        res.json({
            tier: getTierInfo(data.tier),
            used: data.miningCount,
            limit: limit === Infinity ? 'unlimited' : limit,
            remaining: limit === Infinity ? 'unlimited' : Math.max(0, limit - data.miningCount),
            canMine: limit === Infinity || data.miningCount < limit
        });
    } catch (error) {
        console.error('[Server] Error in mining-status:', error);
        res.status(500).json({ error: 'Erro ao buscar status de mineração' });
    }
});

// ============================================
// SAVED SELLERS ENDPOINTS
// ============================================

/**
 * GET /api/saved-sellers
 * List user's saved sellers
 */
app.get('/api/saved-sellers', authMiddleware, async (req, res) => {
    try {
        const sellers = await getSavedSellers(req.user.id);
        res.json({ sellers, icons: SELLER_ICONS });
    } catch (error) {
        console.error('[Server] Error getting saved sellers:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/saved-sellers
 * Save a new seller
 */
app.post('/api/saved-sellers', authMiddleware, async (req, res) => {
    try {
        const { nickname, sellerUrl, sellerId, sellerName, sellerAvatar, iconType, iconValue } = req.body;

        if (!nickname || !sellerUrl) {
            return res.status(400).json({ error: 'Apelido e URL são obrigatórios' });
        }

        const seller = await saveSeller(req.user.id, {
            nickname,
            sellerUrl,
            sellerId,
            sellerName,
            sellerAvatar,
            iconType,
            iconValue
        });

        res.status(201).json({ seller });
    } catch (error) {
        console.error('[Server] Error saving seller:', error);
        res.status(error.message.includes('apelido') ? 400 : 500).json({ error: error.message });
    }
});

/**
 * PUT /api/saved-sellers/:id
 * Update a saved seller
 */
app.put('/api/saved-sellers/:id', authMiddleware, async (req, res) => {
    try {
        const seller = await updateSeller(req.user.id, req.params.id, req.body);
        res.json({ seller });
    } catch (error) {
        console.error('[Server] Error updating seller:', error);
        res.status(error.message.includes('apelido') ? 400 : 500).json({ error: error.message });
    }
});

/**
 * DELETE /api/saved-sellers/:id
 * Delete a saved seller
 */
app.delete('/api/saved-sellers/:id', authMiddleware, async (req, res) => {
    try {
        await deleteSeller(req.user.id, req.params.id);
        res.json({ success: true });
    } catch (error) {
        console.error('[Server] Error deleting seller:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// SERVER STARTUP
// ============================================

const startServer = async () => {
    try {
        console.log('[Server] Initializing systems...');

        // Initialize browser pool
        try {
            await browserPool.init();
            console.log('[Server] ✓ Browser pool initialized (3 browsers)');
        } catch (err) {
            console.warn('[Server] ⚠ Browser pool unavailable:', err.message);
        }

        console.log('[Server] ✓ Mining limits system ready (Supabase)');

        // Start Express server
        const server = app.listen(PORT, () => {
            console.log(`
╔════════════════════════════════════════════════════════╗
║   Huofind Backend                                      ║
║   Server running on http://localhost:${PORT}              ║
║                                                        ║
║   Account Tiers:                                       ║
║   👤 Visitante: 10 minerações/IP                        ║
║   ⬡ Bronze: 50 minerações                              ║
║   ◆ Prata:  150 minerações                             ║
║   ★ Ouro:   Ilimitado                                  ║
║                                                        ║
║   Features:                                            ║
║   ✓ Tier-based mining with Supabase persistence        ║
║   ✓ Device fingerprinting & IP tracking                ║
║   ✓ Browser Pool: 3 reusable instances                 ║
╚════════════════════════════════════════════════════════╝
            `);
        });

        // Graceful shutdown
        const gracefulShutdown = async (signal) => {
            console.log(`\n[Server] ${signal} received. Shutting down gracefully...`);

            server.close(async () => {
                console.log('[Server] HTTP server closed');

                try {
                    await browserPool.shutdown();
                    console.log('[Server] All connections closed. Goodbye!');
                    process.exit(0);
                } catch (err) {
                    console.error('[Server] Error during shutdown:', err);
                    process.exit(1);
                }
            });

            // Force exit after 30 seconds
            setTimeout(() => {
                console.error('[Server] Forced shutdown after timeout');
                process.exit(1);
            }, 30000);
        };

        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    } catch (err) {
        console.error('[Server] Failed to start:', err);
        process.exit(1);
    }
};

// Start the server
startServer();

