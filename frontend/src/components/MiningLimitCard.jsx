import { useState, useEffect } from 'react';

/**
 * MiningLimitCard - Exibe limite de minerações e mensagens de feedback
 * 
 * Props:
 * - used: número de minerações já utilizadas
 * - limit: limite total de minerações (número ou 'unlimited')
 * - tier: nome do tier do usuário
 * - onLimitReached: callback quando limite é atingido (para reset)
 * - showLimitError: indica se deve mostrar erro de limite
 */
function MiningLimitCard({ credits = 0, maxCredits, tier = 'guest', showLimitError = false, onDismissError }) {
    const [isError, setIsError] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);

    // Quando showLimitError mudar para true, ativa estado de erro
    useEffect(() => {
        if (showLimitError) {
            setIsError(true);
            setIsAnimating(true);

            // Volta ao normal após 5 segundos
            const timer = setTimeout(() => {
                setIsError(false);
                setIsAnimating(false);
                if (onDismissError) onDismissError();
            }, 5000);

            return () => clearTimeout(timer);
        }
    }, [showLimitError, onDismissError]);

    const isOutOfCredits = credits <= 0;
    const percentage = maxCredits ? Math.min(100, (credits / maxCredits) * 100) : 0;
    const isLowCredits = maxCredits ? credits <= (maxCredits * 0.2) : false; // 20% ou menos

    // Tier display info
    const tierInfo = {
        guest: { name: 'Visitante', icon: '👤', color: '#6B7280' },
        bronze: { name: 'Bronze', icon: '⬡', color: '#CD7F32' },
        silver: { name: 'Prata', icon: '◆', color: '#9CA3AF' },
        gold: { name: 'Ouro', icon: '★', color: '#F59E0B' }
    };

    const currentTier = tierInfo[tier] || tierInfo.guest;

    return (
        <div
            className={`
                mb-4 p-4 rounded-2xl transition-all duration-500 ease-out
                ${isError ? 'mining-limit-card-error' : ''}
                ${isAnimating ? 'mining-limit-card-shake' : ''}
            `}
            style={{
                background: isError
                    ? 'linear-gradient(135deg, #FEE2E2 0%, #FECACA 100%)'
                    : 'white',
                border: isError
                    ? '2px solid #F87171'
                    : '1px solid var(--color-cream-200)',
                boxShadow: isError
                    ? '0 4px 20px rgba(239, 68, 68, 0.2)'
                    : 'var(--shadow-soft)',
            }}
        >
            {/* Content */}
            {isError ? (
                /* Error State */
                <div className="mining-limit-error-content">
                    <div className="flex items-start gap-3">
                        <span
                            className={`text-2xl ${isAnimating ? 'mining-limit-icon-spin' : ''}`}
                        >
                            ⚠️
                        </span>
                        <div className="flex-1">
                            <p className="font-bold text-red-600 mb-1">
                                Créditos esgotados!
                            </p>
                            <p className="text-sm text-red-500">
                                Você não possui mais créditos de mineração para este período. Faça upgrade na sua conta para receber mais créditos mensalmente!
                            </p>
                        </div>
                    </div>

                    {/* Upgrade Button */}
                    <button
                        className="mt-3 w-full py-2 px-4 rounded-xl font-semibold text-sm transition-all duration-200 hover:scale-[1.02]"
                        style={{
                            background: 'linear-gradient(135deg, #FF6B35 0%, #F59E0B 100%)',
                            color: 'white',
                            boxShadow: '0 4px 15px rgba(255, 107, 53, 0.3)'
                        }}
                    >
                        ✨ Fazer Upgrade
                    </button>
                </div>
            ) : (
                /* Normal State */
                <div className="flex items-center justify-between">
                    {/* Left: Tier + Stats */}
                    <div className="flex items-center gap-3">
                        <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                            style={{
                                background: `${currentTier.color}15`,
                            }}
                        >
                            {currentTier.icon}
                        </div>
                        <div>
                            <p className="font-semibold text-sm" style={{ color: currentTier.color }}>
                                {currentTier.name}
                            </p>
                            <p className="text-xs" style={{ color: '#9CA3AF' }}>
                                Seu plano atual
                            </p>
                        </div>
                    </div>

                    {/* Right: Usage Stats */}
                    <div className="text-right">
                        <div className="flex items-baseline gap-1 justify-end">
                            <span
                                className="text-2xl font-bold"
                                style={{
                                    color: isOutOfCredits ? '#EF4444' : 'var(--color-orange-500)'
                                }}
                            >
                                {credits}
                            </span>
                            <span className="text-sm" style={{ color: '#9CA3AF' }}>
                                / {maxCredits}
                            </span>
                        </div>
                        <p className="text-xs" style={{ color: '#9CA3AF' }}>
                            créditos
                        </p>
                    </div>
                </div>
            )}

            {/* Progress Bar (only in normal state) */}
            {!isError && (
                <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ background: '#E5E7EB' }}>
                    <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                            width: `${percentage}%`,
                            background: isLowCredits
                                ? 'linear-gradient(90deg, #EF4444 0%, #F59E0B 100%)'
                                : 'linear-gradient(90deg, var(--color-orange-400) 0%, var(--color-orange-500) 100%)'
                        }}
                    />
                </div>
            )}
        </div>
    );
}

export default MiningLimitCard;
