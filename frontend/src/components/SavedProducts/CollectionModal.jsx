import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Default icons and colors
const DEFAULT_ICONS = [
    { id: 'folder', emoji: '📁', label: 'Pasta' },
    { id: 'heart', emoji: '❤️', label: 'Favoritos' },
    { id: 'star', emoji: '⭐', label: 'Destaque' },
    { id: 'box', emoji: '📦', label: 'Caixa' },
    { id: 'tag', emoji: '🏷️', label: 'Tag' },
    { id: 'shopping-bag', emoji: '🛍️', label: 'Compras' },
    { id: 'gift', emoji: '🎁', label: 'Presente' },
    { id: 'bookmark', emoji: '🔖', label: 'Marcador' },
    { id: 'archive', emoji: '📚', label: 'Arquivo' },
    { id: 'package', emoji: '📮', label: 'Pacote' }
];

const DEFAULT_COLORS = [
    { id: 'blue', hex: '#3b82f6', label: 'Azul' },
    { id: 'orange', hex: '#f97316', label: 'Laranja' },
    { id: 'green', hex: '#22c55e', label: 'Verde' },
    { id: 'purple', hex: '#8b5cf6', label: 'Roxo' },
    { id: 'pink', hex: '#ec4899', label: 'Rosa' },
    { id: 'red', hex: '#ef4444', label: 'Vermelho' },
    { id: 'yellow', hex: '#eab308', label: 'Amarelo' },
    { id: 'gray', hex: '#6b7280', label: 'Cinza' }
];

/**
 * CollectionModal - Modal for creating/editing collections
 */
function CollectionModal({
    isOpen,
    onClose,
    onSave,
    collection = null,
    icons = [],
    colors = []
}) {
    const [name, setName] = useState('');
    const [selectedIcon, setSelectedIcon] = useState('folder');
    const [selectedColor, setSelectedColor] = useState('blue');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    // Use provided icons/colors or defaults
    const iconOptions = icons.length > 0
        ? DEFAULT_ICONS.filter(i => icons.includes(i.id))
        : DEFAULT_ICONS;

    const colorOptions = colors.length > 0
        ? DEFAULT_COLORS.filter(c => colors.includes(c.id))
        : DEFAULT_COLORS;

    // Reset form when modal opens/closes or collection changes
    useEffect(() => {
        if (isOpen) {
            if (collection) {
                setName(collection.name || '');
                setSelectedIcon(collection.icon || 'folder');
                setSelectedColor(collection.color || 'blue');
            } else {
                setName('');
                setSelectedIcon('folder');
                setSelectedColor('blue');
            }
            setError('');
        }
    }, [isOpen, collection]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!name.trim()) {
            setError('Nome é obrigatório');
            return;
        }

        if (name.trim().length > 50) {
            setError('Nome deve ter no máximo 50 caracteres');
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            await onSave({
                name: name.trim(),
                icon: selectedIcon,
                color: selectedColor
            });
        } catch (err) {
            setError(err.message || 'Erro ao salvar coleção');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        onClick={e => e.stopPropagation()}
                        className="bg-[#1f2937] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl"
                    >
                        <h3 className="text-xl font-bold text-white mb-6">
                            {collection ? 'Editar coleção' : 'Nova coleção'}
                        </h3>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Name Input */}
                            <div>
                                <label className="block text-sm font-semibold text-white/90 mb-2">
                                    Nome da coleção
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Ex: Favoritos, Para comprar..."
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    maxLength={50}
                                    autoFocus
                                />
                                <p className="mt-1 text-xs text-gray-500 text-right">
                                    {name.length}/50
                                </p>
                            </div>

                            {/* Icon Selector */}
                            <div>
                                <label className="block text-sm font-semibold text-white/90 mb-2">
                                    Ícone
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {iconOptions.map(icon => (
                                        <button
                                            key={icon.id}
                                            type="button"
                                            onClick={() => setSelectedIcon(icon.id)}
                                            className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all ${selectedIcon === icon.id
                                                ? 'bg-blue-500/20 ring-2 ring-blue-500 shadow-lg shadow-blue-500/10'
                                                : 'bg-white/5 text-white/70 hover:bg-white/10'
                                                }`}
                                            title={icon.label}
                                        >
                                            {icon.emoji}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Color Selector */}
                            <div>
                                <label className="block text-sm font-semibold text-white/90 mb-2">
                                    Cor
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {colorOptions.map(color => (
                                        <button
                                            key={color.id}
                                            type="button"
                                            onClick={() => setSelectedColor(color.id)}
                                            className={`w-8 h-8 rounded-full transition-all ${selectedColor === color.id
                                                ? 'ring-2 ring-offset-2 ring-offset-[#1f2937] ring-white scale-110'
                                                : 'hover:scale-105 opacity-70 hover:opacity-100'
                                                }`}
                                            style={{ backgroundColor: color.hex }}
                                            title={color.label}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Error Message */}
                            {error && (
                                <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">
                                    {error}
                                </p>
                            )}

                            {/* Actions */}
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 px-4 py-3 text-sm font-semibold text-gray-400 bg-white/5 rounded-xl hover:bg-white/10 hover:text-white transition-colors"
                                    disabled={isSubmitting}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 px-4 py-3 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-500 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                            </svg>
                                            Salvando...
                                        </>
                                    ) : (
                                        collection ? 'Salvar alterações' : 'Criar coleção'
                                    )}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export default CollectionModal;
