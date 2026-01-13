/**
 * Saved Sellers Service
 * 
 * Gerencia vendedores salvos pelo usuário para acesso rápido.
 */

import supabase from './supabase.js';

// Ícones disponíveis para vendedores
export const SELLER_ICONS = [
    { id: 'store', emoji: '🏪', name: 'Loja' },
    { id: 'star', emoji: '⭐', name: 'Favorito' },
    { id: 'fire', emoji: '🔥', name: 'Popular' },
    { id: 'diamond', emoji: '💎', name: 'Premium' },
    { id: 'phone', emoji: '📱', name: 'iPhones' },
    { id: 'watch', emoji: '⌚', name: 'Relógios' },
    { id: 'bag', emoji: '👜', name: 'Bolsas' },
    { id: 'shoe', emoji: '👟', name: 'Tênis' }
];

/**
 * Busca todos os vendedores salvos do usuário
 */
export async function getSavedSellers(userId) {
    console.log(`[SavedSellers] 🔍 Buscando vendedores salvos: ${userId}`);

    const { data, error } = await supabase
        .from('saved_sellers')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error(`[SavedSellers] ❌ Erro: ${error.message}`);
        throw new Error('Erro ao buscar vendedores salvos');
    }

    console.log(`[SavedSellers] ✅ ${data.length} vendedores encontrados`);
    return data;
}

/**
 * Salva um novo vendedor
 */
export async function saveSeller(userId, sellerData) {
    const { nickname, sellerUrl, sellerId, sellerName, sellerAvatar, iconType, iconValue } = sellerData;

    console.log(`[SavedSellers] 💾 Salvando vendedor: ${nickname}`);

    // Verificar se apelido já existe
    const exists = await checkNicknameExists(userId, nickname);
    if (exists) {
        throw new Error('Já existe um vendedor salvo com este apelido');
    }

    const { data, error } = await supabase
        .from('saved_sellers')
        .insert({
            user_id: userId,
            nickname: nickname.trim(),
            seller_url: sellerUrl,
            seller_id: sellerId || null,
            seller_name: sellerName || null,
            seller_avatar: sellerAvatar || null,
            icon_type: iconType || 'default',
            icon_value: iconValue || '🏪'
        })
        .select()
        .single();

    if (error) {
        console.error(`[SavedSellers] ❌ Erro ao salvar: ${error.message}`);
        if (error.code === '23505') {
            throw new Error('Já existe um vendedor salvo com este apelido');
        }
        throw new Error('Erro ao salvar vendedor');
    }

    console.log(`[SavedSellers] ✅ Vendedor salvo: ${data.id}`);
    return data;
}

/**
 * Atualiza um vendedor salvo
 */
export async function updateSeller(userId, sellerId, updates) {
    console.log(`[SavedSellers] ✏️ Atualizando vendedor: ${sellerId}`);

    // Se está atualizando nickname, verificar duplicidade
    if (updates.nickname) {
        const existing = await supabase
            .from('saved_sellers')
            .select('id')
            .eq('user_id', userId)
            .eq('nickname', updates.nickname)
            .neq('id', sellerId)
            .single();

        if (existing.data) {
            throw new Error('Já existe um vendedor salvo com este apelido');
        }
    }

    const { data, error } = await supabase
        .from('saved_sellers')
        .update({
            ...updates,
            updated_at: new Date().toISOString()
        })
        .eq('id', sellerId)
        .eq('user_id', userId)
        .select()
        .single();

    if (error) {
        console.error(`[SavedSellers] ❌ Erro ao atualizar: ${error.message}`);
        throw new Error('Erro ao atualizar vendedor');
    }

    console.log(`[SavedSellers] ✅ Vendedor atualizado`);
    return data;
}

/**
 * Remove um vendedor salvo
 */
export async function deleteSeller(userId, sellerId) {
    console.log(`[SavedSellers] 🗑️ Removendo vendedor: ${sellerId}`);

    const { error } = await supabase
        .from('saved_sellers')
        .delete()
        .eq('id', sellerId)
        .eq('user_id', userId);

    if (error) {
        console.error(`[SavedSellers] ❌ Erro ao remover: ${error.message}`);
        throw new Error('Erro ao remover vendedor');
    }

    console.log(`[SavedSellers] ✅ Vendedor removido`);
    return true;
}

/**
 * Verifica se um apelido já existe para o usuário
 */
export async function checkNicknameExists(userId, nickname) {
    const { data } = await supabase
        .from('saved_sellers')
        .select('id')
        .eq('user_id', userId)
        .eq('nickname', nickname.trim())
        .single();

    return !!data;
}

export default {
    getSavedSellers,
    saveSeller,
    updateSeller,
    deleteSeller,
    checkNicknameExists,
    SELLER_ICONS
};
