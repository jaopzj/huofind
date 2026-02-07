import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Animated icons
const DollarIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
        <path d="M12 18V6" />
    </svg>
);

const BrazilIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v12" />
        <path d="M6 12h12" />
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

const ChartIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3v16a2 2 0 0 0 2 2h16" />
        <path d="M8 17V5" />
        <path d="M13 17V9" />
        <path d="M18 17V13" />
    </svg>
);

const CalculatorIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="2" width="16" height="20" rx="2" />
        <line x1="8" x2="16" y1="6" y2="6" />
        <line x1="16" x2="16" y1="14" y2="18" />
        <path d="M16 10h.01" />
        <path d="M12 10h.01" />
        <path d="M8 10h.01" />
        <path d="M12 14h.01" />
        <path d="M8 14h.01" />
        <path d="M12 18h.01" />
        <path d="M8 18h.01" />
    </svg>
);

const TaxIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
        <path d="M13 5v2" />
        <path d="M13 17v2" />
        <path d="M13 11v2" />
    </svg>
);

/**
 * Calcula os impostos de importação brasileiros
 * @param {number} valorUsd - Valor em dólares
 * @param {number} cotacao - Cotação do dólar em reais
 * @returns {Object} Objeto com todos os valores calculados
 */
const calcularImpostos = (valorUsd, cotacao) => {
    const valorBrl = valorUsd * cotacao;
    const impostoImportacao = valorBrl * 0.60;
    const baseIcms = valorBrl + impostoImportacao;
    const icms = (baseIcms * 0.17) / (1 - 0.17);
    const totalImpostos = impostoImportacao + icms;
    const valorTotal = valorBrl + totalImpostos;

    return {
        valorUsd,
        cotacao,
        valorBrl,
        impostoImportacao,
        icms,
        baseIcms,
        totalImpostos,
        valorTotal
    };
};

/**
 * Formata valor em reais
 */
const formatBRL = (value) => {
    return value.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
};

/**
 * Formata valor em dólares
 */
const formatUSD = (value) => {
    return value.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD'
    });
};

// Result Card Component
const ResultCard = ({ icon, label, value, highlight = false, delay = 0 }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay }}
        className={`p-4 rounded-xl border ${highlight
            ? 'bg-gradient-to-br from-blue-500/20 to-blue-600/10 border-blue-500/30'
            : 'bg-white/5 border-white/10'
            }`}
    >
        <div className="flex items-center gap-2 text-white/60 text-xs font-medium mb-2">
            {icon}
            <span>{label}</span>
        </div>
        <p className={`text-lg font-bold ${highlight ? 'text-blue-400' : 'text-white'}`}>
            {value}
        </p>
    </motion.div>
);

// Main Component
const FeeCalculatorPage = () => {
    const [valorDeclarado, setValorDeclarado] = useState('');
    const [cotacao, setCotacao] = useState(null);
    const [loading, setLoading] = useState(false);
    const [loadingCotacao, setLoadingCotacao] = useState(true);
    const [resultado, setResultado] = useState(null);
    const [error, setError] = useState(null);
    const [lastUpdate, setLastUpdate] = useState(null);
    const [autoCalculate, setAutoCalculate] = useState(false);

    // Check for initial value from navigation
    useEffect(() => {
        if (window.__feeCalculatorInitialValue) {
            setValorDeclarado(window.__feeCalculatorInitialValue.toString());
            setAutoCalculate(true);
            delete window.__feeCalculatorInitialValue;
        }
    }, []);

    // Busca cotação do dólar via AwesomeAPI (API gratuita e confiável)
    const fetchCotacao = useCallback(async () => {
        setLoadingCotacao(true);
        setError(null);

        try {
            const response = await fetch('https://economia.awesomeapi.com.br/last/USD-BRL');

            if (!response.ok) {
                throw new Error('Erro ao obter cotação');
            }

            const data = await response.json();
            const novaCotacao = parseFloat(data.USDBRL.bid);
            setCotacao(novaCotacao);
            setLastUpdate(new Date());

            // Recalcula se houver valor
            if (valorDeclarado && parseFloat(valorDeclarado) > 0) {
                setResultado(calcularImpostos(parseFloat(valorDeclarado), novaCotacao));
            }
        } catch (err) {
            console.error('Erro ao buscar cotação:', err);
            setError('Não foi possível obter a cotação do dólar. Tente novamente.');
            // Fallback para cotação aproximada
            setCotacao(5.60);
            setLastUpdate(new Date());
        } finally {
            setLoadingCotacao(false);
        }
    }, [valorDeclarado]);

    // Busca cotação ao montar
    useEffect(() => {
        fetchCotacao();
    }, []);

    // Auto-calculate when navigated with initial value
    useEffect(() => {
        if (autoCalculate && cotacao && valorDeclarado) {
            setAutoCalculate(false);
            setTimeout(() => {
                const valor = parseFloat(valorDeclarado);
                if (valor > 0) {
                    setResultado(calcularImpostos(valor, cotacao));
                }
            }, 100);
        }
    }, [autoCalculate, cotacao, valorDeclarado]);

    // Calcula impostos quando valor ou cotação mudam
    const handleCalcular = useCallback(() => {
        if (!valorDeclarado || parseFloat(valorDeclarado) <= 0) {
            setError('Digite um valor válido maior que zero');
            return;
        }

        if (!cotacao) {
            setError('Aguarde a cotação do dólar');
            return;
        }

        setLoading(true);
        setError(null);

        // Simula pequeno delay para feedback visual
        setTimeout(() => {
            const valor = parseFloat(valorDeclarado);
            setResultado(calcularImpostos(valor, cotacao));
            setLoading(false);
        }, 300);
    }, [valorDeclarado, cotacao]);

    // Permite calcular ao pressionar Enter
    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleCalcular();
        }
    };

    // Limpa resultado e valor
    const handleLimpar = () => {
        setValorDeclarado('');
        setResultado(null);
        setError(null);
    };

    return (
        <div className="w-full max-w-4xl mx-auto px-4 md:px-8 py-8">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
            >
                <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                        Calculadora de Taxa
                    </h1>
                </div>
                <p className="text-white/60 text-sm md:text-base">
                    Calcule os impostos de importação para suas compras internacionais
                </p>
            </motion.div>

            {/* Main Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-[#1f2937] rounded-2xl border border-white/10 overflow-hidden"
            >
                {/* Cotação Banner */}
                <div className="px-6 py-4 bg-gradient-to-r from-blue-600/20 to-blue-500/10 border-b border-white/10">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                                <span className="text-2xl">🇺🇸</span>
                                <span className="text-white/60 text-sm">→</span>
                                <span className="text-2xl">🇧🇷</span>
                            </div>
                            <div>
                                <p className="text-white/60 text-xs font-medium">Cotação do Dólar</p>
                                {loadingCotacao ? (
                                    <div className="h-6 w-24 bg-white/10 rounded animate-pulse" />
                                ) : (
                                    <p className="text-white font-bold text-lg">
                                        R$ {cotacao?.toFixed(2) || '--'}
                                    </p>
                                )}
                            </div>
                        </div>

                        <button
                            onClick={fetchCotacao}
                            disabled={loadingCotacao}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white/80 text-sm font-medium transition-all disabled:opacity-50"
                        >
                            <RefreshIcon spinning={loadingCotacao} />
                            Atualizar
                        </button>
                    </div>

                    {lastUpdate && (
                        <p className="text-white/40 text-xs mt-2">
                            Última atualização: {lastUpdate.toLocaleTimeString('pt-BR')}
                        </p>
                    )}
                </div>

                {/* Input Section */}
                <div className="p-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        {/* Input Field */}
                        <div className="flex-1">
                            <label className="block text-white/60 text-sm font-medium mb-2">
                                Valor Declarado (USD)
                            </label>
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">
                                    <DollarIcon />
                                </div>
                                <input
                                    type="number"
                                    value={valorDeclarado}
                                    onChange={(e) => setValorDeclarado(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    placeholder="Ex: 50.00"
                                    className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white text-lg font-medium placeholder:text-white/30 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
                                />
                            </div>
                        </div>

                        {/* Buttons */}
                        <div className="flex gap-3 md:items-end">
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleCalcular}
                                disabled={loading || !valorDeclarado}
                                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold rounded-xl shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                {loading ? (
                                    <>
                                        <RefreshIcon spinning={true} />
                                        Calculando...
                                    </>
                                ) : (
                                    <>
                                        <CalculatorIcon />
                                        Calcular
                                    </>
                                )}
                            </motion.button>

                            {resultado && (
                                <motion.button
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleLimpar}
                                    className="px-4 py-4 bg-white/10 hover:bg-white/15 text-white/80 font-medium rounded-xl transition-all"
                                >
                                    Limpar
                                </motion.button>
                            )}
                        </div>
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

                {/* Results Section */}
                <AnimatePresence>
                    {resultado && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="border-t border-white/10"
                        >
                            <div className="p-6">
                                {/* Summary Cards */}
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                                    <ResultCard
                                        icon={<span className="text-base">🇺🇸</span>}
                                        label="Declarado"
                                        value={formatUSD(resultado.valorUsd)}
                                        delay={0}
                                    />
                                    <ResultCard
                                        icon={<span className="text-base">💱</span>}
                                        label="Cotação Dólar"
                                        value={`R$ ${resultado.cotacao.toFixed(2)}`}
                                        delay={0.05}
                                    />
                                    <ResultCard
                                        icon={<span className="text-base">🔁</span>}
                                        label="Convertido"
                                        value={formatBRL(resultado.valorBrl)}
                                        delay={0.1}
                                    />
                                    <ResultCard
                                        icon={<span className="text-base">🛃</span>}
                                        label="Imposto Federal (60%)"
                                        value={formatBRL(resultado.impostoImportacao)}
                                        delay={0.15}
                                    />
                                    <ResultCard
                                        icon={<span className="text-base">🏛️</span>}
                                        label="ICMS (17%)"
                                        value={formatBRL(resultado.icms)}
                                        delay={0.2}
                                    />
                                    <ResultCard
                                        icon={<TaxIcon />}
                                        label="Total em Impostos"
                                        value={formatBRL(resultado.totalImpostos)}
                                        highlight
                                        delay={0.25}
                                    />
                                </div>

                                {/* Detailed Breakdown */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 }}
                                    className="bg-white/5 rounded-xl border border-white/10 p-5"
                                >
                                    <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
                                        <span>📋</span>
                                        Detalhamento do Cálculo
                                    </h3>

                                    <div className="space-y-3 text-sm">
                                        <div className="flex justify-between items-center text-white/70">
                                            <span>• Total declarado</span>
                                            <span className="font-medium text-white/90">{formatBRL(resultado.valorBrl)}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-white/70">
                                            <span>• Imposto Federal (60%)</span>
                                            <span className="font-medium text-white/90">{formatBRL(resultado.impostoImportacao)}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-white/70">
                                            <span>• Base para ICMS</span>
                                            <span className="font-medium text-white/90">{formatBRL(resultado.baseIcms)}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-white/70">
                                            <span>• ICMS (17%)</span>
                                            <span className="font-medium text-white/90">{formatBRL(resultado.icms)}</span>
                                        </div>

                                        <div className="border-t border-white/10 my-4" />

                                        <div className="flex justify-between items-center">
                                            <span className="text-white font-bold flex items-center gap-2">
                                                <span>💰</span>
                                                Total estimado em taxas
                                            </span>
                                            <span className="font-bold text-blue-400 text-xl">{formatBRL(resultado.totalImpostos)}</span>
                                        </div>
                                    </div>
                                </motion.div>

                                {/* Disclaimer */}
                                <motion.p
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.4 }}
                                    className="text-white/40 text-xs text-center mt-4"
                                >
                                    * Os valores são estimativas e podem variar conforme a cotação do dólar no momento do cálculo oficial.
                                </motion.p>
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
                        <span>ℹ️</span>
                        Como funciona?
                    </h3>
                    <p className="text-white/60 text-xs leading-relaxed">
                        O imposto de importação é calculado sobre o valor declarado convertido para reais,
                        com alíquota de 60%. O ICMS (17%) é calculado sobre a soma do valor + imposto de importação.
                    </p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                    className="p-5 bg-[#1f2937] rounded-xl border border-white/10"
                >
                    <h3 className="text-white font-bold text-sm mb-2 flex items-center gap-2">
                        <span>⚠️</span>
                        Importante
                    </h3>
                    <p className="text-white/60 text-xs leading-relaxed">
                        Este cálculo considera importações acima de US$ 50. Para compras até US$ 50 de empresas
                        cadastradas no Remessa Conforme, as regras podem ser diferentes.
                    </p>
                </motion.div>
            </div>
        </div>
    );
};

export default FeeCalculatorPage;
