import { Router } from 'express';
import { registerUser, loginUser, refreshAccessToken, logoutUser, checkEmailConfirmed, resendConfirmationEmail, forgotPassword, resetPassword } from '../auth.js';
import { authMiddleware } from '../authMiddleware.js';
import { authRateLimiter } from '../middleware/rateLimiters.js';

const router = Router();

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', authRateLimiter, async (req, res) => {
    try {
        const { email, password, name, refCode } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                error: 'Email e senha são obrigatórios',
                code: 'MISSING_FIELDS'
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                error: 'Senha deve ter pelo menos 8 caracteres',
                code: 'WEAK_PASSWORD'
            });
        }

        const result = await registerUser(email, password, name, refCode);

        if (result.error) {
            return res.status(400).json(result);
        }

        res.status(201).json(result);
    } catch (err) {
        console.error('[Server] Register error:', err);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

/**
 * POST /api/auth/login
 * Login user with email and password
 */
router.post('/login', authRateLimiter, async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                error: 'Email e senha são obrigatórios',
                code: 'MISSING_FIELDS'
            });
        }

        const result = await loginUser(email, password);

        if (result.error) {
            return res.status(401).json(result);
        }

        res.json(result);
    } catch (err) {
        console.error('[Server] Login error:', err);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({
                error: 'Refresh token é obrigatório',
                code: 'MISSING_TOKEN'
            });
        }

        const result = await refreshAccessToken(refreshToken);

        if (result.error) {
            return res.status(401).json(result);
        }

        res.json(result);
    } catch (err) {
        console.error('[Server] Refresh error:', err);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

/**
 * POST /api/auth/logout
 * Logout user (invalidate refresh token)
 */
router.post('/logout', async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (refreshToken) {
            await logoutUser(refreshToken);
        }

        res.json({ success: true, message: 'Logout realizado com sucesso' });
    } catch (err) {
        console.error('[Server] Logout error:', err);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

/**
 * GET /api/auth/me
 * Get current user info (requires auth)
 */
router.get('/me', authMiddleware, (req, res) => {
    res.json({ user: req.user });
});

/**
 * POST /api/auth/check-email-confirmed
 * Check if user's email has been confirmed (for polling)
 */
router.post('/check-email-confirmed', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email é obrigatório' });
        }

        const result = await checkEmailConfirmed(email);
        res.json(result);
    } catch (err) {
        console.error('[Server] Check email confirmed error:', err);
        res.status(500).json({ confirmed: false, error: 'Erro interno' });
    }
});

/**
 * POST /api/auth/forgot-password
 * Start the password reset flow by emailing a recovery link.
 * Always returns success to prevent email enumeration.
 */
router.post('/forgot-password', authRateLimiter, async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email é obrigatório', code: 'MISSING_EMAIL' });
        }

        const result = await forgotPassword(email);

        if (result.error) {
            return res.status(400).json(result);
        }

        res.json(result);
    } catch (err) {
        console.error('[Server] Forgot password error:', err);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

/**
 * POST /api/auth/reset-password
 * Complete the password reset flow using the access_token from the recovery email.
 */
router.post('/reset-password', authRateLimiter, async (req, res) => {
    try {
        const { accessToken, newPassword } = req.body;

        if (!accessToken || !newPassword) {
            return res.status(400).json({
                error: 'Token e nova senha são obrigatórios',
                code: 'MISSING_FIELDS'
            });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({
                error: 'Senha deve ter pelo menos 8 caracteres',
                code: 'WEAK_PASSWORD'
            });
        }

        const result = await resetPassword(accessToken, newPassword);

        if (result.error) {
            return res.status(400).json(result);
        }

        res.json(result);
    } catch (err) {
        console.error('[Server] Reset password error:', err);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

/**
 * POST /api/auth/resend-confirmation
 * Resend confirmation email
 */
router.post('/resend-confirmation', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email é obrigatório' });
        }

        const result = await resendConfirmationEmail(email);

        if (result.error) {
            return res.status(400).json(result);
        }

        res.json(result);
    } catch (err) {
        console.error('[Server] Resend confirmation error:', err);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

export default router;
