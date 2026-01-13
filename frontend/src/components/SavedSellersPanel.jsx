import { useState, useEffect } from 'react';

/**
 * SavedSellersPanel - Exibe vendedores salvos para acesso rápido
 * 
 * Props:
 * - onSelectSeller: callback(sellerUrl) quando usuário clica em um vendedor
 */
function SavedSellersPanel({ onSelectSeller }) {
    const [sellers, setSellers] = useState([]);
    const [loading, setLoading] = useState(true);

    // Fetch saved sellers on mount
    useEffect(() => {
        fetchSavedSellers();
    }, []);

    const fetchSavedSellers = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('accessToken');
            if (!token) {
                setLoading(false);
                return;
            }

            const response = await fetch('/api/saved-sellers', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                setLoading(false);
                return;
            }

            const data = await response.json();
            setSellers(data.sellers || []);
        } catch (err) {
            console.error('[SavedSellersPanel] Error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (sellerId, e) => {
        e.stopPropagation();
        if (!confirm('Remover este vendedor salvo?')) return;

        try {
            const token = localStorage.getItem('accessToken');
            await fetch(`/api/saved-sellers/${sellerId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            setSellers(prev => prev.filter(s => s.id !== sellerId));
        } catch (err) {
            alert('Erro ao remover vendedor');
        }
    };

    // Don't show if loading or no sellers
    if (loading) return null;
    if (sellers.length === 0) return null;

    return (
        <div className="mb-6">
            {/* Header */}
            <h3 className="text-sm font-semibold text-gray-600 flex items-center gap-2 mb-3">
                <span>📌</span> Vendedores Salvos
                <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full text-gray-500">
                    {sellers.length}
                </span>
            </h3>

            {/* Sellers List */}
            <div className="flex flex-wrap gap-2">
                {sellers.map(seller => (
                    <div
                        key={seller.id}
                        className="group relative flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-gray-100 hover:border-orange-200 hover:shadow-sm transition-all cursor-pointer"
                        onClick={() => onSelectSeller(seller.seller_url)}
                    >
                        {seller.icon_value === 'PHOTO' && seller.seller_avatar ? (
                            <img src={seller.seller_avatar} alt="" className="w-7 h-7 rounded-lg object-cover" />
                        ) : (
                            <span className="text-lg">{seller.icon_value || '🏪'}</span>
                        )}
                        <span className="text-sm font-medium text-gray-700">{seller.nickname}</span>

                        {/* Delete button (appears on hover) */}
                        <button
                            onClick={(e) => handleDelete(seller.id, e)}
                            className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                        >
                            ✕
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default SavedSellersPanel;
