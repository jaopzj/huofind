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
import rateLimit from 'express-rate-limit';
import { searchByImage } from './imageSearch.js';
import { generateDeclaration } from './declarationEngine.js';
import {
    syncStripeProducts,
    createCreditCheckoutSession,
    createSubscriptionCheckoutSession,
    createPortalSession,
    constructWebhookEvent,
    handleWebhookEvent,
    getPurchaseHistory,
    getSubscriptionStatus,
    fulfillCheckoutSession,
    checkSubscriptionExpiry,
} from './stripe.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
// SECURITY (M2): Restrict CORS to frontend origin only
const allowedOrigins = [process.env.CLIENT_URL || 'http://localhost:5173'];
app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (e.g., server-to-server, Stripe webhooks)
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

// SECURITY (M1): Rate limiter for payment endpoints
const paymentRateLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // max 10 requests per minute per IP
    message: { error: 'Muitas tentativas. Aguarde um momento.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limiter for auth endpoints (prevent brute force)
const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // max 20 attempts per 15 min
    message: { error: 'Muitas tentativas de login. Tente novamente em 15 minutos.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// IMPORTANT: Stripe webhook needs raw body for signature verification.
// This MUST come BEFORE express.json().
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    try {
        const signature = req.headers['stripe-signature'];
        const event = constructWebhookEvent(req.body, signature);

        console.log(`[Stripe] Webhook received: ${event.type}`);
        await handleWebhookEvent(event);

        res.json({ received: true });
    } catch (err) {
        console.error('[Stripe] Webhook error:', err.message);
        res.status(400).json({ error: `Webhook Error: ${err.message}` });
    }
});

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
app.post('/api/auth/register', authRateLimiter, async (req, res) => {
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
app.post('/api/auth/login', authRateLimiter, async (req, res) => {
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

        // Check subscription expiry (safety net — downgrades if Stripe sub is no longer active)
        const expiryCheck = await checkSubscriptionExpiry(userId);

        // If expired, the user was just downgraded — re-fetch fresh data
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
        const nextRenewal = tierInfo.isRenewable ? getNextRenewalDate(data.lastReset) : null;

        console.log(`[Server] mining-status: tier=${data.tier} -> normalized=${normalizedTierName}, credits=${data.credits}/${maxCredits}`);

        res.json({
            tier: tierInfo,
            credits: data.credits,
            maxCredits,
            maxProducts,
            nextRenewal: nextRenewal || null,
            canMine: data.credits > 0,
            subscriptionEnd: expiryCheck.currentPeriodEnd || null,
            subscriptionExpired: expiryCheck.expired || false,
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
// DECLARATION ASSISTANT (Deterministic Engine)
// ============================================

/**
 * POST /api/ai/declaration-assistant
 * Generates suggestions for customs declaration using a deterministic algorithm.
 * Each product consumes 1 credit.
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

        console.log(`[Declaration] Processing request: ${description}`);

        // 2. Generate declaration using deterministic engine
        const result = generateDeclaration(description, items);

        // 3. Consume credits on success
        const newCredits = await consumeCredits(userId, requiredCredits);

        if (newCredits === null) {
            return res.status(500).json({ error: 'Erro ao processar créditos' });
        }

        console.log(`[Declaration] Success. Credits deducted: ${requiredCredits}. New balance: ${newCredits}`);

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

// ============================================
// STRIPE PAYMENT ROUTES
// ============================================

/**
 * POST /api/stripe/checkout
 * Create a Checkout Session for one-time credit purchase
 */
app.post('/api/stripe/checkout', authMiddleware, paymentRateLimiter, async (req, res) => {
    try {
        const { packageId, useReferral } = req.body;

        if (!packageId) {
            return res.status(400).json({ error: 'packageId é obrigatório' });
        }

        const session = await createCreditCheckoutSession(
            req.user.id,
            req.user.email,
            req.user.name,
            packageId,
            !!useReferral
        );

        res.json({ url: session.url });
    } catch (err) {
        console.error('[Stripe] Checkout error:', err);
        // SECURITY (M3): Don't expose internal error details
        res.status(500).json({ error: 'Erro ao iniciar pagamento' });
    }
});

/**
 * POST /api/stripe/subscribe
 * Create a Checkout Session for a subscription
 */
app.post('/api/stripe/subscribe', authMiddleware, paymentRateLimiter, async (req, res) => {
    try {
        const { planId, useReferral } = req.body;

        if (!planId) {
            return res.status(400).json({ error: 'planId é obrigatório' });
        }

        const session = await createSubscriptionCheckoutSession(
            req.user.id,
            req.user.email,
            req.user.name,
            planId,
            !!useReferral
        );

        res.json({ url: session.url });
    } catch (err) {
        console.error('[Stripe] Subscribe error:', err);

        if (err.message === 'ALREADY_SUBSCRIBED') {
            return res.status(409).json({ error: 'Você já possui uma assinatura ativa. Gerencie pelo portal.' });
        }

        // SECURITY (M3): Don't expose internal error details
        res.status(500).json({ error: 'Erro ao iniciar assinatura' });
    }
});

/**
 * POST /api/stripe/portal
 * Create a Stripe Customer Portal session
 */
app.post('/api/stripe/portal', authMiddleware, paymentRateLimiter, async (req, res) => {
    try {
        const session = await createPortalSession(req.user.id);
        res.json({ url: session.url });
    } catch (err) {
        console.error('[Stripe] Portal error:', err);
        res.status(500).json({ error: 'Erro ao abrir portal de assinatura' });
    }
});

/**
 * GET /api/stripe/status
 * Get user's current subscription status
 */
app.get('/api/stripe/status', authMiddleware, async (req, res) => {
    try {
        const status = await getSubscriptionStatus(req.user.id);
        res.json(status || { tier: 'guest', status: null });
    } catch (err) {
        console.error('[Stripe] Status error:', err);
        res.status(500).json({ error: 'Erro ao buscar status da assinatura' });
    }
});

/**
 * GET /api/purchase-history
 * Get user's purchase history
 */
app.get('/api/purchase-history', authMiddleware, async (req, res) => {
    try {
        const history = await getPurchaseHistory(req.user.id);
        res.json({ purchases: history });
    } catch (err) {
        console.error('[Stripe] History error:', err);
        res.status(500).json({ error: 'Erro ao buscar histórico' });
    }
});

/**
 * POST /api/stripe/verify-session
 * Verify and fulfill a Checkout Session after redirect.
 * This is the primary fulfillment method (works without webhooks).
 */
app.post('/api/stripe/verify-session', authMiddleware, paymentRateLimiter, async (req, res) => {
    try {
        const { sessionId } = req.body;

        if (!sessionId) {
            return res.status(400).json({ error: 'sessionId é obrigatório' });
        }

        const result = await fulfillCheckoutSession(sessionId, req.user.id);
        res.json(result);
    } catch (err) {
        console.error('[Stripe] Verify session error:', err);
        res.status(500).json({ error: 'Erro ao verificar pagamento' });
    }
});

// ============================================
// SERVER STARTUP
// ============================================

// ============================================
// YUPOO IMAGE SEARCH
// ============================================

// Configure multer for image search uploads (memory storage)
const imageSearchUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Apenas imagens são permitidas'), false);
        }
    }
}).single('image');

/**
 * POST /api/yupoo/image-search
 * Search for similar Yupoo products using an uploaded image.
 * Uses perceptual hashing (dHash) + color histogram for matching.
 */
app.post('/api/yupoo/image-search', (req, res) => {
    imageSearchUpload(req, res, async (err) => {
        try {
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({ error: 'Imagem muito grande. Máximo 10MB.' });
                }
                return res.status(400).json({ error: 'Erro no upload: ' + err.message });
            } else if (err) {
                return res.status(400).json({ error: err.message });
            }

            if (!req.file) {
                return res.status(400).json({ error: 'Nenhuma imagem enviada' });
            }

            console.log(`[ImageSearch] Received image: ${req.file.originalname} (${(req.file.size / 1024).toFixed(1)}KB)`);

            const result = await searchByImage(req.file.buffer);

            if (result.error) {
                return res.status(503).json({ error: result.error });
            }

            console.log(`[ImageSearch] Found ${result.results.length} matches in ${result.duration}ms`);

            res.json({
                success: true,
                results: result.results,
                totalMatches: result.totalMatches,
                duration: result.duration
            });
        } catch (error) {
            console.error('[ImageSearch] Error:', error);
            res.status(500).json({ error: 'Erro ao processar busca por imagem' });
        }
    });
});

// ============================================
// END YUPOO IMAGE SEARCH
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

        // Ensure credits_package column exists (migration for separated credit types)
        try {
            const { error: migrationError } = await supabase.rpc('exec_sql', {
                sql: `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS credits_package integer DEFAULT 0;`
            });
            if (migrationError) {
                // rpc might not exist — try a safe probe instead
                console.warn('[Server] ⚠ Could not auto-migrate credits_package column. Ensure it exists in your Supabase schema.');
            } else {
                console.log('[Server] ✓ credits_package column verified');
            }
        } catch (err) {
            console.warn('[Server] ⚠ Migration check skipped:', err.message);
            console.warn('[Server] ⚠ Make sure the "credits_package" (integer, default 0) column exists in the users table.');
        }

        // Sync Stripe products/prices
        try {
            await syncStripeProducts();
            console.log('[Server] ✓ Stripe products synced');
        } catch (err) {
            console.warn('[Server] ⚠ Stripe sync failed:', err.message);
        }
        // SECURITY (L1): Periodic cleanup of expired sessions
        const cleanupExpiredSessions = async () => {
            try {
                const { error } = await supabase
                    .from('sessions')
                    .delete()
                    .lt('expires_at', new Date().toISOString());
                if (!error) {
                    console.log('[Server] ✓ Expired sessions cleaned up');
                }
            } catch (err) {
                console.warn('[Server] Session cleanup error:', err.message);
            }
        };

        // Run cleanup on startup and every 24 hours
        await cleanupExpiredSessions();
        setInterval(cleanupExpiredSessions, 24 * 60 * 60 * 1000);

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


