import { Router } from 'express';
import { authMiddleware } from '../authMiddleware.js';
import {
    validateRefCode,
    getUserRefCode,
    getUserStoredRefCode,
    storeRefCodeForUser,
    getReferralStats,
    REFERRAL_DISCOUNT_PERCENT
} from '../referrals.js';

const router = Router();

/**
 * GET /api/referral/my-code
 * Get current user's referral code
 */
router.get('/my-code', authMiddleware, async (req, res) => {
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
router.get('/stored-code', authMiddleware, async (req, res) => {
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
router.post('/validate', authMiddleware, async (req, res) => {
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
router.post('/store', authMiddleware, async (req, res) => {
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
router.get('/stats', authMiddleware, async (req, res) => {
    try {
        const stats = await getReferralStats(req.user.id);
        res.json(stats);
    } catch (err) {
        console.error('[Referral] Error getting stats:', err);
        res.status(500).json({ error: 'Erro interno' });
    }
});

export default router;
