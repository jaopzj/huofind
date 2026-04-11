import { useState, memo } from 'react';
import { motion } from 'framer-motion';
import { proxyImage } from '../../utils/imageProxy';
import { formatAffiliateUrl } from '../../utils/affiliateLinks';

/**
 * SavedProductCard - Enhanced product card with platform tag and actions
 */
const SavedProductCard = memo(function SavedProductCard({
    product,
    onRemove,
    onOpenMoveModal
}) {
    const [isHovered, setIsHovered] = useState(false);
    const [isRemoving, setIsRemoving] = useState(false);

    const handleRemove = async () => {
        if (isRemoving) return;
        setIsRemoving(true);
        try {
            await onRemove();
        } catch (err) {
            console.error('Error removing product:', err);
            setIsRemoving(false);
        }
    };

    const handleViewProduct = () => {
        if (product.product_url) {
            window.open(formatAffiliateUrl(product.product_url), '_blank');
        }
    };

    // Format price
    const formatPrice = () => {
        const price = parseFloat(product.product_price);
        if (isNaN(price)) return '—';

        const currency = product.product_currency || 'CNY';
        if (currency === 'CNY') {
            return `¥ ${price.toFixed(0)}`;
        }
        return `${currency} ${price.toFixed(2)}`;
    };

    return (
        <motion.article
            className="bg-[#1f2937] rounded-2xl border border-white/5 shadow-sm overflow-hidden transition-all duration-200"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            whileHover={{ y: -4, boxShadow: '0 12px 32px rgba(0,0,0,0.4)', borderColor: 'rgba(59, 130, 246, 0.2)' }}
            style={{ opacity: isRemoving ? 0.5 : 1 }}
        >
            {/* Image Container */}
            <div className="relative aspect-square bg-gray-900/50 overflow-hidden">
                {product.product_image ? (
                    <img
                        src={proxyImage(product.product_image)}
                        alt={product.product_title || 'Produto'}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                            e.target.onerror = null;
                            e.target.style.display = 'none';
                        }}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <span className="text-4xl opacity-30">📦</span>
                    </div>
                )}

                {/* Platform Tag */}
                <div className="absolute top-3 right-3">
                    <PlatformTag platform={product.platform} />
                </div>

                {/* Quick Actions Overlay */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: isHovered ? 1 : 0 }}
                    className="absolute inset-0 bg-gradient-to-t from-[#111827]/80 via-transparent to-transparent flex items-end justify-center pb-4 gap-2"
                >
                    <button
                        onClick={handleViewProduct}
                        className="px-3 py-1.5 bg-[#1f2937]/90 backdrop-blur-sm rounded-lg text-xs font-semibold text-white hover:bg-blue-600 transition-colors flex items-center gap-1 border border-white/10"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        Ver
                    </button>
                    <button
                        onClick={onOpenMoveModal}
                        className="px-3 py-1.5 bg-[#1f2937]/90 backdrop-blur-sm rounded-lg text-xs font-semibold text-white hover:bg-blue-600 transition-colors flex items-center gap-1 border border-white/10"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                        </svg>
                        Mover
                    </button>
                </motion.div>
            </div>

            {/* Content */}
            <div className="p-4">
                {/* Title */}
                <h3
                    className="text-sm font-medium text-white line-clamp-2 mb-1"
                    title={product.product_title}
                >
                    {product.product_title || 'Produto sem nome'}
                </h3>

                {/* Seller */}
                {product.seller_name && (
                    <p className="text-xs text-gray-400 mb-2 truncate">
                        {product.seller_name}
                    </p>
                )}

                {/* Price and Actions Row */}
                <div className="flex items-center justify-between mt-3">
                    <p className="text-lg font-bold text-blue-500">
                        {formatPrice()}
                    </p>

                    {/* Remove Button */}
                    <button
                        onClick={handleRemove}
                        disabled={isRemoving}
                        className="p-2 rounded-lg text-gray-500 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                        title="Remover dos salvos"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </div>
            </div>
        </motion.article>
    );
});

/**
 * PlatformTag - Small tag showing the product platform
 */
function PlatformTag({ platform }) {
    if (!platform || platform === 'unknown') return null;

    const config = {
        yupoo: {
            label: 'Yupoo',
            bgClass: 'bg-green-500/10',
            textClass: 'text-green-400',
            dotColor: '#10b981'
        },
        xianyu: {
            label: 'Xianyu',
            bgClass: 'bg-yellow-500/10',
            textClass: 'text-yellow-400',
            dotColor: '#f59e0b'
        }
    };

    const cfg = config[platform];
    if (!cfg) return null;

    return (
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${cfg.bgClass} ${cfg.textClass}`}>
            <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: cfg.dotColor }}
            />
            {cfg.label}
        </span>
    );
}

export default SavedProductCard;
