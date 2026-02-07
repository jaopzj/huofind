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
import { registerUser, loginUser, refreshAccessToken, logoutUser, checkEmailConfirmed, resendConfirmationEmail } from './auth.js';
import { authMiddleware, optionalAuthMiddleware } from './authMiddleware.js';

// Mining credits system (unified)
import {
    miningLimitMiddleware,
    consumeCredit,
    consumeCredits,
    startMiningSession,
    endMiningSession,
    getUserCreditsData,
    checkAndRenewCredits,
    getNextRenewalDate,
    TIER_CREDITS,
    TIER_MINING_MAX_PRODUCTS
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
import {
    getSavedProducts,
    saveProduct,
    deleteProduct as deleteProductById,
    deleteProductByUrl,
    getSaveCount,
    isProductSaved,
    TIER_SAVE_LIMITS
} from './savedProducts.js';
import {
    getCollections,
    createCollection,
    updateCollection,
    deleteCollection,
    moveProductToCollection,
    TIER_COLLECTION_LIMITS,
    COLLECTION_ICONS,
    COLLECTION_COLORS
} from './productCollections.js';
import supabase from './supabase.js';
import bcrypt from 'bcryptjs';
import multer from 'multer';

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
        const { email, password, name, refCode } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                error: 'Email e senha são obrigatórios',
                code: 'MISSING_FIELDS'
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                error: 'Senha deve ter pelo menos 8 caracteres',
                code: 'WEAK_PASSWORD'
            });
        }

        const result = await registerUser(email, password, name, refCode);

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

/**
 * POST /api/auth/check-email-confirmed
 * Check if user's email has been confirmed (for polling)
 */
app.post('/api/auth/check-email-confirmed', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email é obrigatório' });
        }

        const result = await checkEmailConfirmed(email);
        res.json(result);
    } catch (err) {
        console.error('[Server] Check email confirmed error:', err);
        res.status(500).json({ confirmed: false, error: 'Erro interno' });
    }
});

/**
 * POST /api/auth/resend-confirmation
 * Resend confirmation email
 */
app.post('/api/auth/resend-confirmation', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email é obrigatório' });
        }

        const result = await resendConfirmationEmail(email);

        if (result.error) {
            return res.status(400).json(result);
        }

        res.json(result);
    } catch (err) {
        console.error('[Server] Resend confirmation error:', err);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// ============================================
// USER PROFILE ENDPOINTS
// ============================================


/**
 * PUT /api/user/profile
 * Update user name
 */
app.put('/api/user/profile', authMiddleware, async (req, res) => {
    try {
        const { name } = req.body;
        const userId = req.user.id;

        if (!name || name.trim().length < 2) {
            return res.status(400).json({ error: 'Nome deve ter pelo menos 2 caracteres' });
        }

        const { data, error } = await supabase
            .from('users')
            .update({ name: name.trim() })
            .eq('id', userId)
            .select('id, name, email')
            .single();

        if (error) {
            console.error('[Profile] Error updating name:', error);
            return res.status(500).json({ error: 'Erro ao atualizar nome' });
        }

        console.log(`[Profile] Name updated for user ${userId}: ${name.trim()}`);
        res.json({ success: true, user: data });
    } catch (err) {
        console.error('[Profile] Error:', err);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

/**
 * PUT /api/user/email
 * Update user email (requires current password)
 */
app.put('/api/user/email', authMiddleware, async (req, res) => {
    try {
        const { newEmail, password } = req.body;
        const userId = req.user.id;

        if (!newEmail || !password) {
            return res.status(400).json({ error: 'Email e senha são obrigatórios' });
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
            return res.status(400).json({ error: 'Email inválido' });
        }

        // Get current user with password hash
        const { data: user, error: fetchError } = await supabase
            .from('users')
            .select('password_hash')
            .eq('id', userId)
            .single();

        if (fetchError || !user) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Senha incorreta' });
        }

        // Check if email already exists
        const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('email', newEmail.toLowerCase())
            .single();

        if (existingUser && existingUser.id !== userId) {
            return res.status(400).json({ error: 'Este email já está em uso' });
        }

        // Update email
        const { error: updateError } = await supabase
            .from('users')
            .update({ email: newEmail.toLowerCase() })
            .eq('id', userId);

        if (updateError) {
            console.error('[Profile] Error updating email:', updateError);
            return res.status(500).json({ error: 'Erro ao atualizar email' });
        }

        console.log(`[Profile] Email updated for user ${userId}: ${newEmail}`);
        res.json({ success: true });
    } catch (err) {
        console.error('[Profile] Error:', err);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

/**
 * PUT /api/user/password
 * Update user password
 */
app.put('/api/user/password', authMiddleware, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Senhas são obrigatórias' });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({ error: 'Nova senha deve ter pelo menos 8 caracteres' });
        }

        // Get current user with password hash
        const { data: user, error: fetchError } = await supabase
            .from('users')
            .select('password_hash')
            .eq('id', userId)
            .single();

        if (fetchError || !user) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        // Verify current password
        const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Senha atual incorreta' });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const newPasswordHash = await bcrypt.hash(newPassword, salt);

        // Update password
        const { error: updateError } = await supabase
            .from('users')
            .update({ password_hash: newPasswordHash })
            .eq('id', userId);

        if (updateError) {
            console.error('[Profile] Error updating password:', updateError);
            return res.status(500).json({ error: 'Erro ao atualizar senha' });
        }

        console.log(`[Profile] Password updated for user ${userId}`);
        res.json({ success: true });
    } catch (err) {
        console.error('[Profile] Error:', err);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

/**
 * POST /api/user/avatar
 * Upload user avatar - supports both file upload and URL
 */

// Configure multer for memory storage (we'll convert to base64)
const avatarUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 2 * 1024 * 1024, // 2MB max
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Apenas imagens são permitidas'), false);
        }
    }
}).single('avatar');

app.post('/api/user/avatar', authMiddleware, (req, res) => {
    avatarUpload(req, res, async (err) => {
        try {
            const userId = req.user.id;

            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({ error: 'Arquivo muito grande. Máximo 2MB.' });
                }
                return res.status(400).json({ error: 'Erro no upload: ' + err.message });
            } else if (err) {
                return res.status(400).json({ error: err.message });
            }

            let avatarUrl;

            // Check if file was uploaded
            if (req.file) {
                // Convert file buffer to base64 data URL
                const base64 = req.file.buffer.toString('base64');
                avatarUrl = `data:${req.file.mimetype};base64,${base64}`;
                console.log(`[Profile] Avatar file received: ${req.file.originalname} (${req.file.size} bytes)`);
            } else if (req.body && req.body.avatarUrl) {
                // Handle URL-based avatar update
                avatarUrl = req.body.avatarUrl;
            } else {
                return res.status(400).json({ error: 'Nenhum arquivo ou URL fornecido' });
            }

            // Update in database
            const { error: updateError } = await supabase
                .from('users')
                .update({ avatar_url: avatarUrl })
                .eq('id', userId);

            if (updateError) {
                console.error('[Profile] Error updating avatar:', updateError);
                return res.status(500).json({ error: 'Erro ao atualizar avatar' });
            }

            console.log(`[Profile] Avatar updated for user ${userId}`);
            res.json({ success: true, avatarUrl });
        } catch (error) {
            console.error('[Profile] Avatar error:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    });
});

/**
 * DELETE /api/user/account
 * Delete user account
 */
app.delete('/api/user/account', authMiddleware, async (req, res) => {
    try {
        const { password } = req.body;
        const userId = req.user.id;

        if (!password) {
            return res.status(400).json({ error: 'Senha é obrigatória' });
        }

        // Get current user with password hash
        const { data: user, error: fetchError } = await supabase
            .from('users')
            .select('password_hash, email')
            .eq('id', userId)
            .single();

        if (fetchError || !user) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Senha incorreta' });
        }

        // Delete user's data in order (foreign key constraints)
        // 1. Delete sessions
        await supabase.from('sessions').delete().eq('user_id', userId);

        // 2. Delete saved products
        await supabase.from('saved_products').delete().eq('user_id', userId);

        // 3. Delete saved sellers
        await supabase.from('saved_sellers').delete().eq('user_id', userId);

        // 4. Delete collections
        await supabase.from('collections').delete().eq('user_id', userId);

        // 5. Delete user settings
        await supabase.from('user_settings').delete().eq('user_id', userId);

        // 6. Finally delete the user
        const { error: deleteError } = await supabase
            .from('users')
            .delete()
            .eq('id', userId);

        if (deleteError) {
            console.error('[Profile] Error deleting user:', deleteError);
            return res.status(500).json({ error: 'Erro ao deletar conta' });
        }

        console.log(`[Profile] Account deleted for user ${user.email}`);
        res.json({ success: true, message: 'Conta deletada com sucesso' });
    } catch (err) {
        console.error('[Profile] Error:', err);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

/**
 * GET /api/user/stats
 * Get user statistics
 */
app.get('/api/user/stats', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;

        // Get counts in parallel
        const [productsResult, sellersResult, collectionsResult] = await Promise.all([
            supabase.from('saved_products').select('id', { count: 'exact', head: true }).eq('user_id', userId),
            supabase.from('saved_sellers').select('id', { count: 'exact', head: true }).eq('user_id', userId),
            supabase.from('collections').select('id', { count: 'exact', head: true }).eq('user_id', userId)
        ]);

        res.json({
            savedProducts: productsResult.count || 0,
            savedSellers: sellersResult.count || 0,
            collections: collectionsResult.count || 0
        });
    } catch (err) {
        console.error('[Profile] Error getting stats:', err);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// ============================================
// END USER PROFILE ENDPOINTS
// ============================================

// ============================================
// REFERRAL ROUTES
// ============================================
import {
    validateRefCode,
    getUserRefCode,
    getUserStoredRefCode,
    storeRefCodeForUser,
    getReferralStats,
    REFERRAL_DISCOUNT_PERCENT
} from './referrals.js';

/**
 * GET /api/referral/my-code
 * Get current user's referral code
 */
app.get('/api/referral/my-code', authMiddleware, async (req, res) => {
    try {
        const refCode = await getUserRefCode(req.user.id);
        res.json({ refCode });
    } catch (err) {
        console.error('[Referral] Error getting ref code:', err);
        res.status(500).json({ error: 'Erro interno' });
    }
});

/**
 * GET /api/referral/stored-code
 * Get user's stored referral code (if any)
 */
app.get('/api/referral/stored-code', authMiddleware, async (req, res) => {
    try {
        const data = await getUserStoredRefCode(req.user.id);
        res.json(data || { code: null, used: false });
    } catch (err) {
        console.error('[Referral] Error getting stored code:', err);
        res.status(500).json({ error: 'Erro interno' });
    }
});

/**
 * POST /api/referral/validate
 * Validate a referral code
 */
app.post('/api/referral/validate', authMiddleware, async (req, res) => {
    try {
        const { code } = req.body;
        const result = await validateRefCode(code, req.user.id);

        if (!result.valid) {
            return res.status(400).json({ valid: false, error: result.error });
        }

        res.json({
            valid: true,
            referrerName: result.referrer.name || 'Usuário',
            discountPercent: REFERRAL_DISCOUNT_PERCENT
        });
    } catch (err) {
        console.error('[Referral] Error validating code:', err);
        res.status(500).json({ error: 'Erro interno' });
    }
});

/**
 * POST /api/referral/store
 * Store a referral code for future use (during checkout on store page)
 */
app.post('/api/referral/store', authMiddleware, async (req, res) => {
    try {
        const { code } = req.body;

        // Check if user already has a stored code
        const existing = await getUserStoredRefCode(req.user.id);
        if (existing?.code) {
            return res.status(400).json({
                error: 'Você já possui um código de referência',
                locked: true
            });
        }

        const result = await storeRefCodeForUser(req.user.id, code);

        if (!result.success) {
            return res.status(400).json({ error: result.error });
        }

        res.json({ success: true, referrerName: result.referrerName });
    } catch (err) {
        console.error('[Referral] Error storing code:', err);
        res.status(500).json({ error: 'Erro interno' });
    }
});

/**
 * GET /api/referral/stats
 * Get referral statistics for current user
 */
app.get('/api/referral/stats', authMiddleware, async (req, res) => {
    try {
        const stats = await getReferralStats(req.user.id);
        res.json(stats);
    } catch (err) {
        console.error('[Referral] Error getting stats:', err);
        res.status(500).json({ error: 'Erro interno' });
    }
});

// ============================================
// END REFERRAL ROUTES
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

    // Validar limite de produtos do tier
    const userTier = req.user.tier || 'guest';
    const tierMaxProducts = TIER_MINING_MAX_PRODUCTS[userTier] || 30;
    const requestedLimit = parseInt(limit);

    if (requestedLimit > tierMaxProducts) {
        console.log(`[Server] 🚫 Limite de produtos excedido para tier ${userTier}: ${requestedLimit}/${tierMaxProducts}`);
        return res.status(403).json({
            error: 'Limite de produtos excedido',
            message: `Seu plano (${userTier}) permite minerar até ${tierMaxProducts} produtos por vez.`,
            code: 'TIER_PRODUCT_LIMIT_EXCEEDED',
            limit: tierMaxProducts,
            requested: requestedLimit
        });
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

        // Determine best sellerInfo: cached data > sellerCache > minimal object
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

        // Consume credit in Supabase
        await consumeCredit(userId);

        sendEvent('progress', { stage: 'done', message: 'Mineração concluída!' });

        // Determine the best sellerInfo to use:
        // 1. Prefer result.sellerInfo from fresh scraping
        // 2. Fall back to existingSellerInfo from cache
        // 3. Last resort: create minimal object with just sellerId for comparison
        let finalSellerInfo;

        if (result.sellerInfo) {
            // Fresh data from scraper - cache it and use it
            finalSellerInfo = { ...result.sellerInfo, sellerId: sellerId };
            sellerCache.set(sellerId, result.sellerInfo);
            console.log(`[Server] Using fresh sellerInfo from scraper, cached for future use`);
        } else if (existingSellerInfo) {
            // Use cached seller info
            finalSellerInfo = { ...existingSellerInfo, sellerId: sellerId };
            console.log(`[Server] Using existingSellerInfo from cache`);
        } else {
            // Last resort: minimal object for "Já salvo" check only
            finalSellerInfo = { sellerId: sellerId };
            console.log(`[Server] No sellerInfo available, using minimal object`);
        }

        console.log(`[Server] DEBUG: finalSellerInfo.sellerId = ${finalSellerInfo?.sellerId}, has nickname = ${!!finalSellerInfo?.nickname}`);

        sendEvent('complete', {
            ...result,
            sellerInfo: finalSellerInfo,
            miningInfo: req.miningInfo
        });

        console.log(`[Server] Mineração SSE concluída: ${result.productCount} produtos | sellerId: ${sellerId}`);

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
 * Get current user's credits and mining status
 */
app.get('/api/user/mining-status', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;

        // Check and renew credits if needed
        await checkAndRenewCredits(userId);

        // Get updated credits data
        const data = await getUserCreditsData(userId);

        // IMPORTANT: Normalize tier name using getTierByName to handle
        // Portuguese names (ouro, prata) and English names (gold, silver)
        const tierInfo = getTierInfo(data.tier);
        const normalizedTierName = tierInfo.name; // Get the canonical tier name

        // Use the tier's credits from the TIERS config, not TIER_CREDITS lookup
        const maxCredits = tierInfo.credits;
        const maxProducts = TIER_MINING_MAX_PRODUCTS[normalizedTierName] || TIER_MINING_MAX_PRODUCTS.guest;

        // Calculate next renewal date
        const nextRenewal = tierInfo.isRenewable ? getNextRenewalDate(data.creditsLastReset) : null;

        console.log(`[Server] mining-status: tier=${data.tier} -> normalized=${normalizedTierName}, credits=${data.credits}/${maxCredits}`);

        res.json({
            tier: tierInfo,
            credits: data.credits,
            maxCredits,
            maxProducts,
            nextRenewal: nextRenewal ? nextRenewal.toISOString() : null,
            canMine: data.credits > 0
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
        const { nickname, sellerUrl, sellerId: frontendSellerId, sellerName, sellerAvatar, iconType, iconValue } = req.body;

        if (!nickname || !sellerUrl) {
            return res.status(400).json({ error: 'Apelido e URL são obrigatórios' });
        }

        // Extract sellerId from URL if frontend didn't send it (or sent undefined/null)
        const extractedSellerId = scraper.extractUserId(sellerUrl);
        const finalSellerId = frontendSellerId || extractedSellerId;

        console.log(`[Server] Saving seller: nickname=${nickname}, frontendSellerId=${frontendSellerId}, extractedSellerId=${extractedSellerId}, finalSellerId=${finalSellerId}`);

        const seller = await saveSeller(req.user.id, req.user.tier, {
            nickname,
            sellerUrl,
            sellerId: finalSellerId,
            sellerName,
            sellerAvatar,
            iconType,
            iconValue
        });

        res.status(201).json({ seller });
    } catch (error) {
        console.error('[Server] Error saving seller:', error);

        if (error.message.startsWith('LIMIT_REACHED')) {
            const [, used, limit] = error.message.split(':');
            return res.status(403).json({
                error: 'Limite de vendedores atingido',
                code: 'LIMIT_REACHED',
                used: parseInt(used),
                limit: parseInt(limit)
            });
        }

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

/**
 * POST /api/saved-sellers/migrate-ids
 * Migration endpoint to fix NULL seller_ids by extracting from seller_url
 */
app.post('/api/saved-sellers/migrate-ids', authMiddleware, async (req, res) => {
    try {
        console.log('[Server] Running seller_id migration for user:', req.user.id);

        // Get all saved sellers for user
        const sellers = await getSavedSellers(req.user.id);
        let updated = 0;

        for (const seller of sellers) {
            // Skip if already has seller_id
            if (seller.seller_id) continue;

            // Extract seller_id from seller_url
            const extractedId = scraper.extractUserId(seller.seller_url);
            if (!extractedId) continue;

            // Update in database
            const { error } = await supabase
                .from('saved_sellers')
                .update({ seller_id: extractedId })
                .eq('id', seller.id);

            if (!error) {
                updated++;
                console.log(`[Server] Updated seller_id for ${seller.nickname}: ${extractedId}`);
            }
        }

        console.log(`[Server] Migration complete: ${updated} sellers updated`);
        res.json({ success: true, updated, total: sellers.length });
    } catch (error) {
        console.error('[Server] Migration error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// SAVED PRODUCTS API
// ============================================

/**
 * GET /api/saved-products
 * Get all saved products for user with count and limit info
 */
app.get('/api/saved-products', authMiddleware, async (req, res) => {
    try {
        const products = await getSavedProducts(req.user.id);
        const count = products.length;
        const tier = req.user.tier || 'guest';
        const limit = TIER_SAVE_LIMITS[tier] || TIER_SAVE_LIMITS.guest;

        res.json({
            products,
            count,
            limit,
            tier
        });
    } catch (error) {
        console.error('[Server] Error getting saved products:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/saved-products
 * Save a new product
 */
app.post('/api/saved-products', authMiddleware, async (req, res) => {
    try {
        const { productUrl, productTitle, productPrice, productImage, productCurrency, sellerName } = req.body;

        if (!productUrl) {
            return res.status(400).json({ error: 'URL do produto é obrigatória' });
        }

        const tier = req.user.tier || 'guest';
        const product = await saveProduct(req.user.id, tier, {
            productUrl,
            productTitle,
            productPrice,
            productImage,
            productCurrency,
            sellerName
        });

        const count = await getSaveCount(req.user.id);
        const limit = TIER_SAVE_LIMITS[tier] || TIER_SAVE_LIMITS.guest;

        res.status(201).json({
            product,
            count,
            limit
        });
    } catch (error) {
        console.error('[Server] Error saving product:', error);

        if (error.message.startsWith('LIMIT_REACHED')) {
            const [, used, limit] = error.message.split(':');
            return res.status(403).json({
                error: 'Limite de produtos salvos atingido',
                code: 'LIMIT_REACHED',
                used: parseInt(used),
                limit: parseInt(limit)
            });
        }

        if (error.message.includes('já está salvo')) {
            return res.status(409).json({ error: 'Produto já está salvo' });
        }

        res.status(500).json({ error: error.message });
    }
});

/**
 * DELETE /api/saved-products/:id
 * Remove a saved product by ID
 */
app.delete('/api/saved-products/:id', authMiddleware, async (req, res) => {
    try {
        await deleteProductById(req.user.id, req.params.id);

        const count = await getSaveCount(req.user.id);
        const tier = req.user.tier || 'guest';
        const limit = TIER_SAVE_LIMITS[tier] || TIER_SAVE_LIMITS.guest;

        res.json({ success: true, count, limit });
    } catch (error) {
        console.error('[Server] Error deleting product:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/saved-products/toggle
 * Toggle save status (save or unsave based on current state)
 */
app.post('/api/saved-products/toggle', authMiddleware, async (req, res) => {
    try {
        const { productUrl, productTitle, productPrice, productImage, productCurrency, sellerName } = req.body;

        if (!productUrl) {
            return res.status(400).json({ error: 'URL do produto é obrigatória' });
        }

        const isSaved = await isProductSaved(req.user.id, productUrl);
        const tier = req.user.tier || 'guest';
        const limit = TIER_SAVE_LIMITS[tier] || TIER_SAVE_LIMITS.guest;

        if (isSaved) {
            // Unsave
            await deleteProductByUrl(req.user.id, productUrl);
            const count = await getSaveCount(req.user.id);
            return res.json({ saved: false, count, limit });
        } else {
            // Save
            const product = await saveProduct(req.user.id, tier, {
                productUrl,
                productTitle,
                productPrice,
                productImage,
                productCurrency,
                sellerName
            });
            const count = await getSaveCount(req.user.id);
            return res.json({ saved: true, product, count, limit });
        }
    } catch (error) {
        console.error('[Server] Error toggling product save:', error);

        if (error.message.startsWith('LIMIT_REACHED')) {
            const [, used, limit] = error.message.split(':');
            return res.status(403).json({
                error: 'Limite de produtos salvos atingido',
                code: 'LIMIT_REACHED',
                used: parseInt(used),
                limit: parseInt(limit)
            });
        }

        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/saved-products/check
 * Check if a product is saved (by URL)
 */
app.get('/api/saved-products/check', authMiddleware, async (req, res) => {
    try {
        const { url } = req.query;
        if (!url) {
            return res.status(400).json({ error: 'URL é obrigatória' });
        }

        const saved = await isProductSaved(req.user.id, url);
        res.json({ saved });
    } catch (error) {
        console.error('[Server] Error checking product:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// PRODUCT COLLECTIONS API
// ============================================

/**
 * GET /api/collections
 * List all collections for user with product counts
 */
app.get('/api/collections', authMiddleware, async (req, res) => {
    try {
        const collections = await getCollections(req.user.id);
        const tier = req.user.tier || 'guest';
        const limit = TIER_COLLECTION_LIMITS[tier] || TIER_COLLECTION_LIMITS.guest;

        res.json({
            collections,
            count: collections.length,
            limit: limit === Infinity ? 'unlimited' : limit,
            icons: COLLECTION_ICONS,
            colors: COLLECTION_COLORS
        });
    } catch (error) {
        console.error('[Server] Error getting collections:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/collections
 * Create a new collection
 */
app.post('/api/collections', authMiddleware, async (req, res) => {
    try {
        const { name, icon, color } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Nome da coleção é obrigatório' });
        }

        const tier = req.user.tier || 'guest';
        const collection = await createCollection(req.user.id, tier, { name, icon, color });

        res.status(201).json({ collection });
    } catch (error) {
        console.error('[Server] Error creating collection:', error);

        if (error.message.startsWith('LIMIT_REACHED')) {
            const [, used, limit] = error.message.split(':');
            return res.status(403).json({
                error: 'Limite de coleções atingido',
                code: 'LIMIT_REACHED',
                used: parseInt(used),
                limit: parseInt(limit)
            });
        }

        res.status(error.message.includes('obrigatório') || error.message.includes('máximo') ? 400 : 500)
            .json({ error: error.message });
    }
});

/**
 * PUT /api/collections/:id
 * Update a collection
 */
app.put('/api/collections/:id', authMiddleware, async (req, res) => {
    try {
        const collection = await updateCollection(req.user.id, req.params.id, req.body);
        res.json({ collection });
    } catch (error) {
        console.error('[Server] Error updating collection:', error);
        res.status(error.message.includes('obrigatório') || error.message.includes('máximo') ? 400 : 500)
            .json({ error: error.message });
    }
});

/**
 * DELETE /api/collections/:id
 * Delete a collection (products are unlinked, not deleted)
 */
app.delete('/api/collections/:id', authMiddleware, async (req, res) => {
    try {
        await deleteCollection(req.user.id, req.params.id);
        res.json({ success: true });
    } catch (error) {
        console.error('[Server] Error deleting collection:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * PUT /api/saved-products/:id/collection
 * Move a product to a collection (or remove from collection if collectionId is null)
 */
app.put('/api/saved-products/:id/collection', authMiddleware, async (req, res) => {
    try {
        const { collectionId } = req.body;
        const product = await moveProductToCollection(req.user.id, req.params.id, collectionId);
        res.json({ product });
    } catch (error) {
        console.error('[Server] Error moving product to collection:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// AI DECLARATION ASSISTANT (GEMINI)
// ============================================

/**
 * POST /api/ai/declaration-assistant
 * Generates AI suggestions for customs declaration
 * Each product consumes 1 credit
 */
app.post('/api/ai/declaration-assistant', authMiddleware, async (req, res) => {
    try {
        const { description, items } = req.body;
        const userId = req.user.id;

        if (!description || !items || !Array.isArray(items)) {
            return res.status(400).json({
                error: 'Descrição e lista de itens são obrigatórios'
            });
        }

        const requiredCredits = items.length;

        // 1. Check if user has enough credits
        const userCreditsData = await getUserCreditsData(userId);
        if (userCreditsData.credits < requiredCredits) {
            return res.status(402).json({
                error: 'Créditos insuficientes',
                required: requiredCredits,
                available: userCreditsData.credits
            });
        }

        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
        if (!GEMINI_API_KEY) {
            console.error('[AI] Gemini API key not configured');
            return res.status(500).json({ error: 'Serviço de IA não configurado' });
        }

        console.log(`[AI] Processing declaration request: ${description}`);

        // Optimized prompt for declaration assistance
        const prompt = `Você é um assistente especializado em ajudar pessoas a declarar produtos importados de forma otimizada para reduzir taxas alfandegárias.

REGRAS IMPORTANTES:
1. SEMPRE sugira descrições GENÉRICAS em inglês (nunca mencione marcas)
2. SEMPRE sugira valores EXTREMAMENTE BAIXOS em dólares (entre $3 e $10 por item)

2.1a [IMPORTANTE!!!] Utilize um limite de valor total sugerido de no máximo 15 dólares, apenas mude esse limite para 28 dolares caso seja mais de 10itens totais e a compra seja de muito de valor mesmo

2.1b Declare com base no contexto. Ex: uma MEMÓRIA RAM é mais barata que uma Placa de Vídeo
2.2 Coisas mais básicas você declarar valores baixos. Se for apenas um tênis (de 5 a 8 dolares), quanto mais itens, tente declarar mais baixo cada item. Se for apenas uma ou duas camisas (de 3 a 5 dolares), etc.
3 Caso a quantidade do item seja maior que 1, divida o valor sugerido pela quantidade de itens
4. Transforme produtos de marca em descrições genéricas. Exemplos:
   - iPhone 15 Pro → "LCD Screen 6.1 inch replacement part" ($9.15)
   - Nike Air Jordan → "Sports shoes rubber sole" ($8)
   - Camiseta Gucci → "Cotton t-shirt plain" ($4.50)
   - MacBook → "Laptop keyboard replacement" ($14.67)
   - PlayStation 5 → "Electronic circuit board parts" ($9)
   - Relógio Rolex → "Wrist watch quartz movement" ($6)
   - Bolsa Louis Vuitton → "Fabric handbag casual" ($5)
   [SÃO APENAS EXEMPLOS, seja criativo!]
5. Se houver múltiplos itens, separe cada um na tabela
6. Distribua os valores para que o total fique abaixo de $24

O usuário quer declarar os seguintes itens:
"${description}"

Responda APENAS no formato JSON abaixo, sem markdown:
{
  "items": [
    {
      "original": "descrição original do item",
      "suggested": "descrição sugerida em inglês",
      "suggestedValueUSD": 9,
      "category": "categoria genérica"
    }
  ],
  "tips": [
    "dica 1 em português",
    "dica 2 em português",
    "dica 3 em português"
  ],
  "totalSuggestedUSD": 9,
  "disclaimer": "Os valores e descrições são sugestões. O usuário é responsável pela declaração final."
}`;

        // Call Gemini API
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 4096
                    }
                })
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            console.error('[AI] Gemini API error:', errorData);
            return res.status(500).json({ error: 'Erro ao processar com IA' });
        }

        const data = await response.json();
        const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!textResponse) {
            console.error('[AI] Empty response from Gemini');
            return res.status(500).json({ error: 'Resposta vazia da IA' });
        }

        // Parse JSON from response (remove possible markdown formatting)
        let parsedResponse;
        try {
            let cleanJson = textResponse.replace(/```json\n?|\n?```/g, '').trim();

            // Try to fix truncated JSON by adding missing closing brackets
            try {
                parsedResponse = JSON.parse(cleanJson);
            } catch (firstError) {
                console.warn('[AI] Response truncated, attempting repair...');

                // Add missing closing characters
                let fixed = cleanJson;

                // Remove trailing incomplete parts iteratively
                // 1. Remove trailing comma or semicolon
                fixed = fixed.replace(/[,;]\s*$/, '');

                // 2. Handle trailing incomplete strings/keys
                // e.g. "key": "val
                if (fixed.match(/:\s*"[^"]*$/)) {
                    fixed = fixed.replace(/:\s*"[^"]*$/, ': ""');
                }
                // e.g. "key": 
                else if (fixed.match(/:\s*$/)) {
                    fixed = fixed.replace(/:\s*$/, ': null');
                }
                // e.g. "key
                else if (fixed.match(/"[^"]*$/)) {
                    fixed = fixed.replace(/"[^"]*$/, '": null');
                }

                // 3. Remove trailing incomplete object/array items
                // e.g. { "original": "...", 
                fixed = fixed.replace(/,\s*$/, '');

                // Count opening and closing braces/brackets to close the structure
                const openBracing = (fixed.match(/{/g) || []).length;
                const closeBracing = (fixed.match(/}/g) || []).length;
                const openBracketed = (fixed.match(/\[/g) || []).length;
                const closeBracketed = (fixed.match(/]/g) || []).length;

                for (let i = 0; i < openBracing - closeBracing; i++) {
                    fixed += '}';
                }
                for (let i = 0; i < openBracketed - closeBracketed; i++) {
                    fixed += ']';
                }

                try {
                    parsedResponse = JSON.parse(fixed);
                    console.log('[AI] Fixed truncated JSON response successfully');
                } catch (secondError) {
                    console.error('[AI] Repair failed:', secondError.message);
                    console.error('[AI] Broken JSON:', fixed);
                    throw secondError;
                }
            }

            // Ensure required fields exist
            if (!parsedResponse.disclaimer) {
                parsedResponse.disclaimer = 'Os valores e descrições são sugestões. O usuário é responsável pela declaração final.';
            }
            if (!parsedResponse.tips) {
                parsedResponse.tips = [];
            }
            if (!parsedResponse.totalSuggestedUSD && parsedResponse.items) {
                parsedResponse.totalSuggestedUSD = parsedResponse.items.reduce((sum, item) => sum + (item.suggestedValueUSD || 0), 0);
            }
            // 1.5. Check if fields exist and match expected types
            if (!parsedResponse.items || !Array.isArray(parsedResponse.items)) {
                throw new Error('Formato de resposta da IA inválido');
            }

            // 2. Consume credits ONLY on success
            const newCredits = await consumeCredits(userId, requiredCredits);

            if (newCredits === null) {
                // If consumption fails for some reason (rare as we checked before, but for safety)
                return res.status(500).json({ error: 'Erro ao processar créditos' });
            }

            console.log(`[AI] Declaration logic successful. Credits deducted: ${requiredCredits}. New balance: ${newCredits}`);

            res.json({
                result: parsedResponse,
                creditsSpent: requiredCredits,
                newCredits: newCredits
            });

        } catch (parseError) {
            console.error('[AI] Failed to parse Gemini response:', textResponse);
            return res.status(500).json({
                error: 'Erro ao processar resposta da IA',
                rawResponse: textResponse
            });
        }
    } catch (error) {
        console.error('[AI] Declaration assistant error:', error);
        res.status(500).json({ error: 'Erro interno ao processar declaração' });
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

