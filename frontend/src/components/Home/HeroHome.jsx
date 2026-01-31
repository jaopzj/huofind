import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LuSearch, LuClock, LuX, LuExternalLink, LuSparkles } from 'react-icons/lu';

// Local storage key for search history
const SEARCH_HISTORY_KEY = 'huofind_search_history';
const MAX_HISTORY_ITEMS = 5;

/**
 * HeroHome - Hero section with centered logo and search input
 * Features: search history, product suggestions dropdown (Google-style)
 */
function HeroHome({ onSearch, initialQuery = '', isGuest = false }) {
    const [query, setQuery] = useState(initialQuery);
    const [isFocused, setIsFocused] = useState(false);
    const [searchHistory, setSearchHistory] = useState([]);
    const [allProducts, setAllProducts] = useState([]);
    const [isLoadingProducts, setIsLoadingProducts] = useState(true);
    const [isShaking, setIsShaking] = useState(false);
    const [showFlash, setShowFlash] = useState(false);
    const [showUpgradeBadge, setShowUpgradeBadge] = useState(false);
    const inputRef = useRef(null);
    const containerRef = useRef(null);

    // Load search history from localStorage
    useEffect(() => {
        try {
            const saved = localStorage.getItem(SEARCH_HISTORY_KEY);
            if (saved) {
                setSearchHistory(JSON.parse(saved));
            }
        } catch (err) {
            console.error('[HeroHome] Error loading search history:', err);
        }
    }, []);

    // Load products for suggestions
    useEffect(() => {
        const loadProducts = async () => {
            try {
                const manifestRes = await fetch('/data/yupoo/manifest.json');
                if (!manifestRes.ok) return;

                const fileList = await manifestRes.json();

                // Load all files for comprehensive search
                const promises = fileList.map(file =>
                    fetch(`/data/yupoo/${file}`).then(res => res.json())
                );

                const results = await Promise.all(promises);
                let products = [];

                results.forEach(data => {
                    if (data.products && Array.isArray(data.products)) {
                        products = [...products, ...data.products];
                    }
                });

                setAllProducts(products);
            } catch (err) {
                console.error('[HeroHome] Error loading products:', err);
            } finally {
                setIsLoadingProducts(false);
            }
        };

        loadProducts();
    }, []);

    // Auto-focus on desktop
    useEffect(() => {
        const isMobile = window.innerWidth < 768;
        if (!isMobile && inputRef.current) {
            inputRef.current.focus();
        }
    }, []);

    // Handle click outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsFocused(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Save search to history
    const saveToHistory = (searchTerm) => {
        const trimmed = searchTerm.trim();
        if (!trimmed) return;

        setSearchHistory(prev => {
            const filtered = prev.filter(item => item.toLowerCase() !== trimmed.toLowerCase());
            const updated = [trimmed, ...filtered].slice(0, MAX_HISTORY_ITEMS);

            try {
                localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
            } catch (err) {
                console.error('[HeroHome] Error saving search history:', err);
            }

            return updated;
        });
    };

    // Remove item from history
    const removeFromHistory = (index, e) => {
        e.stopPropagation();
        setSearchHistory(prev => {
            const updated = prev.filter((_, i) => i !== index);
            try {
                localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
            } catch (err) {
                console.error('[HeroHome] Error saving search history:', err);
            }
            return updated;
        });
    };

    // Helper to get product image URL (handles multiple field names)
    const getProductImage = (p) => {
        return p.image || p.imagem || p.product_image || null;
    };

    // Get filtered product suggestions based on query
    const productSuggestions = useMemo(() => {
        if (!query.trim() || query.length < 2) return [];

        const lowerQuery = query.toLowerCase();
        const matches = allProducts.filter(p => {
            const title = (p.titulo || p.title || '').toLowerCase();
            const brand = (p.marca || p.brand || '').toLowerCase();
            const model = (p.modelo || p.model || '').toLowerCase();
            return title.includes(lowerQuery) || brand.includes(lowerQuery) || model.includes(lowerQuery);
        });

        // Prioritize products with images
        const withImages = matches.filter(p => getProductImage(p));
        const withoutImages = matches.filter(p => !getProductImage(p));

        return [...withImages, ...withoutImages].slice(0, 5);
    }, [query, allProducts]);

    const handleSubmit = (e) => {
        e.preventDefault();

        // If guest, show shake animation and upgrade badge
        if (isGuest) {
            setIsShaking(true);
            setShowFlash(true);
            setShowUpgradeBadge(true);

            setTimeout(() => {
                setIsShaking(false);
                setShowFlash(false);
            }, 600);

            return;
        }

        if (query.trim()) {
            saveToHistory(query);
            onSearch(query.trim());
            setIsFocused(false);
        }
    };

    const handleHistoryClick = (term) => {
        setQuery(term);
        saveToHistory(term);
        onSearch(term);
        setIsFocused(false);
    };

    const handleProductClick = (product, e) => {
        e.stopPropagation();
        const url = product.product_url || product.url;
        if (url) {
            window.open(url, '_blank');
        }
        setIsFocused(false);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleSubmit(e);
        }
        if (e.key === 'Escape') {
            setIsFocused(false);
        }
    };

    const showDropdown = isFocused && (searchHistory.length > 0 || productSuggestions.length > 0);

    return (
        <section className="home-hero">
            {/* Logo */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <video
                    src="/evo-logo.webm"
                    autoPlay
                    loop
                    muted
                    className="h-24 md:h-54 w-auto object-contain"
                />
            </motion.div>

            {/* Search Container - Google Style */}
            <motion.div
                ref={containerRef}
                className="home-search-container"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
            >
                <form onSubmit={handleSubmit}>
                    <div className="relative">
                        <div
                            className={`relative bg-white transition-all duration-200 ${showDropdown
                                ? 'rounded-t-2xl shadow-lg border border-gray-200 border-b-0'
                                : 'rounded-2xl shadow-md border border-gray-200 hover:shadow-lg'
                                } ${isShaking ? 'search-shake-animation' : ''} ${showFlash ? 'search-error-flash' : ''}`}
                        >
                            <LuSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                ref={inputRef}
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onFocus={() => {
                                    // If guest, show shake animation and upgrade badge on focus
                                    if (isGuest) {
                                        setIsShaking(true);
                                        setShowFlash(true);
                                        setShowUpgradeBadge(true);

                                        setTimeout(() => {
                                            setIsShaking(false);
                                            setShowFlash(false);
                                        }, 600);

                                        // Blur input to prevent typing
                                        inputRef.current?.blur();
                                        return;
                                    }
                                    setIsFocused(true);
                                }}
                                onKeyDown={handleKeyDown}
                                placeholder="Busque produtos da Yupoo por nome, categoria ou palavra-chave"
                                className="w-full py-4 pl-12 pr-12 bg-transparent text-gray-800 placeholder-gray-400 focus:outline-none text-base font-medium"
                                autoComplete="off"
                            />

                            {query && (
                                <button
                                    type="button"
                                    onClick={() => setQuery('')}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                                >
                                    <LuX size={18} />
                                </button>
                            )}
                        </div>

                        {/* Dropdown - Google Style */}
                        <AnimatePresence>
                            {showDropdown && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.15 }}
                                    className="absolute left-0 right-0 top-full bg-white rounded-b-2xl border border-gray-200 border-t-0 shadow-lg overflow-hidden z-50"
                                >
                                    <div className="mx-4 border-t border-gray-100" />

                                    {/* Product Suggestions */}
                                    {productSuggestions.length > 0 && (
                                        <div className="py-2">
                                            {productSuggestions.map((product, index) => {
                                                const imageUrl = getProductImage(product);
                                                return (
                                                    <button
                                                        key={product.product_url || index}
                                                        onClick={(e) => handleProductClick(product, e)}
                                                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left group"
                                                    >
                                                        {/* Thumbnail */}
                                                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                                                            {imageUrl ? (
                                                                <img
                                                                    src={imageUrl}
                                                                    alt=""
                                                                    className="w-full h-full object-cover"
                                                                    loading="lazy"
                                                                    onError={(e) => {
                                                                        e.target.onerror = null;
                                                                        e.target.src = '';
                                                                        e.target.parentNode.innerHTML = '<div class="w-full h-full flex items-center justify-center text-gray-300 text-lg">📦</div>';
                                                                    }}
                                                                />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-gray-300 text-lg">
                                                                    📦
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Product Info */}
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium text-gray-800 truncate">
                                                                {product.titulo || product.title || 'Produto sem nome'}
                                                            </p>
                                                            <p className="text-xs text-gray-500">
                                                                {product.preco ? `¥ ${product.preco}` : '—'}
                                                                {product.marca && ` · ${product.marca}`}
                                                            </p>
                                                        </div>

                                                        <LuExternalLink
                                                            size={16}
                                                            className="text-gray-300 group-hover:text-blue-500 transition-colors flex-shrink-0"
                                                        />
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {productSuggestions.length > 0 && searchHistory.length > 0 && (
                                        <div className="mx-4 border-t border-gray-100" />
                                    )}

                                    {/* Search History */}
                                    {searchHistory.length > 0 && (
                                        <div className="py-2">
                                            {searchHistory.map((term, index) => (
                                                <div
                                                    key={index}
                                                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors group cursor-pointer"
                                                    onClick={() => handleHistoryClick(term)}
                                                >
                                                    <LuClock size={16} className="text-gray-400 flex-shrink-0" />
                                                    <span className="flex-1 text-sm text-gray-700 truncate">
                                                        {term}
                                                    </span>
                                                    <button
                                                        onClick={(e) => removeFromHistory(index, e)}
                                                        className="p-1 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                                                    >
                                                        <LuX size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </form>

                {!showDropdown && !showUpgradeBadge && (
                    <p className="text-center text-xs text-gray-400 mt-3">
                        Pressione <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-500 font-mono text-[10px]">Enter</kbd> para buscar
                    </p>
                )}

                {/* Upgrade Badge for Guests */}
                <AnimatePresence>
                    {showUpgradeBadge && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="flex items-center justify-center gap-2 mt-4 px-4 py-3 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border border-orange-200"
                        >
                            <LuSparkles className="w-4 h-4 text-orange-500" />
                            <span className="text-sm font-medium text-orange-700">
                                Faça um upgrade para pesquisar itens da Yupoo
                            </span>
                            <button
                                type="button"
                                onClick={() => setShowUpgradeBadge(false)}
                                className="ml-2 p-1 rounded-full hover:bg-orange-100 transition-colors"
                            >
                                <LuX size={14} className="text-orange-500" />
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </section>
    );
}

export default HeroHome;
