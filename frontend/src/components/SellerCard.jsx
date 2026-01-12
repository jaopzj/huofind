/**
 * SellerCard - Componente minimalista para exibir pontuação de confiança do vendedor
 * 
 * Expected sellerInfo structure from backend:
 * - avatar, nickname, level
 * - followers, followersFormatted
 * - salesCount, salesCountFormatted
 * - trustScore, trustBreakdown, trustClassification, trustClassificationColor, trustClassificationIcon
 */
function SellerCard({ sellerInfo }) {
    if (!sellerInfo) return null;

    const {
        avatar,
        nickname,
        // Trust score fields (prefixed with "trust")
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

    // Use trustScore, default to 0 if not present
    const score = trustScore || 0;
    const classification = trustClassification || 'Desconhecido';
    const classificationColor = trustClassificationColor || 'orange';
    const classificationIcon = trustClassificationIcon || '❓';
    const breakdown = trustBreakdown || null;

    // Determine if trustworthy (score >= 60)
    const isTrustworthy = score >= 60;

    // Cores baseadas na classificação
    const colorMap = {
        green: { gradient: '#10B981', text: '#047857', bg: 'rgba(16, 185, 129, 0.1)' },
        blue: { gradient: '#3B82F6', text: '#1D4ED8', bg: 'rgba(59, 130, 246, 0.1)' },
        yellow: { gradient: '#F59E0B', text: '#D97706', bg: 'rgba(245, 158, 11, 0.1)' },
        orange: { gradient: '#FF6B35', text: '#E55A2B', bg: 'rgba(255, 107, 53, 0.1)' },
        red: { gradient: '#EF4444', text: '#DC2626', bg: 'rgba(239, 68, 68, 0.1)' }
    };

    const colors = colorMap[classificationColor] || colorMap.orange;

    // Formata tempo de casa
    const months = sellerInfo.monthsActive || 0;
    let timeText = 'Recém-chegado';
    if (months >= 12) {
        const years = Math.floor(months / 12);
        const remainingMonths = months % 12;
        timeText = `${years} ano${years > 1 ? 's' : ''}${remainingMonths > 0 ? ` e ${remainingMonths} mês(es)` : ''}`;
    } else if (months > 0) {
        timeText = `${months} mês(es)`;
    }

    return (
        // Removido max-w-2xl para ocupar largura total como SearchFilters
        <div className="seller-card-new w-full mx-auto mb-8 p-6 rounded-2xl"
            style={{
                background: 'white',
                border: `1px solid ${colors.bg}`,
                boxShadow: 'var(--shadow-soft)'
            }}
        >
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                {/* Left: Avatar + Info Principal */}
                <div className="flex items-center gap-5 flex-1">
                    <div className="relative">
                        {avatar ? (
                            <img
                                src={avatar}
                                alt={nickname}
                                className="w-20 h-20 rounded-2xl object-cover shadow-sm"
                                style={{ border: '2px solid var(--color-cream-200)' }}
                            />
                        ) : (
                            <div
                                className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-sm"
                                style={{ background: 'linear-gradient(135deg, #FF8C5A 0%, #FF6B35 100%)' }}
                            >
                                <span className="text-3xl">👤</span>
                            </div>
                        )}
                        {/* Level badge se existir */}
                        {sellerInfo.level > 0 && (
                            <div className="absolute -bottom-2 -right-2 bg-yellow-400 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-sm border-2 border-white">
                                L{sellerInfo.level}
                            </div>
                        )}
                    </div>

                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-2xl" style={{ color: '#1F2937' }}>
                                {nickname || 'Vendedor Goofish'}
                            </h3>
                            {isTrustworthy && (
                                <span className="package-badge bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                    Verificado
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                            <span className="font-medium px-2 py-0.5 rounded-md" style={{ background: colors.bg, color: colors.text }}>
                                {classificationIcon} {classification}
                            </span>
                            <span className="text-gray-400">|</span>
                            <span style={{ color: '#6B7280' }}>
                                No Xianyu há <strong style={{ color: '#374151' }}>{timeText}</strong>
                            </span>
                        </div>
                    </div>
                </div>

                {/* Middle: Metrics Grid */}
                <div className="flex items-center gap-8 px-8 border-l border-r border-gray-100 flex-1 justify-center">
                    <div className="text-center">
                        <p className="text-3xl font-bold tracking-tight" style={{ color: '#1F2937' }}>
                            {salesCountFormatted || salesCount || '0'}
                        </p>
                        <p className="text-xs uppercase tracking-wider font-semibold" style={{ color: '#9CA3AF' }}>Vendas</p>
                    </div>
                    <div className="text-center">
                        <p className="text-3xl font-bold tracking-tight" style={{ color: '#1F2937' }}>
                            {followersFormatted || followers || '0'}
                        </p>
                        <p className="text-xs uppercase tracking-wider font-semibold" style={{ color: '#9CA3AF' }}>Seguidores</p>
                    </div>
                </div>

                {/* Right: Score Circle */}
                <div className="flex items-center justify-end flex-initial pl-4">
                    <div className="flex flex-col items-center gap-2">
                        <div
                            className="score-circle relative w-20 h-20 rounded-full flex items-center justify-center bg-gray-100"
                            style={{
                                background: `conic-gradient(${colors.gradient} ${score * 3.6}deg, #F3F4F6 0deg)`
                            }}
                        >
                            <div className="absolute inset-1 bg-white rounded-full flex items-center justify-center shadow-inner">
                                <span className="text-2xl font-bold" style={{ color: '#1F2937' }}>{score}</span>
                            </div>
                        </div>
                        <span className="text-xs font-medium text-gray-500">Trust Score</span>
                    </div>
                </div>
            </div>

            {/* Bottom: Score Breakdown Chips */}
            {breakdown && (
                <div className="mt-6 pt-4 border-t border-gray-100 flex flex-wrap gap-3 items-center">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide mr-2">Pontuação Detalhada:</span>

                    {/* Tempo */}
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-100">
                        <span className="text-lg">⏳</span>
                        <div className="flex flex-col leading-none">
                            <span className="text-xs text-gray-500">Tempo de Casa</span>
                            <span className="text-sm font-bold text-gray-700">{breakdown.time || 0}/40</span>
                        </div>
                    </div>

                    {/* Vendas */}
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-100">
                        <span className="text-lg">📦</span>
                        <div className="flex flex-col leading-none">
                            <span className="text-xs text-gray-500">Volume Vendas</span>
                            <span className="text-sm font-bold text-gray-700">{breakdown.sales || 0}/30</span>
                        </div>
                    </div>

                    {/* Seguidores */}
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-100">
                        <span className="text-lg">👥</span>
                        <div className="flex flex-col leading-none">
                            <span className="text-xs text-gray-500">Popularidade</span>
                            <span className="text-sm font-bold text-gray-700">{breakdown.followers || 0}/30</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default SellerCard;
