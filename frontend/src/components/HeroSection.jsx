import { useState, useEffect, useRef } from 'react';
import SparkleButton from './SparkleButton';
import MiningLimitCard from './MiningLimitCard';
import SavedSellersPanel from './SavedSellersPanel';

// Available categories with their display info
const CATEGORIES = [
    { id: 'iphone', name: 'iPhone', icon: '📱', description: 'Filtros específicos para iPhones' },
    { id: 'applewatch', name: 'Apple Watch', icon: '⌚', description: 'Filtros para Apple Watches' },
    { id: 'generic', name: 'Genérico', icon: '📦', description: 'Filtros básicos para qualquer produto' }
];

/**
 * HeroSection - Página inicial com logo centralizada e search box
 * 
 * Props:
 * - onUrlChange: chamado quando URL válida é colada
 * - onMine: chamado quando mineração é iniciada
 * - isEvaluating: indica se está avaliando o vendedor
 * - isLoading: indica se está minerando
 * - isSellerVerified: indica se o vendedor foi verificado com sucesso
 * - onCategoryChange: chamado quando categoria é alterada
 * - selectedCategory: categoria selecionada atualmente
 * - miningInfo: { tier, used, limit } - informações de limite de mineração
 * - showLimitError: indica se deve mostrar erro de limite atingido
 * - onDismissLimitError: callback para resetar estado de erro
 */
function HeroSection({
    onUrlChange,
    onMine,
    isEvaluating,
    isLoading,
    isSellerVerified = false,
    onCategoryChange,
    selectedCategory = 'iphone',
    miningInfo = null,
    showLimitError = false,
    onDismissLimitError
}) {
    const [url, setUrl] = useState('');
    const [limit, setLimit] = useState(50);
    const [isInputFocused, setIsInputFocused] = useState(false);
    const lastEvaluatedUrl = useRef('');
    const [selectedPlatform, setSelectedPlatform] = useState('xianyu');
    const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
    const categoryDropdownRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target)) {
                setIsCategoryDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Get current category info
    const currentCategory = CATEGORIES.find(c => c.id === selectedCategory) || CATEGORIES[0];

    const isValidUrl = url.includes('goofish.com') || url.includes('xianyu.com') || url === '';

    // Quando a URL muda e é válida, dispara avaliação do vendedor
    useEffect(() => {
        const trimmedUrl = url.trim();
        const isValid = trimmedUrl.includes('goofish.com') || trimmedUrl.includes('xianyu.com');

        if (isValid && trimmedUrl !== lastEvaluatedUrl.current && onUrlChange) {
            lastEvaluatedUrl.current = trimmedUrl;
            onUrlChange(trimmedUrl);
        }
    }, [url, onUrlChange]);

    const handleSubmit = (e) => {
        e.preventDefault();
        // Só permite minerar se o vendedor foi verificado
        if (url.trim() && isValidUrl && isSellerVerified) {
            onMine(url.trim(), limit);
        }
    };

    // Botão só é habilitado quando vendedor está verificado
    const isButtonDisabled = isLoading || !url.trim() || !isValidUrl || !isSellerVerified || isEvaluating;

    return (
        <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
            {/* Logo Customizada */}
            <div className="mb-2 mt-[5px]">
                <img
                    src="/logo.svg"
                    alt="Logo Huofind"
                    className="h-32 md:h-48 w-auto object-contain drop-shadow-2xl"
                />
            </div>

            {/* Headline */}
            <h1 className="text-4xl md:text-5xl font-bold text-center mb-12" style={{ color: '#1F2937' }}>
                Encontre os melhores produtos
                <br />
                <span className="font-extrabold shiny-text">do Xianyu</span> em segundos
            </h1>

            {/* Search Box with Category Selector */}
            <form onSubmit={handleSubmit} className="w-full max-w-2xl">
                {/* Mining Limit Card - shows user tier and usage */}
                {miningInfo && (
                    <MiningLimitCard
                        tier={miningInfo.tier}
                        used={miningInfo.used}
                        limit={miningInfo.limit}
                        showLimitError={showLimitError}
                        onDismissError={onDismissLimitError}
                    />
                )}

                {/* URL Input + Category Dropdown Row */}
                <div className="flex gap-3 mb-6">
                    {/* URL Input Container */}
                    <div className="relative flex-1">
                        {/* Link icon with hover effect */}
                        <div
                            className="absolute left-5 top-1/2 -translate-y-1/2 transition-colors duration-200"
                            style={{
                                color: isInputFocused || url ? '#FF6B35' : '#9CA3AF'
                            }}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                            </svg>
                        </div>
                        <input
                            type="url"
                            className="search-box"
                            style={{
                                paddingLeft: '56px',
                                paddingRight: isEvaluating ? '180px' : (isSellerVerified && url.trim()) ? '190px' : '16px',
                                borderColor: !isValidUrl ? '#FCA5A5' : (isSellerVerified && url.trim()) ? '#10B981' : isInputFocused ? '#FF6B35' : undefined,
                                transition: 'padding 0.3s ease'
                            }}
                            placeholder="Cole a URL do perfil do vendedor..."
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            onFocus={() => setIsInputFocused(true)}
                            onBlur={() => setIsInputFocused(false)}
                            disabled={isLoading}
                        />

                        {/* Evaluating indicator - INSIDE input (Right side) */}
                        {isEvaluating && (
                            <div
                                className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg pointer-events-none"
                                style={{
                                    color: '#FF6B35',
                                    background: 'rgba(255, 107, 53, 0.08)'
                                }}
                            >
                                <div
                                    className="w-3.5 h-3.5 rounded-full animate-spin"
                                    style={{
                                        border: '2px solid #FF6B35',
                                        borderTopColor: 'transparent'
                                    }}
                                ></div>
                                <span className="font-medium text-xs whitespace-nowrap">Verificando...</span>
                            </div>
                        )}

                        {/* Verified indicator - INSIDE input (Right side) */}
                        {isSellerVerified && !isEvaluating && url.trim() && (
                            <div
                                className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg pointer-events-none"
                                style={{
                                    color: '#10B981',
                                    background: 'rgba(16, 185, 129, 0.08)'
                                }}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                <span className="font-medium text-xs whitespace-nowrap">Vendedor verificado!</span>
                            </div>
                        )}
                    </div>

                    {/* Category Dropdown Button */}
                    <div className="relative" ref={categoryDropdownRef}>
                        <button
                            type="button"
                            onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                            className="h-full px-4 rounded-2xl flex items-center gap-2 transition-all duration-200 hover:shadow-md"
                            style={{
                                background: 'white',
                                border: isCategoryDropdownOpen ? '2px solid var(--color-orange-400)' : '1px solid var(--color-cream-200)',
                                boxShadow: 'var(--shadow-soft)',
                                minWidth: '140px'
                            }}
                            disabled={isLoading}
                        >
                            <span className="text-xl">{currentCategory.icon}</span>
                            <span className="font-medium text-sm" style={{ color: '#374151' }}>{currentCategory.name}</span>
                            <svg
                                className={`w-4 h-4 ml-auto transition-transform duration-200 ${isCategoryDropdownOpen ? 'rotate-180' : ''}`}
                                fill="none"
                                stroke="#9CA3AF"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>

                        {/* Dropdown Menu */}
                        {isCategoryDropdownOpen && (
                            <div
                                className="absolute right-0 top-full mt-2 w-56 rounded-xl overflow-hidden z-50 animate-fade-in"
                                style={{
                                    background: 'white',
                                    boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
                                    border: '1px solid var(--color-cream-200)'
                                }}
                            >
                                {CATEGORIES.map((category) => (
                                    <button
                                        key={category.id}
                                        type="button"
                                        onClick={() => {
                                            if (onCategoryChange) onCategoryChange(category.id);
                                            setIsCategoryDropdownOpen(false);
                                        }}
                                        className="w-full px-4 py-3 flex items-center gap-3 transition-all duration-150 hover:bg-cream-50 group"
                                        style={{
                                            background: selectedCategory === category.id ? 'var(--color-orange-50)' : 'transparent',
                                            borderLeft: selectedCategory === category.id ? '3px solid var(--color-orange-500)' : '3px solid transparent'
                                        }}
                                    >
                                        <span className="text-2xl transition-transform duration-200 group-hover:scale-120 group-hover:rotate-6">
                                            {category.icon}
                                        </span>
                                        <div className="text-left transition-transform duration-200 group-hover:translate-x-1">
                                            <p className="font-semibold text-sm" style={{ color: selectedCategory === category.id ? 'var(--color-orange-600)' : '#374151' }}>
                                                {category.name}
                                            </p>
                                            <p className="text-xs" style={{ color: '#9CA3AF' }}>{category.description}</p>
                                        </div>
                                        {selectedCategory === category.id && (
                                            <svg className="w-4 h-4 ml-auto animate-in fade-in zoom-in duration-300" fill="var(--color-orange-500)" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>                {/* Limit Slider */}
                <div
                    className="mb-6 p-4 rounded-2xl"
                    style={{
                        background: 'white',
                        border: '1px solid var(--color-cream-200)',
                        boxShadow: 'var(--shadow-soft)'
                    }}
                >
                    <div className="flex items-center justify-between mb-3">
                        <label className="font-medium text-sm" style={{ color: '#374151' }}>
                            📦 Limite de Produtos
                        </label>
                        <span
                            className="text-lg font-bold px-3 py-1 rounded-lg"
                            style={{
                                background: 'var(--color-orange-500)',
                                color: 'white'
                            }}
                        >
                            {limit}
                        </span>
                    </div>
                    <input
                        type="range"
                        min="10"
                        max="500"
                        step="10"
                        value={limit}
                        onChange={(e) => setLimit(parseInt(e.target.value))}
                        className="w-full h-3 rounded-full appearance-none cursor-pointer"
                        style={{
                            background: `linear-gradient(to right, var(--color-orange-500) 0%, var(--color-orange-500) ${(limit - 10) / 490 * 100}%, var(--color-cream-200) ${(limit - 10) / 490 * 100}%, var(--color-cream-200) 100%)`,
                        }}
                        disabled={isLoading}
                    />
                    <div className="flex justify-between text-xs mt-2" style={{ color: '#9CA3AF' }}>
                        <span>10</span>
                        <span>250</span>
                        <span>500</span>
                    </div>
                </div>

                <SparkleButton
                    type="submit"
                    disabled={isButtonDisabled}
                    isLoading={isLoading}
                    valid={isSellerVerified && url.trim() && isValidUrl}
                >
                    {isEvaluating ? 'Aguardando verificação...' : 'Iniciar Mineração'}
                </SparkleButton>
            </form >

            {/* Saved Sellers - Quick Access */}
            <SavedSellersPanel onSelectSeller={(sellerUrl) => {
                setUrl(sellerUrl);
                lastEvaluatedUrl.current = ''; // Reset to trigger evaluation
            }} />

            {/* Feature Cards */}
            < div className="flex flex-wrap justify-center gap-4 mt-12 max-w-2xl" >
                {/* Xianyu - Active/Selectable */}
                < div
                    className="feature-card flex items-center gap-3 cursor-pointer group transition-all duration-300"
                    onClick={() => setSelectedPlatform('xianyu')
                    }
                    style={{
                        borderColor: selectedPlatform === 'xianyu' ? 'var(--color-orange-400)' : 'transparent',
                        background: selectedPlatform === 'xianyu' ? '#FFF' : '#FFF',
                        boxShadow: selectedPlatform === 'xianyu' ? '0 0 0 3px rgba(255, 107, 53, 0.15)' : 'var(--shadow-soft)'
                    }}
                >
                    <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300"
                        style={{
                            background: selectedPlatform === 'xianyu' ? 'var(--color-orange-500)' : 'rgba(255, 107, 53, 0.1)',
                        }}
                    >
                        <img
                            src="/xianyu-logo.svg"
                            alt="Xianyu Icon"
                            className="w-6 h-6 object-contain"
                            style={{
                                filter: selectedPlatform === 'xianyu' ? 'brightness(0) invert(1)' : 'none'
                            }}
                        />
                    </div>
                    <div>
                        <p className="font-semibold" style={{ color: selectedPlatform === 'xianyu' ? 'var(--color-orange-600)' : '#1F2937' }}>
                            Xianyu
                        </p>
                        <p className="text-xs" style={{ color: '#6B7280' }}>Goofish China</p>
                    </div>
                </div >

                {/* Feature 2 - Pinduoduo (Disabled) */}
                < div className="feature-card-disabled flex items-center gap-3" >
                    <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ background: '#E5E7EB' }}
                    >
                        <span className="text-xl grayscale opacity-50">🛍️</span>
                    </div>
                    <div>
                        <p className="font-semibold" style={{ color: '#9CA3AF' }}>Yupoo</p>
                        <p className="text-xs" style={{ color: '#9CA3AF' }}>Em breve</p>
                    </div>
                </div >

                {/* Feature 3 - Poizon (Disabled) */}
                < div className="feature-card-disabled flex items-center gap-3" >
                    <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ background: '#E5E7EB' }}
                    >
                        <span className="text-xl grayscale opacity-50">👟</span>
                    </div>
                    <div>
                        <p className="font-semibold" style={{ color: '#9CA3AF' }}>Taobao</p>
                        <p className="text-xs" style={{ color: '#9CA3AF' }}>Em breve</p>
                    </div>
                </div >
            </div >
        </div >
    );
}

export default HeroSection;
