import { chromium } from 'playwright';
import { extractSellerInfo, calculateTrustScore, formatSellerData } from './sellerAnalyzer.js';

/**
 * Scraper para perfis de vendedores da Goofish
 * Seletores baseados em análise real do DOM:
 * - Cards: a[class^="feeds-item-wrap"] ou [class*="cardWarp"]
 * - Título: div do conteúdo, primeiro span com texto
 * - Preço: span após símbolo ¥
 * - Imagem: primeiro img dentro do card
 */
class GoofishScraper {
    constructor() {
        this.userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0'
        ];
    }

    extractUserId(url) {
        const match = url.match(/userId=(\d+)/);
        return match ? match[1] : null;
    }

    getRandomUserAgent() {
        return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
    }

    async randomDelay(min = 300, max = 600) {
        const delay = Math.floor(Math.random() * (max - min + 1)) + min;
        await new Promise(resolve => setTimeout(resolve, delay));
    }

    /**
     * Scrape products with optional progress callback for real-time updates
     * @param {string} url - Seller profile URL
     * @param {number} limit - Max products to extract
     * @param {Function} onProgress - Optional callback(stage, message, data)
     */
    async scrapeSellerProducts(url, limit = 50, onProgress = null) {
        const emit = (stage, message, data = {}) => {
            console.log(`[Scraper] ${message}`);
            if (onProgress) onProgress(stage, message, data);
        };
        const userId = this.extractUserId(url);
        if (!userId) {
            throw new Error('URL inválida: userId não encontrado');
        }

        emit('connecting', 'Conectando ao vendedor...', { userId });

        // Use local variable to avoid race conditions between concurrent requests
        let browser = null;

        try {
            browser = await chromium.launch({
                headless: true
            });

            const context = await browser.newContext({
                userAgent: this.getRandomUserAgent(),
                viewport: { width: 1920, height: 1080 },
                locale: 'zh-CN',
                timezoneId: 'Asia/Shanghai'
            });

            const page = await context.newPage();

            emit('navigating', 'Navegando para página do vendedor...');
            await page.goto(url, {
                waitUntil: 'networkidle',  // Changed from domcontentloaded to ensure seller data loads
                timeout: 45000
            });

            // Aguarda para garantir que os dados dinâmicos carreguem
            await this.randomDelay(2000, 3000);

            // Extrai informações do vendedor ANTES de scrollar
            emit('verifying', 'Verificando vendedor...');
            let sellerInfo = null;
            let trustResult = null;
            try {
                sellerInfo = await extractSellerInfo(page);
                trustResult = calculateTrustScore(sellerInfo);
                emit('seller_verified', `Vendedor: ${sellerInfo.nickname || userId}`, { score: trustResult.score });
            } catch (sellerError) {
                console.error('[Scraper] Erro ao extrair info do vendedor:', sellerError.message);
            }

            // Tenta aguardar cards específicos
            try {
                await page.waitForSelector('a[class*="feeds-item-wrap"], [class*="cardWarp"], [class*="ItemCard"]', {
                    timeout: 10000
                });
                emit('cards_found', 'Produtos detectados na página!');
            } catch (e) {
                emit('scrolling', 'Carregando mais produtos...');
            }

            // ====================================================
            // SCROLL PROGRESSIVO COM EXTRAÇÃO ACUMULATIVA
            // A página Goofish usa DOM virtualizado - produtos são removidos quando você scrolla longe deles
            // Por isso, extraímos durante o scroll e acumulamos os resultados
            // ====================================================
            emit('scrolling', 'Carregando produtos...');

            const maxScrollAttempts = 50;
            let staleCount = 0;
            const maxStale = 3;

            // Acumula produtos em um Map global (deduplicado por ID)
            const allProducts = new Map();

            // Função de extração que será executada no navegador
            const extractProductsFromPage = async () => {
                return await page.evaluate(() => {
                    const extracted = [];
                    const cards = document.querySelectorAll('a[class*="feeds-item-wrap"], a[class*="cardWarp"], div[class*="feeds-item-wrap"], div[class*="cardWarp"]');

                    cards.forEach(card => {
                        try {
                            const productUrl = card.tagName === 'A' ? card.href : (card.querySelector('a')?.href || '');
                            if (!productUrl.includes('/item')) return;

                            let productId = null;
                            const idMatch = productUrl.match(/id=(\d+)/);
                            if (idMatch) {
                                productId = idMatch[1];
                            } else {
                                const itemIdMatch = productUrl.match(/item\/(\d+)/);
                                if (itemIdMatch) productId = itemIdMatch[1];
                            }

                            if (!productId) return;

                            // Extrai título
                            let title = '';
                            const allSpans = card.querySelectorAll('span');
                            for (const span of allSpans) {
                                const text = span.textContent?.trim();
                                if (text && text.length > 10 && text.length < 300 &&
                                    !text.includes('¥') && !text.match(/^\d+$/) &&
                                    !text.includes('人想要') && !text.includes('人付款')) {
                                    title = text;
                                    break;
                                }
                            }

                            if (!title) {
                                const cardText = card.textContent?.trim();
                                const cleanText = cardText?.replace(/¥[\d,.]+/g, '').replace(/\d+人(想要|付款)/g, '').trim();
                                if (cleanText && cleanText.length > 5) title = cleanText.slice(0, 100);
                            }

                            // Extrai preço
                            let price = 0;
                            const priceNumberSpan = card.querySelector('span[class*="number"], [class*="priceText"]');
                            if (priceNumberSpan) {
                                const priceText = priceNumberSpan.textContent?.replace(/[^\d.]/g, '').trim();
                                if (priceText) price = parseFloat(priceText);
                            }

                            if (!price || price === 0) {
                                const priceWrap = card.querySelector('div[class*="price-wrap"], [class*="priceWrap"], [class*="price-box"]');
                                if (priceWrap) {
                                    const wrapText = priceWrap.textContent?.replace(/[^\d.]/g, '').trim();
                                    if (wrapText) price = parseFloat(wrapText);
                                }
                            }

                            if (!price || price === 0) {
                                const cardText = card.textContent || '';
                                const priceMatch = cardText.match(/¥\s*([\d,.]+)/);
                                if (priceMatch) price = parseFloat(priceMatch[1].replace(',', '.'));
                            }

                            // Extrai imagem - tenta múltiplas estratégias
                            // IMPORTANTE: Goofish usa lazy loading com placeholder 2-2.png
                            let imageUrl = '';

                            // Função para validar se é uma imagem real (não placeholder)
                            const isValidImage = (src) => {
                                if (!src) return false;
                                // Ignora placeholder de 2x2 pixels da Goofish
                                if (src.includes('2-2.png')) return false;
                                if (src.includes('1-1.png')) return false;
                                // Ignora data URIs muito pequenas
                                if (src.startsWith('data:') && src.length < 200) return false;
                                // Deve começar com http ou //
                                return src.startsWith('http') || src.startsWith('//');
                            };

                            const formatImageUrl = (src) => {
                                if (!src) return '';
                                return src.startsWith('//') ? 'https:' + src : src;
                            };

                            // Estratégia 1: Busca img com classe feeds-image (específico da Goofish)
                            const feedsImg = card.querySelector('img[class*="feeds-image"]');
                            if (feedsImg) {
                                const src = feedsImg.src || feedsImg.getAttribute('data-src');
                                if (isValidImage(src)) {
                                    imageUrl = formatImageUrl(src);
                                }
                            }

                            // Estratégia 2: Busca qualquer img com src válido
                            if (!imageUrl) {
                                const imgs = card.querySelectorAll('img');
                                for (const img of imgs) {
                                    const possibleSources = [
                                        img.src,
                                        img.getAttribute('src'),
                                        img.getAttribute('data-src'),
                                        img.getAttribute('data-lazy-src'),
                                        img.getAttribute('data-original')
                                    ];

                                    for (const src of possibleSources) {
                                        if (isValidImage(src)) {
                                            imageUrl = formatImageUrl(src);
                                            break;
                                        }
                                    }
                                    if (imageUrl) break;
                                }
                            }

                            // Estratégia 3: Busca background-image em elementos
                            if (!imageUrl) {
                                const imgContainers = card.querySelectorAll('[class*="img"], [class*="image"], [class*="pic"], [class*="cover"]');
                                for (const container of imgContainers) {
                                    const computedStyle = window.getComputedStyle(container);
                                    const bgImage = computedStyle.backgroundImage;
                                    if (bgImage && bgImage !== 'none') {
                                        const urlMatch = bgImage.match(/url\(['"]?(https?:\/\/[^'")\s]+)['"]?\)/);
                                        if (urlMatch && isValidImage(urlMatch[1])) {
                                            imageUrl = urlMatch[1];
                                            break;
                                        }
                                    }
                                }
                            }

                            if (title || price > 0) {
                                extracted.push({
                                    id: productId,
                                    name: title || `Produto #${productId}`,
                                    price,
                                    priceFormatted: price > 0 ? `¥ ${price}` : '¥ --',
                                    url: productUrl,
                                    images: imageUrl ? [imageUrl] : []
                                });
                            }
                        } catch (err) {
                            // Ignora erros individuais
                        }
                    });

                    return extracted;
                });
            };

            for (let scrollAttempt = 0; scrollAttempt < maxScrollAttempts; scrollAttempt++) {
                // Extrai produtos atualmente visíveis no DOM
                const currentProducts = await extractProductsFromPage();

                // Adiciona ao Map (deduplicado automaticamente pelo ID)
                const previousCount = allProducts.size;
                for (const product of currentProducts) {
                    if (!allProducts.has(product.id)) {
                        allProducts.set(product.id, product);
                    }
                }

                const currentCount = allProducts.size;
                emit('scrolling', `Carregando produtos... (${currentCount} encontrados)`, { count: currentCount });

                // Se já atingiu o limite, para de scrollar
                if (currentCount >= limit) {
                    console.log(`[Scraper] Limite atingido: ${currentCount} >= ${limit}`);
                    break;
                }

                // Se não encontrou novos produtos, incrementa contador de stale
                if (currentCount === previousCount) {
                    staleCount++;
                    if (staleCount >= maxStale) {
                        console.log(`[Scraper] Sem novos produtos após ${maxStale} scrolls, parando`);
                        break;
                    }
                } else {
                    staleCount = 0;
                }

                // Scroll para baixo
                await page.evaluate(() => window.scrollBy(0, window.innerHeight));
                await this.randomDelay(600, 900);
            }

            // Converte Map para array e limita ao número solicitado
            const products = Array.from(allProducts.values()).slice(0, limit);

            emit('products_found', `${products.length} produtos encontrados!`, { count: products.length });

            // Se não encontrou produtos, captura debug
            if (products.length === 0) {
                console.log('[Scraper] Nenhum produto encontrado. Debug info:');

                const debugInfo = await page.evaluate(() => {
                    // Lista todas as classes que contêm 'feeds' ou 'card' ou 'item'
                    const relevantElements = document.querySelectorAll('*[class]');
                    const classes = new Set();
                    relevantElements.forEach(el => {
                        const className = el.className;
                        if (typeof className === 'string' &&
                            (className.includes('feeds') ||
                                className.includes('card') ||
                                className.includes('Card') ||
                                className.includes('item') ||
                                className.includes('Item'))) {
                            classes.add(className.split(' ')[0]);
                        }
                    });
                    return Array.from(classes).slice(0, 30);
                });

                console.log('[Scraper] Classes relevantes:', debugInfo);

                // Conta links de item
                const itemLinksCount = await page.evaluate(() => {
                    return document.querySelectorAll('a[href*="/item"]').length;
                });
                console.log(`[Scraper] Links para /item encontrados: ${itemLinksCount}`);
            }

            await browser.close();

            // Formata dados do vendedor se disponíveis
            const formattedSellerInfo = sellerInfo && trustResult
                ? formatSellerData(sellerInfo, trustResult)
                : null;

            return {
                sellerId: userId,
                sellerInfo: formattedSellerInfo,
                productCount: products.length,
                products: products.map(p => ({ ...p, sellerId: userId }))
            };

        } catch (error) {
            console.error('[Scraper] Erro:', error.message);

            if (browser) {
                await browser.close();
            }

            throw error;
        }
    }

    generateMockData(userId, limit = 50) {
        const mockProducts = [];
        const categories = [
            { name: '苹果手机 iPhone 15 Pro Max 256GB', basePrice: 8999 },
            { name: '索尼 PlayStation 5 游戏机', basePrice: 3999 },
            { name: '戴森 V15 无线吸尘器', basePrice: 4299 },
            { name: '苹果 AirPods Pro 第二代', basePrice: 1499 },
            { name: '任天堂 Switch OLED 游戏机', basePrice: 2299 }
        ];

        const count = Math.min(limit, 50);

        for (let i = 0; i < count; i++) {
            const category = categories[i % categories.length];
            const priceVariation = 0.5 + Math.random() * 0.4;
            const price = Math.round(category.basePrice * priceVariation);

            mockProducts.push({
                id: `mock-${userId}-${i}`,
                name: category.name,
                price,
                priceFormatted: `¥ ${price.toFixed(2)}`,
                url: `https://www.goofish.com/item/${1000000 + i}`,
                images: [`https://picsum.photos/400/400?random=${i}`],
                sellerId: userId
            });
        }

        return {
            sellerId: userId,
            productCount: mockProducts.length,
            products: mockProducts,
            isMock: true
        };
    }
}

export default new GoofishScraper();
