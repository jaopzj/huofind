import { motion } from 'framer-motion';
import { LuCheck, LuCrown, LuSparkles, LuShield, LuRocket } from 'react-icons/lu';

// Plan configurations
const PLAN_CONFIG = {
    bronze: {
        name: 'Explorador',
        iconUrl: 'https://i.imgur.com/J790Vgc.png',
        color: '#cd7f32',
        bgGradient: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)',
        benefits: [
            'Acesso completo à Yupoo',
            '50 créditos mensais',
            'Salvar produtos favoritos',
            'Suporte por email'
        ]
    },
    silver: {
        name: 'Escavador',
        iconUrl: 'https://i.imgur.com/ibHs66L.png',
        color: '#C0C0C0',
        bgGradient: 'linear-gradient(135deg, #F3F4F6 0%, #E5E7EB 100%)',
        benefits: [
            'Tudo do Explorador',
            '150 créditos mensais',
            'Filtros avançados',
            'Suporte prioritário'
        ]
    },
    gold: {
        name: 'Minerador',
        iconUrl: 'https://i.imgur.com/UFgpPC1.png',
        color: '#FFD700',
        bgGradient: 'linear-gradient(135deg, #FEF3C7 0%, #FCD34D 100%)',
        benefits: [
            'Tudo do Escavador',
            '300 créditos mensais',
            'Acesso antecipado a novidades',
            'Suporte VIP dedicado'
        ]
    }
};

/**
 * SubscriptionPlanCard - Subscription plan card with benefits list
 */
function SubscriptionPlanCard({
    planId, // 'bronze' | 'silver' | 'gold'
    credits,
    price,
    isCurrentPlan = false,
    isPopular = false,
    isBest = false,
    onSubscribe,
    isLoading = false,
    delay = 0
}) {
    const plan = PLAN_CONFIG[planId] || PLAN_CONFIG.bronze;

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay }}
            whileHover={{ y: -6, transition: { duration: 0.2 } }}
            className={`relative bg-[#1f2937] rounded-3xl overflow-hidden border-2 transition-all duration-300 ${isCurrentPlan
                ? 'border-blue-500 shadow-lg shadow-blue-500/10'
                : 'border-white/5 hover:border-blue-500/30 shadow-sm hover:shadow-xl'
                }`}
        >
            {planId === 'bronze' && (
                <img src="https://imgur.com/0ZJ7t4a.png" className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none evo-store-bg" alt="Bronze BG" />
            )}
            {planId === 'silver' && (
                <img src="https://imgur.com/Y3YR7AA.png" className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none evo-store-bg" alt="Silver BG" />
            )}
            {planId === 'gold' && (
                <img src="https://imgur.com/S692ePG.png" className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none evo-store-bg opacity-0" alt="Gold BG" />
            )}
            {/* Top Badge */}
            {(isPopular || isBest || isCurrentPlan) && (
                <div
                    className={`py-2 px-4 text-center text-xs font-bold uppercase tracking-wider text-white ${isBest && !isCurrentPlan ? 'evo-badge-shake' : ''}`}
                    style={{
                        background: isCurrentPlan
                            ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
                            : isBest
                                ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                                : 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)'
                    }}
                >
                    {isCurrentPlan ? '✓ Seu plano atual' : isBest ? '🔥 Melhor valor' : '⭐ Popular'}
                </div>
            )}

            <div className="p-6">
                {/* Plan Header */}
                <div className="flex items-center gap-3 mb-4">
                    <div
                        className={`w-14 h-14 rounded-2xl flex items-center justify-center ${planId === 'gold' ? 'relative overflow-visible' : ''}`}
                        style={planId !== 'gold' ? { background: 'transparent', border: 'none' } : {}}
                    >
                        {planId === 'gold' ? (
                            <>
                                <div className="evo-gold-circle-clipper">
                                    <img src={plan.iconUrl} className="w-14 h-14 object-contain evo-store-card-icon relative z-10" alt={`${planId} icon`} />
                                </div>
                                {[...Array(12)].map((_, i) => {
                                    const x = (Math.random() - 0.5) * 160;
                                    const y = (Math.random() - 0.5) * 160;
                                    return <div key={i} className="evo-gold-particle" style={{ '--x': `${x}px`, '--y': `${y}px`, left: '50%', top: '50%', animationDelay: `${Math.random() * 2}s` }}></div>;
                                })}
                            </>
                        ) : (
                            <img src={plan.iconUrl} className="w-14 h-14 object-contain evo-store-card-icon" alt={`${planId} icon`} />
                        )}
                    </div>
                    <div>
                        <p className="text-lg font-black text-white">{plan.name}</p>
                        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: plan.color }}>
                            {planId.toUpperCase()}
                        </p>
                    </div>
                </div>

                {/* Credits per month */}
                <div className="mb-4 p-3 rounded-2xl bg-white/5">
                    <div className="flex items-baseline justify-center gap-1">
                        <span className="text-3xl font-black text-white">{credits}</span>
                        <span className="text-sm font-medium text-gray-401">créditos/mês</span>
                    </div>
                </div>

                {/* Price */}
                <div className="text-center mb-5">
                    <div className="flex items-baseline justify-center gap-1">
                        <span className="text-sm font-medium text-gray-400">R$</span>
                        <span className="text-4xl font-black text-white">
                            {price.toFixed(2).replace('.', ',')}
                        </span>
                        <span className="text-sm font-medium text-gray-400">/mês</span>
                    </div>
                </div>

                {/* Benefits List */}
                <ul className="space-y-3 mb-6">
                    {plan.benefits.map((benefit, i) => (
                        <motion.li
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: delay + 0.1 * i }}
                            className="flex items-start gap-2"
                        >
                            <div className="w-5 h-5 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <LuCheck className="w-3 h-3 text-blue-500" />
                            </div>
                            <span className="text-sm text-gray-400">{benefit}</span>
                        </motion.li>
                    ))}
                </ul>

                {/* Subscribe Button */}
                <motion.button
                    whileHover={{ scale: isCurrentPlan ? 1 : 1.02 }}
                    whileTap={{ scale: isCurrentPlan ? 1 : 0.98 }}
                    onClick={onSubscribe}
                    disabled={isLoading || isCurrentPlan}
                    className={`w-full py-3.5 px-4 rounded-2xl font-bold transition-all disabled:cursor-not-allowed ${isCurrentPlan
                        ? 'bg-gray-100 text-gray-400'
                        : 'text-white'
                        }`}
                    style={!isCurrentPlan ? {
                        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                        boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)'
                    } : {}}
                >
                    {isLoading ? (
                        <div className="flex items-center justify-center gap-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Processando...</span>
                        </div>
                    ) : isCurrentPlan ? (
                        'Plano Atual'
                    ) : (
                        <span className="flex items-center justify-center gap-2">
                            <LuRocket className="w-4 h-4" />
                            Assinar Agora
                        </span>
                    )}
                </motion.button>
            </div>
        </motion.div>
    );
}

export default SubscriptionPlanCard;
