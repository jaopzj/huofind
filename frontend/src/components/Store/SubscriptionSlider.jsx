import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LuCheck, LuChevronLeft, LuChevronRight, LuRocket } from 'react-icons/lu';
import { ExploradorIcon, EscavadorIcon, MineradorIcon } from './TierIcons';

// Plan configurations with features
const PLANS_DATA = [
    {
        id: 'bronze',
        name: 'Explorador',
        tier: 'BRONZE',
        icon: ExploradorIcon,
        color: '#B45309',
        bgGradient: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)',
        credits: 50,
        price: 19.90,
        description: 'Perfeito para começar a explorar produtos da China',
        features: [
            {
                title: 'Mineração',
                items: ['50 créditos mensais', 'Mineração de produtos Xianyu', 'Tradução automática']
            },
            {
                title: 'Recursos',
                items: ['Acesso completo à Yupoo', 'Salvar produtos favoritos', 'Filtros avançados', 'Suporte por email']
            }
        ]
    },
    {
        id: 'prata',
        name: 'Escavador',
        tier: 'PRATA',
        icon: EscavadorIcon,
        color: '#4B5563',
        bgGradient: 'linear-gradient(135deg, #F3F4F6 0%, #E5E7EB 100%)',
        credits: 150,
        price: 39.90,
        description: 'Para quem busca mais volume e recursos extras',
        badge: 'Popular',
        features: [
            {
                title: 'Mineração',
                items: ['150 créditos mensais', 'Tudo do Explorador', 'Cache prioritário']
            },
            {
                title: 'Recursos',
                items: ['Filtros avançados', 'Suporte prioritário', 'Atualizações antecipadas', 'Estatísticas detalhadas']
            }
        ]
    },
    {
        id: 'ouro',
        name: 'Minerador',
        tier: 'OURO',
        icon: MineradorIcon,
        color: '#D97706',
        bgGradient: 'linear-gradient(135deg, #FEF3C7 0%, #FCD34D 100%)',
        credits: 300,
        price: 69.90,
        description: 'Máximo poder de mineração para profissionais',
        badge: 'Melhor Valor',
        features: [
            {
                title: 'Mineração',
                items: ['300 créditos mensais', 'Tudo do Escavador', 'Prioridade máxima no servidor']
            },
            {
                title: 'Recursos',
                items: ['Acesso antecipado a novidades', 'Suporte VIP dedicado', 'API de integração (em breve)', 'Badge exclusivo no perfil']
            }
        ]
    }
];

/**
 * SubscriptionSlider - Carousel-style subscription plan display
 */
function SubscriptionSlider({ currentTier = 'guest', onSubscribe, onManageSubscription, isLoading = false, hasDiscount = false, discountPercent = 15 }) {
    const [activeIndex, setActiveIndex] = useState(2); // Start with Ouro (best) plan

    // Tier hierarchy for comparison
    const TIER_RANK = { guest: 0, bronze: 1, prata: 2, ouro: 3 };
    const userTierRank = TIER_RANK[currentTier] || 0;

    const currentPlan = PLANS_DATA[activeIndex];
    const Icon = currentPlan.icon;
    const planTierRank = TIER_RANK[currentPlan.id] || 0;
    const isCurrentUserPlan = currentTier === currentPlan.id;
    const isLowerThanUserPlan = planTierRank < userTierRank;

    const discountedPrice = hasDiscount ? currentPlan.price * (1 - discountPercent / 100) : currentPlan.price;

    const goToPrevious = () => {
        setActiveIndex((prev) => (prev === 0 ? PLANS_DATA.length - 1 : prev - 1));
    };

    const goToNext = () => {
        setActiveIndex((prev) => (prev === PLANS_DATA.length - 1 ? 0 : prev + 1));
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full"
        >
            {/* Navigation Indicators */}
            <div className="flex items-center justify-center gap-2 mb-6">
                {PLANS_DATA.map((plan, index) => (
                    <button
                        key={plan.id}
                        onClick={() => setActiveIndex(index)}
                        className={`transition-all duration-300 rounded-full ${index === activeIndex
                            ? 'w-8 h-2 bg-blue-500'
                            : 'w-2 h-2 bg-white/10 hover:bg-white/20'
                            }`}
                        aria-label={`Ver plano ${plan.name}`}
                    />
                ))}
            </div>

            {/* Main Card Container */}
            <div className="relative">
                {/* Navigation Arrows - Positioned inside the card edges */}
                <button
                    onClick={goToPrevious}
                    className="absolute -left-4 md:-left-6 top-1/2 -translate-y-1/2 z-20 w-10 h-10 md:w-12 md:h-12 rounded-full bg-[#1f2937] shadow-lg border border-white/10 flex items-center justify-center text-gray-400 hover:text-blue-500 hover:border-blue-500/30 transition-all hover:scale-110"
                    aria-label="Plano anterior"
                >
                    <LuChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
                </button>

                <button
                    onClick={goToNext}
                    className="absolute -right-4 md:-right-6 top-1/2 -translate-y-1/2 z-20 w-10 h-10 md:w-12 md:h-12 rounded-full bg-[#1f2937] shadow-lg border border-white/10 flex items-center justify-center text-gray-400 hover:text-blue-500 hover:border-blue-500/30 transition-all hover:scale-110"
                    aria-label="Próximo plano"
                >
                    <LuChevronRight className="w-5 h-5 md:w-6 md:h-6" />
                </button>

                {/* Card */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentPlan.id}
                        initial={{ opacity: 0, x: 50, scale: 0.98 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: -50, scale: 0.98 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="relative mx-auto w-full overflow-hidden rounded-3xl bg-[#1f2937] border border-white/10 shadow-xl"
                    >
                        {/* Badge */}
                        {currentPlan.badge && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8, y: -10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                transition={{ delay: 0.2, duration: 0.3 }}
                                className="absolute top-4 right-4 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider text-white shadow-md z-10"
                                style={{
                                    background: currentPlan.badge === 'Melhor Valor'
                                        ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                                        : 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)'
                                }}
                            >
                                ⭐ {currentPlan.badge}
                            </motion.div>
                        )}

                        {/* Current Plan Badge */}
                        {isCurrentUserPlan && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.2, duration: 0.3 }}
                                className="absolute top-4 left-4 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider text-white shadow-md z-10"
                                style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}
                            >
                                ✓ Seu plano
                            </motion.div>
                        )}

                        <div className="flex flex-col lg:flex-row">
                            {/* Left Side - Plan Info */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1, duration: 0.4 }}
                                className="flex flex-col justify-between p-6 lg:w-2/5 lg:p-10"
                            >
                                <div>
                                    {/* Plan Header */}
                                    <div className="flex items-center gap-3 mb-4">
                                        <div
                                            className="w-14 h-14 rounded-2xl flex items-center justify-center"
                                            style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)' }}
                                        >
                                            <Icon size={28} color="#fff" />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-black text-white">{currentPlan.name}</h3>
                                            <p className="text-xs font-bold uppercase tracking-widest text-blue-400">
                                                {currentPlan.tier}
                                            </p>
                                        </div>
                                    </div>

                                    <p className="text-gray-400 text-sm mb-6">{currentPlan.description}</p>

                                    {/* Price */}
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.2, duration: 0.3 }}
                                        className="mb-6"
                                    >
                                        {hasDiscount ? (
                                            <>
                                                <div className="flex items-baseline gap-2 mb-1">
                                                    <span className="text-lg text-gray-500 line-through font-medium">
                                                        R$ {currentPlan.price.toFixed(2).replace('.', ',')}
                                                    </span>
                                                    <span className="text-xs font-bold text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">
                                                        -{discountPercent}%
                                                    </span>
                                                </div>
                                                <div className="flex items-baseline gap-1">
                                                    <span className="text-sm font-medium text-green-400">R$</span>
                                                    <span className="text-5xl font-black text-green-400">
                                                        {discountedPrice.toFixed(2).replace('.', ',')}
                                                    </span>
                                                    <span className="text-sm font-medium text-gray-400">/1º mês</span>
                                                </div>
                                                <p className="text-xs text-green-400/70 mt-1">
                                                    Desconto de indicação aplicado no primeiro mês
                                                </p>
                                            </>
                                        ) : (
                                            <>
                                                <div className="flex items-baseline gap-1">
                                                    <span className="text-sm font-medium text-gray-400">R$</span>
                                                    <span className="text-5xl font-black text-white">
                                                        {currentPlan.price.toFixed(2).replace('.', ',')}
                                                    </span>
                                                    <span className="text-sm font-medium text-gray-400">/mês</span>
                                                </div>
                                            </>
                                        )}
                                        <p className="text-xs text-gray-400 mt-1">
                                            {currentPlan.credits} créditos renovados mensalmente
                                        </p>
                                    </motion.div>
                                </div>

                                {/* CTA Button */}
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3, duration: 0.3 }}
                                >
                                    <motion.button
                                        whileHover={{ scale: isLowerThanUserPlan ? 1 : 1.02 }}
                                        whileTap={{ scale: isLowerThanUserPlan ? 1 : 0.98 }}
                                        onClick={() => {
                                            if (isCurrentUserPlan && onManageSubscription) {
                                                onManageSubscription();
                                            } else {
                                                onSubscribe?.(currentPlan.id);
                                            }
                                        }}
                                        disabled={isLoading || isLowerThanUserPlan}
                                        className={`w-full py-4 px-6 rounded-2xl font-bold text-lg transition-all disabled:cursor-not-allowed flex items-center justify-center gap-2 ${isLowerThanUserPlan
                                            ? 'bg-white/5 text-gray-600'
                                            : isCurrentUserPlan
                                                ? 'bg-white/5 text-white border border-white/10 hover:bg-white/10'
                                                : 'text-white'
                                            }`}
                                        style={!(isCurrentUserPlan || isLowerThanUserPlan) ? {
                                            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                            boxShadow: '0 4px 20px rgba(59, 130, 246, 0.35)'
                                        } : {}}
                                    >
                                        {isLoading ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                <span>Processando...</span>
                                            </>
                                        ) : isCurrentUserPlan ? (
                                            'Gerenciar Assinatura'
                                        ) : isLowerThanUserPlan ? (
                                            'Você já possui um plano superior'
                                        ) : (
                                            <>
                                                <LuRocket className="w-5 h-5" />
                                                Assinar Agora
                                            </>
                                        )}
                                    </motion.button>
                                </motion.div>
                            </motion.div>

                            {/* Separator */}
                            <div className="h-px bg-white/5 lg:hidden" />

                            {/* Right Side - Features */}
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.15, duration: 0.4 }}
                                className="p-6 lg:w-3/5 lg:p-10 rounded-b-3xl lg:rounded-r-3xl lg:rounded-bl-none"
                                style={{ background: 'linear-gradient(135deg, #1a222e 0%, #1f2937 100%)' }}
                            >
                                <div className="space-y-6">
                                    {currentPlan.features.map((feature, featureIndex) => (
                                        <motion.div
                                            key={`${currentPlan.id}-${featureIndex}`}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.2 + featureIndex * 0.1, duration: 0.3 }}
                                        >
                                            <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-500">
                                                {feature.title}
                                            </h4>
                                            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {feature.items.map((item, index) => (
                                                    <motion.li
                                                        key={index}
                                                        initial={{ opacity: 0, x: -10 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: 0.25 + index * 0.05, duration: 0.2 }}
                                                        className="flex items-center gap-2"
                                                    >
                                                        <div className="w-5 h-5 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                                                            <LuCheck className="w-3 h-3 text-blue-500" />
                                                        </div>
                                                        <span className="text-sm text-gray-400">{item}</span>
                                                    </motion.li>
                                                ))}
                                            </ul>
                                            {featureIndex < currentPlan.features.length - 1 && (
                                                <div className="my-6 h-px bg-white/5" />
                                            )}
                                        </motion.div>
                                    ))}
                                </div>
                            </motion.div>
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>
        </motion.div>
    );
}

export default SubscriptionSlider;
