import React from 'react';

/**
 * FallbackUI — shown when an ErrorBoundary catches a render error.
 * Matches the app's dark theme. "Recarregar" reloads the page;
 * "Voltar ao início" navigates home (soft reset).
 */
function FallbackUI({ error, onReset }) {
    return (
        <div
            className="min-h-[50vh] flex items-center justify-center p-6"
            style={{ background: 'transparent' }}
        >
            <div
                className="max-w-md w-full rounded-2xl border p-8 text-center"
                style={{
                    background: 'rgba(31, 41, 55, 0.6)',
                    backdropFilter: 'blur(16px)',
                    borderColor: 'rgba(255,255,255,0.08)',
                }}
            >
                <div
                    className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full"
                    style={{ background: 'rgba(239, 68, 68, 0.15)' }}
                >
                    <svg
                        className="h-7 w-7"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="#F87171"
                        strokeWidth={2}
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                    </svg>
                </div>

                <h2
                    className="text-lg font-bold mb-2"
                    style={{ color: '#F3F4F6' }}
                >
                    Algo deu errado
                </h2>

                <p
                    className="text-sm mb-6 leading-relaxed"
                    style={{ color: '#9CA3AF' }}
                >
                    Ocorreu um erro inesperado ao exibir esta seção.
                    Tente recarregar a página ou voltar ao início.
                </p>

                {process.env.NODE_ENV === 'development' && error && (
                    <pre
                        className="mb-6 max-h-32 overflow-auto rounded-lg p-3 text-left text-xs"
                        style={{
                            background: 'rgba(0,0,0,0.3)',
                            color: '#F87171',
                            border: '1px solid rgba(248,113,113,0.2)',
                        }}
                    >
                        {error.message}
                        {error.stack && `\n${error.stack}`}
                    </pre>
                )}

                <div className="flex items-center justify-center gap-3">
                    <button
                        onClick={() => window.location.reload()}
                        className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
                        style={{
                            background: '#3B82F6',
                            color: 'white',
                            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#2563EB';
                            e.currentTarget.style.transform = 'scale(1.02)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#3B82F6';
                            e.currentTarget.style.transform = 'scale(1)';
                        }}
                    >
                        Recarregar página
                    </button>

                    <button
                        onClick={onReset}
                        className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
                        style={{
                            background: 'rgba(255,255,255,0.08)',
                            color: '#D1D5DB',
                            border: '1px solid rgba(255,255,255,0.1)',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.12)';
                            e.currentTarget.style.transform = 'scale(1.02)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                            e.currentTarget.style.transform = 'scale(1)';
                        }}
                    >
                        Voltar ao início
                    </button>
                </div>
            </div>
        </div>
    );
}

/**
 * ErrorBoundary — catches render errors in child components and shows
 * a graceful fallback instead of a white screen.
 *
 * Usage:
 *   <ErrorBoundary>
 *     <MyComponent />
 *   </ErrorBoundary>
 *
 *   <ErrorBoundary level="global">   ← fullscreen fallback for root-level
 *     <App />
 *   </ErrorBoundary>
 */
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error(
            `[ErrorBoundary${this.props.name ? `:${this.props.name}` : ''}]`,
            error,
            errorInfo?.componentStack
        );

        // Future: send to Sentry / error reporting
        // Sentry.captureException(error, { extra: { componentStack: errorInfo?.componentStack } });
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
        // Navigate home unless already there
        if (window.location.pathname !== '/') {
            window.location.href = '/';
        }
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            if (this.props.level === 'global') {
                return (
                    <div
                        className="min-h-screen flex items-center justify-center"
                        style={{ background: '#111827' }}
                    >
                        <FallbackUI
                            error={this.state.error}
                            onReset={this.handleReset}
                        />
                    </div>
                );
            }

            return (
                <FallbackUI
                    error={this.state.error}
                    onReset={this.handleReset}
                />
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
