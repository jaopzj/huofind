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
        this.browser = null;
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

    async randomDelay(min = 500, max = 2000) {
        const delay = Math.floor(Math.random() * (max - min + 1)) + min;
        await new Promise(resolve => setTimeout(resolve, delay));
    }

    async scrapeSellerProducts(url, limit = 50) {
        const userId = this.extractUserId(url);
        if (!userId) {
            throw new Error('URL inválida: userId não encontrado');
        }

        console.log(`[Scraper] Iniciando scraping para vendedor: ${userId}`);

        try {
            this.browser = await chromium.launch({
                headless: true
            });

            const context = await this.browser.newContext({
                userAgent: this.getRandomUserAgent(),
                viewport: { width: 1920, height: 1080 },
                locale: 'zh-CN',
                timezoneId: 'Asia/Shanghai'
            });

            const page = await context.newPage();

            console.log(`[Scraper] Navegando para: ${url}`);
            await page.goto(url, {
                waitUntil: 'networkidle',
                timeout: 60000
            });

            // Aguarda carregamento
            console.log('[Scraper] Aguardando carregamento...');
            await this.randomDelay(3000, 5000);

            // Extrai informações do vendedor ANTES de scrollar
            console.log('[Scraper] Extraindo informações do vendedor...');
            let sellerInfo = null;
            let trustResult = null;
            try {
                sellerInfo = await extractSellerInfo(page);
                trustResult = calculateTrustScore(sellerInfo);
                console.log(`[Scraper] Vendedor: ${sellerInfo.nickname || userId}, Pontuação: ${trustResult.score}/100 (${trustResult.classification})`);
            } catch (sellerError) {
                console.error('[Scraper] Erro ao extrair info do vendedor:', sellerError.message);
            }


            // Tenta aguardar cards específicos
            try {
                await page.waitForSelector('a[class*="feeds-item-wrap"], [class*="cardWarp"], [class*="ItemCard"]', {
                    timeout: 15000
                });
                console.log('[Scraper] Cards de produto detectados!');
            } catch (e) {
                console.log('[Scraper] Timeout aguardando cards, tentando scroll...');
            }

            // Scroll para carregar mais produtos
            console.log('[Scraper] Realizando scroll...');
            const scrollsNeeded = Math.ceil(limit / 8);

            for (let i = 0; i < scrollsNeeded; i++) {
                await page.evaluate(() => window.scrollBy(0, window.innerHeight));
                await this.randomDelay(1000, 1500);
            }

            // Volta ao topo
            await page.evaluate(() => window.scrollTo(0, 0));
            await this.randomDelay(500, 1000);

            // Extrai produtos
            console.log('[Scraper] Extraindo produtos...');
            const products = await page.evaluate((maxProducts) => {
                const items = [];
                const seenIds = new Set();

                // Seletores baseados na análise real do DOM Goofish
                // O card do produto é um elemento <a> com classe começando com "feeds-item-wrap"
                // ou contendo "cardWarp"
                const cards = document.querySelectorAll('a[class*="feeds-item-wrap"], a[class*="cardWarp"], div[class*="feeds-item-wrap"], div[class*="cardWarp"]');

                console.log(`[Browser] Encontrados ${cards.length} cards de produto`);

                cards.forEach((card, index) => {
                    if (maxProducts > 0 && items.length >= maxProducts) return;

                    try {
                        // O card de produto já é um link <a>, então pega o href dele
                        const productUrl = card.tagName === 'A' ? card.href : (card.querySelector('a')?.href || '');

                        // Verifica se é um link de item
                        if (!productUrl.includes('/item')) return;

                        // Extrai ID do produto
                        let productId = null;
                        const idMatch = productUrl.match(/id=(\d+)/);
                        if (idMatch) {
                            productId = idMatch[1];
                        } else {
                            const itemIdMatch = productUrl.match(/item\/(\d+)/);
                            if (itemIdMatch) {
                                productId = itemIdMatch[1];
                            }
                        }

                        if (!productId || seenIds.has(productId)) return;
                        seenIds.add(productId);

                        // Extrai título - está no primeiro bloco de texto do conteúdo
                        // O card tem geralmente: [div imagem] [div conteúdo]
                        // O conteúdo tem: [span título] ... [span preço]
                        let title = '';

                        // Procura spans dentro do card que possam ser títulos
                        const allSpans = card.querySelectorAll('span');
                        for (const span of allSpans) {
                            const text = span.textContent?.trim();
                            // O título geralmente é o texto mais longo que não é preço
                            if (text &&
                                text.length > 10 &&
                                text.length < 300 &&
                                !text.includes('¥') &&
                                !text.match(/^\d+$/) &&
                                !text.includes('人想要') &&
                                !text.includes('人付款')) {
                                title = text;
                                break;
                            }
                        }

                        // Fallback: pega todo o texto do card e filtra
                        if (!title) {
                            const cardText = card.textContent?.trim();
                            // Remove preços e contadores
                            const cleanText = cardText?.replace(/¥[\d,.]+/g, '').replace(/\d+人(想要|付款)/g, '').trim();
                            if (cleanText && cleanText.length > 5) {
                                title = cleanText.slice(0, 100);
                            }
                        }

                        // Extrai preço
                        // Estrutura real do DOM Goofish:
                        // <div class="price-wrap--XXX">
                        //   <span class="sign--XXX">¥</span>
                        //   <span class="number--XXX">2840</span>  <-- ESTE é o preço
                        // </div>
                        // <div class="price-desc--XXX">
                        //   <div class="text--XXX">1084人想要</div>  <-- Este é o contador (NÃO É PREÇO)
                        // </div>
                        let price = 0;

                        // SOLUÇÃO: Buscar especificamente o span com classe "number" que contém APENAS o preço
                        // Tenta encontrar o span numérico mais provável (geralmente class="number--XXX")
                        const priceNumberSpan = card.querySelector('span[class*="number"], [class*="priceText"]');
                        if (priceNumberSpan) {
                            const priceText = priceNumberSpan.textContent?.replace(/[^\d.]/g, '').trim();
                            if (priceText) {
                                price = parseFloat(priceText);
                            }
                        }

                        // Fallback 1: buscar dentro do container price-wrap
                        if (!price || price === 0) {
                            const priceWrap = card.querySelector('div[class*="price-wrap"], [class*="priceWrap"], [class*="price-box"]');
                            if (priceWrap) {
                                // Pega o texto completo e tenta extrair o número após o ¥
                                const wrapText = priceWrap.textContent?.replace(/[^\d.]/g, '').trim();
                                if (wrapText) {
                                    price = parseFloat(wrapText);
                                }
                            }
                        }

                        // Fallback 2: regex no conteúdo total do card como última alternativa
                        if (!price || price === 0) {
                            const cardText = card.textContent || '';
                            const priceMatch = cardText.match(/¥\s*([\d,.]+)/);
                            if (priceMatch) {
                                price = parseFloat(priceMatch[1].replace(',', '.'));
                            }
                        }

                        // Extrai imagem
                        let imageUrl = '';
                        const imgs = card.querySelectorAll('img');
                        for (const img of imgs) {
                            const src = img.src || img.dataset?.src || img.getAttribute('data-src');
                            if (src && src.startsWith('http')) {
                                imageUrl = src;
                                break;
                            }
                        }

                        if (title || price > 0) {
                            items.push({
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

                return items;
            }, limit);

            console.log(`[Scraper] Extraídos ${products.length} produtos`);

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

            await this.browser.close();
            this.browser = null;

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

            if (this.browser) {
                await this.browser.close();
                this.browser = null;
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
