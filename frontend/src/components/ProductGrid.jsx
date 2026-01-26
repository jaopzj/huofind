import {
    detectStorage,
    extractUniqueStorages,
    detectBadges
} from '../utils/iphoneDetector';
import {
    detectProductModel,
    getModelIcon,
    extractUniqueProductModels
} from '../utils/modelDetector';
import SaveBookmarkButton from './SaveBookmarkButton';

/**
 * ProductCard - Estilo e-commerce minimalista com salvamento
 */
function ProductCard({
    product,
    showBRL = false,
    exchangeRate = 0,
    isSaved = false,
    onSaveToggle,
    category = 'iphone'
}) {
    const handleClick = () => {
        if (product.url) {
            window.open(product.url, '_blank');
        }
    };

    const model = detectProductModel(product, category);
    const modelIcon = getModelIcon(category);
    const storage = detectStorage(product);
    const badges = detectBadges(product);

    // Formata o preço com base na moeda selecionada
    const formatPrice = () => {
        const yuanPrice = parseFloat(product.price) || 0;
        if (showBRL && exchangeRate > 0) {
            const brlPrice = yuanPrice * exchangeRate;
            return `R$ ${brlPrice.toFixed(2).replace('.', ',')}`;
        }
        return product.priceFormatted || `¥ ${yuanPrice}`;
    };

    return (
        <article
            className="product-card transition-all duration-200"
        >
            {/* Image */}
            <div
                className="relative overflow-hidden"
                style={{
                    aspectRatio: '1/1',
                    background: 'var(--color-cream-100)'
                }}
            >
                {product.images?.[0] ? (
                    <img
                        src={product.images[0]}
                        alt={product.nameTranslated || product.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                            e.target.onerror = null;
                            e.target.style.display = 'none';
                            e.target.parentNode.innerHTML = '<div class="w-full h-full flex items-center justify-center"><span class="text-4xl opacity-30">📦</span></div>';
                        }}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <span className="text-4xl opacity-30">📦</span>
                    </div>
                )}

                {/* Model Badge - top left */}
                {model && (
                    <span
                        className="absolute top-3 left-3 liquid-glass-badge"
                    >
                        {modelIcon} {model}
                    </span>
                )}

                {/* Storage Badge - top right - ALWAYS visible */}
                {storage && (
                    <span className="absolute top-3 right-3 liquid-glass-badge liquid-glass-orange">
                        {storage}
                    </span>
                )}

                {/* Version/Status Badges - bottom - Liquid Glass variants */}
                {badges.length > 0 && (
                    <div className="absolute bottom-3 left-3 right-3 flex flex-wrap gap-1.5">
                        {badges.map((badge, i) => {
                            // Map badge types to Liquid Glass color classes
                            let glassClass = 'liquid-glass-badge';
                            if (badge.label?.toLowerCase().includes('eua') || badge.label?.toLowerCase().includes('usa') || badge.label?.toLowerCase().includes('us')) {
                                glassClass += ' liquid-glass-blue';
                            } else if (badge.label?.toLowerCase().includes('desbloqueado') || badge.label?.toLowerCase().includes('unlock')) {
                                glassClass += ' liquid-glass-green';
                            } else if (badge.label?.toLowerCase().includes('rsim') || badge.label?.toLowerCase().includes('sim')) {
                                glassClass += ' liquid-glass-purple';
                            } else if (badge.icon === '🔒' || badge.label?.toLowerCase().includes('bloqueado')) {
                                glassClass += ' liquid-glass-red';
                            }

                            return (
                                <span key={i} className={glassClass}>
                                    {badge.flagSvg ? (
                                        <img src={badge.flagSvg} alt={badge.label} className="w-4 h-3 rounded-sm" />
                                    ) : badge.icon ? (
                                        <span>{badge.icon}</span>
                                    ) : null}
                                    {badge.label}
                                </span>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="p-4">
                {/* Name */}
                <h3
                    className="text-sm font-medium line-clamp-2 mb-2"
                    style={{ color: '#1F2937', minHeight: '2.5rem' }}
                >
                    {product.nameTranslated || product.name}
                </h3>

                {/* Original Name (smaller) */}
                {product.nameOriginal && product.nameOriginal !== product.nameTranslated && (
                    <p
                        className="text-xs line-clamp-1 mb-3"
                        style={{ color: '#9CA3AF' }}
                    >
                        {product.nameOriginal}
                    </p>
                )}

                {/* Price Row */}
                <div className="flex items-center justify-between mb-3">
                    <p
                        className="text-2xl font-bold"
                        style={{ color: 'var(--color-orange-500)' }}
                    >
                        {formatPrice()}
                    </p>

                    {/* Bookmark Save Button */}
                    {onSaveToggle && (
                        <SaveBookmarkButton
                            isSaved={isSaved}
                            onToggle={() => onSaveToggle(product)}
                            size={18}
                        />
                    )}
                </div>

                {/* Action Button - Full Width */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        handleClick();
                    }}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
                    style={{
                        background: 'var(--color-orange-500)',
                        color: 'white'
                    }}
                >
                    Ver anúncio
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                </button>
            </div>
        </article>
    );
}

/**
 * ProductGrid - Grid responsivo de produtos com suporte a salvamento
 */
function ProductGrid({
    products,
    showBRL = false,
    exchangeRate = 0,
    savedProductUrls = [],
    onSaveToggle,
    category = 'iphone'
}) {
    if (!products || products.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16">
                <span className="text-5xl mb-4 opacity-40">📭</span>
                <p style={{ color: '#6B7280' }}>Nenhum produto encontrado</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {products.map((product, index) => (
                <div
                    key={product.id || index}
                    className="animate-fade-in-up"
                    style={{ animationDelay: `${Math.min(index * 30, 300)}ms` }}
                >
                    <ProductCard
                        product={product}
                        showBRL={showBRL}
                        exchangeRate={exchangeRate}
                        isSaved={savedProductUrls.includes(product.url)}
                        onSaveToggle={onSaveToggle}
                        category={category}
                    />
                </div>
            ))}
        </div>
    );
}

export { extractUniqueProductModels, detectProductModel, detectStorage, extractUniqueStorages };
export default ProductGrid;
