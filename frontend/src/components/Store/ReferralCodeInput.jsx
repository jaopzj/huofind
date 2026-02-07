import { useState, useEffect } from 'react';
import { FiPercent, FiCheck, FiX, FiLoader, FiLock, FiGift } from 'react-icons/fi';

/**
 * ReferralCodeInput - Component for applying referral codes on Store page
 */
function ReferralCodeInput({ onCodeApplied, refCodeLocked, storedRefCode }) {
    const [code, setCode] = useState('');
    const [status, setStatus] = useState('idle'); // idle, validating, valid, invalid, applied
    const [error, setError] = useState(null);
    const [referrerName, setReferrerName] = useState(null);
    const [discountPercent, setDiscountPercent] = useState(15);

    const token = localStorage.getItem('accessToken');

    // Initialize with stored code if exists
    useEffect(() => {
        if (storedRefCode) {
            setCode(storedRefCode);
            setStatus('applied');
        }
    }, [storedRefCode]);

    const handleValidate = async () => {
        if (!code || code.length !== 7) {
            setError('Código deve ter 7 caracteres');
            setStatus('invalid');
            return;
        }

        setStatus('validating');
        setError(null);

        try {
            const res = await fetch('/api/referral/validate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ code: code.toUpperCase() })
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Código inválido');
                setStatus('invalid');
                return;
            }

            setReferrerName(data.referrerName);
            setDiscountPercent(data.discountPercent || 15);
            setStatus('valid');
        } catch (err) {
            console.error('[ReferralCodeInput] Validate error:', err);
            setError('Erro ao validar código');
            setStatus('invalid');
        }
    };

    const handleApply = async () => {
        setStatus('validating');
        setError(null);

        try {
            const res = await fetch('/api/referral/store', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ code: code.toUpperCase() })
            });

            const data = await res.json();

            if (!res.ok) {
                if (data.locked) {
                    setStatus('applied');
                    setError('Você já possui um código aplicado');
                } else {
                    setError(data.error || 'Erro ao aplicar código');
                    setStatus('invalid');
                }
                return;
            }

            setStatus('applied');
            setReferrerName(data.referrerName);
            if (onCodeApplied) {
                onCodeApplied(code.toUpperCase(), discountPercent);
            }
        } catch (err) {
            console.error('[ReferralCodeInput] Apply error:', err);
            setError('Erro ao aplicar código');
            setStatus('invalid');
        }
    };

    const handleInputChange = (e) => {
        const value = e.target.value.toUpperCase().slice(0, 7);
        setCode(value);
        if (status === 'invalid') {
            setStatus('idle');
            setError(null);
        }
    };

    // If code is already locked/applied, show read-only state
    if (refCodeLocked || status === 'applied') {
        return (
            <div className="bg-green-500/5 rounded-xl p-4 border border-green-500/20">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                        <FiCheck className="w-5 h-5 text-green-400" />
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-green-400">Código aplicado</span>
                            <FiLock className="w-3 h-3 text-green-400/50" />
                        </div>
                        <p className="text-xs text-gray-400">
                            {storedRefCode || code} {referrerName ? `(via ${referrerName})` : ''}
                        </p>
                    </div>
                    <div className="text-right">
                        <span className="text-lg font-bold text-green-400">-{discountPercent}%</span>
                        <p className="text-xs text-green-400/70">+ 10 créditos</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <FiGift className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                    <p className="text-sm font-semibold text-white">Código de indicação</p>
                    <p className="text-xs text-gray-400">Ganhe 15% de desconto + 10 créditos</p>
                </div>
            </div>

            <div className="flex gap-2">
                <div className="relative flex-1">
                    <input
                        type="text"
                        value={code}
                        onChange={handleInputChange}
                        placeholder="ABC1234"
                        maxLength={7}
                        className="w-full px-4 py-3 rounded-lg text-sm font-mono uppercase tracking-widest transition-all duration-200"
                        style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: status === 'invalid' ? '1px solid #f87171' : status === 'valid' ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.1)',
                            color: '#fff',
                            outline: 'none'
                        }}
                        onFocus={(e) => {
                            if (status !== 'invalid' && status !== 'valid') {
                                e.target.style.borderColor = '#3b82f6';
                            }
                        }}
                        onBlur={(e) => {
                            if (status !== 'invalid' && status !== 'valid') {
                                e.target.style.borderColor = 'rgba(255,255,255,0.1)';
                            }
                        }}
                    />
                    {status === 'valid' && (
                        <FiCheck className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-400" />
                    )}
                    {status === 'invalid' && (
                        <FiX className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-400" />
                    )}
                </div>

                {status === 'idle' || status === 'invalid' ? (
                    <button
                        onClick={handleValidate}
                        disabled={code.length < 7}
                        className="px-4 py-3 rounded-lg font-semibold text-sm transition-all duration-200"
                        style={{
                            background: code.length === 7 ? '#3b82f6' : '#374151',
                            color: '#fff',
                            opacity: code.length === 7 ? 1 : 0.5,
                            cursor: code.length === 7 ? 'pointer' : 'not-allowed'
                        }}
                    >
                        Validar
                    </button>
                ) : status === 'validating' ? (
                    <button
                        disabled
                        className="px-4 py-3 rounded-lg font-semibold text-sm"
                        style={{ background: '#374151', color: '#fff' }}
                    >
                        <FiLoader className="w-4 h-4 animate-spin" />
                    </button>
                ) : status === 'valid' ? (
                    <button
                        onClick={handleApply}
                        className="px-4 py-3 rounded-lg font-semibold text-sm transition-all duration-200"
                        style={{
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            color: '#fff'
                        }}
                    >
                        Aplicar
                    </button>
                ) : null}
            </div>

            {error && (
                <p className="text-xs text-red-400 mt-2">{error}</p>
            )}

            {status === 'valid' && referrerName && (
                <p className="text-xs text-green-400 mt-2">
                    ✓ Código válido de <strong>{referrerName}</strong> - Clique em "Aplicar" para garantir seu desconto!
                </p>
            )}
        </div>
    );
}

export default ReferralCodeInput;
