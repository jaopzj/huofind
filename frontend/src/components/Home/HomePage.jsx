import { motion } from 'framer-motion';
import { useNavigate, useOutletContext } from 'react-router-dom';
import HeroHome from './HeroHome';
import BannerCarousel from './BannerCarousel';
import ForYouSection from './ForYouSection';
import ExploreSection from './ExploreSection';
import CategoryProductSection from './CategoryProductSection';
import ResourcesRow from './ResourcesRow';
import InstitutionalSection from './InstitutionalSection';

/**
 * HomePage — Main container for the Evo Society Console home.
 *
 * Layout order (top → bottom):
 *   1. Welcome header + command-bar search  (HeroHome)
 *   2. Editorial banner carousel            (BannerCarousel — admin-managed)
 *   3. Explore categories                   (ExploreSection)
 *   4. Personalized "Para você"            (ForYouSection)
 *   5. Trending by category                 (CategoryProductSection × 2)
 *   6. Platform resources                   (ResourcesRow)
 *   7. Institutional value props            (InstitutionalSection)
 *
 * Redundant sidebar shortcuts (QuickAccess) have been intentionally removed.
 */
function HomePage() {
    const ctx = useOutletContext();
    const navigate = useNavigate();
    const savedProducts = ctx?.savedProducts || [];
    const isGuest = ctx?.isGuest || false;
    const user = ctx?.user || null;

    const handleSearch = (query) => {
        sessionStorage.setItem('yupoo_search_query', query);
        navigate(`/yupoo?q=${encodeURIComponent(query)}`);
    };

    const handleCategoryClick = (categoryId) => {
        // Pass filter via URL query string — survives reloads and is linkable.
        // We also keep sessionStorage as a defensive fallback for older code paths.
        sessionStorage.setItem('yupoo_category_filter', categoryId);
        navigate(`/yupoo?category=${encodeURIComponent(categoryId)}`);
    };

    return (
        <motion.div
            className="home-shell"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
        >
            {/* 1. Welcome + search */}
            <HeroHome onSearch={handleSearch} isGuest={isGuest} user={user} />

            {/* Main content container */}
            <div className="home-container">
                {/* 2. Banner carousel — admin-managed */}
                <BannerCarousel />

                {/* 3. Explore by category */}
                <ExploreSection onCategoryClick={handleCategoryClick} />

                {/* 4. Personalized suggestions */}
                <ForYouSection savedProducts={savedProducts} />

                {/* 5. Trending carousels */}
                <CategoryProductSection
                    categoryId="calcados"
                    title="Tendências em Calçados"
                    subtitle="Os tênis e sapatos mais populares do catálogo"
                />
                <CategoryProductSection
                    categoryId="camisetas"
                    title="Tendências em Camisetas"
                    subtitle="Destaques da semana selecionados para você"
                />

                {/* 6. Platform resources */}
                <ResourcesRow />

                {/* 7. Institutional */}
                <InstitutionalSection />

                <div className="h-12" />
            </div>
        </motion.div>
    );
}

export default HomePage;
