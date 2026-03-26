import { Router } from 'express';
import { authMiddleware } from '../authMiddleware.js';
import {
    getSavedProducts,
    saveProduct,
    deleteProduct as deleteProductById,
    deleteProductByUrl,
    getSaveCount,
    isProductSaved,
    TIER_SAVE_LIMITS
} from '../savedProducts.js';

const router = Router();

/**
 * GET /api/saved-products
 * Get all saved products for user with count and limit info
 */
router.get('/', authMiddleware, async (req, res) => {
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
router.post('/', authMiddleware, async (req, res) => {
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
router.delete('/:id', authMiddleware, async (req, res) => {
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
router.post('/toggle', authMiddleware, async (req, res) => {
    try {
        const { productUrl, productTitle, productPrice, productImage, productCurrency, sellerName } = req.body;

        if (!productUrl) {
            return res.status(400).json({ error: 'URL do produto é obrigatória' });
        }

        const isSaved = await isProductSaved(req.user.id, productUrl);
        const tier = req.user.tier || 'guest';
        const limit = TIER_SAVE_LIMITS[tier] || TIER_SAVE_LIMITS.guest;

        if (isSaved) {
            await deleteProductByUrl(req.user.id, productUrl);
            const count = await getSaveCount(req.user.id);
            return res.json({ saved: false, count, limit });
        } else {
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
router.get('/check', authMiddleware, async (req, res) => {
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

export default router;
