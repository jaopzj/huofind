// ============================================
// DECLARATION ENGINE - Deterministic Algorithm
// Replaces Gemini AI for customs declaration suggestions
// ============================================

// -----------------------------------------------
// 1. BRAND LIST (stripped from product names)
// -----------------------------------------------
const KNOWN_BRANDS = [
    // Fashion
    'nike', 'adidas', 'puma', 'reebok', 'new balance', 'asics', 'fila', 'vans', 'converse',
    'gucci', 'louis vuitton', 'lv', 'prada', 'chanel', 'dior', 'versace', 'balenciaga',
    'burberry', 'hermes', 'hermès', 'yeezy', 'supreme', 'off-white', 'offwhite',
    'lacoste', 'tommy hilfiger', 'ralph lauren', 'polo', 'calvin klein', 'ck',
    'zara', 'h&m', 'uniqlo', 'gap', 'levis', "levi's", 'jordan', 'air jordan',
    'under armour', 'north face', 'the north face', 'tnf', 'stone island', 'moncler',
    'bape', 'bathing ape', 'stussy', 'palace', 'trapstar', 'essentials', 'fear of god',
    'fog', 'corteiz', 'gallery dept', 'rhude', 'amiri', 'chrome hearts',
    // Tech
    'apple', 'iphone', 'ipad', 'macbook', 'imac', 'airpods', 'samsung', 'galaxy',
    'xiaomi', 'redmi', 'poco', 'huawei', 'oppo', 'vivo', 'oneplus', 'realme',
    'sony', 'playstation', 'ps5', 'ps4', 'xbox', 'nintendo', 'switch',
    'dell', 'lenovo', 'hp', 'asus', 'acer', 'msi', 'razer', 'logitech',
    'jbl', 'bose', 'beats', 'marshall', 'sennheiser', 'anker',
    'nvidia', 'geforce', 'rtx', 'gtx', 'amd', 'radeon', 'intel', 'corsair',
    'hyperx', 'steelseries', 'gopro', 'dji', 'kindle', 'alexa', 'echo',
    // Watches
    'rolex', 'omega', 'tag heuer', 'cartier', 'casio', 'g-shock', 'seiko',
    'citizen', 'tissot', 'audemars piguet', 'ap', 'patek philippe', 'hublot',
    'breitling', 'iwc', 'richard mille',
    // Bags
    'michael kors', 'mk', 'coach', 'kate spade', 'tory burch', 'longchamp',
    'goyard', 'bottega veneta', 'celine', 'céline', 'fendi', 'givenchy',
    // Perfume
    'carolina herrera', 'jean paul gaultier', 'dolce & gabbana', 'dolce gabbana',
    'yves saint laurent', 'ysl', 'armani', 'givenchy', 'hugo boss', 'montblanc',
    'tom ford', 'creed', 'bvlgari', 'bulgari', 'lancôme', 'lancome',
    // Sunglasses
    'ray-ban', 'rayban', 'ray ban', 'oakley',
];

// -----------------------------------------------
// 2. METONOMY / MODEL MAPPINGS
//    Users often refer to products by model name
//    instead of describing what the product is.
// -----------------------------------------------
const MODEL_TO_PRODUCT = [
    // Phones
    { patterns: ['iphone', 'galaxy s', 'galaxy a', 'pixel', 'redmi note', 'poco', 'mi \\d', 'moto g', 'moto edge'], product: 'celular', category: 'Eletrônicos' },
    // Tablets
    { patterns: ['ipad', 'galaxy tab', 'kindle', 'fire hd'], product: 'tablet', category: 'Eletrônicos' },
    // Laptops
    { patterns: ['macbook', 'thinkpad', 'ideapad', 'zenbook', 'vivobook', 'xps \\d', 'surface pro', 'surface laptop', 'chromebook'], product: 'notebook', category: 'Eletrônicos' },
    // Consoles
    { patterns: ['playstation', 'ps5', 'ps4', 'xbox', 'nintendo switch', 'switch oled', 'steam deck'], product: 'console de videogame', category: 'Eletrônicos' },
    // Audio
    { patterns: ['airpods', 'airpod', 'buds pro', 'galaxy buds', 'buds plus', 'freebuds', 'jbl tune', 'jbl flip', 'jbl charge', 'jbl go'], product: 'fone de ouvido', category: 'Eletrônicos' },
    // Shoes (model names)
    { patterns: ['air jordan', 'jordan \\d', 'air max', 'air force', 'dunk low', 'dunk high', 'yeezy', 'ultraboost', 'ultra boost', 'nmd', 'stan smith', 'old skool', 'sk8-hi', 'chuck taylor', 'all star'], product: 'tênis', category: 'Calçados' },
    // Watches (specific models)
    { patterns: ['submariner', 'daytona', 'datejust', 'speedmaster', 'seamaster', 'royal oak', 'nautilus', 'big bang', 'calatrava'], product: 'relógio', category: 'Relógios' },
    // Bags (specific models)
    { patterns: ['neverfull', 'speedy', 'keepall', 'birkin', 'kelly bag', 'boy bag', 'classic flap', 'pochette', 'dauphine'], product: 'bolsa', category: 'Bolsas' },
    // GPU / PC parts
    { patterns: ['rtx \\d', 'gtx \\d', 'rx \\d', 'radeon', 'geforce', 'placa de v[ií]deo'], product: 'placa de vídeo', category: 'Eletrônicos' },
    // RAM
    { patterns: ['mem[óo]ria ram', 'ddr\\d', 'ddr \\d'], product: 'memória ram', category: 'Eletrônicos' },
    // Cameras
    { patterns: ['gopro', 'hero \\d', 'mavic', 'mini \\d se', 'dji mini', 'osmo'], product: 'câmera', category: 'Eletrônicos' },
    // Smartwatch
    { patterns: ['apple watch', 'galaxy watch', 'amazfit', 'mi band', 'fitbit'], product: 'smartwatch', category: 'Relógios' },
];

// -----------------------------------------------
// 3. CATEGORY CONFIG
//    Weights for proportional value distribution,
//    plus keyword matching and description templates.
// -----------------------------------------------
const CATEGORY_CONFIG = {
    'Vestuário': {
        weight: 0.50,
        englishCategory: 'Clothing',
        keywords: [
            'camiseta', 'camisa', 'blusa', 'moletom', 'jaqueta', 'casaco', 'calça',
            'shorts', 'bermuda', 'vestido', 'saia', 'suéter', 'sweater', 'hoodie',
            'corta vento', 'corta-vento', 'colete', 'regata', 'top', 'cropped',
            'meia', 'meias', 'cueca', 'calcinha', 'lingerie', 'pijama',
            'roupa', 'manga longa', 'manga curta', 'polo shirt', 'camisola',
            'agasalho', 'conjunto', 'terno', 'blazer', 'sobretudo', 'poncho',
            't-shirt', 'tee', 'shirt', 'pants', 'jacket', 'coat', 'dress', 'skirt',
        ],
        descriptions: [
            'Cotton t-shirt plain',
            'Polyester fabric shirt',
            'Cotton blend casual top',
            'Fabric garment piece',
            'Knit fabric pullover',
            'Woven fabric clothing item',
            'Synthetic fiber garment',
            'Cotton casual wear',
            'Textile clothing piece',
            'Plain fabric apparel',
        ],
    },
    'Calçados': {
        weight: 0.75,
        englishCategory: 'Footwear',
        keywords: [
            'tênis', 'tenis', 'sapato', 'bota', 'chinelo', 'sandália', 'sandalia',
            'sapatênis', 'sapatenis', 'mocassim', 'alpargata', 'tamanco',
            'chuteira', 'rasteirinha', 'plataforma', 'salto', 'sneaker', 'sneakers',
            'shoe', 'shoes', 'boot', 'boots', 'slipper', 'sandal',
        ],
        descriptions: [
            'Sports shoes rubber sole',
            'Casual footwear synthetic',
            'Athletic shoes mesh upper',
            'Rubber sole sports shoes',
            'Canvas shoes flat sole',
            'Lightweight running shoes',
            'Fabric upper casual shoes',
            'Synthetic leather shoes',
        ],
    },
    'Eletrônicos': {
        weight: 1.0,
        englishCategory: 'Electronics',
        keywords: [
            'celular', 'smartphone', 'fone', 'fone de ouvido', 'headphone', 'earphone',
            'earbuds', 'notebook', 'laptop', 'tablet', 'teclado', 'mouse', 'monitor',
            'carregador', 'cabo', 'bateria', 'ssd', 'hd', 'pendrive', 'pen drive',
            'placa', 'processador', 'cpu', 'gpu', 'memória ram', 'memoria ram',
            'fonte', 'cooler', 'ventilador', 'led', 'lâmpada', 'lampada',
            'controle', 'gamepad', 'joystick', 'webcam', 'microfone', 'caixa de som',
            'speaker', 'drone', 'câmera', 'camera', 'console', 'videogame',
            'smartwatch', 'smart watch', 'roteador', 'router', 'hub', 'adaptador',
            'placa de vídeo', 'placa de video', 'placa mãe', 'placa mae',
            'phone', 'computer', 'keyboard', 'charger', 'cable', 'headset',
        ],
        descriptions: [
            'Electronic component parts',
            'LCD screen replacement part',
            'Circuit board electronic module',
            'Electronic accessory cable',
            'Digital device component',
            'Electronic repair part',
            'PCB board replacement',
            'Electronic module unit',
            'Integrated circuit component',
            'Digital electronic part',
        ],
    },
    'Acessórios': {
        weight: 0.45,
        englishCategory: 'Accessories',
        keywords: [
            'óculos', 'oculos', 'pulseira', 'cinto', 'gravata', 'lenço', 'lenco',
            'cachecol', 'chapéu', 'chapeu', 'boné', 'bone', 'gorro', 'touca',
            'anel', 'brinco', 'colar', 'pingente', 'piercing', 'luva', 'luvas',
            'carteira', 'porta cartão', 'porta-cartão', 'chaveiro',
            'sunglasses', 'bracelet', 'belt', 'hat', 'cap', 'ring', 'necklace',
            'gloves', 'scarf', 'tie', 'beanie',
        ],
        descriptions: [
            'Fashion accessory item',
            'Plastic sunglasses UV protection',
            'Metal bracelet casual',
            'Fabric belt with buckle',
            'Knit winter cap',
            'Fashion jewelry piece',
            'Synthetic leather wallet',
            'Casual fashion accessory',
        ],
    },
    'Bolsas': {
        weight: 0.65,
        englishCategory: 'Bags',
        keywords: [
            'bolsa', 'mochila', 'pochete', 'necessaire', 'sacola', 'maleta',
            'mala de viagem', 'bag', 'backpack', 'handbag', 'tote',
            'clutch', 'crossbody', 'shoulder bag', 'duffel', 'messenger',
        ],
        descriptions: [
            'Fabric handbag casual',
            'Canvas backpack with zipper',
            'Nylon crossbody bag',
            'Polyester travel bag',
            'Synthetic leather shoulder bag',
            'Casual fabric tote bag',
            'Lightweight nylon bag',
        ],
    },
    'Relógios': {
        weight: 0.85,
        englishCategory: 'Watches',
        keywords: [
            'relógio', 'relogio',
            'watch', 'wristwatch',
        ],
        descriptions: [
            'Wrist watch quartz movement',
            'Analog watch stainless case',
            'Quartz wristwatch casual',
            'Digital watch rubber band',
            'Fashion watch alloy case',
        ],
    },
    'Perfumes': {
        weight: 0.55,
        englishCategory: 'Fragrances',
        keywords: [
            'perfume', 'colônia', 'colonia', 'eau de toilette', 'eau de parfum',
            'body splash', 'body spray', 'fragrance', 'desodorante importado',
        ],
        descriptions: [
            'Fragrance liquid sample',
            'Body spray scented water',
            'Eau de toilette small bottle',
            'Scented water bottle',
            'Aromatic liquid spray',
        ],
    },
    'Outros': {
        weight: 0.50,
        englishCategory: 'General',
        keywords: [],
        descriptions: [
            'General merchandise item',
            'Household item plastic',
            'Miscellaneous small goods',
            'Personal care item',
            'Small consumer goods',
        ],
    },
};

// -----------------------------------------------
// 4. TIPS POOL (contextual tips in Portuguese)
// -----------------------------------------------
const GENERAL_TIPS = [
    'Nunca declare marcas no pacote. Use descrições genéricas em inglês.',
    'Peça ao vendedor para colocar o valor declarado mais baixo na nota (invoice).',
    'Remova etiquetas e embalagens de marca antes de enviar, se possível.',
    'Separe encomendas grandes em pacotes menores para reduzir riscos.',
];

const CATEGORY_TIPS = {
    'Eletrônicos': [
        'Para eletrônicos, declare como "replacement parts" ou "electronic components" para parecer peça de reposição.',
        'Evite enviar eletrônicos na caixa original — isso chama atenção na fiscalização.',
        'Peça ao vendedor para embalar sem caixa original e marcar como "gift" se possível.',
    ],
    'Calçados': [
        'Peça ao vendedor para retirar a caixa original do tênis e enviar sem etiquetas de marca.',
        'Para calçados, declare como "sports shoes" ou "casual footwear" sem mencionar modelos.',
    ],
    'Vestuário': [
        'Para roupas, declare quantidades pequenas e valores baixos. Ex: "2x cotton t-shirt $3 each".',
        'Remova tags de marca antes de enviar e peça embalagem simples.',
    ],
    'Bolsas': [
        'Declare bolsas como "fabric handbag" ou "canvas bag" — nunca mencione o material real (couro, por exemplo).',
    ],
    'Relógios': [
        'Declare relógios como "quartz watch" com valor baixo. Evite termos como "automatic" ou "chronograph".',
        'Remova caixa de apresentação e documentos — envie apenas o relógio com embalagem simples.',
    ],
    'Perfumes': [
        'Perfumes podem ter restrições de envio aéreo. Verifique com o vendedor o método de envio.',
        'Declare perfumes como "scented water" ou "fragrance sample" com valor baixo.',
    ],
    'Acessórios': [
        'Para acessórios, use descrições genéricas como "fashion accessory" ou "plastic item".',
    ],
};

// -----------------------------------------------
// 5. HELPER FUNCTIONS
// -----------------------------------------------

/**
 * Simple string hash for deterministic pseudo-random selection
 */
function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
}

/**
 * Strip brand names from a product description
 */
function stripBrands(text) {
    let cleaned = text;
    // Sort brands by length descending to match longer brands first
    const sortedBrands = [...KNOWN_BRANDS].sort((a, b) => b.length - a.length);

    for (const brand of sortedBrands) {
        // Use word boundary-like matching (case insensitive)
        const escaped = brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
        cleaned = cleaned.replace(regex, '');
    }

    // Clean up extra whitespace
    return cleaned.replace(/\s+/g, ' ').trim();
}

/**
 * Resolve metonomy: check if the product name refers to a known model
 * and return the actual product type + category.
 */
function resolveMetonomy(name) {
    const lowerName = name.toLowerCase().trim();

    for (const mapping of MODEL_TO_PRODUCT) {
        for (const pattern of mapping.patterns) {
            const regex = new RegExp(pattern, 'i');
            if (regex.test(lowerName)) {
                return {
                    resolvedProduct: mapping.product,
                    resolvedCategory: mapping.category,
                };
            }
        }
    }

    return null;
}

/**
 * Detect the best matching category for a product name.
 * Uses a priority: user-selected category > keyword match > fallback.
 */
function detectCategory(name, userCategory) {
    const lowerName = name.toLowerCase();

    // First: check keyword matches across all categories
    let bestMatch = null;
    let bestMatchLength = 0;

    for (const [catName, config] of Object.entries(CATEGORY_CONFIG)) {
        for (const keyword of config.keywords) {
            if (lowerName.includes(keyword.toLowerCase()) && keyword.length > bestMatchLength) {
                bestMatch = catName;
                bestMatchLength = keyword.length;
            }
        }
    }

    // If we found a keyword match, use it (more accurate than user selection)
    if (bestMatch) return bestMatch;

    // Otherwise, trust the user-selected category
    if (userCategory && CATEGORY_CONFIG[userCategory]) {
        return userCategory;
    }

    return 'Outros';
}

/**
 * Pick a description variant deterministically based on product name
 */
function pickDescription(category, productName) {
    const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG['Outros'];
    const descriptions = config.descriptions;
    const index = hashString(productName) % descriptions.length;
    return descriptions[index];
}

/**
 * Select tips based on the categories present in the items
 */
function generateTips(categories) {
    const uniqueCategories = [...new Set(categories)];
    const tips = [];

    // Always add 1 general tip
    tips.push(GENERAL_TIPS[0]);

    // Add 1 category-specific tip for up to 2 most relevant categories
    for (const cat of uniqueCategories.slice(0, 2)) {
        const catTips = CATEGORY_TIPS[cat];
        if (catTips && catTips.length > 0) {
            tips.push(catTips[0]);
        }
    }

    // If we still have room, add another general tip
    if (tips.length < 3 && GENERAL_TIPS.length > 1) {
        tips.push(GENERAL_TIPS[1]);
    }

    return tips.slice(0, 3);
}

// -----------------------------------------------
// 6. MAIN GENERATION FUNCTION
// -----------------------------------------------

/**
 * Generate customs declaration suggestions deterministically.
 *
 * @param {string} description - Combined description string from frontend
 * @param {Array} items - Array of { name, quantity, category } objects
 * @returns {Object} - Same format as the previous Gemini response
 */
function generateDeclaration(description, items) {
    // Step 1: Process each item — resolve metonomy, detect category, strip brands
    const processedItems = items.map((item) => {
        const quantity = Math.max(1, item.quantity || 1);
        const rawName = item.name.trim();

        // Check if the name is actually a model/brand reference
        const metonomy = resolveMetonomy(rawName);
        const effectiveCategory = metonomy
            ? metonomy.resolvedCategory
            : detectCategory(rawName, item.category);

        const config = CATEGORY_CONFIG[effectiveCategory] || CATEGORY_CONFIG['Outros'];

        // Strip brands from the name for the description
        const cleanedName = stripBrands(rawName);

        // Pick a generic description
        const suggested = pickDescription(effectiveCategory, rawName);

        return {
            originalName: rawName,
            originalLabel: `${quantity}x ${rawName} (${item.category || effectiveCategory})`,
            suggested,
            category: effectiveCategory,
            englishCategory: config.englishCategory,
            weight: config.weight,
            quantity,
        };
    });

    // Step 2: Calculate total "weight units" for proportional distribution
    const totalUnits = processedItems.reduce(
        (sum, item) => sum + (item.weight * item.quantity), 0
    );
    const totalItemCount = processedItems.reduce(
        (sum, item) => sum + item.quantity, 0
    );

    // Step 3: Determine the total value cap
    // Default cap = $15. If >10 total items, allow up to $28
    const isHighItemCount = totalItemCount > 10;
    const hasExpensiveItems = processedItems.some(
        (item) => item.weight >= 0.85 // Electronics or Watches
    );
    const totalCap = (isHighItemCount && hasExpensiveItems) ? 28 : 15;

    // Step 4: Calculate base values per item using category weights
    // Base value range: $3 to $10 per item (before quantity division)
    const BASE_MIN = 3;
    const BASE_MAX = 10;

    let resultItems = processedItems.map((item) => {
        // Raw value based on weight (0.45 to 1.0 mapped to $3-$10 range)
        const normalizedWeight = (item.weight - 0.45) / (1.0 - 0.45); // 0 to 1
        const rawValue = BASE_MIN + (normalizedWeight * (BASE_MAX - BASE_MIN));
        return {
            ...item,
            rawValue: rawValue * item.quantity,
            rawPerUnit: rawValue,
        };
    });

    // Step 5: Scale values to fit within the total cap
    const rawTotal = resultItems.reduce((sum, item) => sum + item.rawValue, 0);

    if (rawTotal > totalCap) {
        const scaleFactor = totalCap / rawTotal;
        resultItems = resultItems.map((item) => ({
            ...item,
            rawValue: item.rawValue * scaleFactor,
            rawPerUnit: item.rawPerUnit * scaleFactor,
        }));
    }

    // Step 6: Clamp per-unit values to [$3, $10], then divide by quantity
    resultItems = resultItems.map((item) => {
        let perUnit = item.rawPerUnit;
        // Clamp
        perUnit = Math.max(BASE_MIN, Math.min(BASE_MAX, perUnit));
        // Divide by quantity
        const perUnitFinal = perUnit / item.quantity;
        // Round to 2 decimal places
        const rounded = Math.round(perUnitFinal * 100) / 100;

        return {
            ...item,
            suggestedValueUSD: rounded,
        };
    });

    // Step 7: Recalculate total and do a final adjustment if needed
    let total = resultItems.reduce(
        (sum, item) => sum + (item.suggestedValueUSD * item.quantity), 0
    );
    total = Math.round(total * 100) / 100;

    // If total still exceeds the cap after clamping, do a final proportional squeeze
    if (total > totalCap) {
        const squeezeFactor = totalCap / total;
        resultItems = resultItems.map((item) => ({
            ...item,
            suggestedValueUSD: Math.round(item.suggestedValueUSD * squeezeFactor * 100) / 100,
        }));
        total = resultItems.reduce(
            (sum, item) => sum + (item.suggestedValueUSD * item.quantity), 0
        );
        total = Math.round(total * 100) / 100;
    }

    // Step 8: Build the response
    const categories = resultItems.map((item) => item.category);
    const tips = generateTips(categories);

    const responseItems = resultItems.map((item) => ({
        original: item.originalLabel,
        suggested: item.suggested,
        suggestedValueUSD: item.suggestedValueUSD,
        category: item.englishCategory,
    }));

    return {
        items: responseItems,
        tips,
        totalSuggestedUSD: total,
        disclaimer: 'Os valores e descrições são sugestões. O usuário é responsável pela declaração final.',
    };
}

export { generateDeclaration };
