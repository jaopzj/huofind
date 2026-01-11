import { useState } from 'react';

/**
 * ComparisonModal - Full-screen modal for side-by-side product comparison
 */
function ComparisonModal({ isOpen, onClose, comparisonData, isLoading }) {
    const [activeImageIndex, setActiveImageIndex] = useState({});

    if (!isOpen) return null;

    const { products = [], winner, winnerScore, recommendation, maxPossibleScore = 100 } = comparisonData || {};

    // Score color based on value
    const getScoreColor = (score) => {
        if (score >= 80) return '#10B981'; // Green
        if (score >= 60) return '#F59E0B'; // Orange
        return '#EF4444'; // Red
    };

    // Get score label
    const getScoreLabel = (score) => {
        if (score >= 80) return 'Excelente';
        if (score >= 60) return 'Bom';
        if (score >= 40) return 'Regular';
        return 'Baixo';
    };

    // Circular progress component
    const ScoreCircle = ({ score, isWinner }) => (
        <div className="relative">
            <svg className="w-24 h-24 transform -rotate-90">
                <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke="rgba(0,0,0,0.1)"
                    strokeWidth="8"
                    fill="none"
                />
                <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke={getScoreColor(score)}
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${(score / 100) * 251.2} 251.2`}
                    strokeLinecap="round"
                    className="transition-all duration-1000"
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold" style={{ color: getScoreColor(score) }}>
                    {score}
                </span>
                <span className="text-xs text-gray-500">/ {maxPossibleScore}</span>
            </div>
            {isWinner && products.length > 1 && (
                <div className="absolute -top-2 -right-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded-full">
                    🏆 Melhor
                </div>
            )}
        </div>
    );

    // Breakdown bar component
    const BreakdownBar = ({ label, value, maxValue, icon }) => (
        <div className="flex items-center gap-2">
            <span className="text-lg">{icon}</span>
            <div className="flex-1">
                <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-600">{label}</span>
                    <span className="font-medium">{value}/{maxValue}</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                            width: `${(value / maxValue) * 100}%`,
                            background: `linear-gradient(90deg, var(--color-orange-400), var(--color-orange-500))`
                        }}
                    />
                </div>
            </div>
        </div>
    );

    // Product card for comparison
    const ProductCompareCard = ({ product, index }) => {
        const isProductWinner = product.id === winner;
        const currentImage = activeImageIndex[product.id] || 0;

        return (
            <div
                className={`flex-1 p-6 rounded-2xl ${isProductWinner ? 'ring-2 ring-yellow-400' : ''}`}
                style={{
                    background: 'rgba(255, 255, 255, 0.7)',
                    backdropFilter: 'blur(10px)'
                }}
            >
                {/* Image gallery */}
                <div className="relative aspect-square rounded-xl overflow-hidden mb-4 bg-gray-100">
                    {product.images?.length > 0 ? (
                        <>
                            <img
                                src={product.images[currentImage]}
                                alt={product.title}
                                className="w-full h-full object-cover"
                            />
                            {product.images.length > 1 && (
                                <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
                                    {product.images.slice(0, 5).map((_, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setActiveImageIndex(prev => ({ ...prev, [product.id]: i }))}
                                            className={`w-2 h-2 rounded-full transition-all ${currentImage === i ? 'bg-white w-4' : 'bg-white/50'
                                                }`}
                                        />
                                    ))}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-6xl opacity-20">
                            📱
                        </div>
                    )}
                </div>

                {/* Score */}
                <div className="flex justify-center mb-4">
                    <ScoreCircle score={product.score || 0} isWinner={isProductWinner} />
                </div>
                <p className="text-center text-sm text-gray-500 mb-4">
                    {getScoreLabel(product.score || 0)}
                </p>

                {/* Title & Price */}
                <h3 className="font-semibold text-gray-800 line-clamp-2 mb-2 text-center">
                    {product.title || product.model || 'Produto'}
                </h3>
                <p className="text-2xl font-bold text-center mb-4" style={{ color: 'var(--color-orange-500)' }}>
                    {product.priceFormatted || `¥ ${product.price}`}
                </p>

                {/* Specs Table */}
                <div className="space-y-2 mb-4">
                    <div className="flex justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-500 text-sm">Modelo</span>
                        <span className="font-medium text-sm">{product.model || '—'}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-500 text-sm">Versão</span>
                        <span className="font-medium text-sm">{product.versionFormatted || '—'}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-500 text-sm">Armazenamento</span>
                        <span className="font-medium text-sm">{product.storageFormatted || '—'}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-500 text-sm">Status</span>
                        <span className="font-medium text-sm">{product.unlockFormatted || '—'}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-500 text-sm">Bateria</span>
                        <span className="font-medium text-sm">{product.batteryFormatted || '—'}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-500 text-sm">Condição</span>
                        <span className="font-medium text-sm">{product.conditionFormatted || '—'}</span>
                    </div>
                    <div className="flex justify-between py-2">
                        <span className="text-gray-500 text-sm">Tela</span>
                        <span className="font-medium text-sm">{product.screenFormatted || '—'}</span>
                    </div>
                </div>

                {/* Score Breakdown */}
                {product.breakdown && (
                    <div className="space-y-3 pt-4 border-t border-gray-200">
                        <h4 className="text-xs font-semibold text-gray-500 uppercase">Detalhes da Pontuação</h4>
                        <BreakdownBar label="Desbloqueio" value={product.breakdown.unlockStatus} maxValue={25} icon="🔓" />
                        <BreakdownBar label="Bateria" value={product.breakdown.battery} maxValue={20} icon="🔋" />
                        <BreakdownBar label="Condição" value={product.breakdown.condition} maxValue={20} icon="📱" />
                        <BreakdownBar label="Preço" value={product.breakdown.price} maxValue={20} icon="💰" />
                        <BreakdownBar label="Vendedor" value={product.breakdown.sellerTrust} maxValue={10} icon="⭐" />
                        <BreakdownBar label="Tela" value={product.breakdown.screen} maxValue={5} icon="🖥️" />
                    </div>
                )}

                {/* View button */}
                <a
                    href={product.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full mt-4 py-3 text-center rounded-xl font-medium transition-all hover:scale-[1.02]"
                    style={{
                        background: isProductWinner ? 'var(--color-orange-500)' : 'var(--color-cream-200)',
                        color: isProductWinner ? 'white' : 'var(--color-orange-600)'
                    }}
                >
                    Ver Anúncio
                </a>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/30 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal content */}
            <div
                className="relative w-full max-w-6xl max-h-[90vh] overflow-y-auto rounded-3xl"
                style={{
                    background: 'rgba(255, 255, 255, 0.85)',
                    backdropFilter: 'blur(20px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                    boxShadow: '0 24px 64px rgba(0, 0, 0, 0.15), inset 0 1px 1px rgba(255, 255, 255, 0.5)'
                }}
            >
                {/* Header */}
                <div className="sticky top-0 z-10 px-6 py-4 border-b border-gray-200/50 flex items-center justify-between"
                    style={{ background: 'rgba(255, 255, 255, 0.9)' }}
                >
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">⚖️ Comparação de Produtos</h2>
                        {recommendation && !isLoading && (
                            <p className="text-sm text-gray-500 mt-1">{recommendation}</p>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
                    >
                        <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Loading state */}
                {isLoading ? (
                    <div className="p-12 flex flex-col items-center justify-center">
                        <div className="w-16 h-16 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin mb-4" />
                        <p className="text-gray-600 font-medium">Analisando produtos...</p>
                        <p className="text-sm text-gray-400 mt-2">Extraindo informações detalhadas</p>
                    </div>
                ) : (
                    <>
                        {/* Products comparison */}
                        <div className="p-6">
                            <div className={`grid gap-6 ${products.length === 2 ? 'grid-cols-2' :
                                    products.length === 3 ? 'grid-cols-3' :
                                        'grid-cols-2 lg:grid-cols-4'
                                }`}>
                                {products.map((product, index) => (
                                    <ProductCompareCard key={product.id || index} product={product} index={index} />
                                ))}
                            </div>
                        </div>

                        {/* Winner banner */}
                        {winner && products.length > 1 && (
                            <div
                                className="mx-6 mb-6 p-4 rounded-xl text-center"
                                style={{
                                    background: 'linear-gradient(135deg, rgba(255, 107, 53, 0.1), rgba(251, 191, 36, 0.1))',
                                    border: '1px solid rgba(255, 107, 53, 0.2)'
                                }}
                            >
                                <p className="text-lg font-semibold text-gray-800">
                                    🏆 Recomendação: <span style={{ color: 'var(--color-orange-500)' }}>
                                        {products.find(p => p.id === winner)?.model || 'Produto'}
                                    </span>
                                    <span className="text-sm font-normal text-gray-500 ml-2">
                                        ({winnerScore} pontos)
                                    </span>
                                </p>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

export default ComparisonModal;
