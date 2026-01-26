import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import HeroSection from './components/HeroSection';
import SellerCard from './components/SellerCard';
import SearchFilters from './components/SearchFilters';
import ProductGrid from './components/ProductGrid';
import WifiLoader from './components/WifiLoader';
import AuthCard from './components/AuthCard';
import LegalPage from './pages/LegalPage';
import Sidebar from './components/Sidebar';
import { HomePage } from './components/Home';

import SavedSellersPanel from './components/SavedSellersPanel';
import { SavedProductsPage } from './components/SavedProducts';
import { ProfilePage } from './components/Profile';
import { StorePage } from './components/Store';
import YupooSearchPage from './components/YupooSearch/YupooSearchPage';
import { useAuth } from './contexts/AuthContext';
import useSavedProductsRealtime from './hooks/useSavedProductsRealtime';
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

    // Estado para créditos de mineração
    const [miningInfo, setMiningInfo] = useState({ credits: 0, maxCredits: 3, maxProducts: 30 });
    const [showLimitError, setShowLimitError] = useState(false);

    // Virtual Paging
    const [activePage, setActivePage] = useState('home');

    // Compute isGuest - user is guest if not authenticated or tier is 'guest'/'convidado'
    const isGuest = !isAuthenticated ||
        !user?.tier ||
        user.tier.toLowerCase() === 'guest' ||
        user.tier.toLowerCase() === 'convidado';

    // Exchange rate logicURL atual (para salvar vendedor)
    const [currentMiningUrl, setCurrentMiningUrl] = useState('');

    // Estado para produtos salvos
    const [savedProductUrls, setSavedProductUrls] = useState([]);
    const [savedProducts, setSavedProducts] = useState([]);
    const [savedSellerIds, setSavedSellerIds] = useState([]); // IDs únicos do Xianyu (ex: 391299371)

    // Estado para coleções
    const [collections, setCollections] = useState([]);
    const [collectionIcons, setCollectionIcons] = useState([]);
    const [collectionColors, setCollectionColors] = useState([]);

    // URL no campo de busca (HeroSection)
    const [heroUrl, setHeroUrl] = useState('');

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
                        credits: data.credits || 0,
                        maxCredits: data.maxCredits || 3,
                        maxProducts: data.maxProducts || 30,
                        nextRenewal: data.nextRenewal
                    });
                }
            } catch (err) {
                console.error('[App] Error fetching mining status:', err);
            }
        };

        fetchMiningStatus();
    }, [isAuthenticated]);

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

    // Salvar vendedor
    const handleSaveSeller = async (sellerData) => {
        const token = localStorage.getItem('accessToken');
        if (!token) {
            alert('Você precisa estar logado para salvar vendedores');
            return { error: 'NOT_AUTHENTICATED' };
        }

        try {
            const response = await fetch('/api/saved-sellers', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(sellerData)
            });

            const data = await response.json();

            if (!response.ok) {
                if (data.code === 'LIMIT_REACHED') {
                    alert(`Limite de vendedores salvos atingido (${data.used}/${data.limit}). Remova vendedores para salvar novos.`);
                    return { error: 'LIMIT_REACHED', used: data.used, limit: data.limit };
                }
                alert(data.error || 'Erro ao salvar vendedor');
                return { error: data.error };
            }

            // Sync global state for instant UI feedback
            if (data.seller && data.seller.seller_id) {
                setSavedSellerIds(prev => [...new Set([...prev, data.seller.seller_id])]);
            }

            return { success: true, seller: data.seller };
        } catch (err) {
            console.error('Erro ao salvar vendedor:', err);
            alert('Erro ao salvar vendedor');
            return { error: 'Erro ao salvar vendedor' };
        }
    };

    // Busca vendedores salvos para controle global de status
    const fetchSavedSellers = async () => {
        const token = localStorage.getItem('accessToken');
        if (!token) return;

        try {
            // First, run migration to fix any NULL seller_ids
            await fetch('/api/saved-sellers/migrate-ids', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const response = await fetch('/api/saved-sellers', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                console.log('[App] fetchSavedSellers response:', data);
                const sellerIds = (data.sellers || []).map(s => s.seller_id).filter(id => id !== null);
                console.log('[App] Mapped seller_ids (filtered):', sellerIds);
                setSavedSellerIds(sellerIds);
            }
        } catch (err) {
            console.error('Erro ao buscar vendedores salvos:', err);
        }
    };

    // Busca produtos salvos quando autenticado
    const fetchSavedProducts = async () => {
        const token = localStorage.getItem('accessToken');
        if (!token) return;

        try {
            const response = await fetch('/api/saved-products', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();

                // Mapeamos os IDs para controle de bookmark rápido
                setSavedProductUrls((data.products || []).map(p => p.product_url));

                // Mantemos o formato original do banco + campos extras (platform, collection_id)
                // para compatibilidade com SavedProductCard
                setSavedProducts(data.products || []);
            }
        } catch (err) {
            console.error('Erro ao buscar produtos salvos:', err);
        }
    };

    // Busca produtos salvos ao autenticar
    useEffect(() => {
        if (isAuthenticated) {
            fetchSavedProducts();
            fetchSavedSellers();
            fetchCollections();
        } else {
            setSavedProductUrls([]);
            setSavedSellerIds([]);
            setCollections([]);
            setSavedProducts([]);
        }
    }, [isAuthenticated]);

    // ===== REALTIME SUBSCRIPTIONS =====
    // Callback para mudanças em produtos salvos
    const handleProductsRealtimeChange = useCallback((eventType, newRecord, oldRecord) => {
        if (eventType === 'INSERT') {
            setSavedProducts(prev => [newRecord, ...prev]);
            setSavedProductUrls(prev => [...prev, newRecord.product_url]);
        } else if (eventType === 'UPDATE') {
            setSavedProducts(prev => prev.map(p => p.id === newRecord.id ? newRecord : p));
        } else if (eventType === 'DELETE') {
            setSavedProducts(prev => prev.filter(p => p.id !== oldRecord.id));
            setSavedProductUrls(prev => prev.filter(url => url !== oldRecord.product_url));
        }
        // Atualiza contagem nas coleções
        fetchCollections();
    }, []);

    // Callback para mudanças em coleções
    const handleCollectionsRealtimeChange = useCallback((eventType, newRecord, oldRecord) => {
        if (eventType === 'INSERT') {
            setCollections(prev => [...prev, { ...newRecord, productCount: 0 }]);
        } else if (eventType === 'UPDATE') {
            setCollections(prev => prev.map(c => c.id === newRecord.id ? { ...c, ...newRecord } : c));
        } else if (eventType === 'DELETE') {
            setCollections(prev => prev.filter(c => c.id !== oldRecord.id));
        }
    }, []);

    // Ativa subscriptions de realtime
    useSavedProductsRealtime(
        user?.id,
        {
            onProductsChange: handleProductsRealtimeChange,
            onCollectionsChange: handleCollectionsRealtimeChange
        }
    );

    // ===== COLLECTIONS HANDLERS =====
    const fetchCollections = async () => {
        const token = localStorage.getItem('accessToken');
        if (!token) return;

        try {
            const response = await fetch('/api/collections', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setCollections(data.collections || []);
                setCollectionIcons(data.icons || []);
                setCollectionColors(data.colors || []);
            }
        } catch (err) {
            console.error('Erro ao buscar coleções:', err);
        }
    };

    const handleCreateCollection = async (collectionData) => {
        const token = localStorage.getItem('accessToken');
        if (!token) return;

        const response = await fetch('/api/collections', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(collectionData)
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Erro ao criar coleção');
        }

        const data = await response.json();
        setCollections(prev => [...prev, data.collection]);
        return data.collection;
    };

    const handleUpdateCollection = async (collectionId, updates) => {
        const token = localStorage.getItem('accessToken');
        if (!token) return;

        const response = await fetch(`/api/collections/${collectionId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(updates)
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Erro ao atualizar coleção');
        }

        const data = await response.json();
        setCollections(prev => prev.map(c => c.id === collectionId ? data.collection : c));
        return data.collection;
    };

    const handleDeleteCollection = async (collectionId) => {
        const token = localStorage.getItem('accessToken');
        if (!token) return;

        const response = await fetch(`/api/collections/${collectionId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Erro ao deletar coleção');
        }

        setCollections(prev => prev.filter(c => c.id !== collectionId));
    };

    const handleMoveProductToCollection = async (productId, collectionId) => {
        const token = localStorage.getItem('accessToken');
        if (!token) return;

        const response = await fetch(`/api/saved-products/${productId}/collection`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ collectionId })
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Erro ao mover produto');
        }

        // Update local state
        setSavedProducts(prev => prev.map(p =>
            p.id === productId ? { ...p, collection_id: collectionId } : p
        ));
        // Refresh collections to update counts
        fetchCollections();
    };

    const handleRemoveProduct = async (productId) => {
        const token = localStorage.getItem('accessToken');
        if (!token) return;

        const response = await fetch(`/api/saved-products/${productId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Erro ao remover produto');
        }

        // Remove from local state
        const removedProduct = savedProducts.find(p => p.id === productId);
        setSavedProducts(prev => prev.filter(p => p.id !== productId));
        if (removedProduct) {
            setSavedProductUrls(prev => prev.filter(url => url !== removedProduct.product_url));
        }
        // Refresh collections to update counts
        fetchCollections();
    };

    // Toggle salvar/remover produto
    const handleSaveProductToggle = async (product) => {
        const token = localStorage.getItem('accessToken');
        if (!token) {
            return { error: 'NOT_AUTHENTICATED' };
        }

        try {
            const response = await fetch('/api/saved-products/toggle', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    productUrl: product.url,
                    productTitle: product.nameTranslated || product.name,
                    productPrice: parseFloat(product.price) || null,
                    productImage: product.images?.[0] || null,
                    productCurrency: 'CNY',
                    sellerName: product.sellerName || null
                })
            });

            const data = await response.json();

            if (!response.ok) {
                if (data.code === 'LIMIT_REACHED') {
                    // Retorna info de erro para o componente mostrar feedback visual
                    return {
                        error: 'LIMIT_REACHED',
                        limitInfo: { used: data.used, limit: data.limit }
                    };
                }
                return { error: data.error || 'Erro ao salvar produto' };
            }

            // Atualiza lista de URLs salvas
            if (data.saved) {
                setSavedProductUrls(prev => [...prev, product.url]);
            } else {
                setSavedProductUrls(prev => prev.filter(url => url !== product.url));
            }

            return { success: true, saved: data.saved };
        } catch (err) {
            console.error('Erro ao toggle produto:', err);
            return { error: 'Erro ao salvar produto' };
        }
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

                // Update mining credits
                setMiningInfo(prev => prev ? { ...prev, credits: Math.max(0, prev.credits - 1) } : null);

                eventSource.close();
            });

            eventSource.addEventListener('error', (event) => {
                receivedAnyEvent = true;
                try {
                    const data = JSON.parse(event.data);
                    // Check if it's a specific limit error
                    if (data.code === 'NO_CREDITS') {
                        setShowLimitError(true);
                        // Also update current credits info if available
                        if (data.credits !== undefined) {
                            setMiningInfo(prev => ({
                                ...prev,
                                tier: data.tier || prev.tier,
                                credits: data.credits,
                                maxCredits: data.maxCredits || prev.maxCredits
                            }));
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

    // Simplified routing logic for legal pages
    const path = window.location.pathname;
    if (path === '/terms' || path === '/privacy') {
        return <LegalPage initialType={path === '/privacy' ? 'privacy' : 'terms'} />;
    }

    // Force navigation to home if viewing a virtual page but not logged in (though AuthCard handles most cases)
    if (!user && activePage !== 'home') {
        setActivePage('home');
    }

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
        <div className="h-screen relative overflow-hidden">
            <div className="grid-pattern-container">
                <div className="grid-pattern" />
            </div>

            {/* Sidebar Navigation */}
            {user && (
                <Sidebar
                    user={user}
                    activePage={activePage}
                    miningInfo={miningInfo}
                    onPageChange={(page) => {
                        setActivePage(page);
                    }}
                    onLogout={logout}
                />
            )}
            {/* Header - só aparece quando tem resultados e estamos na página de mineração */}
            {(hasResults && activePage === 'xianyu-mining') && (
                <header
                    className="hidden md:block sticky top-0 z-30 animate-in fade-in slide-in-from-top duration-500 md:ml-64"
                    style={{
                        background: 'rgba(255, 251, 247, 0.8)',
                        backdropFilter: 'blur(12px)',
                        borderBottom: '1px solid var(--color-cream-200)'
                    }}
                >
                    <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {/* Logo hidden here - shown in sidebar */}
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

            <main className="h-full md:ml-64 pt-14 md:pt-0 overflow-y-auto">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activePage}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className={`w-full ${activePage === 'xianyu-mining' && hasResults ? 'max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8' : activePage === 'home' ? '' : 'px-4 md:px-6 py-6 md:py-8'}`}
                    >
                        {/* HOME PAGE */}
                        {activePage === 'home' && (
                            <HomePage
                                savedProducts={savedProducts}
                                onNavigate={(page, params) => {
                                    setActivePage(page);
                                    // Handle category filter params if provided
                                    if (params?.category) {
                                        // Store category for YupooSearchPage to pick up
                                        sessionStorage.setItem('yupoo_category_filter', params.category);
                                    }
                                }}
                                onSearch={(query) => {
                                    // Navigate to yupoo-search with the search query
                                    sessionStorage.setItem('yupoo_search_query', query);
                                    setActivePage('yupoo-search');
                                }}
                                onCategoryClick={(categoryId) => {
                                    sessionStorage.setItem('yupoo_category_filter', categoryId);
                                    setActivePage('yupoo-search');
                                }}
                                isLoading={authLoading}
                                isGuest={isGuest}
                            />
                        )}

                        {/* XIANYU MINING PAGE - Moved from Home */}
                        {activePage === 'xianyu-mining' && (
                            <div className={`${hasResults ? 'max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8' : ''}`}>
                                {/* Hero Section - Solo aparece si no hay resultados y no está cargando */}
                                {!hasResults && !loading && (
                                    <HeroSection
                                        onUrlChange={(url) => {
                                            setHeroUrl(url);
                                            handleUrlChange(url);
                                        }}
                                        onMine={handleMine}
                                        isEvaluating={evaluating}
                                        isLoading={loading}
                                        isSellerVerified={sellerInfo !== null && !evaluating}
                                        selectedCategory={selectedCategory}
                                        onCategoryChange={setSelectedCategory}
                                        miningInfo={miningInfo}
                                        showLimitError={showLimitError}
                                        onDismissLimitError={() => setShowLimitError(false)}
                                        initialUrl={heroUrl}
                                    />
                                )}

                                {/* Loading State with WiFi Animation */}
                                {loading && (
                                    <div className="min-h-[60vh] flex flex-col items-center justify-center">
                                        <WifiLoader message="Minerando..." />
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
                                    <div className="animate-in fade-in duration-700">
                                        {/* Seller Card */}
                                        {sellerInfo && (() => {
                                            const isSavedCheck = savedSellerIds.includes(sellerInfo.sellerId);
                                            return (
                                                <SellerCard
                                                    sellerInfo={sellerInfo}
                                                    sellerUrl={currentMiningUrl}
                                                    onSaveSeller={handleSaveSeller}
                                                    isSaved={isSavedCheck}
                                                />
                                            );
                                        })()}

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
                                            savedProductUrls={savedProductUrls}
                                            onSaveToggle={handleSaveProductToggle}
                                            category={selectedCategory}
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Yupoo Search Page */}
                        {activePage === 'yupoo-search' && (
                            <div className="h-full w-full">
                                <YupooSearchPage
                                    showBRL={showBRL}
                                    onToggleCurrency={toggleCurrency}
                                    exchangeRate={exchangeRate}
                                    savedProductUrls={savedProductUrls}
                                    onSaveToggle={handleSaveProductToggle}
                                    isGuest={isGuest}
                                />
                            </div>
                        )}

                        {/* Sellers Page */}
                        {activePage === 'sellers' && (
                            <div className="w-full max-w-5xl mx-auto px-4 md:px-8 py-6">
                                <h2 className="text-3xl md:text-4xl font-black mb-6 tracking-tight" style={{ color: '#1F2937' }}>
                                    Vendedores Salvos
                                </h2>
                                <section className="bg-white p-6 md:p-10 rounded-[2rem] shadow-xl border border-gray-100/50">
                                    <SavedSellersPanel
                                        tier={user?.tier}
                                        onSelectSeller={(sellerUrl) => {
                                            setHeroUrl(sellerUrl);
                                            setActivePage('xianyu-mining');
                                            handleUrlChange(sellerUrl);
                                        }}
                                    />
                                </section>
                            </div>
                        )}

                        {/* Products Page */}
                        {activePage === 'products' && (
                            <SavedProductsPage
                                products={savedProducts}
                                collections={collections}
                                collectionIcons={collectionIcons}
                                collectionColors={collectionColors}
                                onCreateCollection={handleCreateCollection}
                                onUpdateCollection={handleUpdateCollection}
                                onDeleteCollection={handleDeleteCollection}
                                onMoveProductToCollection={handleMoveProductToCollection}
                                onRemoveProduct={handleRemoveProduct}
                            />
                        )}

                        {/* Profile Page */}
                        {activePage === 'profile' && (
                            <ProfilePage
                                user={user}
                                miningInfo={miningInfo}
                                savedProductsCount={savedProducts.length}
                                savedSellersCount={savedSellerIds.length}
                                collectionsCount={collections.length}
                                onLogout={logout}
                                onShowUpgrade={() => setShowLimitError(true)}
                                onUserUpdate={(updatedUser) => {
                                    // AuthContext handles user updates automatically on re-fetch
                                    console.log('User updated:', updatedUser);
                                }}
                            />
                        )}

                        {/* Store Page */}
                        {activePage === 'store' && (
                            <StorePage
                                user={user}
                                miningInfo={miningInfo}
                            />
                        )}


                    </motion.div>
                </AnimatePresence>
            </main>

        </div>
    );
}

export default App;
