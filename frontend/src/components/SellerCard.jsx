/**
 * SellerCard - Componente minimalista para exibir pontuação de confiança do vendedor
 */
function SellerCard({ sellerInfo }) {
    if (!sellerInfo) return null;

    const {
        avatar,
        nickname,
        score,
        classification,
        classificationColor,
        classificationIcon,
        isTrustworthy,
        followersFormatted,
        salesFormatted,
        followers,
        salesCount,
        breakdown
    } = sellerInfo;

    // Cores baseadas na classificação
    const colorMap = {
        green: { gradient: '#10B981', text: '#047857', bg: 'rgba(16, 185, 129, 0.1)' },
        blue: { gradient: '#3B82F6', text: '#1D4ED8', bg: 'rgba(59, 130, 246, 0.1)' },
        yellow: { gradient: '#F59E0B', text: '#D97706', bg: 'rgba(245, 158, 11, 0.1)' },
        orange: { gradient: '#FF6B35', text: '#E55A2B', bg: 'rgba(255, 107, 53, 0.1)' },
        red: { gradient: '#EF4444', text: '#DC2626', bg: 'rgba(239, 68, 68, 0.1)' }
    };

    const colors = colorMap[classificationColor] || colorMap.orange;

    return (
        <div className="seller-card-new max-w-2xl mx-auto mb-8">
            <div className="flex items-center justify-between gap-6">
                {/* Left: Avatar + Info */}
                <div className="flex items-center gap-4">
                    {avatar ? (
                        <img
                            src={avatar}
                            alt={nickname}
                            className="w-14 h-14 rounded-2xl object-cover"
                            style={{ border: '2px solid var(--color-cream-200)' }}
                        />
                    ) : (
                        <div
                            className="w-14 h-14 rounded-2xl flex items-center justify-center"
                            style={{ background: 'linear-gradient(135deg, #FF8C5A 0%, #FF6B35 100%)' }}
                        >
                            <span className="text-2xl">👤</span>
                        </div>
                    )}
                    <div>
                        <h3 className="font-semibold text-lg" style={{ color: '#1F2937' }}>
                            {nickname || 'Vendedor'}
                        </h3>
                        <p className="text-sm font-medium" style={{ color: colors.text }}>
                            {classificationIcon} {classification}
                        </p>
                    </div>
                </div>

                {/* Right: Score Circle */}
                <div className="flex flex-col items-center gap-2">
                    <div
                        className="score-circle"
                        style={{
                            background: `conic-gradient(${colors.gradient} ${score * 3.6}deg, #F3F4F6 0deg)`
                        }}
                    >
                        <div className="score-circle-inner" style={{ boxShadow: 'var(--shadow-soft)' }}>
                            <span className="text-xl font-bold" style={{ color: '#1F2937' }}>{score}</span>
                        </div>
                    </div>
                    {isTrustworthy && (
                        <span className="badge badge-success text-xs">
                            ✓ Confiável
                        </span>
                    )}
                </div>
            </div>

            {/* Metrics */}
            <div
                className="flex items-center justify-center gap-8 mt-6 pt-6"
                style={{ borderTop: '1px solid var(--color-cream-200)' }}
            >
                <div className="text-center">
                    <p className="text-2xl font-bold" style={{ color: '#1F2937' }}>{salesFormatted || salesCount || '0'}</p>
                    <p className="text-xs uppercase tracking-wide" style={{ color: '#6B7280' }}>Vendas</p>
                </div>
                <div className="h-10" style={{ width: '1px', background: 'var(--color-cream-200)' }}></div>
                <div className="text-center">
                    <p className="text-2xl font-bold" style={{ color: '#1F2937' }}>{followersFormatted || followers || '0'}</p>
                    <p className="text-xs uppercase tracking-wide" style={{ color: '#6B7280' }}>Seguidores</p>
                </div>
            </div>

            {/* Score Breakdown */}
            {breakdown && (
                <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--color-cream-200)' }}>
                    <p className="text-xs uppercase tracking-wide mb-2" style={{ color: '#9CA3AF' }}>Pontuação</p>
                    <div className="flex flex-wrap gap-2">
                        <span
                            className="badge"
                            style={{ background: colors.bg, color: colors.text }}
                        >
                            👥 {breakdown.followers}/50
                        </span>
                        <span
                            className="badge"
                            style={{ background: colors.bg, color: colors.text }}
                        >
                            📦 {breakdown.sales}/50
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}

export default SellerCard;
