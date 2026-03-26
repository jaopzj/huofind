import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SavedProductsPage from './SavedProducts/SavedProductsPage';
import SavedSellersPanel from './SavedSellersPanel';

/**
 * SavedPage - Unified "Salvos" page combining Products and Sellers
 * with internal sub-tabs for switching between sections.
 */
function SavedPage({
    // Products props
    products = [],
    collections = [],
    collectionIcons = [],
    collectionColors = [],
    onCreateCollection,
    onUpdateCollection,
    onDeleteCollection,
    onMoveProductToCollection,
    onRemoveProduct,
    // Sellers props
    tier,
    tierLimits,
    onSelectSeller,
}) {
    const [activeSection, setActiveSection] = useState('products'); // 'products' | 'sellers'

    const tabs = [
        { id: 'products', label: 'Produtos', icon: '📦', count: products.length },
        { id: 'sellers', label: 'Vendedores', icon: '🏪' },
    ];

    return (
        <div className="w-full max-w-7xl mx-auto px-4 md:px-8 py-6">
            {/* Header */}
            <div className="mb-6">
                <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white">
                    Salvos
                </h2>
                <p className="text-gray-400 text-sm mt-1">
                    Gerencie seus produtos e vendedores favoritos
                </p>
            </div>

            {/* Sub-tabs */}
            <div className="flex gap-2 mb-6 p-1 bg-[#1f2937]/75 rounded-xl border border-white/10 w-fit">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveSection(tab.id)}
                        className="relative px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200"
                        style={{
                            color: activeSection === tab.id ? 'white' : 'rgba(255,255,255,0.5)',
                        }}
                    >
                        {/* Active background pill */}
                        {activeSection === tab.id && (
                            <motion.div
                                layoutId="saved-tab-indicator"
                                className="absolute inset-0 bg-blue-500/20 border border-blue-500/30 rounded-lg"
                                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                            />
                        )}
                        <span className="relative z-10 flex items-center gap-2">
                            <span>{tab.icon}</span>
                            <span>{tab.label}</span>
                            {tab.count !== undefined && (
                                <span
                                    className="px-1.5 py-0.5 rounded-md text-[10px] font-bold"
                                    style={{
                                        background: activeSection === tab.id ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.1)',
                                        color: activeSection === tab.id ? '#93c5fd' : 'rgba(255,255,255,0.4)',
                                    }}
                                >
                                    {tab.count}
                                </span>
                            )}
                        </span>
                    </button>
                ))}
            </div>

            {/* Content */}
            <AnimatePresence mode="wait">
                {activeSection === 'products' && (
                    <motion.div
                        key="products"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2 }}
                    >
                        <SavedProductsPage
                            products={products}
                            collections={collections}
                            collectionIcons={collectionIcons}
                            collectionColors={collectionColors}
                            onCreateCollection={onCreateCollection}
                            onUpdateCollection={onUpdateCollection}
                            onDeleteCollection={onDeleteCollection}
                            onMoveProductToCollection={onMoveProductToCollection}
                            onRemoveProduct={onRemoveProduct}
                        />
                    </motion.div>
                )}

                {activeSection === 'sellers' && (
                    <motion.div
                        key="sellers"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2 }}
                    >
                        <section className="bg-[#1f2937] p-6 md:p-10 rounded-[2rem] shadow-xl border border-white/5">
                            <SavedSellersPanel
                                tier={tier}
                                tierLimits={tierLimits}
                                onSelectSeller={onSelectSeller}
                            />
                        </section>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default SavedPage;
