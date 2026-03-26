/**
 * Centralized Tier Normalization
 * Single source of truth for tier name handling.
 *
 * Canonical names: 'guest', 'bronze', 'silver', 'gold'
 * All normalizations across the app must go through normalizeTier().
 */

/**
 * Normalize any tier name variant to canonical English form.
 * Handles legacy Portuguese names, role-based names, and English names.
 * @param {string} tierName - Raw tier name from DB or API
 * @returns {'guest' | 'bronze' | 'silver' | 'gold'}
 */
export function normalizeTier(tierName) {
    const t = (tierName || 'guest').toLowerCase().trim();
    if (t === 'gold' || t === 'ouro' || t === 'minerador') return 'gold';
    if (t === 'silver' || t === 'prata' || t === 'escavador') return 'silver';
    if (t === 'bronze' || t === 'explorador') return 'bronze';
    return 'guest';
}

/**
 * Display names for each canonical tier (Portuguese).
 */
export const TIER_DISPLAY_NAME = {
    guest: 'Visitante',
    bronze: 'Bronze',
    silver: 'Prata',
    gold: 'Ouro',
};

/**
 * Role-based display names used in profile/sidebar.
 */
export const TIER_ROLE_NAME = {
    guest: 'Convidado',
    bronze: 'Explorador',
    silver: 'Escavador',
    gold: 'Minerador',
};

/**
 * Maps canonical tier names to backend subscription plan IDs.
 * The backend SUBSCRIPTION_PLANS uses Portuguese keys for Stripe compatibility.
 */
export const TIER_TO_PLAN_ID = {
    bronze: 'bronze',
    silver: 'prata',
    gold: 'ouro',
};
