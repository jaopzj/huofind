import { useState, useEffect } from 'react';
import { FiCopy, FiCheck, FiUsers, FiGift, FiLink } from 'react-icons/fi';

/**
 * ReferralSection - Display referral code and stats on Profile page
 */
function ReferralSection() {
    const [refCode, setRefCode] = useState(null);
    const [stats, setStats] = useState({ totalReferred: 0, completedPurchases: 0, totalCreditsEarned: 0 });
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState(null);

    const token = localStorage.getItem('accessToken');

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch user's referral code
                const codeRes = await fetch('/api/referral/my-code', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (codeRes.ok) {
                    const codeData = await codeRes.json();
                    setRefCode(codeData.refCode);
                }

                // Fetch referral stats
                const statsRes = await fetch('/api/referral/stats', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (statsRes.ok) {
                    const statsData = await statsRes.json();
                    setStats(statsData);
                }
            } catch (err) {
                console.error('[ReferralSection] Error:', err);
                setError('Erro ao carregar dados');
            } finally {
                setLoading(false);
            }
        };

        if (token) {
            fetchData();
        }
    }, [token]);

    const handleCopyMessage = () => {
        const baseUrl = window.location.origin;
        const refLink = `${baseUrl}/?ref=${refCode}`;
        const message = `🔥 Junte-se ao EvoSociety e ganhe 15% de desconto na primeira compra + 10 créditos bônus!\n\nUse meu link de convite:\n${refLink}`;

        navigator.clipboard.writeText(message);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (loading) {
        return (
            <div className="bg-[#1f2937] rounded-xl p-6 border border-white/5">
                <div className="animate-pulse flex flex-col gap-4">
                    <div className="h-6 bg-white/10 rounded w-1/3"></div>
                    <div className="h-12 bg-white/10 rounded"></div>
                    <div className="h-20 bg-white/10 rounded"></div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-[#1f2937] rounded-xl p-6 border border-red-500/20">
                <p className="text-red-400 text-sm">{error}</p>
            </div>
        );
    }

    return (
        <div className="bg-[#1f2937] rounded-xl p-6 border border-white/5">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <FiUsers className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-white">Sistema de Afiliados</h3>
                    <p className="text-sm text-gray-400">Convide amigos e ganhe créditos</p>
                </div>
            </div>

            {/* Referral Code Display */}
            <div className="bg-white/5 rounded-xl p-4 mb-6">
                <p className="text-xs text-gray-400 mb-2 uppercase tracking-wider">Seu código de referência</p>
                <div className="flex items-center gap-3">
                    <span className="text-2xl font-mono font-bold text-white tracking-widest">
                        {refCode || '-------'}
                    </span>
                </div>
            </div>

            {/* Copy Button */}
            <button
                onClick={handleCopyMessage}
                disabled={!refCode}
                className="w-full py-3 px-4 rounded-xl font-semibold text-white text-sm transition-all duration-200 flex items-center justify-center gap-2 mb-6"
                style={{
                    background: copied ? '#10b981' : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    opacity: refCode ? 1 : 0.5,
                    cursor: refCode ? 'pointer' : 'not-allowed'
                }}
            >
                {copied ? (
                    <>
                        <FiCheck className="w-4 h-4" />
                        Mensagem copiada!
                    </>
                ) : (
                    <>
                        <FiCopy className="w-4 h-4" />
                        Copiar mensagem de convite
                    </>
                )}
            </button>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-white/5 rounded-lg p-3 text-center">
                    <div className="flex items-center justify-center gap-1.5 mb-1">
                        <FiLink className="w-3.5 h-3.5 text-blue-400" />
                        <span className="text-xs text-gray-400">Convidados</span>
                    </div>
                    <p className="text-xl font-bold text-white">{stats.totalReferred}</p>
                </div>
                <div className="bg-white/5 rounded-lg p-3 text-center">
                    <div className="flex items-center justify-center gap-1.5 mb-1">
                        <FiCheck className="w-3.5 h-3.5 text-green-400" />
                        <span className="text-xs text-gray-400">Ativos</span>
                    </div>
                    <p className="text-xl font-bold text-white">{stats.completedPurchases}</p>
                </div>
                <div className="bg-white/5 rounded-lg p-3 text-center">
                    <div className="flex items-center justify-center gap-1.5 mb-1">
                        <FiGift className="w-3.5 h-3.5 text-yellow-400" />
                        <span className="text-xs text-gray-400">Créditos</span>
                    </div>
                    <p className="text-xl font-bold text-white">{stats.totalCreditsEarned}</p>
                </div>
            </div>

            {/* Info */}
            <div className="mt-6 p-3 bg-blue-500/5 rounded-lg border border-blue-500/10">
                <p className="text-xs text-blue-300">
                    <strong>Como funciona:</strong> Quando um amigo se cadastra pelo seu link e faz sua primeira assinatura,
                    você ganha <strong>15 créditos</strong> e ele ganha <strong>15% de desconto + 10 créditos</strong>!
                </p>
            </div>
        </div>
    );
}

export default ReferralSection;
