import { verifyToken, getUserById } from './auth.js';

/**
 * Middleware to verify JWT token and attach user to request
 * Usage: app.get('/protected', authMiddleware, (req, res) => { ... })
 */
export async function authMiddleware(req, res, next) {
    try {
        // Get token from header OR query param (for SSE/EventSource which can't send headers)
        const authHeader = req.headers.authorization;
        let token = null;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
        } else if (req.query.token) {
            // Fallback to query param for EventSource
            token = req.query.token;
        }

        if (!token) {
            return res.status(401).json({
                error: 'Token não fornecido',
                code: 'NO_TOKEN'
            });
        }

        // Verify token
        const decoded = verifyToken(token);
        if (!decoded) {
            return res.status(401).json({
                error: 'Token inválido ou expirado',
                code: 'INVALID_TOKEN'
            });
        }

        // Get user from database
        const user = await getUserById(decoded.userId);
        if (!user) {
            return res.status(401).json({
                error: 'Usuário não encontrado',
                code: 'USER_NOT_FOUND'
            });
        }

        // Attach user to request
        req.user = user;
        next();
    } catch (err) {
        console.error('[AuthMiddleware] Error:', err);
        return res.status(500).json({
            error: 'Erro interno de autenticação',
            code: 'AUTH_ERROR'
        });
    }
}

/**
 * Optional auth middleware - doesn't require auth but attaches user if token present
 */
export async function optionalAuthMiddleware(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const decoded = verifyToken(token);

            if (decoded) {
                const user = await getUserById(decoded.userId);
                if (user) {
                    req.user = user;
                }
            }
        }

        next();
    } catch (err) {
        // Silently continue without user
        next();
    }
}
