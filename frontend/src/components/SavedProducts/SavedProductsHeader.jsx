import { useState } from 'react';

/**
 * SavedProductsHeader - Header with title, subtitle, and search
 */
function SavedProductsHeader({ searchQuery, onSearchChange, productCount }) {
    const [isFocused, setIsFocused] = useState(false);

    return (
        <div className="mb-6">
            {/* Title Row */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                <div>
                    <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white">
                        Produtos Salvos
                    </h2>
                    <p className="text-gray-400 text-sm mt-1">
                        {productCount === 0
                            ? 'Sua vitrine de produtos está vazia'
                            : `${productCount} produto${productCount !== 1 ? 's' : ''} na sua vitrine`
                        }
                    </p>
                </div>

                {/* Search Box */}
                <div
                    className={`relative transition-all duration-200 ${isFocused ? 'w-full sm:w-80' : 'w-full sm:w-64'
                        }`}
                >
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                        <svg
                            className={`w-4 h-4 transition-colors ${isFocused ? 'text-orange-500' : 'text-gray-400'
                                }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                            />
                        </svg>
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar produtos salvos..."
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        className={`w-full pl-11 pr-4 py-3 bg-[#1f2937]/80 backdrop-blur-sm border rounded-xl text-sm font-medium transition-all duration-200 text-white placeholder-gray-500 ${isFocused
                            ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-lg'
                            : 'border-white/10 hover:border-white/20'
                            }`}
                        style={{ outline: 'none' }}
                    />
                    {searchQuery && (
                        <button
                            onClick={() => onSearchChange('')}
                            className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-white transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default SavedProductsHeader;
