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

    // Check for existing session on mount
    useEffect(() => {
        const token = localStorage.getItem('accessToken');
        const refreshToken = localStorage.getItem('refreshToken');

        if (token) {
            // Verify token and get user info
            fetchUser(token).then(userData => {
                if (userData) {
                    setUser(userData);
                } else if (refreshToken) {
                    // Try to refresh if access token expired
                    refreshAccessToken(refreshToken);
                }
                setLoading(false);
            });
        } else {
            setLoading(false);
        }
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

    const register = useCallback(async (email, password, name) => {
        setError(null);
        setLoading(true);

        try {
            const response = await fetch(`${API_URL}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, name })
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Erro ao cadastrar');
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
            console.error('[Auth] Register error:', err);
            setError('Erro de conexão. Tente novamente.');
            setLoading(false);
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
        setUser(null);
    }, []);

    const value = {
        user,
        loading,
        error,
        isAuthenticated: !!user,
        register,
        login,
        logout,
        clearError: () => setError(null)
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
