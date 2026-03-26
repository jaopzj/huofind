import { Router } from 'express';
import { authMiddleware } from '../authMiddleware.js';
import supabase from '../supabase.js';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import {
    getUserCreditsData,
    checkAndRenewCredits,
    getNextRenewalDate,
    TIER_MINING_MAX_PRODUCTS
} from '../miningLimits.js';
import { getTierInfo } from '../tiers.js';
import { checkSubscriptionExpiry } from '../stripe.js';

const router = Router();

// Configure multer for avatar uploads (memory storage)
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

/**
 * PUT /api/user/profile
 * Update user name
 */
router.put('/profile', authMiddleware, async (req, res) => {
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
router.put('/email', authMiddleware, async (req, res) => {
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
router.put('/password', authMiddleware, async (req, res) => {
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
router.post('/avatar', authMiddleware, (req, res) => {
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
router.delete('/account', authMiddleware, async (req, res) => {
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
        await supabase.from('sessions').delete().eq('user_id', userId);
        await supabase.from('saved_products').delete().eq('user_id', userId);
        await supabase.from('saved_sellers').delete().eq('user_id', userId);
        await supabase.from('collections').delete().eq('user_id', userId);
        await supabase.from('user_settings').delete().eq('user_id', userId);

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
router.get('/stats', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;

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

/**
 * GET /api/user/mining-status
 * Get current user's credits and mining status
 */
router.get('/mining-status', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;

        // Check subscription expiry (safety net)
        const expiryCheck = await checkSubscriptionExpiry(userId);

        // Check and renew credits if needed
        await checkAndRenewCredits(userId);

        // Get updated credits data
        const data = await getUserCreditsData(userId);

        // Normalize tier name
        const tierInfo = getTierInfo(data.tier);
        const normalizedTierName = tierInfo.name;

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

/**
 * Verify the user has the gold (minerador) tier.
 * Returns the user row on success, or sends a 403 and returns null.
 */
async function requireGoldTier(userId, res) {
    const { data: user } = await supabase
        .from('users')
        .select('tier')
        .eq('id', userId)
        .single();

    const tier = getTierInfo(user?.tier || 'guest').name;
    if (tier !== 'gold') {
        res.status(403).json({ error: 'Recurso exclusivo do plano Minerador (Ouro)' });
        return null;
    }
    return user;
}

/**
 * GET /api/user/profit-settings
 * Get user's profit calculator settings (JSONB) — gold tier only
 */
router.get('/profit-settings', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;

        if (!(await requireGoldTier(userId, res))) return;

        const { data, error } = await supabase
            .from('user_settings')
            .select('profit_settings')
            .eq('user_id', userId)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('[ProfitSettings] Error fetching:', error);
            return res.status(500).json({ error: 'Erro ao buscar configurações' });
        }

        res.json({ settings: data?.profit_settings || null });
    } catch (err) {
        console.error('[ProfitSettings] Error:', err);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

/**
 * PUT /api/user/profit-settings
 * Save user's profit calculator settings (JSONB) — gold tier only
 */
router.put('/profit-settings', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;

        if (!(await requireGoldTier(userId, res))) return;

        const { settings } = req.body;

        if (!settings || typeof settings !== 'object') {
            return res.status(400).json({ error: 'Configurações inválidas' });
        }

        // Validate expected fields and ranges
        const allowed = ['freightPerKg', 'importTaxRate', 'icmsRate', 'desiredMarginPercent', 'additionalCosts', 'defaultWeightKg'];
        const sanitized = {};
        for (const key of allowed) {
            if (key in settings) {
                const val = Number(settings[key]);
                if (isNaN(val) || val < 0) {
                    return res.status(400).json({ error: `Valor inválido para ${key}` });
                }
                sanitized[key] = val;
            }
        }

        const { error } = await supabase
            .from('user_settings')
            .upsert(
                { user_id: userId, profit_settings: sanitized },
                { onConflict: 'user_id' }
            );

        if (error) {
            console.error('[ProfitSettings] Error saving:', error);
            return res.status(500).json({ error: 'Erro ao salvar configurações' });
        }

        console.log(`[ProfitSettings] Settings saved for user ${userId}`);
        res.json({ success: true, settings: sanitized });
    } catch (err) {
        console.error('[ProfitSettings] Error:', err);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

export default router;
