import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

/**
 * AnimatedNumber - Número com animação de contagem
 */
function AnimatedNumber({ value, duration = 1000 }) {
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        const startTime = Date.now();
        const startValue = displayValue;
        const endValue = typeof value === 'number' ? value : 0;

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function (ease-out)
            const easeOut = 1 - Math.pow(1 - progress, 3);
            
            const current = Math.round(startValue + (endValue - startValue) * easeOut);
            setDisplayValue(current);

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }, [value, duration]);

    return <span>{displayValue}</span>;
}

/**
 * StatCard - Card individual de estatística
 */
function StatCard({ icon, label, value, color, delay = 0 }) {
    const colorClasses = {
        orange: 'from-orange-400 to-orange-600',
        blue: 'from-blue-400 to-blue-600',
        green: 'from-emerald-400 to-emerald-600',
        purple: 'from-purple-400 to-purple-600'
    };

    const bgColorClasses = {
        orange: 'bg-orange-50',
        blue: 'bg-blue-50',
        green: 'bg-emerald-50',
        purple: 'bg-purple-50'
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className={`${bgColorClasses[color]} rounded-2xl p-5 border border-gray-100/50 shadow-sm hover:shadow-md transition-shadow`}
        >
            <div className="flex items-center gap-4">
                {/* Icon */}
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center text-white shadow-md`}>
                    {icon}
                </div>

                {/* Content */}
                <div>
                    <p className="text-2xl font-black text-gray-900">
                        <AnimatedNumber value={value} />
                    </p>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        {label}
                    </p>
                </div>
            </div>
        </motion.div>
    );
}

/**
 * ProfileStats - Grid de cards com estatísticas do usuário
 */
function ProfileStats({ 
    miningInfo = { credits: 0, tier: 'guest' }, 
    savedProductsCount = 0, 
    savedSellersCount = 0, 
    collectionsCount = 0 
}) {
    const miningCurrent = miningInfo.credits || 0;
    const isLowBalance = miningCurrent <= 10;
    
    // Calculate days until renewal
    const daysUntilRenewal = miningInfo.nextRenewal 
        ? Math.max(0, Math.ceil((new Date(miningInfo.nextRenewal) - new Date()) / (1000 * 60 * 60 * 24)))
        : null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="mt-6"
        >
            {/* Credits Card - Premium Redesign */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="bg-white rounded-[2rem] p-8 shadow-xl border border-gray-100/50 mb-6 group transition-all hover:bg-orange-50/10"
            >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-6">
                        {/* Coin Icon Container */}
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 duration-500 ${isLowBalance ? 'bg-red-50 text-red-500' : 'bg-orange-50 text-orange-500'}`}>
                            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <path d="M12 6v12M8 10h8M8 14h6" />
                            </svg>
                        </div>
                        
                        <div>
                            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Saldo Disponível</p>
                            <div className="flex items-baseline gap-2">
                                <span className={`text-5xl font-black tracking-tighter ${isLowBalance ? 'text-red-600' : 'text-gray-900'}`}>
                                    <AnimatedNumber value={miningCurrent} />
                                </span>
                                <span className="text-sm font-bold text-gray-400 uppercase tracking-wide">créditos</span>
                            </div>
                        </div>
                    </div>

                    {/* Stats/Info Section */}
                    <div className="flex items-center gap-8 border-t md:border-t-0 md:border-l border-gray-100 pt-6 md:pt-0 md:pl-8">
                        {daysUntilRenewal !== null ? (
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Renovação</p>
                                <p className="text-lg font-bold text-gray-700">Em {daysUntilRenewal} dias</p>
                                <p className="text-[10px] text-gray-400">Próximo reset mensal</p>
                            </div>
                        ) : (
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Status</p>
                                <p className="text-lg font-bold text-gray-500">Saldo Promocional</p>
                                <p className="text-[10px] text-gray-400">Créditos de bônus</p>
                            </div>
                        )}
                    </div>
                </div>

                {isLowBalance && (
                    <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-6 p-3 bg-red-50 rounded-xl border border-red-100 flex items-center gap-2 text-red-600"
                    >
                        <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <span className="text-xs font-bold">Saldo crítico! Verifique os planos de upgrade para continuar minerando.</span>
                    </motion.div>
                )}
            </motion.div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard
                    icon={
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                        </svg>
                    }
                    label="Produtos Salvos"
                    value={savedProductsCount}
                    color="blue"
                    delay={0.2}
                />

                <StatCard
                    icon={
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    }
                    label="Vendedores Salvos"
                    value={savedSellersCount}
                    color="green"
                    delay={0.3}
                />

                <StatCard
                    icon={
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                    }
                    label="Coleções"
                    value={collectionsCount}
                    color="purple"
                    delay={0.4}
                />
            </div>
        </motion.div>
    );
}

export default ProfileStats;
