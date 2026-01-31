import { motion } from 'framer-motion';

/**
 * CategoryCard - Explore category card for navigation
 */
function CategoryCard({ category, onClick }) {
    const handleClick = () => {
        if (onClick) {
            onClick(category);
        }
    };

    return (
        <motion.button
            onClick={handleClick}
            className="feature-card flex flex-col items-center justify-center gap-3 p-6 w-full"
            whileHover={{ y: -4, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}
            whileTap={{ scale: 0.98 }}
        >
            {/* Icon */}
            <span className="text-4xl">{category.icon}</span>

            {/* Name */}
            <span className="font-semibold text-white text-sm">
                {category.name}
            </span>
        </motion.button>
    );
}

export default CategoryCard;
