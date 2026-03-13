import { motion } from 'framer-motion';
import { LuZap, LuStar, LuFlame } from 'react-icons/lu';

/**
 * CreditPackageCard - Single credit package card for one-time purchase
 */
function CreditPackageCard({
    credits,
    price,
    pricePerCredit,
    badge = null,
    badgeType = 'popular', // 'popular' | 'best'
    onPurchase,
    isLoading = false,
    delay = 0,
    hasDiscount = false,
    discountPercent = 15
}) {
    const getBadgeStyles = () => {
        if (badgeType === 'best') {
            return {
                bg: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                icon: <LuFlame className="w-3 h-3" />,
                text: 'Melhor Custo'
            };
        }
        return {
            bg: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
            icon: <LuStar className="w-3 h-3" />,
            text: 'Popular'
        };
    };

    const badgeStyles = badge ? getBadgeStyles() : null;
    const discountedPrice = hasDiscount ? price * (1 - discountPercent / 100) : price;
    const discountedPerCredit = hasDiscount ? discountedPrice / credits : pricePerCredit;

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className="relative bg-[#1f2937] rounded-3xl p-6 border border-white/10 shadow-sm hover:shadow-xl transition-shadow duration-300"
        >
            {/* Badge */}
            {
                badge && (
                    <motion.div
                        initial={{ scale: 0, rotate: -12 }}
                        animate={{ scale: 1, rotate: -12 }}
                        transition={{ delay: delay + 0.2, type: 'spring', stiffness: 300 }}
                        className="absolute -top-3 -right-2 px-3 py-1 rounded-full text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-lg"
                        style={{ background: badgeStyles.bg }}
                    >
                        {badgeStyles.icon}
                        {badgeStyles.text}
                    </motion.div>
                )
            }

            {/* Credits Icon */}
            <div className="mb-4">
                <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto"
                    style={{
                        background: 'rgba(59, 130, 246, 0.05)',
                        border: '1px solid rgba(59, 130, 246, 0.2)'
                    }}
                >
                    <LuZap className="w-7 h-7 text-blue-500" />
                </div>
            </div>

            {/* Credits Amount */}
            <div className="text-center mb-4">
                <p className="text-4xl font-black text-white mb-1">{credits}</p>
                <p className="text-sm font-medium text-gray-400">créditos</p>
            </div>

            {/* Price */}
            <div className="text-center mb-5">
                {hasDiscount ? (
                    <>
                        <p className="text-sm text-gray-500 line-through mb-1">
                            R$ {price.toFixed(2).replace('.', ',')}
                        </p>
                        <p className="text-2xl font-bold text-green-400">
                            R$ {discountedPrice.toFixed(2).replace('.', ',')}
                        </p>
                        <p className="text-xs text-green-400/70 mt-1">
                            -{discountPercent}% com indicação
                        </p>
                    </>
                ) : (
                    <p className="text-2xl font-bold text-white">
                        R$ {price.toFixed(2).replace('.', ',')}
                    </p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                    R$ {discountedPerCredit.toFixed(2).replace('.', ',')} por crédito
                </p>
            </div>

            {/* Purchase Button */}
            <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onPurchase}
                disabled={isLoading}
                className="w-full py-3.5 px-4 rounded-2xl font-bold text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                style={{
                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)'
                }}
            >
                {isLoading ? (
                    <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Processando...</span>
                    </div>
                ) : (
                    'Comprar'
                )}
            </motion.button>
        </motion.div >
    );
}

export default CreditPackageCard;
