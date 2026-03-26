/**
 * Notification Service
 *
 * Manages in-app notifications: create, list, mark as read, auto-triggers.
 * Types: 'mining_complete', 'credits_low', 'price_drop', 'system'
 */

import supabase from './supabase.js';

/**
 * Create a notification for a user
 * @param {string} userId
 * @param {object} opts - { type, title, message, data }
 * @returns {Promise<object|null>} The created notification or null on error
 */
export async function createNotification(userId, { type, title, message, data = null }) {
    try {
        const { data: notification, error } = await supabase
            .from('notifications')
            .insert({
                user_id: userId,
                type,
                title,
                message,
                data
            })
            .select()
            .single();

        if (error) {
            console.error('[Notifications] Error creating notification:', error);
            return null;
        }

        return notification;
    } catch (err) {
        console.error('[Notifications] Unexpected error:', err);
        return null;
    }
}

/**
 * Get notifications for a user (most recent first)
 * @param {string} userId
 * @param {number} limit
 * @param {number} offset
 * @returns {Promise<{notifications: Array, unreadCount: number}>}
 */
export async function getNotifications(userId, limit = 20, offset = 0) {
    try {
        const [listResult, countResult] = await Promise.all([
            supabase
                .from('notifications')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1),
            supabase
                .from('notifications')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', userId)
                .eq('read', false)
        ]);

        if (listResult.error) {
            console.error('[Notifications] Error fetching notifications:', listResult.error);
            return { notifications: [], unreadCount: 0 };
        }

        return {
            notifications: listResult.data || [],
            unreadCount: countResult.count || 0
        };
    } catch (err) {
        console.error('[Notifications] Unexpected error:', err);
        return { notifications: [], unreadCount: 0 };
    }
}

/**
 * Get unread count only (lightweight)
 */
export async function getUnreadCount(userId) {
    try {
        const { count, error } = await supabase
            .from('notifications')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('read', false);

        if (error) return 0;
        return count || 0;
    } catch {
        return 0;
    }
}

/**
 * Mark a single notification as read
 */
export async function markAsRead(userId, notificationId) {
    const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)
        .eq('user_id', userId);

    if (error) {
        console.error('[Notifications] Error marking as read:', error);
        return false;
    }
    return true;
}

/**
 * Mark all notifications as read
 */
export async function markAllAsRead(userId) {
    const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false);

    if (error) {
        console.error('[Notifications] Error marking all as read:', error);
        return false;
    }
    return true;
}

/**
 * Delete old read notifications (cleanup, called periodically)
 * Keeps last 30 days of read notifications
 */
export async function cleanupOldNotifications() {
    try {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('read', true)
            .lt('created_at', thirtyDaysAgo);

        if (!error) {
            console.log('[Notifications] Old read notifications cleaned up (>30 days)');
        }
    } catch (err) {
        console.warn('[Notifications] Cleanup error:', err.message);
    }
}

// ===== AUTO-NOTIFICATION TRIGGERS =====

/**
 * Notify user that mining is complete
 */
export async function notifyMiningComplete(userId, productCount, sellerName = null) {
    const seller = sellerName ? ` de ${sellerName}` : '';
    return createNotification(userId, {
        type: 'mining_complete',
        title: 'Mineração concluída',
        message: `${productCount} produtos foram minerados${seller}.`,
        data: { productCount, sellerName }
    });
}

/**
 * Notify user that credits are low (≤ 3)
 */
export async function notifyCreditsLow(userId, remainingCredits) {
    // Avoid spamming: check if there's already a recent unread credits_low notification
    const { data: existing } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', userId)
        .eq('type', 'credits_low')
        .eq('read', false)
        .limit(1);

    if (existing && existing.length > 0) return null; // Already notified

    return createNotification(userId, {
        type: 'credits_low',
        title: 'Créditos baixos',
        message: `Você tem apenas ${remainingCredits} crédito${remainingCredits === 1 ? '' : 's'} restante${remainingCredits === 1 ? '' : 's'}. Visite a loja para recarregar.`,
        data: { remainingCredits }
    });
}

/**
 * Notify user about credit consumption
 */
export async function notifyCreditSpent(userId, creditsUsed, reason, remainingCredits) {
    const reasons = {
        mining: 'mineração',
        declaration: 'assistente de declaração',
    };
    const label = reasons[reason] || reason;

    return createNotification(userId, {
        type: 'credit_spent',
        title: `${creditsUsed} crédito${creditsUsed > 1 ? 's' : ''} utilizado${creditsUsed > 1 ? 's' : ''}`,
        message: `Você gastou ${creditsUsed} crédito${creditsUsed > 1 ? 's' : ''} em ${label}. Saldo restante: ${remainingCredits}.`,
        data: { creditsUsed, reason, remainingCredits }
    });
}

/**
 * Notify user about a successful credit pack purchase
 */
export async function notifyPurchaseComplete(userId, creditsAdded, amountBrl) {
    return createNotification(userId, {
        type: 'purchase',
        title: 'Compra confirmada',
        message: `${creditsAdded} créditos adicionados à sua conta. Boas minerações!`,
        data: { creditsAdded, amountBrl }
    });
}

/**
 * Notify user that their subscription was activated/renewed
 */
export async function notifySubscriptionActivated(userId, tier, monthlyCredits) {
    const tierNames = { bronze: 'Bronze', silver: 'Prata', gold: 'Ouro' };
    const displayTier = tierNames[tier] || tier;

    return createNotification(userId, {
        type: 'subscription',
        title: `Plano ${displayTier} ativado`,
        message: `Seu plano ${displayTier} está ativo. ${monthlyCredits} créditos mensais adicionados.`,
        data: { tier, monthlyCredits }
    });
}

/**
 * Notify user that their subscription was canceled / downgraded
 */
export async function notifySubscriptionCanceled(userId) {
    return createNotification(userId, {
        type: 'subscription',
        title: 'Assinatura cancelada',
        message: 'Sua assinatura foi cancelada. Você voltou ao plano Visitante. Seus créditos de pacote foram preservados.',
        data: { newTier: 'guest' }
    });
}

/**
 * Welcome notification for new users
 */
export async function notifyWelcome(userId, userName) {
    const name = userName ? `, ${userName}` : '';
    return createNotification(userId, {
        type: 'system',
        title: 'Bem-vindo à Evo Society!',
        message: `Olá${name}! Você tem 3 créditos para começar a minerar. Explore a plataforma e encontre os melhores produtos.`,
        data: { event: 'welcome' }
    });
}

/**
 * Send a system-wide notification to a specific user
 */
export async function notifySystem(userId, title, message, data = null) {
    return createNotification(userId, {
        type: 'system',
        title,
        message,
        data
    });
}

export default {
    createNotification,
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    cleanupOldNotifications,
    notifyMiningComplete,
    notifyCreditsLow,
    notifyCreditSpent,
    notifyPurchaseComplete,
    notifySubscriptionActivated,
    notifySubscriptionCanceled,
    notifyWelcome,
    notifySystem,
};
