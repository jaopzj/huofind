import rateLimit from 'express-rate-limit';

// Rate limiter for payment endpoints
export const paymentRateLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10,
    message: { error: 'Muitas tentativas. Aguarde um momento.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limiter for auth endpoints (prevent brute force)
export const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20,
    message: { error: 'Muitas tentativas de login. Tente novamente em 15 minutos.' },
    standardHeaders: true,
    legacyHeaders: false,
});
