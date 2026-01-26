/**
 * Saved Products Service
 * 
 * Gerencia produtos salvos pelo usuário com limites por tier.
 */

import supabase from './supabase.js';

// Limites de salvamento por tier
export const TIER_SAVE_LIMITS = {
    guest: 3,
    bronze: 10,
    silver: 20,
    gold: 50
};

/**
 * Conta quantos produtos o usuário salvou
 */
export async function getSaveCount(userId) {
    const { count, error } = await supabase
        .from('saved_products')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

    if (error) {
        console.error(`[SavedProducts] ❌ Erro ao contar: ${error.message}`);
        throw new Error('Erro ao contar produtos salvos');
    }

    return count || 0;
}

/**
 * Detecta a plataforma do produto baseado na URL
 */
export function detectPlatform(productUrl) {
    if (!productUrl) return 'unknown';

    const url = productUrl.toLowerCase();

    if (url.includes('yupoo.com') || url.includes('x.yupoo')) {
        return 'yupoo';
    }

    if (url.includes('goofish.com') || url.includes('xianyu.com') || url.includes('idle.taobao')) {
        return 'xianyu';
    }

    return 'unknown';
}

/**
 * Busca todos os produtos salvos do usuário
 */
export async function getSavedProducts(userId) {
    console.log(`[SavedProducts] 🔍 Buscando produtos salvos: ${userId}`);

    const { data, error } = await supabase
        .from('saved_products')
        .select('*, collection_id')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error(`[SavedProducts] ❌ Erro: ${error.message}`);
        throw new Error('Erro ao buscar produtos salvos');
    }

    // Adiciona platform detection a cada produto
    const productsWithPlatform = data.map(product => ({
        ...product,
        platform: detectPlatform(product.product_url)
    }));

    console.log(`[SavedProducts] ✅ ${productsWithPlatform.length} produtos encontrados`);
    return productsWithPlatform;
}

/**
 * Verifica se um produto já está salvo
 */
export async function isProductSaved(userId, productUrl) {
    const { data } = await supabase
        .from('saved_products')
        .select('id')
        .eq('user_id', userId)
        .eq('product_url', productUrl)
        .single();

    return !!data;
}

/**
 * Salva um produto
 */
export async function saveProduct(userId, userTier, productData) {
    const { productUrl, productTitle, productPrice, productImage, productCurrency, sellerName } = productData;

    console.log(`[SavedProducts] 💾 Salvando produto para user ${userId}`);

    // Verificar limite do tier
    const tier = userTier || 'guest';
    const limit = TIER_SAVE_LIMITS[tier] || TIER_SAVE_LIMITS.guest;
    const currentCount = await getSaveCount(userId);

    if (currentCount >= limit) {
        console.log(`[SavedProducts] ⚠️ Limite atingido: ${currentCount}/${limit}`);
        throw new Error(`LIMIT_REACHED:${currentCount}:${limit}`);
    }

    // Verificar se já existe
    const alreadySaved = await isProductSaved(userId, productUrl);
    if (alreadySaved) {
        throw new Error('Produto já está salvo');
    }

    const { data, error } = await supabase
        .from('saved_products')
        .insert({
            user_id: userId,
            product_url: productUrl,
            product_title: productTitle || null,
            product_price: productPrice || null,
            product_image: productImage || null,
            product_currency: productCurrency || 'CNY',
            seller_name: sellerName || null
        })
        .select()
        .single();

    if (error) {
        console.error(`[SavedProducts] ❌ Erro ao salvar: ${error.message}`);
        if (error.code === '23505') {
            throw new Error('Produto já está salvo');
        }
        throw new Error('Erro ao salvar produto');
    }

    console.log(`[SavedProducts] ✅ Produto salvo: ${data.id}`);
    return data;
}

/**
 * Remove um produto salvo
 */
export async function deleteProduct(userId, productId) {
    console.log(`[SavedProducts] 🗑️ Removendo produto: ${productId}`);

    const { error } = await supabase
        .from('saved_products')
        .delete()
        .eq('id', productId)
        .eq('user_id', userId);

    if (error) {
        console.error(`[SavedProducts] ❌ Erro ao remover: ${error.message}`);
        throw new Error('Erro ao remover produto');
    }

    console.log(`[SavedProducts] ✅ Produto removido`);
    return true;
}

/**
 * Remove um produto salvo pela URL
 */
export async function deleteProductByUrl(userId, productUrl) {
    console.log(`[SavedProducts] 🗑️ Removendo produto por URL`);

    const { error } = await supabase
        .from('saved_products')
        .delete()
        .eq('user_id', userId)
        .eq('product_url', productUrl);

    if (error) {
        console.error(`[SavedProducts] ❌ Erro ao remover: ${error.message}`);
        throw new Error('Erro ao remover produto');
    }

    console.log(`[SavedProducts] ✅ Produto removido`);
    return true;
}

export default {
    getSavedProducts,
    saveProduct,
    deleteProduct,
    deleteProductByUrl,
    getSaveCount,
    isProductSaved,
    detectPlatform,
    TIER_SAVE_LIMITS
};
