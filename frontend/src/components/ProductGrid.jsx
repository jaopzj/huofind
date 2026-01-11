import { detectIPhoneModel, extractUniqueModels, detectStorage, extractUniqueStorages } from '../utils/iphoneDetector';

// Import flag SVGs
import usaFlag from '../assets/icons/usa.svg';
import chinaFlag from '../assets/icons/china.svg';

/**
 * Detecta badges baseado no nome do produto
 */
function detectBadges(product) {
    const name = (product.nameTranslated || product.name || '').toLowerCase();
    const originalName = (product.nameOriginal || '').toLowerCase();
    const fullText = `${name} ${originalName}`;

    const badges = [];

    // Desbloqueado (verde)
    if (/desbloqueado|lockless|unlocked|无锁|官解/.test(fullText)) {
        badges.push({ type: 'unlocked', label: 'Desbloqueado', icon: '🔓', color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)' });
    }

    // RSIM/Adesivo (amarelo)
    if (/com adesivo|adaptador|rsim|r-?sim|卡贴|贴膜/.test(fullText)) {
        badges.push({ type: 'rsim', label: 'RSIM', icon: '💳', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.15)' });
    }

    // Versão Chinesa (vermelho) - com flag SVG
    if (/china continental|versão chinesa|国行|China|ch\/a|版本 chinesa/.test(fullText)) {
        badges.push({ type: 'china', label: 'China', flagSvg: chinaFlag, color: '#EF4444', bg: 'rgba(239, 68, 68, 0.15)' });
    }

    // Versão Americana (azul) - com flag SVG
    if (/eua|usa|americano|美版|us\/a|版本 eua|versão americana/.test(fullText)) {
        badges.push({ type: 'usa', label: 'EUA', flagSvg: usaFlag, color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.15)' });
    }

    return badges;
}

/**
 * Detecta o status do unlock do produto
 */
export function detectUnlockStatus(product) {
    const name = (product.nameTranslated || product.name || '').toLowerCase();
    const originalName = (product.nameOriginal || '').toLowerCase();
    const fullText = `${name} ${originalName}`;

    if (/desbloqueado|lockless|unlocked|无锁|官解/.test(fullText)) {
        return 'unlocked';
    }
    if (/com adesivo|adaptador|rsim|r-?sim|卡贴|贴膜/.test(fullText)) {
        return 'rsim';
    }
    return 'unknown';
}

/**
 * ProductCard - Estilo e-commerce minimalista
 */
function ProductCard({ product, showBRL = false, exchangeRate = 0 }) {
    const handleClick = () => {
        if (product.url) {
            window.open(product.url, '_blank');
        }
    };

    const iphoneModel = detectIPhoneModel(product);
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
        <article className="product-card">
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
                        className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                        loading="lazy"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <span className="text-4xl opacity-30">📦</span>
                    </div>
                )}

                {/* Model Badge - top left */}
                {iphoneModel && (
                    <span
                        className="absolute top-3 left-3 text-xs font-medium px-2 py-1 rounded-lg"
                        style={{
                            background: 'rgba(255, 255, 255, 0.95)',
                            backdropFilter: 'blur(4px)',
                            color: '#374151',
                            boxShadow: 'var(--shadow-soft)'
                        }}
                    >
                        📱 {iphoneModel}
                    </span>
                )}

                {/* Storage Badge - top right */}
                {storage && (
                    <span
                        className="absolute top-3 right-3 text-xs font-medium px-2 py-1 rounded-lg"
                        style={{
                            background: 'var(--color-orange-500)',
                            color: 'white',
                            boxShadow: 'var(--shadow-soft)'
                        }}
                    >
                        {storage}
                    </span>
                )}

                {/* Version/Status Badges - bottom */}
                {badges.length > 0 && (
                    <div className="absolute bottom-3 left-3 right-3 flex flex-wrap gap-1">
                        {badges.map((badge, i) => (
                            <span
                                key={i}
                                className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md"
                                style={{
                                    background: badge.bg,
                                    color: badge.color,
                                    backdropFilter: 'blur(4px)'
                                }}
                            >
                                {badge.flagSvg ? (
                                    <img src={badge.flagSvg} alt={badge.label} className="w-4 h-3 rounded-sm" />
                                ) : (
                                    <span>{badge.icon}</span>
                                )}
                                {badge.label}
                            </span>
                        ))}
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

                {/* Price + Link Button */}
                <div className="flex items-center justify-between gap-2">
                    <p
                        className="text-lg font-bold"
                        style={{ color: 'var(--color-orange-500)' }}
                    >
                        {formatPrice()}
                    </p>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleClick();
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:scale-105"
                        style={{
                            background: 'var(--color-orange-500)',
                            color: 'white'
                        }}
                    >
                        Ver anúncio
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                    </button>
                </div>
            </div>
        </article>
    );
}

/**
 * ProductGrid - Grid responsivo de produtos
 */
function ProductGrid({ products, showBRL = false, exchangeRate = 0 }) {
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
                    <ProductCard product={product} showBRL={showBRL} exchangeRate={exchangeRate} />
                </div>
            ))}
        </div>
    );
}

export { extractUniqueModels, detectIPhoneModel, detectStorage, extractUniqueStorages };
export default ProductGrid;
