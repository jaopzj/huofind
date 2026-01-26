import { motion } from 'framer-motion';
import { LuSearch, LuPickaxe, LuPackage, LuUsers } from 'react-icons/lu';

/**
 * QuickAccess - Grid of quick access buttons for main features
 */

const QUICK_ACCESS_ITEMS = [
    {
        id: 'yupoo-search',
        label: 'Buscar Yupoo',
        description: 'Busque no catálogo Yupoo',
        icon: LuSearch,
        color: '#22c55e', // green
        bgColor: 'rgba(34, 197, 94, 0.1)'
    },
    {
        id: 'xianyu-mining',
        label: 'Minerar Xianyu',
        description: 'Minere produtos do Xianyu',
        icon: LuPickaxe,
        color: '#f59e0b', // amber
        bgColor: 'rgba(245, 158, 11, 0.1)'
    },
    {
        id: 'products',
        label: 'Produtos Salvos',
        description: 'Seus produtos favoritos',
        icon: LuPackage,
        color: '#3b82f6', // blue
        bgColor: 'rgba(59, 130, 246, 0.1)'
    },
    {
        id: 'sellers',
        label: 'Vendedores Salvos',
        description: 'Seus vendedores favoritos',
        icon: LuUsers,
        color: '#8b5cf6', // purple
        bgColor: 'rgba(139, 92, 246, 0.1)'
    }
];

function QuickAccessCard({ item, onClick, index }) {
    const Icon = item.icon;

    return (
        <motion.button
            onClick={() => onClick(item.id)}
            className="feature-card flex flex-col items-start gap-3 p-5 text-left w-full"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
            whileHover={{ y: -4, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}
            whileTap={{ scale: 0.98 }}
        >
            {/* Icon Container */}
            <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: item.bgColor }}
            >
                <Icon size={20} style={{ color: item.color }} />
            </div>

            {/* Text */}
            <div>
                <h3 className="font-semibold text-gray-800 text-sm">
                    {item.label}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                    {item.description}
                </p>
            </div>
        </motion.button>
    );
}

function QuickAccess({ onNavigate }) {
    return (
        <section className="py-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {QUICK_ACCESS_ITEMS.map((item, index) => (
                    <QuickAccessCard
                        key={item.id}
                        item={item}
                        onClick={onNavigate}
                        index={index}
                    />
                ))}
            </div>
        </section>
    );
}

export default QuickAccess;
