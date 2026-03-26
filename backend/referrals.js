/**
 * Referral System Module
 * 
 * Handles all referral/affiliate logic:
 * - Validate referral codes
 * - Apply referral benefits (15% discount + 10 bonus credits for referred)
 * - Give referrer bonus (15 credits)
 * - Track referral history
 */

import supabase from './supabase.js';

// Constants
export const REFERRAL_DISCOUNT_PERCENT = 15;
export const REFERRED_BONUS_CREDITS = 10;
export const REFERRER_BONUS_CREDITS = 15;

/**
 * Validate a referral code exists and is not self-referral
 * @param {string} refCode - The referral code to validate
 * @param {string|null} userId - Current user ID (to prevent self-referral)
 * @returns {Promise<{valid: boolean, error?: string, referrer?: object}>}
 */
export async function validateRefCode(refCode, userId = null) {
    if (!refCode || refCode.length !== 7) {
        return { valid: false, error: 'Código inválido' };
    }

    const { data: referrer, error } = await supabase
        .from('users')
        .select('id, ref_id, name')
        .ilike('ref_id', refCode)
        .single();

    if (error || !referrer) {
        return { valid: false, error: 'Código não encontrado' };
    }

    // Prevent self-referral
    if (userId && referrer.id === userId) {
        return { valid: false, error: 'Você não pode usar seu próprio código' };
    }

    return { valid: true, referrer };
}

/**
 * Get user's referral code
 * @param {string} userId
 * @returns {Promise<string|null>}
 */
export async function getUserRefCode(userId) {
    const { data, error } = await supabase
        .from('users')
        .select('ref_id')
        .eq('id', userId)
        .single();

    if (error) {
        console.error('[Referral] Error getting ref code:', error);
        return null;
    }

    return data?.ref_id || null;
}

/**
 * Get user's stored referral code (if registered via ref link)
 * @param {string} userId
 * @returns {Promise<{code: string|null, used: boolean}|null>}
 */
export async function getUserStoredRefCode(userId) {
    const { data, error } = await supabase
        .from('users')
        .select('referred_by_code, referral_used_at')
        .eq('id', userId)
        .single();

    if (error || !data) return null;

    return {
        code: data.referred_by_code,
        used: !!data.referral_used_at
    };
}

/**
 * Apply referral benefits when user purchases a plan
 * Returns the discount info and updates the database
 * @param {string} userId - The user making the purchase
 * @param {number} planPrice - Original plan price
 * @param {string} planId - Plan identifier (e.g., 'bronze', 'silver', 'gold')
 * @returns {Promise<{applied: boolean, discount: number, finalPrice: number, bonusCredits?: number}>}
 */
export async function applyReferralBenefits(userId, planPrice, planId = null) {
    // Check if user has a stored referral code that hasn't been used
    const { data: user, error: userError } = await supabase
        .from('users')
        .select('referred_by_code, referred_by_id, referral_used_at, bonus_credits_received')
        .eq('id', userId)
        .single();

    if (userError || !user || !user.referred_by_code || user.referral_used_at) {
        // No referral or already used
        return { applied: false, discount: 0, finalPrice: planPrice };
    }

    const discount = planPrice * (REFERRAL_DISCOUNT_PERCENT / 100);
    const finalPrice = planPrice - discount;
    const now = new Date().toISOString();

    // SECURITY (H3): Atomically claim the referral — only succeeds if referral_used_at is still NULL
    // This prevents two concurrent requests from both consuming the referral
    const { data: currentUser, error: claimError } = await supabase
        .from('users')
        .select('credits, credits_package')
        .eq('id', userId)
        .is('referral_used_at', null)  // Atomic guard — only matches if not yet claimed
        .single();

    if (claimError || !currentUser) {
        console.warn(`[Referral] Referral already claimed by another request for user ${userId}`);
        return { applied: false, discount: 0, finalPrice: planPrice, error: 'Referral já utilizado' };
    }

    const newReferredCredits = (currentUser?.credits || 0) + REFERRED_BONUS_CREDITS;
    const newReferredPackage = (currentUser?.credits_package || 0) + REFERRED_BONUS_CREDITS;

    // Atomic update: only succeeds if referral_used_at is STILL null (race protection)
    const { data: claimResult, error: updateRefError } = await supabase
        .from('users')
        .update({
            referral_used_at: now,
            credits: newReferredCredits,
            credits_package: newReferredPackage,
            bonus_credits_received: true
        })
        .eq('id', userId)
        .is('referral_used_at', null) // Double-guard: atomic claim
        .select('id')
        .single();

    if (updateRefError || !claimResult) {
        console.warn(`[Referral] Atomic claim failed for user ${userId} — likely concurrent request`);
        return { applied: false, discount: 0, finalPrice: planPrice, error: 'Erro ao aplicar benefícios' };
    }

    // 2. Give bonus credits to referrer (also as package credits — permanent)
    const { data: referrerData } = await supabase
        .from('users')
        .select('credits, credits_package')
        .eq('id', user.referred_by_id)
        .single();

    const newReferrerCredits = (referrerData?.credits || 0) + REFERRER_BONUS_CREDITS;
    const newReferrerPackage = (referrerData?.credits_package || 0) + REFERRER_BONUS_CREDITS;

    const { error: updateReferrerError } = await supabase
        .from('users')
        .update({
            credits: newReferrerCredits,
            credits_package: newReferrerPackage
        })
        .eq('id', user.referred_by_id);

    if (updateReferrerError) {
        console.error('[Referral] Error updating referrer credits:', updateReferrerError);
    }

    // 3. Log in referral history
    const { error: historyError } = await supabase.from('referral_history').insert({
        referrer_id: user.referred_by_id,
        referred_id: userId,
        ref_code: user.referred_by_code,
        plan_purchased_at: now,
        plan_id: planId,
        discount_amount: discount,
        referrer_credits_given: REFERRER_BONUS_CREDITS,
        referred_credits_given: REFERRED_BONUS_CREDITS
    });

    if (historyError) {
        console.error('[Referral] Error logging history:', historyError);
    }

    console.log(`[Referral] Benefits applied: User ${userId} got ${REFERRED_BONUS_CREDITS} credits, referrer ${user.referred_by_id} got ${REFERRER_BONUS_CREDITS} credits`);

    return {
        applied: true,
        discount,
        finalPrice,
        bonusCredits: REFERRED_BONUS_CREDITS,
        referrerBonusCredits: REFERRER_BONUS_CREDITS
    };
}

/**
 * Store a referral code for a user (to be used on first purchase)
 * Only works if user doesn't already have a stored code
 * @param {string} userId
 * @param {string} refCode
 * @returns {Promise<{success: boolean, error?: string, referrerName?: string}>}
 */
export async function storeRefCodeForUser(userId, refCode) {
    // Check if user already has a referral code stored
    const { data: user } = await supabase
        .from('users')
        .select('referred_by_code')
        .eq('id', userId)
        .single();

    if (user?.referred_by_code) {
        return { success: false, error: 'Você já possui um código de referência', locked: true };
    }

    // Validate the code (passes userId for self-referral check inside validateRefCode)
    const validation = await validateRefCode(refCode, userId);
    if (!validation.valid) {
        return { success: false, error: validation.error };
    }

    // SECURITY (LOG-08): Explicit self-referral guard — mandatory, independent of validateRefCode
    if (validation.referrer.id === userId) {
        console.warn(`[Referral] Self-referral blocked in storeRefCodeForUser for user ${userId}`);
        return { success: false, error: 'Você não pode usar seu próprio código' };
    }

    // Store the code
    const { error: updateError } = await supabase
        .from('users')
        .update({
            referred_by_code: validation.referrer.ref_id,
            referred_by_id: validation.referrer.id
        })
        .eq('id', userId);

    if (updateError) {
        console.error('[Referral] Error storing ref code:', updateError);
        return { success: false, error: 'Erro ao salvar código' };
    }

    // Log the referral registration (without purchase yet)
    await supabase.from('referral_history').insert({
        referrer_id: validation.referrer.id,
        referred_id: userId,
        ref_code: validation.referrer.ref_id,
        registered_at: new Date().toISOString()
    });

    console.log(`[Referral] Code ${refCode} stored for user ${userId}`);

    return { success: true, referrerName: validation.referrer.name };
}

/**
 * Get referral statistics for a user
 * @param {string} userId
 * @returns {Promise<{totalReferred: number, completedPurchases: number, totalCreditsEarned: number, history: Array}>}
 */
export async function getReferralStats(userId) {
    const { data: history, error } = await supabase
        .from('referral_history')
        .select('*')
        .eq('referrer_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('[Referral] Error getting stats:', error);
        return {
            totalReferred: 0,
            completedPurchases: 0,
            totalCreditsEarned: 0,
            history: []
        };
    }

    const totalReferred = history?.length || 0;
    const completedPurchases = history?.filter(h => h.plan_purchased_at)?.length || 0;
    const totalCreditsEarned = history?.reduce((sum, h) => sum + (h.referrer_credits_given || 0), 0) || 0;

    return {
        totalReferred,
        completedPurchases,
        totalCreditsEarned,
        history: history || []
    };
}

export default {
    validateRefCode,
    getUserRefCode,
    getUserStoredRefCode,
    applyReferralBenefits,
    storeRefCodeForUser,
    getReferralStats,
    REFERRAL_DISCOUNT_PERCENT,
    REFERRED_BONUS_CREDITS,
    REFERRER_BONUS_CREDITS
};
