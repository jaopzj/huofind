import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AnimatedLogo from './AnimatedLogo';

/**
 * AuthCard - Unified authentication card with smooth transitions between Login and Register
 */
function AuthCard() {
    const {
        login,
        register,
        error,
        loading,
        clearError,
        pendingEmailConfirmation,
        setPendingEmailConfirmation,
        checkEmailConfirmation,
        resendConfirmationEmail,
        forgotPassword
    } = useAuth();

    // Mode: 'login' | 'register' | 'forgot'
    const [mode, setMode] = useState('login');

    // Forgot-password state
    const [forgotEmail, setForgotEmail] = useState('');
    const [forgotLoading, setForgotLoading] = useState(false);
    const [forgotSuccess, setForgotSuccess] = useState(false);
    const navigate = useNavigate();
    const redirectionTimeoutRef = useRef(null);

    // Login form data
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [showLoginPassword, setShowLoginPassword] = useState(false);

    // Register form data
    const [registerName, setRegisterName] = useState('');
    const [registerEmail, setRegisterEmail] = useState('');
    const [registerPassword, setRegisterPassword] = useState('');
    const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');
    const [showRegisterPassword, setShowRegisterPassword] = useState(false);
    const [registerStep, setRegisterStep] = useState(1);
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const [localError, setLocalError] = useState('');
    const [emailConfirmed, setEmailConfirmed] = useState(false);
    const [resending, setResending] = useState(false);
    const [resendSuccess, setResendSuccess] = useState(false);
    const pollingRef = useRef(null);

    // Clear timeout on unmount
    useEffect(() => {
        return () => {
            if (redirectionTimeoutRef.current) {
                clearTimeout(redirectionTimeoutRef.current);
            }
        };
    }, []);

    // Content height animation
    const contentRef = useRef(null);
    const [contentHeight, setContentHeight] = useState('auto');

    // Measure content height when mode or step changes
    useEffect(() => {
        if (contentRef.current) {
            const height = contentRef.current.scrollHeight;
            setContentHeight(`${height}px`);
        }
    }, [mode, registerStep, error, localError, forgotSuccess]);

    // Slider state and autoplay
    const [currentSlide, setCurrentSlide] = useState(0);
    const slides = [
        '/auth-slides/slide-1.png',
        '/auth-slides/slide-2.png',
        '/auth-slides/slide-3.png'
    ];

    // Autoplay every 4 seconds
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % slides.length);
        }, 4000);
        return () => clearInterval(timer);
    }, [slides.length]);



    // Validation for register step 1
    const isStep1Valid = useMemo(() => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return registerName.trim().length >= 2 && emailRegex.test(registerEmail);
    }, [registerName, registerEmail]);

    // Validation for register step 2
    const isStep2Valid = useMemo(() => {
        return registerPassword.length >= 8 && registerPassword === registerConfirmPassword && agreedToTerms;
    }, [registerPassword, registerConfirmPassword, agreedToTerms]);

    const displayError = localError || error;

    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        clearError();
        await login(loginEmail, loginPassword);
    };

    const handleRegisterNext = () => {
        clearError();
        setLocalError('');
        if (!isStep1Valid) {
            setLocalError('Preencha nome (mín. 2 caracteres) e e-mail válido');
            return;
        }
        setRegisterStep(2);
    };

    const handleRegisterBack = () => {
        setRegisterStep(1);
        setLocalError('');
        clearError();
    };

    const handleRegisterSubmit = async (e) => {
        e.preventDefault();
        clearError();
        setLocalError('');

        if (registerPassword.length < 8) {
            setLocalError('A senha deve ter pelo menos 8 caracteres');
            return;
        }

        if (registerPassword !== registerConfirmPassword) {
            setLocalError('As senhas não coincidem');
            return;
        }

        if (!agreedToTerms) {
            setLocalError('Você precisa aceitar os Termos e a Política de Privacidade');
            return;
        }

        // Check for stored referral code
        const refCode = sessionStorage.getItem('referralCode');

        const result = await register(registerEmail, registerPassword, registerName, refCode);

        // Clear referral code after registration attempt
        if (refCode) {
            sessionStorage.removeItem('referralCode');
            console.log('[Auth] Referral code cleared after registration');
        }

        if (result.success && result.needsEmailConfirmation) {
            setRegisterStep(3);
        }
    };

    // Check for pending email confirmation on mount
    useEffect(() => {
        if (pendingEmailConfirmation) {
            setMode('register');
            setRegisterStep(3);
            setRegisterEmail(pendingEmailConfirmation.email || pendingEmailConfirmation);
        }
    }, [pendingEmailConfirmation]);

    // Polling for email confirmation
    useEffect(() => {
        if (registerStep === 3 && registerEmail && !emailConfirmed) {
            pollingRef.current = setInterval(async () => {
                const result = await checkEmailConfirmation(registerEmail);
                if (result.confirmed) {
                    clearInterval(pollingRef.current);
                    setEmailConfirmed(true);
                    
                    if (setPendingEmailConfirmation) {
                        setPendingEmailConfirmation(null);
                        localStorage.removeItem('pendingEmailConfirmation');
                    }
                    // No need for manual redirect; ProtectedRoute will show App since isAuthenticated is now true
                }
            }, 3000);

            return () => {
                if (pollingRef.current) {
                    clearInterval(pollingRef.current);
                }
            };
        }
    }, [registerStep, registerEmail, emailConfirmed, checkEmailConfirmation, setPendingEmailConfirmation]);

    // Resend email handler
    const handleResendEmail = useCallback(async () => {
        setResending(true);
        setResendSuccess(false);
        const success = await resendConfirmationEmail(registerEmail);
        setResending(false);
        if (success) {
            setResendSuccess(true);
            setTimeout(() => setResendSuccess(false), 3000);
        }
    }, [registerEmail, resendConfirmationEmail]);

    const switchToRegister = () => {
        clearError();
        setLocalError('');
        setMode('register');
        setRegisterStep(1);
    };

    const switchToLogin = () => {
        clearError();
        setLocalError('');
        setMode('login');
    };

    const switchToForgot = () => {
        clearError();
        setLocalError('');
        setForgotEmail(loginEmail || '');
        setForgotSuccess(false);
        setMode('forgot');
    };

    const handleForgotSubmit = async (e) => {
        e.preventDefault();
        clearError();
        setLocalError('');

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(forgotEmail.trim())) {
            setLocalError('Insira um e-mail válido');
            return;
        }

        setForgotLoading(true);
        const result = await forgotPassword(forgotEmail.trim());
        setForgotLoading(false);

        if (result.success) {
            setForgotSuccess(true);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center p-6 md:p-12 relative overflow-hidden" style={{ background: '#0f172a' }}>
            {/* Animated diagonal pattern background */}
            <div
                className="absolute pointer-events-none"
                style={{
                    top: '-100px',
                    left: '-100px',
                    right: '-100px',
                    bottom: '-100px',
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='199' viewBox='0 0 100 199'%3E%3Cg fill='white' fill-opacity='0.15'%3E%3Cpath d='M0 199V0h1v1.99L100 199h-1.12L1 4.22V199H0zM100 2h-.12l-1-2H100v2z'%3E%3C/path%3E%3C/g%3E%3C/svg%3E")`,
                    backgroundSize: '100px 199px',
                    backgroundRepeat: 'repeat',
                    animation: 'diagonalMove 40s linear infinite',
                    willChange: 'transform'
                }}
            />

            {/* Main Auth Card with animated height */}
            <div
                className="w-full max-w-[1200px] flex flex-col md:flex-row overflow-hidden relative z-10"
                style={{
                    background: '#1f2937',
                    borderRadius: '24px',
                    boxShadow: '0 25px 60px rgba(0, 0, 0, 0.2)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    minHeight: '650px',
                    transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
            >
                {/* Left Panel - Image Slider with Animated Bubbles */}
                <div className="hidden md:flex md:w-[48%] p-3">
                    {/* Inner slider card - visually detached */}
                    <div
                        className="w-full h-full relative overflow-hidden"
                        style={{ borderRadius: '16px' }}
                    >
                        {/* Image Slider */}
                        {slides.map((slide, index) => (
                            <div
                                key={index}
                                className="absolute inset-0 transition-opacity duration-700 ease-in-out"
                                style={{
                                    opacity: currentSlide === index ? 1 : 0,
                                    zIndex: currentSlide === index ? 1 : 0
                                }}
                            >
                                <img
                                    src={slide}
                                    alt={`Slide ${index + 1}`}
                                    className="w-full h-full object-cover"
                                    style={{ animation: currentSlide === index ? 'slideFadeIn 0.7s ease-out' : 'none' }}
                                    onError={(e) => {
                                        // Fallback gradient if image doesn't exist
                                        e.target.style.display = 'none';
                                        e.target.parentElement.style.background = 'linear-gradient(135deg, #1e293b 0%, #334155 100%)';
                                    }}
                                />
                            </div>
                        ))}



                        {/* Pagination Dots - Top Right */}
                        <div className="absolute top-4 right-4 z-20 flex gap-2">
                            {slides.map((_, index) => (
                                <button
                                    key={index}
                                    onClick={() => setCurrentSlide(index)}
                                    className="w-2.5 h-2.5 rounded-full transition-all duration-300"
                                    style={{
                                        background: currentSlide === index ? '#fff' : 'rgba(255,255,255,0.4)',
                                        transform: currentSlide === index ? 'scale(1.2)' : 'scale(1)',
                                        boxShadow: currentSlide === index ? '0 0 8px rgba(255,255,255,0.6)' : 'none'
                                    }}
                                />
                            ))}
                        </div>


                        {/* Decorative Blur Circles - light and subtle */}
                        <div className="absolute top-[-10%] left-[-10%] w-[35%] h-[35%] rounded-full bg-white/30 blur-3xl z-5 pointer-events-none"></div>
                        <div className="absolute bottom-[-10%] right-[-10%] w-[35%] h-[35%] rounded-full bg-white/25 blur-3xl z-5 pointer-events-none"></div>
                    </div>
                </div>

                {/* Right Panel - Form with animated content */}
                <div className="w-full md:w-[50%] flex flex-col items-center justify-center p-8 lg:p-10 bg-[#1f2937] relative">
                    <div
                        className="w-full max-w-[480px] overflow-hidden"
                        style={{
                            height: contentHeight,
                            transition: 'height 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                    >
                        <div ref={contentRef}>
                            {/* Logo */}
                            <div className="mb-12 flex justify-center">
                                <AnimatedLogo className="h-28" />
                            </div>

                            {/* Header Group - Left aligned */}
                            <div className="mb-8">
                                <h2
                                    className="text-4xl font-bold mb-1 tracking-tight"
                                    style={{ color: '#ffffff' }}
                                >
                                    {mode === 'login'
                                        ? 'Entrar'
                                        : mode === 'forgot'
                                            ? 'Esqueci a senha'
                                            : 'Criar conta'}
                                </h2>
                                <p className="text-base text-gray-400">
                                    {mode === 'login'
                                        ? 'Faça login para continuar'
                                        : mode === 'forgot'
                                            ? 'Informe seu e-mail para receber um link de redefinição'
                                            : registerStep === 1
                                                ? 'Etapa 1 de 3: Seus dados'
                                                : registerStep === 2
                                                    ? 'Etapa 2 de 3: Crie sua senha'
                                                    : 'Etapa 3 de 3: Confirme seu e-mail'
                                    }
                                </p>
                            </div>

                            {/* Step Indicator for Register */}
                            {mode === 'register' && (
                                <div className="flex gap-2 mb-8">
                                    <div
                                        className="h-1 flex-1 rounded-full transition-all duration-300"
                                        style={{ background: '#3b82f6' }}
                                    />
                                    <div
                                        className="h-1 flex-1 rounded-full transition-all duration-300"
                                        style={{ background: registerStep >= 2 ? '#3b82f6' : 'rgba(255,255,255,0.05)' }}
                                    />
                                    <div
                                        className="h-1 flex-1 rounded-full transition-all duration-300"
                                        style={{ background: registerStep >= 3 ? '#3b82f6' : 'rgba(255,255,255,0.05)' }}
                                    />
                                </div>
                            )}

                            {/* Error Message */}
                            {displayError && (
                                <div
                                    className="mb-6 p-4 rounded-xl flex items-center gap-3"
                                    style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#f87171' }}
                                >
                                    <span className="text-sm font-medium">{displayError}</span>
                                </div>
                            )}

                            {/* LOGIN FORM */}
                            {mode === 'login' && (
                                <form onSubmit={handleLoginSubmit} className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-semibold mb-2.5 text-gray-400">
                                            E-mail
                                        </label>
                                        <input
                                            type="email"
                                            value={loginEmail}
                                            onChange={(e) => setLoginEmail(e.target.value)}
                                            className="w-full px-5 py-4 rounded-xl text-base transition-all duration-200"
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
                                            placeholder="seu@email.com"
                                            required
                                        />
                                    </div>

                                    <div className="relative">
                                        <label className="block text-sm font-semibold mb-2.5 text-gray-400">
                                            Senha
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showLoginPassword ? "text" : "password"}
                                                value={loginPassword}
                                                onChange={(e) => setLoginPassword(e.target.value)}
                                                className="w-full px-5 py-4 pr-14 rounded-xl text-base transition-all duration-200"
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
                                                placeholder="Digite sua senha"
                                                required
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowLoginPassword(!showLoginPassword)}
                                                className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                            >
                                                {showLoginPassword ? (
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

                                    <div className="flex justify-end -mt-2">
                                        <button
                                            type="button"
                                            onClick={switchToForgot}
                                            className="text-sm font-semibold hover:underline"
                                            style={{ color: '#3b82f6' }}
                                        >
                                            Esqueci a senha
                                        </button>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full py-4 rounded-xl font-bold text-white text-base transition-all duration-200 mt-4 block hover:scale-[1.01] active:scale-[0.99]"
                                        style={{
                                            background: loading ? '#374151' : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                            boxShadow: loading ? 'none' : '0 8px 25px rgba(59, 130, 246, 0.25)'
                                        }}
                                    >
                                        {loading ? 'Entrando...' : 'Entrar'}
                                    </button>
                                </form>
                            )}

                            {/* FORGOT PASSWORD FORM */}
                            {mode === 'forgot' && (
                                forgotSuccess ? (
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
                                                        strokeWidth={2}
                                                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                                                    />
                                                </svg>
                                            </div>
                                        </div>

                                        <div>
                                            <h3 className="text-xl font-bold text-white mb-2">
                                                Verifique seu e-mail
                                            </h3>
                                            <p className="text-gray-400 text-sm">
                                                Se existir uma conta associada a
                                            </p>
                                            <p className="text-white font-semibold mt-1 break-all">
                                                {forgotEmail}
                                            </p>
                                            <p className="text-gray-400 text-sm mt-2">
                                                enviamos um link para redefinir sua senha.
                                            </p>
                                        </div>

                                        <p className="text-xs text-gray-400">
                                            Não recebeu? Verifique sua caixa de spam.
                                        </p>

                                        <button
                                            type="button"
                                            onClick={switchToLogin}
                                            className="w-full py-4 rounded-xl font-bold text-white text-base transition-all duration-200 mt-2 block hover:scale-[1.01] active:scale-[0.99]"
                                            style={{
                                                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                                boxShadow: '0 8px 25px rgba(59, 130, 246, 0.25)'
                                            }}
                                        >
                                            Voltar ao login
                                        </button>
                                    </div>
                                ) : (
                                    <form onSubmit={handleForgotSubmit} className="space-y-6">
                                        <div>
                                            <label className="block text-sm font-semibold mb-2.5 text-gray-400">
                                                E-mail
                                            </label>
                                            <input
                                                type="email"
                                                value={forgotEmail}
                                                onChange={(e) => setForgotEmail(e.target.value)}
                                                className="w-full px-5 py-4 rounded-xl text-base transition-all duration-200"
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
                                                placeholder="seu@email.com"
                                                required
                                                autoFocus
                                            />
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={forgotLoading}
                                            className="w-full py-4 rounded-xl font-bold text-white text-base transition-all duration-200 mt-4 block hover:scale-[1.01] active:scale-[0.99]"
                                            style={{
                                                background: forgotLoading ? '#374151' : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                                boxShadow: forgotLoading ? 'none' : '0 8px 25px rgba(59, 130, 246, 0.25)'
                                            }}
                                        >
                                            {forgotLoading ? 'Enviando...' : 'Enviar link de redefinição'}
                                        </button>
                                    </form>
                                )
                            )}

                            {/* REGISTER FORM - STEP 1 */}
                            {mode === 'register' && registerStep === 1 && (
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-semibold mb-2.5 text-gray-400">
                                            Nome*
                                        </label>
                                        <input
                                            type="text"
                                            value={registerName}
                                            onChange={(e) => setRegisterName(e.target.value)}
                                            className="w-full px-5 py-4 rounded-xl text-base transition-all duration-200"
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
                                            placeholder="Seu nome completo"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold mb-2.5 text-gray-400">
                                            E-mail*
                                        </label>
                                        <input
                                            type="email"
                                            value={registerEmail}
                                            onChange={(e) => setRegisterEmail(e.target.value)}
                                            className="w-full px-5 py-4 rounded-xl text-base transition-all duration-200"
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
                                            placeholder="seu@email.com"
                                        />
                                    </div>

                                    <button
                                        type="button"
                                        onClick={handleRegisterNext}
                                        className="w-full py-4 rounded-xl font-bold text-white text-base transition-all duration-300 mt-4 block hover:scale-[1.01] active:scale-[0.99]"
                                        style={{
                                            background: isStep1Valid ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : '#374151',
                                            boxShadow: isStep1Valid ? '0 8px 25px rgba(59, 130, 246, 0.25)' : 'none',
                                            cursor: isStep1Valid ? 'pointer' : 'default'
                                        }}
                                    >
                                        Continuar
                                    </button>
                                </div>
                            )}

                            {/* REGISTER FORM - STEP 2 */}
                            {mode === 'register' && registerStep === 2 && (
                                <form onSubmit={handleRegisterSubmit} className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-semibold mb-2.5 text-gray-400">
                                            Senha*
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showRegisterPassword ? "text" : "password"}
                                                value={registerPassword}
                                                onChange={(e) => setRegisterPassword(e.target.value)}
                                                className="w-full px-5 py-4 pr-14 rounded-xl text-base transition-all duration-200"
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
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                                                className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                            >
                                                {showRegisterPassword ? (
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
                                        {registerPassword && registerPassword.length < 8 && (
                                            <p className="text-xs text-red-500 mt-1.5 font-medium ml-1 flex items-center gap-1 animate-fade-in-up">
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                A senha precisa de no mínimo 8 caracteres
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold mb-2.5 text-gray-400">
                                            Confirmar Senha*
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="password"
                                                value={registerConfirmPassword}
                                                onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                                                className="w-full px-5 py-4 rounded-xl text-base transition-all duration-200"
                                                style={{
                                                    background: 'rgba(255, 255, 255, 0.03)',
                                                    border: registerConfirmPassword && registerPassword !== registerConfirmPassword ? '1px solid #f87171' : '1px solid rgba(255, 255, 255, 0.1)',
                                                    outline: 'none',
                                                    color: '#ffffff'
                                                }}
                                                onFocus={(e) => {
                                                    e.target.style.borderColor = '#3b82f6';
                                                    e.target.style.background = 'rgba(255, 255, 255, 0.05)';
                                                    e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                                                }}
                                                onBlur={(e) => {
                                                    e.target.style.borderColor = registerConfirmPassword && registerPassword !== registerConfirmPassword ? '#f87171' : 'rgba(255, 255, 255, 0.1)';
                                                    e.target.style.background = 'rgba(255, 255, 255, 0.03)';
                                                    e.target.style.boxShadow = 'none';
                                                }}
                                                placeholder="Digite novamente"
                                            />
                                        </div>
                                        {registerConfirmPassword && registerPassword !== registerConfirmPassword && (
                                            <p className="text-xs text-red-500 mt-1.5 font-medium ml-1 flex items-center gap-1 animate-fade-in-up">
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                As senhas não coincidem
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex items-start gap-3 py-2">
                                        <div className="flex items-center h-6">
                                            <input
                                                id="legal-terms"
                                                type="checkbox"
                                                checked={agreedToTerms}
                                                onChange={(e) => setAgreedToTerms(e.target.checked)}
                                                className="w-5 h-5 rounded border-white/10 text-blue-600 focus:ring-blue-500 cursor-pointer transition-all appearance-none border-2 checked:bg-blue-600 checked:border-blue-600 relative"
                                                style={{
                                                    accentColor: '#3b82f6',
                                                    backgroundImage: agreedToTerms ? `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='4' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='20 6 9 17 4 12'%3E%3C/polyline%3E%3C/svg%3E")` : 'none',
                                                    backgroundSize: '80% 80%',
                                                    backgroundPosition: 'center',
                                                    backgroundRepeat: 'no-repeat'
                                                }}
                                            />
                                        </div>
                                        <label htmlFor="legal-terms" className="text-sm text-gray-500 leading-tight cursor-pointer select-none">
                                            Eu concordo com os{' '}
                                            <button
                                                type="button"
                                                onClick={(e) => { e.preventDefault(); window.location.pathname = '/terms'; }}
                                                className="font-bold text-gray-300 hover:text-blue-500 transition-colors underline decoration-white/10 underline-offset-4"
                                            >
                                                Termos de Uso
                                            </button>
                                            {' '}e{' '}
                                            <button
                                                type="button"
                                                onClick={(e) => { e.preventDefault(); window.location.pathname = '/privacy'; }}
                                                className="font-bold text-gray-300 hover:text-blue-500 transition-colors underline decoration-white/10 underline-offset-4"
                                            >
                                                Política de Privacidade
                                            </button>
                                            {' '}do site.
                                        </label>
                                    </div>

                                    <div className="flex gap-3 mt-4">
                                        <button
                                            type="button"
                                            onClick={handleRegisterBack}
                                            className="px-6 py-4 rounded-xl font-bold text-base transition-all duration-200 hover:bg-white/10"
                                            style={{
                                                background: 'rgba(255, 255, 255, 0.05)',
                                                color: '#ffffff'
                                            }}
                                        >
                                            Voltar
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="flex-1 py-4 rounded-xl font-bold text-white text-base transition-all duration-300 block hover:scale-[1.01] active:scale-[0.99]"
                                            style={{
                                                background: loading ? '#374151' : (isStep2Valid ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : '#374151'),
                                                boxShadow: isStep2Valid && !loading ? '0 8px 25px rgba(59, 130, 246, 0.25)' : 'none',
                                                cursor: isStep2Valid ? 'pointer' : 'default'
                                            }}
                                        >
                                            {loading ? 'Criando...' : 'Criar conta'}
                                        </button>
                                    </div>
                                </form>
                            )}

                            {/* REGISTER FORM - STEP 3: EMAIL CONFIRMATION */}
                            {mode === 'register' && registerStep === 3 && (
                                <div className="text-center space-y-6 py-4">
                                    {!emailConfirmed ? (
                                        <>
                                            {/* Animated envelope icon */}
                                            <div className="flex justify-center">
                                                <div
                                                    className="w-24 h-24 rounded-full flex items-center justify-center"
                                                    style={{
                                                        background: 'rgba(59, 130, 246, 0.05)',
                                                        animation: 'pulse 2s ease-in-out infinite'
                                                    }}
                                                >
                                                    <svg
                                                        className="w-12 h-12"
                                                        style={{ color: '#3b82f6' }}
                                                        fill="none"
                                                        stroke="currentColor"
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth={1.5}
                                                            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                                                        />
                                                    </svg>
                                                </div>
                                            </div>

                                            <div>
                                                <h3 className="text-xl font-bold text-white mb-2">
                                                    Verifique seu e-mail
                                                </h3>
                                                <p className="text-gray-400 text-sm">
                                                    Enviamos um link de confirmação para:
                                                </p>
                                                <p className="text-white font-semibold mt-1">
                                                    {registerEmail}
                                                </p>
                                            </div>

                                            {/* Loading spinner */}
                                            <div className="flex items-center justify-center gap-3 py-4">
                                                <div
                                                    className="w-5 h-5 border-2 border-white/5 border-t-blue-500 rounded-full"
                                                    style={{ animation: 'spin 1s linear infinite' }}
                                                />
                                                <span className="text-sm text-gray-400">Aguardando confirmação...</span>
                                            </div>

                                            {/* Resend button */}
                                            <div className="pt-4">
                                                <button
                                                    type="button"
                                                    onClick={handleResendEmail}
                                                    disabled={resending}
                                                    className="text-sm font-medium transition-all duration-200 hover:underline"
                                                    style={{ color: resending ? '#6B7280' : '#3b82f6' }}
                                                >
                                                    {resending ? 'Reenviando...' : 'Reenviar e-mail'}
                                                </button>
                                                {resendSuccess && (
                                                    <p className="text-green-600 text-xs mt-2 animate-fade-in-up">
                                                        ✓ E-mail reenviado com sucesso!
                                                    </p>
                                                )}
                                            </div>

                                            <p className="text-xs text-gray-400 pt-4">
                                                Não recebeu? Verifique sua caixa de spam.
                                            </p>
                                        </>
                                    ) : (
                                        /* Success state */
                                        <div className="animate-fade-in-up">
                                            <div className="flex justify-center mb-6">
                                                <div
                                                    className="w-24 h-24 rounded-full flex items-center justify-center"
                                                    style={{
                                                        background: 'linear-gradient(135deg, #D1FAE5 0%, #A7F3D0 100%)',
                                                        animation: 'scaleIn 0.5s ease-out'
                                                    }}
                                                >
                                                    <svg
                                                        className="w-12 h-12 text-green-600"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        viewBox="0 0 24 24"
                                                        style={{ animation: 'checkmark 0.5s ease-out 0.2s both' }}
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

                                            <h3 className="text-xl font-bold text-white mb-2">
                                                E-mail confirmado! 🎉
                                            </h3>
                                            <p className="text-gray-400 text-sm">
                                                Redirecionando para a plataforma...
                                            </p>

                                            {/* Loading bar */}
                                            <div className="mt-6 h-1 bg-white/5 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full rounded-full"
                                                    style={{
                                                        background: '#10B981',
                                                        animation: 'loadingBar 2s ease-out forwards'
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Footer Section */}
                            <div className="mt-12 space-y-8">
                                <p className="text-center text-base text-gray-400">
                                    {mode === 'login' ? (
                                        <>
                                            Não tem uma conta?{' '}
                                            <button
                                                type="button"
                                                onClick={switchToRegister}
                                                className="font-bold hover:underline"
                                                style={{ color: '#3b82f6' }}
                                            >
                                                Criar conta
                                            </button>
                                        </>
                                    ) : mode === 'forgot' ? (
                                        <>
                                            Lembrou sua senha?{' '}
                                            <button
                                                type="button"
                                                onClick={switchToLogin}
                                                className="font-bold hover:underline"
                                                style={{ color: '#3b82f6' }}
                                            >
                                                Voltar ao login
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            Já tem uma conta?{' '}
                                            <button
                                                type="button"
                                                onClick={switchToLogin}
                                                className="font-bold hover:underline"
                                                style={{ color: '#3b82f6' }}
                                            >
                                                Fazer login
                                            </button>
                                        </>
                                    )}
                                </p>

                                <div className="flex justify-center gap-8 pt-6 border-t border-white/5">
                                    <button
                                        onClick={() => window.location.pathname = '/terms'}
                                        className="text-sm text-gray-400 hover:text-[#3b82f6] transition-colors"
                                    >
                                        Termos de Uso
                                    </button>
                                    <button
                                        onClick={() => window.location.pathname = '/privacy'}
                                        className="text-sm text-gray-400 hover:text-[#3b82f6] transition-colors"
                                    >
                                        Política de Privacidade
                                    </button>
                                    <button
                                        onClick={() => window.open('https://t.me/evosociety_suporte', '_blank')}
                                        className="text-sm text-gray-400 hover:text-[#3b82f6] transition-colors"
                                    >
                                        Suporte
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AuthCard;
