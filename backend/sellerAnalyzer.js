/**
 * Analisador de Vendedores Goofish - Sistema de Pontuação de Confiança
 * 
 * Pontuação 0-100 baseada em:
 * - Nível (5-7): 15 pontos
 * - Seguidores (min 1000): 15 pontos
 * - Tempo na plataforma: 20 pontos
 * - Vendas (min 70): 25 pontos
 * - Avaliação positiva: 25 pontos
 */

/**
 * Extrai informações do vendedor da página
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

        // Avatar
        const avatarEl = document.querySelector('img[class*="avatar"]');
        if (avatarEl) {
            info.avatar = avatarEl.src;
        }

        // Nickname
        const nickEl = document.querySelector('[class*="nick"]');
        if (nickEl) {
            info.nickname = nickEl.innerText?.trim();
        }

        // Nível - procura por imagens ou texto com L1-L7
        const levelIcon = document.querySelector('[class*="levelIcon"], [class*="level"]');
        if (levelIcon) {
            // Tenta extrair do src da imagem (ex: L7.png)
            if (levelIcon.src) {
                const levelMatch = levelIcon.src.match(/[Ll](\d)/);
                if (levelMatch) {
                    info.level = parseInt(levelMatch[1], 10);
                }
            }
            // Tenta extrair do alt ou aria-label
            const alt = levelIcon.alt || levelIcon.getAttribute('aria-label') || '';
            const altMatch = alt.match(/(\d)/);
            if (altMatch && info.level === 0) {
                info.level = parseInt(altMatch[1], 10);
            }
        }

        // Fallback: procura texto Lv.X na página
        if (info.level === 0) {
            const allText = document.body.innerText;
            const lvMatch = allText.match(/[Ll][Vv]\.?\s*(\d)/);
            if (lvMatch) {
                info.level = parseInt(lvMatch[1], 10);
            }
        }

        // Seguidores - procura por "X粉丝" ou "Xw粉丝" (w = 万 = 10000)
        const pageText = document.body.innerText;
        const followersMatch = pageText.match(/([\d.]+)\s*[wW万]?\s*粉丝/);
        if (followersMatch) {
            let count = parseFloat(followersMatch[1]);
            // Se tem 'w' ou '万', multiplica por 10000
            if (followersMatch[0].includes('w') || followersMatch[0].includes('万')) {
                count = count * 10000;
            }
            info.followers = Math.round(count);
            info.rawData.followersText = followersMatch[0];
        }

        // Tempo na plataforma - procura "X年" (anos) ou "X天" (dias) ou "X天来闲鱼"
        const timePatterns = [
            /([\d.]+)\s*年来?闲鱼/,  // X anos no Xianyu
            /([\d.]+)\s*年老店/,      // X anos loja antiga
            /([\d]+)\s*天来?闲鱼/,   // X dias no Xianyu
        ];

        for (const pattern of timePatterns) {
            const timeMatch = pageText.match(pattern);
            if (timeMatch) {
                const value = parseFloat(timeMatch[1]);
                if (timeMatch[0].includes('年')) {
                    // Anos -> meses
                    info.monthsActive = Math.round(value * 12);
                } else if (timeMatch[0].includes('天')) {
                    // Dias -> meses
                    info.monthsActive = Math.round(value / 30);
                }
                info.rawData.platformTimeText = timeMatch[0];
                break;
            }
        }

        // Vendas - procura "已售出 XXXX"
        const salesMatch = pageText.match(/已售出\s*([\d,]+)/);
        if (salesMatch) {
            info.salesCount = parseInt(salesMatch[1].replace(/,/g, ''), 10);
            info.rawData.salesText = salesMatch[0];
        }

        // Sesame Credit (芝麻分) - bônus de confiança
        const sesameMatch = pageText.match(/芝麻分?\s*[:：]?\s*(\d+)/);
        if (sesameMatch) {
            info.sesameCreditScore = parseInt(sesameMatch[1], 10);
            info.rawData.sesameText = sesameMatch[0];
        }

        // Taxa de avaliação positiva - procura "X好评" vs "全部X"
        const positiveMatch = pageText.match(/(\d+)\s*好评/);
        const totalMatch = pageText.match(/全部\s*(\d+)/);
        if (positiveMatch && totalMatch) {
            const positive = parseInt(positiveMatch[1], 10);
            const total = parseInt(totalMatch[1], 10);
            if (total > 0) {
                info.positiveRating = Math.round((positive / total) * 100);
            }
        } else if (positiveMatch) {
            // Se não encontrou total, assume 95% como baseline
            info.positiveRating = 95;
        }

        return info;
    });

    console.log('[SellerAnalyzer] Dados extraídos:', {
        level: sellerInfo.level,
        followers: sellerInfo.followers,
        monthsActive: sellerInfo.monthsActive,
        salesCount: sellerInfo.salesCount,
        positiveRating: sellerInfo.positiveRating,
        sesameCreditScore: sellerInfo.sesameCreditScore
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

    if (followers >= 50000) {
        breakdown.followers = 50;      // 50k+ = máximo
    } else if (followers >= 30000) {
        breakdown.followers = 45;      // 30-50k = excelente
    } else if (followers >= 20000) {
        breakdown.followers = 40;      // 20-30k = muito bom
    } else if (followers >= 10000) {
        breakdown.followers = 35;      // 10-20k = bom
    } else if (followers >= 5000) {
        breakdown.followers = 28;      // 5-10k = acima da média
    } else if (followers >= 3000) {
        breakdown.followers = 22;      // 3-5k = médio-alto
    } else if (followers >= 1000) {
        breakdown.followers = 15;      // 1-3k = médio
    } else if (followers >= 500) {
        breakdown.followers = 8;       // 500-1k = baixo
    } else {
        breakdown.followers = 0;       // <500 = não pontua
    }
    score += breakdown.followers;

    // ========================================
    // VENDAS CONCLUÍDAS (0-50 pontos)
    // Escala progressiva e realista
    // ========================================
    const sales = seller.salesCount || 0;

    if (sales >= 3000) {
        breakdown.sales = 50;          // 10k+ vendas = máximo
    } else if (sales >= 2000) {
        breakdown.sales = 45;          // 5-10k = excelente
    } else if (sales >= 1500) {
        breakdown.sales = 40;          // 2-5k = muito bom
    } else if (sales >= 1000) {
        breakdown.sales = 35;          // 1-2k = bom
    } else if (sales >= 500) {
        breakdown.sales = 28;          // 500-1k = acima da média
    } else if (sales >= 200) {
        breakdown.sales = 22;          // 200-500 = médio-alto
    } else if (sales >= 100) {
        breakdown.sales = 15;          // 100-200 = médio
    } else if (sales >= 50) {
        breakdown.sales = 8;           // 50-100 = baixo
    } else {
        breakdown.sales = 0;           // <50 = não pontua
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
    } else if (score >= 60) {
        classification = 'Moderado';
        classificationColor = 'yellow';
        classificationIcon = '⚠️';
    } else if (score >= 40) {
        classification = 'Iniciante';
        classificationColor = 'orange';
        classificationIcon = '🆕';
    } else {
        classification = 'Atenção';
        classificationColor = 'red';
        classificationIcon = '🚨';
    }

    return {
        score,
        breakdown,
        classification,
        classificationColor,
        classificationIcon,
        isTrustworthy: score >= 80
    };
}

/**
 * Formata os dados do vendedor para exibição
 */
export function formatSellerData(sellerInfo, trustResult) {
    return {
        ...sellerInfo,
        ...trustResult,
        followersFormatted: formatNumber(sellerInfo.followers),
        salesFormatted: formatNumber(sellerInfo.salesCount),
        platformTimeFormatted: formatPlatformTime(sellerInfo.monthsActive)
    };
}

function formatNumber(num) {
    if (num >= 10000) {
        return (num / 10000).toFixed(1) + '万';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
}

function formatPlatformTime(months) {
    if (months >= 12) {
        const years = Math.floor(months / 12);
        const remainingMonths = months % 12;
        if (remainingMonths > 0) {
            return `${years} ano${years > 1 ? 's' : ''} e ${remainingMonths} mês${remainingMonths > 1 ? 'es' : ''}`;
        }
        return `${years} ano${years > 1 ? 's' : ''}`;
    }
    return `${months} mês${months > 1 ? 'es' : ''}`;
}

export default {
    extractSellerInfo,
    calculateTrustScore,
    formatSellerData
};
