/**
 * Stripe Payment Integration Module
 * 
 * Handles:
 * - Product/Price creation and caching
 * - Checkout Sessions for one-time credit purchases
 * - Subscription Sessions for recurring tier plans
 * - Customer management
 * - Webhook event processing
 */

import Stripe from 'stripe';
import supabase from './supabase.js';
import { TIER_CREDITS } from './tiers.js';
import { applyReferralBenefits, REFERRAL_DISCOUNT_PERCENT } from './referrals.js';
import { notifyPurchaseComplete, notifySubscriptionActivated, notifySubscriptionCanceled } from './notificationService.js';
import { config } from './config.js';

const stripe = new Stripe(config.stripeSecretKey);

const CLIENT_URL = config.clientUrl;

// ============================================
// PRODUCT & PRICE DEFINITIONS
// ============================================

/**
 * Credit packages (one-time payments)
 * Prices in BRL centavos
 */
const CREDIT_PACKAGES = {
    basic: {
        name: 'Pacote Básico — 50 Créditos',
        credits: 50,
        priceInCents: 990, // R$ 9,90
    },
    standard: {
        name: 'Pacote Padrão — 150 Créditos',
        credits: 150,
        priceInCents: 2490, // R$ 24,90
    },
    premium: {
        name: 'Pacote Premium — 300 Créditos',
        credits: 300,
        priceInCents: 3990, // R$ 39,90
    }
};

/**
 * Subscription plans (recurring monthly)
 * Prices in BRL centavos
 */
const SUBSCRIPTION_PLANS = {
    bronze: {
        name: 'Explorador (Bronze)',
        tier: 'bronze',
        credits: 50,
        priceInCents: 1990, // R$ 19,90/mês
    },
    prata: {
        name: 'Escavador (Prata)',
        tier: 'silver',
        credits: 150,
        priceInCents: 3990, // R$ 39,90/mês
    },
    ouro: {
        name: 'Minerador (Ouro)',
        tier: 'gold',
        credits: 300,
        priceInCents: 6990, // R$ 69,90/mês
    }
};

// Cached Stripe Price IDs (populated on first use)
let cachedPriceIds = {
    credits: {},      // { basic: 'price_...', standard: 'price_...', premium: 'price_...' }
    subscriptions: {} // { bronze: 'price_...', prata: 'price_...', ouro: 'price_...' }
};

// ============================================
// STRIPE PRODUCT/PRICE SYNC
// ============================================

/**
 * Ensure all Stripe products and prices exist.
 * Creates them if missing, caches Price IDs for reuse.
 * Call once on server startup.
 */
export async function syncStripeProducts() {
    console.log('[Stripe] Syncing products and prices...');

    // --- Credit Packages (one-time) ---
    for (const [key, pkg] of Object.entries(CREDIT_PACKAGES)) {
        const priceId = await ensureProduct({
            name: pkg.name,
            metadata: { type: 'credits', packageId: key, credits: String(pkg.credits) },
            priceInCents: pkg.priceInCents,
            recurring: false,
            lookupKey: `credits_${key}`
        });
        cachedPriceIds.credits[key] = priceId;
        console.log(`[Stripe]   ✓ Credit package "${key}" → ${priceId}`);
    }

    // --- Subscription Plans (recurring) ---
    for (const [key, plan] of Object.entries(SUBSCRIPTION_PLANS)) {
        const priceId = await ensureProduct({
            name: plan.name,
            metadata: { type: 'subscription', planId: key, tier: plan.tier, credits: String(plan.credits) },
            priceInCents: plan.priceInCents,
            recurring: true,
            lookupKey: `sub_${key}`
        });
        cachedPriceIds.subscriptions[key] = priceId;
        console.log(`[Stripe]   ✓ Subscription "${key}" → ${priceId}`);
    }

    console.log('[Stripe] ✓ All products synced');
}

/**
 * Find or create a Stripe Product + Price.
 * Uses lookup_key on prices to find existing ones.
 */
async function ensureProduct({ name, metadata, priceInCents, recurring, lookupKey }) {
    // Try to find existing price by lookup_key
    const existingPrices = await stripe.prices.list({
        lookup_keys: [lookupKey],
        limit: 1,
        active: true
    });

    if (existingPrices.data.length > 0) {
        const price = existingPrices.data[0];
        // Check if price amount matches — if not, create new price
        if (price.unit_amount === priceInCents) {
            return price.id;
        }
        // Price changed: deactivate old, create new below
        console.log(`[Stripe]   Price changed for ${lookupKey}: ${price.unit_amount} → ${priceInCents}`);
        await stripe.prices.update(price.id, { active: false });
    }

    // Create product
    const product = await stripe.products.create({
        name,
        metadata
    });

    // Create price
    const priceData = {
        product: product.id,
        unit_amount: priceInCents,
        currency: 'brl',
        lookup_key: lookupKey,
        transfer_lookup_key: true, // Ensures unique lookup_key
        metadata
    };

    if (recurring) {
        priceData.recurring = { interval: 'month' };
    }

    const price = await stripe.prices.create(priceData);
    return price.id;
}

// ============================================
// CUSTOMER MANAGEMENT
// ============================================

/**
 * Get or create a Stripe Customer for a given user.
 */
export async function getOrCreateCustomer(userId, email, name) {
    // Check if user already has a stripe_customer_id
    const { data: user } = await supabase
        .from('users')
        .select('stripe_customer_id')
        .eq('id', userId)
        .single();

    if (user?.stripe_customer_id) {
        // Validate that the customer still exists on Stripe
        // (handles test→live key switch or manually deleted customers)
        try {
            await stripe.customers.retrieve(user.stripe_customer_id);
            return user.stripe_customer_id;
        } catch (err) {
            if (err.code === 'resource_missing') {
                console.warn(`[Stripe] Customer ${user.stripe_customer_id} no longer exists on Stripe. Creating a new one for user ${userId}.`);
            } else {
                // For other errors (network, auth, etc.), re-throw to avoid silent failures
                throw err;
            }
        }
    }

    // Create new Stripe customer
    const customer = await stripe.customers.create({
        email,
        name: name || undefined,
        metadata: { userId }
    });

    // Save to database
    await supabase
        .from('users')
        .update({ stripe_customer_id: customer.id })
        .eq('id', userId);

    console.log(`[Stripe] Created customer ${customer.id} for user ${userId}`);
    return customer.id;
}

// ============================================
// CHECKOUT SESSIONS
// ============================================

/**
 * Create a Checkout Session for a one-time credit package purchase.
 * Supports referral discount (15% off, one-time use).
 */
export async function createCreditCheckoutSession(userId, email, name, packageId, useReferral = false) {
    const pkg = CREDIT_PACKAGES[packageId];
    if (!pkg) throw new Error(`Pacote inválido: ${packageId}`);

    const customerId = await getOrCreateCustomer(userId, email, name);

    // Check if user has an unused referral code
    let discountApplied = false;
    let finalPriceInCents = pkg.priceInCents;

    if (useReferral) {
        const { data: user } = await supabase
            .from('users')
            .select('referred_by_code, referral_used_at')
            .eq('id', userId)
            .single();

        if (user?.referred_by_code && !user?.referral_used_at) {
            finalPriceInCents = Math.round(pkg.priceInCents * (1 - REFERRAL_DISCOUNT_PERCENT / 100));
            discountApplied = true;
            console.log(`[Stripe] Referral discount applied: ${pkg.priceInCents} → ${finalPriceInCents} cents`);
        }
    }

    // Use inline price_data so we can adjust the amount for referral discounts
    const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: [{
            price_data: {
                currency: 'brl',
                product_data: {
                    name: pkg.name,
                    metadata: { type: 'credits', packageId, credits: String(pkg.credits) },
                },
                unit_amount: finalPriceInCents,
            },
            quantity: 1,
        }],
        metadata: {
            userId,
            type: 'credits',
            packageId,
            credits: String(pkg.credits),
            referralDiscount: discountApplied ? 'true' : 'false',
        },
        success_url: `${CLIENT_URL}/store?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${CLIENT_URL}/store?canceled=true`,
    });

    return session;
}

/**
 * Create a Checkout Session for a subscription.
 * Supports referral discount via Stripe coupon (15% off first month).
 */
export async function createSubscriptionCheckoutSession(userId, email, name, planId, useReferral = false) {
    const plan = SUBSCRIPTION_PLANS[planId];
    if (!plan) throw new Error(`Plano inválido: ${planId}`);

    const priceId = cachedPriceIds.subscriptions[planId];
    if (!priceId) throw new Error(`Preço não encontrado para plano: ${planId}`);

    const customerId = await getOrCreateCustomer(userId, email, name);

    // Check if user already has an active subscription
    const { data: user } = await supabase
        .from('users')
        .select('stripe_subscription_id, subscription_status, referred_by_code, referral_used_at')
        .eq('id', userId)
        .single();

    if (user?.stripe_subscription_id && user?.subscription_status === 'active') {
        throw new Error('ALREADY_SUBSCRIBED');
    }

    // Build session config
    const sessionConfig = {
        customer: customerId,
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [{
            price: priceId,
            quantity: 1,
        }],
        metadata: {
            userId,
            type: 'subscription',
            planId,
            tier: plan.tier,
            credits: String(plan.credits),
            referralDiscount: 'false',
        },
        subscription_data: {
            metadata: {
                userId,
                planId,
                tier: plan.tier,
            }
        },
        success_url: `${CLIENT_URL}/store?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${CLIENT_URL}/store?canceled=true`,
    };

    // Apply referral discount as Stripe coupon (15% off first month)
    // SECURITY: Use deterministic coupon ID per user to prevent coupon spam (H1)
    if (useReferral && user?.referred_by_code && !user?.referral_used_at) {
        try {
            const couponId = `referral_${userId.replace(/-/g, '').substring(0, 20)}`;
            let coupon;

            // Try to retrieve existing coupon first
            try {
                coupon = await stripe.coupons.retrieve(couponId);
            } catch (e) {
                // Coupon doesn't exist — create it
                coupon = await stripe.coupons.create({
                    id: couponId,
                    percent_off: REFERRAL_DISCOUNT_PERCENT,
                    duration: 'once',
                    max_redemptions: 1,
                    name: `Referral ${REFERRAL_DISCOUNT_PERCENT}% OFF`,
                    metadata: { userId, type: 'referral' },
                });
            }

            sessionConfig.discounts = [{ coupon: coupon.id }];
            sessionConfig.metadata.referralDiscount = 'true';
            console.log(`[Stripe] Referral coupon: ${coupon.id} (${REFERRAL_DISCOUNT_PERCENT}% off)`);
        } catch (err) {
            console.error('[Stripe] Error creating referral coupon:', err.message);
        }
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);
    return session;
}

/**
 * Create a Stripe Customer Portal session for subscription management.
 */
export async function createPortalSession(userId) {
    const { data: user } = await supabase
        .from('users')
        .select('stripe_customer_id')
        .eq('id', userId)
        .single();

    if (!user?.stripe_customer_id) {
        throw new Error('Nenhuma conta Stripe vinculada');
    }

    const session = await stripe.billingPortal.sessions.create({
        customer: user.stripe_customer_id,
        return_url: `${CLIENT_URL}/store`,
    });

    return session;
}

// ============================================
// WEBHOOK PROCESSING
// ============================================

/**
 * Verify and construct Stripe webhook event.
 */
export function constructWebhookEvent(rawBody, signature) {
    const webhookSecret = config.stripeWebhookSecret;

    if (!webhookSecret) {
        // SECURITY: Never process webhooks without signature verification
        throw new Error('STRIPE_WEBHOOK_SECRET not configured — webhook rejected for security');
    }

    return stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
}

/**
 * Handle a Stripe webhook event.
 * LOG-02: Idempotency — skips already-processed events to prevent duplicate side effects.
 */
export async function handleWebhookEvent(event) {
    // --- Idempotency check ---
    const { data: existing } = await supabase
        .from('processed_stripe_events')
        .select('event_id')
        .eq('event_id', event.id)
        .maybeSingle();

    if (existing) {
        console.log(`[Stripe] Event ${event.id} (${event.type}) already processed, skipping`);
        return;
    }

    // Mark event as processing before handling
    const { error: insertError } = await supabase
        .from('processed_stripe_events')
        .insert({ event_id: event.id, event_type: event.type });

    if (insertError) {
        // Unique constraint violation = another instance is processing this event concurrently
        if (insertError.code === '23505') {
            console.log(`[Stripe] Event ${event.id} being processed by another instance, skipping`);
            return;
        }
        console.error(`[Stripe] Failed to record event ${event.id}:`, insertError.message);
        // Continue processing — better to risk a duplicate than to drop an event
    }

    switch (event.type) {
        case 'checkout.session.completed':
            await handleCheckoutCompleted(event.data.object);
            break;

        case 'invoice.paid':
            await handleInvoicePaid(event.data.object);
            break;

        case 'customer.subscription.updated':
            await handleSubscriptionUpdated(event.data.object);
            break;

        case 'customer.subscription.deleted':
            await handleSubscriptionDeleted(event.data.object);
            break;

        case 'checkout.session.expired':
            // L3: Log abandoned checkout sessions for monitoring
            console.log(`[Stripe] Checkout session expired: ${event.data.object?.id} (user: ${event.data.object?.metadata?.userId || 'unknown'})`);
            break;

        default:
            console.log(`[Stripe] Unhandled event: ${event.type}`);
    }
}

/**
 * Handle checkout.session.completed
 */
async function handleCheckoutCompleted(session) {
    const { userId, type, packageId, planId, credits, tier, referralDiscount } = session.metadata || {};

    if (!userId) {
        console.error('[Stripe] Webhook: missing userId in metadata');
        return;
    }

    console.log(`[Stripe] Checkout completed: type=${type}, userId=${userId}`);

    if (type === 'credits') {
        // --- One-time credit purchase (package credits — permanent) ---
        const creditsToAdd = parseInt(credits, 10);

        // SECURITY: Validate credits value is a positive number and matches known package
        const expectedPkg = CREDIT_PACKAGES[packageId];
        if (isNaN(creditsToAdd) || creditsToAdd <= 0 || !expectedPkg || expectedPkg.credits !== creditsToAdd) {
            console.error(`[Stripe] SECURITY: Invalid credits metadata: credits=${credits}, packageId=${packageId}`);
            return;
        }

        // Add credits to existing balance (accumulate, don't replace)
        // SECURITY: Optimistic locking to prevent race condition
        const { data: user } = await supabase
            .from('users')
            .select('credits, credits_package')
            .eq('id', userId)
            .single();

        const currentCredits = user?.credits || 0;
        const currentPackage = user?.credits_package || 0;
        const newBalance = currentCredits + creditsToAdd;
        const newPackage = currentPackage + creditsToAdd;

        const { data: updated, error: updateError } = await supabase
            .from('users')
            .update({ credits: newBalance, credits_package: newPackage })
            .eq('id', userId)
            .eq('credits', currentCredits) // Optimistic lock
            .select('credits')
            .single();

        if (updateError || !updated) {
            console.error(`[Stripe] SECURITY: Optimistic lock failed adding package credits for user ${userId}. Possible race condition.`);
            return;
        }

        console.log(`[Stripe] ✅ Added ${creditsToAdd} package credits to user ${userId}: ${currentCredits} → ${newBalance} (package: ${currentPackage} → ${newPackage})`);

        // FEAT-01: Notify user about purchase
        notifyPurchaseComplete(userId, creditsToAdd, session.amount_total / 100).catch(() => {});

        // Record purchase
        await recordPurchase({
            userId,
            type: 'credits',
            stripeSessionId: session.id,
            stripePaymentIntent: session.payment_intent,
            amountBrl: session.amount_total / 100,
            creditsAdded: creditsToAdd,
            planId: packageId,
            status: 'completed'
        });

    } else if (type === 'subscription') {
        // --- Subscription activated ---
        // ADD monthly credits to existing balance (don't replace)
        const monthlyCredits = parseInt(credits, 10);
        const subscriptionId = session.subscription;

        // SECURITY: Validate credits value matches the plan
        const expectedPlan = SUBSCRIPTION_PLANS[planId];
        if (isNaN(monthlyCredits) || monthlyCredits <= 0 || !expectedPlan || expectedPlan.credits !== monthlyCredits) {
            console.error(`[Stripe] SECURITY: Invalid subscription credits metadata: credits=${credits}, planId=${planId}`);
            return;
        }

        const { data: user } = await supabase
            .from('users')
            .select('credits')
            .eq('id', userId)
            .single();

        const currentCredits = user?.credits || 0;
        const newBalance = currentCredits + monthlyCredits;

        await supabase
            .from('users')
            .update({
                tier: tier,
                credits: newBalance,
                credits_last_reset: new Date().toISOString(),
                stripe_subscription_id: subscriptionId,
                subscription_status: 'active',
            })
            .eq('id', userId);

        console.log(`[Stripe] ✅ Subscription activated: user=${userId}, tier=${tier}, credits=${currentCredits} + ${monthlyCredits} = ${newBalance}`);

        // FEAT-01: Notify user about subscription
        notifySubscriptionActivated(userId, tier, monthlyCredits).catch(() => {});

        // Record purchase
        await recordPurchase({
            userId,
            type: 'subscription',
            stripeSessionId: session.id,
            stripePaymentIntent: session.payment_intent || null,
            amountBrl: session.amount_total / 100,
            creditsAdded: monthlyCredits,
            planId: planId,
            status: 'completed'
        });
    }

    // Apply referral benefits if this purchase used a referral discount
    if (referralDiscount === 'true') {
        try {
            const amountBrl = (session.amount_total || 0) / 100;
            const result = await applyReferralBenefits(userId, amountBrl, planId || packageId);
            if (result.applied) {
                console.log(`[Stripe] ✅ Referral benefits applied: ${result.bonusCredits} bonus credits to user, ${result.referrerBonusCredits} to referrer`);
            }
        } catch (err) {
            console.error('[Stripe] Error applying referral benefits:', err.message);
        }
    }
}

/**
 * Handle invoice.paid (subscription renewal)
 * Monthly credits are ADDED to existing balance (package credits preserved).
 * Old monthly credits are expired first (subtract tier amount), then new ones are added.
 */
async function handleInvoicePaid(invoice) {
    // Only process subscription renewals (not the first invoice)
    if (invoice.billing_reason === 'subscription_create') {
        console.log('[Stripe] First invoice — already handled by checkout.session.completed');
        return;
    }

    const subscriptionId = invoice.subscription;
    if (!subscriptionId) return;

    // Find user by subscription ID
    const { data: user } = await supabase
        .from('users')
        .select('id, tier, credits, credits_package')
        .eq('stripe_subscription_id', subscriptionId)
        .single();

    if (!user) {
        console.error(`[Stripe] invoice.paid: No user found for subscription ${subscriptionId}`);
        return;
    }

    const tierCredits = TIER_CREDITS[user.tier]?.credits || 50;
    const currentCredits = user.credits || 0;
    const packageCredits = user.credits_package || 0;

    // Expire old monthly credits: remove the old tier amount, but never go below package credits
    const afterExpiry = Math.max(packageCredits, currentCredits - tierCredits);
    // Add new monthly credits
    const newBalance = afterExpiry + tierCredits;

    await supabase
        .from('users')
        .update({
            credits: newBalance,
            credits_last_reset: new Date().toISOString(),
        })
        .eq('id', user.id);

    console.log(`[Stripe] ✅ Subscription renewed: user=${user.id}, credits: ${currentCredits} → expire(${afterExpiry}) + ${tierCredits} = ${newBalance} (package: ${packageCredits})`);

    // Record renewal
    await recordPurchase({
        userId: user.id,
        type: 'renewal',
        stripeSessionId: null,
        stripePaymentIntent: invoice.payment_intent,
        amountBrl: invoice.amount_paid / 100,
        creditsAdded: tierCredits,
        planId: user.tier,
        status: 'completed'
    });
}

/**
 * Handle customer.subscription.updated
 */
async function handleSubscriptionUpdated(subscription) {
    const userId = subscription.metadata?.userId;
    if (!userId) return;

    const status = subscription.status; // active, past_due, canceled, etc.

    await supabase
        .from('users')
        .update({ subscription_status: status })
        .eq('id', userId);

    console.log(`[Stripe] Subscription updated: user=${userId}, status=${status}`);
}

/**
 * Handle customer.subscription.deleted (canceled)
 */
async function handleSubscriptionDeleted(subscription) {
    const userId = subscription.metadata?.userId;

    if (!userId) {
        // Fallback: find by subscription ID
        const { data: user } = await supabase
            .from('users')
            .select('id')
            .eq('stripe_subscription_id', subscription.id)
            .single();

        if (!user) {
            console.error(`[Stripe] subscription.deleted: No user found for ${subscription.id}`);
            return;
        }

        await downgradeUser(user.id);
        return;
    }

    await downgradeUser(userId);
}

/**
 * Downgrade user to guest tier after subscription cancellation.
 * Preserves package credits (permanent). Only removes monthly credits.
 */
async function downgradeUser(userId) {
    // Get current package credits to preserve them
    const { data: user } = await supabase
        .from('users')
        .select('credits_package')
        .eq('id', userId)
        .single();

    const packageCredits = user?.credits_package || 0;
    // Guest gets at least 3 credits, or their package credits if higher
    const finalCredits = Math.max(3, packageCredits);

    await supabase
        .from('users')
        .update({
            tier: 'guest',
            stripe_subscription_id: null,
            subscription_status: 'canceled',
            credits: finalCredits,
        })
        .eq('id', userId);

    console.log(`[Stripe] ✅ User ${userId} downgraded to guest (preserved ${packageCredits} package credits, final: ${finalCredits})`);

    // FEAT-01: Notify user about cancellation
    notifySubscriptionCanceled(userId).catch(() => {});
}

// ============================================
// PURCHASE HISTORY
// ============================================

/**
 * Record a purchase in the database.
 */
async function recordPurchase({ userId, type, stripeSessionId, stripePaymentIntent, amountBrl, creditsAdded, planId, status }) {
    const { error } = await supabase.from('purchase_history').insert({
        user_id: userId,
        type,
        stripe_session_id: stripeSessionId,
        stripe_payment_intent: stripePaymentIntent,
        amount_brl: amountBrl,
        credits_added: creditsAdded,
        plan_id: planId,
        status,
    });

    if (error) {
        console.error('[Stripe] Error recording purchase:', error);
    }
}

/**
 * Get purchase history for a user.
 */
export async function getPurchaseHistory(userId) {
    const { data, error } = await supabase
        .from('purchase_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

    if (error) {
        console.error('[Stripe] Error fetching purchase history:', error);
        return [];
    }

    return data;
}

/**
 * Get user subscription status.
 */
export async function getSubscriptionStatus(userId) {
    const { data: user } = await supabase
        .from('users')
        .select('tier, stripe_customer_id, stripe_subscription_id, subscription_status')
        .eq('id', userId)
        .single();

    if (!user) return null;

    let currentPeriodEnd = null;

    // Fetch subscription details from Stripe if active
    if (user.stripe_subscription_id && user.subscription_status === 'active') {
        try {
            const sub = await stripe.subscriptions.retrieve(user.stripe_subscription_id);
            currentPeriodEnd = new Date(sub.current_period_end * 1000).toISOString();
        } catch (err) {
            console.error('[Stripe] Error fetching subscription:', err.message);
        }
    }

    return {
        tier: user.tier,
        subscriptionId: user.stripe_subscription_id,
        status: user.subscription_status,
        currentPeriodEnd,
    };
}

/**
 * Check subscription expiry and downgrade if needed.
 * This is a server-side safety net — runs on each mining-status request
 * to catch expired subscriptions even if webhooks didn't fire.
 * Returns { expired, currentPeriodEnd } so frontend can show countdown.
 */
export async function checkSubscriptionExpiry(userId) {
    const { data: user } = await supabase
        .from('users')
        .select('tier, stripe_subscription_id, subscription_status')
        .eq('id', userId)
        .single();

    if (!user) return { expired: false, currentPeriodEnd: null };

    // Only check users who have an active subscription stored locally
    if (!user.stripe_subscription_id || user.tier === 'guest') {
        return { expired: false, currentPeriodEnd: null };
    }

    try {
        const sub = await stripe.subscriptions.retrieve(user.stripe_subscription_id);
        const currentPeriodEnd = new Date(sub.current_period_end * 1000);
        const now = new Date();

        // Check if the subscription is truly expired
        // Stripe statuses: active, past_due, canceled, incomplete, incomplete_expired, trialing, unpaid, paused
        const isActive = sub.status === 'active' || sub.status === 'trialing';

        if (!isActive) {
            // Subscription is no longer active on Stripe — downgrade user
            console.log(`[Stripe] ⚠ Subscription ${sub.id} expired (status=${sub.status}). Downgrading user ${userId}.`);
            await downgradeUser(userId);
            return { expired: true, currentPeriodEnd: currentPeriodEnd.toISOString() };
        }

        // Subscription is active — check if period has ended (edge case: Stripe hasn't updated yet)
        if (currentPeriodEnd < now && sub.cancel_at_period_end) {
            console.log(`[Stripe] ⚠ Subscription period ended and set to cancel. Downgrading user ${userId}.`);
            await downgradeUser(userId);
            return { expired: true, currentPeriodEnd: currentPeriodEnd.toISOString() };
        }

        // Still active — return the period end date for the countdown
        return { expired: false, currentPeriodEnd: currentPeriodEnd.toISOString() };
    } catch (err) {
        console.error('[Stripe] Error checking subscription expiry:', err.message);
        // On error, don't downgrade — return null period end
        return { expired: false, currentPeriodEnd: null };
    }
}

// ============================================
// SESSION FULFILLMENT (fallback for webhooks)
// ============================================

/**
 * Verify and fulfill a Checkout Session by ID.
 * Called by the frontend after returning from Stripe Checkout.
 * This is a fallback for when webhooks can't reach the server (e.g. localhost).
 * Idempotent: checks if already processed before applying.
 */
export async function fulfillCheckoutSession(sessionId, userId) {
    // 1. Retrieve the session from Stripe with full details
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session) {
        throw new Error('Sessão não encontrada');
    }

    // 2. Verify payment status
    if (session.payment_status !== 'paid') {
        console.log(`[Stripe] Session ${sessionId} not paid yet: ${session.payment_status}`);
        return { status: 'pending', message: 'Pagamento ainda não confirmado' };
    }

    // 3. SECURITY: Strictly verify the session belongs to this user (mandatory)
    const sessionUserId = session.metadata?.userId;
    if (!sessionUserId || sessionUserId !== userId) {
        console.error(`[Stripe] SECURITY: Session userId mismatch: session=${sessionUserId}, request=${userId}`);
        throw new Error('Sessão não pertence a este usuário');
    }

    // 4. Idempotency check: was this session already processed?
    const { data: existingPurchase } = await supabase
        .from('purchase_history')
        .select('id')
        .eq('stripe_session_id', sessionId)
        .single();

    if (existingPurchase) {
        console.log(`[Stripe] Session ${sessionId} already fulfilled — skipping`);
        return { status: 'already_processed', message: 'Este pagamento já foi processado' };
    }

    // 5. Process based on type
    console.log(`[Stripe] Fulfilling session ${sessionId} for user ${userId}`);
    await handleCheckoutCompleted(session);

    return { status: 'fulfilled', message: 'Pagamento processado com sucesso' };
}

// ============================================
// EXPORTS
// ============================================

export {
    stripe,
    CREDIT_PACKAGES,
    SUBSCRIPTION_PLANS,
};
