import { useState, useMemo, useCallback, useEffect } from 'react';
import HeroSection from './components/HeroSection';
import SellerCard from './components/SellerCard';
import SearchFilters from './components/SearchFilters';
import ProductGrid, { extractUniqueModels, detectIPhoneModel, detectStorage, extractUniqueStorages, detectUnlockStatus } from './components/ProductGrid';

function App() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [evaluating, setEvaluating] = useState(false);
    const [error, setError] = useState(null);
    const [sellerInfo, setSellerInfo] = useState(null);
    const [isMockData, setIsMockData] = useState(false);
    const [filters, setFilters] = useState({
        keyword: '',
        minPrice: '',
        maxPrice: '',
        sort: '',
        iphoneModel: '',
        storage: '',
        unlockStatus: ''
    });

    // Estado para conversão de moeda
    const [showBRL, setShowBRL] = useState(false);
    const [exchangeRate, setExchangeRate] = useState(0);

    // Busca taxa de câmbio quando ativar modo BRL
    useEffect(() => {
        if (showBRL && exchangeRate === 0) {
            fetch('/api/exchange-rate')
                .then(res => res.json())
                .then(data => {
                    if (data.rate) {
                        setExchangeRate(data.rate);
                        console.log(`[App] Taxa de câmbio: 1 CNY = ${data.rate.toFixed(4)} BRL`);
                    }
                })
                .catch(err => console.error('[App] Erro ao buscar taxa de câmbio:', err));
        }
    }, [showBRL, exchangeRate]);

    const toggleCurrency = () => {
        setShowBRL(prev => !prev);
    };

    // Avalia o vendedor assim que a URL é colada
    const handleUrlChange = useCallback(async (url) => {
        setEvaluating(true);
        setSellerInfo(null);
        setError(null);

        try {
            const response = await fetch('/api/evaluate-seller', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
            });

            if (!response.ok) {
                console.error('Erro ao avaliar vendedor');
                return;
            }

            const data = await response.json();
            if (data.sellerInfo) {
                setSellerInfo(data.sellerInfo);
            }
        } catch (err) {
            console.error('Erro ao avaliar vendedor:', err);
        } finally {
            setEvaluating(false);
        }
    }, []);

    const handleMine = async (url, limit) => {
        setLoading(true);
        setError(null);
        setProducts([]);

        try {
            const response = await fetch('/api/mine', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url, limit, useMock: false })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erro ao minerar produtos');
            }

            const data = await response.json();
            setProducts(data.products || []);

            if (data.sellerInfo) {
                setSellerInfo(data.sellerInfo);
            }

            setIsMockData(data.isMock || false);
            setFilters(prev => ({ ...prev, iphoneModel: '', storage: '' }));
        } catch (err) {
            console.error('Erro:', err);
            setError(err.message || 'Erro ao conectar com o servidor');
        } finally {
            setLoading(false);
        }
    };

    // Extrai modelos e armazenamentos disponíveis
    const availableModels = useMemo(() => extractUniqueModels(products), [products]);
    const availableStorages = useMemo(() => extractUniqueStorages(products), [products]);

    // Filtra e ordena produtos localmente
    const filteredProducts = useMemo(() => {
        let result = [...products];

        if (filters.iphoneModel) {
            result = result.filter(p => detectIPhoneModel(p) === filters.iphoneModel);
        }

        if (filters.storage) {
            result = result.filter(p => detectStorage(p) === filters.storage);
        }

        if (filters.unlockStatus) {
            result = result.filter(p => detectUnlockStatus(p) === filters.unlockStatus);
        }

        if (filters.keyword) {
            const kw = filters.keyword.toLowerCase();
            result = result.filter(p =>
                (p.nameOriginal?.toLowerCase() || '').includes(kw) ||
                (p.nameTranslated?.toLowerCase() || '').includes(kw) ||
                (p.name?.toLowerCase() || '').includes(kw)
            );
        }

        if (filters.minPrice) {
            result = result.filter(p => p.price >= parseFloat(filters.minPrice));
        }

        if (filters.maxPrice) {
            result = result.filter(p => p.price <= parseFloat(filters.maxPrice));
        }

        if (filters.sort) {
            switch (filters.sort) {
                case 'price_asc':
                    result.sort((a, b) => a.price - b.price);
                    break;
                case 'price_desc':
                    result.sort((a, b) => b.price - a.price);
                    break;
                case 'name_asc':
                    result.sort((a, b) =>
                        (a.nameTranslated || a.name).localeCompare(b.nameTranslated || b.name)
                    );
                    break;
                case 'name_desc':
                    result.sort((a, b) =>
                        (b.nameTranslated || b.name).localeCompare(a.nameTranslated || a.name)
                    );
                    break;
            }
        }

        return result;
    }, [products, filters]);

    // Se já tem produtos, mostra a view de resultados
    const hasResults = products.length > 0;

    return (
        <div className="min-h-screen" style={{ background: 'var(--color-cream-50)' }}>
            {/* Header - só aparece quando tem resultados */}
            {hasResults && (
                <header
                    className="sticky top-0 z-50"
                    style={{
                        background: 'rgba(255, 251, 247, 0.8)',
                        backdropFilter: 'blur(12px)',
                        borderBottom: '1px solid var(--color-cream-200)'
                    }}
                >
                    <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="font-semibold" style={{ color: '#1F2937' }}>Minerador - Xyaniu</span>
                        </div>
                        <button
                            onClick={() => {
                                setProducts([]);
                                setSellerInfo(null);
                                setFilters({
                                    keyword: '',
                                    minPrice: '',
                                    maxPrice: '',
                                    sort: '',
                                    iphoneModel: '',
                                    storage: ''
                                });
                            }}
                            className="btn-ghost text-sm"
                        >
                            ← Nova busca
                        </button>
                    </div>
                </header>
            )}

            <main className={hasResults ? 'max-w-7xl mx-auto px-6 py-8' : ''}>
                {/* Hero Section - página inicial */}
                {!hasResults && !loading && (
                    <>
                        <HeroSection
                            onUrlChange={handleUrlChange}
                            onMine={handleMine}
                            isEvaluating={evaluating}
                            isLoading={loading}
                        />

                        {/* Seller Card preview (aparece após avaliar) */}
                        {sellerInfo && !loading && (
                            <div className="max-w-2xl mx-auto px-6 animate-fade-in-up">
                                <SellerCard sellerInfo={sellerInfo} />
                            </div>
                        )}
                    </>
                )}

                {/* Loading State */}
                {loading && (
                    <div className="min-h-screen flex flex-col items-center justify-center">
                        <div
                            className="w-16 h-16 rounded-full animate-spin mb-6"
                            style={{
                                border: '4px solid var(--color-cream-200)',
                                borderTopColor: 'var(--color-orange-500)'
                            }}
                        ></div>
                        <p className="font-medium text-lg" style={{ color: '#4B5563' }}>Minerando produtos...</p>
                        <p className="text-sm mt-2" style={{ color: '#9CA3AF' }}>Isso pode levar alguns segundos</p>
                    </div>
                )}

                {/* Error State */}
                {error && (
                    <div
                        className="max-w-md mx-auto mt-8 p-6 rounded-2xl text-center"
                        style={{
                            background: '#FEF2F2',
                            border: '1px solid #FECACA'
                        }}
                    >
                        <span className="text-3xl mb-3 inline-block">❌</span>
                        <p className="font-medium" style={{ color: '#DC2626' }}>{error}</p>
                    </div>
                )}

                {/* Results View */}
                {hasResults && !loading && (
                    <>
                        {/* Seller Card */}
                        {sellerInfo && <SellerCard sellerInfo={sellerInfo} />}

                        {/* Filters */}
                        <SearchFilters
                            filters={filters}
                            onFilterChange={setFilters}
                            availableModels={availableModels}
                            availableStorages={availableStorages}
                            showBRL={showBRL}
                            onToggleCurrency={toggleCurrency}
                        />

                        {/* Stats Bar */}
                        <div className="flex items-center justify-between mb-6">
                            <p style={{ color: '#6B7280' }}>
                                <span className="font-semibold" style={{ color: '#1F2937' }}>{filteredProducts.length}</span>
                                {' '}de{' '}
                                <span className="font-semibold" style={{ color: '#1F2937' }}>{products.length}</span>
                                {' '}produtos
                            </p>
                            <div className="flex items-center gap-2">
                                {availableModels.length > 0 && (
                                    <span
                                        className="badge"
                                        style={{ background: 'var(--color-cream-100)', color: '#6B7280' }}
                                    >
                                        📱 {availableModels.length} modelos
                                    </span>
                                )}
                                {availableStorages.length > 0 && (
                                    <span
                                        className="badge"
                                        style={{ background: 'var(--color-cream-100)', color: '#6B7280' }}
                                    >
                                        💾 {availableStorages.length} capacidades
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Products Grid */}
                        <ProductGrid products={filteredProducts} showBRL={showBRL} exchangeRate={exchangeRate} />
                    </>
                )}
            </main>
        </div>
    );
}

export default App;
