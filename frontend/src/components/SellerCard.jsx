/**
 * SellerCard - Componente visual premium para exibir pontuação de confiança do vendedor
 * Layout full-width para alinhar com SearchFilters
 */
function SellerCard({ sellerInfo }) {
    if (!sellerInfo) return null;

    const {
        avatar,
        nickname,
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
        green: { gradient: '#10B981', text: '#047857', bg: 'rgba(16, 185, 129, 0.1)', border: '#A7F3D0' },
        blue: { gradient: '#3B82F6', text: '#1D4ED8', bg: 'rgba(59, 130, 246, 0.1)', border: '#BFDBFE' },
        yellow: { gradient: '#F59E0B', text: '#D97706', bg: 'rgba(245, 158, 11, 0.1)', border: '#FDE68A' },
        orange: { gradient: '#FF6B35', text: '#E55A2B', bg: 'rgba(255, 107, 53, 0.1)', border: '#FED7AA' },
        red: { gradient: '#EF4444', text: '#DC2626', bg: 'rgba(239, 68, 68, 0.1)', border: '#FECACA' }
    };

    const colors = colorMap[classificationColor] || colorMap.orange;

    return (
        <div
            className="w-full mb-8 relative overflow-hidden rounded-2xl transition-all duration-300 hover:shadow-lg"
            style={{
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(10px)',
                boxShadow: 'var(--shadow-soft)',
                border: '1px solid rgba(255, 255, 255, 0.5)'
            }}
        >
            {/* Background Decoration */}
            <div
                className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10 pointer-events-none"
                style={{
                    background: `radial-gradient(circle, ${colors.gradient} 0%, transparent 70%)`,
                    transform: 'translate(30%, -30%)'
                }}
            />

            <div className="flex flex-col md:flex-row items-center justify-between p-6 gap-6 relative z-10">

                {/* 1. Profile Section */}
                <div className="flex items-center gap-5 flex-1 min-w-0">
                    <div className="relative">
                        {avatar ? (
                            <img
                                src={avatar}
                                alt={nickname}
                                className="w-20 h-20 rounded-2xl object-cover shadow-sm"
                                style={{ border: '3px solid white' }}
                            />
                        ) : (
                            <div
                                className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-sm"
                                style={{
                                    background: 'linear-gradient(135deg, #FF9A76 0%, #FF6B35 100%)',
                                    border: '3px solid white'
                                }}
                            >
                                <span className="text-3xl">👤</span>
                            </div>
                        )}
                        {level > 0 && (
                            <div
                                className="absolute -bottom-2 -right-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-0.5 rounded-full shadow-sm border-2 border-white"
                            >
                                L{level}
                            </div>
                        )}
                    </div>

                    <div className="min-w-0">
                        <h2 className="text-xl font-bold truncate mb-1" style={{ color: '#1F2937' }}>
                            {nickname || 'Vendedor do Xianyu'}
                        </h2>
                        <div className="flex items-center gap-2 flex-wrap">
                            <span
                                className="px-2.5 py-0.5 rounded-md text-sm font-medium flex items-center gap-1.5"
                                style={{ background: colors.bg, color: colors.text }}
                            >
                                {classificationIcon} {classification}
                            </span>
                            {monthsActiveFormatted && (
                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    {monthsActiveFormatted}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* 2. Metrics Section */}
                <div className="flex items-center gap-8 px-6 md:border-l md:border-r border-gray-100 flex-shrink-0">
                    <div className="text-center group cursor-default">
                        <p className="text-2xl font-bold group-hover:scale-110 transition-transform" style={{ color: '#1F2937' }}>
                            {salesCountFormatted || '0'}
                        </p>
                        <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Vendas</p>
                    </div>

                    <div className="text-center group cursor-default">
                        <p className="text-2xl font-bold group-hover:scale-110 transition-transform" style={{ color: '#1F2937' }}>
                            {followersFormatted || '0'}
                        </p>
                        <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Seguidores</p>
                    </div>

                    {breakdown && (
                        <div className="flex flex-col gap-1.5 opacity-80">
                            <div className="flex items-center gap-2 text-xs text-gray-500" title="Pontos por vendas (máx 50)">
                                <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span>
                                Vendas: <span className="font-medium">{breakdown.sales}/50</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-500" title="Pontos por seguidores (máx 50)">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                                Segui.: <span className="font-medium">{breakdown.followers}/50</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* 3. Score Section */}
                <div className="flex items-center gap-4 flex-shrink-0 min-w-[140px] justify-center md:justify-end">
                    <div className="text-right hidden md:block">
                        <p className="text-xs text-gray-400 font-medium uppercase mb-0.5">Trust Score</p>
                        <p className="text-sm font-semibold" style={{ color: colors.text }}>
                            {isTrustworthy ? 'Verificado' : 'Atenção'}
                        </p>
                    </div>

                    <div className="relative w-16 h-16 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90 drop-shadow-sm" viewBox="0 0 36 36">
                            {/* Background Circle */}
                            <path
                                className="text-gray-100"
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                            />
                            {/* Score Circle */}
                            <path
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke={colors.gradient}
                                strokeWidth="3"
                                strokeDasharray={`${score}, 100`}
                                strokeLinecap="round"
                                className="transition-all duration-1000 ease-out"
                            />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center flex-col">
                            <span className="text-xl font-bold" style={{ color: '#1F2937' }}>{score}</span>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}

export default SellerCard;
