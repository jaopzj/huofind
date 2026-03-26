import { motion } from 'framer-motion';
import { useNavigate, useOutletContext } from 'react-router-dom';
import HeroHome from './HeroHome';
import QuickAccess from './QuickAccess';
import ForYouSection from './ForYouSection';
import ExploreSection from './ExploreSection';
import InstitutionalSection from './InstitutionalSection';
import CategoryProductSection from './CategoryProductSection';
import { resolvePagePath } from '../../utils/routes';

/**
 * HomePage - Main container for the Home page
 * Combines all sections into a cohesive landing experience
 */
function HomePage() {
    const ctx = useOutletContext();
    const navigate = useNavigate();
    const savedProducts = ctx?.savedProducts || [];
    const isGuest = ctx?.isGuest || false;

    const handleSearch = (query) => {
        sessionStorage.setItem('yupoo_search_query', query);
        navigate('/yupoo');
    };

    const handleNavigate = (pageId) => {
        navigate(resolvePagePath(pageId));
    };

    const handleCategoryClick = (categoryId) => {
        sessionStorage.setItem('yupoo_category_filter', categoryId);
        navigate('/yupoo');
    };

    return (
        <motion.div
            className="w-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
        >
            {/* Hero Section - Logo + Search */}
            <HeroHome onSearch={handleSearch} isGuest={isGuest} />

            {/* Content Container */}
            <div className="max-w-5xl mx-auto px-4 md:px-6">
                {/* Quick Access Buttons */}
                <QuickAccess onNavigate={handleNavigate} />

                {/* For You Section - Personalized Suggestions */}
                <ForYouSection savedProducts={savedProducts} />

                {/* Calçados Section - 10 random shoe products */}
                <CategoryProductSection
                    categoryId="calcados"
                    title="Calçados"
                    subtitle="Confira os tênis e sapatos mais populares"
                    icon="👟"
                />

                {/* Camisetas Section - 10 random t-shirt products */}
                <CategoryProductSection
                    categoryId="camisetas"
                    title="Camisetas"
                    subtitle="As melhores camisetas para você"
                    icon="👕"
                />

                {/* Explore Section - Categories */}
                <ExploreSection onCategoryClick={handleCategoryClick} />

                {/* Institutional Section - Value Props */}
                <InstitutionalSection />

                {/* Bottom Spacing */}
                <div className="h-8" />
            </div>
        </motion.div>
    );
}

export default HomePage;
