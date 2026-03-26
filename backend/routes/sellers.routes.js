import { Router } from 'express';
import { authMiddleware } from '../authMiddleware.js';
import scraper from '../scraper.js';
import supabase from '../supabase.js';
import {
    getSavedSellers,
    saveSeller,
    updateSeller,
    deleteSeller,
    SELLER_ICONS
} from '../savedSellers.js';

const router = Router();

/**
 * GET /api/saved-sellers
 * List user's saved sellers
 */
router.get('/', authMiddleware, async (req, res) => {
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
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { nickname, sellerUrl, sellerId: frontendSellerId, sellerName, sellerAvatar, iconType, iconValue } = req.body;

        if (!nickname || !sellerUrl) {
            return res.status(400).json({ error: 'Apelido e URL são obrigatórios' });
        }

        // Extract sellerId from URL if frontend didn't send it
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
router.put('/:id', authMiddleware, async (req, res) => {
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
router.delete('/:id', authMiddleware, async (req, res) => {
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
router.post('/migrate-ids', authMiddleware, async (req, res) => {
    try {
        console.log('[Server] Running seller_id migration for user:', req.user.id);

        const sellers = await getSavedSellers(req.user.id);
        let updated = 0;

        for (const seller of sellers) {
            if (seller.seller_id) continue;

            const extractedId = scraper.extractUserId(seller.seller_url);
            if (!extractedId) continue;

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

export default router;
