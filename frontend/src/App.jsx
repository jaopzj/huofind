import { useState, useMemo, useCallback, useEffect } from 'react';
import HeroSection from './components/HeroSection';
import SellerCard from './components/SellerCard';
import SearchFilters from './components/SearchFilters';
import ProductGrid from './components/ProductGrid';
import CompareBar from './components/CompareBar';
import ComparisonModal from './components/ComparisonModal';
import WifiLoader from './components/WifiLoader';
import AuthCard from './components/AuthCard';
import { useAuth } from './contexts/AuthContext';
import {
    extractUniqueModels,
    detectIPhoneModel,
    detectStorage,
    extractUniqueStorages,
    detectUnlockStatus
} from './utils/iphoneDetector';
import {
    detectAppleWatchModel,
    detectWatchSize,
    detectCondition,
    extractUniqueWatchModels,
    extractUniqueWatchSizes
} from './utils/appleWatchDetector';

function App() {
    // Auth state
    const { user, isAuthenticated, loading: authLoading, logout } = useAuth();
    const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'

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
        // iPhone filters
        iphoneModel: '',
        storage: '',
        unlockStatus: '',
        // Apple Watch filters
        watchModel: '',
        watchSize: '',
        watchCondition: ''
    });

    // Category state for dynamic filters
    const [selectedCategory, setSelectedCategory] = useState('iphone');

    // Estado para conversão de moeda
    const [showBRL, setShowBRL] = useState(false);
    const [exchangeRate, setExchangeRate] = useState(0);

    // Estado para etapas de mineração em tempo real
    const [miningStage, setMiningStage] = useState({ stage: '', message: '', count: 0 });

    // Estado para comparação de produtos
    const [comparisonMode, setComparisonMode] = useState(false);
    const [selectedForCompare, setSelectedForCompare] = useState([]);
    const [comparisonData, setComparisonData] = useState(null);
    const [isComparing, setIsComparing] = useState(false);
    const [showComparisonModal, setShowComparisonModal] = useState(false);

    // Estado para limite de mineração
    const [miningInfo, setMiningInfo] = useState(null);
    const [showLimitError, setShowLimitError] = useState(false);

    // Estado para URL atual (para salvar vendedor)
    const [currentMiningUrl, setCurrentMiningUrl] = useState('');

    // ===== PERSISTÊNCIA DE SESSÃO DE MINERAÇÃO =====
    // Restaura sessão salva ao carregar a página
    useEffect(() => {
        try {
            const savedSession = localStorage.getItem('huofind_mining_session');
            if (savedSession) {
                const session = JSON.parse(savedSession);
                const sessionAge = Date.now() - (session.timestamp || 0);
                const MAX_SESSION_AGE = 24 * 60 * 60 * 1000; // 24 horas

                if (sessionAge < MAX_SESSION_AGE) {
                    console.log('[App] Restaurando sessão de mineração salva...');
                    if (session.products?.length > 0) {
                        setProducts(session.products);
                    }
                    if (session.sellerInfo) {
                        setSellerInfo(session.sellerInfo);
                    }
                    if (session.selectedCategory) {
                        setSelectedCategory(session.selectedCategory);
                    }
                    if (session.filters) {
                        setFilters(prev => ({ ...prev, ...session.filters }));
                    }
                    console.log(`[App] Sessão restaurada: ${session.products?.length || 0} produtos`);
                } else {
                    // Sessão expirada, limpa
                    localStorage.removeItem('huofind_mining_session');
                    console.log('[App] Sessão expirada, removida do storage');
                }
            }
        } catch (err) {
            console.error('[App] Erro ao restaurar sessão:', err);
        }
    }, []);

    // Salva sessão quando produtos ou vendedor mudam
    useEffect(() => {
        if (products.length > 0 || sellerInfo) {
            const session = {
                products,
                sellerInfo,
                selectedCategory,
                filters: {
                    iphoneModel: filters.iphoneModel,
                    storage: filters.storage,
                    watchModel: filters.watchModel,
                    watchSize: filters.watchSize
                },
                timestamp: Date.now()
            };
            localStorage.setItem('huofind_mining_session', JSON.stringify(session));
            console.log('[App] Sessão salva no localStorage');
        }
    }, [products, sellerInfo, selectedCategory, filters.iphoneModel, filters.storage, filters.watchModel, filters.watchSize]);

    // Função para limpar sessão manualmente (pode ser usada em um botão "Nova Mineração")
    const clearMiningSession = useCallback(() => {
        localStorage.removeItem('huofind_mining_session');
        setProducts([]);
        setSellerInfo(null);
        setFilters({
            keyword: '',
            minPrice: '',
            maxPrice: '',
            sort: '',
            iphoneModel: '',
            storage: '',
            unlockStatus: '',
            watchModel: '',
            watchSize: '',
            watchCondition: ''
        });
        console.log('[App] Sessão de mineração limpa');
    }, []);

    // Fetch mining status when user is authenticated
    useEffect(() => {
        const fetchMiningStatus = async () => {
            if (!isAuthenticated) {
                setMiningInfo(null);
                return;
            }

            try {
                const token = localStorage.getItem('accessToken');
                const response = await fetch('/api/user/mining-status', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (response.ok) {
                    const data = await response.json();
                    setMiningInfo({
                        tier: data.tier?.name || 'guest',
                        used: data.used || 0,
                        limit: data.limit === 'unlimited' ? Infinity : (data.limit || 10)
                    });
                }
            } catch (err) {
                console.error('[App] Error fetching mining status:', err);
            }
        };

        fetchMiningStatus();
    }, [isAuthenticated]);

    // Toggle do modo de comparação
    const toggleComparisonMode = () => {
        setComparisonMode(prev => !prev);
        if (comparisonMode) {
            // Se estamos desligando, limpa a seleção
            setSelectedForCompare([]);
        }
    };

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

    // Handlers para comparação de produtos
    const handleCompareToggle = useCallback((product) => {
        setSelectedForCompare(prev => {
            const isSelected = prev.some(p => p.id === product.id);
            if (isSelected) {
                return prev.filter(p => p.id !== product.id);
            }
            if (prev.length >= 4) return prev; // Max 4 products
            return [...prev, product];
        });
    }, []);

    const handleCompare = useCallback(async () => {
        if (selectedForCompare.length < 2) return;

        setIsComparing(true);
        setShowComparisonModal(true);
        setComparisonData(null);

        try {
            const response = await fetch('/api/compare', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    products: selectedForCompare.map(p => ({
                        id: p.id,
                        url: p.url
                    }))
                })
            });

            if (!response.ok) {
                throw new Error('Erro ao comparar produtos');
            }

            const data = await response.json();
            setComparisonData(data);
        } catch (err) {
            console.error('[App] Erro na comparação:', err);
            setComparisonData({ error: err.message });
        } finally {
            setIsComparing(false);
        }
    }, [selectedForCompare]);

    const clearCompareSelection = useCallback(() => {
        setSelectedForCompare([]);
    }, []);

    // Avalia o vendedor assim que a URL é colada
    const handleUrlChange = useCallback(async (url) => {
        setEvaluating(true);
        setSellerInfo(null);
        setError(null);
        setCurrentMiningUrl(url);

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

    // Salvar vendedor
    const handleSaveSeller = async (sellerData) => {
        const token = localStorage.getItem('accessToken');
        if (!token) throw new Error('Você precisa estar logado para salvar vendedores');

        const response = await fetch('/api/saved-sellers', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(sellerData)
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Erro ao salvar vendedor');

        return data.seller;
    };

    const handleMine = async (url, limit) => {
        // Guardar URL para uso no salvamento de vendedor
        setCurrentMiningUrl(url);

        setLoading(true);
        setError(null);
        setProducts([]);
        setMiningStage({ stage: 'starting', message: 'Iniciando mineração...', count: 0 });

        try {
            // Flags to track connection state
            let completedSuccessfully = false;
            let receivedAnyEvent = false;

            // Use SSE for real-time progress
            // Include token as query param since EventSource can't send headers
            const token = localStorage.getItem('accessToken');
            const eventSource = new EventSource(
                `/api/mine-stream?url=${encodeURIComponent(url)}&limit=${limit}&token=${token}`
            );

            eventSource.onopen = () => {
                console.log('[SSE] Conexão estabelecida');
                receivedAnyEvent = true;
            };

            eventSource.addEventListener('progress', (event) => {
                receivedAnyEvent = true;
                const data = JSON.parse(event.data);
                setMiningStage({
                    stage: data.stage,
                    message: data.message,
                    count: data.count || 0
                });
            });

            eventSource.addEventListener('complete', (event) => {
                completedSuccessfully = true;
                const data = JSON.parse(event.data);
                setProducts(data.products || []);
                if (data.sellerInfo) {
                    setSellerInfo(data.sellerInfo);
                }
                setIsMockData(data.isMock || false);
                setFilters(prev => ({ ...prev, iphoneModel: '', storage: '' }));
                setMiningStage({ stage: 'done', message: 'Concluído!', count: data.products?.length || 0 });
                setLoading(false);

                // Update mining count
                setMiningInfo(prev => prev ? { ...prev, used: prev.used + 1 } : null);

                eventSource.close();
            });

            eventSource.addEventListener('error', (event) => {
                receivedAnyEvent = true;
                try {
                    const data = JSON.parse(event.data);
                    // Check if it's a specific limit error
                    if (data.code === 'TIER_LIMIT_EXCEEDED') {
                        setShowLimitError(true);
                        // Also update current limit info if available
                        if (data.used !== undefined) {
                            setMiningInfo({
                                tier: data.tier || 'guest',
                                used: data.used,
                                limit: data.limit
                            });
                        }
                    } else {
                        setError(data.message || 'Erro na mineração');
                    }
                } catch {
                    setError('Erro de conexão com o servidor');
                }
                setLoading(false);
                eventSource.close();
            });

            eventSource.onerror = (e) => {
                // SSE connections always close after complete, which triggers onerror
                // Only show error if we never received any events AND didn't complete
                if (!completedSuccessfully && !receivedAnyEvent) {
                    console.error('[SSE] Erro de conexão:', e);
                    setError('Não foi possível conectar ao servidor. Verifique se o backend está rodando.');
                    setLoading(false);
                }
                eventSource.close();
            };

        } catch (err) {
            console.error('Erro:', err);
            setError(err.message || 'Erro ao conectar com o servidor');
            setLoading(false);
        }
    };

    // Extrai modelos e armazenamentos disponíveis (iPhone)
    const availableModels = useMemo(() => extractUniqueModels(products), [products]);
    const availableStorages = useMemo(() => extractUniqueStorages(products), [products]);

    // Extrai modelos e tamanhos disponíveis (Apple Watch)
    const availableWatchModels = useMemo(() => extractUniqueWatchModels(products), [products]);
    const availableWatchSizes = useMemo(() => extractUniqueWatchSizes(products), [products]);

    // Filtra e ordena produtos localmente
    const filteredProducts = useMemo(() => {
        let result = [...products];

        // iPhone filters
        if (filters.iphoneModel) {
            result = result.filter(p => detectIPhoneModel(p) === filters.iphoneModel);
        }

        if (filters.storage) {
            result = result.filter(p => detectStorage(p) === filters.storage);
        }

        if (filters.unlockStatus) {
            result = result.filter(p => detectUnlockStatus(p) === filters.unlockStatus);
        }

        // Apple Watch filters
        if (filters.watchModel) {
            result = result.filter(p => detectAppleWatchModel(p) === filters.watchModel);
        }

        if (filters.watchSize) {
            result = result.filter(p => detectWatchSize(p) === filters.watchSize);
        }

        if (filters.watchCondition) {
            result = result.filter(p => {
                const condition = detectCondition(p);
                if (!condition) return false;
                const score = condition.score;
                if (filters.watchCondition === '99+') return score >= 99;
                if (filters.watchCondition === '95+') return score >= 95;
                return true;
            });
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

    // Auth loading state
    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-cream-50)' }}>
                <div className="grid-pattern-container">
                    <div className="grid-pattern" />
                </div>
                <WifiLoader message="Carregando..." />
            </div>
        );
    }

    // Not authenticated - show auth card
    if (!isAuthenticated) {
        return <AuthCard />;
    }

    return (
        <div className="min-h-screen relative">
            <div className="grid-pattern-container">
                <div className="grid-pattern" />
            </div>
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
                            <img src="/logo.svg" alt="Huofind Logo" className="h-10 md:h-12 w-auto object-contain" />
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
                                    storage: '',
                                    unlockStatus: ''
                                });
                            }}
                            className="cta-button"
                        >
                            <svg width="13px" height="10px" viewBox="0 0 13 10">
                                <path d="M12,5 L2,5" />
                                <polyline points="5 1 1 5 5 9" />
                            </svg>
                            <span>Nova busca</span>
                        </button>

                        {/* User Menu */}
                        <div className="flex items-center gap-3 ml-4">
                            <span className="text-sm font-medium" style={{ color: '#6B7280' }}>
                                {user?.name || user?.email?.split('@')[0]}
                            </span>
                            <button
                                onClick={logout}
                                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 hover:bg-red-50"
                                style={{ color: '#DC2626' }}
                            >
                                Sair
                            </button>
                        </div>
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
                            isSellerVerified={sellerInfo !== null && !evaluating}
                            selectedCategory={selectedCategory}
                            onCategoryChange={setSelectedCategory}
                            miningInfo={miningInfo}
                            showLimitError={showLimitError}
                            onDismissLimitError={() => setShowLimitError(false)}
                        />

                        {/* Seller Card preview (aparece após avaliar) */}
                        {sellerInfo && !loading && (
                            <div className="max-w-2xl mx-auto px-6 animate-fade-in-up">
                                <SellerCard
                                    sellerInfo={sellerInfo}
                                    variant="compact"
                                    sellerUrl={currentMiningUrl}
                                    onSaveSeller={handleSaveSeller}
                                />
                            </div>
                        )}
                    </>
                )}

                {/* Loading State with WiFi Animation */}
                {loading && (
                    <div className="min-h-screen flex flex-col items-center justify-center">
                        <WifiLoader message="Minerando..." />

                        {/* Stage indicator below the loader */}
                        <div className="text-center mt-4">
                            <p className="font-medium text-base" style={{ color: '#4B5563' }}>
                                {miningStage.stage === 'connecting' && '🔌 Conectando ao vendedor...'}
                                {miningStage.stage === 'navigating' && '🌐 Navegando para página...'}
                                {miningStage.stage === 'verifying' && '🔍 Verificando vendedor...'}
                                {miningStage.stage === 'seller_verified' && '✅ Vendedor verificado!'}
                                {miningStage.stage === 'cards_found' && '📦 Produtos detectados!'}
                                {miningStage.stage === 'scrolling' && '⏳ Carregando produtos...'}
                                {miningStage.stage === 'products_found' && `📦 ${miningStage.count} produtos encontrados!`}
                                {miningStage.stage === 'translating' && '🌐 Traduzindo produtos...'}
                                {miningStage.stage === 'done' && '✨ Concluído!'}
                                {miningStage.stage === 'cache' && '⚡ Carregando do cache...'}
                                {miningStage.stage === 'starting' && '🚀 Iniciando mineração...'}
                                {!miningStage.stage && 'Aguarde alguns segundos...'}
                            </p>
                            {miningStage.message && (
                                <p className="text-sm mt-1" style={{ color: '#9CA3AF' }}>
                                    {miningStage.message}
                                </p>
                            )}
                        </div>
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
                        {sellerInfo && (
                            <SellerCard
                                sellerInfo={sellerInfo}
                                sellerUrl={currentMiningUrl}
                                onSaveSeller={handleSaveSeller}
                            />
                        )}

                        {/* Filters */}
                        <SearchFilters
                            filters={filters}
                            onFilterChange={setFilters}
                            availableModels={availableModels}
                            availableStorages={availableStorages}
                            availableWatchModels={availableWatchModels}
                            availableWatchSizes={availableWatchSizes}
                            showBRL={showBRL}
                            onToggleCurrency={toggleCurrency}
                            comparisonMode={comparisonMode}
                            onToggleComparisonMode={toggleComparisonMode}
                            selectedCount={selectedForCompare.length}
                            category={selectedCategory}
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
                        <ProductGrid
                            products={filteredProducts}
                            showBRL={showBRL}
                            exchangeRate={exchangeRate}
                            selectedForCompare={selectedForCompare}
                            onCompareToggle={handleCompareToggle}
                            comparisonMode={comparisonMode}
                        />
                    </>
                )}
            </main>

            {/* Comparison Bar - floating at bottom */}
            <CompareBar
                selectedProducts={selectedForCompare}
                onRemove={(id) => setSelectedForCompare(prev => prev.filter(p => p.id !== id))}
                onCompareClick={handleCompare}
                onClear={clearCompareSelection}
                isComparing={isComparing}
            />

            {/* Comparison Modal */}
            <ComparisonModal
                isOpen={showComparisonModal}
                onClose={() => {
                    setShowComparisonModal(false);
                    setComparisonData(null);
                }}
                comparisonData={comparisonData}
                isLoading={isComparing}
            />
        </div>
    );
}

export default App;
