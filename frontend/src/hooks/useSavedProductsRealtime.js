import { useEffect, useRef, useCallback } from 'react';
import supabase from '../lib/supabase';

/**
 * Hook para escutar mudanças em tempo real nas tabelas de produtos salvos e coleções
 * 
 * @param {string} userId - ID do usuário autenticado
 * @param {Object} callbacks - Callbacks para diferentes eventos
 * @param {Function} callbacks.onProductsChange - Chamado quando produtos salvos mudam
 * @param {Function} callbacks.onCollectionsChange - Chamado quando coleções mudam
 */
export function useSavedProductsRealtime(userId, { onProductsChange, onCollectionsChange }) {
    const channelRef = useRef(null);

    const setupSubscription = useCallback(() => {
        if (!userId) return;

        // Cancela subscription anterior se existir
        if (channelRef.current) {
            supabase.removeChannel(channelRef.current);
        }

        // Cria novo channel para escutar múltiplas tabelas
        const channel = supabase
            .channel(`saved-products-${userId}`)
            // Escuta mudanças em saved_products
            .on(
                'postgres_changes',
                {
                    event: '*', // INSERT, UPDATE, DELETE
                    schema: 'public',
                    table: 'saved_products',
                    filter: `user_id=eq.${userId}`
                },
                (payload) => {
                    console.log('[Realtime] saved_products change:', payload.eventType);
                    onProductsChange?.(payload.eventType, payload.new, payload.old);
                }
            )
            // Escuta mudanças em product_collections
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'product_collections',
                    filter: `user_id=eq.${userId}`
                },
                (payload) => {
                    console.log('[Realtime] product_collections change:', payload.eventType);
                    onCollectionsChange?.(payload.eventType, payload.new, payload.old);
                }
            )
            .subscribe((status) => {
                console.log('[Realtime] Subscription status:', status);
            });

        channelRef.current = channel;
    }, [userId, onProductsChange, onCollectionsChange]);

    useEffect(() => {
        setupSubscription();

        // Cleanup na desmontagem
        return () => {
            if (channelRef.current) {
                console.log('[Realtime] Removing channel');
                supabase.removeChannel(channelRef.current);
                channelRef.current = null;
            }
        };
    }, [setupSubscription]);

    // Função para reconectar manualmente se necessário
    const reconnect = useCallback(() => {
        console.log('[Realtime] Reconnecting...');
        setupSubscription();
    }, [setupSubscription]);

    return { reconnect };
}

export default useSavedProductsRealtime;
