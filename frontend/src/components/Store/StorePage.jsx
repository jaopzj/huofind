import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { LuShoppingBag, LuSparkles, LuZap, LuCheck, LuX } from 'react-icons/lu';
import CreditBalanceCard from './CreditBalanceCard';
import CreditPackageCard from './CreditPackageCard';
import SubscriptionSlider from './SubscriptionSlider';
import PurchaseHistorySection from './PurchaseHistorySection';
import ReferralCodeInput from './ReferralCodeInput';
import { normalizeTier } from '../../utils/tierUtils';

const CREDIT_PACKAGES = [
    { id: 'basic', credits: 50, price: 9.90, pricePerCredit: 0.20, iconUrl: 'https://i.imgur.com/aebN4UW.png', iconScale: 1 },
    { id: 'standard', credits: 150, price: 24.90, pricePerCredit: 0.17, badge: 'popular', iconUrl: 'https://i.imgur.com/qU3oNn3.png', iconScale: 1.4 },
    { id: 'premium', credits: 300, price: 39.90, pricePerCredit: 0.13, badge: 'best', iconUrl: 'https://i.imgur.com/t42qnks.png', iconScale: 1.4 }
];

function StorePage({ user, miningInfo = {} }) {
    const [loadingPackage, setLoadingPackage] = useState(null);
    const [loadingSubscription, setLoadingSubscription] = useState(false);
    const [storedRefCode, setStoredRefCode] = useState(null);
    const [refCodeLocked, setRefCodeLocked] = useState(false);
    const [hasReferralCode, setHasReferralCode] = useState(false);
    const [feedback, setFeedback] = useState(null); // { type: 'success' | 'canceled', message }

    const token = localStorage.getItem('accessToken');

    // Extract user info — values come from server, null while loading
    const credits = miningInfo.credits || 0;
    const maxCredits = miningInfo.maxCredits;
    const nextRenewal = miningInfo.nextRenewal || null;

    // Determine current tier (canonical English name)
    const currentTier = normalizeTier(user?.tier);

    // Fetch stored referral code on mount
    useEffect(() => {
        const fetchStoredCode = async () => {
            if (!token) return;
            try {
                const res = await fetch('/api/referral/stored-code', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.code) {
                        setStoredRefCode(data.code);
                        setRefCodeLocked(!data.used);
                        setHasReferralCode(true);
                    }
                }
            } catch (err) {
                console.error('[StorePage] Error fetching stored ref code:', err);
            }
        };
        fetchStoredCode();
    }, [token]);

    // Handle referral code applied
    const handleCodeApplied = (code, discount) => {
        setStoredRefCode(code);
        setRefCodeLocked(true);
        setHasReferralCode(true);
        console.log('[StorePage] Referral code applied:', code, discount + '%');
    };

    // Auto-dismiss feedback after 8s
    useEffect(() => {
        if (feedback) {
            const timer = setTimeout(() => setFeedback(null), 8000);
            return () => clearTimeout(timer);
        }
    }, [feedback]);

    // Handle package purchase via Stripe Checkout
    const handlePurchasePackage = async (packageId) => {
        setLoadingPackage(packageId);
        try {
            const res = await fetch('/api/stripe/checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ packageId, useReferral: hasReferralCode && refCodeLocked })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Erro ao iniciar pagamento');
            }

            // Redirect to Stripe Checkout
            window.location.href = data.url;
        } catch (err) {
            console.error('[StorePage] Purchase error:', err);
            setFeedback({ type: 'canceled', message: err.message });
            setLoadingPackage(null);
        }
    };

    // Handle subscription via Stripe Checkout
    const handleSubscribe = async (planId) => {
        setLoadingSubscription(true);
        try {
            const res = await fetch('/api/stripe/subscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ planId, useReferral: hasReferralCode && refCodeLocked })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Erro ao iniciar assinatura');
            }

            // Redirect to Stripe Checkout
            window.location.href = data.url;
        } catch (err) {
            console.error('[StorePage] Subscribe error:', err);
            setFeedback({ type: 'canceled', message: err.message });
            setLoadingSubscription(false);
        }
    };

    // Handle portal session for managing existing subscription
    const handleManageSubscription = async () => {
        try {
            const res = await fetch('/api/stripe/portal', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Erro ao abrir portal');
            }

            window.location.href = data.url;
        } catch (err) {
            console.error('[StorePage] Portal error:', err);
            setFeedback({ type: 'canceled', message: err.message });
        }
    };

    return (
        <div className="w-full max-w-5xl mx-auto px-4 md:px-8 py-6">
            {/* Page Title */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 mb-8"
            >
                <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center"
                    style={{
                        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                        boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
                    }}
                >
                    <LuShoppingBag className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white">
                        Loja
                    </h1>
                    <p className="text-sm text-gray-400">Compre créditos e gerencie seu plano</p>
                </div>
            </motion.div>

            {/* Credit Balance Card */}
            <CreditBalanceCard
                credits={credits}
                maxCredits={maxCredits}
                nextRenewal={nextRenewal}
                tier={currentTier}
            />

            {/* Payment Feedback Toast */}
            {feedback && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className={`mb-6 p-4 rounded-2xl border flex items-center gap-3 ${feedback.type === 'success'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : 'bg-red-500/10 border-red-500/30 text-red-400'
                        }`}
                >
                    {feedback.type === 'success'
                        ? <LuCheck className="w-5 h-5 flex-shrink-0" />
                        : <LuX className="w-5 h-5 flex-shrink-0" />
                    }
                    <span className="text-sm font-medium">{feedback.message}</span>
                    <button
                        onClick={() => setFeedback(null)}
                        className="ml-auto text-white/40 hover:text-white/80 text-lg leading-none"
                    >
                        ×
                    </button>
                </motion.div>
            )}

            {/* Referral Code Input */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.05 }}
                className="mb-6"
            >
                <ReferralCodeInput
                    onCodeApplied={handleCodeApplied}
                    refCodeLocked={refCodeLocked}
                    storedRefCode={storedRefCode}
                />
            </motion.div>

            {/* Subscription Plans Section */}
            <motion.section
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="mb-10"
            >
                <div className="flex items-center gap-2 mb-2">
                    <LuSparkles className="w-5 h-5 text-blue-500" />
                    <h2 className="text-xl font-bold text-white">Planos de Assinatura</h2>
                </div>
                <p className="text-sm text-gray-400 mb-6">
                    Assine um plano e receba créditos mensais automaticamente, além de benefícios exclusivos.
                </p>

                <SubscriptionSlider
                    currentTier={currentTier}
                    onSubscribe={handleSubscribe}
                    onManageSubscription={handleManageSubscription}
                    isLoading={loadingSubscription}
                    hasDiscount={hasReferralCode && refCodeLocked}
                    discountPercent={15}
                />
            </motion.section>

            {/* Credit Packages Section */}
            <motion.section
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="mb-10"
            >
                <div className="flex items-center gap-2 mb-2">
                    <LuZap className="w-5 h-5 text-blue-500" />
                    <h2 className="text-xl font-bold text-white">Pacotes de Créditos</h2>
                </div>
                <p className="text-sm text-gray-400 mb-6">
                    Compre créditos avulsos para usar imediatamente. Sem assinatura.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {CREDIT_PACKAGES.map((pkg, index) => (
                        <CreditPackageCard
                            key={pkg.id}
                            credits={pkg.credits}
                            price={pkg.price}
                            pricePerCredit={pkg.pricePerCredit}
                            badge={pkg.badge}
                            badgeType={pkg.badge}
                            iconUrl={pkg.iconUrl}
                            iconScale={pkg.iconScale}
                            onPurchase={() => handlePurchasePackage(pkg.id)}
                            isLoading={loadingPackage === pkg.id}
                            delay={0.1 + index * 0.1}
                            hasDiscount={hasReferralCode && refCodeLocked}
                            discountPercent={15}
                        />
                    ))}
                </div>
            </motion.section>

            {/* Purchase History */}
            <PurchaseHistorySection />

            {/* Bottom spacing */}
            <div className="h-8" />
        </div>
    );
}

export default StorePage;
