/**
 * Centralized environment configuration with validation.
 * Import this module early in server.js to fail fast on missing/invalid config.
 *
 * SEC-13: Validates all required environment variables at startup.
 */

import dotenv from 'dotenv';
dotenv.config();

// ============================================
// REQUIRED VARIABLES
// ============================================

const REQUIRED_ENV = [
    'JWT_SECRET',
    'SUPABASE_URL',
    'SUPABASE_SERVICE_KEY',
    'SUPABASE_ANON_KEY',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
];

// ============================================
// FORMAT VALIDATORS
// ============================================

const FORMAT_VALIDATORS = {
    SUPABASE_URL: {
        test: (v) => /^https:\/\/.+\.supabase\.co/.test(v),
        hint: 'Must be a valid Supabase URL (https://your-project.supabase.co)',
    },
    STRIPE_SECRET_KEY: {
        test: (v) => /^sk_(live|test)_/.test(v),
        hint: 'Must start with sk_live_ or sk_test_',
    },
    STRIPE_WEBHOOK_SECRET: {
        test: (v) => /^whsec_/.test(v),
        hint: 'Must start with whsec_',
    },
    JWT_SECRET: {
        test: (v) => v.length >= 32,
        hint: 'Must be at least 32 characters. Generate with: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"',
    },
};

// ============================================
// VALIDATION
// ============================================

const errors = [];
const warnings = [];

// Check required vars exist
for (const key of REQUIRED_ENV) {
    const value = process.env[key];
    if (!value || value.trim() === '') {
        errors.push(`  - ${key} is not set`);
        continue;
    }

    // Check format if validator exists
    const validator = FORMAT_VALIDATORS[key];
    if (validator && !validator.test(value)) {
        warnings.push(`  - ${key}: ${validator.hint}`);
    }
}

// Optional vars with format warnings
if (process.env.CLIENT_URL && !/^https?:\/\//.test(process.env.CLIENT_URL)) {
    warnings.push('  - CLIENT_URL: Must be a valid URL (http:// or https://)');
}

// Print warnings (non-fatal)
if (warnings.length > 0) {
    console.warn('\n[Config] Environment warnings:');
    warnings.forEach((w) => console.warn(w));
    console.warn('');
}

// Print errors and exit (fatal)
if (errors.length > 0) {
    console.error('\n[Config] FATAL: Missing required environment variables:');
    errors.forEach((e) => console.error(e));
    console.error('\nCopy backend/.env.example to backend/.env and fill in the values.');
    console.error('See README for setup instructions.\n');
    process.exit(1);
}

// ============================================
// EXPORTED CONFIG
// ============================================

export const config = {
    // Server
    port: parseInt(process.env.PORT, 10) || 3001,
    clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
    nodeEnv: process.env.NODE_ENV || 'development',
    isProduction: process.env.NODE_ENV === 'production',

    // JWT
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

    // Supabase
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY,

    // Stripe
    stripeSecretKey: process.env.STRIPE_SECRET_KEY,
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,

    // Admin
    adminSecret: process.env.ADMIN_SECRET || null,

    // Observability (optional)
    sentryDsn: process.env.SENTRY_DSN || null,
};

console.log(`[Config] Environment validated (${config.isProduction ? 'production' : 'development'})`);
