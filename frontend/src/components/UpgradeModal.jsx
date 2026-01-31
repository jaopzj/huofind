import { motion, AnimatePresence } from 'framer-motion';
import { LuSparkles, LuArrowRight, LuX } from 'react-icons/lu';

/**
 * UpgradeModal - Modal overlay for guest users requesting upgrade
 * Shows when guest tries to access Yupoo features
 */
function UpgradeModal({
    isOpen = true,
    title = "Faça upgrade para acessar",
    description = "Assine um plano para desbloquear acesso completo à pesquisa de produtos Yupoo.",
    onUpgrade,
    onClose
}) {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="bg-[#1f2937] rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-white/10"
                    >
                        {/* Gradient Header */}
                        <div
                            className="px-8 py-10 text-center relative"
                            style={{
                                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                            }}
                        >
                            {/* Close X button */}
                            {onClose && (
                                <button
                                    onClick={onClose}
                                    className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                                >
                                    <LuX className="w-5 h-5 text-white" />
                                </button>
                            )}

                            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <LuSparkles className="w-8 h-8 text-white" />
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-2">
                                {title}
                            </h2>
                            <p className="text-white/80 text-sm">
                                {description}
                            </p>
                        </div>

                        {/* Content */}
                        <div className="p-8">
                            {/* Benefits */}
                            <div className="space-y-3 mb-8">
                                {[
                                    'Pesquisa ilimitada de produtos Yupoo',
                                    'Acesso a filtros avançados',
                                    'Salvar produtos favoritos',
                                    'Suporte prioritário'
                                ].map((benefit, i) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <div className="w-5 h-5 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                                            <svg className="w-3 h-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                        <span className="text-gray-300 text-sm">{benefit}</span>
                                    </div>
                                ))}
                            </div>

                            {/* CTA Button */}
                            <button
                                onClick={onUpgrade}
                                className="w-full flex items-center justify-center gap-2 py-4 px-6 rounded-2xl font-semibold text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
                                style={{
                                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                    boxShadow: '0 4px 20px rgba(59, 130, 246, 0.4)'
                                }}
                            >
                                Ver planos disponíveis
                                <LuArrowRight className="w-5 h-5" />
                            </button>

                            {/* Close option */}
                            {onClose && (
                                <button
                                    onClick={onClose}
                                    className="w-full mt-3 py-3 text-gray-400 text-sm hover:text-white transition-colors"
                                >
                                    Continuar como convidado
                                </button>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export default UpgradeModal;
