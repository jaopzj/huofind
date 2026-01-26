import { motion } from 'framer-motion';

/**
 * SavedSellerCard - Card premium para a lista de vendedores salvos
 * 
 * Props:
 * - seller: objeto do vendedor { id, nickname, seller_url, icon_value, created_at }
 * - onSelect: callback para iniciar mineração
 * - onDelete: callback para remover
 */
function SavedSellerCard({ seller, onSelect, onDelete }) {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            whileHover={{ y: -5, transition: { duration: 0.2 } }}
            className="group relative bg-white border border-gray-100 p-5 rounded-[2rem] shadow-md hover:shadow-2xl hover:border-orange-200 transition-all duration-300"
        >
            <div className="flex flex-col items-center text-center">
                {/* Icon Circle */}
                <div className="relative mb-4">
                    <div className="w-20 h-20 rounded-full bg-orange-50 flex items-center justify-center text-4xl shadow-inner group-hover:scale-110 transition-transform duration-500">
                        {seller.icon_value || '🏪'}
                    </div>
                    {/* Platform Badge */}
                    <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white border border-gray-100 flex items-center justify-center shadow-sm">
                        <img src="/xianyu-logo.svg" alt="Xianyu" className="w-5 h-5 object-contain" />
                    </div>
                </div>

                {/* Info */}
                <h3 className="font-bold text-gray-800 text-lg mb-1 group-hover:text-orange-600 transition-colors">
                    {seller.nickname}
                </h3>
                <p className="text-xs text-gray-400 font-medium mb-6 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    Pronto para minerar
                </p>

                {/* Actions */}
                <div className="flex items-center gap-2 w-full">
                    <button
                        onClick={() => onSelect(seller.seller_url)}
                        className="flex-1 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-bold active:scale-95 transition-all hover:bg-orange-600 hover:shadow-[0_4px_12px_rgba(234,88,12,0.3)]"
                    >
                        ⚡ Minerar
                    </button>

                    <button
                        onClick={(e) => onDelete(seller.id, seller.seller_id, e)}
                        className="p-2.5 rounded-xl bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-500 active:scale-90 transition-all"
                        title="Remover vendedor"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Hover Shine Effect */}
            <div className="absolute inset-0 rounded-[2rem] overflow-hidden pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-tr from-orange-400/0 via-orange-400/0 to-orange-400/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            </div>
        </motion.div>
    );
}

export default SavedSellerCard;
