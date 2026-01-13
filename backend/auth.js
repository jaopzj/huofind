import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import supabase from './supabase.js';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_change_me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Generate JWT token for user
 */
function generateToken(userId, email) {
    return jwt.sign(
        { userId, email },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
}

/**
 * Generate refresh token
 */
function generateRefreshToken() {
    return jwt.sign(
        { type: 'refresh', random: Math.random().toString(36) },
        JWT_SECRET,
        { expiresIn: '30d' }
    );
}

/**
 * Verify JWT token
 */
function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (err) {
        return null;
    }
}

/**
 * Register a new user
 */
export async function registerUser(email, password, name) {
    try {
        // Check if user already exists
        const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('email', email.toLowerCase())
            .single();

        if (existingUser) {
            return { error: 'Email já cadastrado', code: 'EMAIL_EXISTS' };
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Insert new user
        const { data: newUser, error } = await supabase
            .from('users')
            .insert({
                email: email.toLowerCase(),
                password_hash: passwordHash,
                name: name || null
            })
            .select('id, email, name, created_at')
            .single();

        if (error) {
            console.error('[Auth] Error creating user:', error);
            return { error: 'Erro ao criar usuário', code: 'DB_ERROR' };
        }

        // Generate tokens
        const accessToken = generateToken(newUser.id, newUser.email);
        const refreshToken = generateRefreshToken();

        // Store refresh token
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        await supabase.from('sessions').insert({
            user_id: newUser.id,
            refresh_token: refreshToken,
            expires_at: expiresAt.toISOString()
        });

        // Create default settings
        await supabase.from('user_settings').insert({
            user_id: newUser.id
        });

        console.log(`[Auth] User registered: ${newUser.email}`);

        return {
            user: {
                id: newUser.id,
                email: newUser.email,
                name: newUser.name
            },
            accessToken,
            refreshToken
        };
    } catch (err) {
        console.error('[Auth] Register error:', err);
        return { error: 'Erro interno', code: 'INTERNAL_ERROR' };
    }
}

/**
 * Login user with email and password
 */
export async function loginUser(email, password) {
    try {
        // Find user by email (include tier and mining_count for rate limiting)
        const { data: user, error } = await supabase
            .from('users')
            .select('id, email, name, password_hash, avatar_url, tier, mining_count')
            .eq('email', email.toLowerCase())
            .single();

        if (error || !user) {
            return { error: 'Email ou senha incorretos', code: 'INVALID_CREDENTIALS' };
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            return { error: 'Email ou senha incorretos', code: 'INVALID_CREDENTIALS' };
        }

        // Generate tokens
        const accessToken = generateToken(user.id, user.email);
        const refreshToken = generateRefreshToken();

        // Store refresh token
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        await supabase.from('sessions').insert({
            user_id: user.id,
            refresh_token: refreshToken,
            expires_at: expiresAt.toISOString()
        });

        console.log(`[Auth] User logged in: ${user.email}`);

        return {
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                avatarUrl: user.avatar_url,
                tier: user.tier || 'bronze',
                miningCount: user.mining_count || 0
            },
            accessToken,
            refreshToken
        };
    } catch (err) {
        console.error('[Auth] Login error:', err);
        return { error: 'Erro interno', code: 'INTERNAL_ERROR' };
    }
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(refreshToken) {
    try {
        // Find valid session
        const { data: session, error } = await supabase
            .from('sessions')
            .select('user_id, expires_at')
            .eq('refresh_token', refreshToken)
            .single();

        if (error || !session) {
            return { error: 'Token inválido', code: 'INVALID_TOKEN' };
        }

        // Check expiration
        if (new Date(session.expires_at) < new Date()) {
            // Delete expired session
            await supabase.from('sessions').delete().eq('refresh_token', refreshToken);
            return { error: 'Token expirado', code: 'TOKEN_EXPIRED' };
        }

        // Get user
        const { data: user } = await supabase
            .from('users')
            .select('id, email, name, avatar_url')
            .eq('id', session.user_id)
            .single();

        if (!user) {
            return { error: 'Usuário não encontrado', code: 'USER_NOT_FOUND' };
        }

        // Generate new access token
        const accessToken = generateToken(user.id, user.email);

        return {
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                avatarUrl: user.avatar_url
            },
            accessToken
        };
    } catch (err) {
        console.error('[Auth] Refresh error:', err);
        return { error: 'Erro interno', code: 'INTERNAL_ERROR' };
    }
}

/**
 * Logout user (invalidate refresh token)
 */
export async function logoutUser(refreshToken) {
    try {
        await supabase.from('sessions').delete().eq('refresh_token', refreshToken);
        return { success: true };
    } catch (err) {
        console.error('[Auth] Logout error:', err);
        return { error: 'Erro interno', code: 'INTERNAL_ERROR' };
    }
}

/**
 * Get user by ID
 */
export async function getUserById(userId) {
    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('id, email, name, avatar_url, created_at')
            .eq('id', userId)
            .single();

        if (error || !user) {
            return null;
        }

        return {
            id: user.id,
            email: user.email,
            name: user.name,
            avatarUrl: user.avatar_url,
            createdAt: user.created_at
        };
    } catch (err) {
        console.error('[Auth] Get user error:', err);
        return null;
    }
}

/**
 * Verify token middleware export
 */
export { verifyToken };
