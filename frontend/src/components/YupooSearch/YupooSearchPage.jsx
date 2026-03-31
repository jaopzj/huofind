import { useState, useEffect, useMemo, memo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LuSearch, LuFilter, LuX, LuChevronLeft, LuChevronRight, LuArrowDownUp, LuCheck, LuChevronDown, LuBadgeCheck, LuCamera, LuUpload, LuImage, LuLoaderCircle } from 'react-icons/lu';
import WifiLoader from '../WifiLoader';
import { Slider } from '../ui/slider';
import SaveBookmarkButton from '../SaveBookmarkButton';
import UpgradeModal from '../UpgradeModal';
import { isRecommendedBatch, normalizeBatchMap } from '../../utils/batchValidator';
import batchValidatorData from '../../data/batch-validator.json';
import './BatchBadge.css';
import { proxyImage } from '../../utils/imageProxy';


const SORT_OPTIONS = [
    { id: 'default', label: 'Padrão' },
    { id: 'price-asc', label: 'Menor Preço' },
    { id: 'price-desc', label: 'Maior Preço' },
    { id: 'alpha-asc', label: 'A-Z' },
];

const VENDOR_DISPLAY_NAMES = {
    'tianjin-no1': 'JMDY',
    'scorpio-reps': 'Taurus-reps',
};
const getVendorDisplayName = (name) => VENDOR_DISPLAY_NAMES[name] || name;

export default function YupooSearchPage({
    showBRL = false,
    onToggleCurrency = () => { },
    exchangeRate = 0,
    savedProductUrls = [],
    onSaveToggle,
    isGuest = false,
    isBronze = false,
    onNavigate = () => { }
}) {
    // State for data
    const [allProducts, setAllProducts] = useState([]);
    useEffect(() => {
        console.log('[YupooSearch] allProducts updated, total count:', allProducts.length);
    }, [allProducts]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Normalized batch map for validation (memoized)
    const normalizedBatchMap = useMemo(() => normalizeBatchMap(batchValidatorData), []);

    // State for filters
    const [keyword, setKeyword] = useState('');
    const [debouncedKeyword, setDebouncedKeyword] = useState('');
    const [selectedCategories, setSelectedCategories] = useState([]);
    const [selectedBrands, setSelectedBrands] = useState([]);
    const [selectedBatches, setSelectedBatches] = useState([]);
    const [selectedModels, setSelectedModels] = useState([]);
    const [selectedVendors, setSelectedVendors] = useState([]);
    const [isShoesExpanded, setIsShoesExpanded] = useState(false);

    // Image Search State
    const [isImageSearchOpen, setIsImageSearchOpen] = useState(false);
    const [imageSearchLoading, setImageSearchLoading] = useState(false);
    const [imageSearchPreview, setImageSearchPreview] = useState(null);
    const [imageSearchResults, setImageSearchResults] = useState(null); // { results, totalMatches, duration }
    const [isDragging, setIsDragging] = useState(false);
    const imageInputRef = useRef(null);

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

    // Image search handler
    const handleImageSearch = useCallback(async (file) => {
        if (!file || !file.type.startsWith('image/')) return;

        // Show preview
        const reader = new FileReader();
        reader.onload = (e) => setImageSearchPreview(e.target.result);
        reader.readAsDataURL(file);

        setImageSearchLoading(true);

        try {
            const formData = new FormData();
            formData.append('image', file);

            const res = await fetch('/api/yupoo/image-search', {
                method: 'POST',
                body: formData
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Erro na busca');
            }

            if (!data.results || data.results.length === 0) {
                setImageSearchResults({ products: [], totalMatches: 0, duration: data.duration });
                setIsImageSearchOpen(false);
                return;
            }

            // High-reliability URL normalization
            const norm = (u) => {
                if (!u) return '';
                try {
                    return u.toLowerCase()
                        .replace(/^https?:\/\//, '')
                        .replace(/^www\./, '')
                        .split('?')[0]
                        .replace(/\/$/, '')
                        .trim();
                } catch (e) {
                    return u.toLowerCase().trim();
                }
            };

            // Map results to normalized URLs for lookup
            const resultScores = new Map();
            data.results.forEach(r => {
                resultScores.set(norm(r.product_url), r.similarity);
            });

            // Map to local products
            const matchedProducts = allProducts
                .filter(p => resultScores.has(norm(p.product_url)))
                .map(p => ({
                    ...p,
                    _similarity: resultScores.get(norm(p.product_url))
                }))
                .sort((a, b) => b._similarity - a._similarity);

            setImageSearchResults({
                products: matchedProducts,
                totalMatches: data.results.length,
                duration: data.duration
            });

            // Success logic
            setIsImageSearchOpen(false);
            setCurrentPage(1);
            setKeyword(''); // Clear text search

        } catch (err) {
            console.error('Image search error:', err);
            alert('Erro ao buscar por imagem: ' + err.message);
        } finally {
            setImageSearchLoading(false);
        }
    }, [allProducts]);

    // Handle paste from clipboard
    useEffect(() => {
        const handlePaste = (e) => {
            if (!isImageSearchOpen) return;
            const items = e.clipboardData?.items;
            if (!items) return;
            for (const item of items) {
                if (item.type.startsWith('image/')) {
                    const file = item.getAsFile();
                    if (file) handleImageSearch(file);
                    break;
                }
            }
        };
        document.addEventListener('paste', handlePaste);
        return () => document.removeEventListener('paste', handlePaste);
    }, [isImageSearchOpen, handleImageSearch]);

    const clearImageSearch = useCallback(() => {
        setImageSearchResults(null);
        setImageSearchPreview(null);
    }, []);

    // Reset pagination when filters change
    useEffect(() => {
        setCurrentPage(1);
        document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });
    }, [debouncedKeyword, selectedCategories, selectedBrands, selectedBatches, selectedModels, selectedVendors, priceRange, sortBy, itemsPerPage]);

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
    const { categories, brands, batches, models, vendors } = useMemo(() => {
        const catCount = {};
        const brandCount = {};
        const batchCount = {};
        const modelCount = {};
        const vendorCount = {};

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
            if (p.vendedor) {
                vendorCount[p.vendedor] = (vendorCount[p.vendedor] || 0) + 1;
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

        const sortedVendors = Object.entries(vendorCount)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);

        return { categories: sortedCategories, brands: sortedBrands, batches: sortedBatches, models: sortedModels, vendors: sortedVendors };
    }, [allProducts]);

    // Filter Logic (memoized)
    const filteredProducts = useMemo(() => {
        // Source: if image search is active, use its results as base, otherwise use allProducts
        let sourcePool = imageSearchResults ? imageSearchResults.products : allProducts;

        // 1. Filter
        let result = sourcePool.filter(product => {
            // Keyword match
            if (debouncedKeyword) {
                const lowerKw = debouncedKeyword.toLowerCase();
                const matchTitle = product.titulo?.toLowerCase().includes(lowerKw);
                const matchBrand = product.marca?.toLowerCase().includes(lowerKw);
                const matchModel = product.modelo?.toLowerCase().includes(lowerKw);
                if (!matchTitle && !matchBrand && !matchModel) return false;
            }

            // Category/Brand/Batch/Model matches...
            if (selectedCategories.length > 0 && !selectedCategories.includes(product.categoria)) return false;
            if (selectedBrands.length > 0 && !selectedBrands.includes(product.marca)) return false;
            if (selectedModels.length > 0 && !selectedModels.includes(product.modelo)) return false;
            if (selectedBatches.length > 0) {
                if (!product.batch || !selectedBatches.includes(product.batch)) return false;
            }
            if (selectedVendors.length > 0 && !selectedVendors.includes(product.vendedor)) return false;

            // Price Range
            if (product.preco > 0) {
                if (product.preco < priceRange[0] || product.preco > priceRange[1]) return false;
            } else if (priceRange[0] > 0) return false;

            return true;
        });

        // 2. Sort
        if (sortBy !== 'default') {
            result.sort((a, b) => {
                if (sortBy === 'price-asc') return (a.preco || Infinity) - (b.preco || Infinity);
                if (sortBy === 'price-desc') return (b.preco || 0) - (a.preco || 0);
                if (sortBy === 'alpha-asc') return a.titulo.localeCompare(b.titulo);
                return 0;
            });
        }

        return result;
    }, [allProducts, debouncedKeyword, selectedCategories, selectedBrands, selectedBatches, selectedModels, selectedVendors, priceRange, sortBy, imageSearchResults]);

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

    const toggleVendor = useCallback((vendor) => {
        setSelectedVendors(prev =>
            prev.includes(vendor) ? prev.filter(v => v !== vendor) : [...prev, vendor]
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
            {/* Guest/Bronze Upgrade Modal */}
            {(isGuest || isBronze) && showUpgradeModal && (
                <UpgradeModal
                    isOpen={true}
                    onUpgrade={() => onNavigate('store')}
                    title={isBronze ? "Funcionalidade Premium" : "Acesso restrito"}
                    description={isBronze 
                        ? "A busca por imagem está disponível para usuários Prata e Ouro. Faça upgrade para usar esta inteligência."
                        : "Esta seção está disponível apenas para usuários com plano ativo. Faça upgrade para acessar o catálogo completo da Yupoo."}
                    onClose={() => setShowUpgradeModal(false)}
                />
            )}

            <div className={`flex h-full flex-col md:flex-row overflow-hidden bg-white/5 backdrop-blur-3xl rounded-3xl border border-white/10 shadow-2xl ${isGuest ? 'guest-blur-container' : ''}`}>
                {/* Sidebar Filters */}
                <aside className="w-full md:w-64 border-r border-white/10 overflow-y-auto p-4 flex-shrink-0">
                    <div className="mb-6">
                        <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                            <LuFilter className="text-blue-500" />
                            Filtros
                        </h3>
                    </div>

                    {/* Vendors */}
                    {vendors.length > 1 && (
                        <div className="mb-6">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Vendedores</h4>
                                {selectedVendors.length > 0 && (
                                    <button onClick={() => setSelectedVendors([])} className="text-[10px] text-blue-400 font-bold hover:underline">Limpar</button>
                                )}
                            </div>
                            <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                                {vendors.map(vendor => (
                                    <FilterItem
                                        key={vendor.name}
                                        name={getVendorDisplayName(vendor.name)}
                                        count={vendor.count}
                                        isSelected={selectedVendors.includes(vendor.name)}
                                        onToggle={() => toggleVendor(vendor.name)}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

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
                                    className="text-[10px] text-blue-400 font-bold hover:underline"
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
                                    <button onClick={() => setSelectedBatches([])} className="text-[10px] text-blue-400 font-bold hover:underline">Limpar</button>
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
                                <button onClick={() => setSelectedBrands([])} className="text-[10px] text-blue-400 font-bold hover:underline">Limpar</button>
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
                <main className="flex-1 flex flex-col h-full overflow-hidden relative font-sans">
                    {/* Search Bar & Header Controls */}
                    <header className="sticky top-0 z-20 border-b border-white/10 p-4 backdrop-blur-sm">
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
                                        className="block w-full pl-10 pr-12 py-2.5 border border-white/10 rounded-xl leading-5 bg-white/5 text-white placeholder-gray-500 focus:outline-none focus:bg-white/10 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                        value={keyword}
                                        onChange={(e) => setKeyword(e.target.value)}
                                    />
                                    <div className="absolute inset-y-0 right-0 flex items-center gap-1 pr-2">
                                        {keyword && (
                                            <button
                                                onClick={() => setKeyword('')}
                                                className="p-1 text-gray-500 hover:text-white transition-colors"
                                            >
                                                <LuX size={16} />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => {
                                                if (isBronze) {
                                                    setShowUpgradeModal(true);
                                                } else {
                                                    setIsImageSearchOpen(true);
                                                }
                                            }}
                                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 transition-all duration-200"
                                            title="Buscar por imagem"
                                        >
                                            <LuCamera size={18} />
                                        </button>
                                    </div>
                                </div>

                                {/* Disclaimer */}
                                <span className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-medium whitespace-nowrap">
                                    ⚠️ Feature em desenvolvimento.
                                </span>
                            </div>

                            {/* Filters Row: Sort & Price */}
                            <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-8 border-t border-white/5 pt-3 md:pt-0 md:border-t-0">

                                {/* Sort Dropdown */}
                                <div className="relative w-full md:w-auto z-10" ref={sortRef}>
                                    <button
                                        onClick={() => setIsSortOpen(!isSortOpen)}
                                        className="flex items-center justify-between gap-2 w-full md:w-48 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white hover:border-blue-500/30 transition-colors"
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
                                                className="absolute top-full left-0 w-full mt-1 bg-[#1f2937]/90 backdrop-blur-xl border border-white/10 rounded-lg shadow-2xl overflow-hidden py-1"
                                            >
                                                {SORT_OPTIONS.map(option => (
                                                    <button
                                                        key={option.id}
                                                        onClick={() => {
                                                            setSortBy(option.id);
                                                            setIsSortOpen(false);
                                                        }}
                                                        className="flex items-center justify-between w-full px-4 py-2 text-sm text-left hover:bg-white/5 text-gray-300 hover:text-white"
                                                    >
                                                        {option.label}
                                                        {sortBy === option.id && <LuCheck size={14} className="text-blue-500" />}
                                                    </button>
                                                ))}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                <div className="flex flex-col w-full md:w-64 gap-2">
                                    <div className="flex items-center justify-between text-xs text-gray-400 font-medium">
                                        <span>Preço</span>
                                        <span className="text-blue-400 font-bold">¥{priceRange[0]} - ¥{priceRange[1]}</span>
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
                                    <span className="text-sm" style={{ color: showBRL ? '#6B7280' : 'white', fontWeight: showBRL ? '400' : '600' }}>
                                        ¥
                                    </span>
                                    <button
                                        onClick={onToggleCurrency}
                                        className="relative w-12 h-6 rounded-full transition-all duration-300"
                                        style={{
                                            background: showBRL ? '#3B82F6' : 'rgba(255,255,255,0.05)'
                                        }}
                                    >
                                        <span
                                            className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-md transition-all duration-300"
                                            style={{
                                                left: showBRL ? '28px' : '4px'
                                            }}
                                        />
                                    </button>
                                    <span className="text-sm" style={{ color: showBRL ? 'white' : '#6B7280', fontWeight: showBRL ? '600' : '400' }}>
                                        R$
                                    </span>
                                </div>

                            </div>
                        </div>
                    </header>

                    {/* Product Data Content */}
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-transparent">

                        {/* Image Search Active Banner */}
                        {imageSearchResults && (
                            <div className="mb-6 flex items-center gap-4 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                                {imageSearchPreview && (
                                    <img
                                        src={imageSearchPreview}
                                        alt="Busca"
                                        className="w-14 h-14 rounded-lg object-cover border-2 border-blue-500/30 flex-shrink-0"
                                    />
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-blue-400">
                                        Busca por imagem — {imageSearchResults.products.length} resultado{imageSearchResults.products.length !== 1 ? 's' : ''}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                        Encontrado em {imageSearchResults.duration}ms
                                    </p>
                                </div>
                                <button
                                    onClick={clearImageSearch}
                                    className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-300 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                                >
                                    Limpar
                                </button>
                            </div>
                        )}

                        {/* Decide what to show: image search results or filtered results */}
                        {filteredProducts.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 text-center">
                                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4 text-gray-600">
                                    {imageSearchResults ? <LuImage size={32} /> : <LuSearch size={32} />}
                                </div>
                                <h3 className="text-lg font-medium text-white">
                                    {imageSearchResults ? 'Nenhum produto similar encontrado' : 'Nenhum produto encontrado'}
                                </h3>
                                {imageSearchResults ? (
                                    <p className="text-sm text-gray-400 mt-1">Tente com outra imagem ou limpe a busca</p>
                                ) : null}
                                <button
                                    onClick={() => {
                                        if (imageSearchResults) {
                                            clearImageSearch();
                                        } else {
                                            setKeyword('');
                                            setSelectedCategories([]);
                                            setSelectedBrands([]);
                                            setSelectedBatches([]);
                                            setSelectedModels([]);
                                            setSelectedVendors([]);
                                        }
                                    }}
                                    className="mt-4 text-blue-500 font-medium hover:underline"
                                >
                                    {imageSearchResults ? 'Voltar ao catálogo' : 'Limpar filtros'}
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
                                            batchMap={normalizedBatchMap}
                                            similarity={product._similarity}
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

            {/* Image Search Modal */}
            <AnimatePresence>
                {isImageSearchOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
                        onClick={() => !imageSearchLoading && setIsImageSearchOpen(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="relative w-full max-w-md bg-[#111827] rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Modal Header */}
                            <div className="flex items-center justify-between p-5 border-b border-white/10">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-blue-500/15 flex items-center justify-center">
                                        <LuCamera className="text-blue-400" size={18} />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-white">Buscar por imagem</h3>
                                        <p className="text-xs text-gray-500">Envie uma foto para encontrar produtos similares</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => !imageSearchLoading && setIsImageSearchOpen(false)}
                                    className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-colors"
                                >
                                    <LuX size={18} />
                                </button>
                            </div>

                            {/* Drop Zone */}
                            <div className="p-5">
                                <div
                                    className={`relative border-2 border-dashed rounded-xl transition-all duration-300 ${isDragging
                                        ? 'border-blue-500 bg-blue-500/10'
                                        : imageSearchPreview
                                            ? 'border-blue-500/30 bg-blue-500/5'
                                            : 'border-white/10 hover:border-white/20 bg-white/[0.02]'
                                        }`}
                                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                    onDragLeave={() => setIsDragging(false)}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        setIsDragging(false);
                                        const file = e.dataTransfer.files?.[0];
                                        if (file) handleImageSearch(file);
                                    }}
                                >
                                    {imageSearchLoading ? (
                                        <div className="flex flex-col items-center justify-center py-12 gap-4">
                                            <div className="relative">
                                                <div className="w-16 h-16 rounded-full border-2 border-blue-500/20 flex items-center justify-center">
                                                    <LuLoaderCircle size={28} className="text-blue-400 animate-spin" />
                                                </div>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-sm font-medium text-white">Analisando imagem...</p>
                                                <p className="text-xs text-gray-500 mt-1">Comparando com o catálogo</p>
                                            </div>
                                        </div>
                                    ) : imageSearchPreview ? (
                                        <div className="flex flex-col items-center py-6 gap-4">
                                            <img
                                                src={imageSearchPreview}
                                                alt="Preview"
                                                className="w-32 h-32 rounded-xl object-cover border-2 border-white/10 shadow-lg"
                                            />
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => { setImageSearchPreview(null); imageInputRef.current?.click(); }}
                                                    className="px-4 py-2 rounded-lg text-xs font-medium text-gray-300 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                                                >
                                                    Trocar imagem
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div
                                            className="flex flex-col items-center py-12 gap-3 cursor-pointer"
                                            onClick={() => imageInputRef.current?.click()}
                                        >
                                            <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center">
                                                <LuUpload size={24} className={isDragging ? 'text-blue-400' : 'text-gray-500'} />
                                            </div>
                                            <div className="text-center">
                                                <p className="text-sm font-medium text-white">
                                                    {isDragging ? 'Solte a imagem aqui' : 'Clique ou arraste uma imagem'}
                                                </p>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    Suporta JPG, PNG, WebP • Máx 10MB
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    <input
                                        ref={imageInputRef}
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) handleImageSearch(file);
                                            e.target.value = ''; // Reset for re-selection
                                        }}
                                    />
                                </div>

                                {/* Tips */}
                                <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white/5 border border-white/5 font-mono text-[10px]">
                                        Ctrl+V
                                    </span>
                                    <span>para colar da área de transferência</span>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
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
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10'
                        }`}
                >
                    {i}
                </button>
            );
        }
        return pages;
    };

    return (
        <div className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/10 shadow-sm">
            <div className="text-xs text-gray-400 font-medium hidden sm:block">
                Página <span className="text-white font-bold">{currentPage}</span> de <span className="text-white font-bold">{totalPages}</span>
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
            ? 'bg-blue-600 border-blue-600'
            : 'border-white/20 group-hover:border-blue-400'
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
        <span className={`text-sm flex-1 truncate ${isSelected ? 'text-white font-medium' : 'text-gray-400'}`}>
            {name}
        </span>
        <span className="text-[10px] text-gray-400 bg-[#1f2937] px-1.5 py-0.5 rounded-full border border-white/5">{count}</span>
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
                            ? 'bg-blue-600 border-blue-600'
                            : 'border-white/20 hover:border-blue-400'
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
                        className={`text-sm flex-1 truncate cursor-pointer ${isSelected ? 'text-white font-medium' : 'text-gray-400'}`}
                    >
                        {name}
                    </span>
                    <span className="text-[10px] text-gray-400 bg-[#1f2937] px-1.5 py-0.5 rounded-full border border-white/5">{count}</span>
                </div>

                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onExpandToggle();
                    }}
                    className="p-1 hover:bg-white/5 rounded text-gray-500 transition-colors"
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
                <div className="pl-2 pt-1 pb-1 space-y-0.5 border-l-2 border-white/10 ml-2 mt-1">
                    {models.map(model => (
                        <label key={model.name} className="flex items-center gap-2 cursor-pointer group hover:bg-white/5 p-1.5 rounded-md transition-colors">
                            <div className={`w-3 h-3 rounded border flex items-center justify-center transition-colors ${selectedModels.includes(model.name)
                                ? 'bg-blue-600 border-blue-600'
                                : 'border-white/20 group-hover:border-blue-400'
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
                            <span className={`text-xs flex-1 truncate ${selectedModels.includes(model.name) ? 'text-white font-medium' : 'text-gray-400'}`}>
                                {model.name}
                            </span>
                            <span className="text-[10px] text-gray-400 bg-[#1f2937] px-1.5 py-0.5 rounded-full border border-white/5">{model.count}</span>
                        </label>
                    ))}
                    {models.length === 0 && (
                        <div className="text-[10px] text-gray-500 italic pl-2 py-1">Sem modelos definidos</div>
                    )}
                </div>
            </motion.div>
        </div>
    );
});
CollapsibleCategory.displayName = 'CollapsibleCategory';



// Memoized Product Card
const ProductCard = memo(({ product, showBRL, exchangeRate, isSaved, onSaveToggle, batchMap, similarity }) => {
    // Check if this product has the recommended batch
    const hasRecommendedBatch = useMemo(() => {
        if (!batchMap || !product.batch || product.categoria !== 'Calçados') return false;
        return isRecommendedBatch(product, batchMap);
    }, [product, batchMap]);

    return (
        <a
            href={product.product_url}
            target="_blank"
            rel="noopener noreferrer"
            className="group block bg-[#1f2937] rounded-xl border border-white/5 overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
        >
            {/* Image Aspect Ratio Container */}
            <div className="relative aspect-square overflow-hidden bg-gray-900">
                <img
                    src={proxyImage(product.image)}
                    alt={product.titulo}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                {/* Overlay Gradient on Hover */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300" />

                {/* Similarity Badge (Image Search) */}
                {similarity != null && (
                    <div className={`absolute top-2 left-2 z-20 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold text-white border border-white/20 shadow-lg ${similarity >= 0.8
                        ? 'bg-emerald-600/90'
                        : similarity >= 0.6
                            ? 'bg-yellow-600/90'
                            : 'bg-orange-600/90'
                        }`}>
                        {Math.round(similarity * 100)}% match
                    </div>
                )}

                {/* Recommended Batch Badge */}
                {hasRecommendedBatch && !similarity && (
                    <div className="absolute top-2 left-2 z-20 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold text-white bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-400 border-2 border-white/40 shadow-lg shadow-emerald-500/30 animate-pulse">
                        <LuBadgeCheck size={14} />
                        <span className="hidden sm:inline">Batch recomendada!</span>
                        <span className="sm:hidden">✓ Batch</span>
                    </div>
                )}

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
                                sellerName: getVendorDisplayName(product.vendedor)
                            })}
                            size={18}
                        />
                    </div>
                )}
            </div>

            <div className="p-3">
                {product.marca && (
                    <p className="text-xs font-bold text-blue-400 uppercase tracking-wide mb-2 truncate" title={product.marca}>
                        {product.marca}
                    </p>
                )}
                <h3 className="text-xs sm:text-sm font-medium text-white line-clamp-2 mb-4 h-10 overflow-hidden leading-relaxed" title={product.titulo}>
                    {product.titulo}
                </h3>

                <div className="flex items-center justify-between gap-2 mt-2">
                    <span className="text-base sm:text-xl font-bold text-blue-400 whitespace-nowrap">
                        {product.preco > 0
                            ? (showBRL && exchangeRate
                                ? `R$ ${(product.preco / exchangeRate).toFixed(2).replace('.', ',')}`
                                : `¥ ${product.preco}`)
                            : 'Consulte'}
                    </span>
                    <span className="text-[10px] text-gray-400 px-1.5 py-0.5 bg-white/5 rounded border border-white/10 uppercase truncate max-w-[80px]" title={getVendorDisplayName(product.vendedor) || 'Yupoo'}>
                        {getVendorDisplayName(product.vendedor) || 'Yupoo'}
                    </span>
                </div>
            </div>
        </a>
    );
});
ProductCard.displayName = 'ProductCard';

