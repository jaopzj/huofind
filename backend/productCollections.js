/**
 * Product Collections Service
 * 
 * Gerencia coleções/pastas para organização de produtos salvos.
 */

import supabase from './supabase.js';

// Limites de coleções por tier
export const TIER_COLLECTION_LIMITS = {
    guest: 3,
    bronze: 5,
    silver: 10,
    gold: Infinity
};

// Ícones disponíveis para coleções
export const COLLECTION_ICONS = [
    'folder',
    'heart',
    'star',
    'box',
    'tag',
    'shopping-bag',
    'gift',
    'bookmark',
    'archive',
    'package'
];

// Cores disponíveis para coleções
export const COLLECTION_COLORS = [
    'orange',
    'blue',
    'green',
    'purple',
    'pink',
    'red',
    'yellow',
    'gray'
];

/**
 * Conta quantas coleções o usuário tem
 */
export async function getCollectionCount(userId) {
    const { count, error } = await supabase
        .from('product_collections')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

    if (error) {
        console.error(`[Collections] ❌ Erro ao contar: ${error.message}`);
        throw new Error('Erro ao contar coleções');
    }

    return count || 0;
}

/**
 * Busca todas as coleções do usuário com contagem de produtos
 */
export async function getCollections(userId) {
    console.log(`[Collections] 🔍 Buscando coleções: ${userId}`);

    const { data, error } = await supabase
        .from('product_collections')
        .select(`
            *,
            saved_products(count)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

    if (error) {
        console.error(`[Collections] ❌ Erro: ${error.message}`);
        throw new Error('Erro ao buscar coleções');
    }

    // Formata a contagem de produtos
    const formattedData = data.map(collection => ({
        ...collection,
        productCount: collection.saved_products?.[0]?.count || 0,
        saved_products: undefined // Remove o campo aninhado
    }));

    console.log(`[Collections] ✅ ${formattedData.length} coleções encontradas`);
    return formattedData;
}

/**
 * Busca uma coleção específica
 */
export async function getCollection(userId, collectionId) {
    const { data, error } = await supabase
        .from('product_collections')
        .select('*')
        .eq('id', collectionId)
        .eq('user_id', userId)
        .single();

    if (error) {
        console.error(`[Collections] ❌ Erro: ${error.message}`);
        throw new Error('Coleção não encontrada');
    }

    return data;
}

/**
 * Cria uma nova coleção
 */
export async function createCollection(userId, userTier, collectionData) {
    const { name, icon = 'folder', color = 'orange' } = collectionData;

    console.log(`[Collections] 📁 Criando coleção para user ${userId}: ${name}`);

    // Validar nome
    if (!name || name.trim().length === 0) {
        throw new Error('Nome da coleção é obrigatório');
    }

    if (name.trim().length > 50) {
        throw new Error('Nome da coleção deve ter no máximo 50 caracteres');
    }

    // Verificar limite do tier
    const tier = userTier || 'guest';
    const limit = TIER_COLLECTION_LIMITS[tier] || TIER_COLLECTION_LIMITS.guest;
    const currentCount = await getCollectionCount(userId);

    if (limit !== Infinity && currentCount >= limit) {
        console.log(`[Collections] ⚠️ Limite atingido: ${currentCount}/${limit}`);
        throw new Error(`LIMIT_REACHED:${currentCount}:${limit}`);
    }

    // Validar ícone e cor
    const validIcon = COLLECTION_ICONS.includes(icon) ? icon : 'folder';
    const validColor = COLLECTION_COLORS.includes(color) ? color : 'orange';

    const { data, error } = await supabase
        .from('product_collections')
        .insert({
            user_id: userId,
            name: name.trim(),
            icon: validIcon,
            color: validColor
        })
        .select()
        .single();

    if (error) {
        console.error(`[Collections] ❌ Erro ao criar: ${error.message}`);
        throw new Error('Erro ao criar coleção');
    }

    console.log(`[Collections] ✅ Coleção criada: ${data.id}`);
    return data;
}

/**
 * Atualiza uma coleção existente
 */
export async function updateCollection(userId, collectionId, updates) {
    console.log(`[Collections] ✏️ Atualizando coleção: ${collectionId}`);

    // Validar que a coleção pertence ao usuário
    await getCollection(userId, collectionId);

    const updateData = {};

    if (updates.name !== undefined) {
        if (updates.name.trim().length === 0) {
            throw new Error('Nome da coleção é obrigatório');
        }
        if (updates.name.trim().length > 50) {
            throw new Error('Nome da coleção deve ter no máximo 50 caracteres');
        }
        updateData.name = updates.name.trim();
    }

    if (updates.icon !== undefined) {
        updateData.icon = COLLECTION_ICONS.includes(updates.icon) ? updates.icon : 'folder';
    }

    if (updates.color !== undefined) {
        updateData.color = COLLECTION_COLORS.includes(updates.color) ? updates.color : 'orange';
    }

    if (Object.keys(updateData).length === 0) {
        throw new Error('Nenhum campo para atualizar');
    }

    const { data, error } = await supabase
        .from('product_collections')
        .update(updateData)
        .eq('id', collectionId)
        .eq('user_id', userId)
        .select()
        .single();

    if (error) {
        console.error(`[Collections] ❌ Erro ao atualizar: ${error.message}`);
        throw new Error('Erro ao atualizar coleção');
    }

    console.log(`[Collections] ✅ Coleção atualizada`);
    return data;
}

/**
 * Deleta uma coleção (produtos são mantidos, apenas desvinculados)
 */
export async function deleteCollection(userId, collectionId) {
    console.log(`[Collections] 🗑️ Deletando coleção: ${collectionId}`);

    // Validar que a coleção pertence ao usuário
    await getCollection(userId, collectionId);

    const { error } = await supabase
        .from('product_collections')
        .delete()
        .eq('id', collectionId)
        .eq('user_id', userId);

    if (error) {
        console.error(`[Collections] ❌ Erro ao deletar: ${error.message}`);
        throw new Error('Erro ao deletar coleção');
    }

    console.log(`[Collections] ✅ Coleção deletada`);
    return true;
}

/**
 * Move um produto para uma coleção
 */
export async function moveProductToCollection(userId, productId, collectionId) {
    console.log(`[Collections] 📦 Movendo produto ${productId} para coleção ${collectionId}`);

    // Se collectionId for null, apenas remove da coleção atual
    if (collectionId !== null) {
        // Validar que a coleção pertence ao usuário
        await getCollection(userId, collectionId);
    }

    const { data, error } = await supabase
        .from('saved_products')
        .update({ collection_id: collectionId })
        .eq('id', productId)
        .eq('user_id', userId)
        .select()
        .single();

    if (error) {
        console.error(`[Collections] ❌ Erro ao mover produto: ${error.message}`);
        throw new Error('Erro ao mover produto para coleção');
    }

    console.log(`[Collections] ✅ Produto movido`);
    return data;
}

/**
 * Busca produtos de uma coleção específica
 */
export async function getProductsByCollection(userId, collectionId) {
    console.log(`[Collections] 🔍 Buscando produtos da coleção: ${collectionId}`);

    const { data, error } = await supabase
        .from('saved_products')
        .select('*')
        .eq('user_id', userId)
        .eq('collection_id', collectionId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error(`[Collections] ❌ Erro: ${error.message}`);
        throw new Error('Erro ao buscar produtos da coleção');
    }

    return data;
}

export default {
    getCollections,
    getCollection,
    createCollection,
    updateCollection,
    deleteCollection,
    moveProductToCollection,
    getProductsByCollection,
    getCollectionCount,
    TIER_COLLECTION_LIMITS,
    COLLECTION_ICONS,
    COLLECTION_COLORS
};
