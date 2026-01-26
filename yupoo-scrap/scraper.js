const axios = require('axios');
const cheerio = require('cheerio');

// Configurações
const CONFIG = {
    minDelay: 200,    // Delay mínimo entre batches (ms)
    maxDelay: 500,    // Delay máximo entre batches (ms)
    maxRetries: 3,    // Número máximo de tentativas por página
    concurrency: 10,   // Número de páginas para buscar em paralelo
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

/**
 * Gera um delay aleatório entre min e max ms
 */
function randomDelay(min = CONFIG.minDelay, max = CONFIG.maxDelay) {
    return new Promise(resolve =>
        setTimeout(resolve, Math.floor(Math.random() * (max - min + 1)) + min)
    );
}

/**
 * Normaliza a URL do vendedor para o formato base
 * @param {string} url - URL do vendedor (pode ter /albums, /categories, etc)
 * @returns {Object} { baseUrl: string, pathType: 'albums' | 'categories' }
 */
function normalizeVendorUrl(url) {
    try {
        const urlObj = new URL(url);
        const baseUrl = urlObj.origin;

        // Detecta se é URL de categories
        const pathType = urlObj.pathname.includes('categories') ? 'categories' : 'albums';

        return { baseUrl, pathType };
    } catch (error) {
        throw new Error(`URL inválida: ${url}`);
    }
}

/**
 * Extrai produtos de uma única página
 * @param {string} pageUrl - URL completa da página
 * @returns {Promise<Array>} Array de produtos extraídos
 */
async function scrapePage(pageUrl) {
    const products = [];

    try {
        const response = await axios.get(pageUrl, {
            headers: {
                'User-Agent': CONFIG.userAgent,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            },
            timeout: 30000
        });

        const $ = cheerio.load(response.data);
        const baseUrl = normalizeVendorUrl(pageUrl);

        // Seleciona todos os cards de produtos
        $('a.album__main').each((index, element) => {
            const $el = $(element);

            // Extrai título (do atributo title ou do elemento .album__title)
            const title = $el.attr('title') || $el.find('.album__title').text().trim();

            // Extrai URL do produto (href é relativo)
            let productUrl = $el.attr('href') || '';
            if (productUrl) {
                // Remove parâmetros de query existentes
                productUrl = productUrl.split('?')[0];
                // Converte para URL absoluta
                if (productUrl.startsWith('/')) {
                    productUrl = baseUrl + productUrl;
                }
                // Adiciona ?uid=1 ao final
                productUrl += '?uid=1';
            }

            // Extrai imagem de dentro de .album__imgwrap (usa data-src para lazy loading)
            const imgElement = $el.find('.album__imgwrap img.album__absolute.album__img');
            let image = imgElement.attr('data-src') || imgElement.attr('src') || '';
            if (image) {
                // Adiciona https: se começar com //
                if (image.startsWith('//')) {
                    image = 'https:' + image;
                }
            }

            // Só adiciona se tiver pelo menos título ou URL
            if (title || productUrl) {
                products.push({
                    title: title || 'Sem título',
                    product_url: productUrl,
                    image: image || null
                });
            }
        });

        return products;

    } catch (error) {
        if (error.response?.status === 404) {
            // Página não existe, provavelmente fim da paginação
            return [];
        }
        throw error;
    }
}

/**
 * Verifica se há próxima página
 * @param {string} html - HTML da página atual
 * @param {number} currentPage - Número da página atual
 * @returns {boolean} True se há próxima página
 */
function hasNextPage(html, currentPage) {
    const $ = cheerio.load(html);

    // Verifica se existe link para a próxima página
    const nextPageLink = $(`a[href*="page=${currentPage + 1}"]`);
    if (nextPageLink.length > 0) {
        return true;
    }

    // Verifica se existe botão de próxima página ativo
    const nextButton = $('a.pagination__button').filter((i, el) => {
        return $(el).find('.icon_next').length > 0 ||
            $(el).attr('title')?.toLowerCase().includes('next') ||
            $(el).attr('title')?.toLowerCase().includes('próx') ||
            $(el).attr('title')?.toLowerCase().includes('seguinte');
    });

    return nextButton.length > 0 && !nextButton.hasClass('disabled');
}

/**
 * Faz scraping de uma única página com retry
 * @param {string} pageUrl - URL da página
 * @param {string} baseUrl - URL base do vendedor
 * @param {number} pageNum - Número da página (para log)
 * @returns {Promise<{products: Array, hasNext: boolean, html: string}>}
 */
async function scrapePageWithRetry(pageUrl, baseUrl, pageNum) {
    let retries = 0;

    while (retries < CONFIG.maxRetries) {
        try {
            const response = await axios.get(pageUrl, {
                headers: {
                    'User-Agent': CONFIG.userAgent,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Connection': 'keep-alive'
                },
                timeout: 30000
            });

            const $ = cheerio.load(response.data);
            const pageProducts = [];

            $('a.album__main').each((index, element) => {
                const $el = $(element);
                const title = $el.attr('title') || $el.find('.album__title').text().trim();

                let productUrl = $el.attr('href') || '';
                if (productUrl) {
                    productUrl = productUrl.split('?')[0];
                    if (productUrl.startsWith('/')) {
                        productUrl = baseUrl + productUrl;
                    }
                    productUrl += '?uid=1';
                }

                const imgElement = $el.find('.album__imgwrap img.album__absolute.album__img');
                let image = imgElement.attr('data-src') || imgElement.attr('src') || '';
                if (image && image.startsWith('//')) {
                    image = 'https:' + image;
                }

                if (title || productUrl) {
                    pageProducts.push({
                        title: title || 'Sem título',
                        product_url: productUrl,
                        image: image || null
                    });
                }
            });

            return {
                products: pageProducts,
                hasNext: hasNextPage(response.data, pageNum),
                html: response.data
            };

        } catch (error) {
            retries++;
            if (retries >= CONFIG.maxRetries) {
                console.error(`[Scraper] Página ${pageNum} falhou após ${CONFIG.maxRetries} tentativas`);
                return { products: [], hasNext: false, html: '' };
            }
            await randomDelay(1000, 2000);
        }
    }
    return { products: [], hasNext: false, html: '' };
}

/**
 * Faz scraping completo de um vendedor Yupoo (PARALELO)
 * @param {string} vendorUrl - URL do vendedor
 * @param {function} onProgress - Callback de progresso (opcional)
 * @returns {Promise<Object>} Objeto com dados do scraping
 */
async function scrapeVendor(vendorUrl, onProgress = null) {
    const { baseUrl, pathType } = normalizeVendorUrl(vendorUrl);
    const allProducts = [];
    let currentPage = 1;
    let hasMore = true;
    let totalPages = 0;

    console.log(`[Scraper] Iniciando scraping PARALELO de: ${baseUrl}/${pathType} (concorrência: ${CONFIG.concurrency})`);

    while (hasMore) {
        // Cria batch de páginas para buscar em paralelo
        const batch = [];
        for (let i = 0; i < CONFIG.concurrency && hasMore; i++) {
            const pageNum = currentPage + i;
            const pageUrl = `${baseUrl}/${pathType}?page=${pageNum}`;
            batch.push({ pageUrl, pageNum });
        }

        console.log(`[Scraper] Buscando páginas ${batch[0].pageNum} a ${batch[batch.length - 1].pageNum} em paralelo...`);

        if (onProgress) {
            onProgress({ page: currentPage, products: allProducts.length });
        }

        // Executa todas as requisições do batch em paralelo
        const results = await Promise.all(
            batch.map(({ pageUrl, pageNum }) => scrapePageWithRetry(pageUrl, baseUrl, pageNum))
        );

        // Processa resultados na ordem correta
        let foundEmptyPage = false;
        for (let i = 0; i < results.length; i++) {
            const result = results[i];
            const pageNum = batch[i].pageNum;

            if (result.products.length === 0) {
                console.log(`[Scraper] Página ${pageNum}: 0 produtos (fim da paginação)`);
                foundEmptyPage = true;
                hasMore = false;
                break;
            }

            console.log(`[Scraper] Página ${pageNum}: ${result.products.length} produtos`);
            allProducts.push(...result.products);
            totalPages = pageNum;

            // Verifica se é a última página do batch e se há mais
            if (i === results.length - 1 && !result.hasNext) {
                hasMore = false;
                console.log(`[Scraper] Fim da paginação após página ${pageNum}`);
            }
        }

        if (hasMore) {
            currentPage += CONFIG.concurrency;
            // Pequeno delay entre batches
            await randomDelay();
        }
    }

    const result = {
        vendor: {
            url: baseUrl
        },
        scraped_at: new Date().toISOString(),
        total_products: allProducts.length,
        total_pages: totalPages,
        products: allProducts
    };

    console.log(`[Scraper] Scraping completo: ${allProducts.length} produtos em ${totalPages} páginas`);

    return result;
}

module.exports = {
    scrapeVendor,
    scrapePage,
    normalizeVendorUrl,
    CONFIG
};
