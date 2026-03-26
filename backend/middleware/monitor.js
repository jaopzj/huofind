/**
 * Request Monitoring Middleware
 *
 * Measures request duration and records to the metrics collector.
 * Lightweight — only hooks res.end, no body inspection.
 */
import metrics from '../metrics.js';

export function monitorMiddleware(req, res, next) {
    const start = process.hrtime.bigint();

    const originalEnd = res.end;
    res.end = function (...args) {
        const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
        metrics.recordRequest(req.method, req.path, res.statusCode, durationMs);

        originalEnd.apply(this, args);
    };

    next();
}
