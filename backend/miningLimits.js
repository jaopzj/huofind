import supabase from './supabase.js';
import { TIER_CREDITS } from './tiers.js';
export { TIER_CREDITS };

// Cache para sessões ativas
const activeSessions = new Map();

/**
 * Busca dados de créditos e limites do usuário
 */
export async function getUserCreditsData(userId) {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('email, tier, credits, credits_last_reset, mining_count')
            .eq('id', userId)
            .single();

        if (error || !data) return null;

        const tierInfo = TIER_CREDITS[data.tier] || TIER_CREDITS.guest;

        // Se credits for NULL (usuário legado), usar o padrão do tier
        const currentCredits = data.credits !== null ? data.credits : tierInfo.credits;

        return {
            email: data.email,
            tier: data.tier,
            credits: currentCredits,
            maxCredits: tierInfo.credits,
            maxProducts: tierInfo.maxProducts,
            lastReset: data.credits_last_reset,
            miningCount: data.mining_count || 0
        };
    } catch (err) {
        console.error('[Credits] Error fetching user data:', err);
        return null;
    }
}

/**
 * Verifica se os créditos precisam de renovação (mensal)
 */
export async function checkAndRenewCredits(userId) {
    try {
        const userData = await getUserCreditsData(userId);
        if (!userData) return null;

        // Bronze, Silver e Gold renovam mensalmente
        if (userData.tier === 'guest') return userData;

        const lastReset = userData.lastReset ? new Date(userData.lastReset) : new Date(0);
        const now = new Date();

        // Verifica se passou 30 dias
        const daysSinceReset = (now - lastReset) / (1000 * 60 * 60 * 24);

        if (daysSinceReset >= 30) {
            console.log(`[Credits] 🔄 Renovando créditos para: ${userData.email}`);

            const tierInfo = TIER_CREDITS[userData.tier] || TIER_CREDITS.guest;

            const { error: updateError } = await supabase
                .from('users')
                .update({
                    credits: tierInfo.credits,
                    credits_last_reset: now.toISOString()
                })
                .eq('id', userId);

            if (updateError) {
                console.error('[Credits] Error renewing credits:', updateError);
            } else {
                userData.credits = tierInfo.credits;
                userData.lastReset = now.toISOString();
            }
        }

        return userData;
    } catch (err) {
        console.error('[Credits] Error checking renewal:', err);
        return null;
    }
}

/**
 * Calcula a data da próxima renovação
 */
export function getNextRenewalDate(lastResetIso) {
    if (!lastResetIso) return null;
    const date = new Date(lastResetIso);
    date.setDate(date.getDate() + 30);
    return date.toISOString();
}

/**
 * Verifica créditos antes de permitir operação
 */
export async function checkCredits(userId) {
    const userData = await checkAndRenewCredits(userId);
    if (!userData) return { allowed: false, reason: 'Erro ao verificar créditos' };

    const tierInfo = TIER_CREDITS[userData.tier] || TIER_CREDITS.guest;

    if (userData.credits <= 0) {
        return {
            allowed: false,
            reason: userData.tier === 'guest' ?
                'Limite de mineração grátis atingido.' :
                'Seus créditos acabaram. Aguarde a renovação ou compre mais.',
            tier: userData.tier,
            credits: 0,
            maxCredits: tierInfo.credits,
            nextRenewal: getNextRenewalDate(userData.lastReset)
        };
    }

    return {
        allowed: true,
        credits: userData.credits,
        maxCredits: tierInfo.credits,
        tier: userData.tier,
        nextRenewal: getNextRenewalDate(userData.lastReset)
    };
}

/**
 * Consome um único crédito (legado/mineração)
 */
export async function consumeCredit(userId) {
    return consumeCredits(userId, 1);
}

/**
 * Consome múltiplos créditos do usuário
 */
export async function consumeCredits(userId, amount) {
    if (amount <= 0) return null;
    console.log(`[Credits] ⬇️ Consumindo ${amount} créditos de: ${userId}`);

    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('credits, tier, email')
            .eq('id', userId)
            .single();

        if (error || !user) {
            console.error('[Credits] Error fetching user for consumption:', error);
            return null;
        }

        const tierInfo = TIER_CREDITS[user.tier] || TIER_CREDITS.guest;
        let currentCredits = user.credits !== null ? user.credits : tierInfo.credits;

        if (currentCredits < amount) {
            console.warn(`[Credits] Insufficient credits for ${user.email}: ${currentCredits} < ${amount}`);
            return null;
        }

        const newBalance = currentCredits - amount;

        const { error: updateError } = await supabase
            .from('users')
            .update({ credits: newBalance })
            .eq('id', userId);

        if (updateError) {
            console.error('[Credits] Error updating credits balance:', updateError);
            return null;
        }

        console.log(`[Credits] ✅ ${user.email}: ${currentCredits} → ${newBalance}`);
        return newBalance;
    } catch (err) {
        console.error('[Credits] Unexpected error in consumeCredits:', err);
        return null;
    }
}

/**
 * Verifica se usuário tem mineração ativa
 */
export function isUserMining(userId) {
    return activeSessions.has(userId);
}

/**
 * Inicia sessão de mineração
 */
export function startMiningSession(userId, url) {
    console.log(`[Credits] 🟢 Iniciando sessão: ${userId}`);
    activeSessions.set(userId, { startTime: Date.now(), url });

    setTimeout(() => {
        if (activeSessions.has(userId)) {
            activeSessions.delete(userId);
            console.log(`[Credits] 🧹 Sessão expirada limpa: ${userId}`);
        }
    }, 10 * 60 * 1000); // 10 min
}

/**
 * Finaliza sessão de mineração
 */
export function endMiningSession(userId) {
    console.log(`[Credits] 🔴 Finalizando sessão: ${userId}`);
    activeSessions.delete(userId);
}

/**
 * Middleware para limites de mineração
 */
export async function miningLimitMiddleware(req, res, next) {
    if (!req.user?.id) return res.status(401).json({ error: 'Auth required' });

    const userId = req.user.id;
    if (isUserMining(userId)) {
        return res.status(429).json({ error: 'Mineração em andamento' });
    }

    const creditsCheck = await checkCredits(userId);
    if (!creditsCheck.allowed) {
        return res.status(429).json({
            error: 'Sem créditos',
            message: creditsCheck.reason,
            credits: creditsCheck.credits
        });
    }

    next();
}

// Aliases e TIER_MINING_MAX_PRODUCTS
export const TIER_MINING_MAX_PRODUCTS = {
    guest: 30,
    bronze: 50,
    silver: 150,
    gold: 1000 // Unlimited-ish
};

export default {
    getUserCreditsData,
    checkAndRenewCredits,
    getNextRenewalDate,
    checkCredits,
    consumeCredit,
    consumeCredits,
    isUserMining,
    startMiningSession,
    endMiningSession,
    miningLimitMiddleware,
    TIER_CREDITS,
    TIER_MINING_MAX_PRODUCTS
};
