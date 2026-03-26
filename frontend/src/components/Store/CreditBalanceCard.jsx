import { motion } from 'framer-motion';
import { LuSparkles, LuCalendar, LuTrendingUp } from 'react-icons/lu';

/**
 * CreditBalanceCard - Displays current credit balance with progress bar
 */
function CreditBalanceCard({ credits = 0, maxCredits, nextRenewal = null, tier = 'guest' }) {
    const percentage = maxCredits ? Math.min(100, (credits / maxCredits) * 100) : 0;
    const isLowBalance = maxCredits ? credits <= maxCredits * 0.2 : false;
    const isOutOfCredits = credits <= 0;

    // Calculate days until renewal
    const daysUntilRenewal = nextRenewal
        ? Math.max(0, Math.ceil((new Date(nextRenewal) - new Date()) / (1000 * 60 * 60 * 24)))
        : null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="relative overflow-hidden rounded-3xl p-6 mb-8"
            style={{
                backgroundColor: '#1f2937',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
            }}
        >
            {/* Decorative background elements */}
            <div className="absolute top-0 right-0 w-32 h-32 opacity-5">
                <svg viewBox="0 0 100 100" fill="none" className="w-full h-full">
                    <circle cx="80" cy="20" r="60" fill="#3b82f6" />
                </svg>
            </div>
            <div className="absolute bottom-0 left-0 w-24 h-24 opacity-[0.03]">
                <svg viewBox="0 0 100 100" fill="none" className="w-full h-full">
                    <circle cx="20" cy="80" r="50" fill="#3b82f6" />
                </svg>
            </div>

            <div className="relative z-10">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div
                            className="w-12 h-12 rounded-2xl flex items-center justify-center"
                            style={{
                                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
                            }}
                        >
                            <LuSparkles className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-blue-400 uppercase tracking-wider">Seu Saldo</p>
                            <p className="text-sm text-gray-400">Créditos disponíveis</p>
                        </div>
                    </div>

                    {/* Renewal info */}
                    {daysUntilRenewal !== null && (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                            <LuCalendar className="w-3.5 h-3.5 text-blue-400" />
                            <span className="text-xs font-semibold text-blue-300">
                                Renova em {daysUntilRenewal}d
                            </span>
                        </div>
                    )}
                </div>

                {/* Credits Display */}
                <div className="flex items-baseline gap-2 mb-4">
                    <motion.span
                        key={credits}
                        initial={{ scale: 1.2, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className={`text-5xl font-black ${isOutOfCredits ? 'text-red-500' : isLowBalance ? 'text-amber-500' : 'text-white'}`}
                    >
                        {credits}
                    </motion.span>
                    <span className="text-lg font-medium text-gray-500">/ {maxCredits} créditos</span>
                </div>

                {/* Progress Bar */}
                <div className="h-3 rounded-full overflow-hidden bg-white/5 shadow-inner">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="h-full rounded-full"
                        style={{
                            background: isOutOfCredits
                                ? 'linear-gradient(90deg, #EF4444 0%, #DC2626 100%)'
                                : isLowBalance
                                    ? 'linear-gradient(90deg, #F59E0B 0%, #EF4444 100%)'
                                    : 'linear-gradient(90deg, #3b82f6 0%, #2563eb 100%)'
                        }}
                    />
                </div>

                {/* Low balance warning */}
                {isLowBalance && !isOutOfCredits && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-3 flex items-center gap-2 text-amber-500/80"
                    >
                        <LuTrendingUp className="w-4 h-4" />
                        <span className="text-xs font-medium">Créditos baixos! Considere recarregar.</span>
                    </motion.div>
                )}
            </div>
        </motion.div>
    );
}

export default CreditBalanceCard;
