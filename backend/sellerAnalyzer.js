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
export async function extractSellerInfo(page) {
    console.log('[SellerAnalyzer] Extraindo informações do vendedor...');

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

        // ========================================
        // LEVEL - img com levelIcon no class
        // Exemplo: img.levelIcon--x9YcHlL5
        // ========================================
        const levelImg = document.querySelector('img[class*="levelIcon"]');
        if (levelImg && levelImg.src) {
            // Extrai L7 do src ou do caminho
            const srcMatch = levelImg.src.match(/L(\d)/i);
            if (srcMatch) {
                info.level = parseInt(srcMatch[1], 10);
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
        const infoCenterSpans = document.querySelectorAll('span[class*="infoCenterText"]');
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

        // ========================================
        // SALES COUNT - via tabs ou texto "已售出 XXXX"
        // ========================================

        // Método 1: Buscar no texto da página "已售出 2419"
        const salesPatterns = [
            /已售出\s*([\d,]+)/,          // 已售出 2419
            /已售\s*([\d,]+)/,            // 已售2419
            /([\d,]+)\s*件?\s*已售/,      // 2419件已售
            /成交\s*([\d,]+)/,            // 成交2419
            /([\d,]+)\s*笔交易/           // 2419笔交易
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
