import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INDEX_PATH = path.join(__dirname, 'data', 'hash_index.json');

// ============================================
// PERCEPTUAL HASH (dHash) IMPLEMENTATION
// ============================================

/**
 * Generate a difference hash (dHash) for an image buffer.
 * dHash compares adjacent pixels to produce a 64-bit hash.
 * More robust to small changes than average hash.
 * 
 * @param {Buffer} imageBuffer - Raw image buffer (any format)
 * @returns {Promise<string>} 64-character binary string hash
 */
async function generateDHash(imageBuffer) {
    // Resize to 9x8 greyscale (9 wide so we get 8 differences per row)
    const { data } = await sharp(imageBuffer)
        .resize(9, 8, { fit: 'fill' })
        .greyscale()
        .raw()
        .toBuffer({ resolveWithObject: true });

    let hash = '';
    for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
            const leftPixel = data[y * 9 + x];
            const rightPixel = data[y * 9 + x + 1];
            hash += leftPixel < rightPixel ? '1' : '0';
        }
    }

    return hash; // 64-bit binary string
}

/**
 * Extract dominant color histogram from an image.
 * Uses HSV-space binning for color-invariant comparison.
 * 
 * @param {Buffer} imageBuffer - Raw image buffer
 * @returns {Promise<number[]>} Normalized histogram (12 bins)
 */
async function extractColorHistogram(imageBuffer) {
    // Resize to small image and get RGB data
    const { data } = await sharp(imageBuffer)
        .resize(32, 32, { fit: 'fill' })
        .removeAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

    // Create 12-bin hue histogram (ignoring very dark/light pixels)
    const HUE_BINS = 12;
    const histogram = new Array(HUE_BINS).fill(0);
    let totalPixels = 0;

    for (let i = 0; i < data.length; i += 3) {
        const r = data[i] / 255;
        const g = data[i + 1] / 255;
        const b = data[i + 2] / 255;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const delta = max - min;

        // Skip very dark or very desaturated pixels
        if (max < 0.1 || delta < 0.05) continue;

        let hue = 0;
        if (delta > 0) {
            if (max === r) hue = ((g - b) / delta) % 6;
            else if (max === g) hue = (b - r) / delta + 2;
            else hue = (r - g) / delta + 4;
        }

        hue = ((hue * 60) + 360) % 360; // Normalize to 0-360
        const bin = Math.min(Math.floor(hue / (360 / HUE_BINS)), HUE_BINS - 1);
        histogram[bin]++;
        totalPixels++;
    }

    // Normalize histogram
    if (totalPixels > 0) {
        for (let i = 0; i < HUE_BINS; i++) {
            histogram[i] = histogram[i] / totalPixels;
        }
    }

    return histogram;
}

// ============================================
// COMPARISON FUNCTIONS
// ============================================

/**
 * Calculate Hamming distance between two binary hash strings.
 * Lower = more similar. 0 = identical.
 * 
 * @param {string} hash1 - First binary hash string
 * @param {string} hash2 - Second binary hash string
 * @returns {number} Number of differing bits
 */
function hammingDistance(hash1, hash2) {
    let distance = 0;
    for (let i = 0; i < hash1.length; i++) {
        if (hash1[i] !== hash2[i]) distance++;
    }
    return distance;
}

/**
 * Calculate cosine similarity between two histograms.
 * 
 * @param {number[]} hist1 
 * @param {number[]} hist2 
 * @returns {number} Similarity score 0-1 (1 = identical)
 */
function cosineSimilarity(hist1, hist2) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < hist1.length; i++) {
        dotProduct += hist1[i] * hist2[i];
        normA += hist1[i] * hist1[i];
        normB += hist2[i] * hist2[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
}

/**
 * Calculate combined similarity score between a query image and an indexed entry.
 * 
 * @param {Object} queryFeatures - { hash, colorHistogram }
 * @param {Object} indexEntry - { hash, colorHistogram }
 * @returns {number} Similarity score 0-1 (1 = perfect match)
 */
function calculateSimilarity(queryFeatures, indexEntry) {
    // Hash similarity: convert hamming distance to 0-1 scale
    const maxDistance = 64; // 64-bit hash
    const hamming = hammingDistance(queryFeatures.hash, indexEntry.hash);
    const hashSimilarity = 1 - (hamming / maxDistance);

    // Color similarity
    const colorSimilarity = cosineSimilarity(
        queryFeatures.colorHistogram,
        indexEntry.colorHistogram
    );

    // Combined score (hash is primary, color is secondary)
    return 0.7 * hashSimilarity + 0.3 * colorSimilarity;
}

// ============================================
// SEARCH FUNCTION
// ============================================

let cachedIndex = null;

/**
 * Load the hash index into memory (cached).
 * @returns {Array} Array of indexed entries
 */
function loadIndex() {
    if (cachedIndex) return cachedIndex;

    if (!fs.existsSync(INDEX_PATH)) {
        console.error('[ImageSearch] Hash index not found at:', INDEX_PATH);
        return [];
    }

    try {
        const raw = fs.readFileSync(INDEX_PATH, 'utf-8');
        cachedIndex = JSON.parse(raw);
        console.log(`[ImageSearch] Loaded index with ${cachedIndex.length} entries`);
        return cachedIndex;
    } catch (err) {
        console.error('[ImageSearch] Failed to load index:', err.message);
        return [];
    }
}

/**
 * Clear the cached index (useful after rebuilding).
 */
export function clearIndexCache() {
    cachedIndex = null;
}

/**
 * Search for similar images in the index.
 * 
 * @param {Buffer} imageBuffer - The query image buffer
 * @param {number} topN - Number of top results to return (default: 20)
 * @param {number} threshold - Minimum similarity score (default: 0.55)
 * @returns {Promise<Array>} Sorted results with similarity scores
 */
export async function searchByImage(imageBuffer, topN = 20, threshold = 0.55) {
    const startTime = Date.now();

    // Extract features from query image
    const [queryHash, queryColors] = await Promise.all([
        generateDHash(imageBuffer),
        extractColorHistogram(imageBuffer)
    ]);

    const queryFeatures = {
        hash: queryHash,
        colorHistogram: queryColors
    };

    // Load index
    const index = loadIndex();
    if (index.length === 0) {
        return { results: [], duration: 0, error: 'Index not built yet' };
    }

    // Compare with all entries
    const scored = [];
    for (const entry of index) {
        const similarity = calculateSimilarity(queryFeatures, entry);
        if (similarity >= threshold) {
            scored.push({
                product_url: entry.product_url,
                similarity: Math.round(similarity * 1000) / 1000
            });
        }
    }

    // Sort by similarity descending
    scored.sort((a, b) => b.similarity - a.similarity);

    const duration = Date.now() - startTime;
    console.log(`[ImageSearch] Search completed in ${duration}ms — ${scored.length} matches above threshold`);

    return {
        results: scored.slice(0, topN),
        totalMatches: scored.length,
        duration
    };
}

// ============================================
// INDEXING FUNCTIONS (used by build script)
// ============================================

/**
 * Generate features for a single image from its URL.
 * 
 * @param {string} imageUrl - URL of the image to process
 * @returns {Promise<{hash: string, colorHistogram: number[]}|null>}
 */
export async function generateFeatures(imageUrl) {
    try {
        // Derive Referer from image URL (needed for Yupoo CDN)
        let referer = '';
        try {
            const urlObj = new URL(imageUrl);
            referer = urlObj.origin + '/';
        } catch (_) { /* ignore */ }

        const response = await fetch(imageUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': referer,
                'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8'
            },
            signal: AbortSignal.timeout(15000)
        });

        if (!response.ok) return null;

        const buffer = Buffer.from(await response.arrayBuffer());

        const [hash, colorHistogram] = await Promise.all([
            generateDHash(buffer),
            extractColorHistogram(buffer)
        ]);

        return { hash, colorHistogram };
    } catch (err) {
        return null;
    }
}

/**
 * Save the generated index to disk.
 * 
 * @param {Array} indexEntries - Array of { product_url, hash, colorHistogram }
 */
export function saveIndex(indexEntries) {
    const dir = path.dirname(INDEX_PATH);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(INDEX_PATH, JSON.stringify(indexEntries), 'utf-8');
    console.log(`[ImageSearch] Index saved: ${indexEntries.length} entries → ${INDEX_PATH}`);

    // Clear cache so next search loads the new index
    clearIndexCache();
}

export { generateDHash, extractColorHistogram, INDEX_PATH };
