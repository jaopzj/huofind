import { motion } from 'framer-motion';
import { LuCheck, LuCrown, LuSparkles, LuShield, LuRocket } from 'react-icons/lu';

// Plan configurations
const PLAN_CONFIG = {
    bronze: {
        name: 'Explorador',
        icon: LuShield,
        color: '#B45309',
        bgGradient: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)',
        benefits: [
            'Acesso completo à Yupoo',
            '50 créditos mensais',
            'Salvar produtos favoritos',
            'Suporte por email'
        ]
    },
    prata: {
        name: 'Escavador',
        icon: LuSparkles,
        color: '#4B5563',
        bgGradient: 'linear-gradient(135deg, #F3F4F6 0%, #E5E7EB 100%)',
        benefits: [
            'Tudo do Explorador',
            '150 créditos mensais',
            'Filtros avançados',
            'Suporte prioritário'
        ]
    },
    ouro: {
        name: 'Minerador',
        icon: LuCrown,
        color: '#D97706',
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
    planId, // 'bronze' | 'prata' | 'ouro'
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
    const Icon = plan.icon;

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay }}
            whileHover={{ y: -6, transition: { duration: 0.2 } }}
            className={`relative bg-white rounded-3xl overflow-hidden border-2 transition-all duration-300 ${isCurrentPlan
                    ? 'border-orange-400 shadow-lg shadow-orange-100'
                    : 'border-gray-100 hover:border-orange-200 shadow-sm hover:shadow-xl'
                }`}
        >
            {/* Top Badge */}
            {(isPopular || isBest || isCurrentPlan) && (
                <div
                    className="py-2 px-4 text-center text-xs font-bold uppercase tracking-wider text-white"
                    style={{
                        background: isCurrentPlan
                            ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
                            : isBest
                                ? 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)'
                                : 'linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%)'
                    }}
                >
                    {isCurrentPlan ? '✓ Seu plano atual' : isBest ? '🔥 Melhor valor' : '⭐ Popular'}
                </div>
            )}

            <div className="p-6">
                {/* Plan Header */}
                <div className="flex items-center gap-3 mb-4">
                    <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center"
                        style={{ background: plan.bgGradient }}
                    >
                        <Icon className="w-6 h-6" style={{ color: plan.color }} />
                    </div>
                    <div>
                        <p className="text-lg font-black text-gray-900">{plan.name}</p>
                        <p className="text-xs font-medium uppercase tracking-wider" style={{ color: plan.color }}>
                            {planId.toUpperCase()}
                        </p>
                    </div>
                </div>

                {/* Credits per month */}
                <div className="mb-4 p-3 rounded-2xl bg-gray-50">
                    <div className="flex items-baseline justify-center gap-1">
                        <span className="text-3xl font-black text-gray-900">{credits}</span>
                        <span className="text-sm font-medium text-gray-500">créditos/mês</span>
                    </div>
                </div>

                {/* Price */}
                <div className="text-center mb-5">
                    <div className="flex items-baseline justify-center gap-1">
                        <span className="text-sm font-medium text-gray-500">R$</span>
                        <span className="text-4xl font-black text-gray-900">
                            {price.toFixed(2).replace('.', ',')}
                        </span>
                        <span className="text-sm font-medium text-gray-500">/mês</span>
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
                            <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <LuCheck className="w-3 h-3 text-green-600" />
                            </div>
                            <span className="text-sm text-gray-600">{benefit}</span>
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
                        background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
                        boxShadow: '0 4px 15px rgba(249, 115, 22, 0.3)'
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
