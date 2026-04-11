import { useOutletContext } from 'react-router-dom';
import HeroSection from '../components/HeroSection';
import SellerCard from '../components/SellerCard';
import SearchFilters from '../components/SearchFilters';
import ProductGrid from '../components/ProductGrid';
import WifiLoader from '../components/WifiLoader';

/**
 * MiningPage - Xianyu seller mining with SSE progress, filters, and product grid.
 * Extracted from App.jsx inline rendering.
 */
export default function MiningPage() {
    const ctx = useOutletContext();

    const {
        products, loading, evaluating, error, sellerInfo,
        filters, setFilters, selectedCategory, setSelectedCategory,
        showBRL, toggleCurrency, exchangeRate,
        miningStage, miningInfo, showLimitError, setShowLimitError,
        heroUrl, currentMiningUrl,
        savedProductUrls, savedSellerIds,
        handleUrlChange, handleMine, handleSaveProductToggle, handleSaveSeller,
        setProducts, setSellerInfo,
        filteredProducts, availableModels, availableStorages,
        availableWatchModels, availableWatchSizes,
        hasResults,
    } = ctx;

    return (
        <div className={`${hasResults ? 'max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8' : ''}`}>
            {/* Hero Section - only appears when no results and not loading */}
            {!hasResults && !loading && (
                <HeroSection
                    onUrlChange={(url) => {
                        ctx.setHeroUrl(url);
                        handleUrlChange(url);
                    }}
                    onMine={handleMine}
                    isEvaluating={evaluating}
                    isLoading={loading}
                    isSellerVerified={sellerInfo !== null && !evaluating}
                    sellerInfo={sellerInfo}
                    selectedCategory={selectedCategory}
                    onCategoryChange={setSelectedCategory}
                    miningInfo={miningInfo}
                    showLimitError={showLimitError}
                    onDismissLimitError={() => setShowLimitError(false)}
                    initialUrl={heroUrl}
                />
            )}

            {/* Loading State with WiFi Animation */}
            {loading && (
                <div className="min-h-[60vh] flex flex-col items-center justify-center">
                    <WifiLoader message="Minerando..." />
                    <div className="text-center mt-4">
                        <p className="font-medium text-base" style={{ color: '#4B5563' }}>
                            {miningStage.stage === 'connecting' && 'Conectando ao vendedor...'}
                            {miningStage.stage === 'navigating' && 'Navegando para página...'}
                            {miningStage.stage === 'verifying' && 'Verificando vendedor...'}
                            {miningStage.stage === 'seller_verified' && 'Vendedor verificado!'}
                            {miningStage.stage === 'cards_found' && 'Produtos detectados!'}
                            {miningStage.stage === 'scrolling' && 'Carregando produtos...'}
                            {miningStage.stage === 'products_found' && `${miningStage.count} produtos encontrados!`}
                            {miningStage.stage === 'translating' && 'Traduzindo produtos...'}
                            {miningStage.stage === 'done' && 'Concluído!'}
                            {miningStage.stage === 'cache' && 'Carregando do cache...'}
                            {miningStage.stage === 'starting' && 'Iniciando mineração...'}
                            {!miningStage.stage && 'Aguarde alguns segundos...'}
                        </p>
                        {miningStage.message && (
                            <p className="text-sm mt-1" style={{ color: '#9CA3AF' }}>
                                {miningStage.message}
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Error State */}
            {error && (
                <div
                    className="max-w-md mx-auto mt-8 p-6 rounded-2xl text-center"
                    style={{
                        background: '#FEF2F2',
                        border: '1px solid #FECACA'
                    }}
                >
                    <span className="text-3xl mb-3 inline-block">&#10060;</span>
                    <p className="font-medium" style={{ color: '#DC2626' }}>{error}</p>
                </div>
            )}

            {/* Results View */}
            {hasResults && !loading && (
                <div className="animate-in fade-in duration-700">
                    {/* Seller Card */}
                    {sellerInfo && (() => {
                        const isSavedCheck = savedSellerIds.includes(sellerInfo.sellerId);
                        return (
                            <SellerCard
                                sellerInfo={sellerInfo}
                                sellerUrl={currentMiningUrl}
                                onSaveSeller={handleSaveSeller}
                                isSaved={isSavedCheck}
                            />
                        );
                    })()}

                    {/* Filters */}
                    <SearchFilters
                        filters={filters}
                        onFilterChange={setFilters}
                        availableModels={availableModels}
                        availableStorages={availableStorages}
                        availableWatchModels={availableWatchModels}
                        availableWatchSizes={availableWatchSizes}
                        showBRL={showBRL}
                        onToggleCurrency={toggleCurrency}
                        category={selectedCategory}
                    />

                    {/* Stats Bar */}
                    <div className="flex items-center justify-between mb-6">
                        <p style={{ color: '#9CA3AF' }}>
                            <span className="font-semibold" style={{ color: 'white' }}>{filteredProducts.length}</span>
                            {' '}de{' '}
                            <span className="font-semibold" style={{ color: 'white' }}>{products.length}</span>
                            {' '}produtos
                        </p>
                        <div className="flex items-center gap-2">
                            {availableModels.length > 0 && (
                                <span
                                    className="badge"
                                    style={{ background: 'rgba(255, 255, 255, 0.05)', color: '#9CA3AF', border: '1px solid rgba(255, 255, 255, 0.1)' }}
                                >
                                    {availableModels.length} modelos
                                </span>
                            )}
                            {availableStorages.length > 0 && (
                                <span
                                    className="badge"
                                    style={{ background: 'rgba(255, 255, 255, 0.05)', color: '#9CA3AF', border: '1px solid rgba(255, 255, 255, 0.1)' }}
                                >
                                    {availableStorages.length} capacidades
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Products Grid */}
                    <ProductGrid
                        products={filteredProducts}
                        showBRL={showBRL}
                        exchangeRate={exchangeRate}
                        savedProductUrls={savedProductUrls}
                        onSaveToggle={handleSaveProductToggle}
                        category={selectedCategory}
                    />
                </div>
            )}
        </div>
    );
}
