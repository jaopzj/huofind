import { memo } from 'react';

/**
 * SearchFilters - Dropdown style filters with status filter buttons and currency toggle
 * Supports category-based filter rendering (iPhone, Apple Watch, Generic)
 */
const SearchFilters = memo(function SearchFilters({
    filters,
    onFilterChange,
    availableModels = [],
    availableStorages = [],
    availableWatchModels = [],
    availableWatchSizes = [],
    showBRL = false,
    onToggleCurrency,
    category = 'iphone' // 'iphone' | 'applewatch' | 'generic'
}) {
    // Determine which category-specific filters to show
    const showIPhoneFilters = category === 'iphone';
    const showAppleWatchFilters = category === 'applewatch';
    const handleChange = (key, value) => {
        onFilterChange({ ...filters, [key]: value });
    };

    const clearFilters = () => {
        onFilterChange({
            keyword: '',
            minPrice: '',
            maxPrice: '',
            sort: '',
            // iPhone filters
            iphoneModel: '',
            storage: '',
            unlockStatus: '',
            // Apple Watch filters
            watchModel: '',
            watchSize: '',
            watchCondition: ''
        });
    };

    const hasActiveFilters = filters.keyword || filters.minPrice || filters.maxPrice || filters.sort ||
        filters.iphoneModel || filters.storage || filters.unlockStatus ||
        filters.watchModel || filters.watchSize || filters.watchCondition;

    // Button styles with hover effects
    const getFilterButtonStyle = (isActive, activeColor = '#3B82F6') => ({
        background: isActive ? activeColor : 'rgba(255, 255, 255, 0.05)',
        color: isActive ? 'white' : '#9CA3AF',
        border: isActive ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
        transform: 'scale(1)',
        transition: 'all 0.2s ease'
    });

    return (
        <div
            className="rounded-2xl p-5 mb-6 transition-all duration-300 hover:shadow-lg"
            style={{
                background: '#1f2937',
                backdropFilter: 'blur(10px)',
                boxShadow: 'var(--shadow-soft)',
                border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
        >
            {/* Top Row: Unlock Status + Currency Toggle */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                {/* Unlock Status Filter Buttons - iPhone only */}
                {showIPhoneFilters && (
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => handleChange('unlockStatus', '')}
                            className="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 hover:scale-105 hover:shadow-md active:scale-95"
                            style={getFilterButtonStyle(!filters.unlockStatus)}
                        >
                            📦 Todos
                        </button>
                        <button
                            onClick={() => handleChange('unlockStatus', 'unlocked')}
                            className="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 hover:scale-105 hover:shadow-md active:scale-95"
                            style={getFilterButtonStyle(filters.unlockStatus === 'unlocked', '#10B981')}
                        >
                            🔓 Desbloqueado
                        </button>
                        <button
                            onClick={() => handleChange('unlockStatus', 'rsim')}
                            className="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 hover:scale-105 hover:shadow-md active:scale-95"
                            style={getFilterButtonStyle(filters.unlockStatus === 'rsim', '#60A5FA')}
                        >
                            💳 RSIM
                        </button>
                    </div>
                )}
            </div>

            {/* Search + Price Row */}
            <div className="flex flex-wrap items-center gap-4 mb-4">
                {/* Keyword Search */}
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-medium mb-1.5" style={{ color: '#9CA3AF' }}>
                        🔍 Buscar por nome
                    </label>
                    <input
                        type="text"
                        className="w-full px-4 py-2.5 rounded-xl text-sm transition-all"
                        style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            outline: 'none',
                            color: 'white'
                        }}
                        placeholder="Digite para filtrar..."
                        value={filters.keyword}
                        onChange={(e) => handleChange('keyword', e.target.value)}
                    />
                </div>

                {/* Price Range */}
                <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: '#9CA3AF' }}>
                        💰 Faixa de Preço
                    </label>
                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            className="w-24 px-3 py-2.5 rounded-xl text-sm transition-all"
                            style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                outline: 'none',
                                color: 'white'
                            }}
                            placeholder="¥ Min"
                            value={filters.minPrice}
                            onChange={(e) => handleChange('minPrice', e.target.value)}
                        />
                        <span style={{ color: '#6B7280' }}>—</span>
                        <input
                            type="number"
                            className="w-24 px-3 py-2.5 rounded-xl text-sm transition-all"
                            style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                outline: 'none',
                                color: 'white'
                            }}
                            placeholder="¥ Max"
                            value={filters.maxPrice}
                            onChange={(e) => handleChange('maxPrice', e.target.value)}
                        />
                    </div>
                </div>

                {/* Sort */}
                <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: '#9CA3AF' }}>
                        ↕️ Ordenar
                    </label>
                    <select
                        className="px-4 py-2.5 rounded-xl text-sm cursor-pointer min-w-[140px]"
                        style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            color: 'white',
                            outline: 'none',
                            colorScheme: 'dark'
                        }}
                        value={filters.sort}
                        onChange={(e) => handleChange('sort', e.target.value)}
                    >
                        <option value="">Padrão</option>
                        <option value="price_asc">Menor preço</option>
                        <option value="price_desc">Maior preço</option>
                        <option value="name_asc">A → Z</option>
                        <option value="name_desc">Z → A</option>
                    </select>
                </div>
            </div>

            {/* Model + Storage Dropdowns - iPhone only */}
            {showIPhoneFilters && (availableModels.length > 0 || availableStorages.length > 0) && (
                <div
                    className="flex flex-wrap items-end gap-4 pt-4"
                    style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}
                >
                    {/* Model Dropdown */}
                    {availableModels.length > 0 && (
                        <div>
                            <label className="block text-xs font-medium mb-1.5" style={{ color: '#9CA3AF' }}>
                                📱 Modelo iPhone
                            </label>
                            <select
                                className="px-4 py-2.5 rounded-xl text-sm cursor-pointer min-w-[180px]"
                                style={{
                                    background: filters.iphoneModel ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                                    border: filters.iphoneModel ? '1px solid #3B82F6' : '1px solid rgba(255, 255, 255, 0.1)',
                                    color: filters.iphoneModel ? '#60A5FA' : 'white',
                                    outline: 'none',
                                    fontWeight: filters.iphoneModel ? '600' : '400',
                                    colorScheme: 'dark'
                                }}
                                value={filters.iphoneModel}
                                onChange={(e) => handleChange('iphoneModel', e.target.value)}
                            >
                                <option value="">Todos os modelos</option>
                                {availableModels.map((model) => (
                                    <option key={model} value={model}>
                                        {model}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Storage Dropdown */}
                    {availableStorages.length > 0 && (
                        <div>
                            <label className="block text-xs font-medium mb-1.5" style={{ color: '#9CA3AF' }}>
                                💾 Armazenamento
                            </label>
                            <select
                                className="px-4 py-2.5 rounded-xl text-sm cursor-pointer min-w-[160px]"
                                style={{
                                    background: filters.storage ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                                    border: filters.storage ? '1px solid #3B82F6' : '1px solid rgba(255, 255, 255, 0.1)',
                                    color: filters.storage ? '#60A5FA' : 'white',
                                    outline: 'none',
                                    fontWeight: filters.storage ? '600' : '400',
                                    colorScheme: 'dark'
                                }}
                                value={filters.storage}
                                onChange={(e) => handleChange('storage', e.target.value)}
                            >
                                <option value="">Todos</option>
                                {availableStorages.map((storage) => (
                                    <option key={storage} value={storage}>
                                        {storage}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
            )}

            {/* Apple Watch Model + Size Dropdowns */}
            {showAppleWatchFilters && (availableWatchModels.length > 0 || availableWatchSizes.length > 0) && (
                <div
                    className="flex flex-wrap items-end gap-4 pt-4"
                    style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}
                >
                    {/* Watch Model Dropdown */}
                    {availableWatchModels.length > 0 && (
                        <div>
                            <label className="block text-xs font-medium mb-1.5" style={{ color: '#9CA3AF' }}>
                                ⌚ Modelo
                            </label>
                            <select
                                className="px-4 py-2.5 rounded-xl text-sm cursor-pointer min-w-[160px]"
                                style={{
                                    background: filters.watchModel ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                                    border: filters.watchModel ? '1px solid #3B82F6' : '1px solid rgba(255, 255, 255, 0.1)',
                                    color: filters.watchModel ? '#60A5FA' : 'white',
                                    outline: 'none',
                                    fontWeight: filters.watchModel ? '600' : '400',
                                    colorScheme: 'dark'
                                }}
                                value={filters.watchModel}
                                onChange={(e) => handleChange('watchModel', e.target.value)}
                            >
                                <option value="">Todos</option>
                                {availableWatchModels.map((model) => (
                                    <option key={model} value={model}>
                                        {model}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Watch Size Dropdown */}
                    {availableWatchSizes.length > 0 && (
                        <div>
                            <label className="block text-xs font-medium mb-1.5" style={{ color: '#9CA3AF' }}>
                                📐 Tamanho
                            </label>
                            <select
                                className="px-4 py-2.5 rounded-xl text-sm cursor-pointer min-w-[120px]"
                                style={{
                                    background: filters.watchSize ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                                    border: filters.watchSize ? '1px solid #3B82F6' : '1px solid rgba(255, 255, 255, 0.1)',
                                    color: filters.watchSize ? '#60A5FA' : 'white',
                                    outline: 'none',
                                    fontWeight: filters.watchSize ? '600' : '400',
                                    colorScheme: 'dark'
                                }}
                                value={filters.watchSize}
                                onChange={(e) => handleChange('watchSize', e.target.value)}
                            >
                                <option value="">Todos</option>
                                {availableWatchSizes.map((size) => (
                                    <option key={size} value={size}>
                                        {size}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Condition Filter Buttons */}
                    <div>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: '#9CA3AF' }}>
                            ✨ Condição
                        </label>
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleChange('watchCondition', '')}
                                className="px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 hover:scale-105"
                                style={getFilterButtonStyle(!filters.watchCondition)}
                            >
                                Todos
                            </button>
                            <button
                                onClick={() => handleChange('watchCondition', '99+')}
                                className="px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 hover:scale-105"
                                style={getFilterButtonStyle(filters.watchCondition === '99+', '#10B981')}
                            >
                                99新+
                            </button>
                            <button
                                onClick={() => handleChange('watchCondition', '95+')}
                                className="px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 hover:scale-105"
                                style={getFilterButtonStyle(filters.watchCondition === '95+', '#60A5FA')}
                            >
                                95新+
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Clear Filters */}
            {hasActiveFilters && (
                <button
                    onClick={clearFilters}
                    className="btn-ghost text-sm flex items-center gap-1 ml-auto"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Limpar filtros
                </button>
            )}
        </div>
    )
});

export default SearchFilters;
