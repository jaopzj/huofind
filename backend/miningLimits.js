/**
 * Mining Credits System
 * 
 * Sistema UNIFICADO para controle de créditos de mineração.
 * TODOS os usuários devem estar autenticados.
 * 
 * Tiers (Créditos Mensais):
 * - guest: Usuário logado sem plano (3 créditos, não renova)
 * - bronze: Plano básico (50 créditos/mês | Max 100 produtos)
 * - silver/prata: Plano intermediário (150 créditos/mês | Max 200 produtos)
 * - gold/ouro: Plano premium (300 créditos/mês | Max 500 produtos)
 */

import supabase from './supabase.js';
import { getTierByName, getTierCredits, isTierRenewable } from './tiers.js';

// ============================================
// CONFIGURAÇÃO DE CRÉDITOS
// ============================================

export const TIER_CREDITS = {
    guest: 3,
    bronze: 50,
    silver: 150,
    gold: 300
};

// Limite de produtos por operação de mineração
export const TIER_MINING_MAX_PRODUCTS = {
    guest: 30,
    bronze: 100,
    silver: 200,
    gold: 500
};

// ============================================
// SESSÕES ATIVAS (MEMÓRIA)
// ============================================

const activeSessions = new Map(); // userId -> { startTime, url }

// ============================================
// FUNÇÕES PRINCIPAIS
// ============================================

/**
 * Busca dados de créditos do usuário no Supabase
 * @param {string} userId - ID do usuário
 * @returns {Promise<{tier: string, credits: number, creditsLastReset: Date, email: string}>}
 */
export async function getUserCreditsData(userId) {
    console.log(`[Credits] 🔍 Buscando dados do usuário: ${userId}`);

    try {
        const { data, error } = await supabase
            .from('users')
            .select('email, tier, credits, credits_last_reset')
            .eq('id', userId)
            .single();

        if (error) {
            console.error(`[Credits] ❌ Erro ao buscar usuário: ${error.message}`);
            return { tier: 'guest', credits: 0, creditsLastReset: null, email: 'unknown' };
        }

        const result = {
            email: data.email || 'unknown',
            tier: data.tier || 'guest',
            credits: data.credits ?? getTierCredits(data.tier || 'guest'),
            creditsLastReset: data.credits_last_reset ? new Date(data.credits_last_reset) : null
        };

        console.log(`[Credits] 📋 Usuário: ${result.email} | Tier: ${result.tier} | Créditos: ${result.credits}`);
        return result;

    } catch (err) {
        console.error(`[Credits] ❌ Erro: ${err.message}`);
        return { tier: 'guest', credits: 0, creditsLastReset: null, email: 'unknown' };
    }
}

/**
 * Verifica se o usuário precisa de renovação de créditos e renova se necessário
 * @param {string} userId - ID do usuário
 * @returns {Promise<{renewed: boolean, newCredits: number|null}>}
 */
export async function checkAndRenewCredits(userId) {
    console.log(`[Credits] 🔄 Verificando renovação para: ${userId}`);

    try {
        const userData = await getUserCreditsData(userId);
        
        // Guest não renova
        if (!isTierRenewable(userData.tier)) {
            console.log(`[Credits] ⏭️ Tier ${userData.tier} não renova créditos`);
            return { renewed: false, newCredits: null };
        }

        const lastReset = userData.creditsLastReset;
        const now = new Date();
        
        // Se não tem data de reset, define agora (primeira vez)
        if (!lastReset) {
            const tierCredits = getTierCredits(userData.tier);
            await supabase
                .from('users')
                .update({ 
                    credits: tierCredits, 
                    credits_last_reset: now.toISOString() 
                })
                .eq('id', userId);
            
            console.log(`[Credits] 🆕 Primeira renovação: ${tierCredits} créditos`);
            return { renewed: true, newCredits: tierCredits };
        }

        // Verificar se passou 30 dias
        const daysSinceReset = Math.floor((now - lastReset) / (1000 * 60 * 60 * 24));
        
        if (daysSinceReset >= 30) {
            const tierCredits = getTierCredits(userData.tier);
            
            await supabase
                .from('users')
                .update({ 
                    credits: tierCredits, 
                    credits_last_reset: now.toISOString() 
                })
                .eq('id', userId);
            
            console.log(`[Credits] ✅ Renovação realizada: ${tierCredits} créditos (${daysSinceReset} dias desde último reset)`);
            return { renewed: true, newCredits: tierCredits };
        }

        console.log(`[Credits] ⏳ Sem renovação: ${30 - daysSinceReset} dias restantes`);
        return { renewed: false, newCredits: null };

    } catch (err) {
        console.error(`[Credits] ❌ Erro na renovação: ${err.message}`);
        return { renewed: false, newCredits: null };
    }
}

/**
 * Calcula a data da próxima renovação
 * @param {Date} lastReset - Data do último reset
 * @returns {Date|null}
 */
export function getNextRenewalDate(lastReset) {
    if (!lastReset) return null;
    const nextRenewal = new Date(lastReset);
    nextRenewal.setDate(nextRenewal.getDate() + 30);
    return nextRenewal;
}

/**
 * Verifica se o usuário pode minerar (tem créditos)
 * @param {string} userId - ID do usuário
 * @returns {Promise<{allowed: boolean, reason?: string, tier: string, credits: number, maxCredits: number}>}
 */
export async function checkCredits(userId) {
    console.log(`[Credits] ⚡ Verificando créditos para: ${userId}`);

    // Primeiro, verificar e renovar créditos se necessário
    await checkAndRenewCredits(userId);
    
    // Buscar dados atualizados
    const userData = await getUserCreditsData(userId);
    const maxCredits = getTierCredits(userData.tier);

    console.log(`[Credits] 📊 ${userData.email}: ${userData.credits}/${maxCredits} créditos (${userData.tier})`);

    // Verificar se tem créditos
    if (userData.credits <= 0) {
        const tierInfo = getTierByName(userData.tier);
        console.log(`[Credits] 🚫 SEM CRÉDITOS: ${userData.credits}`);

        return {
            allowed: false,
            reason: `Você não tem créditos disponíveis. ${tierInfo.isRenewable ? 'Seus créditos serão renovados mensalmente.' : 'Faça upgrade para um plano pago para mais créditos.'}`,
            tier: userData.tier,
            credits: userData.credits,
            maxCredits
        };
    }

    console.log(`[Credits] ✅ Mineração PERMITIDA: ${userData.credits} créditos disponíveis`);

    return {
        allowed: true,
        tier: userData.tier,
        credits: userData.credits,
        maxCredits,
        nextRenewal: isTierRenewable(userData.tier) ? getNextRenewalDate(userData.creditsLastReset) : null
    };
}

/**
 * Consome 1 crédito do usuário
 * @param {string} userId - ID do usuário
 * @returns {Promise<number|null>} - Novo saldo de créditos ou null se falhou
 */
export async function consumeCredit(userId) {
    console.log(`[Credits] ⬇️ Consumindo 1 crédito de: ${userId}`);

    try {
        // Buscar valor atual
        const { data: user, error: fetchError } = await supabase
            .from('users')
            .select('email, credits')
            .eq('id', userId)
            .single();

        if (fetchError) {
            console.error(`[Credits] ❌ Erro ao buscar: ${fetchError.message}`);
            return null;
        }

        const currentCredits = user?.credits ?? 0;
        const newCredits = Math.max(0, currentCredits - 1);

        console.log(`[Credits] 📉 ${user?.email}: ${currentCredits} → ${newCredits}`);

        // Atualizar no Supabase
        const { error: updateError } = await supabase
            .from('users')
            .update({ credits: newCredits })
            .eq('id', userId);

        if (updateError) {
            console.error(`[Credits] ❌ Erro ao atualizar: ${updateError.message}`);
            return null;
        }

        console.log(`[Credits] ✅ Crédito consumido. Saldo: ${newCredits}`);
        return newCredits;

    } catch (err) {
        console.error(`[Credits] ❌ Erro: ${err.message}`);
        return null;
    }
}

// ============================================
// CONTROLE DE SESSÕES ATIVAS
// ============================================

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

    // Auto-limpar após 10 minutos
    setTimeout(() => {
        if (activeSessions.has(userId)) {
            activeSessions.delete(userId);
            console.log(`[Credits] 🧹 Sessão expirada limpa: ${userId}`);
        }
    }, 10 * 60 * 1000);
}

/**
 * Finaliza sessão de mineração
 */
export function endMiningSession(userId) {
    console.log(`[Credits] 🔴 Finalizando sessão: ${userId}`);
    activeSessions.delete(userId);
}

// ============================================
// MIDDLEWARE EXPRESS
// ============================================

/**
 * Middleware que verifica autenticação e créditos
 * REQUER que o usuário esteja autenticado
 */
export async function miningLimitMiddleware(req, res, next) {
    console.log('\n[Credits] ═══════════════════════════════════════');
    console.log('[Credits] 📥 Nova requisição de mineração');

    // 1. Verificar autenticação
    if (!req.user?.id) {
        console.log('[Credits] ❌ Usuário NÃO autenticado');
        return res.status(401).json({
            error: 'Autenticação necessária',
            message: 'Você precisa fazer login para minerar.',
            code: 'AUTH_REQUIRED'
        });
    }

    const userId = req.user.id;
    console.log(`[Credits] 👤 Usuário autenticado: ${userId}`);

    // 2. Verificar se já está minerando
    if (isUserMining(userId)) {
        console.log('[Credits] ⏳ Mineração já em andamento');
        return res.status(429).json({
            error: 'Mineração em andamento',
            message: 'Você já tem uma mineração em andamento. Aguarde sua conclusão.',
            code: 'CONCURRENT_MINING'
        });
    }

    // 3. Verificar créditos
    const creditsCheck = await checkCredits(userId);

    if (!creditsCheck.allowed) {
        console.log('[Credits] 🚫 Sem créditos - bloqueando');
        return res.status(429).json({
            error: 'Sem créditos disponíveis',
            message: creditsCheck.reason,
            code: 'NO_CREDITS',
            tier: creditsCheck.tier,
            credits: creditsCheck.credits,
            maxCredits: creditsCheck.maxCredits,
            upgrade: creditsCheck.tier === 'guest'
        });
    }

    // 4. Tudo OK - adicionar info ao request
    req.miningInfo = {
        tier: creditsCheck.tier,
        credits: creditsCheck.credits,
        maxCredits: creditsCheck.maxCredits,
        nextRenewal: creditsCheck.nextRenewal
    };

    console.log('[Credits] ✅ Mineração AUTORIZADA');
    console.log('[Credits] ═══════════════════════════════════════\n');

    next();
}

// Aliases para compatibilidade
export const getUserMiningData = getUserCreditsData;
export const checkMiningLimit = checkCredits;
export const incrementMiningCount = consumeCredit;
export const TIER_LIMITS = TIER_CREDITS;

export default {
    getUserCreditsData,
    checkAndRenewCredits,
    getNextRenewalDate,
    checkCredits,
    consumeCredit,
    isUserMining,
    startMiningSession,
    endMiningSession,
    miningLimitMiddleware,
    TIER_CREDITS,
    TIER_MINING_MAX_PRODUCTS,
    // Aliases for backward compatibility
    getUserMiningData: getUserCreditsData,
    checkMiningLimit: checkCredits,
    incrementMiningCount: consumeCredit,
    TIER_LIMITS: TIER_CREDITS
};
