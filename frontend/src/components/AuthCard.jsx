import { useState, useMemo, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

/**
 * AuthCard - Unified authentication card with smooth transitions between Login and Register
 */
function AuthCard() {
    const { login, register, error, loading, clearError } = useAuth();

    // Mode: 'login' or 'register'
    const [mode, setMode] = useState('login');

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
    const [localError, setLocalError] = useState('');

    // Content height animation
    const contentRef = useRef(null);
    const [contentHeight, setContentHeight] = useState('auto');

    // Measure content height when mode or step changes
    useEffect(() => {
        if (contentRef.current) {
            const height = contentRef.current.scrollHeight;
            setContentHeight(`${height}px`);
        }
    }, [mode, registerStep, error, localError]);

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
        return registerPassword.length >= 6 && registerPassword === registerConfirmPassword;
    }, [registerPassword, registerConfirmPassword]);

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
        if (!isStep2Valid) {
            if (registerPassword.length < 6) {
                setLocalError('A senha deve ter pelo menos 6 caracteres');
            } else {
                setLocalError('As senhas não coincidem');
            }
            return;
        }
        await register(registerEmail, registerPassword, registerName);
    };

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

    return (
        <div className="min-h-screen w-full flex items-center justify-center p-6 md:p-12 relative overflow-hidden" style={{ background: 'var(--color-cream-50)' }}>
            {/* Animated diagonal pattern background */}
            <div
                className="absolute pointer-events-none"
                style={{
                    top: '-100px',
                    left: '-100px',
                    right: '-100px',
                    bottom: '-100px',
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='199' viewBox='0 0 100 199'%3E%3Cg fill='%23ff6b35' fill-opacity='0.1'%3E%3Cpath d='M0 199V0h1v1.99L100 199h-1.12L1 4.22V199H0zM100 2h-.12l-1-2H100v2z'%3E%3C/path%3E%3C/g%3E%3C/svg%3E")`,
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
                    background: 'white',
                    borderRadius: '24px',
                    boxShadow: '0 25px 60px rgba(0, 0, 0, 0.08)',
                    border: '1px solid rgba(0,0,0,0.05)',
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
                                        e.target.parentElement.style.background = 'linear-gradient(135deg, #ff8a5b 0%, #ffd2c2 100%)';
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
                <div className="w-full md:w-[50%] flex flex-col items-center justify-center p-8 lg:p-10 bg-white relative">
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
                                <img src="/logo.svg" alt="Huofind" className="h-28" />
                            </div>

                            {/* Header Group - Left aligned */}
                            <div className="mb-8">
                                <h2
                                    className="text-4xl font-bold mb-1 tracking-tight"
                                    style={{ color: '#111827' }}
                                >
                                    {mode === 'login' ? 'Entrar' : 'Criar conta'}
                                </h2>
                                <p className="text-base text-[#6B7280]">
                                    {mode === 'login'
                                        ? 'Faça login para continuar'
                                        : registerStep === 1
                                            ? 'Etapa 1 de 2: Seus dados'
                                            : 'Etapa 2 de 2: Crie sua senha'
                                    }
                                </p>
                            </div>

                            {/* Step Indicator for Register */}
                            {mode === 'register' && (
                                <div className="flex gap-2 mb-8">
                                    <div
                                        className="h-1 flex-1 rounded-full transition-all duration-300"
                                        style={{ background: '#ff6b35' }}
                                    />
                                    <div
                                        className="h-1 flex-1 rounded-full transition-all duration-300"
                                        style={{ background: registerStep === 2 ? '#ff6b35' : '#E5E7EB' }}
                                    />
                                </div>
                            )}

                            {/* Error Message */}
                            {displayError && (
                                <div
                                    className="mb-6 p-4 rounded-xl flex items-center gap-3"
                                    style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626' }}
                                >
                                    <span className="text-sm font-medium">{displayError}</span>
                                </div>
                            )}

                            {/* LOGIN FORM */}
                            {mode === 'login' && (
                                <form onSubmit={handleLoginSubmit} className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-semibold mb-2.5" style={{ color: '#374151' }}>
                                            E-mail
                                        </label>
                                        <input
                                            type="email"
                                            value={loginEmail}
                                            onChange={(e) => setLoginEmail(e.target.value)}
                                            className="w-full px-5 py-4 rounded-xl text-base transition-all duration-200"
                                            style={{
                                                background: '#F9FAFB',
                                                border: '1px solid #E5E7EB',
                                                outline: 'none',
                                                color: '#111827'
                                            }}
                                            onFocus={(e) => {
                                                e.target.style.borderColor = '#ff6b35';
                                                e.target.style.background = 'white';
                                                e.target.style.boxShadow = '0 0 0 3px rgba(255, 107, 53, 0.08)';
                                            }}
                                            onBlur={(e) => {
                                                e.target.style.borderColor = '#E5E7EB';
                                                e.target.style.background = '#F9FAFB';
                                                e.target.style.boxShadow = 'none';
                                            }}
                                            placeholder="seu@email.com"
                                            required
                                        />
                                    </div>

                                    <div className="relative">
                                        <label className="block text-sm font-semibold mb-2.5" style={{ color: '#374151' }}>
                                            Senha
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showLoginPassword ? "text" : "password"}
                                                value={loginPassword}
                                                onChange={(e) => setLoginPassword(e.target.value)}
                                                className="w-full px-5 py-4 pr-14 rounded-xl text-base transition-all duration-200"
                                                style={{
                                                    background: '#F9FAFB',
                                                    border: '1px solid #E5E7EB',
                                                    outline: 'none',
                                                    color: '#111827'
                                                }}
                                                onFocus={(e) => {
                                                    e.target.style.borderColor = '#ff6b35';
                                                    e.target.style.background = 'white';
                                                    e.target.style.boxShadow = '0 0 0 3px rgba(255, 107, 53, 0.08)';
                                                }}
                                                onBlur={(e) => {
                                                    e.target.style.borderColor = '#E5E7EB';
                                                    e.target.style.background = '#F9FAFB';
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

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full py-4 rounded-xl font-bold text-white text-base transition-all duration-200 mt-4 block hover:scale-[1.01] active:scale-[0.99]"
                                        style={{
                                            background: loading ? '#9CA3AF' : '#ff6b35',
                                            boxShadow: loading ? 'none' : '0 8px 25px rgba(255, 107, 53, 0.25)'
                                        }}
                                    >
                                        {loading ? 'Entrando...' : 'Entrar'}
                                    </button>
                                </form>
                            )}

                            {/* REGISTER FORM - STEP 1 */}
                            {mode === 'register' && registerStep === 1 && (
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-semibold mb-2.5" style={{ color: '#374151' }}>
                                            Nome
                                        </label>
                                        <input
                                            type="text"
                                            value={registerName}
                                            onChange={(e) => setRegisterName(e.target.value)}
                                            className="w-full px-5 py-4 rounded-xl text-base transition-all duration-200"
                                            style={{
                                                background: '#F9FAFB',
                                                border: '1px solid #E5E7EB',
                                                outline: 'none',
                                                color: '#111827'
                                            }}
                                            onFocus={(e) => {
                                                e.target.style.borderColor = '#ff6b35';
                                                e.target.style.background = 'white';
                                                e.target.style.boxShadow = '0 0 0 3px rgba(255, 107, 53, 0.08)';
                                            }}
                                            onBlur={(e) => {
                                                e.target.style.borderColor = '#E5E7EB';
                                                e.target.style.background = '#F9FAFB';
                                                e.target.style.boxShadow = 'none';
                                            }}
                                            placeholder="Seu nome completo"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold mb-2.5" style={{ color: '#374151' }}>
                                            E-mail
                                        </label>
                                        <input
                                            type="email"
                                            value={registerEmail}
                                            onChange={(e) => setRegisterEmail(e.target.value)}
                                            className="w-full px-5 py-4 rounded-xl text-base transition-all duration-200"
                                            style={{
                                                background: '#F9FAFB',
                                                border: '1px solid #E5E7EB',
                                                outline: 'none',
                                                color: '#111827'
                                            }}
                                            onFocus={(e) => {
                                                e.target.style.borderColor = '#ff6b35';
                                                e.target.style.background = 'white';
                                                e.target.style.boxShadow = '0 0 0 3px rgba(255, 107, 53, 0.08)';
                                            }}
                                            onBlur={(e) => {
                                                e.target.style.borderColor = '#E5E7EB';
                                                e.target.style.background = '#F9FAFB';
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
                                            background: isStep1Valid ? '#ff6b35' : '#9CA3AF',
                                            boxShadow: isStep1Valid ? '0 8px 25px rgba(255, 107, 53, 0.25)' : 'none',
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
                                        <label className="block text-sm font-semibold mb-2.5" style={{ color: '#374151' }}>
                                            Senha
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showRegisterPassword ? "text" : "password"}
                                                value={registerPassword}
                                                onChange={(e) => setRegisterPassword(e.target.value)}
                                                className="w-full px-5 py-4 pr-14 rounded-xl text-base transition-all duration-200"
                                                style={{
                                                    background: '#F9FAFB',
                                                    border: '1px solid #E5E7EB',
                                                    outline: 'none',
                                                    color: '#111827'
                                                }}
                                                onFocus={(e) => {
                                                    e.target.style.borderColor = '#ff6b35';
                                                    e.target.style.background = 'white';
                                                    e.target.style.boxShadow = '0 0 0 3px rgba(255, 107, 53, 0.08)';
                                                }}
                                                onBlur={(e) => {
                                                    e.target.style.borderColor = '#E5E7EB';
                                                    e.target.style.background = '#F9FAFB';
                                                    e.target.style.boxShadow = 'none';
                                                }}
                                                placeholder="Mínimo 6 caracteres"
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
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold mb-2.5" style={{ color: '#374151' }}>
                                            Confirmar Senha
                                        </label>
                                        <input
                                            type="password"
                                            value={registerConfirmPassword}
                                            onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                                            className="w-full px-5 py-4 rounded-xl text-base transition-all duration-200"
                                            style={{
                                                background: '#F9FAFB',
                                                border: '1px solid #E5E7EB',
                                                outline: 'none',
                                                color: '#111827'
                                            }}
                                            onFocus={(e) => {
                                                e.target.style.borderColor = '#ff6b35';
                                                e.target.style.background = 'white';
                                                e.target.style.boxShadow = '0 0 0 3px rgba(255, 107, 53, 0.08)';
                                            }}
                                            onBlur={(e) => {
                                                e.target.style.borderColor = '#E5E7EB';
                                                e.target.style.background = '#F9FAFB';
                                                e.target.style.boxShadow = 'none';
                                            }}
                                            placeholder="Digite novamente"
                                        />
                                    </div>

                                    <div className="flex gap-3 mt-4">
                                        <button
                                            type="button"
                                            onClick={handleRegisterBack}
                                            className="px-6 py-4 rounded-xl font-bold text-base transition-all duration-200 hover:bg-gray-100"
                                            style={{
                                                background: '#F3F4F6',
                                                color: '#374151'
                                            }}
                                        >
                                            Voltar
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="flex-1 py-4 rounded-xl font-bold text-white text-base transition-all duration-300 block hover:scale-[1.01] active:scale-[0.99]"
                                            style={{
                                                background: loading ? '#9CA3AF' : (isStep2Valid ? '#ff6b35' : '#9CA3AF'),
                                                boxShadow: isStep2Valid && !loading ? '0 8px 25px rgba(255, 107, 53, 0.25)' : 'none',
                                                cursor: isStep2Valid ? 'pointer' : 'default'
                                            }}
                                        >
                                            {loading ? 'Criando...' : 'Criar conta'}
                                        </button>
                                    </div>
                                </form>
                            )}

                            {/* Footer Section */}
                            <div className="mt-12 space-y-8">
                                <p className="text-center text-base" style={{ color: '#6B7280' }}>
                                    {mode === 'login' ? (
                                        <>
                                            Não tem uma conta?{' '}
                                            <button
                                                type="button"
                                                onClick={switchToRegister}
                                                className="font-bold hover:underline"
                                                style={{ color: '#ff6b35' }}
                                            >
                                                Criar conta
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            Já tem uma conta?{' '}
                                            <button
                                                type="button"
                                                onClick={switchToLogin}
                                                className="font-bold hover:underline"
                                                style={{ color: '#ff6b35' }}
                                            >
                                                Fazer login
                                            </button>
                                        </>
                                    )}
                                </p>

                                <div className="flex justify-center gap-8 pt-6 border-t border-gray-100">
                                    <button className="text-sm text-gray-400 hover:text-[#ff6b35] transition-colors">Política de Privacidade</button>
                                    <button className="text-sm text-gray-400 hover:text-[#ff6b35] transition-colors">Termos</button>
                                    <button className="text-sm text-gray-400 hover:text-[#ff6b35] transition-colors">Suporte</button>
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
