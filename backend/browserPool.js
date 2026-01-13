/**
 * Browser Pool Manager
 * 
 * Manages a pool of reusable Playwright browser instances
 * to reduce memory usage and improve performance
 * 
 * Features:
 * - Pool of 3 browser instances (configurable)
 * - Acquire/release pattern
 * - Automatic recycling after 50 uses
 * - Health checks
 * - Graceful shutdown
 */
import { chromium } from 'playwright';

const POOL_SIZE = 3;
const MAX_USES_PER_BROWSER = 50;
const ACQUIRE_TIMEOUT_MS = 30000;

class BrowserPool {
    constructor() {
        this.browsers = []; // { browser, context, useCount, inUse, id }
        this.waiting = []; // Queue of waiting requests
        this.initialized = false;
        this.userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0'
        ];
    }

    /**
     * Initialize the browser pool
     */
    async init() {
        if (this.initialized) {
            return;
        }

        console.log(`[BrowserPool] Initializing pool with ${POOL_SIZE} browsers...`);

        for (let i = 0; i < POOL_SIZE; i++) {
            await this._createBrowser(i);
        }

        this.initialized = true;
        console.log(`[BrowserPool] Pool ready with ${this.browsers.length} browsers`);
    }

    /**
     * Create a new browser instance
     */
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
                    '--disable-gpu'
                ]
            });

            const context = await browser.newContext({
                userAgent: this.userAgents[id % this.userAgents.length],
                viewport: { width: 1920, height: 1080 },
                locale: 'zh-CN',
                timezoneId: 'Asia/Shanghai'
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

    /**
     * Recycle a browser (close old, create new)
     */
    async _recycleBrowser(id) {
        const entry = this.browsers[id];

        if (entry) {
            try {
                await entry.context.close();
                await entry.browser.close();
                console.log(`[BrowserPool] Browser ${id} closed (${entry.useCount} uses)`);
            } catch (err) {
                console.error(`[BrowserPool] Error closing browser ${id}:`, err.message);
            }
        }

        await this._createBrowser(id);
    }

    /**
     * Acquire a browser from the pool
     * Returns { page, release } - caller MUST call release() when done
     */
    async acquire() {
        if (!this.initialized) {
            await this.init();
        }

        // Find an available browser
        for (const entry of this.browsers) {
            if (entry && !entry.inUse) {
                entry.inUse = true;
                entry.useCount++;

                try {
                    const page = await entry.context.newPage();

                    console.log(`[BrowserPool] Browser ${entry.id} acquired (use #${entry.useCount})`);

                    return {
                        page,
                        browserId: entry.id,
                        release: async () => {
                            await this._release(entry.id, page);
                        }
                    };
                } catch (error) {
                    console.error(`[BrowserPool] Error creating page for browser ${entry.id}:`, error.message);
                    entry.inUse = false;
                    // Try to recycle this browser
                    await this._recycleBrowser(entry.id);
                }
            }
        }

        // All browsers in use, wait for one to become available
        console.log('[BrowserPool] All browsers in use, waiting...');

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                const index = this.waiting.indexOf(resolve);
                if (index > -1) {
                    this.waiting.splice(index, 1);
                }
                reject(new Error('Browser acquire timeout'));
            }, ACQUIRE_TIMEOUT_MS);

            this.waiting.push(async () => {
                clearTimeout(timeout);
                try {
                    const result = await this.acquire();
                    resolve(result);
                } catch (err) {
                    reject(err);
                }
            });
        });
    }

    /**
     * Release a browser back to the pool
     */
    async _release(browserId, page) {
        const entry = this.browsers[browserId];

        if (!entry) {
            console.warn(`[BrowserPool] Tried to release unknown browser ${browserId}`);
            return;
        }

        try {
            // Close the page
            await page.close();
        } catch (err) {
            console.error(`[BrowserPool] Error closing page:`, err.message);
        }

        // Check if browser needs recycling
        if (entry.useCount >= MAX_USES_PER_BROWSER) {
            console.log(`[BrowserPool] Browser ${browserId} needs recycling`);
            await this._recycleBrowser(browserId);
        } else {
            entry.inUse = false;
        }

        console.log(`[BrowserPool] Browser ${browserId} released`);

        // Process waiting requests
        if (this.waiting.length > 0) {
            const next = this.waiting.shift();
            next();
        }
    }

    /**
     * Get pool statistics
     */
    getStats() {
        return {
            poolSize: POOL_SIZE,
            initialized: this.initialized,
            browsers: this.browsers.map(b => ({
                id: b?.id,
                inUse: b?.inUse,
                useCount: b?.useCount
            })),
            waiting: this.waiting.length
        };
    }

    /**
     * Close all browsers and shutdown pool
     */
    async shutdown() {
        console.log('[BrowserPool] Shutting down...');

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
        this.waiting = [];
        this.initialized = false;

        console.log('[BrowserPool] Shutdown complete');
    }
}

// Singleton instance
const browserPool = new BrowserPool();

export default browserPool;
