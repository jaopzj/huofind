import { useState, useEffect } from 'react';
import ProductCarousel from './ProductCarousel';

/**
 * CategoryProductSection - Shows random products from a specific category
 * Reuses ProductCarousel for consistent display
 */
function CategoryProductSection({
    categoryId,
    title,
    subtitle,
    icon
}) {
    const [products, setProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Helper to get product image URL
    const getProductImage = (p) => {
        return p.image || p.imagem || p.product_image || null;
    };

    // Category name mapping (ID to Portuguese name in data)
    const categoryNameMap = {
        'calcados': 'Calçados',
        'camisetas': 'Camisetas',
        'moletons': 'Moletons',
        'calcas': 'Calças',
        'roupas': 'Roupas'
    };

    // Fetch products for the specific category
    useEffect(() => {
        const fetchProducts = async () => {
            setIsLoading(true);
            try {
                const manifestRes = await fetch('/data/yupoo/manifest.json');
                if (!manifestRes.ok) {
                    setIsLoading(false);
                    return;
                }

                const fileList = await manifestRes.json();

                // Load all files to find category products
                const promises = fileList.map(file =>
                    fetch(`/data/yupoo/${file}`).then(res => res.json())
                );

                const results = await Promise.all(promises);
                let allProducts = [];

                results.forEach(data => {
                    if (data.products && Array.isArray(data.products)) {
                        allProducts = [...allProducts, ...data.products];
                    }
                });

                // Filter by category and must have image
                const categoryName = categoryNameMap[categoryId] || categoryId;
                const categoryProducts = allProducts.filter(p =>
                    p.categoria === categoryName && getProductImage(p)
                );

                // Shuffle and take 10
                const shuffled = [...categoryProducts].sort(() => 0.5 - Math.random());
                setProducts(shuffled.slice(0, 10));
            } catch (err) {
                console.error(`[CategoryProductSection] Error fetching ${categoryId}:`, err);
                setProducts([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchProducts();
    }, [categoryId]);

    // Don't render if no products (after loading)
    if (!isLoading && products.length === 0) {
        return null;
    }

    return (
        <section className="py-6">
            <ProductCarousel
                title={icon ? `${icon} ${title}` : title}
                subtitle={subtitle}
                products={products}
                isLoading={isLoading}
            />
        </section>
    );
}

export default CategoryProductSection;
