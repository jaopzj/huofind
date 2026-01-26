import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SavedProductsHeader from './SavedProductsHeader';
import PlatformTabs from './PlatformTabs';
import CollectionsPanel from './CollectionsPanel';
import CollectionModal from './CollectionModal';
import SavedProductCard from './SavedProductCard';

/**
 * SavedProductsPage - Main page component for saved products management
 * 
 * Features:
 * - Platform filtering (Todos, Yupoo, Xianyu)
 * - Collection/folder organization
 * - Search functionality
 * - Responsive grid layout
 */
function SavedProductsPage({
    products = [],
    collections = [],
    collectionIcons = [],
    collectionColors = [],
    onCreateCollection,
    onUpdateCollection,
    onDeleteCollection,
    onMoveProductToCollection,
    onRemoveProduct,
    isLoading = false
}) {
    // State
    const [activeTab, setActiveTab] = useState('all'); // 'all' | 'yupoo' | 'xianyu'
    const [activeCollectionId, setActiveCollectionId] = useState(null); // null = all products
    const [searchQuery, setSearchQuery] = useState('');
    const [isCollectionModalOpen, setIsCollectionModalOpen] = useState(false);
    const [editingCollection, setEditingCollection] = useState(null);
    const [moveModalProduct, setMoveModalProduct] = useState(null);

    // Platform counts
    const platformCounts = useMemo(() => {
        return {
            all: products.length,
            yupoo: products.filter(p => p.platform === 'yupoo').length,
            xianyu: products.filter(p => p.platform === 'xianyu').length
        };
    }, [products]);

    // Filtered products based on tab, collection, and search
    const filteredProducts = useMemo(() => {
        let result = [...products];

        // Filter by platform
        if (activeTab !== 'all') {
            result = result.filter(p => p.platform === activeTab);
        }

        // Filter by collection
        if (activeCollectionId !== null) {
            result = result.filter(p => p.collection_id === activeCollectionId);
        }

        // Filter by search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            result = result.filter(p =>
                (p.product_title?.toLowerCase() || '').includes(query) ||
                (p.seller_name?.toLowerCase() || '').includes(query)
            );
        }

        return result;
    }, [products, activeTab, activeCollectionId, searchQuery]);

    // Handlers
    const handleOpenCreateModal = () => {
        setEditingCollection(null);
        setIsCollectionModalOpen(true);
    };

    const handleOpenEditModal = (collection) => {
        setEditingCollection(collection);
        setIsCollectionModalOpen(true);
    };

    const handleSaveCollection = async (data) => {
        if (editingCollection) {
            await onUpdateCollection(editingCollection.id, data);
        } else {
            await onCreateCollection(data);
        }
        setIsCollectionModalOpen(false);
        setEditingCollection(null);
    };

    const handleDeleteCollection = async (collectionId) => {
        if (activeCollectionId === collectionId) {
            setActiveCollectionId(null);
        }
        await onDeleteCollection(collectionId);
    };

    const handleMoveProduct = async (productId, collectionId) => {
        await onMoveProductToCollection(productId, collectionId);
        setMoveModalProduct(null);
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="w-full max-w-7xl mx-auto px-4 md:px-8 py-6">
                <div className="animate-pulse space-y-6">
                    <div className="h-10 bg-gray-200 rounded-xl w-1/3" />
                    <div className="h-12 bg-gray-200 rounded-xl" />
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="aspect-square bg-gray-200 rounded-2xl" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-7xl mx-auto px-4 md:px-8 py-6">
            {/* Header */}
            <SavedProductsHeader
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                productCount={products.length}
            />

            {/* Platform Tabs */}
            <PlatformTabs
                activeTab={activeTab}
                onTabChange={setActiveTab}
                counts={platformCounts}
            />

            {/* Main Content Area */}
            <div className="flex flex-col lg:flex-row gap-6 mt-6">
                {/* Collections Sidebar */}
                <div className="w-full lg:w-64 flex-shrink-0">
                    <CollectionsPanel
                        collections={collections}
                        activeCollectionId={activeCollectionId}
                        onSelectCollection={setActiveCollectionId}
                        onCreate={handleOpenCreateModal}
                        onEdit={handleOpenEditModal}
                        onDelete={handleDeleteCollection}
                    />
                </div>

                {/* Products Grid */}
                <div className="flex-1 min-w-0">
                    <AnimatePresence mode="wait">
                        {filteredProducts.length > 0 ? (
                            <motion.div
                                key="products-grid"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                            >
                                {filteredProducts.map((product, index) => (
                                    <motion.div
                                        key={product.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: Math.min(index * 0.05, 0.3) }}
                                    >
                                        <SavedProductCard
                                            product={product}
                                            collections={collections}
                                            onRemove={() => onRemoveProduct(product.id)}
                                            onMoveToCollection={(collectionId) => handleMoveProduct(product.id, collectionId)}
                                            onOpenMoveModal={() => setMoveModalProduct(product)}
                                        />
                                    </motion.div>
                                ))}
                            </motion.div>
                        ) : (
                            <motion.div
                                key="empty-state"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="bg-gray-50 p-12 rounded-3xl border border-dashed border-gray-200 text-center"
                            >
                                <span className="text-5xl block mb-4">
                                    {searchQuery ? '🔍' : activeCollectionId ? '📁' : '📦'}
                                </span>
                                <p className="text-gray-500 font-medium">
                                    {searchQuery
                                        ? 'Nenhum produto encontrado para esta busca.'
                                        : activeCollectionId
                                            ? 'Esta coleção está vazia.'
                                            : 'Você ainda não salvou nenhum produto.'}
                                </p>
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="mt-4 px-4 py-2 text-sm font-medium text-orange-600 hover:text-orange-700 transition-colors"
                                    >
                                        Limpar busca
                                    </button>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Collection Modal */}
            <CollectionModal
                isOpen={isCollectionModalOpen}
                onClose={() => {
                    setIsCollectionModalOpen(false);
                    setEditingCollection(null);
                }}
                onSave={handleSaveCollection}
                collection={editingCollection}
                icons={collectionIcons}
                colors={collectionColors}
            />

            {/* Move Product Modal */}
            <AnimatePresence>
                {moveModalProduct && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
                        onClick={() => setMoveModalProduct(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl"
                        >
                            <h3 className="text-lg font-bold text-gray-900 mb-4">
                                Mover para coleção
                            </h3>
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                <button
                                    onClick={() => handleMoveProduct(moveModalProduct.id, null)}
                                    className={`w-full text-left px-4 py-3 rounded-xl transition-colors ${!moveModalProduct.collection_id
                                            ? 'bg-orange-50 text-orange-600 border border-orange-200'
                                            : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                                        }`}
                                >
                                    <span className="mr-2">📦</span>
                                    Sem coleção
                                </button>
                                {collections.map(collection => (
                                    <button
                                        key={collection.id}
                                        onClick={() => handleMoveProduct(moveModalProduct.id, collection.id)}
                                        className={`w-full text-left px-4 py-3 rounded-xl transition-colors ${moveModalProduct.collection_id === collection.id
                                                ? 'bg-orange-50 text-orange-600 border border-orange-200'
                                                : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                                            }`}
                                    >
                                        <span className="mr-2">{getCollectionEmoji(collection.icon)}</span>
                                        {collection.name}
                                    </button>
                                ))}
                            </div>
                            <button
                                onClick={() => setMoveModalProduct(null)}
                                className="w-full mt-4 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
                            >
                                Cancelar
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// Helper function for collection icons
function getCollectionEmoji(icon) {
    const iconMap = {
        folder: '📁',
        heart: '❤️',
        star: '⭐',
        box: '📦',
        tag: '🏷️',
        'shopping-bag': '🛍️',
        gift: '🎁',
        bookmark: '🔖',
        archive: '📚',
        package: '📮'
    };
    return iconMap[icon] || '📁';
}

export default SavedProductsPage;
export { getCollectionEmoji };
