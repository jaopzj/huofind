import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ... (icons remain the same)

// Icons
const SparklesIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3l1.912 5.813a2 2 0 001.275 1.275L21 12l-5.813 1.912a2 2 0 00-1.275 1.275L12 21l-1.912-5.813a2 2 0 00-1.275-1.275L3 12l5.813-1.912a2 2 0 001.275-1.275L12 3z" />
    </svg>
);

const PlusIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 5v14M5 12h14" />
    </svg>
);

const TrashIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
    </svg>
);

const RefreshIcon = ({ spinning }) => (
    <motion.svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        animate={spinning ? { rotate: 360 } : { rotate: 0 }}
        transition={spinning ? { duration: 1, repeat: Infinity, ease: "linear" } : {}}
    >
        <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
        <path d="M21 3v5h-5" />
    </motion.svg>
);

const LightbulbIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 006 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
        <path d="M9 18h6" />
        <path d="M10 22h4" />
    </svg>
);

const CopyIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
        <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
);

const CheckIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

const CalculatorIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
        <line x1="8" y1="6" x2="16" y2="6" />
        <line x1="8" y1="10" x2="16" y2="10" />
        <line x1="8" y1="14" x2="8" y2="14" />
        <line x1="12" y1="14" x2="12" y2="14" />
        <line x1="16" y1="14" x2="16" y2="14" />
        <line x1="8" y1="18" x2="8" y2="18" />
        <line x1="12" y1="18" x2="12" y2="18" />
        <line x1="16" y1="18" x2="16" y2="18" />
    </svg>
);

// Categories
const CATEGORIES = [
    'Vestuário',
    'Calçados',
    'Eletrônicos',
    'Acessórios',
    'Bolsas',
    'Relógios',
    'Perfumes',
    'Outros'
];

// Empty item template
const createEmptyItem = () => ({
    id: Date.now() + Math.random(),
    quantity: 1,
    name: '',
    category: 'Vestuário'
});

// Item Input Row
const ItemInputRow = ({ item, index, onUpdate, onRemove, canRemove }) => (
    <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10"
    >
        {/* Quantity */}
        <div className="w-16">
            <input
                type="number"
                min="1"
                max="10"
                value={item.quantity}
                onChange={(e) => onUpdate(index, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3 py-2 bg-white/10 border border-white/10 rounded-lg text-white text-center text-sm focus:outline-none focus:border-blue-500/50 transition-all"
            />
        </div>

        {/* Name */}
        <div className="flex-1">
            <input
                type="text"
                value={item.name}
                onChange={(e) => onUpdate(index, 'name', e.target.value)}
                placeholder="Nome do produto (ex: Camiseta Nike)"
                className="w-full px-3 py-2 bg-white/10 border border-white/10 rounded-lg text-white placeholder:text-white/30 text-sm focus:outline-none focus:border-blue-500/50 transition-all"
            />
        </div>

        {/* Category */}
        <div className="w-36">
            <select
                value={item.category}
                onChange={(e) => onUpdate(index, 'category', e.target.value)}
                className="w-full px-3 py-2 bg-white/10 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500/50 transition-all cursor-pointer appearance-none"
                style={{ backgroundImage: 'url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3e%3cpath stroke=\'%236b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3e%3c/svg%3e")', backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em', paddingRight: '2.5rem' }}
            >
                {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat} className="bg-gray-800 text-white">{cat}</option>
                ))}
            </select>
        </div>

        {/* Remove Button */}
        {canRemove && (
            <button
                onClick={() => onRemove(index)}
                className="p-2 text-red-400/60 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
            >
                <TrashIcon />
            </button>
        )}
    </motion.div>
);

// Result Table Row Component
const ResultRow = ({ item, index }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(item.suggested);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <motion.tr
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="border-b border-white/10 hover:bg-white/5 transition-colors"
        >
            <td className="py-3 px-4 text-white/70 text-sm">
                {item.original}
            </td>
            <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                    <span className="text-white font-medium text-sm">{item.suggested}</span>
                    <button
                        onClick={handleCopy}
                        className="p-1 rounded hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                        title="Copiar"
                    >
                        {copied ? <CheckIcon /> : <CopyIcon />}
                    </button>
                </div>
            </td>
            <td className="py-3 px-4 text-center">
                <span className="text-blue-400 font-bold">${item.suggestedValueUSD}</span>
            </td>
            <td className="py-3 px-4 text-white/50 text-sm text-center">
                {item.category}
            </td>
        </motion.tr>
    );
};

// Tip Card Component
const TipCard = ({ tip, index }) => (
    <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3 + index * 0.1 }}
        className="flex items-start gap-3 p-3 bg-white/5 rounded-lg border border-white/10"
    >
        <span className="text-yellow-400 mt-0.5">
            <LightbulbIcon />
        </span>
        <p className="text-white/70 text-sm">{tip}</p>
    </motion.div>
);

// Main Component
const DeclarationAssistantPage = ({ onNavigate }) => {
    const [items, setItems] = useState([createEmptyItem()]);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [userCredits, setUserCredits] = useState(null);
    const [loadingCredits, setLoadingCredits] = useState(true);

    const MAX_ITEMS = 6;
    const requiredCredits = items.filter(item => item.name.trim()).length || 1;

    // Fetch user credits on mount
    const fetchCredits = useCallback(async () => {
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) return;

            const response = await fetch('/api/user/credits', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                setUserCredits(data.credits);
            }
        } catch (err) {
            console.error('Erro ao buscar créditos:', err);
        } finally {
            setLoadingCredits(false);
        }
    }, []);

    useEffect(() => {
        fetchCredits();
    }, [fetchCredits]);

    const handleCalculateFee = () => {
        if (result?.totalSuggestedUSD && onNavigate) {
            onNavigate('fee-calculator', { initialValue: result.totalSuggestedUSD });
        }
    };

    const handleAddItem = () => {
        if (items.length < MAX_ITEMS) {
            setItems([...items, createEmptyItem()]);
        }
    };

    const handleRemoveItem = (index) => {
        if (items.length > 1) {
            setItems(items.filter((_, i) => i !== index));
        }
    };

    const handleUpdateItem = (index, field, value) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        setItems(newItems);
    };

    const handleSubmit = useCallback(async () => {
        // Validate items
        const validItems = items.filter(item => item.name.trim());
        if (validItems.length === 0) {
            setError('Adicione pelo menos um produto');
            return;
        }

        // Check credits
        if (userCredits !== null && userCredits < validItems.length) {
            setError('Créditos insuficientes para processar estes itens.');
            return;
        }

        setLoading(true);
        setError(null);
        setResult(null);

        // Format items for API
        const description = validItems.map(item =>
            `${item.quantity}x ${item.name} (${item.category})`
        ).join(', ');

        try {
            const token = localStorage.getItem('accessToken');
            const response = await fetch('/api/ai/declaration-assistant', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    description,
                    items: validItems
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Erro ao processar');
            }

            setResult(data.result);
            if (data.newCredits !== undefined) {
                setUserCredits(data.newCredits);
            }
        } catch (err) {
            console.error('Error:', err);
            setError(err.message || 'Erro ao gerar sugestão. Tente novamente.');
        } finally {
            setLoading(false);
        }
    }, [items, userCredits]);

    const handleClear = () => {
        setItems([createEmptyItem()]);
        setResult(null);
        setError(null);
    };

    return (
        <div className="w-full max-w-5xl mx-auto px-4 md:px-8 py-8">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
            >
                <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                        Assistente de Declaração
                    </h1>
                </div>
                <p className="text-white/60 text-sm md:text-base">
                    IA que ajuda você a declarar suas encomendas de forma otimizada
                </p>
            </motion.div>

            {/* Main Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-[#1f2937] rounded-2xl border border-white/10 overflow-hidden"
            >
                {/* Input Section */}
                <div className="p-6">
                    {/* Header Row */}
                    <div className="flex items-center gap-3 mb-3 px-3 text-white/50 text-xs font-medium uppercase tracking-wider">
                        <div className="w-16 text-center">Qtd</div>
                        <div className="flex-1">Produto</div>
                        <div className="w-36 text-center">Categoria</div>
                        <div className="w-8"></div>
                    </div>

                    {/* Items List */}
                    <div className="space-y-2 mb-4">
                        <AnimatePresence>
                            {items.map((item, index) => (
                                <ItemInputRow
                                    key={item.id}
                                    item={item}
                                    index={index}
                                    onUpdate={handleUpdateItem}
                                    onRemove={handleRemoveItem}
                                    canRemove={items.length > 1}
                                />
                            ))}
                        </AnimatePresence>
                    </div>

                    {/* Add Item Button */}
                    {items.length < MAX_ITEMS && (
                        <motion.button
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                            onClick={handleAddItem}
                            className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-white/20 rounded-xl text-white/50 hover:text-white/80 hover:border-white/40 transition-all"
                        >
                            <PlusIcon />
                            <span className="text-sm font-medium">Adicionar item ({items.length}/{MAX_ITEMS})</span>
                        </motion.button>
                    )}

                    {/* Actions */}
                    <div className="flex flex-col gap-4 mt-6">
                        {/* Credits Legend & Warning */}
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4 px-1">
                            <div className="flex items-center gap-4 text-xs font-medium">
                                <div className="flex items-center gap-1.5 text-white/40">
                                    <span className="w-2 h-2 rounded-full bg-blue-500/50"></span>
                                    Custo: 1 crédito / produto
                                </div>
                                {userCredits !== null && (
                                    <div className="flex items-center gap-1.5 text-white/60">
                                        <span className={`w-2 h-2 rounded-full ${userCredits < requiredCredits ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></span>
                                        Saldo: {userCredits} {userCredits === 1 ? 'crédito' : 'créditos'}
                                    </div>
                                )}
                            </div>

                            {userCredits !== null && userCredits < requiredCredits && (
                                <motion.div
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-lg"
                                >
                                    <span className="text-red-400 text-xs font-bold flex items-center gap-1.5">
                                        ⚠️ Créditos insuficientes
                                    </span>
                                    <button
                                        onClick={() => onNavigate('store')}
                                        className="text-white bg-red-500 hover:bg-red-600 px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider transition-colors"
                                    >
                                        Recarregar
                                    </button>
                                </motion.div>
                            )}
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={handleClear}
                                className="px-6 py-3 border border-white/10 rounded-xl text-white/60 hover:text-white hover:bg-white/5 transition-all text-sm font-medium"
                            >
                                Limpar
                            </button>
                            <motion.button
                                whileHover={{ scale: (userCredits !== null && userCredits < requiredCredits) ? 1 : 1.02 }}
                                whileTap={{ scale: (userCredits !== null && userCredits < requiredCredits) ? 1 : 0.98 }}
                                onClick={handleSubmit}
                                disabled={loading || items.every(i => !i.name.trim()) || (userCredits !== null && userCredits < requiredCredits)}
                                className={`flex-1 flex items-center justify-center gap-2 px-8 py-3 bg-gradient-to-r ${(userCredits !== null && userCredits < requiredCredits) ? 'from-gray-600 to-gray-700 cursor-not-allowed opacity-50' : 'from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 shadow-blue-500/25 shadow-lg'} text-white font-bold rounded-xl transition-all`}
                            >
                                {loading ? (
                                    <>
                                        <RefreshIcon spinning={true} />
                                        Analisando...
                                    </>
                                ) : (
                                    <>
                                        <SparklesIcon />
                                        Gerar Sugestão {requiredCredits > 0 && `(${requiredCredits} ${requiredCredits === 1 ? 'crédito' : 'créditos'})`}
                                    </>
                                )}
                            </motion.button>
                        </div>

                        {/* Error Message */}
                        <AnimatePresence>
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl"
                                >
                                    <p className="text-red-400 text-sm font-medium flex items-center gap-2">
                                        <span>❌</span>
                                        {error}
                                    </p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Results Section */}
                <AnimatePresence>
                    {result && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="border-t border-white/10"
                        >
                            <div className="p-6">
                                {/* Results Table */}
                                <div className="mb-6">
                                    <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
                                        <span>📦</span>
                                        Sugestão de Declaração
                                    </h3>

                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="border-b border-white/20">
                                                    <th className="py-3 px-4 text-left text-white/50 text-xs font-medium uppercase tracking-wider">
                                                        Produto Original
                                                    </th>
                                                    <th className="py-3 px-4 text-left text-white/50 text-xs font-medium uppercase tracking-wider">
                                                        Declarar Como
                                                    </th>
                                                    <th className="py-3 px-4 text-center text-white/50 text-xs font-medium uppercase tracking-wider">
                                                        Valor unitário (USD)
                                                    </th>
                                                    <th className="py-3 px-4 text-center text-white/50 text-xs font-medium uppercase tracking-wider">
                                                        Categoria
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {result.items?.map((item, index) => (
                                                    <ResultRow key={index} item={item} index={index} />
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Total */}
                                    <div className="mt-4 p-4 bg-gradient-to-r from-blue-600/10 to-cyan-500/10 rounded-xl border border-blue-500/20">
                                        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                                            <span className="text-white font-bold flex items-center gap-2">
                                                <span>💵</span>
                                                Valor total sugerido para declarar
                                            </span>
                                            <div className="flex items-center gap-4">
                                                <motion.button
                                                    whileHover={{ scale: 1.02 }}
                                                    whileTap={{ scale: 0.98 }}
                                                    onClick={handleCalculateFee}
                                                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-bold transition-all"
                                                >
                                                    <CalculatorIcon />
                                                    Calcular taxa
                                                </motion.button>
                                                <span className="font-bold text-blue-400 text-2xl">
                                                    ${result.totalSuggestedUSD}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Tips */}
                                {result.tips && result.tips.length > 0 && (
                                    <div className="mb-6">
                                        <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
                                            <span>💡</span>
                                            Dicas Importantes
                                        </h3>
                                        <div className="space-y-2">
                                            {result.tips.map((tip, index) => (
                                                <TipCard key={index} tip={tip} index={index} />
                                            ))}
                                        </div>
                                    </div>
                                )}


                                {/* Agent Disclaimer */}
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.4 }}
                                    className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl mb-3"
                                >
                                    <p className="text-blue-400/90 text-xs flex items-start gap-2">
                                        <span>💡</span>
                                        <span>Caso não queira declarar manualmente, e prefira que o agente declare, considere apenas o valor sugerido.</span>
                                    </p>
                                </motion.div>

                                {/* Disclaimer */}
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.5 }}
                                    className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl"
                                >
                                    <p className="text-yellow-400/80 text-xs flex items-start gap-2">
                                        <span>⚠️</span>
                                        <span>{result.disclaimer || 'Os valores e descrições são sugestões. O usuário é responsável pela declaração final.'}</span>
                                    </p>
                                </motion.div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

            {/* Info Cards */}
            <div className="grid md:grid-cols-2 gap-4 mt-6">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="p-5 bg-[#1f2937] rounded-xl border border-white/10"
                >
                    <h3 className="text-white font-bold text-sm mb-2 flex items-center gap-2">
                        <span>🤖</span>
                        Como funciona?
                    </h3>
                    <p className="text-white/60 text-xs leading-relaxed">
                        Nossa IA analisa seus produtos e sugere descrições genéricas em inglês
                        com valores otimizados em dólar para minimizar taxas de importação.
                    </p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                    className="p-5 bg-[#1f2937] rounded-xl border border-white/10"
                >
                    <h3 className="text-white font-bold text-sm mb-2 flex items-center gap-2">
                        <span>📋</span>
                        Dica de uso
                    </h3>
                    <p className="text-white/60 text-xs leading-relaxed">
                        Adicione cada item separadamente com a quantidade correta.
                        A IA vai gerar descrições genéricas e valores baixos automaticamente.
                    </p>
                </motion.div>
            </div>
        </div>
    );
};

export default DeclarationAssistantPage;
