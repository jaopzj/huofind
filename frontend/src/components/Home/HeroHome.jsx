import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LuSearch,
    LuClock,
    LuX,
    LuExternalLink,
    LuSparkles,
    LuCommand,
    LuPackage,
} from 'react-icons/lu';
import { proxyImage } from '../../utils/imageProxy';
import AnimatedLogo from '../AnimatedLogo';import { formatAffiliateUrl } from '../../utils/affiliateLinks';

// Local storage key for search history
const SEARCH_HISTORY_KEY = 'evo_society_search_history';
const MAX_HISTORY_ITEMS = 5;

/**
 * HeroHome - Welcome header + command-bar search.
 *
 * Composed of:
 *   1. Time-aware greeting with user name
 *   2. Meta row (date + kbd hint)
 *   3. Slim search input w/ live product + history suggestions
 *
 * The old centered-logo hero was removed — branding is already present in
 * the sidebar, so the home page leads with context and intent instead.
 */

function getGreeting() {
    const h = new Date().getHours();
    if (h < 5) return 'Boa madrugada';
    if (h < 12) return 'Bom dia';
    if (h < 18) return 'Boa tarde';
    return 'Boa noite';
}

function formatDate() {
    const formatter = new Intl.DateTimeFormat('pt-BR', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
    });
    const text = formatter.format(new Date());
    return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Returns the current Asia/Shanghai date + time as separate tokens.
 * Relies on Intl timeZone handling so it always tracks wall-clock in China.
 */
function formatShanghaiClock() {
    const now = new Date();
    const time = new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'Asia/Shanghai',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    }).format(now);
    const dateShort = new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'Asia/Shanghai',
        day: '2-digit',
        month: 'short',
    }).format(now);
    return { time, dateShort };
}

function HeroHome({ onSearch, initialQuery = '', isGuest = false, user = null }) {
    const [query, setQuery] = useState(initialQuery);
    const [isFocused, setIsFocused] = useState(false);
    const [searchHistory, setSearchHistory] = useState([]);
    const [allProducts, setAllProducts] = useState([]);
    const [, setIsLoadingProducts] = useState(true);
    const [isShaking, setIsShaking] = useState(false);
    const [showFlash, setShowFlash] = useState(false);
    const [showUpgradeBadge, setShowUpgradeBadge] = useState(false);
    const inputRef = useRef(null);
    const containerRef = useRef(null);

    const greeting = useMemo(() => getGreeting(), []);
    const dateLabel = useMemo(() => formatDate(), []);
    const firstName = useMemo(() => {
        if (!user?.name) return '';
        return user.name.trim().split(' ')[0];
    }, [user]);

    // Live Asia/Shanghai clock — updates every second
    const [shanghaiClock, setShanghaiClock] = useState(() => formatShanghaiClock());
    useEffect(() => {
        const id = setInterval(() => setShanghaiClock(formatShanghaiClock()), 1000);
        return () => clearInterval(id);
    }, []);

    // Load search history from localStorage
    useEffect(() => {
        try {
            const saved = localStorage.getItem(SEARCH_HISTORY_KEY);
            if (saved) setSearchHistory(JSON.parse(saved));
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
                const promises = fileList.map((file) =>
                    fetch(`/data/yupoo/${file}`).then((res) => res.json())
                );
                const results = await Promise.all(promises);
                let products = [];
                results.forEach((data) => {
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

    // Keyboard shortcut: Ctrl/Cmd + K focuses the search bar
    useEffect(() => {
        const handleShortcut = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                if (!isGuest) inputRef.current?.focus();
            }
        };
        window.addEventListener('keydown', handleShortcut);
        return () => window.removeEventListener('keydown', handleShortcut);
    }, [isGuest]);

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
        setSearchHistory((prev) => {
            const filtered = prev.filter(
                (item) => item.toLowerCase() !== trimmed.toLowerCase()
            );
            const updated = [trimmed, ...filtered].slice(0, MAX_HISTORY_ITEMS);
            try {
                localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
            } catch (err) {
                console.error('[HeroHome] Error saving search history:', err);
            }
            return updated;
        });
    };

    const removeFromHistory = (index, e) => {
        e.stopPropagation();
        setSearchHistory((prev) => {
            const updated = prev.filter((_, i) => i !== index);
            try {
                localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
            } catch (err) {
                console.error('[HeroHome] Error saving search history:', err);
            }
            return updated;
        });
    };

    const getProductImage = (p) =>
        proxyImage(p.image || p.imagem || p.product_image || null);

    // Filtered product suggestions
    const productSuggestions = useMemo(() => {
        if (!query.trim() || query.length < 2) return [];
        const lowerQuery = query.toLowerCase();
        const matches = allProducts.filter((p) => {
            const title = (p.titulo || p.title || '').toLowerCase();
            const brand = (p.marca || p.brand || '').toLowerCase();
            const model = (p.modelo || p.model || '').toLowerCase();
            return (
                title.includes(lowerQuery) ||
                brand.includes(lowerQuery) ||
                model.includes(lowerQuery)
            );
        });
        const withImages = matches.filter((p) => getProductImage(p));
        const withoutImages = matches.filter((p) => !getProductImage(p));
        return [...withImages, ...withoutImages].slice(0, 5);
    }, [query, allProducts]);

    const handleSubmit = (e) => {
        e.preventDefault();
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
        if (url) window.open(formatAffiliateUrl(url), '_blank');
        setIsFocused(false);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') handleSubmit(e);
        if (e.key === 'Escape') setIsFocused(false);
    };

    const showDropdown =
        isFocused && (searchHistory.length > 0 || productSuggestions.length > 0);

    return (
        <section className="home-welcome">
            {/* Atmospheric gradient behind welcome */}
            <div className="home-welcome-aurora" aria-hidden="true">
                <div className="home-welcome-orb home-welcome-orb-a" />
                <div className="home-welcome-orb home-welcome-orb-b" />
            </div>

            <div className="home-welcome-inner">
                {/* Floating logo — top-right corner */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    className="home-welcome-floating-logo"
                >
                    <AnimatedLogo className="home-welcome-floating-logo-media" />
                </motion.div>

                {/* Meta pill — date + live Shanghai clock */}
                <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, delay: 0.06 }}
                    className="home-welcome-meta"
                >
                    <span className="home-welcome-meta-date">{dateLabel}</span>
                    <span className="home-welcome-meta-divider" />
                    <span className="home-welcome-meta-clock" title="Horário de Xangai (Asia/Shanghai)">
                        <LuClock size={12} strokeWidth={2.2} />
                        <span className="home-welcome-meta-clock-label">Xangai</span>
                        <span className="home-welcome-meta-clock-sep">·</span>
                        <span className="home-welcome-meta-clock-time">
                            {shanghaiClock.time}
                        </span>
                        <span className="home-welcome-meta-clock-date">
                            {shanghaiClock.dateShort}
                        </span>
                    </span>
                </motion.div>

                {/* Greeting */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.08 }}
                    className="home-welcome-heading"
                >
                    <h1 className="home-welcome-title">
                        {greeting}
                        {firstName ? ',' : ''}{' '}
                        {firstName && (
                            <span className="home-welcome-title-accent">
                                {firstName}
                            </span>
                        )}
                    </h1>
                    <p className="home-welcome-subtitle">
                        O que você gostaria de encontrar hoje?
                    </p>
                </motion.div>

                {/* Search */}
                <motion.div
                    ref={containerRef}
                    className="home-search-container"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.18 }}
                >
                    <form onSubmit={handleSubmit}>
                        <div className="relative">
                            <div
                                className={`home-search-shell ${showDropdown ? 'is-open' : ''} ${isShaking ? 'search-shake-animation' : ''} ${showFlash ? 'search-error-flash' : ''}`}
                            >
                                <LuSearch
                                    className="home-search-icon-svg"
                                    size={18}
                                    strokeWidth={2}
                                />
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    onFocus={() => {
                                        if (isGuest) {
                                            setIsShaking(true);
                                            setShowFlash(true);
                                            setShowUpgradeBadge(true);
                                            setTimeout(() => {
                                                setIsShaking(false);
                                                setShowFlash(false);
                                            }, 600);
                                            inputRef.current?.blur();
                                            return;
                                        }
                                        setIsFocused(true);
                                    }}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Buscar produtos, marcas ou categorias no catálogo Yupoo"
                                    className="home-search-input-new"
                                    autoComplete="off"
                                />

                                {query && (
                                    <button
                                        type="button"
                                        onClick={() => setQuery('')}
                                        className="home-search-clear"
                                        aria-label="Limpar busca"
                                    >
                                        <LuX size={16} />
                                    </button>
                                )}

                                <div className="home-search-kbd">
                                    <LuCommand size={11} />
                                    <span>K</span>
                                </div>
                            </div>

                            {/* Dropdown */}
                            <AnimatePresence>
                                {showDropdown && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -4 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -4 }}
                                        transition={{ duration: 0.18 }}
                                        className="home-search-dropdown"
                                    >
                                        {productSuggestions.length > 0 && (
                                            <div className="home-search-group">
                                                <div className="home-search-group-label">
                                                    Produtos
                                                </div>
                                                {productSuggestions.map(
                                                    (product, index) => {
                                                        const imageUrl =
                                                            getProductImage(product);
                                                        return (
                                                            <button
                                                                key={
                                                                    product.product_url ||
                                                                    index
                                                                }
                                                                onClick={(e) =>
                                                                    handleProductClick(
                                                                        product,
                                                                        e
                                                                    )
                                                                }
                                                                className="home-search-result"
                                                            >
                                                                <div className="home-search-result-thumb">
                                                                    {imageUrl ? (
                                                                        <img
                                                                            src={imageUrl}
                                                                            alt=""
                                                                            loading="lazy"
                                                                            onError={(e) => {
                                                                                e.target.style.display =
                                                                                    'none';
                                                                            }}
                                                                        />
                                                                    ) : (
                                                                        <LuPackage
                                                                            size={16}
                                                                            className="home-search-result-fallback"
                                                                        />
                                                                    )}
                                                                </div>
                                                                <div className="home-search-result-info">
                                                                    <p className="home-search-result-title">
                                                                        {product.titulo ||
                                                                            product.title ||
                                                                            'Produto sem nome'}
                                                                    </p>
                                                                    <p className="home-search-result-meta">
                                                                        {product.preco
                                                                            ? `¥ ${product.preco}`
                                                                            : '—'}
                                                                        {product.marca &&
                                                                            ` · ${product.marca}`}
                                                                    </p>
                                                                </div>
                                                                <LuExternalLink
                                                                    size={14}
                                                                    className="home-search-result-ext"
                                                                />
                                                            </button>
                                                        );
                                                    }
                                                )}
                                            </div>
                                        )}

                                        {productSuggestions.length > 0 &&
                                            searchHistory.length > 0 && (
                                                <div className="home-search-divider" />
                                            )}

                                        {searchHistory.length > 0 && (
                                            <div className="home-search-group">
                                                <div className="home-search-group-label">
                                                    Buscas recentes
                                                </div>
                                                {searchHistory.map((term, index) => (
                                                    <div
                                                        key={index}
                                                        className="home-search-history-item"
                                                        onClick={() =>
                                                            handleHistoryClick(term)
                                                        }
                                                    >
                                                        <LuClock
                                                            size={14}
                                                            className="home-search-history-icon"
                                                        />
                                                        <span className="home-search-history-term">
                                                            {term}
                                                        </span>
                                                        <button
                                                            onClick={(e) =>
                                                                removeFromHistory(index, e)
                                                            }
                                                            className="home-search-history-remove"
                                                            aria-label="Remover"
                                                        >
                                                            <LuX size={12} />
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

                    {/* Upgrade Badge for Guests */}
                    <AnimatePresence>
                        {showUpgradeBadge && (
                            <motion.div
                                initial={{ opacity: 0, y: -6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -6 }}
                                className="home-upgrade-badge"
                            >
                                <LuSparkles className="w-4 h-4" />
                                <span>
                                    Faça um upgrade para pesquisar itens da Yupoo
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setShowUpgradeBadge(false)}
                                    className="home-upgrade-badge-close"
                                    aria-label="Fechar"
                                >
                                    <LuX size={13} />
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            </div>
        </section>
    );
}

export default HeroHome;
