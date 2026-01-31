import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import supabase from './supabase.js';
import { createClient } from '@supabase/supabase-js';

// Create a Supabase client for auth operations (with anon key for user signup)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);

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
 * Register a new user using Supabase Auth (with email confirmation)
 */
export async function registerUser(email, password, name) {
    try {
        const emailLower = email.toLowerCase();

        // Use Supabase Auth to create user
        const { data: authData, error: authError } = await supabaseAuth.auth.signUp({
            email: emailLower,
            password: password,
            options: {
                data: { name: name || null }
            }
        });

        if (authError) {
            console.error('[Auth] Supabase Auth error:', authError);
            if (authError.message.includes('already registered')) {
                return { error: 'Email já cadastrado', code: 'EMAIL_EXISTS' };
            }
            return { error: authError.message, code: 'AUTH_ERROR' };
        }

        const userId = authData.user.id;

        // Sync to public.users table immediately
        await supabase.from('users').upsert({
            id: userId,
            email: emailLower,
            name: name || null,
            tier: 'guest',
            credits: 3,
            mining_count: 0
        }, { onConflict: 'id' });

        // Check if email confirmation is required
        if (authData.user && !authData.user.email_confirmed_at) {
            console.log(`[Auth] User registered, awaiting email confirmation: ${emailLower}`);
            return {
                requiresEmailConfirmation: true,
                email: emailLower,
                message: 'Verifique seu e-mail para confirmar a conta'
            };
        }

        // Create session tokens
        const accessToken = generateToken(userId, emailLower);
        const refreshToken = generateRefreshToken();

        // Store refresh token
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        await supabase.from('sessions').insert({
            user_id: userId,
            refresh_token: refreshToken,
            expires_at: expiresAt.toISOString()
        });

        return {
            user: { id: userId, email: emailLower, name },
            accessToken,
            refreshToken
        };
    } catch (err) {
        console.error('[Auth] Register error:', err);
        return { error: 'Erro interno', code: 'INTERNAL_ERROR' };
    }
}

/**
 * Check if email has been confirmed and return tokens if so
 */
export async function checkEmailConfirmed(email) {
    try {
        const { data: { users }, error } = await supabase.auth.admin.listUsers();
        if (error) throw error;

        const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
        if (!user) return { confirmed: false, error: 'User not found' };

        if (!user.email_confirmed_at) return { confirmed: false };

        const emailLower = user.email.toLowerCase();
        const userName = user.user_metadata?.name || null;

        // Ensure user is in public.users with email_verified flag
        await supabase.from('users').upsert({
            id: user.id,
            email: emailLower,
            name: userName,
            email_verified: true
        }, { onConflict: 'id' });

        // Ensure user_settings exists
        await supabase.from('user_settings').upsert({ user_id: user.id }, { onConflict: 'user_id' });

        const accessToken = generateToken(user.id, emailLower);
        const refreshToken = generateRefreshToken();

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        await supabase.from('sessions').insert({
            user_id: user.id,
            refresh_token: refreshToken,
            expires_at: expiresAt.toISOString()
        });

        return {
            confirmed: true,
            user: { id: user.id, email: emailLower, name: userName },
            accessToken,
            refreshToken
        };
    } catch (err) {
        console.error('[Auth] CheckEmailConfirmed error:', err);
        return { confirmed: false, error: err.message };
    }
}

/**
 * Resend confirmation email
 */
export async function resendConfirmationEmail(email) {
    try {
        const { error } = await supabaseAuth.auth.resend({
            type: 'signup',
            email: email.toLowerCase()
        });

        if (error) {
            console.error('[Auth] Resend confirmation error:', error);
            return { error: error.message, code: 'RESEND_ERROR' };
        }

        console.log(`[Auth] Confirmation email resent to: ${email}`);
        return { success: true };
    } catch (err) {
        console.error('[Auth] Resend error:', err);
        return { error: 'Erro interno', code: 'INTERNAL_ERROR' };
    }
}

/**
 * Login user with email and password
 */
export async function loginUser(email, password) {
    try {
        const emailLower = email.toLowerCase();

        // Use Supabase Auth for sign in
        const { data: authData, error: authError } = await supabaseAuth.auth.signInWithPassword({
            email: emailLower,
            password: password
        });

        if (authError) {
            console.error('[Auth] Supabase Login error:', authError);
            return { error: 'Email ou senha incorretos', code: 'INVALID_CREDENTIALS' };
        }

        const user = authData.user;

        // Sync to public.users to ensure data consistency
        const { data: publicUser } = await supabase
            .from('users')
            .select('name, avatar_url, tier, mining_count')
            .eq('id', user.id)
            .single();

        // If not in public.users, sync it now
        if (!publicUser) {
            await supabase.from('users').upsert({
                id: user.id,
                email: emailLower,
                name: user.user_metadata?.name || null,
                tier: 'guest',
                credits: 3,
                mining_count: 0
            });
        }

        // Generate tokens for app session
        const accessToken = generateToken(user.id, emailLower);
        const refreshToken = generateRefreshToken();

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        await supabase.from('sessions').insert({
            user_id: user.id,
            refresh_token: refreshToken,
            expires_at: expiresAt.toISOString()
        });

        return {
            user: {
                id: user.id,
                email: emailLower,
                name: publicUser?.name || user.user_metadata?.name || null,
                avatarUrl: publicUser?.avatar_url || null,
                tier: publicUser?.tier || 'guest',
                miningCount: publicUser?.mining_count || 0
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
            .select('id, email, name, avatar_url, created_at, tier')
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
            createdAt: user.created_at,
            tier: user.tier || 'guest'
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
