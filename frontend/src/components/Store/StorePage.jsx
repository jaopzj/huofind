import { useState } from 'react';
import { motion } from 'framer-motion';
import { LuShoppingBag, LuSparkles, LuZap } from 'react-icons/lu';
import CreditBalanceCard from './CreditBalanceCard';
import CreditPackageCard from './CreditPackageCard';
import SubscriptionSlider from './SubscriptionSlider';
import PurchaseHistorySection from './PurchaseHistorySection';

const CREDIT_PACKAGES = [
    { id: 'basic', credits: 50, price: 9.90, pricePerCredit: 0.20 },
    { id: 'standard', credits: 150, price: 24.90, pricePerCredit: 0.17, badge: 'popular' },
    { id: 'premium', credits: 300, price: 39.90, pricePerCredit: 0.13, badge: 'best' }
];

function StorePage({ user, miningInfo = {} }) {
    const [loadingPackage, setLoadingPackage] = useState(null);
    const [loadingSubscription, setLoadingSubscription] = useState(false);

    // Extract user info
    const credits = miningInfo.credits || 0;
    const maxCredits = miningInfo.maxCredits || 50;
    const nextRenewal = miningInfo.nextRenewal || null;

    // Determine current tier
    let currentTier = (user?.tier || 'guest').toLowerCase().trim();
    if (currentTier.includes('minerador') || currentTier.includes('gold') || currentTier.includes('ouro')) {
        currentTier = 'ouro';
    } else if (currentTier.includes('escavador') || currentTier.includes('silver') || currentTier.includes('prata')) {
        currentTier = 'prata';
    } else if (currentTier.includes('explorador') || currentTier.includes('bronze')) {
        currentTier = 'bronze';
    } else {
        currentTier = 'guest';
    }

    // Handle package purchase (mock for now)
    const handlePurchasePackage = async (packageId) => {
        setLoadingPackage(packageId);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 2000));
        setLoadingPackage(null);
        // TODO: Integrate with Stripe
        console.log('Purchase package:', packageId);
    };

    // Handle subscription (mock for now)
    const handleSubscribe = async (planId) => {
        setLoadingSubscription(true);
        await new Promise(resolve => setTimeout(resolve, 2000));
        setLoadingSubscription(false);
        console.log('Subscribe to plan:', planId);
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
                    isLoading={loadingSubscription}
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
                            onPurchase={() => handlePurchasePackage(pkg.id)}
                            isLoading={loadingPackage === pkg.id}
                            delay={0.1 + index * 0.1}
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
