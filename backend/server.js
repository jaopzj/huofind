// SEC-13: Centralized config — loads dotenv and validates all env vars
import { config } from './config.js';

import express from 'express';
import cors from 'cors';
import * as Sentry from '@sentry/node';

// Route modules
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import miningRoutes from './routes/mining.routes.js';
import stripeRoutes, { mountWebhookRoute } from './routes/stripe.routes.js';
import referralRoutes from './routes/referral.routes.js';
import productsRoutes from './routes/products.routes.js';
import collectionsRoutes from './routes/collections.routes.js';
import sellersRoutes from './routes/sellers.routes.js';
import yupooRoutes from './routes/yupoo.routes.js';
import notificationsRoutes from './routes/notifications.routes.js';
import miscRoutes from './routes/misc.routes.js';

// Services needed for startup
import browserPool from './browserPool.js';
import supabase from './supabase.js';
import { syncStripeProducts } from './stripe.js';
import { cleanupOldNotifications } from './notificationService.js';
import { moveProductToCollection } from './productCollections.js';
import { authMiddleware } from './authMiddleware.js';
import metrics from './metrics.js';
import { monitorMiddleware } from './middleware/monitor.js';

const app = express();
const PORT = config.port;

// ============================================
// SENTRY (optional — only if SENTRY_DSN is set)
// ============================================
if (config.sentryDsn) {
    Sentry.init({
        dsn: config.sentryDsn,
        environment: config.nodeEnv,
        tracesSampleRate: config.isProduction ? 0.2 : 1.0,
    });
    console.log('[Sentry] Error tracking initialized');
}

// ============================================
// GLOBAL MIDDLEWARE
// ============================================

// Request monitoring (must come before routes)
app.use(monitorMiddleware);

// CORS — restrict to frontend origin only
const allowedOrigins = [config.clientUrl];
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

// IMPORTANT: Stripe webhook needs raw body — must come BEFORE express.json()
mountWebhookRoute(app);

app.use(express.json());

// ============================================
// MOUNT ROUTES
// ============================================

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api', miningRoutes);
app.use('/api/stripe', stripeRoutes);
app.use('/api/referral', referralRoutes);
app.use('/api/saved-products', productsRoutes);
app.use('/api/collections', collectionsRoutes);
app.use('/api/saved-sellers', sellersRoutes);
app.use('/api/yupoo', yupooRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api', miscRoutes);

// Legacy route: PUT /api/saved-products/:id/collection (kept for backward compat)
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

// Global error handler — captures to Sentry and records metric
app.use((err, req, res, _next) => {
    metrics.recordError('unhandled', err.message);
    if (config.sentryDsn) Sentry.captureException(err);
    console.error('[Server] Unhandled error:', err.message);
    if (!res.headersSent) {
        res.status(500).json({ error: 'Internal server error' });
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
            console.log('[Server] Browser pool initialized (3 browsers)');
        } catch (err) {
            console.warn('[Server] Browser pool unavailable:', err.message);
        }

        console.log('[Server] Mining limits system ready (Supabase)');

        // Ensure credits_package column exists
        try {
            const { error: migrationError } = await supabase.rpc('exec_sql', {
                sql: `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS credits_package integer DEFAULT 0;`
            });
            if (migrationError) {
                console.warn('[Server] Could not auto-migrate credits_package column. Ensure it exists in your Supabase schema.');
            } else {
                console.log('[Server] credits_package column verified');
            }
        } catch (err) {
            console.warn('[Server] Migration check skipped:', err.message);
            console.warn('[Server] Make sure the "credits_package" (integer, default 0) column exists in the users table.');
        }

        // Sync Stripe products/prices
        try {
            await syncStripeProducts();
            console.log('[Server] Stripe products synced');
        } catch (err) {
            console.warn('[Server] Stripe sync failed:', err.message);
        }

        // Periodic cleanup of expired sessions
        const cleanupExpiredSessions = async () => {
            try {
                const { error } = await supabase
                    .from('sessions')
                    .delete()
                    .lt('expires_at', new Date().toISOString());
                if (!error) {
                    console.log('[Server] Expired sessions cleaned up');
                }
            } catch (err) {
                console.warn('[Server] Session cleanup error:', err.message);
            }
        };

        await cleanupExpiredSessions();
        setInterval(cleanupExpiredSessions, 24 * 60 * 60 * 1000);

        // LOG-02: Periodic cleanup of old processed Stripe events (>30 days)
        const cleanupOldStripeEvents = async () => {
            try {
                const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
                const { error } = await supabase
                    .from('processed_stripe_events')
                    .delete()
                    .lt('processed_at', thirtyDaysAgo);
                if (!error) {
                    console.log('[Server] Old Stripe events cleaned up (>30 days)');
                }
            } catch (err) {
                console.warn('[Server] Stripe events cleanup error:', err.message);
            }
        };

        await cleanupOldStripeEvents();
        setInterval(cleanupOldStripeEvents, 24 * 60 * 60 * 1000);

        // Periodic cleanup of old read notifications (>30 days)
        await cleanupOldNotifications();
        setInterval(cleanupOldNotifications, 24 * 60 * 60 * 1000);

        // Start metrics alert monitoring
        metrics.startAlertChecks();
        console.log('[Server] Metrics & alert monitoring started');

        // Start Express server
        const server = app.listen(PORT, () => {
            console.log(`
╔════════════════════════════════════════════════════════╗
║   Huofind Backend                                      ║
║   Server running on http://localhost:${PORT}              ║
║                                                        ║
║   Account Tiers:                                       ║
║   Guest: 10 mining/IP                                  ║
║   Bronze: 50 mining                                    ║
║   Silver: 150 mining                                   ║
║   Gold:   Unlimited                                    ║
║                                                        ║
║   Features:                                            ║
║   - Tier-based mining with Supabase persistence        ║
║   - Device fingerprinting & IP tracking                ║
║   - Browser Pool: 3 reusable instances                 ║
║   - Modular route architecture                         ║
╚════════════════════════════════════════════════════════╝
            `);
        });

        // Graceful shutdown
        const gracefulShutdown = async (signal) => {
            console.log(`\n[Server] ${signal} received. Shutting down gracefully...`);

            server.close(async () => {
                console.log('[Server] HTTP server closed');

                try {
                    metrics.stopAlertChecks();
                    await browserPool.shutdown();
                    if (config.sentryDsn) await Sentry.close(2000);
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

startServer();
