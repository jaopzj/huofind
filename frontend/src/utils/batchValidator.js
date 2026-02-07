/**
 * Batch Validator Utility
 * 
 * Verifica se um produto do Yupoo possui a batch recomendada
 * com base no ID do produto (extraído do título) e um mapeamento
 * de batches recomendadas.
 */

/**
 * Regex para extrair IDs de produtos do título
 * Formatos suportados:
 * - 【HQ8487-100】 - formato padrão com hífen
 * - 【CD0881-103】 - outro formato comum
 * - 【FV5029-500】 - etc.
 */
const ID_PATTERN = /【([A-Z0-9]+-[A-Z0-9]+)】/gi;

/**
 * Extrai todos os IDs de um título de produto
 * @param {string} titulo - Título do produto
 * @returns {string[]} - Array de IDs encontrados (uppercase)
 */
export function extractProductIds(titulo) {
    if (!titulo) return [];

    const matches = [];
    let match;

    // Reset lastIndex para garantir que começamos do início
    ID_PATTERN.lastIndex = 0;

    while ((match = ID_PATTERN.exec(titulo)) !== null) {
        matches.push(match[1].toUpperCase());
    }

    return matches;
}

/**
 * Verifica se o produto possui a batch recomendada para seu modelo
 * @param {Object} product - Objeto do produto com titulo e batch
 * @param {Object} batchMap - Mapeamento ID -> Batch recomendada
 * @returns {{ isRecommended: boolean, productId: string | null }} 
 */
export function checkRecommendedBatch(product, batchMap) {
    if (!product || !batchMap) {
        return { isRecommended: false, productId: null };
    }

    const productBatch = product.batch?.toUpperCase()?.trim();
    if (!productBatch) {
        return { isRecommended: false, productId: null };
    }

    // Extrai todos os IDs do título
    const ids = extractProductIds(product.titulo);

    // Verifica cada ID encontrado
    for (const id of ids) {
        const recommendedBatch = batchMap[id]?.toUpperCase()?.trim();

        if (recommendedBatch && productBatch === recommendedBatch) {
            return { isRecommended: true, productId: id };
        }
    }

    return { isRecommended: false, productId: ids[0] || null };
}

/**
 * Cria uma versão normalizada do mapa de batches para lookup rápido
 * Converte todas as chaves e valores para uppercase
 * @param {Object} rawBatchMap - Mapa original de batches
 * @returns {Object} - Mapa normalizado
 */
export function normalizeBatchMap(rawBatchMap) {
    if (!rawBatchMap) return {};

    const normalized = {};

    for (const [key, value] of Object.entries(rawBatchMap)) {
        // Ignora chaves que começam com underscore (metadados)
        if (key.startsWith('_')) continue;

        normalized[key.toUpperCase().trim()] = value.toUpperCase().trim();
    }

    return normalized;
}

/**
 * Hook-ready function para verificar batch recomendada
 * Usa memoização implícita através do useMemo do React
 */
export function isRecommendedBatch(product, normalizedBatchMap) {
    return checkRecommendedBatch(product, normalizedBatchMap).isRecommended;
}

export default {
    extractProductIds,
    checkRecommendedBatch,
    normalizeBatchMap,
    isRecommendedBatch
};
