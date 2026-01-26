import { motion } from 'framer-motion';
import CategoryCard from './CategoryCard';

/**
 * ExploreSection - Category exploration grid
 * Allows users to discover products by category
 */

const CATEGORIES = [
    { id: 'camisetas', name: 'Camisetas', icon: '👕' },
    { id: 'calcados', name: 'Calçados', icon: '👟' },
    { id: 'moletons', name: 'Moletons', icon: '🧥' },
    { id: 'calcas', name: 'Calças', icon: '👖' }
];

function ExploreSection({ onCategoryClick }) {
    const handleCategoryClick = (category) => {
        if (onCategoryClick) {
            onCategoryClick(category.id);
        }
    };

    return (
        <section className="py-8">
            {/* Header */}
            <motion.div
                className="mb-6"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
            >
                <h2 className="text-lg font-bold text-gray-800">Explorar</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                    Descubra produtos por categoria
                </p>
            </motion.div>

            {/* Category Grid */}
            <motion.div
                className="grid grid-cols-2 md:grid-cols-4 gap-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.1 }}
            >
                {CATEGORIES.map((category, index) => (
                    <motion.div
                        key={category.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: index * 0.05 }}
                    >
                        <CategoryCard
                            category={category}
                            onClick={handleCategoryClick}
                        />
                    </motion.div>
                ))}
            </motion.div>
        </section>
    );
}

export default ExploreSection;
