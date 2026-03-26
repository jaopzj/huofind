import { Router } from 'express';
import { authMiddleware } from '../authMiddleware.js';
import {
    getCollections,
    createCollection,
    updateCollection,
    deleteCollection,
    moveProductToCollection,
    TIER_COLLECTION_LIMITS,
    COLLECTION_ICONS,
    COLLECTION_COLORS
} from '../productCollections.js';

const router = Router();

/**
 * GET /api/collections
 * List all collections for user with product counts
 */
router.get('/', authMiddleware, async (req, res) => {
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
router.post('/', authMiddleware, async (req, res) => {
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
router.put('/:id', authMiddleware, async (req, res) => {
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
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        await deleteCollection(req.user.id, req.params.id);
        res.json({ success: true });
    } catch (error) {
        console.error('[Server] Error deleting collection:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
