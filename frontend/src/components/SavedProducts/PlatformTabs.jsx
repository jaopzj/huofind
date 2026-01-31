import { motion } from 'framer-motion';

/**
 * PlatformTabs - Tabs to filter products by platform
 */
function PlatformTabs({ activeTab, onTabChange, counts }) {
    const tabs = [
        { id: 'all', label: 'Todos', count: counts.all },
        { id: 'yupoo', label: 'Yupoo', count: counts.yupoo, color: 'green' },
        { id: 'xianyu', label: 'Xianyu', count: counts.xianyu, color: 'yellow' }
    ];

    return (
        <div className="flex gap-2 p-1 bg-[#1f2937]/80 backdrop-blur-md rounded-xl border border-white/5 w-fit">
            {tabs.map(tab => (
                <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={`relative px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${activeTab === tab.id
                        ? 'text-white'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                >
                    {/* Active Background */}
                    {activeTab === tab.id && (
                        <motion.div
                            layoutId="activeTab"
                            className="absolute inset-0 bg-blue-600 rounded-lg shadow-lg shadow-blue-600/20"
                            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        />
                    )}

                    {/* Tab Content */}
                    <span className="relative flex items-center gap-2">
                        {/* Platform Icon */}
                        {tab.id === 'yupoo' && (
                            <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: '#22c55e' }}
                            />
                        )}
                        {tab.id === 'xianyu' && (
                            <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: '#eab308' }}
                            />
                        )}

                        {tab.label}

                        {/* Count Badge */}
                        <span
                            className={`px-1.5 py-0.5 text-[10px] rounded-full font-bold ${activeTab === tab.id
                                ? 'bg-white/20 text-white'
                                : 'bg-white/5 text-gray-500'
                                }`}
                        >
                            {tab.count}
                        </span>
                    </span>
                </button>
            ))}
        </div>
    );
}

export default PlatformTabs;
