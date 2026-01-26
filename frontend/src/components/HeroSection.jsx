import { useState, useEffect, useRef } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';
import SparkleButton from './SparkleButton';
import { Slider } from './ui/slider';

// Available categories with their display info
const CATEGORIES = [
    { id: 'iphone', name: 'iPhone', icon: '📱', description: 'Filtros específicos para iPhones' },
    { id: 'applewatch', name: 'Apple Watch', icon: '⌚', description: 'Filtros para Apple Watches' },
    { id: 'generic', name: 'Genérico', icon: '📦', description: 'Filtros básicos para qualquer produto' }
];

const AnimatedNumber = ({ value }) => {
    const spring = useSpring(value, { mass: 0.8, stiffness: 75, damping: 15 });
    const display = useTransform(spring, (current) => Math.round(current));

    useEffect(() => {
        spring.set(value);
    }, [value, spring]);

    return <motion.span>{display}</motion.span>;
};

/**
 * HeroSection - Página inicial com logo centralizada e search box
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
    onDismissLimitError,
    initialUrl = ''
}) {
    const [url, setUrl] = useState(initialUrl);

    // Sync internal url with initialUrl prop when it changes from parent
    useEffect(() => {
        if (initialUrl !== url) {
            setUrl(initialUrl);
        }
    }, [initialUrl]);
    const [limit, setLimit] = useState(() => {
        // Default limit: 30 for guests (updated), 50+ for paid tiers
        const isGuest = !miningInfo?.tier ||
            miningInfo.tier.toLowerCase() === 'guest' ||
            miningInfo.tier.toLowerCase() === 'convidado';

        // Use maxProducts if available, otherwise fallback based on tier
        return miningInfo?.maxProducts || (isGuest ? 30 : 50);
    });
    const [isInputFocused, setIsInputFocused] = useState(false);
    const lastEvaluatedUrl = useRef('');
    const [selectedPlatform, setSelectedPlatform] = useState('xianyu');
    const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
    const categoryDropdownRef = useRef(null);

    // Update limit when miningInfo changes (e.g. after auth load)
    useEffect(() => {
        if (miningInfo?.maxProducts) {
            setLimit(miningInfo.maxProducts);
        }
    }, [miningInfo]);

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

    // Check tier for UI logic
    const isGuest = !miningInfo?.tier ||
        miningInfo.tier.toLowerCase() === 'guest' ||
        miningInfo.tier.toLowerCase() === 'convidado';

    const maxLimit = miningInfo?.maxProducts || (isGuest ? 30 : 50);

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

    // Botão só é habilitado quando vendedor está verificado e tem limite
    const isLimitReached = miningInfo && miningInfo.credits <= 0;
    const isButtonDisabled = isLoading || !url.trim() || !isValidUrl || !isSellerVerified || isEvaluating || isLimitReached;

    return (
        <div className="h-[calc(100vh-7rem)] md:h-full flex flex-col items-center justify-center px-4 md:px-6 py-2 md:py-8 overflow-y-auto">
            {/* Logo Customizada */}
            <div className="mb-2 mt-0 md:mt-[5px]">
                <img
                    src="/logo.svg"
                    alt="Logo Huofind"
                    className="h-20 md:h-48 w-auto object-contain drop-shadow-2xl"
                />
            </div>

            {/* Headline */}
            <h1 className="text-2xl md:text-5xl font-bold text-center mb-6 md:mb-12" style={{ color: '#1F2937' }}>
                Encontre os melhores produtos
                <br />
                <span className="font-extrabold shiny-text">do Xianyu</span> em segundos
            </h1>

            {/* Search Box with Category Selector */}
            <form onSubmit={handleSubmit} className="w-full max-w-2xl">
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
                            <AnimatedNumber value={limit} />
                        </span>
                    </div>
                    <Slider
                        value={[limit]}
                        max={maxLimit}
                        min={10}
                        step={10}
                        onValueChange={(vals) => setLimit(vals[0])}
                        showTooltip={false}
                        disabled={isLoading}
                        className="w-full py-4"
                    />
                    <div className="flex justify-between text-xs mt-2" style={{ color: '#9CA3AF' }}>
                        <span>10</span>
                        <span>{Math.round(maxLimit / 2)}</span>
                        <span>{maxLimit}</span>
                    </div>
                </div>

                <SparkleButton
                    type="submit"
                    disabled={isButtonDisabled}
                    isLoading={isLoading}
                    valid={isSellerVerified && url.trim() && isValidUrl}
                >
                    {isEvaluating ? 'Aguardando verificação...' : isLimitReached ? 'Créditos esgotados' : 'Iniciar Mineração'}
                </SparkleButton>
            </form >


        </div >
    );
}

export default HeroSection;
