import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getCollectionEmoji } from './SavedProductsPage';

/**
 * CollectionsPanel - Sidebar panel for collections management
 */
function CollectionsPanel({
    collections = [],
    activeCollectionId,
    onSelectCollection,
    onCreate,
    onEdit,
    onDelete
}) {
    const [menuOpenId, setMenuOpenId] = useState(null);

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                    Coleções
                </h3>
                <button
                    onClick={onCreate}
                    className="p-1.5 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100 transition-colors"
                    title="Nova coleção"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                </button>
            </div>

            {/* All Products Option */}
            <button
                onClick={() => onSelectCollection(null)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${activeCollectionId === null
                        ? 'bg-orange-50 text-orange-700 font-semibold'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
            >
                <span className="text-lg">📦</span>
                <span className="flex-1 text-sm">Todos os produtos</span>
            </button>

            {/* Collections List */}
            <div className="mt-2 space-y-1">
                {collections.map(collection => (
                    <div key={collection.id} className="relative group">
                        <button
                            onClick={() => onSelectCollection(collection.id)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${activeCollectionId === collection.id
                                    ? 'bg-orange-50 text-orange-700 font-semibold'
                                    : 'text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            <span
                                className="w-7 h-7 rounded-lg flex items-center justify-center text-sm"
                                style={{
                                    backgroundColor: getColorBg(collection.color),
                                    color: getColorText(collection.color)
                                }}
                            >
                                {getCollectionEmoji(collection.icon)}
                            </span>
                            <span className="flex-1 text-sm truncate">{collection.name}</span>
                            <span className="text-xs text-gray-400">
                                {collection.productCount || 0}
                            </span>
                        </button>

                        {/* Actions Menu Button */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setMenuOpenId(menuOpenId === collection.id ? null : collection.id);
                            }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-gray-100 transition-all"
                        >
                            <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                                <circle cx="12" cy="5" r="2" />
                                <circle cx="12" cy="12" r="2" />
                                <circle cx="12" cy="19" r="2" />
                            </svg>
                        </button>

                        {/* Actions Dropdown */}
                        <AnimatePresence>
                            {menuOpenId === collection.id && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: -5 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: -5 }}
                                    className="absolute right-0 top-full mt-1 z-10 bg-white rounded-xl shadow-lg border border-gray-100 py-1 w-32"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <button
                                        onClick={() => {
                                            onEdit(collection);
                                            setMenuOpenId(null);
                                        }}
                                        className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                    >
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                        Editar
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (confirm('Tem certeza que deseja excluir esta coleção? Os produtos serão mantidos.')) {
                                                onDelete(collection.id);
                                            }
                                            setMenuOpenId(null);
                                        }}
                                        className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                    >
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                        Excluir
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                ))}

                {collections.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-4">
                        Nenhuma coleção criada
                    </p>
                )}
            </div>

            {/* Create Collection CTA */}
            <button
                onClick={onCreate}
                className="w-full mt-4 py-2.5 px-3 rounded-xl border-2 border-dashed border-gray-200 text-sm text-gray-500 hover:border-orange-300 hover:text-orange-600 transition-colors flex items-center justify-center gap-2"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Nova coleção
            </button>
        </div>
    );
}

// Color helpers
function getColorBg(color) {
    const colors = {
        orange: 'rgba(255, 107, 53, 0.1)',
        blue: 'rgba(59, 130, 246, 0.1)',
        green: 'rgba(34, 197, 94, 0.1)',
        purple: 'rgba(139, 92, 246, 0.1)',
        pink: 'rgba(236, 72, 153, 0.1)',
        red: 'rgba(239, 68, 68, 0.1)',
        yellow: 'rgba(234, 179, 8, 0.1)',
        gray: 'rgba(107, 114, 128, 0.1)'
    };
    return colors[color] || colors.orange;
}

function getColorText(color) {
    const colors = {
        orange: '#ea580c',
        blue: '#2563eb',
        green: '#16a34a',
        purple: '#7c3aed',
        pink: '#db2777',
        red: '#dc2626',
        yellow: '#ca8a04',
        gray: '#4b5563'
    };
    return colors[color] || colors.orange;
}

export default CollectionsPanel;
