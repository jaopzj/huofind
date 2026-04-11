import { motion } from 'framer-motion';
import { LuArrowUpRight } from 'react-icons/lu';

/**
 * CategoryCard — professional category tile used in ExploreSection.
 * Expects category = { id, name, description, Icon, tint }.
 */
function CategoryCard({ category, onClick }) {
    const Icon = category.Icon;

    const handleClick = () => {
        if (onClick) onClick(category);
    };

    return (
        <motion.button
            type="button"
            onClick={handleClick}
            className="category-card"
            style={{ '--tint': category.tint }}
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.98 }}
        >
            <div className="category-card-top">
                <div className="category-card-icon">
                    {Icon ? <Icon /> : null}
                </div>
                <LuArrowUpRight size={16} className="category-card-arrow" />
            </div>

            <div className="category-card-body">
                <h3 className="category-card-name">{category.name}</h3>
                {category.description && (
                    <p className="category-card-description">
                        {category.description}
                    </p>
                )}
            </div>
        </motion.button>
    );
}

export default CategoryCard;
