import { useState, useEffect } from 'react';
import ProductCarousel from './ProductCarousel';

/**
 * ForYouSection - Personalized suggestions section
 * Uses ProductCarousel component for display
 */
function ForYouSection({ savedProducts = [] }) {
    const [suggestions, setSuggestions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [hasPersonalized, setHasPersonalized] = useState(false);

    // Helper to get product image URL
    const getProductImage = (p) => {
        return p.image || p.imagem || p.product_image || null;
    };

    // Fetch suggestions from local Yupoo data
    useEffect(() => {
        const fetchSuggestions = async () => {
            setIsLoading(true);
            try {
                const manifestRes = await fetch('/data/yupoo/manifest.json');
                if (!manifestRes.ok) {
                    console.error('[ForYouSection] Failed to load manifest');
                    setIsLoading(false);
                    return;
                }

                const fileList = await manifestRes.json();

                // Load first 3 files for suggestions
                const filesToLoad = fileList.slice(0, 3);
                const promises = filesToLoad.map(file =>
                    fetch(`/data/yupoo/${file}`).then(res => res.json())
                );

                const results = await Promise.all(promises);
                let allProducts = [];

                results.forEach(data => {
                    if (data.products && Array.isArray(data.products)) {
                        allProducts = [...allProducts, ...data.products];
                    }
                });

                // Filter products with images
                const withImages = allProducts.filter(p => getProductImage(p));

                // If user has saved Yupoo products, try to get related ones
                const yupooSaved = savedProducts.filter(p => p.platform === 'yupoo');

                if (yupooSaved.length > 0) {
                    const savedCategories = [...new Set(yupooSaved.map(p => p.category).filter(Boolean))];

                    if (savedCategories.length > 0) {
                        const related = withImages.filter(p =>
                            savedCategories.includes(p.categoria)
                        );

                        if (related.length >= 6) {
                            const shuffled = related.sort(() => 0.5 - Math.random());
                            setSuggestions(shuffled.slice(0, 10));
                            setHasPersonalized(true);
                        } else {
                            getRandomProducts(withImages);
                        }
                    } else {
                        getRandomProducts(withImages);
                    }
                } else {
                    getRandomProducts(withImages);
                }
            } catch (err) {
                console.error('[ForYouSection] Error fetching suggestions:', err);
                setSuggestions([]);
            } finally {
                setIsLoading(false);
            }
        };

        const getRandomProducts = (products) => {
            const shuffled = [...products].sort(() => 0.5 - Math.random());
            setSuggestions(shuffled.slice(0, 10));
            setHasPersonalized(false);
        };

        fetchSuggestions();
    }, [savedProducts]);

    return (
        <section className="py-6">
            <ProductCarousel
                title={hasPersonalized ? 'Para você' : 'Sugestões para você'}
                subtitle={!hasPersonalized && savedProducts.length === 0
                    ? 'Salve produtos para ver sugestões personalizadas'
                    : 'Produtos que você pode gostar'
                }
                products={suggestions}
                isLoading={isLoading}
            />
        </section>
    );
}

export default ForYouSection;
