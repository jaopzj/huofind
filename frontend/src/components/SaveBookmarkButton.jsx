import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';

/**
 * SaveBookmarkButton - Botão de salvar produto com animação premium
 */
function SaveBookmarkButton({ isSaved = false, onToggle, disabled = false, size = 20 }) {
    const [localSaved, setLocalSaved] = useState(isSaved);
    const [showSaveAnimation, setShowSaveAnimation] = useState(false);
    const [toastVisible, setToastVisible] = useState(false);
    const [toastData, setToastData] = useState(null);
    const [isShaking, setIsShaking] = useState(false);
    const isProcessing = useRef(false);

    useEffect(() => {
        if (!isProcessing.current) {
            setLocalSaved(isSaved);
        }
    }, [isSaved]);

    const handleClick = async (e) => {
        e.stopPropagation();
        e.preventDefault();

        if (disabled || isProcessing.current) return;

        isProcessing.current = true;
        const wasntSaved = !localSaved;
        setLocalSaved(wasntSaved);

        // Se estamos SALVANDO, mostra partículas IMEDIATAMENTE
        if (wasntSaved) {
            setShowSaveAnimation(true);
            setTimeout(() => setShowSaveAnimation(false), 600);
        }

        try {
            const result = await onToggle();

            if (result && result.error === 'LIMIT_REACHED') {
                // CANCELA a animação e reverte
                setShowSaveAnimation(false);
                setLocalSaved(false);
                setIsShaking(true);
                setToastData(result.limitInfo);
                setToastVisible(true);

                setTimeout(() => setIsShaking(false), 500);
                setTimeout(() => setToastVisible(false), 3000);

                isProcessing.current = false;
                return;
            }

            // Se houve outro erro, apenas reverte
            if (result && result.error) {
                setLocalSaved(!wasntSaved);
            }
        } catch (err) {
            setLocalSaved(!wasntSaved);
            console.error('Erro ao salvar:', err);
        } finally {
            isProcessing.current = false;
        }
    };

    const BookmarkIcon = ({ filled }) => (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill={filled ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
    );

    const WarningIcon = () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
    );

    return (
        <>
            {/* Global Toast via Portal */}
            {createPortal(
                <div
                    className="fixed left-0 right-0 flex justify-center pointer-events-none"
                    style={{ top: '100px', zIndex: 99999 }}
                >
                    <AnimatePresence mode="wait">
                        {toastVisible && toastData && (
                            <motion.div
                                key="error-toast"
                                initial={{ opacity: 0, y: -20, scale: 0.9 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -15, scale: 0.95 }}
                                transition={{
                                    type: "spring",
                                    stiffness: 400,
                                    damping: 30,
                                    mass: 1
                                }}
                                className="pointer-events-auto"
                            >
                                <div
                                    className="flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border border-red-200/60"
                                    style={{
                                        background: 'rgba(254, 226, 226, 0.92)',
                                        backdropFilter: 'blur(24px)',
                                        WebkitBackdropFilter: 'blur(24px)',
                                        boxShadow: '0 8px 32px rgba(239, 68, 68, 0.15), 0 4px 12px rgba(0,0,0,0.08)'
                                    }}
                                >
                                    <div className="flex-shrink-0 w-10 h-10 bg-red-500/15 rounded-xl flex items-center justify-center text-red-600">
                                        <WarningIcon />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold text-red-800">
                                            Limite atingido ({toastData.used}/{toastData.limit})
                                        </p>
                                        <p className="text-xs text-red-600/80 mt-0.5">
                                            Faça upgrade para salvar mais produtos
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>,
                document.body
            )}

            <button
                onClick={handleClick}
                disabled={disabled}
                className={`
                    relative flex items-center justify-center
                    w-9 h-9 rounded-xl
                    transition-all duration-200
                    ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    ${isShaking ? 'bg-red-500/40 text-red-500' :
                        localSaved ? 'bg-blue-500/40 text-blue-500' :
                            'bg-black/20 backdrop-blur-md text-white border border-white/10 hover:bg-blue-500 hover:text-white'
                    }
                `}
                style={{
                    outline: 'none',
                    animation: isShaking ? 'bookmark-shake 0.5s ease-in-out' : 'none'
                }}
                title={localSaved ? 'Remover dos salvos' : 'Salvar produto'}
            >
                <motion.div
                    initial={{ scale: 1 }}
                    animate={{ scale: localSaved ? 1.1 : 1 }}
                    whileTap={{ scale: 0.85, rotate: -10 }}
                    transition={{ type: "spring", stiffness: 300, damping: 15 }}
                    className="relative flex items-center justify-center"
                >
                    <BookmarkIcon filled={false} />

                    <motion.div
                        className={`absolute inset-0 flex items-center justify-center ${isShaking ? 'text-red-500' : 'text-blue-500'}`}
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{
                            opacity: localSaved || isShaking ? 1 : 0,
                            scale: localSaved || isShaking ? 1 : 0.5
                        }}
                        transition={{ duration: 0.15 }}
                    >
                        <BookmarkIcon filled={true} />
                    </motion.div>

                    <AnimatePresence>
                        {showSaveAnimation && (
                            <motion.div
                                className="absolute inset-0 rounded-full pointer-events-none"
                                style={{
                                    background: 'radial-gradient(circle, rgba(59,130,246,0.5) 0%, rgba(59,130,246,0) 70%)',
                                }}
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: [0, 2.5, 3], opacity: [0, 0.7, 0] }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.5, ease: "easeOut" }}
                            />
                        )}
                    </AnimatePresence>
                </motion.div>

                <AnimatePresence>
                    {showSaveAnimation && (
                        <motion.div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            {[...Array(8)].map((_, i) => {
                                const angle = (i / 8) * (2 * Math.PI);
                                const radius = 22;
                                return (
                                    <motion.div
                                        key={i}
                                        className="absolute rounded-full bg-blue-400"
                                        style={{ width: '4px', height: '4px' }}
                                        initial={{ scale: 0, opacity: 0.8, x: 0, y: 0 }}
                                        animate={{
                                            scale: [0, 1.2, 0],
                                            opacity: [0.8, 1, 0],
                                            x: [0, Math.cos(angle) * radius],
                                            y: [0, Math.sin(angle) * radius],
                                        }}
                                        transition={{
                                            duration: 0.45,
                                            delay: i * 0.02,
                                            ease: "easeOut"
                                        }}
                                    />
                                );
                            })}
                        </motion.div>
                    )}
                </AnimatePresence>
            </button>
        </>
    );
}

export default SaveBookmarkButton;
