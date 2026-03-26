import { useState, useEffect, useRef, memo } from 'react';

/**
 * SellerCard - Componente visual premium para exibir pontuação de confiança do vendedor
 * Layout adaptável:
 * - variant="full": Layout expandido para lista de resultados (3 colunas, glassmorphism)
 * - variant="compact": Layout condesado para Hero section (2 colunas, mais limpo)
 */
const SellerCard = memo(function SellerCard({ sellerInfo, variant = 'full', sellerUrl, onSaveSeller, isSaved = false }) {
    const [view, setView] = useState('report'); // 'report' ou 'save'
    const [isTransitioning, setIsTransitioning] = useState(false);

    // Form state
    const [saveNickname, setSaveNickname] = useState('');
    const [selectedIcon, setSelectedIcon] = useState('🏪');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(isSaved);

    // Sync isSaved prop with local state
    useEffect(() => {
        console.log('[SellerCard] isSaved prop changed:', isSaved, '| sellerInfo.sellerId:', sellerInfo?.sellerId);
        setSaved(isSaved);
    }, [isSaved, sellerInfo?.sellerId]);

    const ICONS = ['🏪', '⭐', '🔥', '💎', '📱', '⌚', '👜', '👟'];

    // Height animation ref
    const contentRef = useRef(null);
    const [contentHeight, setContentHeight] = useState(0);

    // Initial measurement on mount
    useEffect(() => {
        if (contentRef.current) {
            setContentHeight(contentRef.current.scrollHeight);
        }
    }, []);

    // Measure content height when view changes
    useEffect(() => {
        // Double RAF to ensure DOM is fully updated
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                if (contentRef.current) {
                    setContentHeight(contentRef.current.scrollHeight);
                }
            });
        });
    }, [view]);

    // Trigger transition animation
    const handleToggleView = (newView) => {
        setIsTransitioning(true);

        // Wait for orange block to cover (0.4s)
        setTimeout(() => {
            setView(newView);
        }, 400);

        // Wait for full animation cycle (0.9s)
        setTimeout(() => {
            setIsTransitioning(false);
        }, 900);
    };

    if (!sellerInfo) return null;

    const {
        avatar,
        nickname: sellerNickname,
        level,
        monthsActiveFormatted,
        // Trust info
        trustScore,
        trustClassification,
        trustClassificationColor,
        trustClassificationIcon,
        trustBreakdown,
        // Metrics
        followersFormatted,
        salesCountFormatted,
        followers,
        salesCount
    } = sellerInfo;

    const score = trustScore || 0;
    const classification = trustClassification || 'Desconhecido';
    const classificationColor = trustClassificationColor || 'orange';
    const classificationIcon = trustClassificationIcon || '❓';
    const breakdown = trustBreakdown || null;
    const isTrustworthy = score >= 60;
    const isCompact = variant === 'compact';

    const formatMetric = (value, formattedValue) => {
        if (typeof value === 'number') {
            if (value >= 10000) return (value / 1000).toFixed(1).replace('.0', '') + 'k';
            if (value >= 1000) return (value / 1000).toFixed(1).replace('.0', '') + 'k';
            return value.toString();
        }
        if (formattedValue) {
            if (formattedValue.includes('万')) {
                const num = parseFloat(formattedValue.replace('万', ''));
                return (num * 10).toFixed(1).replace('.0', '') + 'k';
            }
            return formattedValue;
        }
        return '0';
    };

    const colorMap = {
        green: { gradient: '#10B981', text: '#10B981', bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.2)' },
        blue: { gradient: '#3B82F6', text: '#60A5FA', bg: 'rgba(59, 130, 246, 0.1)', border: 'rgba(59, 130, 246, 0.2)' },
        yellow: { gradient: '#F59E0B', text: '#FBBF24', bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.2)' },
        orange: { gradient: '#3B82F6', text: '#60A5FA', bg: 'rgba(59, 130, 246, 0.1)', border: 'rgba(59, 130, 246, 0.2)' },
        red: { gradient: '#EF4444', text: '#F87171', bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.2)' }
    };

    const colors = colorMap[classificationColor] || colorMap.orange;

    return (
        <div
            className={`w-full mb-8 relative overflow-hidden rounded-2xl transition-all duration-300 hover:shadow-lg ${isCompact ? '' : 'border border-white/10'} ${isTransitioning ? 'seller-card-transition-active' : ''}`}
            style={{
                background: '#1f2937',
                backdropFilter: isCompact ? 'none' : 'blur(10px)',
                boxShadow: 'var(--shadow-soft)',
                minHeight: isCompact ? 'auto' : '140px'
            }}
        >
            {/* Orange Shutter Animation Block */}
            <div className="seller-card-transition-block"></div>

            {/* Content Wrapper with animated height - matches AuthCard pattern */}
            <div
                className="overflow-hidden"
                style={{
                    height: contentHeight ? `${contentHeight}px` : 'auto',
                    transition: 'height 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
            >
                <div ref={contentRef}>
                    {/* View 1: Seller Report */}
                    {view === 'report' && (
                        <div className="p-6 relative z-10">
                            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                                {/* Profile */}
                                <div className="flex items-center gap-5 flex-1 min-w-0">
                                    <div className="relative">
                                        {avatar ? (
                                            <img src={avatar} alt={sellerNickname} className="w-20 h-20 rounded-2xl object-cover shadow-sm" style={{ border: '3px solid #374151' }} />
                                        ) : (
                                            <div className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-sm" style={{ background: 'linear-gradient(135deg, #60A5FA 0%, #3B82F6 100%)', border: '3px solid #374151' }}>
                                                <span className="text-3xl">👤</span>
                                            </div>
                                        )}
                                        {level > 0 && (
                                            <div className="absolute -bottom-2 -right-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-0.5 rounded-full shadow-sm border-2 border-[#1f2937]">
                                                L{level}
                                            </div>
                                        )}
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <h2 className="text-xl font-bold truncate mb-1" style={{ color: 'white' }}>
                                            {sellerNickname || 'Vendedor do Xianyu'}
                                        </h2>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="px-2.5 py-0.5 rounded-md text-xs font-medium flex items-center gap-1.5" style={{ background: colors.bg, color: colors.text }}>
                                                {classificationIcon} {classification}
                                            </span>
                                            {monthsActiveFormatted && (
                                                <span className="text-xs text-gray-400 flex items-center gap-1">
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                    {monthsActiveFormatted}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Metrics */}
                                <div className="flex items-center gap-8 px-6 md:border-l md:border-r border-white/10 flex-shrink-0">
                                    <div className="text-center">
                                        <p className="text-2xl font-bold" style={{ color: 'white' }}>{formatMetric(salesCount, salesCountFormatted)}</p>
                                        <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Produtos</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-2xl font-bold" style={{ color: 'white' }}>{formatMetric(followers, followersFormatted)}</p>
                                        <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Seguidores</p>
                                    </div>
                                </div>

                                {/* Score & Save Button */}
                                <div className="flex items-center gap-6 flex-shrink-0 min-w-[200px] justify-center md:justify-end">
                                    {onSaveSeller && sellerUrl && (
                                        <button
                                            onClick={() => handleToggleView('save')}
                                            disabled={saved}
                                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${saved ? 'bg-green-500/10 text-green-400 cursor-default' : 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20'
                                                }`}
                                        >
                                            {saved ? '✓ Já salvo!' : '📌 Salvar Vendedor'}
                                        </button>
                                    )}

                                    <div className="relative w-16 h-16 flex items-center justify-center">
                                        <svg className="w-full h-full transform -rotate-90 drop-shadow-sm" viewBox="0 0 36 36">
                                            <path className="text-white/10" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                                            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={colors.gradient} strokeWidth="3" strokeDasharray={`${score}, 100`} strokeLinecap="round" />
                                        </svg>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="text-xl font-bold" style={{ color: 'white' }}>{score}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* View 2: Save Menu */}
                    {view === 'save' && (
                        <div className="p-6 animate-scale-in relative z-10 flex flex-col md:flex-row items-center gap-6 bg-blue-500/5">
                            <div className="flex-1">
                                <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                                    <span>📌</span> Salvar Vendedor
                                </h3>
                                <p className="text-sm text-gray-400 mb-4">Escolha um apelido único para facilitar o acesso.</p>

                                <div className="flex flex-col md:flex-row gap-4 items-end">
                                    <div className="flex-1 w-full">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1 block">Apelido do Vendedor</label>
                                        <input
                                            type="text"
                                            placeholder="Ex: iPhone Master"
                                            value={saveNickname}
                                            onChange={(e) => setSaveNickname(e.target.value)}
                                            className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium"
                                            maxLength={50}
                                            autoFocus
                                        />
                                    </div>

                                    <div className="w-full md:w-auto">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1 block text-center md:text-left">Ícone</label>
                                        <div className="flex gap-2 p-1 bg-white/5 rounded-xl border border-white/10">
                                            {ICONS.slice(0, 4).map(icon => (
                                                <button
                                                    key={icon}
                                                    onClick={() => setSelectedIcon(icon)}
                                                    className={`w-10 h-10 rounded-lg text-xl transition-all ${selectedIcon === icon ? 'bg-blue-500/20 shadow-inner' : 'hover:bg-white/5'}`}
                                                >
                                                    {icon}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3 min-w-[150px] w-full md:w-auto">
                                <button
                                    onClick={async () => {
                                        if (!saveNickname.trim()) return;
                                        setSaving(true);
                                        try {
                                            await onSaveSeller({
                                                nickname: saveNickname.trim(),
                                                sellerUrl,
                                                sellerId: sellerInfo.sellerId,
                                                sellerName: saveNickname || sellerInfo.nickname,
                                                sellerAvatar: sellerInfo.avatar,
                                                iconValue: selectedIcon
                                            });
                                            setSaved(true);
                                            handleToggleView('report');
                                        } catch (err) {
                                            alert(err.message);
                                        } finally {
                                            setSaving(false);
                                        }
                                    }}
                                    disabled={saving || !saveNickname.trim()}
                                    className="w-full py-3.5 rounded-xl text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-50"
                                    style={{ background: '#3B82F6' }}
                                >
                                    {saving ? 'Salvando...' : 'Confirmar'}
                                </button>
                                <button
                                    onClick={() => handleToggleView('report')}
                                    className="w-full py-2 text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors uppercase tracking-widest"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});

export default SellerCard;
