/**
 * Analisador de Vendedores Goofish - Sistema de Pontuação de Confiança
 * 
 * Pontuação 0-100 baseada em seguidores e vendas
 */
import fetch from 'node-fetch';

/**
 * Função interna para traduzir do Chinês com o Google Translate Cloud
 */
async function translateZhToPt(text) {
    if (!text) return text;
    try {
        const res = await fetch('https://translate.googleapis.com/translate_a/single?client=gtx&sl=zh-CN&tl=pt&dt=t&q=' + encodeURIComponent(text));
        const json = await res.json();
        let txt = '';
        if (json && json[0]) {
            for (const part of json[0]) {
                if (part[0]) txt += part[0];
            }
        }
        return txt || text;
    } catch(e) {
        return text; // Fallback pra chinês se a requisição falhar
    }
}

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

/**
 * Mapeamento de URLs de ícones de nível Goofish -> nível numérico
 * Mantido no escopo do módulo para reuso.
 */
const LEVEL_IMAGES = {
    'https://gw.alicdn.com/imgextra/i2/O1CN01Udtw241IH8Oxl4Nb3_!!6000000000867-2-tps-264-60.png': 7,
    'https://gw.alicdn.com/imgextra/i1/O1CN01YFiTRl1UXPs4fba4R_!!6000000002527-2-tps-204-60.png': 3,
    'https://gw.alicdn.com/imgextra/i3/O1CN01aFW69W24xos3kmpTd_!!6000000007458-2-tps-264-60.png': 5,
    'https://gw.alicdn.com/imgextra/i1/O1CN01uclCPK1gQnXDBTZBl_!!6000000004137-2-tps-204-60.png': 4,
    'https://gw.alicdn.com/imgextra/i3/O1CN01Ud13t923m56Q1T9Th_!!6000000007297-2-tps-264-60.png': 6,
};

/**
 * Extrai informações do vendedor usando o mesmo fluxo da extensão do EVO Huofind:
 *   1. Aguarda a âncora .nick--sP8UifWP aparecer (indica que o SPA carregou o header);
 *   2. Extrai productsText (.tabItem--HiFOTMcp contendo 在售) ANTES de trocar de aba,
 *      pois o DOM dos produtos é destruído quando a aba de avaliações entra em foco;
 *   3. Clica na 2ª .textShadow--FlVQQmey (header "Crédito e Avaliação");
 *   4. Aguarda a re-renderização e lê reviewsText (.tabItem--Rc38fjYm contendo 好评);
 *   5. Coleta avatar, nome, level, desc e infoArray (localização + seguidores);
 *   6. Traduz via Google Translate os campos de texto (nome, localização, descrição);
 *   7. Parseia números (seguidores a partir de "1.9w粉丝", salesCount a partir do
 *      número de avaliações positivas como proxy) para alimentar o trust score.
 *
 * Mantém a API MTOP como fallback/mesclagem caso o DOM não entregue algum campo.
 */
export async function extractSellerInfo(page, mtopApiData = null) {
    console.log('[SellerAnalyzer] Extraindo info do vendedor (fluxo da extensão)...');

    // 1. Detecção de bloqueio (Oops/Captcha)
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
        console.warn('[SellerAnalyzer] Detectado bloqueio/Captcha na página!');
        throw new Error('PAGE_BLOCKED');
    }

    // 2. Aguardar a âncora do nome (mesma estratégia do background.js da extensão)
    try {
        await page.waitForSelector('.nick--sP8UifWP, span[class*="nick--"]', { timeout: 12000 });
    } catch (e) {
        console.log('[SellerAnalyzer] Timeout aguardando âncora .nick — continua mesmo assim.');
    }

    // 3. Aguardar tabItems da aba "Bens" renderizarem antes de tentar trocar de aba
    try {
        await page.waitForSelector('.tabItem--HiFOTMcp, [class*="tabItem--HiFOTMcp"]', { timeout: 8000 });
    } catch (e) {
        // Pode ser que o hash da classe tenha mudado — seguimos e deixamos o fallback cuidar
    }

    // 4. Extrair productsText ANTES de clicar na aba de avaliações.
    //    Importante: o Goofish destrói o DOM da aba atual ao trocar, então se
    //    capturarmos depois do clique perdemos o valor do "À Venda" (在售).
    let productsText = '';
    try {
        productsText = await page.evaluate(() => {
            const prodTabs = document.querySelectorAll('.tabItem--HiFOTMcp, [class*="tabItem--HiFOTMcp"]');
            if (!prodTabs || prodTabs.length === 0) return '';
            // 3 abas com a mesma classe: "Todos" | "À Venda" (在售) | "Vendidos"
            const target = Array.from(prodTabs).find(t => t.textContent && t.textContent.includes('在售'))
                || prodTabs[1]
                || prodTabs[0];
            return target ? (target.innerText || target.textContent || '').trim() : '';
        });
    } catch (e) {
        console.log('[SellerAnalyzer] Aviso ao extrair productsText:', e.message);
    }

    // 5. Clicar na 2ª aba header (.textShadow--FlVQQmey) — normalmente "Crédito e Avaliação"
    try {
        await page.evaluate(() => {
            const tabHeaders = document.querySelectorAll('.textShadow--FlVQQmey, [class*="textShadow--"]');
            if (tabHeaders.length > 0) {
                const reviewTab = tabHeaders.length > 1 ? tabHeaders[1] : tabHeaders[0];
                reviewTab.click();
            }
        });
        // Espera de 1,5s para o React re-renderizar as reviews (mesmo delay usado na extensão)
        await new Promise(resolve => setTimeout(resolve, 1500));
    } catch (e) {
        console.log('[SellerAnalyzer] Aviso ao clicar na aba de reviews:', e.message);
    }

    // 6. Coletar todo o resto: avatar, nome, level, descrição, infoArray e reviewsText
    const sellerData = await page.evaluate(() => {
        const pick = (selectors) => {
            for (const sel of selectors) {
                const el = document.querySelector(sel);
                if (el) return el;
            }
            return null;
        };

        const avatarEl = pick(['.avatar--IswHbxD9', 'img[class*="avatar--"]', 'img[class*="avatar"]']);
        const nameEl = pick(['.nick--sP8UifWP', 'span[class*="nick--"]', '[class*="nick"]']);
        const levelEl = pick(['.levelIcon--x9YcHlL5', 'img[class*="levelIcon--"]', 'img[class*="levelIcon"]']);
        const descEl = pick(['.bottom--eUkWZRHp', '[class*="bottom--eUkWZRHp"]']);
        const infos = document.querySelectorAll('.infoCenterText--oYf75roe, [class*="infoCenterText--"]');

        const infoArray = [];
        infos.forEach(el => {
            const txt = (el.innerText || el.textContent || '').trim();
            if (txt) infoArray.push(txt);
        });

        // Reviews - só aparecem depois do clique na aba "Crédito e Avaliação"
        let reviewsText = '';
        const reviewTabs = document.querySelectorAll('.tabItem--Rc38fjYm, [class*="tabItem--Rc38fjYm"]');
        if (reviewTabs && reviewTabs.length > 0) {
            // Filtros: "Todos | Com Foto | Positivos (好评) | Compradores | Vendedores"
            const target = Array.from(reviewTabs).find(t => t.textContent && t.textContent.includes('好评'))
                || reviewTabs[2]
                || reviewTabs[0];
            reviewsText = target ? (target.innerText || target.textContent || '').trim() : '';
        }

        return {
            avatar: avatarEl ? avatarEl.src : '',
            name: nameEl ? (nameEl.innerText || nameEl.textContent || '').trim() : '',
            levelSrc: levelEl ? levelEl.src : '',
            desc: descEl ? (descEl.innerText || descEl.textContent || '').trim() : '',
            infoArray,
            reviewsText
        };
    });

    // 7. Separar localização e seguidores do infoArray
    //    A seção infoCenter costuma ter 3 itens: [localização, "X粉丝", "Y关注"].
    let rawLocation = '';
    let rawFollowers = '';
    if (sellerData.infoArray.length > 0) {
        const followersObj = sellerData.infoArray.find(t => t.includes('粉丝'));
        if (followersObj) {
            rawFollowers = followersObj;
        } else {
            // Fallback: primeira tag com número que NÃO seja "关注" (seguindo)
            rawFollowers = sellerData.infoArray.find(t => /\d/.test(t) && !t.includes('关注')) || '';
        }
        // Localização = item sem número
        rawLocation = sellerData.infoArray.find(t => !/\d/.test(t)) || '';
    }

    // 8. Traduzir em paralelo os campos de texto (nome, localização, descrição).
    //    ATENÇÃO: nunca traduzir métricas — o Google Tradutor apaga o "w" de "1.9w粉丝".
    const [tName, tLoc, tDesc] = await Promise.all([
        translateZhToPt(sellerData.name),
        translateZhToPt(rawLocation),
        translateZhToPt(sellerData.desc)
    ]);

    // 9. Parse numérico dos campos para o trust score
    //    followers: "1.9w粉丝" -> 19000 ; "1234粉丝" -> 1234
    const followersCount = parseChineseNum(rawFollowers);

    //    salesCount: usamos o número de avaliações positivas (好评) como proxy de vendas.
    //    Ex: "好评 (2419)" ou "2.4w好评" -> 2419 / 24000
    let salesCount = 0;
    if (sellerData.reviewsText) {
        salesCount = parseChineseNum(sellerData.reviewsText);
    }

    // 10. Level via URL do ícone
    let level = 0;
    if (sellerData.levelSrc) {
        if (LEVEL_IMAGES[sellerData.levelSrc]) {
            level = LEVEL_IMAGES[sellerData.levelSrc];
        } else {
            const srcMatch = sellerData.levelSrc.match(/L(\d)/i);
            if (srcMatch) level = parseInt(srcMatch[1], 10);
        }
    }

    // 11. Montagem do objeto final no formato esperado por formatSellerData
    const sellerInfo = {
        avatar: sellerData.avatar || '',
        nickname: tName || sellerData.name || '',
        level,
        followers: followersCount,
        monthsActive: 0,
        salesCount,
        positiveRating: 0,
        sesameCreditScore: 0,
        description: (tDesc || '').replace(/\n/g, '<br/>'),
        location: tLoc || '',
        reviewsText: sellerData.reviewsText || '',
        productsText: productsText || '',
        rawData: {
            extractionMethod: 'extension_flow',
            rawFollowers,
            rawLocation,
            rawName: sellerData.name,
            levelSrc: sellerData.levelSrc
        }
    };

    // 12. Mesclagem com MTOP API para preencher buracos (positiveRating, sesame etc).
    //     Também serve como rede de segurança se a DOM tiver mudado os hashes das classes.
    if (mtopApiData) {
        const apiInfo = parseMtopApiData(mtopApiData);
        if (apiInfo) {
            if (!sellerInfo.nickname) sellerInfo.nickname = apiInfo.nickname || '';
            if (!sellerInfo.avatar) sellerInfo.avatar = apiInfo.avatar || '';
            if (sellerInfo.level === 0) sellerInfo.level = apiInfo.level || 0;
            if (sellerInfo.followers === 0) sellerInfo.followers = apiInfo.followers || 0;
            if (sellerInfo.salesCount === 0) sellerInfo.salesCount = apiInfo.salesCount || 0;
            if (sellerInfo.positiveRating === 0) sellerInfo.positiveRating = apiInfo.positiveRating || 0;
            if (sellerInfo.sesameCreditScore === 0) sellerInfo.sesameCreditScore = apiInfo.sesameCreditScore || 0;
            Object.assign(sellerInfo.rawData, apiInfo.rawData, {
                extractionMethod: sellerInfo.nickname === apiInfo.nickname && !sellerData.name
                    ? 'mtop_api_fallback'
                    : 'extension_flow+mtop'
            });
        }
    }

    console.log('[SellerAnalyzer] Dados extraídos (extensão):', {
        nickname: sellerInfo.nickname,
        followers: sellerInfo.followers,
        salesCount: sellerInfo.salesCount,
        level: sellerInfo.level,
        productsText: sellerInfo.productsText,
        reviewsText: sellerInfo.reviewsText
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
        description: seller.description || '',
        location: seller.location || '',
        reviewsText: seller.reviewsText || '',
        productsText: seller.productsText || '',
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
