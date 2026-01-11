import express from 'express';
import cors from 'cors';
import scraper from './scraper.js';
import { translateProducts } from './translator.js';
import cache from './cache.js';
import { extractSellerInfo, calculateTrustScore, formatSellerData } from './sellerAnalyzer.js';
import { chromium } from 'playwright';

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
 */
app.get('/api/mine-stream', async (req, res) => {
    const { url, limit = 50 } = req.query;

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
    const cacheKey = `${userId}_${limit}`;
    if (cache.has(cacheKey)) {
        console.log(`[Server] Retornando dados do cache: ${userId}`);
        sendEvent('progress', { stage: 'cache', message: 'Carregando do cache...' });
        const cachedData = cache.get(cacheKey);
        sendEvent('complete', { ...cachedData, fromCache: true });
        return res.end();
    }

    try {
        // Progress callback for scraper
        const onProgress = (stage, message, data = {}) => {
            sendEvent('progress', { stage, message, ...data });
        };

        sendEvent('progress', { stage: 'starting', message: 'Iniciando mineração...' });

        // Scrape with progress updates
        const result = await scraper.scrapeSellerProducts(url, parseInt(limit), onProgress);

        // Translate with progress
        sendEvent('progress', { stage: 'translating', message: 'Traduzindo produtos...', total: result.products.length });

        const translatedProducts = await translateProducts(result.products);
        result.products = translatedProducts;

        // Cache result
        cache.set(cacheKey, result);

        sendEvent('progress', { stage: 'done', message: 'Mineração concluída!' });
        sendEvent('complete', result);

        console.log(`[Server] Mineração SSE concluída: ${result.productCount} produtos`);

    } catch (error) {
        console.error('[Server] Erro na mineração SSE:', error.message);
        sendEvent('error', { message: error.message });
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
 * GET /api/health
 * Health check
 */
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Inicia servidor
app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════╗
║   Goofish Miner Backend                    ║
║   Server running on http://localhost:${PORT}  ║
╚════════════════════════════════════════════╝
  `);
});
