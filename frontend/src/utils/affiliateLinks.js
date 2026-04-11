/**
 * Utilitário EVO Society para intercepção e formatação de links de afiliados.
 */

export const formatAffiliateUrl = (href) => {
    if (!href) return href;
    try {
        const url = new URL(href);
        // Intercepta requisições de página de produto da Hoobuy
        if (url.hostname.includes('hoobuy.com') && url.pathname.includes('/product/')) {
            const parts = url.pathname.split('/').filter(p => !!p);
            const productId = parts[parts.length - 1];
            if (productId) {
                // Adiciona os UTMs e o inviteCode centralizado
                return `${url.origin}${url.pathname}?utm_source=website&utm_medium=share&utm_campaign=product_details&utm_content=${productId}&inviteCode=6EDjePGR`;
            }
        }
    } catch (e) {
        // Fallback silencioso em caso de URL inválida
    }
    return href;
};
