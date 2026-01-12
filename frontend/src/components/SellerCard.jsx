/**
 * SellerCard - Componente visual premium para exibir pontuação de confiança do vendedor
 * Layout adaptável:
 * - variant="full": Layout expandido para lista de resultados (3 colunas, glassmorphism)
 * - variant="compact": Layout condesado para Hero section (2 colunas, mais limpo)
 */
function SellerCard({ sellerInfo, variant = 'full' }) {
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

    const isTrustworthy = score >= 60;
    const isCompact = variant === 'compact';

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
            className={`w-full mb-8 relative overflow-hidden rounded-2xl transition-all duration-300 hover:shadow-lg ${isCompact ? '' : 'border border-white/50'}`}
            style={{
                background: isCompact ? 'white' : 'rgba(255, 255, 255, 0.95)',
                backdropFilter: isCompact ? 'none' : 'blur(10px)',
                boxShadow: 'var(--shadow-soft)',
            }}
        >
            {/* Background Decoration (Only in full mode) */}
            {!isCompact && (
                <div
                    className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10 pointer-events-none"
                    style={{
                        background: `radial-gradient(circle, ${colors.gradient} 0%, transparent 70%)`,
                        transform: 'translate(30%, -30%)'
                    }}
                />
            )}

            <div className={`flex flex-col md:flex-row items-center justify-between ${isCompact ? 'p-5 gap-4' : 'p-6 gap-6'} relative z-10`}>

                {/* 1. Profile Section */}
                <div className={`flex items-center ${isCompact ? 'gap-4 w-full md:w-auto' : 'gap-5 flex-1 min-w-0'}`}>
                    <div className="relative">
                        {avatar ? (
                            <img
                                src={avatar}
                                alt={nickname}
                                className={`${isCompact ? 'w-16 h-16' : 'w-20 h-20'} rounded-2xl object-cover shadow-sm`}
                                style={{ border: '3px solid white' }}
                            />
                        ) : (
                            <div
                                className={`${isCompact ? 'w-16 h-16' : 'w-20 h-20'} rounded-2xl flex items-center justify-center shadow-sm`}
                                style={{
                                    background: 'linear-gradient(135deg, #FF9A76 0%, #FF6B35 100%)',
                                    border: '3px solid white'
                                }}
                            >
                                <span className={isCompact ? 'text-2xl' : 'text-3xl'}>👤</span>
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

                    <div className="min-w-0 flex-1">
                        <h2 className={`${isCompact ? 'text-lg' : 'text-xl'} font-bold truncate mb-1`} style={{ color: '#1F2937' }}>
                            {nickname || 'Vendedor do Xianyu'}
                        </h2>
                        <div className="flex items-center gap-2 flex-wrap">
                            <span
                                className={`px-2.5 py-0.5 rounded-md text-xs font-medium flex items-center gap-1.5`}
                                style={{ background: colors.bg, color: colors.text }}
                            >
                                {classificationIcon} {classification}
                            </span>
                            {monthsActiveFormatted && !isCompact && (
                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    {monthsActiveFormatted}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* 2. Metrics Section - Simplified for Compact */}
                <div className={`flex items-center ${isCompact ? 'gap-6 w-full justify-around bg-gray-50 p-3 rounded-xl' : 'gap-8 px-6 md:border-l md:border-r border-gray-100 flex-shrink-0'}`}>
                    <div className="text-center">
                        <p className={`${isCompact ? 'text-xl' : 'text-2xl'} font-bold`} style={{ color: '#1F2937' }}>
                            {salesCountFormatted || '0'}
                        </p>
                        <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Produtos</p>
                    </div>

                    <div className="text-center">
                        <p className={`${isCompact ? 'text-xl' : 'text-2xl'} font-bold`} style={{ color: '#1F2937' }}>
                            {followersFormatted || '0'}
                        </p>
                        <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Seguidores</p>
                    </div>

                    {!isCompact && breakdown && (
                        <div className="flex flex-col gap-1.5 opacity-80">
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span>
                                Produtos: <span className="font-medium">{breakdown.sales}/50</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                                Segui.: <span className="font-medium">{breakdown.followers}/50</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* 3. Score Section */}
                {!isCompact && (
                    <div className="flex items-center gap-4 flex-shrink-0 min-w-[140px] justify-center md:justify-end">
                        <div className="text-right hidden md:block">
                            <p className="text-xs text-gray-400 font-medium uppercase mb-0.5">Trust Score</p>
                            <p className="text-sm font-semibold" style={{ color: colors.text }}>
                                {isTrustworthy ? 'Verificado' : 'Cuidado'}
                            </p>
                        </div>

                        <div className="relative w-16 h-16 flex items-center justify-center">
                            <svg className="w-full h-full transform -rotate-90 drop-shadow-sm" viewBox="0 0 36 36">
                                <path
                                    className="text-gray-100"
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="3"
                                />
                                <path
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    fill="none"
                                    stroke={colors.gradient}
                                    strokeWidth="3"
                                    strokeDasharray={`${score}, 100`}
                                    strokeLinecap="round"
                                />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center flex-col">
                                <span className="text-xl font-bold" style={{ color: '#1F2937' }}>{score}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Score badge for compact mode */}
                {isCompact && (
                    <div
                        className="absolute top-4 right-4 flex items-center justify-center w-10 h-10 rounded-full"
                        style={{ border: `2px solid ${colors.gradient}` }}
                    >
                        <span className="text-sm font-bold" style={{ color: colors.text }}>{score}</span>
                    </div>
                )}

            </div>
        </div>
    );
}

export default SellerCard;
