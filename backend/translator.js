import translate from 'translate';

// Configura engine para Google (gratuito)
translate.engine = 'google';

/**
 * Traduz uma lista de produtos do chinês para português
 * OTIMIZADO: Usa processamento paralelo em lotes com timeout e retry para evitar atrasos
 */
export async function translateProducts(products) {
    if (!products || products.length === 0) {
        return products;
    }

    console.log(`[Translator] Iniciando tradução de ${products.length} produtos...`);
    const startTime = Date.now();

    // Configuração de batches para paralelização
    const BATCH_SIZE = 15; // Increased slightly for more parallelism
    const batches = [];

    for (let i = 0; i < products.length; i += BATCH_SIZE) {
        batches.push(products.slice(i, i + BATCH_SIZE));
    }

    const translatedProducts = [];

    // Função auxiliar com timeout e retry
    const translateWithRetry = async (text, retries = 3) => {
        const timeout = (ms) => new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms));

        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                // Tenta traduzir com timeout de 3 segundos
                const translationPromise = translate(text, { from: 'zh', to: 'pt' });
                return await Promise.race([translationPromise, timeout(3000)]);
            } catch (error) {
                if (attempt === retries) throw error;
                // Espera um pouco antes de tentar novamente (backoff básico)
                await new Promise(resolve => setTimeout(resolve, attempt * 200));
            }
        }
    };

    for (const batch of batches) {
        const batchPromises = batch.map(async (product) => {
            try {
                const translated = await translateWithRetry(product.name);
                return {
                    ...product,
                    nameOriginal: product.name,
                    nameTranslated: translated
                };
            } catch (error) {
                // Em caso de erro persistente ou timeout, mantém o nome original
                console.error(`[Translator] Falha após retentativas: ${product.name?.slice(0, 30)}... (${error.message})`);
                return {
                    ...product,
                    nameOriginal: product.name,
                    nameTranslated: product.name // fallback
                };
            }
        });

        const batchResults = await Promise.all(batchPromises);
        translatedProducts.push(...batchResults);

        // Pequeno delay entre batches para evitar rate limiting agressivo
        if (batches.indexOf(batch) < batches.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    const elapsed = Date.now() - startTime;
    console.log(`[Translator] Tradução concluída em ${elapsed}ms (${Math.round(elapsed / products.length)}ms/produto)`);

    return translatedProducts;
}

/**
 * Traduz um único texto
 */
export async function translateText(text, from = 'zh', to = 'pt') {
    try {
        return await translate(text, { from, to });
    } catch (error) {
        console.error('Translation error:', error.message);
        return text;
    }
}
