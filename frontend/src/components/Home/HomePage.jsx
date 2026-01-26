import { motion } from 'framer-motion';
import HeroHome from './HeroHome';
import QuickAccess from './QuickAccess';
import ForYouSection from './ForYouSection';
import ExploreSection from './ExploreSection';
import InstitutionalSection from './InstitutionalSection';
import CategoryProductSection from './CategoryProductSection';

/**
 * HomePage - Main container for the Home page
 * Combines all sections into a cohesive landing experience
 */
function HomePage({
    savedProducts = [],
    onNavigate,
    onSearch,
    onCategoryClick,
    isLoading = false,
    isGuest = false
}) {
    // Handle search from hero
    const handleSearch = (query) => {
        if (onSearch) {
            onSearch(query);
        }
    };

    // Handle navigation from quick access
    const handleNavigate = (pageId) => {
        if (onNavigate) {
            onNavigate(pageId);
        }
    };

    // Handle category click from explore section
    const handleCategoryClick = (categoryId) => {
        if (onCategoryClick) {
            onCategoryClick(categoryId);
        } else if (onNavigate) {
            // Default: navigate to yupoo-search with category filter
            onNavigate('yupoo-search', { category: categoryId });
        }
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-500 font-medium">Carregando...</p>
                </div>
            </div>
        );
    }

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
