/**
 * Browser Pool Manager
 *
 * Manages a pool of reusable Playwright browser instances
 * to reduce memory usage and improve performance.
 *
 * Features:
 * - Pool of 3 browser instances (configurable)
 * - Acquire/release pattern with optional { tier, userId }
 * - Bounded queue (MAX_QUEUE_SIZE) — rejects with QUEUE_FULL when full
 * - Priority queue by tier (gold > silver > bronze > guest)
 * - Per-tier concurrency limits (gold: 2 simultaneous, others: 1)
 * - Automatic recycling after MAX_USES_PER_BROWSER uses
 * - Periodic health checks on idle browsers
 * - Metrics: avg wait time, recycle rate, queue rejections
 * - Graceful shutdown
 */
import { chromium } from 'playwright';

const POOL_SIZE = parseInt(process.env.BROWSER_POOL_SIZE, 10) || (process.env.NODE_ENV === 'production' ? 1 : 3);
const MAX_USES_PER_BROWSER = 50;
const ACQUIRE_TIMEOUT_MS = 30000;
const MAX_QUEUE_SIZE = 20;
const HEALTH_CHECK_INTERVAL_MS = 60_000;

const TIER_PRIORITY = { gold: 3, silver: 2, bronze: 1, guest: 0 };
const TIER_MAX_CONCURRENT = { gold: 2, silver: 1, bronze: 1, guest: 1 };

class BrowserPool {
    constructor() {
        this.browsers = []; // { browser, context, useCount, inUse, id, createdAt }
        this.waiting = [];  // Priority queue: [{ resolve, reject, tier, userId, queuedAt, timeoutId }]
        this.initialized = false;
        this.activeSessions = new Map(); // userId -> number of browsers held
        this.healthCheckInterval = null;
        this.metrics = {
            totalAcquires: 0,
            totalWaits: 0,
            totalWaitTimeMs: 0,
            totalRecycles: 0,
            queueRejections: 0,
            healthCheckFailures: 0,
        };
        this.userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0'
        ];
    }

    // ============================================
    // INITIALIZATION
    // ============================================

    async init() {
        if (this.initialized) return;

        console.log(`[BrowserPool] Initializing pool with ${POOL_SIZE} browsers...`);

        for (let i = 0; i < POOL_SIZE; i++) {
            await this._createBrowser(i);
        }

        this.initialized = true;
        this._startHealthCheck();
        console.log(`[BrowserPool] Pool ready with ${this.browsers.length} browsers`);
    }

    async _createBrowser(id) {
        try {
            const browser = await chromium.launch({
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu',
                    '--disable-blink-features=AutomationControlled'
                ]
            });

            const context = await browser.newContext({
                userAgent: this.userAgents[id % this.userAgents.length],
                viewport: { width: 1920, height: 1080 },
                locale: 'zh-CN',
                timezoneId: 'Asia/Shanghai'
            });

            // Anti-detecção: remove flag de automação
            await context.addInitScript(() => {
                Object.defineProperty(navigator, 'webdriver', { get: () => false });
            });

            const browserEntry = {
                id,
                browser,
                context,
                useCount: 0,
                inUse: false,
                createdAt: Date.now()
            };

            this.browsers[id] = browserEntry;
            console.log(`[BrowserPool] Browser ${id} created`);
            return browserEntry;
        } catch (error) {
            console.error(`[BrowserPool] Failed to create browser ${id}:`, error.message);
            throw error;
        }
    }

    // ============================================
    // RECYCLE
    // ============================================

    async _recycleBrowser(id) {
        const entry = this.browsers[id];
        if (entry) {
            try {
                await entry.context.close();
                await entry.browser.close();
                console.log(`[BrowserPool] Browser ${id} recycled (${entry.useCount} uses)`);
            } catch (err) {
                console.error(`[BrowserPool] Error closing browser ${id}:`, err.message);
            }
        }
        this.metrics.totalRecycles++;
        await this._createBrowser(id);
    }

    // ============================================
    // ACQUIRE / RELEASE
    // ============================================

    /**
     * Acquire a browser from the pool.
     * @param {Object} [options]
     * @param {string} [options.tier='guest'] - User tier for priority and concurrency
     * @param {string} [options.userId=null]  - User ID for per-user concurrency tracking
     * @returns {Promise<{ page, browserId, release: () => Promise<void> }>}
     * @throws {Error} QUEUE_FULL | CONCURRENCY_LIMIT | Browser acquire timeout
     */
    async acquire({ tier = 'guest', userId = null } = {}) {
        if (!this.initialized) await this.init();

        this.metrics.totalAcquires++;

        // Per-tier concurrency check
        if (userId) {
            const maxConcurrent = TIER_MAX_CONCURRENT[tier] || 1;
            const currentActive = this.activeSessions.get(userId) || 0;
            if (currentActive >= maxConcurrent) {
                throw new Error('CONCURRENCY_LIMIT');
            }
        }

        // Try to find an available browser immediately
        for (const entry of this.browsers) {
            if (entry && !entry.inUse) {
                try {
                    return await this._assignBrowser(entry, userId);
                } catch (error) {
                    // _assignBrowser already recycled the broken browser, try next
                    continue;
                }
            }
        }

        // All browsers busy — check queue limit
        if (this.waiting.length >= MAX_QUEUE_SIZE) {
            this.metrics.queueRejections++;
            throw new Error('QUEUE_FULL');
        }

        // Enqueue with priority
        this.metrics.totalWaits++;
        console.log(`[BrowserPool] All browsers in use, queuing [${tier}] (${this.waiting.length + 1}/${MAX_QUEUE_SIZE})`);

        return new Promise((resolve, reject) => {
            const queuedAt = Date.now();
            const timeoutId = setTimeout(() => {
                const idx = this.waiting.findIndex(w => w.resolve === resolve);
                if (idx > -1) this.waiting.splice(idx, 1);
                reject(new Error('Browser acquire timeout'));
            }, ACQUIRE_TIMEOUT_MS);

            this._enqueue({ resolve, reject, tier, userId, queuedAt, timeoutId });
        });
    }

    /**
     * Insert into priority queue.
     * Higher tier priority = inserted before lower-priority items.
     * FIFO within the same tier.
     */
    _enqueue(item) {
        const priority = TIER_PRIORITY[item.tier] || 0;

        // Find first item with strictly lower priority → insert before it
        let insertAt = this.waiting.length;
        for (let i = 0; i < this.waiting.length; i++) {
            if (priority > (TIER_PRIORITY[this.waiting[i].tier] || 0)) {
                insertAt = i;
                break;
            }
        }
        this.waiting.splice(insertAt, 0, item);
    }

    /**
     * Assign a specific browser entry, create a page, and track the session.
     */
    async _assignBrowser(entry, userId) {
        entry.inUse = true;
        entry.useCount++;

        try {
            const page = await entry.context.newPage();

            if (userId) {
                this.activeSessions.set(userId, (this.activeSessions.get(userId) || 0) + 1);
            }

            console.log(`[BrowserPool] Browser ${entry.id} acquired (use #${entry.useCount})`);

            return {
                page,
                browserId: entry.id,
                release: async () => {
                    await this._release(entry.id, page, userId);
                }
            };
        } catch (error) {
            console.error(`[BrowserPool] Error creating page for browser ${entry.id}:`, error.message);
            entry.inUse = false;
            await this._recycleBrowser(entry.id);
            throw error;
        }
    }

    /**
     * Release a browser back to the pool.
     */
    async _release(browserId, page, userId) {
        const entry = this.browsers[browserId];
        if (!entry) {
            console.warn(`[BrowserPool] Tried to release unknown browser ${browserId}`);
            return;
        }

        // Close the page
        try {
            await page.close();
        } catch (err) {
            console.error(`[BrowserPool] Error closing page:`, err.message);
        }

        // Decrement active sessions
        if (userId) {
            const count = this.activeSessions.get(userId) || 1;
            if (count <= 1) this.activeSessions.delete(userId);
            else this.activeSessions.set(userId, count - 1);
        }

        // Check if browser needs recycling
        if (entry.useCount >= MAX_USES_PER_BROWSER) {
            console.log(`[BrowserPool] Browser ${browserId} needs recycling`);
            await this._recycleBrowser(browserId);
        } else {
            entry.inUse = false;
        }

        console.log(`[BrowserPool] Browser ${browserId} released`);

        // Serve next waiting request
        await this._processQueue();
    }

    // ============================================
    // QUEUE PROCESSING
    // ============================================

    /**
     * Serve the highest-priority eligible waiter from the queue.
     * Skips waiters whose userId is at its concurrency limit.
     */
    async _processQueue() {
        if (this.waiting.length === 0) return;

        const availableBrowser = this.browsers.find(b => b && !b.inUse);
        if (!availableBrowser) return;

        for (let i = 0; i < this.waiting.length; i++) {
            const waiter = this.waiting[i];

            // Respect per-tier concurrency
            if (waiter.userId) {
                const maxConcurrent = TIER_MAX_CONCURRENT[waiter.tier] || 1;
                const currentActive = this.activeSessions.get(waiter.userId) || 0;
                if (currentActive >= maxConcurrent) continue;
            }

            // Serve this waiter
            this.waiting.splice(i, 1);
            clearTimeout(waiter.timeoutId);

            const waitTimeMs = Date.now() - waiter.queuedAt;
            this.metrics.totalWaitTimeMs += waitTimeMs;

            try {
                const result = await this._assignBrowser(availableBrowser, waiter.userId);
                waiter.resolve(result);
            } catch (error) {
                waiter.reject(error);
                // Browser was recycled by _assignBrowser — try to serve next waiter
                await this._processQueue();
            }
            return;
        }
    }

    // ============================================
    // HEALTH CHECK
    // ============================================

    _startHealthCheck() {
        this.healthCheckInterval = setInterval(async () => {
            for (const entry of this.browsers) {
                if (!entry || entry.inUse) continue;
                try {
                    const page = await entry.context.newPage();
                    await page.close();
                } catch (error) {
                    console.warn(`[BrowserPool] Health check failed for browser ${entry.id}, recycling`);
                    this.metrics.healthCheckFailures++;
                    await this._recycleBrowser(entry.id);
                }
            }
        }, HEALTH_CHECK_INTERVAL_MS);
    }

    // ============================================
    // STATS
    // ============================================

    getStats() {
        const avgWaitTimeMs = this.metrics.totalWaits > 0
            ? Math.round(this.metrics.totalWaitTimeMs / this.metrics.totalWaits)
            : 0;

        return {
            poolSize: POOL_SIZE,
            maxQueueSize: MAX_QUEUE_SIZE,
            initialized: this.initialized,
            browsers: this.browsers.map(b => ({
                id: b?.id,
                inUse: b?.inUse,
                useCount: b?.useCount
            })),
            queueLength: this.waiting.length,
            activeSessions: Object.fromEntries(this.activeSessions),
            metrics: {
                totalAcquires: this.metrics.totalAcquires,
                totalWaits: this.metrics.totalWaits,
                avgWaitTimeMs,
                totalRecycles: this.metrics.totalRecycles,
                queueRejections: this.metrics.queueRejections,
                healthCheckFailures: this.metrics.healthCheckFailures,
            }
        };
    }

    // ============================================
    // SHUTDOWN
    // ============================================

    async shutdown() {
        console.log('[BrowserPool] Shutting down...');

        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }

        // Reject all pending waiters
        for (const waiter of this.waiting) {
            clearTimeout(waiter.timeoutId);
            waiter.reject(new Error('Pool shutting down'));
        }
        this.waiting = [];

        for (const entry of this.browsers) {
            if (entry) {
                try {
                    await entry.context.close();
                    await entry.browser.close();
                } catch (err) {
                    console.error(`[BrowserPool] Error closing browser ${entry.id}:`, err.message);
                }
            }
        }

        this.browsers = [];
        this.activeSessions.clear();
        this.initialized = false;

        console.log('[BrowserPool] Shutdown complete');
    }
}

// Singleton instance
const browserPool = new BrowserPool();

export default browserPool;
