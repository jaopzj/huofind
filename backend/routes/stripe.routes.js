import { Router } from 'express';
import express from 'express';
import { authMiddleware } from '../authMiddleware.js';
import { paymentRateLimiter } from '../middleware/rateLimiters.js';
import {
    createCreditCheckoutSession,
    createSubscriptionCheckoutSession,
    createPortalSession,
    constructWebhookEvent,
    handleWebhookEvent,
    getPurchaseHistory,
    getSubscriptionStatus,
    fulfillCheckoutSession,
} from '../stripe.js';

const router = Router();

/**
 * POST /api/stripe/webhook
 * Stripe webhook handler - uses raw body for signature verification.
 * IMPORTANT: This route must be registered BEFORE express.json() in server.js.
 * It is mounted separately from the other stripe routes.
 */
export function mountWebhookRoute(app) {
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
}

/**
 * POST /api/stripe/checkout
 * Create a Checkout Session for one-time credit purchase
 */
router.post('/checkout', authMiddleware, paymentRateLimiter, async (req, res) => {
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
        res.status(500).json({ error: 'Erro ao iniciar pagamento' });
    }
});

/**
 * POST /api/stripe/subscribe
 * Create a Checkout Session for a subscription
 */
router.post('/subscribe', authMiddleware, paymentRateLimiter, async (req, res) => {
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

        res.status(500).json({ error: 'Erro ao iniciar assinatura' });
    }
});

/**
 * POST /api/stripe/portal
 * Create a Stripe Customer Portal session
 */
router.post('/portal', authMiddleware, paymentRateLimiter, async (req, res) => {
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
router.get('/status', authMiddleware, async (req, res) => {
    try {
        const status = await getSubscriptionStatus(req.user.id);
        res.json(status || { tier: 'guest', status: null });
    } catch (err) {
        console.error('[Stripe] Status error:', err);
        res.status(500).json({ error: 'Erro ao buscar status da assinatura' });
    }
});

/**
 * POST /api/stripe/verify-session
 * Verify and fulfill a Checkout Session after redirect
 */
router.post('/verify-session', authMiddleware, paymentRateLimiter, async (req, res) => {
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

export default router;
