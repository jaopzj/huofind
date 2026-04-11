import { motion } from 'framer-motion';
import CategoryCard from './CategoryCard';
import {
    TShirtIcon,
    SneakerIcon,
    HoodieIcon,
    PantsIcon,
} from './CategoryIcons';

/**
 * ExploreSection — Category exploration grid.
 * Uses custom outline SVGs in place of emojis for a professional look.
 */

const CATEGORIES = [
    {
        id: 'calcados',
        name: 'Calçados',
        description: 'Tênis, esportivos e casuais',
        Icon: SneakerIcon,
        tint: '#60A5FA',
    },
    {
        id: 'camisetas',
        name: 'Camisetas',
        description: 'Básicas, streetwear e coleções',
        Icon: TShirtIcon,
        tint: '#A78BFA',
    },
    {
        id: 'moletons',
        name: 'Moletons',
        description: 'Hoodies, crewnecks e sobretudos',
        Icon: HoodieIcon,
        tint: '#F472B6',
    },
    {
        id: 'calcas',
        name: 'Calças',
        description: 'Jeans, cargo e moletom',
        Icon: PantsIcon,
        tint: '#34D399',
    },
];

function ExploreSection({ onCategoryClick }) {
    const handleCategoryClick = (category) => {
        if (onCategoryClick) onCategoryClick(category.id);
    };

    return (
        <section className="home-section explore-section">
            <motion.div
                className="section-head"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
            >
                <span className="section-eyebrow">Categorias</span>
                <h2 className="section-title">Explore o catálogo</h2>
                <p className="section-subtitle">
                    Navegue pelos principais segmentos do Yupoo em um clique.
                </p>
            </motion.div>

            <motion.div
                className="explore-grid"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.08 }}
            >
                {CATEGORIES.map((category, index) => (
                    <motion.div
                        key={category.id}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.04 * index }}
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
