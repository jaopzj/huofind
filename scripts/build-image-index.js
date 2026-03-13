/**
 * Build Image Index Script
 * 
 * Downloads thumbnails from all Yupoo product JSON files and generates
 * perceptual hashes + color histograms for image search.
 * 
 * Features:
 * - Incremental saving every 500 images (progress not lost on interruption)
 * - Resumes from existing index (skips already-indexed products)
 * - Graceful shutdown on SIGINT (saves before exit)
 * 
 * Usage: node scripts/build-image-index.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateFeatures, saveIndex, INDEX_PATH } from '../backend/imageSearch.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const YUPOO_DATA_DIR = path.join(__dirname, '..', 'frontend', 'public', 'data', 'yupoo');
const CONCURRENCY = 10; // Reduced to avoid rate limiting
const SAVE_INTERVAL = 500; // Save every N successful indexes
const PROGRESS_INTERVAL = 50;

// Graceful shutdown flag
let shouldStop = false;

async function loadAllProducts() {
    const manifestPath = path.join(YUPOO_DATA_DIR, 'manifest.json');

    if (!fs.existsSync(manifestPath)) {
        throw new Error(`Manifest not found: ${manifestPath}`);
    }

    const fileList = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    let allProducts = [];

    for (const file of fileList) {
        const filePath = path.join(YUPOO_DATA_DIR, file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

        if (data.products && Array.isArray(data.products)) {
            allProducts = [...allProducts, ...data.products];
        }
    }

    return allProducts;
}

function loadExistingIndex() {
    if (fs.existsSync(INDEX_PATH)) {
        try {
            const data = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf-8'));
            console.log(`📂 Found existing index with ${data.length} entries`);
            return data;
        } catch {
            return [];
        }
    }
    return [];
}

async function processInBatches(products, concurrency) {
    // Load existing index for resume
    const existingIndex = loadExistingIndex();
    const existingUrls = new Set(existingIndex.map(e => e.product_url));
    const index = [...existingIndex];
    let lastSaveCount = existingIndex.length;

    let processed = 0;
    let failed = 0;

    // Filter products with valid images
    const withImages = products.filter(p => p.image && p.image.startsWith('http'));
    console.log(`\n📊 Total products: ${products.length}`);
    console.log(`🖼️  With valid images: ${withImages.length}`);
    console.log(`⏭️  Skipped (no image): ${products.length - withImages.length}`);

    // Deduplicate by image URL
    const uniqueByImage = new Map();
    for (const product of withImages) {
        if (!uniqueByImage.has(product.image)) {
            uniqueByImage.set(product.image, product);
        }
    }

    let uniqueProducts = Array.from(uniqueByImage.values());

    // Skip already indexed
    const toProcess = uniqueProducts.filter(p => !existingUrls.has(p.product_url));
    console.log(`🔍 Unique images total: ${uniqueProducts.length}`);
    console.log(`⏩ Already indexed: ${uniqueProducts.length - toProcess.length}`);
    console.log(`🆕 To process: ${toProcess.length}\n`);

    if (toProcess.length === 0) {
        console.log('✅ Index is already complete!');
        return index;
    }

    const startTime = Date.now();

    for (let i = 0; i < toProcess.length && !shouldStop; i += concurrency) {
        const batch = toProcess.slice(i, i + concurrency);

        const results = await Promise.allSettled(
            batch.map(async (product) => {
                const features = await generateFeatures(product.image);
                if (features) {
                    return {
                        product_url: product.product_url,
                        hash: features.hash,
                        colorHistogram: features.colorHistogram
                    };
                }
                return null;
            })
        );

        for (const result of results) {
            if (result.status === 'fulfilled' && result.value) {
                index.push(result.value);
                processed++;
            } else {
                failed++;
            }
        }

        // Progress log
        const total = processed + failed;
        if (total % PROGRESS_INTERVAL < concurrency || i + concurrency >= toProcess.length) {
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            const rate = total > 0 ? (total / (Date.now() - startTime) * 1000).toFixed(1) : '0';
            const pct = ((total / toProcess.length) * 100).toFixed(1);
            console.log(`⏳ Progress: ${total}/${toProcess.length} (${pct}%) | ✅ ${processed} new | ❌ ${failed} failed | Total: ${index.length} | ${elapsed}s | ${rate} img/s`);
        }

        // Incremental save every SAVE_INTERVAL successful indexes
        if (index.length - lastSaveCount >= SAVE_INTERVAL) {
            console.log(`💾 Auto-saving index (${index.length} entries)...`);
            saveIndex(index);
            lastSaveCount = index.length;
        }
    }

    // Final save
    if (index.length > lastSaveCount) {
        saveIndex(index);
    }

    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n${shouldStop ? '⚠️ Stopped early' : '✅ Indexing complete'} in ${totalDuration}s`);
    console.log(`📦 Total index: ${index.length} entries (${processed} new, ${existingIndex.length} existing)`);
    console.log(`❌ Failed: ${failed}`);

    return index;
}

async function main() {
    console.log('╔═══════════════════════════════════════════════╗');
    console.log('║    YUPOO IMAGE INDEX BUILDER                 ║');
    console.log('╚═══════════════════════════════════════════════╝');

    // Graceful shutdown handler
    process.on('SIGINT', () => {
        console.log('\n\n⚠️ SIGINT received — saving progress and exiting...');
        shouldStop = true;
    });

    try {
        const products = await loadAllProducts();
        const index = await processInBatches(products, CONCURRENCY);

        // Print index file size
        if (fs.existsSync(INDEX_PATH)) {
            const stats = fs.statSync(INDEX_PATH);
            const sizeKB = (stats.size / 1024).toFixed(1);
            console.log(`💾 Index file size: ${sizeKB} KB`);
        }
    } catch (error) {
        console.error('❌ Build failed:', error.message);
        process.exit(1);
    }
}

main();
