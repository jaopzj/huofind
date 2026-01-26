import { motion } from 'framer-motion';

/**
 * SuggestionCard - Compact product card for horizontal carousel
 * Smaller than ProductCard, optimized for quick preview
 * Handles multiple field name variants from different data sources
 */
function SuggestionCard({ product, onClick }) {
    const handleClick = () => {
        if (onClick) {
            onClick(product);
        } else {
            const url = product.product_url || product.url;
            if (url) {
                window.open(url, '_blank');
            }
        }
    };

    // Format price - handle both formats
    const formatPrice = () => {
        const price = parseFloat(product.preco || product.product_price || product.price);
        if (isNaN(price) || price === 0) return '—';
        return `¥ ${price.toFixed(0)}`;
    };

    // Get image URL - handle multiple field names
    const imageUrl = product.image || product.imagem || product.product_image || product.images?.[0];

    // Get title - handle multiple field names
    const title = product.titulo || product.title || product.product_title || product.name || 'Produto';

    return (
        <motion.article
            className="suggestion-card"
            onClick={handleClick}
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.98 }}
        >
            {/* Image */}
            <div className="aspect-square rounded-xl overflow-hidden bg-gray-100">
                {imageUrl ? (
                    <img
                        src={imageUrl}
                        alt={title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                            e.target.onerror = null;
                            e.target.style.display = 'none';
                            e.target.parentNode.innerHTML = '<div class="w-full h-full flex items-center justify-center"><span class="text-3xl opacity-30">📦</span></div>';
                        }}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <span className="text-3xl opacity-30">📦</span>
                    </div>
                )}
            </div>

            {/* Title */}
            <h3
                className="text-xs font-medium text-gray-700 line-clamp-1 mt-2"
                title={title}
            >
                {title}
            </h3>

            {/* Price */}
            <p className="text-sm font-bold text-orange-500 mt-0.5">
                {formatPrice()}
            </p>
        </motion.article>
    );
}

export default SuggestionCard;
