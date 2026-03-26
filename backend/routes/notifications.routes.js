import { Router } from 'express';
import { authMiddleware } from '../authMiddleware.js';
import {
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
} from '../notificationService.js';

const router = Router();

/**
 * GET /api/notifications
 * Get user's notifications (paginated)
 */
router.get('/', authMiddleware, async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 20, 50);
        const offset = parseInt(req.query.offset) || 0;

        const result = await getNotifications(req.user.id, limit, offset);
        res.json(result);
    } catch (err) {
        console.error('[Notifications] Error in GET /:', err);
        res.status(500).json({ error: 'Erro ao buscar notificações' });
    }
});

/**
 * GET /api/notifications/unread-count
 * Get unread notification count (lightweight polling)
 */
router.get('/unread-count', authMiddleware, async (req, res) => {
    try {
        const count = await getUnreadCount(req.user.id);
        res.json({ count });
    } catch (err) {
        console.error('[Notifications] Error in GET /unread-count:', err);
        res.status(500).json({ error: 'Erro ao buscar contagem' });
    }
});

/**
 * PUT /api/notifications/:id/read
 * Mark a single notification as read
 */
router.put('/:id/read', authMiddleware, async (req, res) => {
    try {
        const success = await markAsRead(req.user.id, req.params.id);
        if (!success) {
            return res.status(400).json({ error: 'Erro ao marcar como lida' });
        }
        res.json({ success: true });
    } catch (err) {
        console.error('[Notifications] Error in PUT /:id/read:', err);
        res.status(500).json({ error: 'Erro interno' });
    }
});

/**
 * PUT /api/notifications/read-all
 * Mark all notifications as read
 */
router.put('/read-all', authMiddleware, async (req, res) => {
    try {
        const success = await markAllAsRead(req.user.id);
        if (!success) {
            return res.status(400).json({ error: 'Erro ao marcar todas como lidas' });
        }
        res.json({ success: true });
    } catch (err) {
        console.error('[Notifications] Error in PUT /read-all:', err);
        res.status(500).json({ error: 'Erro interno' });
    }
});

export default router;
