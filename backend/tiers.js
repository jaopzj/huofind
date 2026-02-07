/**
 * Account Tier System - Credits Based
 * 
 * Defines credits based on user subscription tier
 * 
 * Tiers:
 * - Guest (logado sem assinatura): 3 créditos (não renova)
 * - Bronze: 50 créditos/mês
 * - Silver/Prata: 150 créditos/mês
 * - Gold/Ouro: 300 créditos/mês
 */

// Tier definitions with credits
export const TIERS = {
    GUEST: {
        name: 'guest',
        displayName: 'Visitante',
        credits: 3,
        isRenewable: false,
        description: 'Conta gratuita com 3 créditos'
    },
    BRONZE: {
        name: 'bronze',
        displayName: 'Bronze',
        credits: 50,
        isRenewable: true,
        description: 'Plano Bronze com 50 créditos mensais'
    },
    SILVER: {
        name: 'silver',
        displayName: 'Prata',
        credits: 150,
        isRenewable: true,
        description: 'Plano Prata com 150 créditos mensais'
    },
    GOLD: {
        name: 'gold',
        displayName: 'Ouro',
        credits: 300,
        isRenewable: true,
        description: 'Plano Ouro com 300 créditos mensais'
    }
};

// Convenience mapping for credits and limits
export const TIER_CREDITS = {
    guest: { credits: 3, maxProducts: 30 },
    bronze: { credits: 50, maxProducts: 50 },
    silver: { credits: 150, maxProducts: 150 },
    gold: { credits: 300, maxProducts: 1000 }
};

/**
 * Get tier by name
 * Guest = usuário logado sem plano pago
 */
export const getTierByName = (tierName) => {
    const normalized = (tierName || 'guest').toLowerCase();
    switch (normalized) {
        case 'guest':
        case 'convidado':
            return TIERS.GUEST;
        case 'bronze':
        case 'explorador':
            return TIERS.BRONZE;
        case 'silver':
        case 'prata':
        case 'escavador':
            return TIERS.SILVER;
        case 'gold':
        case 'ouro':
        case 'minerador':
            return TIERS.GOLD;
        default:
            return TIERS.GUEST; // Unknown tiers default to guest
    }
};

/**
 * Get credits for a tier
 */
export const getTierCredits = (tierName) => {
    const tier = getTierByName(tierName);
    return tier.credits;
};

/**
 * Check if tier has renewable credits
 */
export const isTierRenewable = (tierName) => {
    const tier = getTierByName(tierName);
    return tier.isRenewable;
};

/**
 * Check if user can mine based on their credits
 * @param {number} currentCredits - User's current credit balance
 * @returns {object} - { allowed, credits }
 */
export const canUserMine = (currentCredits) => {
    const hasCredits = currentCredits > 0;
    return {
        allowed: hasCredits,
        credits: currentCredits
    };
};

/**
 * Get tier display info for frontend
 */
export const getTierInfo = (tierName) => {
    const tier = getTierByName(tierName);
    return {
        name: tier.name,
        displayName: tier.displayName,
        credits: tier.credits,
        isRenewable: tier.isRenewable,
        description: tier.description
    };
};

export default { TIERS, TIER_CREDITS, getTierByName, getTierCredits, isTierRenewable, canUserMine, getTierInfo };
