import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * ProfileHeader - Header do perfil com avatar, nome e informações principais
 * Agora com modo rascunho - alterações não são salvas automaticamente
 */
function ProfileHeader({
    user,
    draftName,
    draftAvatarUrl,
    draftAvatarFile,
    onNameChange,
    onAvatarChange,
    isUpdating = false
}) {
    const [isEditingName, setIsEditingName] = useState(false);
    const [tempName, setTempName] = useState(draftName || user?.name || '');
    const [avatarHover, setAvatarHover] = useState(false);
    const [showEmail, setShowEmail] = useState(false);
    const fileInputRef = useRef(null);

    // Mask email for privacy
    const maskEmail = (email) => {
        if (!email) return '•••••••••';
        const [localPart, domain] = email.split('@');
        if (!domain) return '•••••••••';
        const maskedLocal = localPart[0] + '•'.repeat(Math.max(localPart.length - 2, 2)) + (localPart.length > 1 ? localPart[localPart.length - 1] : '');
        return `${maskedLocal}@${domain}`;
    };

    // Sync tempName with draft or user name
    useEffect(() => {
        if (!isEditingName) {
            setTempName(draftName ?? user?.name ?? '');
        }
    }, [draftName, user?.name, isEditingName]);

    const handleNameSubmit = () => {
        if (tempName.trim().length < 2) return;

        // Update draft instead of saving directly
        onNameChange?.(tempName.trim());
        setIsEditingName(false);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleNameSubmit();
        } else if (e.key === 'Escape') {
            setTempName(draftName ?? user?.name ?? '');
            setIsEditingName(false);
        }
    };

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            // Create preview URL and update draft
            const previewUrl = URL.createObjectURL(file);
            onAvatarChange?.(file, previewUrl);
        }
        // Reset input so the same file can be selected again
        e.target.value = '';
    };

    // Format date
    const formatDate = (dateString) => {
        if (!dateString) return 'Data não disponível';
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });
    };

    // Get tier display name and color
    const getTierInfo = (tier) => {
        const tierLower = (tier || 'guest').toLowerCase();
        if (tierLower.includes('minerador') || tierLower.includes('ouro') || tierLower.includes('gold')) {
            return { name: 'Minerador', color: 'from-blue-400 to-blue-600', bgColor: 'bg-blue-500/10', textColor: 'text-blue-400' };
        }
        if (tierLower.includes('escavador') || tierLower.includes('prata') || tierLower.includes('silver')) {
            return { name: 'Escavador', color: 'from-gray-400 to-gray-600', bgColor: 'bg-white/10', textColor: 'text-gray-300' };
        }
        if (tierLower.includes('explorador') || tierLower.includes('bronze')) {
            return { name: 'Explorador', color: 'from-blue-300 to-blue-500', bgColor: 'bg-blue-500/5', textColor: 'text-blue-300' };
        }
        return { name: 'Convidado', color: 'from-gray-500 to-gray-700', bgColor: 'bg-white/5', textColor: 'text-gray-400' };
    };

    const tierInfo = getTierInfo(user?.tier);

    // Determine which avatar to display: draft preview > saved avatarUrl > initial
    const displayAvatarUrl = draftAvatarUrl || user?.avatarUrl;
    const displayName = draftName ?? user?.name ?? 'Usuário';

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-[#1f2937] rounded-[2rem] p-6 md:p-8 shadow-xl border border-white/5"
        >
            <div className="flex flex-col md:flex-row items-center gap-6">
                {/* Avatar */}
                <div
                    className="relative group cursor-pointer"
                    onMouseEnter={() => setAvatarHover(true)}
                    onMouseLeave={() => setAvatarHover(false)}
                    onClick={handleAvatarClick}
                >
                    <motion.div
                        className={`w-24 h-24 md:w-28 md:h-28 rounded-2xl bg-gradient-to-br ${tierInfo.color} flex items-center justify-center text-white text-3xl md:text-4xl font-bold shadow-lg overflow-hidden`}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        {displayAvatarUrl ? (
                            <img
                                src={displayAvatarUrl}
                                alt={displayName}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <span>{user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || '?'}</span>
                        )}
                    </motion.div>

                    {/* Overlay de upload */}
                    <AnimatePresence>
                        {avatarHover && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center"
                            >
                                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                    />
                </div>

                {/* Info */}
                <div className="flex-1 text-center md:text-left">
                    {/* Name */}
                    <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                        {isEditingName ? (
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={tempName}
                                    onChange={(e) => setTempName(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    onBlur={handleNameSubmit}
                                    autoFocus
                                    className="text-xl md:text-2xl font-black text-white bg-white/5 border border-white/10 rounded-xl px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    style={{ minWidth: '150px' }}
                                />
                                {isUpdating && (
                                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                )}
                            </div>
                        ) : (
                            <>
                                <h2 className="text-xl md:text-2xl font-black text-white">
                                    {displayName}
                                </h2>
                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => {
                                        setTempName(draftName ?? user?.name ?? '');
                                        setIsEditingName(true);
                                    }}
                                    className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                                >
                                    <svg className="w-4 h-4 text-gray-500 hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                    </svg>
                                </motion.button>
                            </>
                        )}
                    </div>

                    {/* Email */}
                    <div className="flex items-center justify-center md:justify-start gap-1.5 mb-3">
                        <p className="text-gray-400 font-medium text-sm md:text-base">
                            {showEmail ? user?.email : maskEmail(user?.email)}
                        </p>
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setShowEmail(!showEmail)}
                            className="p-1 rounded-lg hover:bg-white/5 transition-colors"
                            title={showEmail ? "Ocultar email" : "Mostrar email"}
                        >
                            {showEmail ? (
                                <svg className="w-4 h-4 text-gray-500 hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                            ) : (
                                <svg className="w-4 h-4 text-gray-500 hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                </svg>
                            )}
                        </motion.button>
                    </div>

                    {/* Badges */}
                    <div className="flex items-center justify-center md:justify-start gap-2 flex-wrap">
                        {/* Tier Badge */}
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${tierInfo.bgColor} ${tierInfo.textColor}`}>
                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            {tierInfo.name}
                        </span>

                        {/* Member Since */}
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-white/5 text-gray-400 border border-white/5">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            Membro desde {formatDate(user?.createdAt)}
                        </span>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

export default ProfileHeader;
