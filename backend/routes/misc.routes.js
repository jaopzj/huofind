import { Router } from 'express';
import { authMiddleware } from '../authMiddleware.js';
import browserPool from '../browserPool.js';
import { TIERS, TIER_CREDITS, getTierInfo } from '../tiers.js';
import { getUserCreditsData, consumeCredits, TIER_MINING_MAX_PRODUCTS } from '../miningLimits.js';
import { notifyCreditSpent, notifyCreditsLow } from '../notificationService.js';
import { TIER_SAVE_LIMITS } from '../savedProducts.js';
import { TIER_SELLER_LIMITS } from '../savedSellers.js';
import { generateDeclaration } from '../declarationEngine.js';
import { getPurchaseHistory } from '../stripe.js';
import supabase from '../supabase.js';
import metrics from '../metrics.js';
import { getTranslationStats } from '../translator.js';

const router = Router();

// Cache for exchange rate (updates every 1 hour)
let exchangeRateCache = {
    rate: null,
    lastUpdate: 0
};

const CNY_BRL_MIN = 0.50;
const CNY_BRL_MAX = 1.50;
const CNY_BRL_FALLBACK = 0.80;

/**
 * GET /api/exchange-rate
 * Returns CNY -> BRL exchange rate with 1 hour cache
 */
router.get('/exchange-rate', async (req, res) => {
    try {
        const ONE_HOUR = 60 * 60 * 1000;
        const now = Date.now();

        // Return cache if still valid
        if (exchangeRateCache.rate && (now - exchangeRateCache.lastUpdate) < ONE_HOUR) {
            return res.json({
                rate: exchangeRateCache.rate,
                fromCache: true,
                lastUpdate: exchangeRateCache.lastUpdate
            });
        }

        console.log('[Server] Buscando taxa de câmbio CNY -> BRL...');

        let brlRate = null;

        // Source 1: fawazahmed0/currency-api
        try {
            const resp1 = await fetch(
                'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/cny.json',
                { signal: AbortSignal.timeout(5000) }
            );
            if (resp1.ok) {
                const data1 = await resp1.json();
                const rate1 = data1?.cny?.brl;
                if (rate1 && rate1 >= CNY_BRL_MIN && rate1 <= CNY_BRL_MAX) {
                    brlRate = rate1;
                    console.log(`[Server] Fonte 1 (fawazahmed0): 1 CNY = ${rate1.toFixed(4)} BRL`);
                } else {
                    console.warn(`[Server] Fonte 1 retornou valor fora da faixa de sanidade: ${rate1}`);
                }
            }
        } catch (e) {
            console.warn('[Server] Fonte 1 falhou:', e.message);
        }

        // Source 2 (fallback): exchangerate-api.com
        if (!brlRate) {
            try {
                const resp2 = await fetch(
                    'https://api.exchangerate-api.com/v4/latest/CNY',
                    { signal: AbortSignal.timeout(5000) }
                );
                if (resp2.ok) {
                    const data2 = await resp2.json();
                    const rate2 = data2.rates?.BRL;
                    if (rate2 && rate2 >= CNY_BRL_MIN && rate2 <= CNY_BRL_MAX) {
                        brlRate = rate2;
                        console.log(`[Server] Fonte 2 (exchangerate-api): 1 CNY = ${rate2.toFixed(4)} BRL`);
                    } else {
                        console.warn(`[Server] Fonte 2 retornou valor fora da faixa de sanidade: ${rate2}`);
                    }
                }
            } catch (e) {
                console.warn('[Server] Fonte 2 falhou:', e.message);
            }
        }

        // Fallback if no source returned valid value
        if (!brlRate) {
            console.warn(`[Server] Nenhuma fonte retornou taxa válida. Usando fallback: ${CNY_BRL_FALLBACK}`);
            brlRate = CNY_BRL_FALLBACK;
        }

        exchangeRateCache = {
            rate: brlRate,
            lastUpdate: now
        };

        console.log(`[Server] Taxa de câmbio final: 1 CNY = ${brlRate.toFixed(4)} BRL`);

        res.json({
            rate: brlRate,
            fromCache: false,
            lastUpdate: now
        });

    } catch (error) {
        console.error('[Server] Erro ao buscar taxa de câmbio:', error.message);

        res.json({
            rate: exchangeRateCache.rate || CNY_BRL_FALLBACK,
            fromCache: true,
            error: 'Usando taxa em cache ou aproximada',
            lastUpdate: exchangeRateCache.lastUpdate || Date.now()
        });
    }
});

/**
 * GET /api/health
 * Health check: DB, browser pool, memory, uptime
 */
router.get('/health', async (req, res) => {
    const checks = { db: 'unknown', browserPool: 'unknown' };

    // DB check
    try {
        const start = Date.now();
        const { error } = await supabase.from('users').select('id').limit(1);
        const dbLatency = Date.now() - start;
        checks.db = error ? 'degraded' : 'ok';
        checks.dbLatencyMs = dbLatency;
        if (error) checks.dbError = error.message;
    } catch (err) {
        checks.db = 'down';
        checks.dbError = err.message;
    }

    // Browser pool check
    try {
        const poolStats = browserPool.getStats();
        checks.browserPool = poolStats.initialized ? 'ok' : 'down';
        checks.browserPoolStats = poolStats;
    } catch (err) {
        checks.browserPool = 'down';
        checks.browserPoolError = err.message;
    }

    // Memory
    const mem = process.memoryUsage();
    const memory = {
        rssMB: Math.round(mem.rss / 1024 / 1024),
        heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
        heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
        heapPercent: parseFloat(((mem.heapUsed / mem.heapTotal) * 100).toFixed(1)),
    };

    const overallStatus = (checks.db === 'ok' && checks.browserPool === 'ok') ? 'ok'
        : (checks.db === 'down' || checks.browserPool === 'down') ? 'critical'
        : 'degraded';

    res.status(overallStatus === 'critical' ? 503 : 200).json({
        status: overallStatus,
        timestamp: new Date().toISOString(),
        uptime: Math.round(process.uptime()),
        checks,
        memory,
        tiers: Object.values(TIERS).map(t => ({
            name: t.name,
            displayName: t.displayName,
        }))
    });
});

/**
 * GET /api/metrics
 * Operational metrics: request stats, mining stats, errors, top endpoints
 */
router.get('/metrics', (req, res) => {
    res.json({
        ...metrics.getMetrics(),
        translation: getTranslationStats()
    });
});

/**
 * GET /api/config/limits
 * Returns all tier limits from the single backend source of truth.
 * Public endpoint (no auth) — limits are not sensitive data and the
 * frontend needs them before the user is fully loaded.
 */
router.get('/config/limits', (req, res) => {
    const tiers = {};
    for (const key of Object.keys(TIER_CREDITS)) {
        const tierInfo = getTierInfo(key);
        tiers[key] = {
            credits: TIER_CREDITS[key].credits,
            maxProducts: TIER_MINING_MAX_PRODUCTS[key] || TIER_MINING_MAX_PRODUCTS.guest,
            savedProducts: TIER_SAVE_LIMITS[key] || TIER_SAVE_LIMITS.guest,
            savedSellers: TIER_SELLER_LIMITS[key] || TIER_SELLER_LIMITS.guest,
            displayName: tierInfo.displayName,
            isRenewable: tierInfo.isRenewable,
        };
    }
    res.json({ tiers });
});

/**
 * GET /api/tiers
 * Get available subscription tiers
 */
router.get('/tiers', (req, res) => {
    res.json({
        tiers: Object.values(TIERS).map(t => getTierInfo(t.name))
    });
});

/**
 * POST /api/ai/declaration-assistant
 * Generates suggestions for customs declaration using a deterministic algorithm.
 * Each product consumes 1 credit.
 */
router.post('/ai/declaration-assistant', authMiddleware, async (req, res) => {
    try {
        const { description, items } = req.body;
        const userId = req.user.id;

        if (!description || !items || !Array.isArray(items)) {
            return res.status(400).json({
                error: 'Descrição e lista de itens são obrigatórios'
            });
        }

        const requiredCredits = items.length;

        // Check if user has enough credits
        const userCreditsData = await getUserCreditsData(userId);
        if (userCreditsData.credits < requiredCredits) {
            return res.status(402).json({
                error: 'Créditos insuficientes',
                required: requiredCredits,
                available: userCreditsData.credits
            });
        }

        console.log(`[Declaration] Processing request: ${description}`);

        // Generate declaration using deterministic engine
        const result = generateDeclaration(description, items);

        // Consume credits on success
        const newCredits = await consumeCredits(userId, requiredCredits);

        if (newCredits === null) {
            return res.status(500).json({ error: 'Erro ao processar créditos' });
        }

        console.log(`[Declaration] Success. Credits deducted: ${requiredCredits}. New balance: ${newCredits}`);

        // FEAT-01: Auto-notifications
        notifyCreditSpent(userId, requiredCredits, 'declaration', newCredits).catch(() => {});
        if (newCredits <= 3) {
            notifyCreditsLow(userId, newCredits).catch(() => {});
        }

        res.json({
            result,
            creditsSpent: requiredCredits,
            newCredits
        });
    } catch (error) {
        console.error('[Declaration] Error:', error);
        res.status(500).json({ error: 'Erro interno ao processar declaração' });
    }
});

/**
 * GET /api/purchase-history
 * Get user's purchase history
 */
router.get('/purchase-history', authMiddleware, async (req, res) => {
    try {
        const history = await getPurchaseHistory(req.user.id);
        res.json({ purchases: history });
    } catch (err) {
        console.error('[Stripe] History error:', err);
        res.status(500).json({ error: 'Erro ao buscar histórico' });
    }
});

export default router;
