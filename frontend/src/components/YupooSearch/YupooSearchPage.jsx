import { useState, useEffect, useMemo, memo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LuSearch, LuFilter, LuX, LuChevronLeft, LuChevronRight, LuArrowDownUp, LuCheck, LuChevronDown } from 'react-icons/lu';
import WifiLoader from '../WifiLoader';
import { Slider } from '../ui/slider';
import SaveBookmarkButton from '../SaveBookmarkButton';
import UpgradeModal from '../UpgradeModal';


const SORT_OPTIONS = [
    { id: 'default', label: 'Padrão' },
    { id: 'price-asc', label: 'Menor Preço' },
    { id: 'price-desc', label: 'Maior Preço' },
    { id: 'alpha-asc', label: 'A-Z' },
];

export default function YupooSearchPage({
    showBRL = false,
    onToggleCurrency = () => { },
    exchangeRate = 0,
    savedProductUrls = [],
    onSaveToggle,
    isGuest = false
}) {
    // State for data
    const [allProducts, setAllProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // State for filters
    const [keyword, setKeyword] = useState('');
    const [debouncedKeyword, setDebouncedKeyword] = useState('');
    const [selectedCategories, setSelectedCategories] = useState([]);
    const [selectedBrands, setSelectedBrands] = useState([]);
    const [selectedBatches, setSelectedBatches] = useState([]);
    const [selectedModels, setSelectedModels] = useState([]);
    const [isShoesExpanded, setIsShoesExpanded] = useState(false);

    // Price & Sort State
    const [priceRange, setPriceRange] = useState([0, 2000]); // [min, max]
    const [globalPriceRange, setGlobalPriceRange] = useState([0, 2000]); // To track absolute min/max
    const [sortBy, setSortBy] = useState('default');
    const [isSortOpen, setIsSortOpen] = useState(false);
    const sortRef = useRef(null);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(25); // Default PC logic

    // Guest upgrade modal state
    const [showUpgradeModal, setShowUpgradeModal] = useState(isGuest);

    // Click outside to close sort
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (sortRef.current && !sortRef.current.contains(event.target)) {
                setIsSortOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Debounce keyword
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedKeyword(keyword);
        }, 300);
        return () => clearTimeout(timer);
    }, [keyword]);

    // Handle Resize for Responsive Pagination Limit
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 768) {
                setItemsPerPage(16); // Mobile: 8x2 approx 16
            } else {
                setItemsPerPage(25); // PC: 5x5 = 25
            }
        };

        // Initial check
        handleResize();

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Check for search query or category filter from Home page navigation
    useEffect(() => {
        // Check for search query from Home
        const searchQuery = sessionStorage.getItem('yupoo_search_query');
        if (searchQuery) {
            setKeyword(searchQuery);
            sessionStorage.removeItem('yupoo_search_query');
        }

        // Check for category filter from Home
        const categoryFilter = sessionStorage.getItem('yupoo_category_filter');
        if (categoryFilter) {
            // Map category ID to actual category name if needed
            const categoryMap = {
                'roupas': 'Roupas',
                'camisetas': 'Camisetas',
                'calcados': 'Calçados',
                'moletons': 'Moletons',
                'calcas': 'Calças',
                'acessorios': 'Acessórios',
                'relogios': 'Relógios',
                'oculos': 'Óculos',
                'eletronicos': 'Eletrônicos'
            };
            const categoryName = categoryMap[categoryFilter] || categoryFilter;
            setSelectedCategories([categoryName]);
            sessionStorage.removeItem('yupoo_category_filter');
        }
    }, []);

    // Reset pagination when filters change
    // Reset pagination when filters change
    useEffect(() => {
        setCurrentPage(1);
        document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });
    }, [debouncedKeyword, selectedCategories, selectedBrands, selectedBatches, selectedModels, priceRange, sortBy, itemsPerPage]);

    // Scroll to top when page changes
    useEffect(() => {
        document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });
    }, [currentPage]);

    // Load data
    useEffect(() => {
        async function loadData() {
            try {
                // 1. Fetch manifest
                const manifestRes = await fetch('/data/yupoo/manifest.json');
                if (!manifestRes.ok) throw new Error('Failed to load data manifest');
                const fileList = await manifestRes.json();

                // 2. Fetch all files concurrently
                const promises = fileList.map(file =>
                    fetch(`/data/yupoo/${file}`).then(res => res.json())
                );

                const results = await Promise.all(promises);

                // 3. Merge products
                let merged = [];
                let minP = Infinity;
                let maxP = -Infinity;

                results.forEach(data => {
                    if (data.products && Array.isArray(data.products)) {
                        merged = [...merged, ...data.products];
                        // Calculate min/max price during merge
                        data.products.forEach(p => {
                            if (p.preco && p.preco > 0) {
                                if (p.preco < minP) minP = p.preco;
                                if (p.preco > maxP) maxP = p.preco;
                            }
                        });
                    }
                });

                // Fallback if no prices
                if (minP === Infinity) minP = 0;
                if (maxP === -Infinity) maxP = 1000;

                setGlobalPriceRange([minP, maxP]);
                setPriceRange([minP, maxP]);
                setAllProducts(merged);
                setLoading(false);
            } catch (err) {
                console.error("Error loading Yupoo data:", err);
                setError("Falha ao carregar produtos. Tente novamente mais tarde.");
                setLoading(false);
            }
        }

        loadData();
    }, []);

    // Derived state for filters (memoized to avoid recalculation)
    const { categories, brands, batches, models } = useMemo(() => {
        const catCount = {};
        const brandCount = {};
        const batchCount = {};
        const modelCount = {};

        allProducts.forEach(p => {
            if (p.categoria) {
                catCount[p.categoria] = (catCount[p.categoria] || 0) + 1;
            }
            if (p.marca) {
                brandCount[p.marca] = (brandCount[p.marca] || 0) + 1;
            }
            // Batch só se aplica a calçados
            if (p.batch && p.categoria === 'Calçados') {
                batchCount[p.batch] = (batchCount[p.batch] || 0) + 1;
            }
            if (p.modelo && p.categoria === 'Calçados') {
                modelCount[p.modelo] = (modelCount[p.modelo] || 0) + 1;
            }
        });

        const sortedCategories = Object.entries(catCount)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);

        const sortedBrands = Object.entries(brandCount)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);

        const sortedBatches = Object.entries(batchCount)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);

        const sortedModels = Object.entries(modelCount)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);

        return { categories: sortedCategories, brands: sortedBrands, batches: sortedBatches, models: sortedModels };
    }, [allProducts]);

    // Filter Logic (memoized)
    const filteredProducts = useMemo(() => {
        // 1. Filter
        let result = allProducts.filter(product => {
            // Keyword match
            if (debouncedKeyword) {
                const lowerKw = debouncedKeyword.toLowerCase();
                const matchTitle = product.titulo?.toLowerCase().includes(lowerKw);
                const matchBrand = product.marca?.toLowerCase().includes(lowerKw);
                const matchModel = product.modelo?.toLowerCase().includes(lowerKw);
                if (!matchTitle && !matchBrand && !matchModel) return false;
            }

            // Category match
            if (selectedCategories.length > 0) {
                if (!selectedCategories.includes(product.categoria)) return false;
            }

            // Brand match
            if (selectedBrands.length > 0) {
                if (!selectedBrands.includes(product.marca)) return false;
            }

            // Model match
            if (selectedModels.length > 0) {
                if (!selectedModels.includes(product.modelo)) return false;
            }

            // Batch match (only for Calçados)
            if (selectedBatches.length > 0) {
                if (!product.batch) return false;
                if (!selectedBatches.includes(product.batch)) return false;
            }

            // Price Range
            if (product.preco > 0) {
                if (product.preco < priceRange[0] || product.preco > priceRange[1]) return false;
            } else {
                if (priceRange[0] > 0) return false;
            }

            return true;
        });

        // 2. Sort
        if (sortBy !== 'default') {
            result.sort((a, b) => {
                if (sortBy === 'price-asc') {
                    const pA = a.preco || Infinity;
                    const pB = b.preco || Infinity;
                    return pA - pB;
                }
                if (sortBy === 'price-desc') {
                    const pA = a.preco || 0;
                    const pB = b.preco || 0;
                    return pB - pA;
                }
                if (sortBy === 'alpha-asc') {
                    return a.titulo.localeCompare(b.titulo);
                }
                return 0;
            });
        }

        return result;
    }, [allProducts, debouncedKeyword, selectedCategories, selectedBrands, selectedBatches, selectedModels, priceRange, sortBy]);

    // Pagination Calculation
    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
    const visibleProducts = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredProducts.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredProducts, currentPage, itemsPerPage]);

    // Handlers
    const toggleCategory = useCallback((cat) => {
        // If clicking 'Calçados', handle expansion logic if needed, but here we treat it as a filter
        // The expansion is handled by UI state
        setSelectedCategories(prev =>
            prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
        );
    }, []);

    const toggleBrand = useCallback((brand) => {
        setSelectedBrands(prev =>
            prev.includes(brand) ? prev.filter(b => b !== brand) : [...prev, brand]
        );
    }, []);

    const toggleBatch = useCallback((batch) => {
        setSelectedBatches(prev =>
            prev.includes(batch) ? prev.filter(b => b !== batch) : [...prev, batch]
        );
    }, []);

    const toggleModel = useCallback((model) => {
        setSelectedModels(prev =>
            prev.includes(model) ? prev.filter(m => m !== model) : [...prev, model]
        );
    }, []);

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <WifiLoader message="Carregando catálogo Yupoo..." />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex h-full items-center justify-center text-red-500">
                <p>{error}</p>
            </div>
        );
    }

    return (
        <>
            {/* Guest Upgrade Modal */}
            {isGuest && showUpgradeModal && (
                <UpgradeModal
                    isOpen={true}
                    title="Acesso restrito"
                    description="Esta seção está disponível apenas para usuários com plano ativo. Faça upgrade para acessar o catálogo completo da Yupoo."
                    onClose={() => setShowUpgradeModal(false)}
                />
            )}

            <div className={`flex h-full flex-col md:flex-row overflow-hidden bg-white ${isGuest ? 'guest-blur-container' : ''}`}>
                {/* Sidebar Filters */}
                <aside className="w-full md:w-64 border-r border-gray-100 bg-white overflow-y-auto p-4 flex-shrink-0">
                    <div className="mb-6">
                        <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                            <LuFilter className="text-orange-500" />
                            Filtros
                        </h3>
                    </div>

                    {/* Categories */}
                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Categorias</h4>
                            {(selectedCategories.length > 0 || selectedModels.length > 0) && (
                                <button
                                    onClick={() => {
                                        setSelectedCategories([]);
                                        setSelectedModels([]);
                                    }}
                                    className="text-[10px] text-orange-600 font-bold hover:underline"
                                >
                                    Limpar
                                </button>
                            )}
                        </div>

                        <div className="space-y-2">
                            {categories.map(cat => (
                                cat.name === 'Calçados' ? (
                                    <CollapsibleCategory
                                        key={cat.name}
                                        name={cat.name}
                                        count={cat.count}
                                        isSelected={selectedCategories.includes(cat.name)}
                                        onToggle={() => toggleCategory(cat.name)}
                                        models={models}
                                        selectedModels={selectedModels}
                                        onToggleModel={toggleModel}
                                        isExpanded={isShoesExpanded}
                                        onExpandToggle={() => setIsShoesExpanded(!isShoesExpanded)}
                                    />
                                ) : (
                                    <FilterItem
                                        key={cat.name}
                                        name={cat.name}
                                        count={cat.count}
                                        isSelected={selectedCategories.includes(cat.name)}
                                        onToggle={() => toggleCategory(cat.name)}
                                    />
                                )
                            ))}
                        </div>
                    </div>

                    {/* Batches (apenas para Calçados) */}
                    {batches.length > 0 && (
                        <div className="mb-6">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Batches</h4>
                                {selectedBatches.length > 0 && (
                                    <button onClick={() => setSelectedBatches([])} className="text-[10px] text-orange-600 font-bold hover:underline">Limpar</button>
                                )}
                            </div>

                            <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                                {batches.map(batch => (
                                    <FilterItem
                                        key={batch.name}
                                        name={batch.name}
                                        count={batch.count}
                                        isSelected={selectedBatches.includes(batch.name)}
                                        onToggle={() => toggleBatch(batch.name)}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Brands */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Marcas</h4>
                            {selectedBrands.length > 0 && (
                                <button onClick={() => setSelectedBrands([])} className="text-[10px] text-orange-600 font-bold hover:underline">Limpar</button>
                            )}
                        </div>
                        <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar pr-2">
                            {brands.map(brand => (
                                <FilterItem
                                    key={brand.name}
                                    name={brand.name}
                                    count={brand.count}
                                    isSelected={selectedBrands.includes(brand.name)}
                                    onToggle={() => toggleBrand(brand.name)}
                                />
                            ))}
                        </div>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1 flex flex-col h-full overflow-hidden relative">
                    {/* Search Bar & Header Controls */}
                    <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-gray-100 p-4">
                        <div className="flex flex-col gap-4">

                            <div className="flex flex-col md:flex-row items-center gap-4">
                                {/* Search Input */}
                                <div className="relative w-full md:flex-1">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <LuSearch className="text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Buscar produto, marca ou modelo..."
                                        className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                                        value={keyword}
                                        onChange={(e) => setKeyword(e.target.value)}
                                    />
                                    {keyword && (
                                        <button
                                            onClick={() => setKeyword('')}
                                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                                        >
                                            <LuX size={16} />
                                        </button>
                                    )}
                                </div>

                                {/* Disclaimer */}
                                <span className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-50 text-orange-600 border border-orange-100 text-xs font-medium whitespace-nowrap">
                                    ⚠️ Feature em desenvolvimento.
                                </span>
                            </div>

                            {/* Filters Row: Sort & Price */}
                            <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-8 border-t border-gray-100 pt-3 md:pt-0 md:border-t-0">

                                {/* Sort Dropdown */}
                                <div className="relative w-full md:w-auto z-10" ref={sortRef}>
                                    <button
                                        onClick={() => setIsSortOpen(!isSortOpen)}
                                        className="flex items-center justify-between gap-2 w-full md:w-48 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:border-orange-300 transition-colors"
                                    >
                                        <div className="flex items-center gap-2">
                                            <LuArrowDownUp size={16} className="text-gray-400" />
                                            <span className="truncate">
                                                {SORT_OPTIONS.find(o => o.id === sortBy)?.label || 'Ordenar'}
                                            </span>
                                        </div>
                                        <LuChevronDown size={16} className={`text-gray-400 transition-transform ${isSortOpen ? 'rotate-180' : ''}`} />
                                    </button>

                                    <AnimatePresence>
                                        {isSortOpen && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 5 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: 5 }}
                                                transition={{ duration: 0.15 }}
                                                className="absolute top-full left-0 w-full mt-1 bg-white border border-gray-100 rounded-lg shadow-xl overflow-hidden py-1"
                                            >
                                                {SORT_OPTIONS.map(option => (
                                                    <button
                                                        key={option.id}
                                                        onClick={() => {
                                                            setSortBy(option.id);
                                                            setIsSortOpen(false);
                                                        }}
                                                        className="flex items-center justify-between w-full px-4 py-2 text-sm text-left hover:bg-orange-50 text-gray-700"
                                                    >
                                                        {option.label}
                                                        {sortBy === option.id && <LuCheck size={14} className="text-orange-500" />}
                                                    </button>
                                                ))}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                <div className="flex flex-col w-full md:w-64 gap-2">
                                    <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
                                        <span>Preço</span>
                                        <span>¥{priceRange[0]} - ¥{priceRange[1]}</span>
                                    </div>
                                    <Slider
                                        defaultValue={[0, 2000]}
                                        value={priceRange}
                                        min={globalPriceRange[0]}
                                        max={globalPriceRange[1]}
                                        step={10}
                                        minStepsBetweenThumbs={1}
                                        onValueChange={setPriceRange}
                                        className="py-2"
                                    />
                                </div>

                                {/* Currency Toggle */}
                                <div className="flex items-center gap-3">
                                    <span className="text-sm" style={{ color: showBRL ? '#9CA3AF' : '#374151', fontWeight: showBRL ? '400' : '600' }}>
                                        ¥
                                    </span>
                                    <button
                                        onClick={onToggleCurrency}
                                        className="relative w-12 h-6 rounded-full transition-all duration-300"
                                        style={{
                                            background: showBRL ? '#fc8c03ff' : '#fc8c03ff'
                                        }}
                                    >
                                        <span
                                            className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-md transition-all duration-300"
                                            style={{
                                                left: showBRL ? '28px' : '4px'
                                            }}
                                        />
                                    </button>
                                    <span className="text-sm" style={{ color: showBRL ? '#374151' : '#9CA3AF', fontWeight: showBRL ? '600' : '400' }}>
                                        R$
                                    </span>
                                </div>

                            </div>
                        </div>
                    </header>

                    {/* Product Data Content */}
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50/50">
                        {visibleProducts.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 text-center">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-400">
                                    <LuSearch size={32} />
                                </div>
                                <h3 className="text-lg font-medium text-gray-900">Nenhum produto encontrado</h3>
                                <button
                                    onClick={() => {
                                        setKeyword('');
                                        setSelectedCategories([]);
                                        setSelectedBrands([]);
                                        setSelectedBatches([]);
                                        setSelectedModels([]);
                                    }}
                                    className="mt-4 text-orange-600 font-medium hover:underline"
                                >
                                    Limpar filtros
                                </button>
                            </div>
                        ) : (
                            <>
                                {/* Pagination Top */}
                                <div className="mb-6">
                                    <Pagination
                                        currentPage={currentPage}
                                        totalPages={totalPages}
                                        onPageChange={setCurrentPage}
                                    />
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                    {visibleProducts.map((product, idx) => (
                                        <ProductCard
                                            key={`${product.product_url}-${idx}`}
                                            product={product}
                                            showBRL={showBRL}
                                            exchangeRate={exchangeRate}
                                            isSaved={savedProductUrls.includes(product.product_url)}
                                            onSaveToggle={onSaveToggle}
                                        />
                                    ))}
                                </div>

                                {/* Pagination Bottom */}
                                <div className="mt-8 mb-4">
                                    <Pagination
                                        currentPage={currentPage}
                                        totalPages={totalPages}
                                        onPageChange={setCurrentPage}
                                    />
                                </div>
                            </>
                        )}
                    </div>
                </main>
            </div>
        </>
    );
}

// Pagination Component
const Pagination = memo(({ currentPage, totalPages, onPageChange }) => {
    if (totalPages <= 1) return null;

    // Logic to show a window of pages around current
    const renderPageNumbers = () => {
        const pages = [];
        const maxWindow = 5; // Max visible page numbers
        let start = Math.max(1, currentPage - 2);
        let end = Math.min(totalPages, start + maxWindow - 1);

        if (end - start < maxWindow - 1) {
            start = Math.max(1, end - maxWindow + 1);
        }

        for (let i = start; i <= end; i++) {
            pages.push(
                <button
                    key={i}
                    onClick={() => onPageChange(i)}
                    className={`w-8 h-8 rounded-lg text-sm font-bold transition-all ${currentPage === i
                        ? 'bg-orange-500 text-white shadow-md'
                        : 'bg-white text-gray-600 hover:bg-orange-50 border border-gray-200'
                        }`}
                >
                    {i}
                </button>
            );
        }
        return pages;
    };

    return (
        <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
            <div className="text-xs text-gray-400 font-medium hidden sm:block">
                Página <span className="text-gray-900 font-bold">{currentPage}</span> de <span className="text-gray-900 font-bold">{totalPages}</span>
            </div>

            <div className="flex items-center gap-2 mx-auto sm:mx-0">
                <button
                    onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                >
                    <LuChevronLeft size={18} />
                </button>

                <div className="flex items-center gap-1">
                    {renderPageNumbers()}
                </div>

                <button
                    onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                >
                    <LuChevronRight size={18} />
                </button>
            </div>
        </div>
    );
});
Pagination.displayName = 'Pagination';


// Memoized Filter Item (Category/Brand)
const FilterItem = memo(({ name, count, isSelected, onToggle }) => (
    <label className="flex items-center gap-2 cursor-pointer group">
        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isSelected
            ? 'bg-orange-500 border-orange-500'
            : 'border-gray-300 group-hover:border-orange-300'
            }`}>
            {isSelected && (
                <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                </svg>
            )}
            <input
                type="checkbox"
                className="hidden"
                checked={isSelected}
                onChange={onToggle}
            />
        </div>
        <span className={`text-sm flex-1 truncate ${isSelected ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
            {name}
        </span>
        <span className="text-xs text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded-full">{count}</span>
    </label>
));
FilterItem.displayName = 'FilterItem';

// Collapsible Category Component for 'Calçados'
const CollapsibleCategory = memo(({ name, count, isSelected, onToggle, models, selectedModels, onToggleModel, isExpanded, onExpandToggle }) => {
    return (
        <div className="flex flex-col">
            <div className="flex items-center gap-2 cursor-pointer group justify-between select-none">
                <div className="flex items-center gap-2 flex-1 relative">
                    {/* The checkbox area */}
                    <div
                        onClick={onToggle}
                        className={`w-4 h-4 rounded border flex items-center justify-center transition-colors flex-shrink-0 cursor-pointer ${isSelected
                            ? 'bg-orange-500 border-orange-500'
                            : 'border-gray-300 hover:border-orange-300'
                            }`}>
                        {isSelected && (
                            <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                        )}
                    </div>

                    {/* The label area - clicking toggles expansion primarily for better UX on mobile? 
                        Actually usually label toggles checkbox. 
                        Let's make label toggle checkbox, and chevron toggle expansion.
                    */}
                    <span
                        onClick={onToggle}
                        className={`text-sm flex-1 truncate cursor-pointer ${isSelected ? 'text-gray-900 font-medium' : 'text-gray-600'}`}
                    >
                        {name}
                    </span>
                    <span className="text-xs text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded-full">{count}</span>
                </div>

                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onExpandToggle();
                    }}
                    className="p-1 hover:bg-gray-100 rounded text-gray-400 transition-colors"
                >
                    <LuChevronRight
                        size={16}
                        className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                    />
                </button>
            </div>

            <motion.div
                initial={false}
                animate={{ height: isExpanded ? 'auto' : 0, opacity: isExpanded ? 1 : 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
            >
                <div className="pl-2 pt-1 pb-1 space-y-0.5 border-l-2 border-gray-100 ml-2 mt-1">
                    {models.map(model => (
                        <label key={model.name} className="flex items-center gap-2 cursor-pointer group hover:bg-gray-50 p-1.5 rounded-md transition-colors">
                            <div className={`w-3 h-3 rounded border flex items-center justify-center transition-colors ${selectedModels.includes(model.name)
                                ? 'bg-orange-500 border-orange-500'
                                : 'border-gray-300 group-hover:border-orange-300'
                                }`}>
                                {selectedModels.includes(model.name) && (
                                    <svg className="w-2 h-2 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                )}
                                <input
                                    type="checkbox"
                                    className="hidden"
                                    checked={selectedModels.includes(model.name)}
                                    onChange={() => onToggleModel(model.name)}
                                />
                            </div>
                            <span className={`text-xs flex-1 truncate ${selectedModels.includes(model.name) ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                                {model.name}
                            </span>
                            <span className="text-[10px] text-gray-300">{model.count}</span>
                        </label>
                    ))}
                    {models.length === 0 && (
                        <div className="text-[10px] text-gray-400 italic pl-2 py-1">Sem modelos definidos</div>
                    )}
                </div>
            </motion.div>
        </div>
    );
});
CollapsibleCategory.displayName = 'CollapsibleCategory';



// Memoized Product Card
const ProductCard = memo(({ product, showBRL, exchangeRate, isSaved, onSaveToggle }) => {
    return (
        <a
            href={product.product_url}
            target="_blank"
            rel="noopener noreferrer"
            className="group block bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
        >
            {/* Image Aspect Ratio Container */}
            <div className="relative aspect-square overflow-hidden bg-gray-100">
                <img
                    src={product.image}
                    alt={product.titulo}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                {/* Overlay Gradient on Hover */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300" />

                {/* Save Button */}
                {onSaveToggle && (
                    <div className="absolute top-2 right-2 z-10">
                        <SaveBookmarkButton
                            isSaved={isSaved}
                            onToggle={() => onSaveToggle({
                                url: product.product_url,
                                name: product.titulo,
                                price: product.preco,
                                images: [product.image],
                                sellerName: product.vendedor
                            })}
                            size={18}
                        />
                    </div>
                )}
            </div>

            <div className="p-3">
                {product.marca && (
                    <p className="text-xs font-bold text-orange-600 uppercase tracking-wide mb-1">
                        {product.marca}
                    </p>
                )}
                <h3 className="text-xs sm:text-sm font-medium text-gray-900 line-clamp-2 mb-2 h-10 leading-relaxed" title={product.titulo}>
                    {product.titulo}
                </h3>

                <div className="flex items-center justify-between mt-2">
                    <span className="text-sm sm:text-base font-bold text-orange-600">
                        {product.preco > 0
                            ? (showBRL && exchangeRate
                                ? `R$ ${(product.preco * exchangeRate).toFixed(2)}`
                                : `¥ ${product.preco}`)
                            : 'Consulte'}
                    </span>
                    <span className="text-[10px] text-gray-400 px-1.5 py-0.5 bg-gray-50 rounded border border-gray-100 uppercase">
                        {product.vendedor || 'Yupoo'}
                    </span>
                </div>
            </div>
        </a>
    );
});
ProductCard.displayName = 'ProductCard';
