import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LuChevronDown, LuPackage, LuCrown, LuCreditCard, LuCheck, LuX, LuClock, LuRefreshCw } from 'react-icons/lu';

/**
 * PurchaseHistorySection - Collapsible section showing real purchase history from API
 */
function PurchaseHistorySection() {
    const [isOpen, setIsOpen] = useState(false);
    const [purchases, setPurchases] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [hasFetched, setHasFetched] = useState(false);

    const token = localStorage.getItem('accessToken');

    // Fetch when opened for the first time
    useEffect(() => {
        if (isOpen && !hasFetched) {
            fetchHistory();
        }
    }, [isOpen]);

    const fetchHistory = async () => {
        if (!token) return;
        setIsLoading(true);
        try {
            const res = await fetch('/api/purchase-history', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setPurchases(data.purchases || []);
            }
        } catch (err) {
            console.error('[PurchaseHistory] Error:', err);
        } finally {
            setIsLoading(false);
            setHasFetched(true);
        }
    };

    const getStatusConfig = (status) => {
        switch (status) {
            case 'completed':
                return { icon: LuCheck, color: '#4ade80', bg: 'rgba(74, 222, 128, 0.1)', label: 'Concluído' };
            case 'pending':
                return { icon: LuClock, color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.1)', label: 'Pendente' };
            case 'failed':
                return { icon: LuX, color: '#f87171', bg: 'rgba(248, 113, 113, 0.1)', label: 'Falhou' };
            case 'refunded':
                return { icon: LuRefreshCw, color: '#60a5fa', bg: 'rgba(96, 165, 250, 0.1)', label: 'Reembolsado' };
            default:
                return { icon: LuClock, color: '#9ca3af', bg: 'rgba(156, 163, 175, 0.1)', label: 'Desconhecido' };
        }
    };

    const getTypeIcon = (type) => {
        return (type === 'subscription' || type === 'renewal') ? LuCrown : LuPackage;
    };

    const getDescription = (purchase) => {
        if (purchase.type === 'credits') {
            return `${purchase.credits_added || '?'} Créditos`;
        } else if (purchase.type === 'subscription') {
            const planNames = { bronze: 'Explorador', prata: 'Escavador', ouro: 'Minerador' };
            return `Assinatura ${planNames[purchase.plan_id] || purchase.plan_id}`;
        } else if (purchase.type === 'renewal') {
            return `Renovação mensal (${purchase.credits_added} créditos)`;
        }
        return purchase.type;
    };

    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="bg-[#1f2937] rounded-3xl border border-white/5 overflow-hidden"
        >
            {/* Header - Clickable */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-5 hover:bg-white/5 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                        <LuCreditCard className="w-5 h-5 text-gray-400" />
                    </div>
                    <div className="text-left">
                        <p className="font-bold text-white">Histórico de Compras</p>
                        <p className="text-xs text-gray-400">
                            {hasFetched
                                ? `${purchases.length} transaç${purchases.length === 1 ? 'ão' : 'ões'}`
                                : 'Clique para ver'}
                        </p>
                    </div>
                </div>

                <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                >
                    <LuChevronDown className="w-5 h-5 text-gray-400" />
                </motion.div>
            </button>

            {/* Content - Collapsible */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                    >
                        <div className="border-t border-white/5">
                            {isLoading ? (
                                /* Loading State */
                                <div className="py-12 text-center">
                                    <div className="w-8 h-8 mx-auto mb-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                    <p className="text-gray-400 text-sm">Carregando histórico...</p>
                                </div>
                            ) : purchases.length === 0 ? (
                                /* Empty State */
                                <div className="py-12 text-center">
                                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
                                        <LuPackage className="w-8 h-8 text-gray-500" />
                                    </div>
                                    <p className="text-gray-400 font-medium">Nenhuma compra realizada</p>
                                    <p className="text-sm text-gray-500 mt-1">Suas transações aparecerão aqui</p>
                                </div>
                            ) : (
                                /* Purchase List */
                                <div className="divide-y divide-white/5">
                                    {purchases.map((purchase, index) => {
                                        const TypeIcon = getTypeIcon(purchase.type);
                                        const statusConfig = getStatusConfig(purchase.status);
                                        const StatusIcon = statusConfig.icon;

                                        return (
                                            <motion.div
                                                key={purchase.id}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: index * 0.05 }}
                                                className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                                                        style={{
                                                            background: (purchase.type === 'subscription' || purchase.type === 'renewal')
                                                                ? 'rgba(251, 191, 36, 0.1)'
                                                                : 'rgba(59, 130, 246, 0.1)'
                                                        }}
                                                    >
                                                        <TypeIcon
                                                            className="w-5 h-5"
                                                            style={{
                                                                color: (purchase.type === 'subscription' || purchase.type === 'renewal') ? '#fbbf24' : '#3B82F6'
                                                            }}
                                                        />
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-white text-sm">{getDescription(purchase)}</p>
                                                        <p className="text-xs text-gray-500">{formatDate(purchase.created_at)}</p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    <p className="font-bold text-white">
                                                        R$ {(purchase.amount_brl || 0).toFixed(2).replace('.', ',')}
                                                    </p>
                                                    <div
                                                        className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold"
                                                        style={{
                                                            backgroundColor: statusConfig.bg,
                                                            color: statusConfig.color
                                                        }}
                                                    >
                                                        <StatusIcon className="w-3 h-3" />
                                                        {statusConfig.label}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

export default PurchaseHistorySection;
