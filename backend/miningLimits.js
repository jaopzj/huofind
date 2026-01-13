/**
 * Mining Limits System
 * 
 * Sistema UNIFICADO para controle de limites de mineração.
 * TODOS os usuários devem estar autenticados.
 * 
 * Tiers:
 * - guest: Usuário logado sem plano pago (10 minerações)
 * - bronze: Plano básico (50 minerações)
 * - silver/prata: Plano intermediário (150 minerações)
 * - gold/ouro: Plano premium (ilimitado)
 */

import supabase from './supabase.js';
import { getTierByName } from './tiers.js';

// ============================================
// CONFIGURAÇÃO DE LIMITES
// ============================================

export const TIER_LIMITS = {
    guest: 10,
    bronze: 50,
    silver: 150,
    gold: Infinity
};

// ============================================
// SESSÕES ATIVAS (MEMÓRIA)
// ============================================

const activeSessions = new Map(); // userId -> { startTime, url }

// ============================================
// FUNÇÕES PRINCIPAIS
// ============================================

/**
 * Busca dados de mineração do usuário no Supabase
 * @param {string} userId - ID do usuário
 * @returns {Promise<{tier: string, miningCount: number, email: string}>}
 */
export async function getUserMiningData(userId) {
    console.log(`[MiningLimits] 🔍 Buscando dados do usuário: ${userId}`);

    try {
        const { data, error } = await supabase
            .from('users')
            .select('email, tier, mining_count')
            .eq('id', userId)
            .single();

        if (error) {
            console.error(`[MiningLimits] ❌ Erro ao buscar usuário: ${error.message}`);
            return { tier: 'guest', miningCount: 0, email: 'unknown' };
        }

        const result = {
            email: data.email || 'unknown',
            tier: data.tier || 'guest',
            miningCount: data.mining_count || 0
        };

        console.log(`[MiningLimits] 📋 Usuário: ${result.email} | Tier: ${result.tier} | Minerações: ${result.miningCount}`);
        return result;

    } catch (err) {
        console.error(`[MiningLimits] ❌ Erro: ${err.message}`);
        return { tier: 'guest', miningCount: 0, email: 'unknown' };
    }
}

/**
 * Verifica se o usuário pode minerar
 * @param {string} userId - ID do usuário
 * @returns {Promise<{allowed: boolean, reason?: string, tier: string, used: number, limit: number}>}
 */
export async function checkMiningLimit(userId) {
    console.log(`[MiningLimits] ⚡ Verificando limite para: ${userId}`);

    const { tier, miningCount, email } = await getUserMiningData(userId);
    const limit = TIER_LIMITS[tier] ?? TIER_LIMITS.guest;

    console.log(`[MiningLimits] 📊 ${email}: ${miningCount}/${limit === Infinity ? '∞' : limit} (${tier})`);

    // Verificar limite
    if (limit !== Infinity && miningCount >= limit) {
        const tierInfo = getTierByName(tier);
        console.log(`[MiningLimits] 🚫 LIMITE ATINGIDO: ${miningCount}/${limit}`);

        return {
            allowed: false,
            reason: `Você atingiu o limite de ${limit} minerações do plano ${tierInfo.displayName}. Faça upgrade para continuar.`,
            tier,
            used: miningCount,
            limit
        };
    }

    console.log(`[MiningLimits] ✅ Mineração PERMITIDA: ${miningCount + 1}/${limit === Infinity ? '∞' : limit}`);

    return {
        allowed: true,
        tier,
        used: miningCount,
        limit: limit === Infinity ? 'unlimited' : limit,
        remaining: limit === Infinity ? Infinity : (limit - miningCount)
    };
}

/**
 * Incrementa o contador de minerações no Supabase
 * @param {string} userId - ID do usuário
 * @returns {Promise<number|null>} - Novo valor ou null se falhou
 */
export async function incrementMiningCount(userId) {
    console.log(`[MiningLimits] ⬆️ Incrementando mining_count para: ${userId}`);

    try {
        // Buscar valor atual
        const { data: user, error: fetchError } = await supabase
            .from('users')
            .select('email, mining_count')
            .eq('id', userId)
            .single();

        if (fetchError) {
            console.error(`[MiningLimits] ❌ Erro ao buscar: ${fetchError.message}`);
            return null;
        }

        const currentCount = user?.mining_count || 0;
        const newCount = currentCount + 1;

        console.log(`[MiningLimits] 📈 ${user?.email}: ${currentCount} → ${newCount}`);

        // Atualizar no Supabase
        const { error: updateError } = await supabase
            .from('users')
            .update({ mining_count: newCount })
            .eq('id', userId);

        if (updateError) {
            console.error(`[MiningLimits] ❌ Erro ao atualizar: ${updateError.message}`);
            return null;
        }

        console.log(`[MiningLimits] ✅ mining_count SALVO: ${newCount}`);
        return newCount;

    } catch (err) {
        console.error(`[MiningLimits] ❌ Erro: ${err.message}`);
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
    console.log(`[MiningLimits] 🟢 Iniciando sessão: ${userId}`);
    activeSessions.set(userId, { startTime: Date.now(), url });

    // Auto-limpar após 10 minutos
    setTimeout(() => {
        if (activeSessions.has(userId)) {
            activeSessions.delete(userId);
            console.log(`[MiningLimits] 🧹 Sessão expirada limpa: ${userId}`);
        }
    }, 10 * 60 * 1000);
}

/**
 * Finaliza sessão de mineração
 */
export function endMiningSession(userId) {
    console.log(`[MiningLimits] 🔴 Finalizando sessão: ${userId}`);
    activeSessions.delete(userId);
}

// ============================================
// MIDDLEWARE EXPRESS
// ============================================

/**
 * Middleware que verifica autenticação e limites
 * REQUER que o usuário esteja autenticado
 */
export async function miningLimitMiddleware(req, res, next) {
    console.log('\n[MiningLimits] ═══════════════════════════════════════');
    console.log('[MiningLimits] 📥 Nova requisição de mineração');

    // 1. Verificar autenticação
    if (!req.user?.id) {
        console.log('[MiningLimits] ❌ Usuário NÃO autenticado');
        return res.status(401).json({
            error: 'Autenticação necessária',
            message: 'Você precisa fazer login para minerar.',
            code: 'AUTH_REQUIRED'
        });
    }

    const userId = req.user.id;
    console.log(`[MiningLimits] 👤 Usuário autenticado: ${userId}`);

    // 2. Verificar se já está minerando
    if (isUserMining(userId)) {
        console.log('[MiningLimits] ⏳ Mineração já em andamento');
        return res.status(429).json({
            error: 'Mineração em andamento',
            message: 'Você já tem uma mineração em andamento. Aguarde sua conclusão.',
            code: 'CONCURRENT_MINING'
        });
    }

    // 3. Verificar limite
    const limitCheck = await checkMiningLimit(userId);

    if (!limitCheck.allowed) {
        console.log('[MiningLimits] 🚫 Limite atingido - bloqueando');
        return res.status(429).json({
            error: 'Limite de mineração atingido',
            message: limitCheck.reason,
            code: 'TIER_LIMIT_EXCEEDED',
            tier: limitCheck.tier,
            used: limitCheck.used,
            limit: limitCheck.limit,
            upgrade: limitCheck.tier !== 'gold'
        });
    }

    // 4. Tudo OK - adicionar info ao request
    req.miningInfo = {
        tier: limitCheck.tier,
        used: limitCheck.used,
        limit: limitCheck.limit,
        remaining: limitCheck.remaining
    };

    console.log('[MiningLimits] ✅ Mineração AUTORIZADA');
    console.log('[MiningLimits] ═══════════════════════════════════════\n');

    next();
}

export default {
    getUserMiningData,
    checkMiningLimit,
    incrementMiningCount,
    isUserMining,
    startMiningSession,
    endMiningSession,
    miningLimitMiddleware,
    TIER_LIMITS
};
