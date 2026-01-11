/**
 * Algoritmo de detecção de modelo de iPhone
 * Identifica: iPhone X, XS, XS Max, XR, 11-16, Pro, Pro Max
 */
export function detectIPhoneModel(product) {
    const name = (product.nameTranslated || product.name || '').toLowerCase();
    const originalName = (product.nameOriginal || '').toLowerCase();
    const fullText = `${name} ${originalName}`;

    // Padrões para detectar modelos de iPhone
    const patterns = [
        // iPhone 16 series
        { regex: /iphone\s*16\s*pro\s*max/i, model: 'iPhone 16 Pro Max' },
        { regex: /iphone\s*16\s*pro/i, model: 'iPhone 16 Pro' },
        { regex: /iphone\s*16\s*plus/i, model: 'iPhone 16 Plus' },
        { regex: /iphone\s*16(?!\d)/i, model: 'iPhone 16' },
        // Padrões em chinês
        { regex: /苹果\s*16\s*pro\s*max|苹果16promax/i, model: 'iPhone 16 Pro Max' },
        { regex: /苹果\s*16\s*pro|苹果16pro/i, model: 'iPhone 16 Pro' },
        { regex: /苹果\s*16(?!\d)/i, model: 'iPhone 16' },

        // iPhone 15 series
        { regex: /iphone\s*15\s*pro\s*max/i, model: 'iPhone 15 Pro Max' },
        { regex: /iphone\s*15\s*pro/i, model: 'iPhone 15 Pro' },
        { regex: /iphone\s*15\s*plus/i, model: 'iPhone 15 Plus' },
        { regex: /iphone\s*15(?!\d)/i, model: 'iPhone 15' },
        { regex: /苹果\s*15\s*pro\s*max|苹果15promax/i, model: 'iPhone 15 Pro Max' },
        { regex: /苹果\s*15\s*pro|苹果15pro/i, model: 'iPhone 15 Pro' },
        { regex: /苹果\s*15(?!\d)/i, model: 'iPhone 15' },

        // iPhone 14 series
        { regex: /iphone\s*14\s*pro\s*max/i, model: 'iPhone 14 Pro Max' },
        { regex: /iphone\s*14\s*pro/i, model: 'iPhone 14 Pro' },
        { regex: /iphone\s*14\s*plus/i, model: 'iPhone 14 Plus' },
        { regex: /iphone\s*14(?!\d)/i, model: 'iPhone 14' },
        { regex: /苹果\s*14\s*pro\s*max|苹果14promax/i, model: 'iPhone 14 Pro Max' },
        { regex: /苹果\s*14\s*pro|苹果14pro/i, model: 'iPhone 14 Pro' },
        { regex: /苹果\s*14(?!\d)/i, model: 'iPhone 14' },

        // iPhone 13 series
        { regex: /iphone\s*13\s*pro\s*max/i, model: 'iPhone 13 Pro Max' },
        { regex: /iphone\s*13\s*pro/i, model: 'iPhone 13 Pro' },
        { regex: /iphone\s*13\s*mini/i, model: 'iPhone 13 Mini' },
        { regex: /iphone\s*13(?!\d)/i, model: 'iPhone 13' },
        { regex: /苹果\s*13\s*pro\s*max|苹果13promax/i, model: 'iPhone 13 Pro Max' },
        { regex: /苹果\s*13\s*pro|苹果13pro/i, model: 'iPhone 13 Pro' },
        { regex: /苹果\s*13(?!\d)/i, model: 'iPhone 13' },

        // iPhone 12 series
        { regex: /iphone\s*12\s*pro\s*max/i, model: 'iPhone 12 Pro Max' },
        { regex: /iphone\s*12\s*pro/i, model: 'iPhone 12 Pro' },
        { regex: /iphone\s*12\s*mini/i, model: 'iPhone 12 Mini' },
        { regex: /iphone\s*12(?!\d)/i, model: 'iPhone 12' },
        { regex: /苹果\s*12\s*pro\s*max|苹果12promax/i, model: 'iPhone 12 Pro Max' },
        { regex: /苹果\s*12\s*pro|苹果12pro/i, model: 'iPhone 12 Pro' },
        { regex: /苹果\s*12(?!\d)/i, model: 'iPhone 12' },

        // iPhone 11 series
        { regex: /iphone\s*11\s*pro\s*max/i, model: 'iPhone 11 Pro Max' },
        { regex: /iphone\s*11\s*pro/i, model: 'iPhone 11 Pro' },
        { regex: /iphone\s*11(?!\d)/i, model: 'iPhone 11' },
        { regex: /苹果\s*11\s*pro\s*max|苹果11promax/i, model: 'iPhone 11 Pro Max' },
        { regex: /苹果\s*11\s*pro|苹果11pro/i, model: 'iPhone 11 Pro' },
        { regex: /苹果\s*11(?!\d)/i, model: 'iPhone 11' },

        // iPhone X series
        { regex: /iphone\s*xs\s*max/i, model: 'iPhone XS Max' },
        { regex: /iphone\s*xs(?!\s*max)/i, model: 'iPhone XS' },
        { regex: /iphone\s*xr/i, model: 'iPhone XR' },
        { regex: /iphone\s*x(?![sr\d])/i, model: 'iPhone X' },
        { regex: /苹果\s*xs\s*max/i, model: 'iPhone XS Max' },
        { regex: /苹果\s*xs(?!\s*max)/i, model: 'iPhone XS' },
        { regex: /苹果\s*xr/i, model: 'iPhone XR' },
        { regex: /苹果\s*x(?![sr\d])/i, model: 'iPhone X' },

        // iPhone SE
        { regex: /iphone\s*se\s*3|iphone\s*se\s*2022/i, model: 'iPhone SE 3' },
        { regex: /iphone\s*se\s*2|iphone\s*se\s*2020/i, model: 'iPhone SE 2' },
        { regex: /iphone\s*se(?!\s*\d)/i, model: 'iPhone SE' },

        // Older models
        { regex: /iphone\s*8\s*plus/i, model: 'iPhone 8 Plus' },
        { regex: /iphone\s*8(?!\d)/i, model: 'iPhone 8' },
        { regex: /iphone\s*7\s*plus/i, model: 'iPhone 7 Plus' },
        { regex: /iphone\s*7(?!\d)/i, model: 'iPhone 7' },
    ];

    for (const pattern of patterns) {
        if (pattern.regex.test(fullText)) {
            return pattern.model;
        }
    }

    // Se não encontrou modelo específico mas menciona iPhone
    if (fullText.includes('iphone') || fullText.includes('苹果')) {
        return 'iPhone (Outro)';
    }

    return null; // Não é um iPhone
}

/**
 * Extrai todos os modelos únicos de uma lista de produtos
 */
export function extractUniqueModels(products) {
    const models = new Set();

    products.forEach(product => {
        const model = detectIPhoneModel(product);
        if (model) {
            models.add(model);
        }
    });

    // Ordena os modelos de forma lógica (mais recentes primeiro)
    const sortOrder = [
        'iPhone 16 Pro Max', 'iPhone 16 Pro', 'iPhone 16 Plus', 'iPhone 16',
        'iPhone 15 Pro Max', 'iPhone 15 Pro', 'iPhone 15 Plus', 'iPhone 15',
        'iPhone 14 Pro Max', 'iPhone 14 Pro', 'iPhone 14 Plus', 'iPhone 14',
        'iPhone 13 Pro Max', 'iPhone 13 Pro', 'iPhone 13 Mini', 'iPhone 13',
        'iPhone 12 Pro Max', 'iPhone 12 Pro', 'iPhone 12 Mini', 'iPhone 12',
        'iPhone 11 Pro Max', 'iPhone 11 Pro', 'iPhone 11',
        'iPhone XS Max', 'iPhone XS', 'iPhone XR', 'iPhone X',
        'iPhone SE 3', 'iPhone SE 2', 'iPhone SE',
        'iPhone 8 Plus', 'iPhone 8', 'iPhone 7 Plus', 'iPhone 7',
        'iPhone (Outro)'
    ];

    return Array.from(models).sort((a, b) => {
        const indexA = sortOrder.indexOf(a);
        const indexB = sortOrder.indexOf(b);
        if (indexA === -1 && indexB === -1) return a.localeCompare(b);
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
    });
}

/**
 * Algoritmo de detecção de capacidade de armazenamento
 * Identifica: 64GB, 128GB, 256GB, 512GB, 1TB, 2TB
 */
export function detectStorage(product) {
    const name = (product.nameTranslated || product.name || '').toLowerCase();
    const originalName = (product.nameOriginal || '').toLowerCase();
    const fullText = `${name} ${originalName}`;

    // Padrões para detectar armazenamento (do maior para o menor para evitar conflitos)
    const patterns = [
        // TB (Terabytes)
        { regex: /2\s*tb/i, storage: '2TB' },
        { regex: /1\s*tb/i, storage: '1TB' },

        // GB (Gigabytes) - ordem decrescente
        { regex: /1024\s*g[b]?/i, storage: '1TB' }, // 1024GB = 1TB
        { regex: /512\s*g[b]?/i, storage: '512GB' },
        { regex: /256\s*g[b]?/i, storage: '256GB' },
        { regex: /128\s*g[b]?/i, storage: '128GB' },
        { regex: /64\s*g[b]?/i, storage: '64GB' },
        { regex: /32\s*g[b]?/i, storage: '32GB' },

        // Padrões em chinês
        { regex: /2t[b]?/i, storage: '2TB' },
        { regex: /1t[b]?(?!\d)/i, storage: '1TB' },
    ];

    for (const pattern of patterns) {
        if (pattern.regex.test(fullText)) {
            return pattern.storage;
        }
    }

    return null; // Armazenamento não detectado
}

/**
 * Extrai todas as capacidades de armazenamento únicas de uma lista de produtos
 */
export function extractUniqueStorages(products) {
    const storages = new Set();

    products.forEach(product => {
        const storage = detectStorage(product);
        if (storage) {
            storages.add(storage);
        }
    });

    // Ordena por capacidade (menor para maior)
    const sortOrder = ['32GB', '64GB', '128GB', '256GB', '512GB', '1TB', '2TB'];

    return Array.from(storages).sort((a, b) => {
        const indexA = sortOrder.indexOf(a);
        const indexB = sortOrder.indexOf(b);
        if (indexA === -1 && indexB === -1) return a.localeCompare(b);
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
    });
}
