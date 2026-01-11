/**
 * CompareBar - Floating action bar for comparing selected products
 */
function CompareBar({ selectedProducts, onRemove, onCompareClick, onClear, isComparing }) {
    if (!selectedProducts || selectedProducts.length === 0) {
        return null;
    }

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-fade-in-up">
            <div
                className="max-w-3xl mx-auto rounded-2xl px-6 py-4"
                style={{
                    background: 'rgba(255, 255, 255, 0.15)',
                    backdropFilter: 'blur(20px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                    boxShadow: `
                        inset 0 1px 1px rgba(255, 255, 255, 0.5),
                        0 8px 32px rgba(0, 0, 0, 0.2)
                    `
                }}
            >
                <div className="flex items-center justify-between gap-4">
                    {/* Selected products thumbnails */}
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
                            ⚖️ Comparar ({selectedProducts.length}/4)
                        </span>

                        <div className="flex gap-2 overflow-x-auto">
                            {selectedProducts.slice(0, 4).map((product, index) => (
                                <div
                                    key={product.id || index}
                                    className="relative flex-shrink-0 group"
                                >
                                    <div
                                        className="w-12 h-12 rounded-lg overflow-hidden border-2"
                                        style={{
                                            borderColor: 'var(--color-orange-400)',
                                            background: 'var(--color-cream-100)'
                                        }}
                                    >
                                        {product.images?.[0] ? (
                                            <img
                                                src={product.images[0]}
                                                alt={product.name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-lg">
                                                📱
                                            </div>
                                        )}
                                    </div>
                                    {/* Remove button */}
                                    <button
                                        onClick={() => onRemove(product.id)}
                                        className="absolute -top-1 -right-1 w-5 h-5 rounded-full 
                                                   bg-red-500 text-white text-xs
                                                   flex items-center justify-center
                                                   opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClear}
                            className="btn-ghost text-sm"
                            disabled={isComparing}
                        >
                            Limpar
                        </button>

                        <button
                            onClick={onCompareClick}
                            disabled={selectedProducts.length < 2 || isComparing}
                            className="btn-primary flex items-center gap-2 text-sm"
                        >
                            {isComparing ? (
                                <>
                                    <span className="animate-spin">⏳</span>
                                    Analisando...
                                </>
                            ) : (
                                <>
                                    Comparar Agora
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                    </svg>
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Min products warning */}
                {selectedProducts.length < 2 && (
                    <p className="text-xs text-gray-500 mt-2 text-center">
                        Selecione pelo menos 2 produtos para comparar
                    </p>
                )}
            </div>
        </div>
    );
}

export default CompareBar;
