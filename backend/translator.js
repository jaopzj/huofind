import translate from 'translate';

// Configura engine para Google (gratuito)
translate.engine = 'google';

// ============================================
// CACHE LRU COM TTL
// ============================================

const CACHE_MAX_SIZE = 10000;
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

/**
 * Cache LRU simples com TTL.
 * - get() retorna undefined se expirado ou inexistente
 * - set() evicta a entrada mais antiga quando atinge CACHE_MAX_SIZE
 */
class TranslationCache {
    constructor(maxSize = CACHE_MAX_SIZE, ttlMs = CACHE_TTL_MS) {
        this.maxSize = maxSize;
        this.ttlMs = ttlMs;
        this.cache = new Map(); // key → { value, createdAt }
    }

    get(key) {
        const entry = this.cache.get(key);
        if (!entry) return undefined;

        if (Date.now() - entry.createdAt > this.ttlMs) {
            this.cache.delete(key);
            return undefined;
        }

        // Move para o final (mais recente) — LRU refresh
        this.cache.delete(key);
        this.cache.set(key, entry);
        return entry.value;
    }

    set(key, value) {
        // Se já existe, remove para reinserir no final
        if (this.cache.has(key)) {
            this.cache.delete(key);
        }

        // Evicção LRU: remove as mais antigas até caber
        while (this.cache.size >= this.maxSize) {
            const oldest = this.cache.keys().next().value;
            this.cache.delete(oldest);
        }

        this.cache.set(key, { value, createdAt: Date.now() });
    }

    get size() {
        return this.cache.size;
    }

    get stats() {
        return { size: this.cache.size, maxSize: this.maxSize };
    }
}

const translationCache = new TranslationCache();

// Métricas simples
let cacheHits = 0;
let cacheMisses = 0;
let skippedTechnical = 0;

// ============================================
// TERMOS TÉCNICOS QUE NÃO PRECISAM TRADUÇÃO
// ============================================

/**
 * Padrões que indicam texto predominantemente técnico/ocidental
 * que não precisa de tradução (marcas, modelos, especificações).
 */
const TECHNICAL_PATTERNS = [
    // Modelos de celular
    /^iPhone\s*\d/i,
    /^iPad\s*(Pro|Air|mini)/i,
    /^MacBook/i,
    /^AirPods/i,
    /^Apple\s*Watch/i,
    /^Samsung\s*Galaxy/i,
    /^Huawei\s*(P|Mate|Nova)/i,
    /^Xiaomi\s*(Mi|Redmi|POCO)/i,
    /^OPPO\s/i,
    /^vivo\s/i,
    /^OnePlus/i,
    /^Google\s*Pixel/i,
    /^Sony\s*(Xperia|PlayStation|PS[45])/i,
    /^Nintendo\s*Switch/i,
    /^Xbox/i,
    // Marcas de tech
    /^(Dyson|Bose|JBL|Canon|Nikon|DJI|GoPro)\s/i,
];

/**
 * Verifica se o texto é predominantemente técnico/ocidental
 * e não precisa de tradução.
 * Um texto é considerado técnico se:
 * - Começa com um padrão técnico conhecido, OU
 * - Contém menos de 20% de caracteres CJK (é quase todo em inglês/números)
 */
function isTechnicalText(text) {
    if (!text) return false;

    // Checa padrões conhecidos
    for (const pattern of TECHNICAL_PATTERNS) {
        if (pattern.test(text)) return true;
    }

    // Conta caracteres CJK vs total de letras/dígitos
    const cjkChars = (text.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) || []).length;
    const totalChars = text.replace(/\s/g, '').length;

    if (totalChars === 0) return true;

    // Se menos de 20% é CJK, considerar técnico
    return cjkChars / totalChars < 0.2;
}

// ============================================
// TRADUÇÃO COM CACHE
// ============================================

/**
 * Traduz uma lista de produtos do chinês para português.
 * - Cache LRU com TTL de 7 dias (até 10k entradas)
 * - Skip automático para termos técnicos
 * - Deduplicação dentro do batch (traduz textos únicos, reutiliza)
 * - Processamento paralelo em lotes
 */
export async function translateProducts(products) {
    if (!products || products.length === 0) {
        return products;
    }

    console.log(`[Translator] Iniciando tradução de ${products.length} produtos...`);
    const startTime = Date.now();
    const batchCacheHitsBefore = cacheHits;

    // ========================================
    // FASE 1: Deduplicação + cache lookup
    // Agrupa todos os nomes únicos que realmente precisam de tradução
    // ========================================
    const translationMap = new Map(); // texto_original → tradução (preenchido progressivamente)

    for (const product of products) {
        const name = product.name;
        if (!name || translationMap.has(name)) continue;

        // 1. Cache hit?
        const cached = translationCache.get(name);
        if (cached !== undefined) {
            translationMap.set(name, cached);
            cacheHits++;
            continue;
        }

        // 2. Texto técnico que não precisa de tradução?
        if (isTechnicalText(name)) {
            translationMap.set(name, name);
            translationCache.set(name, name);
            skippedTechnical++;
            continue;
        }

        // 3. Precisa traduzir — marcar como pendente
        translationMap.set(name, null); // null = pendente
        cacheMisses++;
    }

    // ========================================
    // FASE 2: Traduzir somente os textos pendentes (null)
    // ========================================
    const pendingTexts = [...translationMap.entries()]
        .filter(([, v]) => v === null)
        .map(([k]) => k);

    if (pendingTexts.length > 0) {
        console.log(`[Translator] ${translationMap.size} textos únicos: ${translationMap.size - pendingTexts.length} do cache, ${pendingTexts.length} para traduzir`);

        const BATCH_SIZE = 15;
        const batches = [];
        for (let i = 0; i < pendingTexts.length; i += BATCH_SIZE) {
            batches.push(pendingTexts.slice(i, i + BATCH_SIZE));
        }

        for (const batch of batches) {
            const batchPromises = batch.map(async (text) => {
                try {
                    const translated = await translateWithRetry(text);
                    return { text, translated };
                } catch (error) {
                    console.error(`[Translator] Falha: ${text.slice(0, 30)}... (${error.message})`);
                    return { text, translated: text }; // fallback: texto original
                }
            });

            const results = await Promise.all(batchPromises);
            for (const { text, translated } of results) {
                translationMap.set(text, translated);
                translationCache.set(text, translated);
            }

            // Delay entre batches para evitar rate limiting
            if (batches.indexOf(batch) < batches.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
    }

    // ========================================
    // FASE 3: Montar resultado final
    // ========================================
    const translatedProducts = products.map(product => ({
        ...product,
        nameOriginal: product.name,
        nameTranslated: translationMap.get(product.name) || product.name
    }));

    const elapsed = Date.now() - startTime;
    const batchHits = cacheHits - batchCacheHitsBefore;
    console.log(
        `[Translator] Concluído em ${elapsed}ms` +
        ` | ${products.length} produtos, ${pendingTexts.length} traduções novas` +
        ` | ${batchHits} cache hits neste batch` +
        ` | Cache: ${translationCache.size}/${CACHE_MAX_SIZE}`
    );

    return translatedProducts;
}

/**
 * Traduz um único texto (com cache)
 */
export async function translateText(text, from = 'zh', to = 'pt') {
    if (!text) return text;

    const cached = translationCache.get(text);
    if (cached !== undefined) return cached;

    if (isTechnicalText(text)) return text;

    try {
        const result = await translate(text, { from, to });
        translationCache.set(text, result);
        return result;
    } catch (error) {
        console.error('Translation error:', error.message);
        return text;
    }
}

/**
 * Retorna estatísticas do cache de tradução
 */
export function getTranslationStats() {
    return {
        cacheSize: translationCache.size,
        cacheMaxSize: CACHE_MAX_SIZE,
        cacheTtlDays: CACHE_TTL_MS / (24 * 60 * 60 * 1000),
        cacheHits,
        cacheMisses,
        skippedTechnical,
        hitRate: cacheHits + cacheMisses > 0
            ? Math.round((cacheHits / (cacheHits + cacheMisses)) * 100)
            : 0
    };
}

// ============================================
// HELPER INTERNO
// ============================================

async function translateWithRetry(text, retries = 3) {
    const timeout = (ms) => new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), ms)
    );

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const translationPromise = translate(text, { from: 'zh', to: 'pt' });
            return await Promise.race([translationPromise, timeout(3000)]);
        } catch (error) {
            if (attempt === retries) throw error;
            await new Promise(resolve => setTimeout(resolve, attempt * 200));
        }
    }
}
