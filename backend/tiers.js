/**
 * Account Tier System
 * 
 * Defines mining limits based on user subscription tier
 * 
 * Tiers:
 * - Bronze (free): 50 minings total
 * - Silver: 150 minings total
 * - Gold: Unlimited minings
 */

// Tier definitions
export const TIERS = {
    GUEST: {
        name: 'guest',
        displayName: 'Visitante',
        miningLimit: 10,
        description: 'Plano gratuito com 10 minerações'
    },
    BRONZE: {
        name: 'bronze',
        displayName: 'Bronze',
        miningLimit: 50,
        description: 'Plano pago com 50 minerações'
    },
    SILVER: {
        name: 'silver',
        displayName: 'Prata',
        miningLimit: 150,
        description: 'Plano Prata com 150 minerações'
    },
    GOLD: {
        name: 'gold',
        displayName: 'Ouro',
        miningLimit: Infinity, // Unlimited
        description: 'Plano Ouro com minerações ilimitadas'
    }
};

/**
 * Get tier by name
 * Guest = usuário logado sem plano pago
 */
export const getTierByName = (tierName) => {
    const normalized = (tierName || 'guest').toLowerCase();
    switch (normalized) {
        case 'guest':
            return TIERS.GUEST;
        case 'bronze':
            return TIERS.BRONZE;
        case 'silver':
        case 'prata':
            return TIERS.SILVER;
        case 'gold':
        case 'ouro':
            return TIERS.GOLD;
        default:
            return TIERS.GUEST; // Unknown tiers default to guest
    }
};

/**
 * Check if user can mine based on their tier and usage
 */
export const canUserMine = (userTier, miningCount) => {
    const tier = getTierByName(userTier);

    if (tier.miningLimit === Infinity) {
        return { allowed: true, remaining: Infinity };
    }

    const remaining = tier.miningLimit - (miningCount || 0);
    return {
        allowed: remaining > 0,
        remaining: Math.max(0, remaining),
        limit: tier.miningLimit,
        tier: tier.name
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
        limit: tier.miningLimit === Infinity ? 'Ilimitado' : tier.miningLimit,
        description: tier.description
    };
};

export default { TIERS, getTierByName, canUserMine, getTierInfo };
