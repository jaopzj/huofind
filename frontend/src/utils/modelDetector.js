/**
 * Unified Product Model Detector
 * Routes to the appropriate detector based on category selection
 */

import { detectIPhoneModel, extractUniqueModels } from './iphoneDetector';
import { detectAppleWatchModel, extractUniqueWatchModels } from './appleWatchDetector';

/**
 * Detect product model based on category
 * @param {Object} product - Product object with name fields
 * @param {string} category - Category: 'iphone', 'applewatch', or 'generic'
 * @returns {string|null} - Detected model name or null
 */
export function detectProductModel(product, category = 'iphone') {
    switch (category) {
        case 'iphone':
            return detectIPhoneModel(product);
        case 'applewatch':
            return detectAppleWatchModel(product);
        case 'generic':
        default:
            return null; // No model detection for generic category
    }
}

/**
 * Get the appropriate icon for the category
 * @param {string} category - Category: 'iphone', 'applewatch', or 'generic'
 * @returns {string} - Emoji icon
 */
export function getModelIcon(category = 'iphone') {
    switch (category) {
        case 'iphone':
            return '📱';
        case 'applewatch':
            return '⌚';
        case 'generic':
        default:
            return '📦';
    }
}

/**
 * Extract unique models from products based on category
 * @param {Array} products - Array of products
 * @param {string} category - Category: 'iphone', 'applewatch', or 'generic'
 * @returns {Array} - Array of unique model names
 */
export function extractUniqueProductModels(products, category = 'iphone') {
    switch (category) {
        case 'iphone':
            return extractUniqueModels(products);
        case 'applewatch':
            return extractUniqueWatchModels(products);
        case 'generic':
        default:
            return []; // No models for generic category
    }
}

/**
 * Get label for model badge based on category
 * @param {string} category - Category: 'iphone', 'applewatch', or 'generic'
 * @returns {string} - Label text
 */
export function getModelLabel(category = 'iphone') {
    switch (category) {
        case 'iphone':
            return 'modelos';
        case 'applewatch':
            return 'modelos';
        case 'generic':
        default:
            return 'itens';
    }
}
