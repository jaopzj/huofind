import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SavedSellerCard from './SavedSellerCard';

/**
 * SavedSellersPanel - Painel Refatorado de Vendedores Salvos
 */
function SavedSellersPanel({ onSelectSeller, tier = 'guest', tierLimits = null }) {
    const [sellers, setSellers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Height animation logic
    const contentRef = useRef(null);
    const [contentHeight, setContentHeight] = useState('auto');

    // Use server-provided limits when available, fallback for loading state only
    const currentLimit = tierLimits?.[tier]?.savedSellers ?? tierLimits?.guest?.savedSellers ?? 1;

    useEffect(() => {
        fetchSavedSellers();
    }, []);

    // Monitor height changes efficiently
    useEffect(() => {
        if (!contentRef.current) return;

        const resizeObserver = new ResizeObserver((entries) => {
            for (let entry of entries) {
                if (entry.target === contentRef.current) {
                    setContentHeight(`${entry.target.offsetHeight}px`);
                }
            }
        });

        resizeObserver.observe(contentRef.current);
        return () => resizeObserver.disconnect();
    }, [loading, sellers, searchTerm]);

    const fetchSavedSellers = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('accessToken');
            if (!token) return;

            const response = await fetch('/api/saved-sellers', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setSellers(data.sellers || []);
            }
        } catch (err) {
            console.error('[SavedSellersPanel] Error:', err);
        } finally {
            // Pequeno delay para garantir que a animação inicial seja vista
            setTimeout(() => setLoading(false), 600);
        }
    };

    const handleDelete = async (sellerId, platformId) => {
        if (!confirm('Remover este vendedor salvo?')) return;

        try {
            const token = localStorage.getItem('accessToken');
            await fetch(`/api/saved-sellers/${sellerId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            setSellers(prev => prev.filter(s => s.id !== sellerId));
            if (onSellerDeleted) onSellerDeleted(platformId);
        } catch (err) {
            alert('Erro ao remover vendedor');
        }
    };

    // Filtro local por nickname
    const filteredSellers = useMemo(() => {
        return sellers.filter(s =>
            s.nickname.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [sellers, searchTerm]);

    // Componente de Skeleton para um carregamento "shimmer"
    const SkeletonLoader = () => (
        <div className="space-y-12">
            <div className="flex flex-col items-center gap-6 animate-pulse">
                <div className="w-20 h-20 bg-white/5 rounded-[1.5rem]" />
                <div className="space-y-2 flex flex-col items-center">
                    <div className="h-8 w-48 bg-white/5 rounded-lg" />
                    <div className="h-6 w-24 bg-white/5 rounded-full" />
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-64 rounded-[2rem] bg-white/5 border border-white/10 animate-pulse flex flex-col items-center justify-center p-6 space-y-4">
                        <div className="w-20 h-20 rounded-full bg-white/10" />
                        <div className="h-4 w-24 bg-white/10 rounded" />
                        <div className="h-10 w-full bg-white/10 rounded-xl" />
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <motion.div
            layout
            animate={{ height: contentHeight }}
            transition={{
                height: {
                    type: "spring",
                    stiffness: 260,
                    damping: 30,
                    duration: 0.4
                }
            }}
            className="w-full overflow-hidden"
        >
            <div ref={contentRef}>
                <AnimatePresence mode="wait">
                    {loading ? (
                        <motion.div
                            key="loading"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="w-full"
                        >
                            <SkeletonLoader />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="content"
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="space-y-12 pb-12"
                        >
                            {/* Control Bar */}
                            <div className="flex flex-col items-center gap-8">
                                <div className="flex flex-col items-center text-center gap-4">
                                    <motion.div
                                        layoutId="panel-icon"
                                        className="p-4 bg-blue-500/10 rounded-[1.5rem] text-blue-500 shadow-sm border border-blue-500/20"
                                    >
                                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                    </motion.div>
                                    <motion.div layoutId="panel-title">
                                        <h3 className="text-3xl font-black text-white tracking-tight">Seus Vendedores</h3>
                                        <div className="mt-2 flex items-center justify-center gap-2">
                                            <span className="text-sm px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 font-bold border border-blue-500/20">
                                                {sellers.length} / {currentLimit} Salvos
                                            </span>
                                        </div>
                                    </motion.div>
                                </div>

                                {/* Search Field */}
                                <motion.div
                                    layout
                                    className="relative w-full max-w-2xl px-4"
                                >
                                    <div className="absolute left-8 top-1/2 -translate-y-1/2 text-gray-400">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Buscar por apelido..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-16 pr-6 py-4 rounded-[2rem] bg-white/5 border border-white/10 focus:border-blue-500/50 focus:bg-white/10 focus:ring-8 focus:ring-blue-500/5 transition-all outline-none text-base font-medium shadow-sm text-white placeholder-gray-500"
                                    />
                                </motion.div>
                            </div>

                            {/* Grid de Cards */}
                            {filteredSellers.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                    <AnimatePresence mode="popLayout">
                                        {filteredSellers.map(seller => (
                                            <SavedSellerCard
                                                key={seller.id}
                                                seller={seller}
                                                onSelect={onSelectSeller}
                                                onDelete={handleDelete}
                                            />
                                        ))}
                                    </AnimatePresence>
                                </div>
                            ) : (
                                <motion.div
                                    layout
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="flex flex-col items-center justify-center py-20 bg-white/5 rounded-[3rem] border-2 border-dashed border-white/10"
                                >
                                    <div className="text-7xl mb-6 grayscale opacity-20">🕵️‍♂️</div>
                                    <h4 className="text-xl font-black text-gray-400">
                                        {searchTerm ? 'Nenhum resultado para sua busca' : 'Sua lista está vazia'}
                                    </h4>
                                    <p className="text-sm text-gray-400 mt-2 font-medium">
                                        {searchTerm ? 'Tente buscar por outro nome ou apelido' : 'Comece a salvar vendedores na Home para gerencia-los aqui'}
                                    </p>
                                </motion.div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}

export default SavedSellersPanel;
