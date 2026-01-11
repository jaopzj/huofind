/**
 * Cache simples em memória para produtos de vendedores
 * TTL de 30 minutos para evitar re-scraping frequente
 */

class Cache {
  constructor(ttlMinutes = 30) {
    this.cache = new Map();
    this.ttl = ttlMinutes * 60 * 1000;
  }

  set(sellerId, data) {
    this.cache.set(sellerId, {
      data,
      timestamp: Date.now()
    });
  }

  get(sellerId) {
    const entry = this.cache.get(sellerId);
    if (!entry) return null;

    // Verifica se expirou
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(sellerId);
      return null;
    }

    return entry.data;
  }

  has(sellerId) {
    return this.get(sellerId) !== null;
  }

  clear() {
    this.cache.clear();
  }
}

export default new Cache();
