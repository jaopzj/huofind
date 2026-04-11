import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AnimatedLogo from '../components/AnimatedLogo';

/**
 * ResetPasswordPage - Public page that handles the Supabase password recovery redirect.
 *
 * Flow:
 *  1. User clicks the link in the password-reset email.
 *  2. Supabase redirects here with `#access_token=...&type=recovery&...` in the URL hash.
 *  3. We parse the hash, let the user enter a new password, and POST to /api/auth/reset-password.
 *  4. On success, redirect to the login card.
 */
export default function ResetPasswordPage() {
    const navigate = useNavigate();
    const { resetPassword, error: authError, clearError } = useAuth();

    const [accessToken, setAccessToken] = useState('');
    const [tokenType, setTokenType] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [localError, setLocalError] = useState('');
    const [success, setSuccess] = useState(false);

    // Parse the hash from the Supabase recovery link on mount.
    useEffect(() => {
        const hash = window.location.hash.startsWith('#')
            ? window.location.hash.substring(1)
            : window.location.hash;
        const params = new URLSearchParams(hash);
        const at = params.get('access_token') || '';
        const type = params.get('type') || '';
        setAccessToken(at);
        setTokenType(type);
    }, []);

    const displayError = localError || authError;

    const handleSubmit = async (e) => {
        e.preventDefault();
        clearError();
        setLocalError('');

        if (!accessToken) {
            setLocalError('Link de redefinição inválido ou expirado.');
            return;
        }

        if (newPassword.length < 8) {
            setLocalError('A senha deve ter pelo menos 8 caracteres');
            return;
        }

        if (newPassword !== confirmPassword) {
            setLocalError('As senhas não coincidem');
            return;
        }

        setSubmitting(true);
        const result = await resetPassword(accessToken, newPassword);
        setSubmitting(false);

        if (result.success) {
            setSuccess(true);
            // Clear the hash so the token is not left in the URL.
            try {
                window.history.replaceState(null, '', window.location.pathname);
            } catch (_) { /* ignore */ }

            setTimeout(() => navigate('/', { replace: true }), 2500);
        }
    };

    const missingToken = !accessToken && tokenType !== 'recovery';

    return (
        <div
            className="min-h-screen w-full flex items-center justify-center p-6 md:p-12 relative overflow-hidden"
            style={{ background: '#0f172a' }}
        >
            <div
                className="w-full max-w-[480px] relative z-10 p-8 lg:p-10"
                style={{
                    background: '#1f2937',
                    borderRadius: '24px',
                    boxShadow: '0 25px 60px rgba(0, 0, 0, 0.2)',
                    border: '1px solid rgba(255,255,255,0.05)'
                }}
            >
                <div className="mb-10 flex justify-center">
                    <AnimatedLogo className="h-24" />
                </div>

                <div className="mb-8">
                    <h2 className="text-4xl font-bold mb-1 tracking-tight text-white">
                        Redefinir senha
                    </h2>
                    <p className="text-base text-gray-400">
                        Escolha uma nova senha para sua conta
                    </p>
                </div>

                {missingToken && (
                    <div
                        className="mb-6 p-4 rounded-xl"
                        style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            color: '#f87171'
                        }}
                    >
                        <p className="text-sm font-medium">
                            Link inválido ou expirado. Solicite um novo link no formulário
                            "Esqueci a senha".
                        </p>
                    </div>
                )}

                {displayError && !missingToken && (
                    <div
                        className="mb-6 p-4 rounded-xl"
                        style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            color: '#f87171'
                        }}
                    >
                        <span className="text-sm font-medium">{displayError}</span>
                    </div>
                )}

                {success ? (
                    <div className="text-center space-y-6 py-4 animate-fade-in-up">
                        <div className="flex justify-center">
                            <div
                                className="w-24 h-24 rounded-full flex items-center justify-center"
                                style={{
                                    background: 'rgba(16, 185, 129, 0.1)',
                                    border: '1px solid rgba(16, 185, 129, 0.2)'
                                }}
                            >
                                <svg
                                    className="w-12 h-12 text-green-500"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2.5}
                                        d="M5 13l4 4L19 7"
                                    />
                                </svg>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-xl font-bold text-white mb-2">
                                Senha atualizada!
                            </h3>
                            <p className="text-gray-400 text-sm">
                                Você já pode entrar com sua nova senha.
                            </p>
                        </div>

                        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                            <div
                                className="h-full rounded-full"
                                style={{
                                    background: '#10B981',
                                    animation: 'loadingBar 2.5s ease-out forwards'
                                }}
                            />
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-semibold mb-2.5 text-gray-400">
                                Nova senha
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    disabled={missingToken}
                                    className="w-full px-5 py-4 pr-14 rounded-xl text-base transition-all duration-200 disabled:opacity-40"
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.03)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        outline: 'none',
                                        color: '#ffffff'
                                    }}
                                    onFocus={(e) => {
                                        e.target.style.borderColor = '#3b82f6';
                                        e.target.style.background = 'rgba(255, 255, 255, 0.05)';
                                        e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                                    }}
                                    onBlur={(e) => {
                                        e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                                        e.target.style.background = 'rgba(255, 255, 255, 0.03)';
                                        e.target.style.boxShadow = 'none';
                                    }}
                                    placeholder="Mínimo 8 caracteres"
                                    required
                                    minLength={8}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors"
                                >
                                    {showPassword ? (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                                        </svg>
                                    ) : (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold mb-2.5 text-gray-400">
                                Confirmar nova senha
                            </label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                disabled={missingToken}
                                className="w-full px-5 py-4 rounded-xl text-base transition-all duration-200 disabled:opacity-40"
                                style={{
                                    background: 'rgba(255, 255, 255, 0.03)',
                                    border: confirmPassword && newPassword !== confirmPassword
                                        ? '1px solid #f87171'
                                        : '1px solid rgba(255, 255, 255, 0.1)',
                                    outline: 'none',
                                    color: '#ffffff'
                                }}
                                onFocus={(e) => {
                                    e.target.style.borderColor = '#3b82f6';
                                    e.target.style.background = 'rgba(255, 255, 255, 0.05)';
                                    e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = confirmPassword && newPassword !== confirmPassword
                                        ? '#f87171'
                                        : 'rgba(255, 255, 255, 0.1)';
                                    e.target.style.background = 'rgba(255, 255, 255, 0.03)';
                                    e.target.style.boxShadow = 'none';
                                }}
                                placeholder="Digite novamente"
                                required
                                minLength={8}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={submitting || missingToken}
                            className="w-full py-4 rounded-xl font-bold text-white text-base transition-all duration-200 mt-2 block hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:hover:scale-100"
                            style={{
                                background: submitting || missingToken
                                    ? '#374151'
                                    : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                boxShadow: submitting || missingToken
                                    ? 'none'
                                    : '0 8px 25px rgba(59, 130, 246, 0.25)'
                            }}
                        >
                            {submitting ? 'Atualizando...' : 'Redefinir senha'}
                        </button>
                    </form>
                )}

                <div className="mt-10 pt-6 border-t border-white/5 flex justify-center">
                    <button
                        type="button"
                        onClick={() => navigate('/', { replace: true })}
                        className="text-sm font-semibold hover:underline"
                        style={{ color: '#3b82f6' }}
                    >
                        Voltar ao login
                    </button>
                </div>
            </div>
        </div>
    );
}
