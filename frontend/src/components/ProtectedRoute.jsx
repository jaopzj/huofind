import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import WifiLoader from './WifiLoader';
import AuthCard from './AuthCard';

/**
 * ProtectedRoute - wraps routes that require authentication.
 * Shows loading spinner while auth is checking, redirects to AuthCard if not authenticated.
 */
export default function ProtectedRoute() {
    const { isAuthenticated, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-cream-50)' }}>
                <div className="grid-pattern-container">
                    <div className="grid-pattern" />
                </div>
                <WifiLoader message="Carregando..." />
            </div>
        );
    }

    if (!isAuthenticated) {
        return <AuthCard />;
    }

    return <Outlet />;
}
