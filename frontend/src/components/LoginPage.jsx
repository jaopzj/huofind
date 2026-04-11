import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

/**
 * LoginPage - Card centralizado com elementos maiores e alinhados
 */
function LoginPage({ onSwitchToRegister }) {
    const { login, error, loading, clearError } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        clearError();
        await login(email, password);
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center p-6 md:p-12" style={{ background: '#F3F4F6' }}>
            <div className="grid-pattern-container opacity-50">
                <div className="grid-pattern" />
            </div>

            {/* Main Auth Card */}
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
                {/* Left Panel - Decorative Hero */}
                <div
                    className="hidden md:flex md:w-[45%] flex-col justify-center items-start p-10 lg:p-14 relative overflow-hidden"
                    style={{
                        background: 'linear-gradient(135deg, #ff8a5b 0%, #ffd2c2 100%)',
                        borderRadius: '24px 0 0 24px'
                    }}
                >
                    <div className="absolute inset-0 z-0 opacity-30 mix-blend-overlay">
                        <img
                            src="/huofind_login_hero_mockup.png"
                            alt="Evo Society Hero"
                            className="w-full h-full object-cover"
                            onError={(e) => e.target.style.display = 'none'}
                        />
                    </div>

                    <div className="relative z-10 w-full max-w-md">
                        <h1
                            className="text-3xl lg:text-4xl font-bold leading-tight mb-5"
                            style={{ color: '#ff6b35' }}
                        >
                            Evo Society
                        </h1>
                        <p
                            className="text-base lg:text-lg font-medium mb-10 leading-relaxed"
                            style={{ color: '#111827', opacity: 0.85 }}
                        >
                            Encontre os melhores produtos do Xianyu com mineração avançada e validação de vendedores.
                        </p>

                        {/* Abstract Floating Cards */}
                        <div className="space-y-4">
                            <div
                                className="p-5 rounded-2xl backdrop-blur-md bg-white/35 border border-white/30 shadow-lg"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-white/50 flex items-center justify-center text-xl">📊</div>
                                    <div className="space-y-2">
                                        <div className="h-2 w-28 bg-white/50 rounded-full"></div>
                                        <div className="h-2 w-20 bg-white/30 rounded-full"></div>
                                    </div>
                                </div>
                            </div>
                            <div
                                className="p-5 rounded-2xl backdrop-blur-md bg-white/35 border border-white/30 shadow-lg ml-6"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-[#ff6b35]/30 flex items-center justify-center text-xl">✨</div>
                                    <div className="space-y-2">
                                        <div className="h-2 w-24 bg-[#ff6b35]/40 rounded-full"></div>
                                        <div className="h-2 w-32 bg-white/30 rounded-full"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="absolute top-[-15%] left-[-15%] w-[50%] h-[50%] rounded-full bg-white/15 blur-3xl"></div>
                    <div className="absolute bottom-[-15%] right-[-15%] w-[50%] h-[50%] rounded-full bg-[#ff6b35]/15 blur-3xl"></div>
                </div>

                {/* Right Panel - Login Form (elementos maiores) */}
                <div className="w-full md:w-[55%] flex flex-col items-center justify-center p-10 lg:p-16 bg-white relative">
                    <div className="w-full max-w-[420px]">
                        {/* Logo - Maior e centralizada */}
                        <div className="mb-10 flex justify-center">
                            <img src="/logo.svg" alt="Evo Society" className="h-20" />
                        </div>

                        {/* Header Group - Textos maiores e alinhados à esquerda */}
                        <div className="mb-10 text-left">
                            <h2 className="text-4xl font-bold mb-2 tracking-tight" style={{ color: '#111827' }}>
                                Entrar
                            </h2>
                            <p className="text-base text-[#6B7280]">
                                Faça login para continuar
                            </p>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div
                                className="mb-6 p-4 rounded-xl flex items-center gap-3"
                                style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626' }}
                            >
                                <span className="text-sm font-medium">{error}</span>
                            </div>
                        )}

                        {/* Form - Elementos maiores */}
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="block text-sm font-semibold mb-2.5" style={{ color: '#374151' }}>
                                    E-mail
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
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
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
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
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
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

                        {/* Footer Section */}
                        <div className="mt-12 space-y-8">
                            <p className="text-center text-base" style={{ color: '#6B7280' }}>
                                Não tem uma conta?{' '}
                                <button
                                    type="button"
                                    onClick={onSwitchToRegister}
                                    className="font-bold hover:underline"
                                    style={{ color: '#ff6b35' }}
                                >
                                    Criar conta
                                </button>
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
    );
}

export default LoginPage;
