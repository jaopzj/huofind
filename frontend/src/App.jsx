import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from './components/Sidebar';
import WifiLoader from './components/WifiLoader';
import { LuCheck, LuX } from 'react-icons/lu';
import { useAuth } from './contexts/AuthContext';
import useSavedProductsRealtime from './hooks/useSavedProductsRealtime';
import {
    extractUniqueModels,
    detectIPhoneModel,
    detectStorage,
    extractUniqueStorages,
    detectUnlockStatus
} from './utils/iphoneDetector';
import { normalizeTier } from './utils/tierUtils';
import {
    detectAppleWatchModel,
    detectWatchSize,
    detectCondition,
    extractUniqueWatchModels,
    extractUniqueWatchSizes
} from './utils/appleWatchDetector';

function App() {
    const { user, isAuthenticated, loading: authLoading, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

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
        unlockStatus: '',
        watchModel: '',
        watchSize: '',
        watchCondition: ''
    });

    const [selectedCategory, setSelectedCategory] = useState('iphone');
    const [showBRL, setShowBRL] = useState(false);
    const [exchangeRate, setExchangeRate] = useState(0);
    const [miningStage, setMiningStage] = useState({ stage: '', message: '', count: 0 });
    const [miningInfo, setMiningInfo] = useState({ credits: 0, maxCredits: null, maxProducts: null });
    const [tierLimits, setTierLimits] = useState(null);
    const [showLimitError, setShowLimitError] = useState(false);
    const [paymentFeedback, setPaymentFeedback] = useState(null);
    const [appReady, setAppReady] = useState(false);
    const [showBackToTop, setShowBackToTop] = useState(false);
    const mainRef = useRef(null);
    const [currentMiningUrl, setCurrentMiningUrl] = useState('');
    const [savedProductUrls, setSavedProductUrls] = useState([]);
    const [savedProducts, setSavedProducts] = useState([]);
    const [savedSellerIds, setSavedSellerIds] = useState([]);
    const [collections, setCollections] = useState([]);
    const [collectionIcons, setCollectionIcons] = useState([]);
    const [collectionColors, setCollectionColors] = useState([]);
    const [heroUrl, setHeroUrl] = useState('');

    // Compute user tier (canonical English name)
    const userTier = useMemo(() => normalizeTier(user?.tier), [user]);

    const isGuest = !isAuthenticated || userTier === 'guest';
    const isBronze = userTier === 'bronze';
    const isRestrictedForPremiumFeatures = isGuest || isBronze;

    const handleScroll = useCallback((e) => {
        setShowBackToTop(e.currentTarget.scrollTop > 500);
    }, []);

    const scrollToTop = useCallback(() => {
        if (mainRef.current) {
            mainRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, []);

    // ===== REFERRAL CODE CAPTURE =====
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const refCode = urlParams.get('ref');
        if (refCode && refCode.length === 7) {
            sessionStorage.setItem('referralCode', refCode);
            console.log('[App] Referral code detected:', refCode);
            const newUrl = window.location.pathname;
            window.history.replaceState({}, '', newUrl);
        }
    }, []);

    // ===== TIER LIMITS (LOG-12) =====
    // Load tier limits from backend once on mount — single source of truth
    useEffect(() => {
        fetch('/api/config/limits')
            .then(res => res.json())
            .then(data => {
                if (data.tiers) {
                    setTierLimits(data.tiers);
                }
            })
            .catch(err => console.error('[App] Error fetching tier limits:', err));
    }, []);

    // ===== MINING SESSION PERSISTENCE =====
    useEffect(() => {
        try {
            const savedSession = localStorage.getItem('evo_society_mining_session');
            if (savedSession) {
                const session = JSON.parse(savedSession);
                const sessionAge = Date.now() - (session.timestamp || 0);
                const MAX_SESSION_AGE = 24 * 60 * 60 * 1000;

                if (sessionAge < MAX_SESSION_AGE) {
                    console.log('[App] Restaurando sessão de mineração salva...');
                    if (session.products?.length > 0) setProducts(session.products);
                    if (session.sellerInfo) setSellerInfo(session.sellerInfo);
                    if (session.selectedCategory) setSelectedCategory(session.selectedCategory);
                    if (session.filters) setFilters(prev => ({ ...prev, ...session.filters }));
                    console.log(`[App] Sessão restaurada: ${session.products?.length || 0} produtos`);
                } else {
                    localStorage.removeItem('evo_society_mining_session');
                }
            }
        } catch (err) {
            console.error('[App] Erro ao restaurar sessão:', err);
        }
    }, []);

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
            localStorage.setItem('evo_society_mining_session', JSON.stringify(session));
        }
    }, [products, sellerInfo, selectedCategory, filters.iphoneModel, filters.storage, filters.watchModel, filters.watchSize]);

    const clearMiningSession = useCallback(() => {
        localStorage.removeItem('evo_society_mining_session');
        setProducts([]);
        setSellerInfo(null);
        setFilters({
            keyword: '', minPrice: '', maxPrice: '', sort: '',
            iphoneModel: '', storage: '', unlockStatus: '',
            watchModel: '', watchSize: '', watchCondition: ''
        });
    }, []);

    // ===== MINING STATUS =====
    const fetchMiningStatus = useCallback(async (isInitialLoad = false) => {
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
                    maxCredits: data.maxCredits,
                    maxProducts: data.maxProducts,
                    nextRenewal: data.nextRenewal,
                    subscriptionEnd: data.subscriptionEnd || null,
                });
            }
        } catch (err) {
            console.error('[App] Error fetching mining status:', err);
        } finally {
            if (isInitialLoad) setAppReady(true);
        }
    }, [isAuthenticated]);

    useEffect(() => {
        if (isAuthenticated) {
            fetchMiningStatus(true);
        } else {
            setAppReady(true);
        }
    }, [fetchMiningStatus, isAuthenticated]);

    useEffect(() => {
        const handleCreditsUpdated = () => fetchMiningStatus();
        window.addEventListener('credits-updated', handleCreditsUpdated);
        return () => window.removeEventListener('credits-updated', handleCreditsUpdated);
    }, [fetchMiningStatus]);

    // ===== STRIPE PAYMENT VERIFICATION =====
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const sessionId = params.get('session_id');
        const token = localStorage.getItem('accessToken');

        if (params.get('success') === 'true' && sessionId && token) {
            window.history.replaceState({}, '', window.location.pathname);

            const verifySession = async () => {
                try {
                    const res = await fetch('/api/stripe/verify-session', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ sessionId })
                    });
                    const data = await res.json();
                    if (res.ok) {
                        setPaymentFeedback({ type: 'success', message: 'Pagamento realizado com sucesso! Seus créditos foram atualizados.' });
                        fetchMiningStatus();
                    } else {
                        setPaymentFeedback({ type: 'error', message: data.error || 'Erro ao verificar pagamento' });
                    }
                } catch (err) {
                    console.error('[App] Verify session error:', err);
                    setPaymentFeedback({ type: 'success', message: 'Pagamento realizado! Recarregue a página para ver seus créditos.' });
                }
            };
            verifySession();
        } else if (params.get('canceled') === 'true') {
            window.history.replaceState({}, '', window.location.pathname);
            setPaymentFeedback({ type: 'canceled', message: 'Pagamento cancelado. Nenhuma cobrança foi feita.' });
        }
    }, []);

    useEffect(() => {
        if (paymentFeedback) {
            const timer = setTimeout(() => setPaymentFeedback(null), 8000);
            return () => clearTimeout(timer);
        }
    }, [paymentFeedback]);

    // ===== EXCHANGE RATE =====
    useEffect(() => {
        if (showBRL && exchangeRate === 0) {
            fetch('/api/exchange-rate')
                .then(res => res.json())
                .then(data => {
                    if (data.rate) setExchangeRate(data.rate);
                })
                .catch(err => console.error('[App] Erro ao buscar taxa de câmbio:', err));
        }
    }, [showBRL, exchangeRate]);

    const toggleCurrency = useCallback(() => setShowBRL(prev => !prev), []);

    // ===== SELLER EVALUATION =====
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
            if (response.ok) {
                const data = await response.json();
                if (data.sellerInfo) setSellerInfo(data.sellerInfo);
            } else {
                const data = await response.json().catch(() => ({}));
                setError(data.error || 'Erro ao verificar vendedor. Tente novamente.');
            }
        } catch (err) {
            console.error('Erro ao avaliar vendedor:', err);
            setError('Não foi possível conectar ao servidor para verificar o vendedor.');
        } finally {
            setEvaluating(false);
        }
    }, []);

    // ===== SAVE SELLER =====
    const handleSaveSeller = useCallback(async (sellerData) => {
        const token = localStorage.getItem('accessToken');
        if (!token) {
            alert('Você precisa estar logado para salvar vendedores');
            return { error: 'NOT_AUTHENTICATED' };
        }
        try {
            const response = await fetch('/api/saved-sellers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(sellerData)
            });
            const data = await response.json();
            if (!response.ok) {
                if (data.code === 'LIMIT_REACHED') {
                    alert(`Limite de vendedores salvos atingido (${data.used}/${data.limit}).`);
                    return { error: 'LIMIT_REACHED', used: data.used, limit: data.limit };
                }
                alert(data.error || 'Erro ao salvar vendedor');
                return { error: data.error };
            }
            if (data.seller?.seller_id) {
                setSavedSellerIds(prev => [...new Set([...prev, data.seller.seller_id])]);
            }
            return { success: true, seller: data.seller };
        } catch (err) {
            console.error('Erro ao salvar vendedor:', err);
            alert('Erro ao salvar vendedor');
            return { error: 'Erro ao salvar vendedor' };
        }
    }, []);

    // ===== FETCH SAVED DATA =====
    const fetchSavedSellers = async () => {
        const token = localStorage.getItem('accessToken');
        if (!token) return;
        try {
            await fetch('/api/saved-sellers/migrate-ids', { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
            const response = await fetch('/api/saved-sellers', { headers: { 'Authorization': `Bearer ${token}` } });
            if (response.ok) {
                const data = await response.json();
                const sellerIds = (data.sellers || []).map(s => s.seller_id).filter(id => id !== null);
                setSavedSellerIds(sellerIds);
            }
        } catch (err) {
            console.error('Erro ao buscar vendedores salvos:', err);
        }
    };

    const fetchSavedProducts = async () => {
        const token = localStorage.getItem('accessToken');
        if (!token) return;
        try {
            const response = await fetch('/api/saved-products', { headers: { 'Authorization': `Bearer ${token}` } });
            if (response.ok) {
                const data = await response.json();
                setSavedProductUrls((data.products || []).map(p => p.product_url));
                setSavedProducts(data.products || []);
            }
        } catch (err) {
            console.error('Erro ao buscar produtos salvos:', err);
        }
    };

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

    // ===== REALTIME =====
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
        fetchCollections();
    }, []);

    const handleCollectionsRealtimeChange = useCallback((eventType, newRecord, oldRecord) => {
        if (eventType === 'INSERT') {
            setCollections(prev => [...prev, { ...newRecord, productCount: 0 }]);
        } else if (eventType === 'UPDATE') {
            setCollections(prev => prev.map(c => c.id === newRecord.id ? { ...c, ...newRecord } : c));
        } else if (eventType === 'DELETE') {
            setCollections(prev => prev.filter(c => c.id !== oldRecord.id));
        }
    }, []);

    useSavedProductsRealtime(user?.id, {
        onProductsChange: handleProductsRealtimeChange,
        onCollectionsChange: handleCollectionsRealtimeChange
    });

    // ===== COLLECTIONS =====
    const fetchCollections = async () => {
        const token = localStorage.getItem('accessToken');
        if (!token) return;
        try {
            const response = await fetch('/api/collections', { headers: { 'Authorization': `Bearer ${token}` } });
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

    const handleCreateCollection = useCallback(async (collectionData) => {
        const token = localStorage.getItem('accessToken');
        if (!token) return;
        const response = await fetch('/api/collections', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(collectionData)
        });
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Erro ao criar coleção');
        }
        const data = await response.json();
        setCollections(prev => [...prev, data.collection]);
        return data.collection;
    }, []);

    const handleUpdateCollection = useCallback(async (collectionId, updates) => {
        const token = localStorage.getItem('accessToken');
        if (!token) return;
        const response = await fetch(`/api/collections/${collectionId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(updates)
        });
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Erro ao atualizar coleção');
        }
        const data = await response.json();
        setCollections(prev => prev.map(c => c.id === collectionId ? data.collection : c));
        return data.collection;
    }, []);

    const handleDeleteCollection = useCallback(async (collectionId) => {
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
    }, []);

    const handleMoveProductToCollection = useCallback(async (productId, collectionId) => {
        const token = localStorage.getItem('accessToken');
        if (!token) return;
        const response = await fetch(`/api/saved-products/${productId}/collection`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ collectionId })
        });
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Erro ao mover produto');
        }
        setSavedProducts(prev => prev.map(p =>
            p.id === productId ? { ...p, collection_id: collectionId } : p
        ));
    }, []);

    const handleRemoveProduct = useCallback(async (productId) => {
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
        setSavedProducts(prev => {
            const removedProduct = prev.find(p => p.id === productId);
            if (removedProduct) {
                setSavedProductUrls(urls => urls.filter(url => url !== removedProduct.product_url));
            }
            return prev.filter(p => p.id !== productId);
        });
    }, []);

    // ===== SAVE PRODUCT TOGGLE =====
    const handleSaveProductToggle = useCallback(async (product) => {
        const token = localStorage.getItem('accessToken');
        if (!token) return { error: 'NOT_AUTHENTICATED' };
        try {
            const response = await fetch('/api/saved-products/toggle', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
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
                    return { error: 'LIMIT_REACHED', limitInfo: { used: data.used, limit: data.limit } };
                }
                return { error: data.error || 'Erro ao salvar produto' };
            }
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
    }, []);

    // ===== MINING =====
    const handleMine = useCallback(async (url, limit) => {
        setCurrentMiningUrl(url);
        setLoading(true);
        setError(null);
        setProducts([]);
        setMiningStage({ stage: 'starting', message: 'Iniciando mineração...', count: 0 });

        try {
            let completedSuccessfully = false;
            let receivedAnyEvent = false;
            const token = localStorage.getItem('accessToken');
            const eventSource = new EventSource(
                `/api/mine-stream?url=${encodeURIComponent(url)}&limit=${limit}&token=${token}`
            );

            eventSource.onopen = () => { receivedAnyEvent = true; };

            eventSource.addEventListener('progress', (event) => {
                receivedAnyEvent = true;
                const data = JSON.parse(event.data);
                setMiningStage({ stage: data.stage, message: data.message, count: data.count || 0 });
            });

            eventSource.addEventListener('complete', (event) => {
                completedSuccessfully = true;
                const data = JSON.parse(event.data);
                setProducts(data.products || []);
                if (data.sellerInfo) setSellerInfo(data.sellerInfo);
                setIsMockData(data.isMock || false);
                setFilters(prev => ({ ...prev, iphoneModel: '', storage: '' }));
                setMiningStage({ stage: 'done', message: 'Concluído!', count: data.products?.length || 0 });
                setLoading(false);
                setMiningInfo(prev => prev ? { ...prev, credits: Math.max(0, prev.credits - 1) } : null);
                // FEAT-01: Trigger notification bell refresh
                window.dispatchEvent(new Event('notifications-updated'));
                eventSource.close();
            });

            eventSource.addEventListener('error', (event) => {
                receivedAnyEvent = true;
                try {
                    const data = JSON.parse(event.data);
                    if (data.code === 'NO_CREDITS') {
                        setShowLimitError(true);
                        if (data.credits !== undefined) {
                            setMiningInfo(prev => ({
                                ...prev, tier: data.tier || prev.tier,
                                credits: data.credits, maxCredits: data.maxCredits || prev.maxCredits
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

            eventSource.onerror = () => {
                if (!completedSuccessfully && !receivedAnyEvent) {
                    setError('Não foi possível conectar ao servidor. Verifique se o backend está rodando.');
                    setLoading(false);
                }
                eventSource.close();
            };
        } catch (err) {
            setError(err.message || 'Erro ao conectar com o servidor');
            setLoading(false);
        }
    }, []);

    // ===== COMPUTED VALUES =====
    const availableModels = useMemo(() => extractUniqueModels(products), [products]);
    const availableStorages = useMemo(() => extractUniqueStorages(products), [products]);
    const availableWatchModels = useMemo(() => extractUniqueWatchModels(products), [products]);
    const availableWatchSizes = useMemo(() => extractUniqueWatchSizes(products), [products]);

    const filteredProducts = useMemo(() => {
        let result = [...products];
        if (filters.iphoneModel) result = result.filter(p => detectIPhoneModel(p) === filters.iphoneModel);
        if (filters.storage) result = result.filter(p => detectStorage(p) === filters.storage);
        if (filters.unlockStatus) result = result.filter(p => detectUnlockStatus(p) === filters.unlockStatus);
        if (filters.watchModel) result = result.filter(p => detectAppleWatchModel(p) === filters.watchModel);
        if (filters.watchSize) result = result.filter(p => detectWatchSize(p) === filters.watchSize);
        if (filters.watchCondition) {
            result = result.filter(p => {
                const condition = detectCondition(p);
                if (!condition) return false;
                if (filters.watchCondition === '99+') return condition.score >= 99;
                if (filters.watchCondition === '95+') return condition.score >= 95;
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
        if (filters.minPrice) result = result.filter(p => p.price >= parseFloat(filters.minPrice));
        if (filters.maxPrice) result = result.filter(p => p.price <= parseFloat(filters.maxPrice));
        if (filters.sort) {
            switch (filters.sort) {
                case 'price_asc': result.sort((a, b) => a.price - b.price); break;
                case 'price_desc': result.sort((a, b) => b.price - a.price); break;
                case 'name_asc': result.sort((a, b) => (a.nameTranslated || a.name).localeCompare(b.nameTranslated || b.name)); break;
                case 'name_desc': result.sort((a, b) => (b.nameTranslated || b.name).localeCompare(a.nameTranslated || a.name)); break;
            }
        }
        return result;
    }, [products, filters]);

    const hasResults = products.length > 0;
    const isOnMiningPage = location.pathname === '/mining';

    // App loading gate
    if (!appReady) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: '#111827' }}>
                <div className="grid-pattern-container"><div className="grid-pattern" /></div>
                <div className="flex flex-col items-center gap-4">
                    <WifiLoader message="Carregando sua conta..." />
                    <p style={{ color: '#6B7280', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                        Preparando tudo para você
                    </p>
                </div>
            </div>
        );
    }

    // Context passed to all child routes via <Outlet context={...}>
    const outletContext = {
        // Mining state
        products, setProducts, loading, evaluating, error, sellerInfo, setSellerInfo,
        isMockData, filters, setFilters, selectedCategory, setSelectedCategory,
        showBRL, toggleCurrency, exchangeRate, miningStage, miningInfo,
        showLimitError, setShowLimitError, currentMiningUrl,
        heroUrl, setHeroUrl, hasResults,
        // Computed
        filteredProducts, availableModels, availableStorages, availableWatchModels, availableWatchSizes,
        // Actions
        handleUrlChange, handleMine, handleSaveSeller, handleSaveProductToggle, clearMiningSession,
        // Saved data
        savedProducts, savedProductUrls, savedSellerIds,
        collections, collectionIcons, collectionColors,
        // Collection actions
        handleCreateCollection, handleUpdateCollection, handleDeleteCollection,
        handleMoveProductToCollection, handleRemoveProduct,
        // User
        user, userTier, logout, isGuest, isBronze, isRestrictedForPremiumFeatures,
        // Tier limits (LOG-12)
        tierLimits,
        // Payment
        paymentFeedback, setPaymentFeedback, fetchMiningStatus,
        // Navigation
        navigate,
    };

    return (
        <div className="h-screen relative overflow-hidden">
            <div className="grid-pattern-container"><div className="grid-pattern" /></div>

            {/* Sidebar */}
            {user && (
                <Sidebar
                    user={user}
                    miningInfo={miningInfo}
                    onLogout={logout}
                    showBRL={showBRL}
                    onToggleCurrency={toggleCurrency}
                    hasResults={hasResults}
                />
            )}

            {/* Header — only on mining page with results */}
            {isOnMiningPage && hasResults && (
                <header className="hidden md:block fixed top-0 right-0 md:left-64 z-30 animate-in fade-in slide-in-from-top duration-500 bg-[#1f2937]/30 backdrop-blur-xl border-b border-white/10 shadow-lg">
                    <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-6">
                            <button
                                onClick={() => {
                                    setProducts([]);
                                    setSellerInfo(null);
                                    setFilters({
                                        keyword: '', minPrice: '', maxPrice: '', sort: '',
                                        iphoneModel: '', storage: '', unlockStatus: ''
                                    });
                                }}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200"
                                style={{ background: '#3B82F6', color: 'white', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)' }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = '#2563EB'; e.currentTarget.style.transform = 'scale(1.02)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = '#3B82F6'; e.currentTarget.style.transform = 'scale(1)'; }}
                            >
                                <svg width="13px" height="10px" viewBox="0 0 13 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12,5 L2,5" /><polyline points="5 1 1 5 5 9" />
                                </svg>
                                <span>Nova busca</span>
                            </button>

                            <div className="flex items-center gap-3 ml-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10">
                                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: showBRL ? '#6B7280' : 'white' }}>¥ CNY</span>
                                <button
                                    onClick={toggleCurrency}
                                    className="relative w-10 h-5 rounded-full transition-all duration-300"
                                    style={{ background: showBRL ? '#3B82F6' : 'rgba(255, 255, 255, 0.2)' }}
                                >
                                    <div className="absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm transition-all duration-300" style={{ left: showBRL ? '24px' : '4px' }} />
                                </button>
                                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: showBRL ? 'white' : '#6B7280' }}>R$ BRL</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <span className="text-sm font-medium" style={{ color: '#9CA3AF' }}>
                                {user?.name || user?.email?.split('@')[0]}
                            </span>
                            <button onClick={logout} className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 hover:bg-red-900/30" style={{ color: '#F87171' }}>
                                Sair
                            </button>
                        </div>
                    </div>
                </header>
            )}

            <main
                ref={mainRef}
                onScroll={handleScroll}
                className={`h-full md:ml-64 overflow-y-auto ${isOnMiningPage && hasResults ? 'pt-14 md:pt-24' : 'pt-14 md:pt-0'}`}
            >
                <AnimatePresence mode="wait">
                    <motion.div
                        key={location.pathname}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className={`w-full ${isOnMiningPage && hasResults ? 'max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8' : location.pathname === '/' ? '' : 'px-4 md:px-6 py-6 md:py-8'}`}
                    >
                        <Outlet context={outletContext} />
                    </motion.div>
                </AnimatePresence>
            </main>

            {/* Back to Top */}
            <AnimatePresence>
                {showBackToTop && (
                    <motion.button
                        initial={{ opacity: 0, scale: 0.5, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.5, y: 20 }}
                        onClick={scrollToTop}
                        className="fixed bottom-8 right-8 z-50 p-4 rounded-2xl bg-blue-600 text-white shadow-2xl hover:bg-blue-700 transition-all active:scale-95 group"
                    >
                        <svg className="w-6 h-6 transition-transform group-hover:-translate-y-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                        </svg>
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Payment Feedback Toast */}
            <AnimatePresence>
                {paymentFeedback && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl backdrop-blur-xl border border-white/10"
                        style={{
                            background: paymentFeedback.type === 'success' ? 'rgba(16, 185, 129, 0.9)'
                                : paymentFeedback.type === 'canceled' ? 'rgba(107, 114, 128, 0.9)'
                                    : 'rgba(239, 68, 68, 0.9)'
                        }}
                    >
                        {paymentFeedback.type === 'success' ? <LuCheck className="w-6 h-6 text-white" /> : <LuX className="w-6 h-6 text-white" />}
                        <div className="flex flex-col">
                            <p className="text-white font-bold leading-tight">
                                {paymentFeedback.type === 'success' ? 'Sucesso!' : paymentFeedback.type === 'canceled' ? 'Cancelado' : 'Erro'}
                            </p>
                            <p className="text-white/90 text-sm">{paymentFeedback.message}</p>
                        </div>
                        <button onClick={() => setPaymentFeedback(null)} className="ml-4 p-1 hover:bg-white/10 rounded-lg transition-colors">
                            <LuX className="w-5 h-5 text-white" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default App;
