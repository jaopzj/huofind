import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ProfileHeader from './ProfileHeader';
import ProfileStats from './ProfileStats';
import ProfileSettings from './ProfileSettings';

/**
 * ProfilePage - Página principal do perfil do usuário
 * Gerencia estado de rascunho e comunicação com API
 */
function ProfilePage({ 
    user, 
    miningInfo = { used: 0, limit: 10, tier: 'guest' },
    savedProductsCount = 0,
    savedSellersCount = 0,
    collectionsCount = 0,
    onLogout,
    onShowUpgrade,
    onUserUpdate
}) {
    const [isUpdating, setIsUpdating] = useState(false);
    const [localUser, setLocalUser] = useState(user);
    
    // Draft state for unsaved changes
    const [draftName, setDraftName] = useState(null);
    const [draftAvatarUrl, setDraftAvatarUrl] = useState(null);
    const [draftAvatarFile, setDraftAvatarFile] = useState(null);
    
    // Check if there are unsaved changes
    const hasUnsavedChanges = draftName !== null || draftAvatarFile !== null;

    // Sync local user with prop
    useEffect(() => {
        setLocalUser(user);
    }, [user]);

    // Handle name change (draft only)
    const handleNameChange = (newName) => {
        // Only set draft if different from current saved value
        if (newName !== localUser?.name) {
            setDraftName(newName);
        } else {
            setDraftName(null);
        }
    };

    // Handle avatar change (draft only)
    const handleAvatarChange = (file, previewUrl) => {
        setDraftAvatarFile(file);
        setDraftAvatarUrl(previewUrl);
    };

    // Save all changes
    const handleSaveChanges = async () => {
        setIsUpdating(true);
        let success = true;
        
        try {
            const token = localStorage.getItem('accessToken');
            
            // Save name if changed
            if (draftName !== null) {
                const response = await fetch('/api/user/profile', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ name: draftName })
                });

                if (response.ok) {
                    setLocalUser(prev => ({ ...prev, name: draftName }));
                    onUserUpdate?.({ ...user, name: draftName });
                    setDraftName(null);
                } else {
                    const data = await response.json();
                    console.error('Error updating name:', data.error);
                    success = false;
                }
            }

            // Upload avatar if changed
            if (draftAvatarFile) {
                const formData = new FormData();
                formData.append('avatar', draftAvatarFile);

                const response = await fetch('/api/user/avatar', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    body: formData
                });

                const data = await response.json();

                if (response.ok) {
                    setLocalUser(prev => ({ ...prev, avatarUrl: data.avatarUrl }));
                    onUserUpdate?.({ ...user, avatarUrl: data.avatarUrl });
                    setDraftAvatarFile(null);
                    setDraftAvatarUrl(null);
                } else {
                    console.error('Error uploading avatar:', data.error);
                    success = false;
                }
            }

            return success;
        } catch (err) {
            console.error('Error saving changes:', err);
            return false;
        } finally {
            setIsUpdating(false);
        }
    };

    // Discard all changes
    const handleDiscardChanges = () => {
        // Revoke object URL to prevent memory leak
        if (draftAvatarUrl && draftAvatarUrl.startsWith('blob:')) {
            URL.revokeObjectURL(draftAvatarUrl);
        }
        setDraftName(null);
        setDraftAvatarFile(null);
        setDraftAvatarUrl(null);
    };

    // Update email
    const handleUpdateEmail = async (newEmail, password) => {
        try {
            const token = localStorage.getItem('accessToken');
            const response = await fetch('/api/user/email', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ newEmail, password })
            });

            const data = await response.json();

            if (response.ok) {
                setLocalUser(prev => ({ ...prev, email: newEmail }));
                onUserUpdate?.({ ...user, email: newEmail });
                return { success: true };
            } else {
                return { success: false, error: data.error || 'Erro ao atualizar email' };
            }
        } catch (err) {
            console.error('Error updating email:', err);
            return { success: false, error: 'Erro de conexão' };
        }
    };

    // Update password
    const handleUpdatePassword = async (currentPassword, newPassword) => {
        try {
            const token = localStorage.getItem('accessToken');
            const response = await fetch('/api/user/password', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ currentPassword, newPassword })
            });

            const data = await response.json();

            if (response.ok) {
                return { success: true };
            } else {
                return { success: false, error: data.error || 'Erro ao atualizar senha' };
            }
        } catch (err) {
            console.error('Error updating password:', err);
            return { success: false, error: 'Erro de conexão' };
        }
    };

    // Delete account
    const handleDeleteAccount = async (password) => {
        try {
            const token = localStorage.getItem('accessToken');
            const response = await fetch('/api/user/account', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ password })
            });

            const data = await response.json();

            if (response.ok) {
                onLogout?.();
                return { success: true };
            } else {
                return { success: false, error: data.error || 'Erro ao deletar conta' };
            }
        } catch (err) {
            console.error('Error deleting account:', err);
            return { success: false, error: 'Erro de conexão' };
        }
    };

    return (
        <div className="w-full max-w-3xl mx-auto px-4 md:px-8 py-6">
            {/* Page Title */}
            <motion.h1 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-3xl md:text-4xl font-black mb-6 tracking-tight text-gray-900"
            >
                Meu Perfil
            </motion.h1>

            {/* Profile Header */}
            <ProfileHeader
                user={localUser}
                draftName={draftName}
                draftAvatarUrl={draftAvatarUrl}
                draftAvatarFile={draftAvatarFile}
                onNameChange={handleNameChange}
                onAvatarChange={handleAvatarChange}
                isUpdating={isUpdating}
            />

            {/* Save/Discard Buttons - Only show when there are unsaved changes */}
            <AnimatePresence>
                {hasUnsavedChanges && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: 'auto' }}
                        exit={{ opacity: 0, y: -10, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                    >
                        <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-2xl">
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                                <div className="flex items-center gap-2 text-orange-700">
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                    </svg>
                                    <span className="text-sm font-medium">
                                        Você tem alterações não salvas
                                    </span>
                                </div>
                                
                                <div className="flex items-center gap-2">
                                    {/* Discard Button */}
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={handleDiscardChanges}
                                        disabled={isUpdating}
                                        className="px-4 py-2 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
                                    >
                                        Descartar
                                    </motion.button>
                                    
                                    {/* Save Button */}
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={handleSaveChanges}
                                        disabled={isUpdating}
                                        className="px-4 py-2 text-sm font-bold text-white bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {isUpdating ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                Salvando...
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                                Salvar Alterações
                                            </>
                                        )}
                                    </motion.button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Stats */}
            <ProfileStats
                miningInfo={miningInfo}
                savedProductsCount={savedProductsCount}
                savedSellersCount={savedSellersCount}
                collectionsCount={collectionsCount}
            />

            {/* Settings */}
            <ProfileSettings
                user={localUser}
                miningInfo={miningInfo}
                onUpdateEmail={handleUpdateEmail}
                onUpdatePassword={handleUpdatePassword}
                onDeleteAccount={handleDeleteAccount}
                onLogout={onLogout}
                onShowUpgrade={onShowUpgrade}
            />

            {/* Bottom Spacing */}
            <div className="h-8" />
        </div>
    );
}

export default ProfilePage;
