import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    LuArrowRight,
    LuChevronLeft,
    LuChevronRight,
    LuPickaxe,
    LuFileText,
    LuTrendingUp,
} from 'react-icons/lu';
import { resolvePagePath } from '../../utils/routes';

/**
 * BannerCarousel — Editorial hero banners with auto-rotation.
 *
 * Placeholder content is defined below; a future admin panel will replace
 * these slides via an API call. Each banner ships its own gradient brand,
 * accent color, icon, and call-to-action route.
 */

const DEFAULT_BANNERS = [
    {
        id: 'xianyu-mining',
        eyebrow: 'Mineração Xianyu',
        title: 'Descubra fornecedores antes do resto do mercado.',
        description:
            'Minere catálogos completos do Xianyu em segundos e antecipe as próximas tendências de importação.',
        ctaLabel: 'Iniciar mineração',
        ctaPage: 'xianyu-mining',
        icon: LuPickaxe,
        accent: '#10B981',
        gradient:
            'linear-gradient(125deg, #042f2e 0%, #0f2a27 35%, #0a1f2a 75%, #0b1a23 100%)',
        orbGradient:
            'radial-gradient(circle at 30% 30%, rgba(16,185,129,0.55), transparent 60%)',
    },
    {
        id: 'declaration',
        eyebrow: 'Assistente de declaração',
        title: 'Importe com respaldo. Declare com confiança.',
        description:
            'Receba orientações personalizadas para preencher declarações alfandegárias sem travar a sua operação.',
        ctaLabel: 'Abrir assistente',
        ctaPage: 'declaration-assistant',
        icon: LuFileText,
        accent: '#60A5FA',
        gradient:
            'linear-gradient(125deg, #0b1635 0%, #131a40 35%, #141335 70%, #1a1240 100%)',
        orbGradient:
            'radial-gradient(circle at 70% 30%, rgba(96,165,250,0.55), transparent 60%)',
    },
    {
        id: 'profitability',
        eyebrow: 'Dashboard de rentabilidade',
        title: 'Veja seu lucro em tempo real, produto por produto.',
        description:
            'Margem, ROI e custos consolidados em um painel unificado — feito para quem revende em escala.',
        ctaLabel: 'Ver dashboard',
        ctaPage: 'profitability',
        icon: LuTrendingUp,
        accent: '#F59E0B',
        gradient:
            'linear-gradient(125deg, #2a1505 0%, #2a1a06 35%, #221609 70%, #1c1308 100%)',
        orbGradient:
            'radial-gradient(circle at 75% 25%, rgba(245,158,11,0.55), transparent 60%)',
    },
];

const AUTO_ROTATE_MS = 6500;

function BannerCarousel({ banners = DEFAULT_BANNERS }) {
    const [index, setIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const navigate = useNavigate();
    const touchStartX = useRef(null);

    const total = banners.length;

    const goTo = useCallback(
        (next) => {
            setIndex(((next % total) + total) % total);
        },
        [total]
    );

    const goPrev = useCallback(() => goTo(index - 1), [goTo, index]);
    const goNext = useCallback(() => goTo(index + 1), [goTo, index]);

    // Auto-rotate
    useEffect(() => {
        if (isPaused || total <= 1) return;
        const timer = setTimeout(goNext, AUTO_ROTATE_MS);
        return () => clearTimeout(timer);
    }, [index, isPaused, total, goNext]);

    // Keyboard navigation
    const handleKeyDown = (e) => {
        if (e.key === 'ArrowLeft') goPrev();
        if (e.key === 'ArrowRight') goNext();
    };

    // Touch/swipe
    const handleTouchStart = (e) => {
        touchStartX.current = e.touches[0].clientX;
    };
    const handleTouchEnd = (e) => {
        if (touchStartX.current == null) return;
        const delta = e.changedTouches[0].clientX - touchStartX.current;
        if (delta > 50) goPrev();
        if (delta < -50) goNext();
        touchStartX.current = null;
    };

    const handleCta = (page) => {
        navigate(resolvePagePath(page));
    };

    const current = banners[index];
    const Icon = current.icon;

    return (
        <section className="banner-carousel-wrap">
            <div
                className="banner-carousel"
                style={{ '--banner-accent': current.accent }}
                onMouseEnter={() => setIsPaused(true)}
                onMouseLeave={() => setIsPaused(false)}
                onKeyDown={handleKeyDown}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                tabIndex={0}
                aria-roledescription="carousel"
                aria-label="Destaques da plataforma"
            >
                {/* Slides */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={current.id}
                        className="banner-slide"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
                        style={{ background: current.gradient }}
                    >
                        {/* Atmospheric orb */}
                        <div
                            className="banner-orb"
                            style={{ background: current.orbGradient }}
                        />

                        {/* Noise overlay */}
                        <div className="banner-noise" />

                        {/* Grid overlay */}
                        <div className="banner-grid" />

                        {/* Content */}
                        <div className="banner-content">
                            <motion.div
                                initial={{ opacity: 0, y: 14 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: 0.1 }}
                                className="banner-eyebrow"
                            >
                                <span
                                    className="banner-eyebrow-dot"
                                    style={{ backgroundColor: current.accent }}
                                />
                                {current.eyebrow}
                            </motion.div>

                            <motion.h2
                                initial={{ opacity: 0, y: 14 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.55, delay: 0.18 }}
                                className="banner-title"
                            >
                                {current.title}
                            </motion.h2>

                            <motion.p
                                initial={{ opacity: 0, y: 14 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.55, delay: 0.26 }}
                                className="banner-description"
                            >
                                {current.description}
                            </motion.p>

                            <motion.div
                                initial={{ opacity: 0, y: 14 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.55, delay: 0.34 }}
                            >
                                <button
                                    onClick={() => handleCta(current.ctaPage)}
                                    className="banner-cta"
                                    style={{
                                        background: current.accent,
                                        boxShadow: `0 10px 24px -12px ${current.accent}`,
                                    }}
                                >
                                    {current.ctaLabel}
                                    <LuArrowRight size={16} />
                                </button>
                            </motion.div>
                        </div>

                        {/* Icon medallion */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8, rotate: -6 }}
                            animate={{ opacity: 1, scale: 1, rotate: 0 }}
                            transition={{ duration: 0.6, delay: 0.18 }}
                            className="banner-icon-medallion"
                            style={{
                                borderColor: `${current.accent}40`,
                                boxShadow: `inset 0 1px 0 rgba(255,255,255,0.08), 0 0 80px -20px ${current.accent}`,
                            }}
                        >
                            <Icon size={56} strokeWidth={1.3} color={current.accent} />
                        </motion.div>
                    </motion.div>
                </AnimatePresence>

                {/* Navigation arrows */}
                {total > 1 && (
                    <>
                        <button
                            className="banner-arrow banner-arrow-prev"
                            onClick={goPrev}
                            aria-label="Banner anterior"
                        >
                            <LuChevronLeft size={18} />
                        </button>
                        <button
                            className="banner-arrow banner-arrow-next"
                            onClick={goNext}
                            aria-label="Próximo banner"
                        >
                            <LuChevronRight size={18} />
                        </button>
                    </>
                )}

                {/* Pagination */}
                {total > 1 && (
                    <div className="banner-pagination">
                        {banners.map((b, i) => (
                            <button
                                key={b.id}
                                className={`banner-dot ${i === index ? 'is-active' : ''}`}
                                onClick={() => goTo(i)}
                                aria-label={`Ir para banner ${i + 1}`}
                            >
                                <span className="banner-dot-fill" />
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}

export default BannerCarousel;
