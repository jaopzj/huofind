import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

const API_URL = '';

/**
 * Auth Provider - Manages authentication state
 */
export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [pendingEmailConfirmation, setPendingEmailConfirmation] = useState(() => {
        const saved = localStorage.getItem('pendingEmailConfirmation');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                return saved;
            }
        }
        return null;
    }); // { email, name }

    // Check for existing session on mount
    useEffect(() => {
        const initAuth = async () => {
            const token = localStorage.getItem('accessToken');
            const storedRefreshToken = localStorage.getItem('refreshToken');

            if (token) {
                // Verify token and get user info
                const userData = await fetchUser(token);
                if (userData) {
                    setUser(userData);
                } else if (storedRefreshToken) {
                    // Access token expired/invalid, try to refresh
                    await refreshAccessToken(storedRefreshToken);
                }
            } else if (storedRefreshToken) {
                // No access token but refresh token exists, try to refresh
                await refreshAccessToken(storedRefreshToken);
            }

            setLoading(false);
        };

        initAuth();
    }, []);

    const fetchUser = async (token) => {
        try {
            const response = await fetch(`${API_URL}/api/auth/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                return data.user;
            }
            return null;
        } catch (err) {
            console.error('[Auth] Error fetching user:', err);
            return null;
        }
    };

    const refreshAccessToken = async (refreshToken) => {
        try {
            const response = await fetch(`${API_URL}/api/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken })
            });

            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('accessToken', data.accessToken);
                setUser(data.user);
                return true;
            } else {
                // Invalid refresh token, clear storage
                logout();
                return false;
            }
        } catch (err) {
            console.error('[Auth] Error refreshing token:', err);
            return false;
        }
    };

    const register = useCallback(async (email, password, name, refCode = null) => {
        setError(null);
        setLoading(true);

        try {
            const response = await fetch(`${API_URL}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, name, refCode })
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Erro ao cadastrar');
                setLoading(false);
                return { success: false };
            }

            // Check if email confirmation is required
            if (data.requiresEmailConfirmation) {
                const pendingData = { email, name };
                setPendingEmailConfirmation(pendingData);
                localStorage.setItem('pendingEmailConfirmation', JSON.stringify(pendingData));
                setLoading(false);
                return { success: true, needsEmailConfirmation: true };
            }

            // Store tokens (if no email confirmation needed)
            localStorage.setItem('accessToken', data.accessToken);
            localStorage.setItem('refreshToken', data.refreshToken);
            setUser(data.user);
            setLoading(false);
            return { success: true, needsEmailConfirmation: false };
        } catch (err) {
            console.error('[Auth] Register error:', err);
            setError('Erro de conexão. Tente novamente.');
            setLoading(false);
            return { success: false };
        }
    }, []);

    // Check if email has been confirmed (polling)
    const checkEmailConfirmation = useCallback(async (email) => {
        try {
            const response = await fetch(`${API_URL}/api/auth/check-email-confirmed`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const data = await response.json();

            if (response.ok && data.confirmed) {
                // Email confirmed, now log the user in
                if (data.accessToken && data.refreshToken) {
                    localStorage.setItem('accessToken', data.accessToken);
                    localStorage.setItem('refreshToken', data.refreshToken);
                    setUser(data.user);
                    setPendingEmailConfirmation(null);
                    localStorage.removeItem('pendingEmailConfirmation');
                }
                return { confirmed: true, user: data.user };
            }

            return { confirmed: false };
        } catch (err) {
            console.error('[Auth] Check email confirmation error:', err);
            return { confirmed: false, error: err.message };
        }
    }, []);

    // Resend confirmation email
    const resendConfirmationEmail = useCallback(async (email) => {
        try {
            const response = await fetch(`${API_URL}/api/auth/resend-confirmation`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Erro ao reenviar e-mail');
                return false;
            }

            return true;
        } catch (err) {
            console.error('[Auth] Resend confirmation error:', err);
            setError('Erro de conexão.');
            return false;
        }
    }, []);

    const login = useCallback(async (email, password) => {
        setError(null);
        setLoading(true);

        try {
            const response = await fetch(`${API_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Erro ao fazer login');
                setLoading(false);
                return false;
            }

            // Store tokens
            localStorage.setItem('accessToken', data.accessToken);
            localStorage.setItem('refreshToken', data.refreshToken);
            setUser(data.user);
            setLoading(false);
            return true;
        } catch (err) {
            console.error('[Auth] Login error:', err);
            setError('Erro de conexão. Tente novamente.');
            setLoading(false);
            return false;
        }
    }, []);

    // Send password-reset email
    const forgotPassword = useCallback(async (email) => {
        setError(null);

        try {
            const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Erro ao enviar e-mail de redefinição');
                return { success: false };
            }

            return { success: true };
        } catch (err) {
            console.error('[Auth] Forgot password error:', err);
            setError('Erro de conexão. Tente novamente.');
            return { success: false };
        }
    }, []);

    // Complete password reset using the access_token from the recovery email
    const resetPassword = useCallback(async (accessToken, newPassword) => {
        setError(null);

        try {
            const response = await fetch(`${API_URL}/api/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accessToken, newPassword })
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Erro ao redefinir senha');
                return { success: false };
            }

            return { success: true };
        } catch (err) {
            console.error('[Auth] Reset password error:', err);
            setError('Erro de conexão. Tente novamente.');
            return { success: false };
        }
    }, []);

    const logout = useCallback(async () => {
        const refreshToken = localStorage.getItem('refreshToken');

        if (refreshToken) {
            try {
                await fetch(`${API_URL}/api/auth/logout`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ refreshToken })
                });
            } catch (err) {
                console.error('[Auth] Logout error:', err);
            }
        }

        // Clear local storage and state
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('pendingEmailConfirmation');
        setUser(null);
        setPendingEmailConfirmation(null);
    }, []);

    const value = {
        user,
        loading,
        error,
        isAuthenticated: !!user,
        pendingEmailConfirmation,
        setPendingEmailConfirmation,
        register,
        login,
        logout,
        checkEmailConfirmation,
        resendConfirmationEmail,
        forgotPassword,
        resetPassword,
        clearError: () => setError(null),
        clearPendingEmail: () => {
            setPendingEmailConfirmation(null);
            localStorage.removeItem('pendingEmailConfirmation');
        }
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

/**
 * Hook to use auth context
 */
export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

export default AuthContext;
