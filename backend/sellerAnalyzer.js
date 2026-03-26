/**
 * Analisador de Vendedores Goofish - Sistema de Pontuação de Confiança
 * 
 * Pontuação 0-100 baseada em seguidores e vendas
 */

/**
 * Extrai informações do vendedor da página
 * Seletores baseados na estrutura real do Goofish (analisada em Jan 2026)
 * @param {Page} page - Página Playwright
 * @returns {Object} - Dados do vendedor
 */
/**
 * Parseia número no formato chinês: "6.6万" -> 66000, "2419" -> 2419, "1.2w" -> 12000
 */
function parseChineseNum(str) {
    if (!str && str !== 0) return 0;
    str = String(str);
    const match = str.match(/([\d.]+)\s*[万wW]?/);
    if (!match) return parseInt(str, 10) || 0;
    let num = parseFloat(match[1]);
    if (str.includes('万') || str.toLowerCase().includes('w')) num *= 10000;
    return Math.round(num);
}

/**
 * Extrai dados do vendedor a partir da resposta da API MTOP.
 * Estrutura real do Goofish (mtop.idle.web.user.page.head):
 * {
 *   baseInfo: { kcUserId, tags, ... },
 *   module: {
 *     social: { followers: "42", following: "0" },
 *     base: { displayName: "...", avatar: { avatar: "url" }, ipLocation: "..." },
 *     shop: { level: "L3", praiseRatio: 78, reviewNum: 33, score: 181 },
 *     tabs: { item: { number: 85 }, rate: { number: "36" } }
 *   }
 * }
 * @param {Object} apiData - Dados do campo 'data' da resposta MTOP
 * @returns {Object|null} - Dados do vendedor ou null se não encontrar
 */
function parseMtopApiData(apiData) {
    if (!apiData || Object.keys(apiData).length === 0) return null;

    const info = {
        avatar: null,
        nickname: null,
        level: 0,
        followers: 0,
        monthsActive: 0,
        salesCount: 0,
        positiveRating: 0,
        sesameCreditScore: 0,
        rawData: { extractionMethod: 'mtop_api' }
    };

    // ========================================
    // MÉTODO 1: Acesso direto à estrutura conhecida do Goofish
    // ========================================
    const module = apiData.module || {};
    const social = module.social || {};
    const base = module.base || {};
    const shop = module.shop || {};
    const tabs = module.tabs || {};

    // Seguidores
    if (social.followers) {
        info.followers = parseChineseNum(social.followers);
        info.rawData.followersRaw = social.followers;
    }

    // Nickname
    if (base.displayName) {
        info.nickname = base.displayName;
    }

    // Avatar (estrutura aninhada: base.avatar.avatar)
    if (base.avatar?.avatar) {
        let avatarUrl = base.avatar.avatar;
        if (avatarUrl.startsWith('//')) avatarUrl = 'https:' + avatarUrl;
        info.avatar = avatarUrl;
    }

    // Level (formato "L3" ou número)
    if (shop.level) {
        const lvMatch = String(shop.level).match(/L?(\d)/i);
        if (lvMatch) info.level = parseInt(lvMatch[1], 10);
    }

    // Taxa de avaliação positiva
    if (shop.praiseRatio) {
        info.positiveRating = parseInt(shop.praiseRatio, 10);
    }

    // Quantidade de itens à venda (tabs.item.number)
    // Nota: este é o total de itens, não vendas. Vendas vêm do DOM.
    if (tabs.item?.number && info.salesCount === 0) {
        info.rawData.itemCount = tabs.item.number;
    }

    // ========================================
    // MÉTODO 2: Fallback via regex no JSON para estruturas desconhecidas
    // ========================================
    const json = JSON.stringify(apiData);

    if (info.followers === 0) {
        const fansMatch = json.match(/"(?:fans?(?:Num|Count|Str)?|followers|followCount|fansCount|fanNum)"\s*:\s*"?([^",}\s]+)"?/i);
        if (fansMatch) {
            info.followers = parseChineseNum(fansMatch[1]);
            info.rawData.followersRaw = fansMatch[1];
        }
    }

    if (info.salesCount === 0) {
        const soldMatch = json.match(/"(?:sold(?:Num|Count|Str|Total)?|tradeCount|dealCount)"\s*:\s*"?([^",}\s]+)"?/i);
        if (soldMatch) {
            info.salesCount = parseChineseNum(soldMatch[1]);
            info.rawData.salesRaw = soldMatch[1];
        }
    }

    if (!info.nickname) {
        const nickMatch = json.match(/"(?:nick(?:Name)?|displayName|userName|sellerNick|showName)"\s*:\s*"([^"]{1,50})"/);
        if (nickMatch) info.nickname = nickMatch[1];
    }

    if (!info.avatar) {
        const avatarMatch = json.match(/"(?:avatar(?:Url)?|headIconUrl|headPic)"\s*:\s*"((?:https?:)?\/\/[^"]+)"/);
        if (avatarMatch) {
            info.avatar = avatarMatch[1].startsWith('//') ? 'https:' + avatarMatch[1] : avatarMatch[1];
        }
    }

    if (info.sesameCreditScore === 0) {
        const sesameMatch = json.match(/"(?:sesame(?:Credit)?(?:Score)?|zmScore|zhimaScore)"\s*:\s*"?(\d{3})"?/i);
        if (sesameMatch) info.sesameCreditScore = parseInt(sesameMatch[1], 10);
    }

    // Considerar sucesso se encontrou ao menos followers OU nickname
    const hasData = info.followers > 0 || info.salesCount > 0 || info.nickname;
    if (hasData) {
        console.log('[SellerAnalyzer] Dados extraídos via API MTOP:', {
            nickname: info.nickname, followers: info.followers, salesCount: info.salesCount,
            level: info.level, positiveRating: info.positiveRating
        });
        return info;
    }

    return null;
}

export async function extractSellerInfo(page, mtopApiData = null) {
    console.log('[SellerAnalyzer] Extraindo informações do vendedor...');

    // 0. Se temos dados da API MTOP, usá-los diretamente (mais confiável que DOM)
    if (mtopApiData) {
        const apiInfo = parseMtopApiData(mtopApiData);
        if (apiInfo) {
            // A API MTOP não inclui salesCount - extrair do DOM (div.tabItem com "已售出")
            if (apiInfo.salesCount === 0) {
                try {
                    // Aguardar as tabs renderizarem (React precisa de tempo após a API)
                    await page.waitForSelector('[class*="tabItem"]', { timeout: 8000 }).catch(() => {});

                    const salesFromDom = await page.evaluate(() => {
                        // Método 1: Buscar diretamente nas divs tabItem
                        const tabItems = document.querySelectorAll('[class*="tabItem"]');
                        for (const tab of tabItems) {
                            const text = tab.innerText?.trim() || '';
                            const match = text.match(/已售出?\s*([\d,]+)/);
                            if (match) return parseInt(match[1].replace(/,/g, ''), 10);
                        }

                        // Método 2: Fallback no texto completo da página
                        const pageText = document.body.innerText || '';
                        const patterns = [
                            /已售出\s*([\d,]+)/,
                            /已售\s*([\d,]+)/,
                            /([\d,]+)\s*件?\s*已售/,
                            /成交\s*([\d,]+)/,
                            /([\d,]+)\s*笔交易/,
                        ];
                        for (const p of patterns) {
                            const m = pageText.match(p);
                            if (m) return parseInt(m[1].replace(/,/g, ''), 10);
                        }
                        return 0;
                    });
                    if (salesFromDom > 0) {
                        apiInfo.salesCount = salesFromDom;
                        apiInfo.rawData.salesSource = 'dom_tabItem';
                    }
                } catch (e) {
                    // Ignora se DOM não estiver acessível
                }
            }
            return apiInfo;
        }
        console.log('[SellerAnalyzer] API MTOP não retornou dados úteis, tentando extração via página...');
    }

    // 1. Verificar se a página foi bloqueada (Oops/Captcha)
    const isBlocked = await page.evaluate(() => {
        const bodyText = document.body.innerText || '';
        const blockedKeywords = [
            '哎呀', '连错线', '验证码', 'nc-lang-cnt', 
            'verify', 'captcha', 'security check', 'robot'
        ];
        return blockedKeywords.some(kw => 
            bodyText.includes(kw) || 
            (document.title && document.title.includes(kw)) ||
            !!document.querySelector('#nc_1_wrapper') ||
            !!document.querySelector('[id*="captcha"]')
        );
    });

    if (isBlocked) {
        console.warn('[SellerAnalyzer] Detetado bloqueio ou Captcha na página!');
        throw new Error('PAGE_BLOCKED');
    }

    // 2. Aguardar conteúdo renderizado (SPA precisa de tempo para renderizar)
    try {
        await page.waitForFunction(
            () => {
                const text = document.body.innerText || '';
                return text.includes('粉丝') || text.includes('在售') ||
                       text.includes('关注') || text.includes('卖家') ||
                       text.includes('已售') || text.length > 500;
            },
            { timeout: 10000 }
        );
    } catch (e) {
        console.log('[SellerAnalyzer] Aviso: Timeout aguardando conteúdo renderizado. Tentando extração direta.');
    }

    const sellerInfo = await page.evaluate(() => {
        const info = {
            avatar: null,
            nickname: null,
            level: 0,
            followers: 0,
            monthsActive: 0,
            salesCount: 0,
            positiveRating: 0,
            sesameCreditScore: 0,
            rawData: {}
        };

        // ========================================
        // MÉTODO PRIMÁRIO: Extração de dados SSR/hidratação
        // Goofish injeta dados em window globals antes do DOM renderizar
        // ========================================
        const dataKeys = ['__INITIAL_DATA__', '__INITIAL_STATE__', '__FL_DATA__', 'g_config', '__NEXT_DATA__'];
        for (const key of dataKeys) {
            try {
                const data = window[key];
                if (!data) continue;
                const json = typeof data === 'string' ? data : JSON.stringify(data);

                // Seguidores/Fãs
                if (info.followers === 0) {
                    const fansPatterns = [
                        /"(?:fans?(?:Num|Count|_count|_num)?|fansCount|fanNum|fansStr)"\s*:\s*"?(\d+)"?/i,
                        /"(?:follow(?:er)?(?:s|Count|Num|_count)?)"\s*:\s*"?(\d+)"?/i
                    ];
                    for (const pattern of fansPatterns) {
                        const m = json.match(pattern);
                        if (m) {
                            info.followers = parseInt(m[1], 10);
                            info.rawData.followersSource = key;
                            break;
                        }
                    }
                }

                // Vendas
                if (info.salesCount === 0) {
                    const soldPatterns = [
                        /"(?:sold(?:Num|Count|_count|_num)?|soldCount|tradeCount|dealCount)"\s*:\s*"?(\d+)"?/i,
                    ];
                    for (const pattern of soldPatterns) {
                        const m = json.match(pattern);
                        if (m) {
                            info.salesCount = parseInt(m[1], 10);
                            info.rawData.salesSource = key;
                            break;
                        }
                    }
                }

                // Nickname
                if (!info.nickname) {
                    const nickMatch = json.match(/"(?:nick(?:Name)?|userName|sellerNick|showName)"\s*:\s*"([^"]{1,50})"/);
                    if (nickMatch) {
                        info.nickname = nickMatch[1];
                        info.rawData.nicknameSource = key;
                    }
                }

                // Avatar
                if (!info.avatar) {
                    const avatarMatch = json.match(/"(?:avatar(?:Url)?|headIconUrl|headPic)"\s*:\s*"(https?:[^"]+)"/);
                    if (avatarMatch) {
                        info.avatar = avatarMatch[1];
                    }
                }

                // Crédito Sesame
                if (info.sesameCreditScore === 0) {
                    const sesameMatch = json.match(/"(?:sesame(?:Credit)?(?:Score)?|zmScore|zhimaScore)"\s*:\s*"?(\d{3})"?/i);
                    if (sesameMatch) {
                        info.sesameCreditScore = parseInt(sesameMatch[1], 10);
                        info.rawData.sesameSource = key;
                    }
                }
            } catch (e) {
                // Ignora erros de parse (referências circulares, etc.)
            }
        }

        // Também buscar em script tags com JSON inline
        if (info.followers === 0 || info.salesCount === 0) {
            const scriptTags = document.querySelectorAll('script:not([src])');
            for (const script of scriptTags) {
                const content = script.textContent || '';
                if (content.length < 100 || !content.includes('{')) continue;

                try {
                    if (info.followers === 0) {
                        const fansMatch = content.match(/"(?:fans?(?:Num|Count)?|fansCount|fanNum)"\s*:\s*"?(\d+)"?/i);
                        if (fansMatch) {
                            info.followers = parseInt(fansMatch[1], 10);
                            info.rawData.followersSource = 'script_tag';
                        }
                    }
                    if (info.salesCount === 0) {
                        const soldMatch = content.match(/"(?:sold(?:Num|Count)?|tradeCount|dealCount)"\s*:\s*"?(\d+)"?/i);
                        if (soldMatch) {
                            info.salesCount = parseInt(soldMatch[1], 10);
                            info.rawData.salesSource = 'script_tag';
                        }
                    }
                    if (!info.nickname) {
                        const nickMatch = content.match(/"(?:nick(?:Name)?|userName|sellerNick|showName)"\s*:\s*"([^"]{1,50})"/);
                        if (nickMatch) {
                            info.nickname = nickMatch[1];
                            info.rawData.nicknameSource = 'script_tag';
                        }
                    }
                } catch (e) {
                    // Ignora erros de parse
                }
            }
        }

        if (info.followers > 0 || info.salesCount > 0 || info.nickname) {
            info.rawData.extractionMethod = 'ssr_data';
        }

        // ========================================
        // MÉTODO FALLBACK: Extração via DOM (seletores CSS + regex no texto)
        // ========================================

        const pageText = document.body.innerText;

        // ========================================
        // AVATAR
        // ========================================
        const avatarEl = document.querySelector('img[class*="avatar"]');
        if (avatarEl) {
            info.avatar = avatarEl.src;
        }

        // ========================================
        // NICKNAME - span.nick--sP8UifWP ou similar
        // ========================================
        if (!info.nickname) {
            const nickSelectors = [
                'span[class*="nick--"]',
                '[class*="nick"]',
                '[class*="userName"]'
            ];
            for (const sel of nickSelectors) {
                const nickEl = document.querySelector(sel);
                if (nickEl && nickEl.innerText?.trim()) {
                    info.nickname = nickEl.innerText.trim();
                    info.rawData.nicknameSelector = sel;
                    break;
                }
            }
        }

        // ========================================
        // LEVEL - img com levelIcon no class
        // Mapeamento direto de URLs para níveis
        // ========================================
        const LEVEL_IMAGES = {
            'https://gw.alicdn.com/imgextra/i2/O1CN01Udtw241IH8Oxl4Nb3_!!6000000000867-2-tps-264-60.png': 7, // L7
            'https://gw.alicdn.com/imgextra/i1/O1CN01YFiTRl1UXPs4fba4R_!!6000000002527-2-tps-204-60.png': 3, // L3
            'https://gw.alicdn.com/imgextra/i3/O1CN01aFW69W24xos3kmpTd_!!6000000007458-2-tps-264-60.png': 5, // L5
            'https://gw.alicdn.com/imgextra/i1/O1CN01uclCPK1gQnXDBTZBl_!!6000000004137-2-tps-204-60.png': 4, // L4
            'https://gw.alicdn.com/imgextra/i3/O1CN01Ud13t923m56Q1T9Th_!!6000000007297-2-tps-264-60.png': 6, // L6
        };

        const levelImg = document.querySelector('img[class*="levelIcon"]');
        if (levelImg && levelImg.src) {
            // Primeiro tenta mapear diretamente pela URL
            if (LEVEL_IMAGES[levelImg.src]) {
                info.level = LEVEL_IMAGES[levelImg.src];
            } else {
                // Fallback: tenta extrair do padrão L{número} no src
                const srcMatch = levelImg.src.match(/L(\d)/i);
                if (srcMatch) {
                    info.level = parseInt(srcMatch[1], 10);
                }
            }
            info.rawData.levelSrc = levelImg.src;
        }

        // Fallback: procura texto L1-L7 ou Lv no texto
        if (info.level === 0) {
            const lvMatch = pageText.match(/[Ll](\d)\b|[Ll][Vv]\.?\s*(\d)/);
            if (lvMatch) {
                info.level = parseInt(lvMatch[1] || lvMatch[2], 10);
            }
        }

        // ========================================
        // FOLLOWERS - span.infoCenterText--oYf75roe ou similar
        // Formato: "6.6w粉丝" ou "1234粉丝"
        // ========================================

        // Método 1: Buscar elemento específico com class infoCenterText
        if (info.followers === 0) {
        const infoCenterSpans = document.querySelectorAll('span[class*="infoCenterText"], div[class*="infoCenterText"], span[class*="value"]');
        for (const span of infoCenterSpans) {
            const text = span.innerText || '';
            if (text.includes('粉丝')) {
                // Extrai número: "6.6w粉丝" -> 66000, "1234粉丝" -> 1234
                const numMatch = text.match(/([\d.]+)\s*[wW万]?\s*粉丝/);
                if (numMatch) {
                    let count = parseFloat(numMatch[1]);
                    if (text.toLowerCase().includes('w') || text.includes('万')) {
                        count = count * 10000;
                    }
                    info.followers = Math.round(count);
                    info.rawData.followersText = text;
                    break;
                }
            }
        }

        // Método 1.5: Buscar pela label (irmão ou pai)
        if (info.followers === 0) {
            const allElements = document.querySelectorAll('span, div, p');
            for (const el of allElements) {
                if (el.innerText === '粉丝' || el.innerText === '粉丝数') {
                    // Tenta ver se o número está no elemento anterior ou seguinte
                    const parent = el.parentElement;
                    if (parent) {
                        const parentText = parent.innerText;
                        const match = parentText.match(/([\d.]+)\s*[wW万]?/);
                        if (match) {
                            let count = parseFloat(match[1]);
                            if (parentText.includes('w') || parentText.includes('万')) count *= 10000;
                            info.followers = Math.round(count);
                            info.rawData.followersText = parentText;
                            break;
                        }
                    }
                }
            }
        }

        // Método 2: Fallback via regex no texto da página
        if (info.followers === 0) {
            const followersPatterns = [
                /([\d.]+)\s*[wW万]\s*粉丝/,  // 6.6w粉丝
                /([\d,]+)\s*粉丝/,            // 1234粉丝
                /粉丝\s*([\d.,]+)[wW万]?/     // 粉丝 1234
            ];
            for (const pattern of followersPatterns) {
                const match = pageText.match(pattern);
                if (match) {
                    let count = parseFloat(match[1].replace(/,/g, ''));
                    if (match[0].toLowerCase().includes('w') || match[0].includes('万')) {
                        count = count * 10000;
                    }
                    info.followers = Math.round(count);
                    info.rawData.followersText = match[0];
                    break;
                }
            }
        }
        } // fim do guard info.followers === 0

        // ========================================
        // SALES COUNT - via tabs ou texto "已售出 XXXX"
        // ========================================
        if (info.salesCount === 0) {
        // Método 1: Buscar no texto da página "已售出 2419"
        const salesPatterns = [
            /已售出\s*([\d,]+)/,          // 已售出 2419
            /已售\s*([\d,]+)/,            // 已售2419
            /([\d,]+)\s*件?\s*已售/,      // 2419件已售
            /成交\s*([\d,]+)/,            // 成交2419
            /([\d,]+)\s*笔交易/,          // 2419笔交易
            /([\d,]+)w?\+?\s*人付款/      // 2419人付款 (novo padrão)
        ];

        for (const pattern of salesPatterns) {
            const match = pageText.match(pattern);
            if (match) {
                info.salesCount = parseInt(match[1].replace(/,/g, ''), 10);
                info.rawData.salesText = match[0];
                break;
            }
        }

        // Método 2: Buscar em divs com "已售出"
        if (info.salesCount === 0) {
            const allDivs = document.querySelectorAll('div');
            for (const div of allDivs) {
                const text = div.innerText || '';
                // Procura por "已售出" seguido de número
                if (text.includes('已售出') || text.includes('已售')) {
                    const numMatch = text.match(/已售出?\s*([\d,]+)/);
                    if (numMatch) {
                        const count = parseInt(numMatch[1].replace(/,/g, ''), 10);
                        if (count > 0) {
                            info.salesCount = count;
                            info.rawData.salesText = text.substring(0, 50);
                            break;
                        }
                    }
                }
            }
        }
        } // fim do guard info.salesCount === 0

        // ========================================
        // TEMPO NA PLATAFORMA
        // ========================================
        const timePatterns = [
            /([\d.]+)\s*年来?闲鱼/,
            /([\d.]+)\s*年老店/,
            /(\d+)\s*天来?闲鱼/,
            /入驻\s*(\d+)\s*天/
        ];
        for (const pattern of timePatterns) {
            const match = pageText.match(pattern);
            if (match) {
                const value = parseFloat(match[1]);
                if (match[0].includes('年')) {
                    info.monthsActive = Math.round(value * 12);
                } else if (match[0].includes('天')) {
                    info.monthsActive = Math.round(value / 30);
                }
                info.rawData.platformTimeText = match[0];
                break;
            }
        }

        // ========================================
        // SESAME CREDIT (芝麻分)
        // ========================================
        const sesameMatch = pageText.match(/芝麻分?\s*[:：]?\s*(\d+)/);
        if (sesameMatch) {
            info.sesameCreditScore = parseInt(sesameMatch[1], 10);
            info.rawData.sesameText = sesameMatch[0];
        }

        // ========================================
        // TAXA DE AVALIAÇÃO POSITIVA
        // ========================================
        const positiveMatch = pageText.match(/(\d+)\s*好评/);
        const totalMatch = pageText.match(/全部\s*(\d+)/);
        if (positiveMatch && totalMatch) {
            const positive = parseInt(positiveMatch[1], 10);
            const total = parseInt(totalMatch[1], 10);
            if (total > 0) {
                info.positiveRating = Math.round((positive / total) * 100);
            }
        } else if (positiveMatch) {
            info.positiveRating = 95; // Default
        }

        return info;
    });

    console.log('[SellerAnalyzer] Dados extraídos:', {
        nickname: sellerInfo.nickname,
        level: sellerInfo.level,
        followers: sellerInfo.followers,
        monthsActive: sellerInfo.monthsActive,
        salesCount: sellerInfo.salesCount,
        positiveRating: sellerInfo.positiveRating,
        sesameCreditScore: sellerInfo.sesameCreditScore,
        rawData: sellerInfo.rawData
    });

    return sellerInfo;
}

/**
 * Calcula a pontuação de confiança do vendedor (0-100)
 * Algoritmo simplificado baseado apenas em:
 * - Seguidores (50 pontos máx)
 * - Vendas concluídas (50 pontos máx)
 * 
 * @param {Object} seller - Dados do vendedor
 * @returns {Object} - Pontuação e detalhes
 */
export function calculateTrustScore(seller) {
    let score = 0;
    const breakdown = {};

    // ========================================
    // SEGUIDORES (0-50 pontos)
    // Escala progressiva e realista
    // ========================================
    const followers = seller.followers || 0;

    if (followers >= 10000) {
        breakdown.followers = 50;      // 10k+ = máximo
    } else if (followers >= 7000) {
        breakdown.followers = 45;      // 7-10k = excelente
    } else if (followers >= 5000) {
        breakdown.followers = 40;      // 5-7k = muito bom
    } else if (followers >= 3000) {
        breakdown.followers = 35;      // 3-5k = bom
    } else if (followers >= 1000) {
        breakdown.followers = 28;      // 1-3k = acima da média
    } else if (followers >= 500) {
        breakdown.followers = 22;      // 500-1k = médio-alto
    } else if (followers >= 400) {
        breakdown.followers = 10;      // 400-500 = médio
    } else if (followers >= 300) {
        breakdown.followers = 8;       // 500-1k = baixo
    } else if (followers >= 100) {
        breakdown.followers = 3;       // 100-500 = muito baixo
    } else {
        breakdown.followers = 0;       // <100 = não pontua
    }
    score += breakdown.followers;

    // ========================================
    // VENDAS CONCLUÍDAS (0-50 pontos)
    // Escala progressiva e realista
    // ========================================
    const sales = seller.salesCount || 0;

    if (sales >= 1500) {
        breakdown.sales = 50;          // 1k500+ vendas = máximo
    } else if (sales >= 1000) {
        breakdown.sales = 45;          // 1k-1k500 = excelente
    } else if (sales >= 750) {
        breakdown.sales = 40;          // 750-1k = muito bom
    } else if (sales >= 500) {
        breakdown.sales = 35;          // 500-750 = bom
    } else if (sales >= 300) {
        breakdown.sales = 28;          // 300-500 = acima da média
    } else if (sales >= 200) {
        breakdown.sales = 22;          // 200-300 = médio-alto
    } else if (sales >= 100) {
        breakdown.sales = 15;          // 100-200 = médio
    } else if (sales >= 50) {
        breakdown.sales = 8;           // 50-100 = baixo
    } else if (sales >= 10) {
        breakdown.sales = 3;           // 10-50 = muito baixo
    } else {
        breakdown.sales = 0;           // <10 = não pontua
    }
    score += breakdown.sales;

    // ========================================
    // CLASSIFICAÇÃO BASEADA NO SCORE FINAL
    // ========================================
    let classification;
    let classificationColor;
    let classificationIcon;

    if (score >= 90) {
        classification = 'Excelente';
        classificationColor = 'green';
        classificationIcon = '⭐';
    } else if (score >= 80) {
        classification = 'Confiável';
        classificationColor = 'blue';
        classificationIcon = '👍';
    } else if (score >= 40) {
        classification = 'Moderado';
        classificationColor = 'yellow';
        classificationIcon = '⚠️';
    } else if (score >= 30) {
        classification = 'Iniciante';
        classificationColor = 'orange';
        classificationIcon = '🆕';
    } else {
        classification = 'Arriscado';
        classificationColor = 'red';
        classificationIcon = '🚨';
    }

    return {
        score,
        breakdown,
        classification,
        classificationColor,
        classificationIcon
    };
}

/**
 * Formata os dados do vendedor para o frontend
 * @param {Object} seller - Dados brutos do vendedor
 * @param {Object} trustResult - Resultado do cálculo de confiança
 * @returns {Object} - Dados formatados para o frontend
 */
export function formatSellerData(seller, trustResult) {
    return {
        avatar: seller.avatar,
        nickname: seller.nickname || 'Vendedor',
        level: seller.level,
        followers: seller.followers,
        followersFormatted: formatNumber(seller.followers),
        monthsActive: seller.monthsActive,
        monthsActiveFormatted: seller.monthsActive > 0
            ? `${Math.floor(seller.monthsActive / 12)} anos e ${seller.monthsActive % 12} meses`
            : 'Não informado',
        salesCount: seller.salesCount,
        salesCountFormatted: formatNumber(seller.salesCount),
        positiveRating: seller.positiveRating,
        sesameCreditScore: seller.sesameCreditScore,
        trustScore: trustResult.score,
        trustBreakdown: trustResult.breakdown,
        trustClassification: trustResult.classification,
        trustClassificationColor: trustResult.classificationColor,
        trustClassificationIcon: trustResult.classificationIcon,
        rawData: seller.rawData
    };
}

/**
 * Formata números para exibição (ex: 66000 -> "66k")
 */
function formatNumber(num) {
    if (!num || num === 0) return '0';
    if (num >= 10000) {
        return `${(num / 10000).toFixed(1).replace(/\.0$/, '')}万`;
    }
    if (num >= 1000) {
        return `${(num / 1000).toFixed(1).replace(/\.0$/, '')}k`;
    }
    return num.toString();
}

export default {
    extractSellerInfo,
    calculateTrustScore,
    formatSellerData
};
