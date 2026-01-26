import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { LuChevronLeft, LuChevronRight, LuExternalLink } from 'react-icons/lu';

/**
 * ProductCarousel - Reusable product carousel component
 * Shows 3 products at a time with smooth horizontal scroll
 * Auto-slides every 5 seconds (pauses on hover)
 */
function ProductCarousel({
    title,
    subtitle,
    products = [],
    isLoading = false,
    itemsToShow = 3,
    autoSlideInterval = 5000
}) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const containerRef = useRef(null);

    // Navigation state
    const canGoPrev = currentIndex > 0;
    const canGoNext = currentIndex < products.length - itemsToShow;

    const handlePrev = () => {
        if (canGoPrev) {
            setCurrentIndex(prev => prev - 1);
        }
    };

    const handleNext = () => {
        if (canGoNext) {
            setCurrentIndex(prev => prev + 1);
        } else {
            // Loop back to start
            setCurrentIndex(0);
        }
    };

    // Auto-slide effect
    useEffect(() => {
        if (isLoading || products.length <= itemsToShow || isPaused) {
            return;
        }

        const interval = setInterval(() => {
            setCurrentIndex(prev => {
                if (prev >= products.length - itemsToShow) {
                    return 0; // Loop back to start
                }
                return prev + 1;
            });
        }, autoSlideInterval);

        return () => clearInterval(interval);
    }, [products.length, itemsToShow, isLoading, isPaused, autoSlideInterval]);

    // Open product URL
    const handleProductClick = (product) => {
        const url = product.product_url || product.url;
        if (url) {
            window.open(url, '_blank');
        }
    };

    // Helper to get product image URL
    const getProductImage = (p) => {
        return p.image || p.imagem || p.product_image || null;
    };

    // Format price
    const formatPrice = (product) => {
        const price = parseFloat(product.preco || product.product_price || product.price);
        if (isNaN(price) || price === 0) return null;
        return `¥ ${price.toFixed(0)}`;
    };

    // Loading skeleton
    if (isLoading) {
        return (
            <div className="product-carousel-card">
                <div className="product-carousel-header">
                    <div>
                        <div className="h-6 w-40 bg-gray-200 rounded animate-pulse" />
                        <div className="h-4 w-64 bg-gray-200 rounded animate-pulse mt-2" />
                    </div>
                </div>
                <div className="product-carousel-content">
                    <div className="flex gap-4">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="product-carousel-item animate-pulse">
                                <div className="aspect-square bg-gray-200 rounded-lg" />
                                <div className="h-4 bg-gray-200 rounded mt-3 w-3/4" />
                                <div className="h-5 bg-gray-200 rounded mt-2 w-1/2" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // No products
    if (products.length === 0) {
        return null;
    }

    return (
        <motion.div
            className="product-carousel-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
        >
            {/* Header */}
            <div className="product-carousel-header">
                <div>
                    <h2 className="text-xl font-bold text-gray-800">{title}</h2>
                    {subtitle && (
                        <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
                    )}
                </div>

                {/* Navigation buttons */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={handlePrev}
                        disabled={!canGoPrev}
                        className={`product-carousel-nav ${!canGoPrev ? 'opacity-40 cursor-not-allowed' : ''}`}
                        aria-label="Anterior"
                    >
                        <LuChevronLeft size={18} />
                    </button>
                    <button
                        onClick={handleNext}
                        disabled={!canGoNext}
                        className={`product-carousel-nav ${!canGoNext ? 'opacity-40 cursor-not-allowed' : ''}`}
                        aria-label="Próximo"
                    >
                        <LuChevronRight size={18} />
                    </button>
                </div>
            </div>

            {/* Carousel content */}
            <div className="product-carousel-content">
                <div
                    className="product-carousel-track"
                    style={{
                        transform: `translateX(-${currentIndex * (100 / itemsToShow)}%)`
                    }}
                >
                    {products.map((product, index) => {
                        const imageUrl = getProductImage(product);
                        const productTitle = product.titulo || product.title || 'Produto';
                        const price = formatPrice(product);

                        return (
                            <div
                                key={product.product_url || index}
                                className="product-carousel-item"
                                onClick={() => handleProductClick(product)}
                            >
                                {/* Image */}
                                <div className="product-carousel-image">
                                    {imageUrl ? (
                                        <img
                                            src={imageUrl}
                                            alt={productTitle}
                                            className="w-full h-full object-cover"
                                            loading="lazy"
                                            onError={(e) => {
                                                e.target.onerror = null;
                                                e.target.src = '';
                                                e.target.parentNode.innerHTML = '<div class="w-full h-full flex items-center justify-center bg-gray-100"><span class="text-4xl opacity-30">📦</span></div>';
                                            }}
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-gray-100">
                                            <span className="text-4xl opacity-30">📦</span>
                                        </div>
                                    )}

                                    {/* Hover overlay */}
                                    <div className="product-carousel-overlay">
                                        <div className="p-2 bg-white/90 backdrop-blur-sm rounded-lg">
                                            <LuExternalLink size={18} className="text-gray-700" />
                                        </div>
                                    </div>
                                </div>

                                {/* Product info */}
                                <div className="mt-3">
                                    <h3 className="font-semibold text-gray-800 text-sm line-clamp-2" title={productTitle}>
                                        {productTitle}
                                    </h3>
                                    {price && (
                                        <p className="text-orange-500 font-bold mt-1">
                                            {price}
                                        </p>
                                    )}
                                    {product.marca && (
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            {product.marca}
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </motion.div>
    );
}

export default ProductCarousel;
