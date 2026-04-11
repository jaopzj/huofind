import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import supabase from './supabase.js';
import { createClient } from '@supabase/supabase-js';
import { config } from './config.js';
import { notifyWelcome } from './notificationService.js';

// Create a Supabase client for auth operations (with anon key for user signup)
const supabaseAuth = createClient(config.supabaseUrl, config.supabaseAnonKey);

const JWT_SECRET = config.jwtSecret;
const JWT_EXPIRES_IN = config.jwtExpiresIn;

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
 * @param {string} email
 * @param {string} password
 * @param {string} name
 * @param {string|null} refCode - Optional referral code
 */
export async function registerUser(email, password, name, refCode = null) {
    try {
        const emailLower = email.toLowerCase();

        // Validate referral code if provided (case-insensitive search)
        let referrerId = null;
        let referrerCode = null;
        if (refCode && refCode.length === 7) {
            // Use ilike for case-insensitive search
            const { data: referrer, error: refError } = await supabase
                .from('users')
                .select('id, ref_id')
                .ilike('ref_id', refCode)
                .single();

            if (!refError && referrer) {
                referrerId = referrer.id;
                referrerCode = referrer.ref_id;
                console.log(`[Auth] Valid referral code ${refCode} -> ${referrerCode} from user ${referrerId}`);
            } else {
                console.log(`[Auth] Invalid referral code provided: ${refCode}`, refError?.message);
            }
        }

        // Use Supabase Auth to create user
        const { data: authData, error: authError } = await supabaseAuth.auth.signUp({
            email: emailLower,
            password: password,
            options: {
                data: { name: name || null },
                // Redirect target after user clicks the confirmation link in the email.
                // Must be listed in Supabase Auth → URL Configuration → Redirect URLs.
                emailRedirectTo: config.publicAppUrl
            }
        });

        if (authError) {
            console.error('[Auth] Supabase Auth error:', authError);
            if (authError.message.includes('already registered')) {
                return { error: 'Email já cadastrado', code: 'EMAIL_EXISTS' };
            }
            if (authError.message.includes('Database error saving new user')) {
                console.error('[Auth] Database trigger error - check for broken triggers on auth.users table in Supabase Dashboard');
                return { error: 'Erro temporário no cadastro. Tente novamente em instantes.', code: 'DB_ERROR' };
            }
            return { error: authError.message, code: 'AUTH_ERROR' };
        }

        // Supabase returns a fake user with empty identities when the email is already registered
        // (instead of throwing an error). Detect this and block duplicate registration.
        if (
            authData.user &&
            (!authData.user.identities || authData.user.identities.length === 0)
        ) {
            console.warn(`[Auth] Duplicate signup attempt blocked for: ${emailLower}`);
            return { error: 'Email já cadastrado', code: 'EMAIL_EXISTS' };
        }

        const userId = authData.user.id;

        // SECURITY (LOG-08): Block self-referral — the refCode was validated before
        // userId existed, so the self-referral check in validateRefCode couldn't fire.
        // Now that we have userId, verify the referrer is not the same user.
        if (referrerId && referrerId === userId) {
            console.warn(`[Auth] Self-referral blocked for user ${userId}`);
            referrerId = null;
            referrerCode = null;
        }

        // Hash password for public.users table (used for email/password changes)
        const passwordHash = await bcrypt.hash(password, 10);

        // Generate unique ref_id for new user
        const generateRefId = () => {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            let result = '';
            for (let i = 0; i < 7; i++) {
                result += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return result;
        };

        const newRefId = generateRefId();

        // Build user data object
        const userData = {
            id: userId,
            email: emailLower,
            name: name || null,
            tier: 'guest',
            credits: 3,
            mining_count: 0,
            ref_id: newRefId,
            password_hash: passwordHash
        };

        // Add referral data if valid
        if (referrerId && referrerCode) {
            userData.referred_by_id = referrerId;
            userData.referred_by_code = referrerCode;
        }

        // Sync to public.users table immediately
        const { error: upsertError } = await supabase.from('users').upsert(userData, { onConflict: 'id' });

        if (upsertError) {
            console.error('[Auth] Error upserting user:', upsertError);
        } else {
            console.log(`[Auth] User created with ref_id: ${newRefId}`);
            // FEAT-01: Welcome notification
            notifyWelcome(userId, name || null).catch(() => {});
        }

        // SECURITY (LOG-08): Post-insert safety net — if somehow referred_by_id === id, clean it
        if (referrerId && referrerCode) {
            const { data: insertedUser } = await supabase
                .from('users')
                .select('id, referred_by_id')
                .eq('id', userId)
                .single();

            if (insertedUser && insertedUser.referred_by_id === insertedUser.id) {
                console.warn(`[Auth] Post-insert self-referral detected for ${userId}, cleaning up`);
                await supabase.from('users').update({
                    referred_by_id: null,
                    referred_by_code: null
                }).eq('id', userId);
                referrerId = null;
                referrerCode = null;
            }
        }

        // Log referral in history if applicable
        if (referrerId && referrerCode) {
            await supabase.from('referral_history').insert({
                referrer_id: referrerId,
                referred_id: userId,
                ref_code: referrerCode,
                registered_at: new Date().toISOString()
            });
            console.log(`[Auth] Referral logged: ${userId} referred by ${referrerId}`);
        }


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

        // Check if user already exists in public.users
        const { data: existingUser } = await supabase
            .from('users')
            .select('id, credits')
            .eq('id', user.id)
            .single();

        if (existingUser) {
            // User exists — only update email_verified flag, preserve all other data
            await supabase.from('users')
                .update({ email_verified: true })
                .eq('id', user.id);
        } else {
            // User doesn't exist (initial upsert in registerUser must have failed) — create with proper defaults
            const generateRefId = () => {
                const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
                let result = '';
                for (let i = 0; i < 7; i++) {
                    result += chars.charAt(Math.floor(Math.random() * chars.length));
                }
                return result;
            };
            await supabase.from('users').insert({
                id: user.id,
                email: emailLower,
                name: userName,
                email_verified: true,
                tier: 'guest',
                credits: 3,
                mining_count: 0,
                ref_id: generateRefId()
            });
        }

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
            email: email.toLowerCase(),
            options: {
                emailRedirectTo: config.publicAppUrl
            }
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
 * Send a password-reset email through Supabase Auth.
 * The link in the email will land on `${publicAppUrl}/reset-password#access_token=...&type=recovery`.
 * The frontend reads the hash and POSTs to /api/auth/reset-password.
 */
export async function forgotPassword(email) {
    try {
        const emailLower = String(email || '').trim().toLowerCase();
        if (!emailLower) {
            return { error: 'Email é obrigatório', code: 'MISSING_EMAIL' };
        }

        const { error } = await supabaseAuth.auth.resetPasswordForEmail(emailLower, {
            redirectTo: `${config.publicAppUrl}/reset-password`
        });

        if (error) {
            console.error('[Auth] Forgot password error:', error);
            // Supabase returns a generic error for rate-limit etc. Don't leak whether the email exists —
            // respond with success to the client regardless, but log server-side.
        }

        // Always return success to prevent email enumeration.
        console.log(`[Auth] Password reset email dispatch attempted for: ${emailLower}`);
        return { success: true };
    } catch (err) {
        console.error('[Auth] Forgot password error:', err);
        return { error: 'Erro interno', code: 'INTERNAL_ERROR' };
    }
}

/**
 * Complete a password reset. Takes the Supabase access_token that the user received
 * in the reset email URL hash, verifies it, and updates the password via admin API.
 * Also refreshes the bcrypt password_hash stored in public.users.
 */
export async function resetPassword(accessToken, newPassword) {
    try {
        if (!accessToken || !newPassword) {
            return { error: 'Token e nova senha são obrigatórios', code: 'MISSING_FIELDS' };
        }

        if (newPassword.length < 8) {
            return { error: 'Senha deve ter pelo menos 8 caracteres', code: 'WEAK_PASSWORD' };
        }

        // Verify the recovery access token by resolving the user it belongs to.
        const { data: userData, error: getUserError } = await supabaseAuth.auth.getUser(accessToken);
        if (getUserError || !userData?.user) {
            console.warn('[Auth] Reset password: invalid token', getUserError?.message);
            return { error: 'Link de redefinição inválido ou expirado', code: 'INVALID_TOKEN' };
        }

        const userId = userData.user.id;
        const emailLower = (userData.user.email || '').toLowerCase();

        // Update the password through the admin API (service-role key).
        const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
            password: newPassword
        });

        if (updateError) {
            console.error('[Auth] Reset password update error:', updateError);
            return { error: 'Erro ao atualizar senha', code: 'UPDATE_ERROR' };
        }

        // Keep bcrypt password_hash in public.users in sync (used by other flows).
        try {
            const passwordHash = await bcrypt.hash(newPassword, 10);
            await supabase.from('users')
                .update({ password_hash: passwordHash })
                .eq('id', userId);
        } catch (hashErr) {
            console.warn('[Auth] Failed to sync password_hash after reset:', hashErr);
            // Not fatal — Supabase Auth already has the new password.
        }

        // Invalidate any existing refresh sessions so old devices are logged out.
        try {
            await supabase.from('sessions').delete().eq('user_id', userId);
        } catch (sessionErr) {
            console.warn('[Auth] Failed to clear sessions after password reset:', sessionErr);
        }

        console.log(`[Auth] Password reset completed for: ${emailLower}`);
        return { success: true };
    } catch (err) {
        console.error('[Auth] Reset password error:', err);
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
            .select('name, avatar_url, tier, mining_count, password_hash')
            .eq('id', user.id)
            .single();

        // If not in public.users, sync it now
        if (!publicUser) {
            const passwordHash = await bcrypt.hash(password, 10);
            await supabase.from('users').upsert({
                id: user.id,
                email: emailLower,
                name: user.user_metadata?.name || null,
                tier: 'guest',
                credits: 3,
                mining_count: 0,
                password_hash: passwordHash
            });
        } else if (!publicUser.password_hash) {
            // Backfill password_hash for users who registered before this fix
            const passwordHash = await bcrypt.hash(password, 10);
            await supabase.from('users')
                .update({ password_hash: passwordHash })
                .eq('id', user.id);
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
