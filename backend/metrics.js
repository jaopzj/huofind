/**
 * Centralized Metrics Collector
 *
 * Tracks request counts, response times, errors, and mining-specific metrics.
 * Provides threshold-based alerting (error rate, latency, memory).
 * Integrates with Sentry when available.
 */
import * as Sentry from '@sentry/node';

const ALERT_INTERVAL_MS = 60_000;
const ALERT_THRESHOLDS = {
    errorRatePercent: 5,
    latencyMs: 10_000,
    memoryPercent: 80,
};

class MetricsCollector {
    constructor() {
        this.startedAt = Date.now();

        // Rolling window (reset every 5 minutes for rate calculations)
        this._windowMs = 5 * 60_000;
        this._windowStart = Date.now();

        // Counters (lifetime)
        this.totalRequests = 0;
        this.totalErrors = 0;
        this.totalMiningRequests = 0;
        this.totalMiningTimeMs = 0;
        this.totalMiningProducts = 0;

        // Counters (current window)
        this._windowRequests = 0;
        this._windowErrors = 0;
        this._windowLatencySum = 0;

        // Error breakdown
        this.errorsByType = {};

        // Per-endpoint stats (top-level path only)
        this.endpoints = {};

        // Last alert state (prevents spamming)
        this._lastAlerts = { errorRate: 0, latency: 0, memory: 0 };
        this._alertCooldownMs = 5 * 60_000;

        this._alertInterval = null;
    }

    // ============================================
    // RECORDING
    // ============================================

    /**
     * Record an HTTP request completion.
     */
    recordRequest(method, path, statusCode, durationMs) {
        this.totalRequests++;
        this._windowRequests++;
        this._windowLatencySum += durationMs;

        if (statusCode >= 400) {
            this.totalErrors++;
            this._windowErrors++;
        }

        // Per-endpoint (normalize to first 2 segments: /api/something)
        const key = `${method} ${this._normalizePath(path)}`;
        if (!this.endpoints[key]) {
            this.endpoints[key] = { count: 0, totalMs: 0, errors: 0 };
        }
        const ep = this.endpoints[key];
        ep.count++;
        ep.totalMs += durationMs;
        if (statusCode >= 400) ep.errors++;

        this._maybeResetWindow();
    }

    /**
     * Record an error by type/category.
     */
    recordError(type, message) {
        if (!this.errorsByType[type]) {
            this.errorsByType[type] = { count: 0, lastMessage: '', lastAt: null };
        }
        const entry = this.errorsByType[type];
        entry.count++;
        entry.lastMessage = message;
        entry.lastAt = new Date().toISOString();
    }

    /**
     * Record a completed mining operation.
     */
    recordMining(durationMs, productsCount) {
        this.totalMiningRequests++;
        this.totalMiningTimeMs += durationMs;
        this.totalMiningProducts += productsCount;
    }

    // ============================================
    // QUERYING
    // ============================================

    getMetrics() {
        const mem = process.memoryUsage();
        const windowAvgLatency = this._windowRequests > 0
            ? Math.round(this._windowLatencySum / this._windowRequests)
            : 0;
        const windowErrorRate = this._windowRequests > 0
            ? parseFloat(((this._windowErrors / this._windowRequests) * 100).toFixed(2))
            : 0;
        const avgMiningTime = this.totalMiningRequests > 0
            ? Math.round(this.totalMiningTimeMs / this.totalMiningRequests)
            : 0;

        return {
            uptime: Math.round(process.uptime()),
            timestamp: new Date().toISOString(),

            requests: {
                total: this.totalRequests,
                errors: this.totalErrors,
                errorRatePercent: this.totalRequests > 0
                    ? parseFloat(((this.totalErrors / this.totalRequests) * 100).toFixed(2))
                    : 0,
            },

            window: {
                periodMs: this._windowMs,
                requests: this._windowRequests,
                errors: this._windowErrors,
                errorRatePercent: windowErrorRate,
                avgLatencyMs: windowAvgLatency,
            },

            mining: {
                totalRequests: this.totalMiningRequests,
                avgTimeMs: avgMiningTime,
                totalProducts: this.totalMiningProducts,
            },

            errorsByType: this.errorsByType,

            endpoints: this._topEndpoints(10),

            memory: {
                rss: Math.round(mem.rss / 1024 / 1024),
                heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
                heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
                heapPercent: parseFloat(((mem.heapUsed / mem.heapTotal) * 100).toFixed(1)),
                external: Math.round(mem.external / 1024 / 1024),
            },
        };
    }

    // ============================================
    // ALERTS
    // ============================================

    startAlertChecks() {
        this._alertInterval = setInterval(() => this._checkAlerts(), ALERT_INTERVAL_MS);
    }

    stopAlertChecks() {
        if (this._alertInterval) {
            clearInterval(this._alertInterval);
            this._alertInterval = null;
        }
    }

    _checkAlerts() {
        const now = Date.now();
        const mem = process.memoryUsage();
        const heapPercent = (mem.heapUsed / mem.heapTotal) * 100;

        // Error rate alert
        if (this._windowRequests >= 10) {
            const errorRate = (this._windowErrors / this._windowRequests) * 100;
            if (errorRate > ALERT_THRESHOLDS.errorRatePercent && now - this._lastAlerts.errorRate > this._alertCooldownMs) {
                this._lastAlerts.errorRate = now;
                const msg = `[Alert] Error rate ${errorRate.toFixed(1)}% exceeds ${ALERT_THRESHOLDS.errorRatePercent}% threshold (${this._windowErrors}/${this._windowRequests} requests)`;
                console.warn(msg);
                Sentry.captureMessage(msg, 'warning');
            }
        }

        // Latency alert
        if (this._windowRequests >= 5) {
            const avgLatency = this._windowLatencySum / this._windowRequests;
            if (avgLatency > ALERT_THRESHOLDS.latencyMs && now - this._lastAlerts.latency > this._alertCooldownMs) {
                this._lastAlerts.latency = now;
                const msg = `[Alert] Avg latency ${Math.round(avgLatency)}ms exceeds ${ALERT_THRESHOLDS.latencyMs}ms threshold`;
                console.warn(msg);
                Sentry.captureMessage(msg, 'warning');
            }
        }

        // Memory alert
        if (heapPercent > ALERT_THRESHOLDS.memoryPercent && now - this._lastAlerts.memory > this._alertCooldownMs) {
            this._lastAlerts.memory = now;
            const msg = `[Alert] Heap usage ${heapPercent.toFixed(1)}% exceeds ${ALERT_THRESHOLDS.memoryPercent}% threshold (${Math.round(mem.heapUsed / 1024 / 1024)}MB / ${Math.round(mem.heapTotal / 1024 / 1024)}MB)`;
            console.warn(msg);
            Sentry.captureMessage(msg, 'warning');
        }
    }

    // ============================================
    // INTERNALS
    // ============================================

    _normalizePath(path) {
        // /api/saved-products/abc123 → /api/saved-products/:id
        const segments = path.split('/').slice(0, 4);
        return segments.map((s, i) => {
            if (i <= 2) return s; // keep /api/something
            // Replace UUIDs and numeric IDs with :id
            if (/^[0-9a-f-]{8,}$/i.test(s) || /^\d+$/.test(s)) return ':id';
            return s;
        }).join('/');
    }

    _topEndpoints(limit) {
        return Object.entries(this.endpoints)
            .sort(([, a], [, b]) => b.count - a.count)
            .slice(0, limit)
            .map(([key, stats]) => ({
                endpoint: key,
                count: stats.count,
                avgMs: stats.count > 0 ? Math.round(stats.totalMs / stats.count) : 0,
                errors: stats.errors,
            }));
    }

    _maybeResetWindow() {
        if (Date.now() - this._windowStart > this._windowMs) {
            this._windowStart = Date.now();
            this._windowRequests = 0;
            this._windowErrors = 0;
            this._windowLatencySum = 0;
        }
    }
}

const metrics = new MetricsCollector();

export default metrics;
