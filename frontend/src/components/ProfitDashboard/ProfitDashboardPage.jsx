import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { proxyImage } from '../../utils/imageProxy';

// ───────────────── Icons ─────────────────

const SettingsIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
        <circle cx="12" cy="12" r="3" />
    </svg>
);

const PackageIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16.5 9.4 7.55 4.24" />
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.29 7 12 12 20.71 7" />
        <line x1="12" x2="12" y1="22" y2="12" />
    </svg>
);

const TrendUpIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
        <polyline points="16 7 22 7 22 13" />
    </svg>
);

const DollarIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
        <path d="M12 18V6" />
    </svg>
);

const WeightIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="5" r="3" />
        <path d="M6.5 8a2 2 0 0 0-1.905 1.46L2.1 18.23A2 2 0 0 0 4 21h16a2 2 0 0 0 1.925-2.54L19.4 9.46A2 2 0 0 0 17.48 8Z" />
    </svg>
);

const PercentIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="19" x2="5" y1="5" y2="19" />
        <circle cx="6.5" cy="6.5" r="2.5" />
        <circle cx="17.5" cy="17.5" r="2.5" />
    </svg>
);

const SaveIcon = ({ spinning }) => (
    <motion.svg
        width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        animate={spinning ? { rotate: 360 } : { rotate: 0 }}
        transition={spinning ? { duration: 1, repeat: Infinity, ease: "linear" } : {}}
    >
        {spinning ? (
            <>
                <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
            </>
        ) : (
            <>
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
            </>
        )}
    </motion.svg>
);

const CheckCircleIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
);

const AlertIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" x2="12" y1="8" y2="12" />
        <line x1="12" x2="12.01" y1="16" y2="16" />
    </svg>
);

const ChevronIcon = ({ isOpen }) => (
    <motion.svg
        width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        animate={{ rotate: isOpen ? 180 : 0 }}
        transition={{ duration: 0.2 }}
    >
        <polyline points="6 9 12 15 18 9" />
    </motion.svg>
);

const LockIcon = () => (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
);

// ───────────────── Category Detection (from Declaration Engine) ─────────────────

const CATEGORY_KEYWORDS = {
    'Vestuário':    ['camiseta', 'camisa', 'blusa', 'moletom', 'jaqueta', 'casaco', 'calça', 'shorts', 'bermuda', 'vestido', 'saia', 'sweater', 'hoodie', 'colete', 'regata', 'meia', 'meias', 'roupa', 'polo', 'agasalho', 'conjunto', 'terno', 'blazer', 't-shirt', 'tee', 'shirt', 'pants', 'jacket', 'coat', 'dress'],
    'Calçados':     ['tênis', 'tenis', 'sapato', 'bota', 'chinelo', 'sandália', 'sandalia', 'sapatênis', 'chuteira', 'sneaker', 'sneakers', 'shoe', 'shoes', 'boot', 'boots', 'air jordan', 'jordan', 'air max', 'air force', 'dunk', 'yeezy'],
    'Eletrônicos':  ['celular', 'smartphone', 'fone', 'headphone', 'earphone', 'earbuds', 'notebook', 'laptop', 'tablet', 'teclado', 'mouse', 'monitor', 'carregador', 'cabo', 'ssd', 'pendrive', 'placa', 'processador', 'gpu', 'drone', 'câmera', 'camera', 'console', 'videogame', 'smartwatch', 'iphone', 'ipad', 'airpods', 'galaxy', 'xiaomi', 'gopro'],
    'Acessórios':   ['óculos', 'oculos', 'pulseira', 'cinto', 'gravata', 'chapéu', 'chapeu', 'boné', 'bone', 'gorro', 'anel', 'brinco', 'colar', 'pingente', 'luva', 'carteira', 'sunglasses', 'bracelet', 'belt', 'hat', 'cap', 'ring', 'necklace', 'scarf'],
    'Bolsas':       ['bolsa', 'mochila', 'pochete', 'necessaire', 'mala', 'bag', 'backpack', 'handbag', 'tote', 'clutch', 'crossbody'],
    'Relógios':     ['relógio', 'relogio', 'watch', 'wristwatch'],
    'Perfumes':     ['perfume', 'colônia', 'colonia', 'eau de toilette', 'eau de parfum', 'fragrance'],
};

/** Category weight — same as the declaration engine's CATEGORY_CONFIG.weight */
const CATEGORY_WEIGHTS = {
    'Vestuário':    0.50,
    'Calçados':     0.75,
    'Eletrônicos':  1.00,
    'Acessórios':   0.45,
    'Bolsas':       0.65,
    'Relógios':     0.85,
    'Perfumes':     0.55,
    'Outros':       0.50,
};

/**
 * Detect category from product title using keyword matching.
 * Same logic as declarationEngine.detectCategory.
 */
function detectCategory(title) {
    const lower = (title || '').toLowerCase();
    let best = null;
    let bestLen = 0;
    for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
        for (const kw of keywords) {
            if (lower.includes(kw) && kw.length > bestLen) {
                best = cat;
                bestLen = kw.length;
            }
        }
    }
    return best || 'Outros';
}

/**
 * Calculate the declared value in USD for a product based on its category.
 * Mirrors the declaration engine's per-unit value formula:
 *   weight mapped from [0.45, 1.0] → [$3, $10]
 */
function getDeclaredValueUSD(category) {
    const w = CATEGORY_WEIGHTS[category] ?? 0.50;
    const normalized = (w - 0.45) / (1.0 - 0.45);
    const BASE_MIN = 3;
    const BASE_MAX = 10;
    return BASE_MIN + normalized * (BASE_MAX - BASE_MIN);
}

// ───────────────── Helpers ─────────────────

const formatBRL = (value) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const formatPercent = (value) => `${(value * 100).toFixed(1)}%`;

const DEFAULT_SETTINGS = {
    freightPerKg: 100,
    importTaxRate: 0.60,
    icmsRate: 0.17,
    desiredMarginPercent: 0.30,
    additionalCosts: 0,
    defaultWeightKg: 0.5,
};

/**
 * Core profit calculation.
 *
 * Taxes are calculated on the **declared value** (low, category-based),
 * NOT on the actual product price — mirroring how the declaration
 * assistant works.
 *
 * Total cost = actual product cost (BRL) + freight + taxes (on declared value) + extras
 */
function calculateProfit(product, settings, cnyBrlRate, usdBrlRate) {
    const priceCNY = parseFloat(product.product_price) || 0;
    if (priceCNY <= 0 || cnyBrlRate <= 0) return null;

    const weightKg = product._weightOverride ?? settings.defaultWeightKg;
    const sellPrice = product._sellPriceOverride ?? null;

    // Detect category and get declared value
    const category = detectCategory(product.product_title);
    const declaredUSD = product._declaredOverride ?? getDeclaredValueUSD(category);
    const declaredBRL = declaredUSD * usdBrlRate;

    // Actual product cost in BRL (real price paid to the seller)
    const costBRL = priceCNY / cnyBrlRate;

    // Freight
    const freightCost = weightKg * settings.freightPerKg;

    // Taxes — calculated on DECLARED value, not actual price
    const importTax = declaredBRL * settings.importTaxRate;
    const icmsBase = declaredBRL + importTax;
    const icms = (icmsBase * settings.icmsRate) / (1 - settings.icmsRate);

    const totalCost = costBRL + freightCost + importTax + icms + settings.additionalCosts;

    // Suggested minimum sell price for desired margin
    const minSellPrice = totalCost / (1 - settings.desiredMarginPercent);

    // If user set a sell price, compute actual profit
    let actualProfit = null;
    let actualMargin = null;
    if (sellPrice !== null && sellPrice > 0) {
        actualProfit = sellPrice - totalCost;
        actualMargin = actualProfit / sellPrice;
    }

    return {
        priceCNY,
        costBRL,
        freightCost,
        importTax,
        icms,
        declaredUSD,
        declaredBRL,
        category,
        totalCost,
        minSellPrice,
        sellPrice,
        actualProfit,
        actualMargin,
        weightKg,
    };
}

// ───────────────── Sub-components ─────────────────

const SettingInput = ({ label, icon, value, onChange, suffix, step = 'any', min = 0, hint }) => (
    <div>
        <label className="flex items-center gap-1.5 text-white/60 text-xs font-medium mb-1.5">
            {icon}
            <span>{label}</span>
        </label>
        <div className="relative">
            <input
                type="number"
                value={value}
                onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
                step={step}
                min={min}
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm font-medium placeholder:text-white/30 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
            {suffix && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 text-xs font-medium">{suffix}</span>
            )}
        </div>
        {hint && <p className="mt-1 text-[10px] text-white/30">{hint}</p>}
    </div>
);

const ResultCard = ({ icon, label, value, highlight = false, negative = false, delay = 0 }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay }}
        className={`p-4 rounded-xl border ${highlight
            ? 'bg-gradient-to-br from-blue-500/20 to-blue-600/10 border-blue-500/30'
            : negative
                ? 'bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20'
                : 'bg-white/5 border-white/10'
            }`}
    >
        <div className="flex items-center gap-2 text-white/60 text-xs font-medium mb-2">
            {icon}
            <span>{label}</span>
        </div>
        <p className={`text-lg font-bold ${highlight ? 'text-blue-400' : negative ? 'text-red-400' : 'text-white'}`}>
            {value}
        </p>
    </motion.div>
);

const ProductSelectCard = ({ product, isSelected, onToggle }) => {
    const price = parseFloat(product.product_price);
    const priceStr = isNaN(price) ? '—' : `¥ ${price.toFixed(0)}`;

    return (
        <button
            onClick={onToggle}
            className={`w-full text-left p-3 rounded-xl border transition-all ${isSelected
                ? 'border-blue-500/40 bg-blue-500/10'
                : 'border-white/5 bg-white/[0.03] hover:bg-white/5'
                }`}
        >
            <div className="flex items-center gap-3">
                <div className={`shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${isSelected ? 'border-blue-500 bg-blue-500' : 'border-white/20'}`}>
                    {isSelected && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                        </svg>
                    )}
                </div>
                <div className="shrink-0 w-10 h-10 rounded-lg bg-gray-800 overflow-hidden">
                    {product.product_image ? (
                        <img src={proxyImage(product.product_image)} alt="" className="w-full h-full object-cover" loading="lazy"
                            onError={(e) => { e.target.style.display = 'none'; }} />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/20">
                            <PackageIcon />
                        </div>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{product.product_title || 'Sem título'}</p>
                    <p className="text-xs text-white/40 mt-0.5">{priceStr}</p>
                </div>
            </div>
        </button>
    );
};

const ProductResultRow = ({ result, product, index, onWeightChange, onSellPriceChange, onDeclaredChange }) => {
    const [expanded, setExpanded] = useState(false);
    const isProfitable = result.actualProfit !== null ? result.actualProfit > 0 : null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className="bg-white/[0.03] rounded-xl border border-white/5 overflow-hidden"
        >
            {/* Header row */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-white/[0.03] transition-colors"
            >
                <div className="shrink-0 w-8 h-8 rounded-lg bg-gray-800 overflow-hidden">
                    {product.product_image ? (
                        <img src={proxyImage(product.product_image)} alt="" className="w-full h-full object-cover" loading="lazy"
                            onError={(e) => { e.target.style.display = 'none'; }} />
                    ) : null}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <p className="text-sm text-white truncate">{product.product_title || 'Sem título'}</p>
                        <span className="shrink-0 text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-white/30 font-medium">{result.category}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-white/40">¥ {result.priceCNY.toFixed(0)}</span>
                        <span className="text-xs text-white/20">|</span>
                        <span className="text-xs text-white/40">Declarado: ${result.declaredUSD.toFixed(2)}</span>
                        <span className="text-xs text-white/20">|</span>
                        <span className="text-xs text-white/50">Custo: {formatBRL(result.totalCost)}</span>
                        <span className="text-xs text-white/20">|</span>
                        <span className="text-xs font-semibold text-blue-400">Venda mín: {formatBRL(result.minSellPrice)}</span>
                    </div>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                    {isProfitable !== null && (isProfitable ? <CheckCircleIcon /> : <AlertIcon />)}
                    <ChevronIcon isOpen={expanded} />
                </div>
            </button>

            {/* Expanded details */}
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                    >
                        <div className="px-4 pb-4 border-t border-white/5 pt-3">
                            {/* Override inputs */}
                            <div className="grid grid-cols-3 gap-3 mb-4">
                                <div>
                                    <label className="text-[10px] text-white/40 font-medium mb-1 block">Peso (kg)</label>
                                    <input
                                        type="number"
                                        value={product._weightOverride ?? ''}
                                        onChange={(e) => onWeightChange(e.target.value === '' ? undefined : Number(e.target.value))}
                                        placeholder={`Padrão: ${result.weightKg}`}
                                        step="0.1"
                                        min="0"
                                        className="w-full px-2.5 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:border-blue-500/50 transition-all placeholder:text-white/20"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] text-white/40 font-medium mb-1 block">Valor Declarado (USD)</label>
                                    <input
                                        type="number"
                                        value={product._declaredOverride ?? ''}
                                        onChange={(e) => onDeclaredChange(e.target.value === '' ? undefined : Number(e.target.value))}
                                        placeholder={`Auto: $${result.declaredUSD.toFixed(2)}`}
                                        step="0.5"
                                        min="0"
                                        className="w-full px-2.5 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:border-blue-500/50 transition-all placeholder:text-white/20"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] text-white/40 font-medium mb-1 block">Preço de Venda (R$)</label>
                                    <input
                                        type="number"
                                        value={product._sellPriceOverride ?? ''}
                                        onChange={(e) => onSellPriceChange(e.target.value === '' ? undefined : Number(e.target.value))}
                                        placeholder="Opcional"
                                        step="1"
                                        min="0"
                                        className="w-full px-2.5 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:border-blue-500/50 transition-all placeholder:text-white/20"
                                    />
                                </div>
                            </div>

                            {/* Cost breakdown */}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                <ResultCard icon={<DollarIcon />} label="Custo Produto (BRL)" value={formatBRL(result.costBRL)} delay={0} />
                                <ResultCard icon={<WeightIcon />} label="Frete" value={formatBRL(result.freightCost)} delay={0.05} />
                                <ResultCard icon={<DollarIcon />} label={`Declarado ($${result.declaredUSD.toFixed(2)})`} value={formatBRL(result.declaredBRL)} delay={0.1} />
                                <ResultCard icon={<PercentIcon />} label="Imposto Importação" value={formatBRL(result.importTax)} delay={0.15} />
                                <ResultCard icon={<PercentIcon />} label="ICMS" value={formatBRL(result.icms)} delay={0.2} />
                                <ResultCard icon={<DollarIcon />} label="Custo Total" value={formatBRL(result.totalCost)} highlight delay={0.25} />
                            </div>

                            <div className="mt-3 grid grid-cols-2 gap-3">
                                <ResultCard icon={<TrendUpIcon />} label="Venda Mínima" value={formatBRL(result.minSellPrice)} highlight delay={0.3} />
                                {result.actualProfit !== null && (
                                    <ResultCard
                                        icon={result.actualProfit >= 0 ? <CheckCircleIcon /> : <AlertIcon />}
                                        label={`Lucro Real (${formatPercent(result.actualMargin)})`}
                                        value={formatBRL(result.actualProfit)}
                                        highlight={result.actualProfit >= 0}
                                        negative={result.actualProfit < 0}
                                        delay={0.35}
                                    />
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

// ───────────────── Tier Gate ─────────────────

const TierGateOverlay = () => {
    const navigate = useNavigate();
    return (
        <div className="w-full max-w-5xl mx-auto px-4 md:px-8 py-8">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
            >
                <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight mb-2">
                    Dashboard de Rentabilidade
                </h1>
                <p className="text-white/60 text-sm md:text-base">
                    Calcule custos, impostos e margens dos seus produtos salvos
                </p>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="bg-[#1f2937] rounded-2xl border border-white/10 p-8 md:p-12 text-center"
            >
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/20 text-blue-400 mb-6">
                    <LockIcon />
                </div>
                <h2 className="text-xl font-bold text-white mb-3">Recurso Exclusivo — Plano Minerador</h2>
                <p className="text-white/50 text-sm max-w-md mx-auto mb-6 leading-relaxed">
                    O Dashboard de Rentabilidade com cálculo inteligente de declaração e impostos está disponível apenas para assinantes do plano <span className="text-blue-400 font-semibold">Minerador (Ouro)</span>.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => navigate('/store')}
                        className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-500/25 transition-all"
                    >
                        Ver Planos
                    </motion.button>
                    <button
                        onClick={() => navigate('/')}
                        className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white/60 font-medium text-sm rounded-xl transition-all"
                    >
                        Voltar ao Início
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

// ───────────────── Main Component ─────────────────

export default function ProfitDashboardPage({ userTier }) {
    // Tier gate: only gold (Minerador) can access
    if (userTier !== 'gold') return <TierGateOverlay />;

    return <ProfitDashboardInner />;
}

function ProfitDashboardInner() {
    const [settings, setSettings] = useState(DEFAULT_SETTINGS);
    const [settingsOpen, setSettingsOpen] = useState(true);
    const [savedProducts, setSavedProducts] = useState([]);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [cnyBrlRate, setCnyBrlRate] = useState(null);
    const [usdBrlRate, setUsdBrlRate] = useState(null);
    const [loadingRate, setLoadingRate] = useState(true);
    const [loadingProducts, setLoadingProducts] = useState(true);
    const [loadingSettings, setLoadingSettings] = useState(true);
    const [savingSettings, setSavingSettings] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [productOverrides, setProductOverrides] = useState({});

    const token = localStorage.getItem('accessToken');

    // ── Fetch exchange rates (CNY → BRL + USD → BRL) ──
    const fetchExchangeRates = useCallback(async () => {
        setLoadingRate(true);
        try {
            // CNY → BRL from our backend
            const cnyRes = await fetch('/api/exchange-rate');
            if (cnyRes.ok) {
                const cnyData = await cnyRes.json();
                setCnyBrlRate(cnyData.rate || 0.80);
            } else {
                setCnyBrlRate(0.80);
            }

            // USD → BRL from AwesomeAPI (same source as FeeCalculator)
            const usdRes = await fetch('https://economia.awesomeapi.com.br/last/USD-BRL', { signal: AbortSignal.timeout(5000) });
            if (usdRes.ok) {
                const usdData = await usdRes.json();
                setUsdBrlRate(parseFloat(usdData.USDBRL.bid) || 5.60);
            } else {
                setUsdBrlRate(5.60);
            }
        } catch {
            setCnyBrlRate(prev => prev || 0.80);
            setUsdBrlRate(prev => prev || 5.60);
        } finally {
            setLoadingRate(false);
        }
    }, []);

    // ── Fetch saved products ──
    const fetchSavedProducts = useCallback(async () => {
        if (!token) return;
        setLoadingProducts(true);
        try {
            const res = await fetch('/api/saved-products', {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setSavedProducts(data.products || []);
            }
        } catch { /* silent */ }
        finally { setLoadingProducts(false); }
    }, [token]);

    // ── Fetch saved settings ──
    const fetchSettings = useCallback(async () => {
        if (!token) return;
        setLoadingSettings(true);
        try {
            const res = await fetch('/api/user/profit-settings', {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                if (data.settings) {
                    setSettings(prev => ({ ...prev, ...data.settings }));
                }
            }
        } catch { /* silent */ }
        finally { setLoadingSettings(false); }
    }, [token]);

    // ── Save settings ──
    const handleSaveSettings = async () => {
        if (!token) return;
        setSavingSettings(true);
        setSaveSuccess(false);
        try {
            const res = await fetch('/api/user/profit-settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ settings }),
            });
            if (res.ok) {
                setSaveSuccess(true);
                setTimeout(() => setSaveSuccess(false), 2000);
            }
        } catch { /* silent */ }
        finally { setSavingSettings(false); }
    };

    // ── Init ──
    useEffect(() => { fetchExchangeRates(); }, [fetchExchangeRates]);
    useEffect(() => { fetchSavedProducts(); }, [fetchSavedProducts]);
    useEffect(() => { fetchSettings(); }, [fetchSettings]);

    // ── Product selection ──
    const toggleProduct = (id) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const selectAll = () => {
        if (selectedIds.size === savedProducts.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(savedProducts.map(p => p.id)));
        }
    };

    // ── Apply overrides and calculate ──
    const selectedProducts = useMemo(() =>
        savedProducts
            .filter(p => selectedIds.has(p.id))
            .map(p => ({
                ...p,
                _weightOverride: productOverrides[p.id]?.weight,
                _sellPriceOverride: productOverrides[p.id]?.sellPrice,
                _declaredOverride: productOverrides[p.id]?.declared,
            })),
        [savedProducts, selectedIds, productOverrides]
    );

    const results = useMemo(() => {
        if (!cnyBrlRate || !usdBrlRate) return [];
        return selectedProducts.map(p => ({
            product: p,
            result: calculateProfit(p, settings, cnyBrlRate, usdBrlRate),
        })).filter(r => r.result !== null);
    }, [selectedProducts, settings, cnyBrlRate, usdBrlRate]);

    // ── Summary stats ──
    const summary = useMemo(() => {
        if (results.length === 0) return null;
        const totalCost = results.reduce((s, r) => s + r.result.totalCost, 0);
        const totalMinSell = results.reduce((s, r) => s + r.result.minSellPrice, 0);
        const withSellPrice = results.filter(r => r.result.actualProfit !== null);
        const totalProfit = withSellPrice.reduce((s, r) => s + r.result.actualProfit, 0);
        const avgMargin = withSellPrice.length > 0
            ? withSellPrice.reduce((s, r) => s + r.result.actualMargin, 0) / withSellPrice.length
            : null;
        return { totalCost, totalMinSell, totalProfit, avgMargin, count: results.length, withSellCount: withSellPrice.length };
    }, [results]);

    const handleWeightChange = (productId, weight) => {
        setProductOverrides(prev => ({ ...prev, [productId]: { ...prev[productId], weight } }));
    };

    const handleSellPriceChange = (productId, sellPrice) => {
        setProductOverrides(prev => ({ ...prev, [productId]: { ...prev[productId], sellPrice } }));
    };

    const handleDeclaredChange = (productId, declared) => {
        setProductOverrides(prev => ({ ...prev, [productId]: { ...prev[productId], declared } }));
    };

    const updateSetting = (key, value) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const isLoading = loadingRate || loadingProducts || loadingSettings;

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
                        Dashboard de Rentabilidade
                    </h1>
                </div>
                <p className="text-white/60 text-sm md:text-base">
                    Calcule custos, impostos e margens dos seus produtos salvos
                </p>
            </motion.div>

            {/* Exchange Rate Banner */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="mb-6 px-5 py-3 bg-gradient-to-r from-blue-600/20 to-blue-500/10 rounded-2xl border border-white/10 flex items-center justify-between flex-wrap gap-3"
            >
                <div className="flex items-center gap-5 flex-wrap">
                    <div className="flex items-center gap-2">
                        <span className="text-xl">🇨🇳</span>
                        <span className="text-white/40 text-xs">→</span>
                        <span className="text-xl">🇧🇷</span>
                        <div className="ml-1">
                            <p className="text-white/40 text-[9px] font-medium uppercase tracking-wider">CNY → BRL</p>
                            {loadingRate ? (
                                <div className="h-5 w-16 bg-white/10 rounded animate-pulse" />
                            ) : (
                                <p className="text-white font-bold text-sm">R$ {cnyBrlRate?.toFixed(4) || '—'}</p>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xl">🇺🇸</span>
                        <span className="text-white/40 text-xs">→</span>
                        <span className="text-xl">🇧🇷</span>
                        <div className="ml-1">
                            <p className="text-white/40 text-[9px] font-medium uppercase tracking-wider">USD → BRL</p>
                            {loadingRate ? (
                                <div className="h-5 w-16 bg-white/10 rounded animate-pulse" />
                            ) : (
                                <p className="text-white font-bold text-sm">R$ {usdBrlRate?.toFixed(2) || '—'}</p>
                            )}
                        </div>
                    </div>
                </div>
                <button
                    onClick={fetchExchangeRates}
                    disabled={loadingRate}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white/80 text-sm font-medium transition-all disabled:opacity-50"
                >
                    <motion.svg
                        width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        animate={loadingRate ? { rotate: 360 } : { rotate: 0 }}
                        transition={loadingRate ? { duration: 1, repeat: Infinity, ease: "linear" } : {}}
                    >
                        <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                        <path d="M21 3v5h-5" />
                    </motion.svg>
                    Atualizar
                </button>
            </motion.div>

            {/* Info banner about declared values */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 }}
                className="mb-6 px-5 py-3 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 flex items-start gap-3"
            >
                <span className="text-base mt-0.5">📋</span>
                <div>
                    <p className="text-emerald-400 text-xs font-semibold">Valor declarado inteligente</p>
                    <p className="text-white/40 text-[11px] mt-0.5 leading-relaxed">
                        Os impostos são calculados sobre o <span className="text-white/60 font-medium">valor declarado</span> (estimado automaticamente pela categoria do produto),
                        não sobre o preço real — mesma lógica do Assistente de Declaração. Você pode ajustar o valor declarado por produto.
                    </p>
                </div>
            </motion.div>

            {/* Settings Panel */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="mb-6 bg-[#1f2937] rounded-2xl border border-white/10 overflow-hidden"
            >
                <button
                    onClick={() => setSettingsOpen(!settingsOpen)}
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.03] transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                            <SettingsIcon />
                        </div>
                        <div className="text-left">
                            <p className="text-sm font-bold text-white">Configurações de Custo</p>
                            <p className="text-[11px] text-white/40">Frete, impostos e margem desejada</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {saveSuccess && (
                            <motion.span
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0 }}
                                className="text-[10px] text-emerald-400 font-medium"
                            >
                                Salvo!
                            </motion.span>
                        )}
                        <ChevronIcon isOpen={settingsOpen} />
                    </div>
                </button>

                <AnimatePresence>
                    {settingsOpen && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            className="overflow-hidden"
                        >
                            <div className="px-5 pb-5 border-t border-white/5 pt-4">
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    <SettingInput
                                        label="Frete por Kg"
                                        icon={<WeightIcon />}
                                        value={settings.freightPerKg}
                                        onChange={(v) => updateSetting('freightPerKg', v)}
                                        suffix="R$/kg"
                                        step="1"
                                        hint="Custo do frete internacional"
                                    />
                                    <SettingInput
                                        label="Imposto Importação"
                                        icon={<PercentIcon />}
                                        value={settings.importTaxRate * 100}
                                        onChange={(v) => updateSetting('importTaxRate', v === '' ? '' : v / 100)}
                                        suffix="%"
                                        step="1"
                                        hint="Padrão: 60% (sobre declarado)"
                                    />
                                    <SettingInput
                                        label="ICMS"
                                        icon={<PercentIcon />}
                                        value={settings.icmsRate * 100}
                                        onChange={(v) => updateSetting('icmsRate', v === '' ? '' : v / 100)}
                                        suffix="%"
                                        step="1"
                                        hint='Padrão: 17% "por dentro"'
                                    />
                                    <SettingInput
                                        label="Margem Desejada"
                                        icon={<TrendUpIcon />}
                                        value={settings.desiredMarginPercent * 100}
                                        onChange={(v) => updateSetting('desiredMarginPercent', v === '' ? '' : v / 100)}
                                        suffix="%"
                                        step="1"
                                        hint="Lucro mínimo esperado"
                                    />
                                    <SettingInput
                                        label="Peso Padrão"
                                        icon={<WeightIcon />}
                                        value={settings.defaultWeightKg}
                                        onChange={(v) => updateSetting('defaultWeightKg', v)}
                                        suffix="kg"
                                        step="0.1"
                                        hint="Usado quando não especificado"
                                    />
                                    <SettingInput
                                        label="Custos Adicionais"
                                        icon={<DollarIcon />}
                                        value={settings.additionalCosts}
                                        onChange={(v) => updateSetting('additionalCosts', v)}
                                        suffix="R$"
                                        step="1"
                                        hint="Embalagem, etiqueta, etc."
                                    />
                                </div>

                                <div className="mt-4 flex justify-end">
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={handleSaveSettings}
                                        disabled={savingSettings}
                                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-500/25 disabled:opacity-50 transition-all"
                                    >
                                        <SaveIcon spinning={savingSettings} />
                                        {savingSettings ? 'Salvando...' : 'Salvar Configurações'}
                                    </motion.button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

            {/* Product Selection */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="mb-6 bg-[#1f2937] rounded-2xl border border-white/10 overflow-hidden"
            >
                <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                            <PackageIcon />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-white">Selecionar Produtos</p>
                            <p className="text-[11px] text-white/40">
                                {savedProducts.length > 0
                                    ? `${selectedIds.size} de ${savedProducts.length} selecionados`
                                    : 'Nenhum produto salvo'}
                            </p>
                        </div>
                    </div>
                    {savedProducts.length > 0 && (
                        <button
                            onClick={selectAll}
                            className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
                        >
                            {selectedIds.size === savedProducts.length ? 'Desmarcar todos' : 'Selecionar todos'}
                        </button>
                    )}
                </div>

                <div className="p-4 max-h-[320px] overflow-y-auto space-y-2" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
                    {loadingProducts ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="w-5 h-5 border-2 border-white/20 border-t-blue-400 rounded-full animate-spin" />
                        </div>
                    ) : savedProducts.length === 0 ? (
                        <div className="py-8 text-center">
                            <span className="text-2xl block mb-2">📦</span>
                            <p className="text-sm text-white/40">Nenhum produto salvo</p>
                            <p className="text-xs text-white/25 mt-1">Salve produtos na mineração para analisar aqui</p>
                        </div>
                    ) : (
                        savedProducts.map(p => (
                            <ProductSelectCard
                                key={p.id}
                                product={p}
                                isSelected={selectedIds.has(p.id)}
                                onToggle={() => toggleProduct(p.id)}
                            />
                        ))
                    )}
                </div>
            </motion.div>

            {/* Results */}
            <AnimatePresence>
                {results.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        transition={{ delay: 0.2 }}
                    >
                        {/* Summary Cards */}
                        {summary && (
                            <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                                <ResultCard icon={<PackageIcon />} label="Produtos Analisados" value={summary.count} delay={0} />
                                <ResultCard icon={<DollarIcon />} label="Custo Total" value={formatBRL(summary.totalCost)} delay={0.05} />
                                <ResultCard icon={<TrendUpIcon />} label="Venda Mínima Total" value={formatBRL(summary.totalMinSell)} highlight delay={0.1} />
                                {summary.withSellCount > 0 && (
                                    <ResultCard
                                        icon={summary.totalProfit >= 0 ? <CheckCircleIcon /> : <AlertIcon />}
                                        label="Lucro Total"
                                        value={formatBRL(summary.totalProfit)}
                                        highlight={summary.totalProfit >= 0}
                                        negative={summary.totalProfit < 0}
                                        delay={0.15}
                                    />
                                )}
                            </div>
                        )}

                        {/* Per-product results */}
                        <div className="bg-[#1f2937] rounded-2xl border border-white/10 overflow-hidden">
                            <div className="px-5 py-4 border-b border-white/5 flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                                    <TrendUpIcon />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-white">Análise por Produto</p>
                                    <p className="text-[11px] text-white/40">Clique para expandir — ajuste peso, valor declarado e preço de venda</p>
                                </div>
                            </div>
                            <div className="p-4 space-y-2">
                                {results.map((r, i) => (
                                    <ProductResultRow
                                        key={r.product.id}
                                        result={r.result}
                                        product={r.product}
                                        index={i}
                                        onWeightChange={(w) => handleWeightChange(r.product.id, w)}
                                        onSellPriceChange={(p) => handleSellPriceChange(r.product.id, p)}
                                        onDeclaredChange={(d) => handleDeclaredChange(r.product.id, d)}
                                    />
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Empty state when products selected but no rates */}
            {selectedIds.size > 0 && (!cnyBrlRate || !usdBrlRate) && !loadingRate && (
                <div className="py-12 text-center">
                    <span className="text-3xl block mb-3">⚠️</span>
                    <p className="text-white/50 text-sm">Não foi possível obter as taxas de câmbio</p>
                    <button onClick={fetchExchangeRates} className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors">
                        Tentar novamente
                    </button>
                </div>
            )}

            {/* Hint when nothing selected */}
            {selectedIds.size === 0 && savedProducts.length > 0 && !isLoading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-12 text-center">
                    <span className="text-3xl block mb-3">📊</span>
                    <p className="text-white/40 text-sm">Selecione produtos acima para calcular a rentabilidade</p>
                </motion.div>
            )}
        </div>
    );
}
