import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * AccordionSection - Seção colapsável do accordion
 */
function AccordionSection({
    title,
    icon,
    children,
    isOpen,
    onToggle,
    danger = false
}) {
    return (
        <div className={`border rounded-2xl overflow-hidden transition-colors ${danger
                ? 'border-red-500/20 bg-red-500/5'
                : 'border-white/5 bg-white/5'
            }`}>
            <button
                onClick={onToggle}
                className={`w-full px-5 py-4 flex items-center justify-between transition-colors ${danger
                        ? 'hover:bg-red-500/10'
                        : 'hover:bg-white/5'
                    }`}
            >
                <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${danger
                            ? 'bg-red-500/10 text-red-500'
                            : 'bg-blue-500/10 text-blue-400'
                        }`}>
                        {icon}
                    </div>
                    <span className={`font-bold ${danger ? 'text-red-400' : 'text-white'}`}>
                        {title}
                    </span>
                </div>
                <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                >
                    <svg className={`w-5 h-5 ${danger ? 'text-red-500' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </motion.div>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="px-5 pb-5 pt-2">
                            {children}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

/**
 * InputField - Campo de input estilizado
 */
function InputField({
    label,
    type = 'text',
    value,
    onChange,
    placeholder,
    error,
    disabled = false
}) {
    return (
        <div className="mb-4">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                {label}
            </label>
            <input
                type={type}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                disabled={disabled}
                className={`w-full px-4 py-3 rounded-xl border transition-all ${error
                        ? 'bg-red-500/5 border-red-500/20 focus:ring-2 focus:ring-red-500/10 focus:border-red-500'
                        : 'bg-white/5 border-white/10 text-white focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500'
                    } focus:outline-none disabled:bg-white/5 disabled:text-gray-600`}
            />
            {error && (
                <p className="mt-1 text-xs text-red-500 font-medium">{error}</p>
            )}
        </div>
    );
}

/**
 * ProfileSettings - Painel de configurações do perfil
 */
function ProfileSettings({
    user,
    onUpdateEmail,
    onUpdatePassword,
    onDeleteAccount,
    onLogout,
    onShowUpgrade,
    miningInfo = { used: 0, limit: 10, tier: 'guest' }
}) {
    const [openSection, setOpenSection] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    // Email change state
    const [newEmail, setNewEmail] = useState('');
    const [emailPassword, setEmailPassword] = useState('');

    // Password change state
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Delete account state
    const [deleteConfirmation, setDeleteConfirmation] = useState('');
    const [deletePassword, setDeletePassword] = useState('');

    const toggleSection = (section) => {
        setOpenSection(openSection === section ? null : section);
        setMessage({ type: '', text: '' });
    };

    const showMessage = (type, text) => {
        setMessage({ type, text });
        setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    };

    // Handle email update
    const handleEmailUpdate = async () => {
        if (!newEmail.trim() || !emailPassword) {
            showMessage('error', 'Preencha todos os campos');
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
            showMessage('error', 'Email inválido');
            return;
        }

        setIsLoading(true);
        try {
            const result = await onUpdateEmail?.(newEmail.trim(), emailPassword);
            if (result?.success) {
                showMessage('success', 'Email atualizado com sucesso!');
                setNewEmail('');
                setEmailPassword('');
            } else {
                showMessage('error', result?.error || 'Erro ao atualizar email');
            }
        } catch (err) {
            showMessage('error', 'Erro ao atualizar email');
        } finally {
            setIsLoading(false);
        }
    };

    // Handle password update
    const handlePasswordUpdate = async () => {
        if (!currentPassword || !newPassword || !confirmPassword) {
            showMessage('error', 'Preencha todos os campos');
            return;
        }

        if (newPassword.length < 8) {
            showMessage('error', 'A nova senha deve ter pelo menos 8 caracteres');
            return;
        }

        if (newPassword !== confirmPassword) {
            showMessage('error', 'As senhas não coincidem');
            return;
        }

        setIsLoading(true);
        try {
            const result = await onUpdatePassword?.(currentPassword, newPassword);
            if (result?.success) {
                showMessage('success', 'Senha atualizada com sucesso!');
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
            } else {
                showMessage('error', result?.error || 'Erro ao atualizar senha');
            }
        } catch (err) {
            showMessage('error', 'Erro ao atualizar senha');
        } finally {
            setIsLoading(false);
        }
    };

    // Handle account deletion
    const handleDeleteAccount = async () => {
        if (deleteConfirmation !== 'deletar minha conta') {
            showMessage('error', 'Digite "deletar minha conta" para confirmar');
            return;
        }

        if (!deletePassword) {
            showMessage('error', 'Digite sua senha para confirmar');
            return;
        }

        setIsLoading(true);
        try {
            const result = await onDeleteAccount?.(deletePassword);
            if (result?.success) {
                // Account deleted, logout will happen automatically
            } else {
                showMessage('error', result?.error || 'Erro ao deletar conta');
            }
        } catch (err) {
            showMessage('error', 'Erro ao deletar conta');
        } finally {
            setIsLoading(false);
        }
    };

    // Get tier info
    const getTierInfo = (tier) => {
        const tierLower = (tier || 'guest').toLowerCase();
        if (tierLower.includes('minerador') || tierLower.includes('ouro') || tierLower.includes('gold')) {
            return { name: 'Minerador', benefits: ['300 créditos mensais', 'Até 500 produtos por mineração', 'Suporte prioritário'] };
        }
        if (tierLower.includes('escavador') || tierLower.includes('prata') || tierLower.includes('silver')) {
            return { name: 'Escavador', benefits: ['150 créditos mensais', 'Até 200 produtos por mineração', 'Suporte por email'] };
        }
        if (tierLower.includes('explorador') || tierLower.includes('bronze')) {
            return { name: 'Explorador', benefits: ['50 créditos mensais', 'Até 100 produtos por mineração', 'Acesso ao suporte'] };
        }
        return { name: 'Convidado', benefits: ['3 créditos (não renova)', 'Até 30 produtos por mineração', 'Funcionalidades básicas'] };
    };

    const tierInfo = getTierInfo(miningInfo?.tier || user?.tier);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="mt-6 space-y-3"
        >
            {/* Message Toast */}
            <AnimatePresence>
                {message.text && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className={`p-4 rounded-xl flex items-center gap-3 ${message.type === 'success'
                                ? 'bg-green-500/10 border border-green-500/20 text-green-400'
                                : 'bg-red-500/10 border border-red-500/20 text-red-400'
                            }`}
                    >
                        {message.type === 'success' ? (
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                        ) : (
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                        )}
                        <span className="font-medium text-sm">{message.text}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Account Section */}
            <AccordionSection
                title="Conta"
                icon={
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                }
                isOpen={openSection === 'account'}
                onToggle={() => toggleSection('account')}
            >
                <div className="space-y-4">
                    <div>
                        <h4 className="font-bold text-white mb-3">Alterar Email</h4>
                        <InputField
                            label="Novo Email"
                            type="email"
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                            placeholder="novo@email.com"
                        />
                        <InputField
                            label="Senha Atual (para confirmar)"
                            type="password"
                            value={emailPassword}
                            onChange={(e) => setEmailPassword(e.target.value)}
                            placeholder="••••••••"
                        />
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleEmailUpdate}
                            disabled={isLoading}
                            className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 hover:bg-blue-500 transition-all disabled:opacity-50"
                        >
                            {isLoading ? 'Atualizando...' : 'Atualizar Email'}
                        </motion.button>
                    </div>
                </div>
            </AccordionSection>

            {/* Security Section */}
            <AccordionSection
                title="Segurança"
                icon={
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                }
                isOpen={openSection === 'security'}
                onToggle={() => toggleSection('security')}
            >
                <div className="space-y-4">
                    <div>
                        <h4 className="font-bold text-white mb-3">Alterar Senha</h4>
                        <InputField
                            label="Senha Atual"
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            placeholder="••••••••"
                        />
                        <InputField
                            label="Nova Senha"
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Mínimo 8 caracteres"
                        />
                        <InputField
                            label="Confirmar Nova Senha"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="••••••••"
                        />
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handlePasswordUpdate}
                            disabled={isLoading}
                            className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 hover:bg-blue-500 transition-all disabled:opacity-50"
                        >
                            {isLoading ? 'Atualizando...' : 'Atualizar Senha'}
                        </motion.button>
                    </div>

                    <div className="pt-4 border-t border-white/5">
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={onLogout}
                            className="w-full py-3 bg-white/5 text-gray-400 font-bold rounded-xl hover:bg-white/10 hover:text-white transition-colors flex items-center justify-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            Sair da Conta
                        </motion.button>
                    </div>
                </div>
            </AccordionSection>

            {/* Plan Section */}
            <AccordionSection
                title="Meu Plano"
                icon={
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                }
                isOpen={openSection === 'plan'}
                onToggle={() => toggleSection('plan')}
            >
                <div className="space-y-4">
                    {/* Current Plan Card */}
                    <div className="bg-blue-600/10 rounded-2xl p-5 border border-blue-500/20">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-lg font-black text-blue-400">{tierInfo.name}</h4>
                            <span className="px-3 py-1 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full">
                                Ativo
                            </span>
                        </div>

                        <ul className="space-y-2 mb-4">
                            {tierInfo.benefits.map((benefit, index) => (
                                <li key={index} className="flex items-center gap-2 text-sm text-blue-200/70">
                                    <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                    {benefit}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Upgrade Button */}
                    {tierInfo.name !== 'Minerador' && (
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={onShowUpgrade}
                            className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 hover:bg-blue-500 transition-all flex items-center justify-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
                            </svg>
                            Fazer Upgrade
                        </motion.button>
                    )}
                </div>
            </AccordionSection>

            {/* Danger Zone */}
            <AccordionSection
                title="Zona de Perigo"
                icon={
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                }
                isOpen={openSection === 'danger'}
                onToggle={() => toggleSection('danger')}
                danger
            >
                <div className="space-y-4">
                    <div className="p-4 bg-red-500/10 rounded-xl border border-red-500/20">
                        <p className="text-sm text-red-400 font-medium">
                            ⚠️ <strong>Atenção:</strong> Esta ação é irreversível. Todos os seus dados serão permanentemente deletados, incluindo produtos salvos, vendedores e coleções.
                        </p>
                    </div>

                    <InputField
                        label='Digite "deletar minha conta" para confirmar'
                        type="text"
                        value={deleteConfirmation}
                        onChange={(e) => setDeleteConfirmation(e.target.value)}
                        placeholder="deletar minha conta"
                    />
                    <InputField
                        label="Sua Senha"
                        type="password"
                        value={deletePassword}
                        onChange={(e) => setDeletePassword(e.target.value)}
                        placeholder="••••••••"
                    />

                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleDeleteAccount}
                        disabled={isLoading || deleteConfirmation !== 'deletar minha conta'}
                        className="w-full py-3 bg-red-600 text-white font-bold rounded-xl shadow-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? 'Deletando...' : 'Deletar Minha Conta'}
                    </motion.button>
                </div>
            </AccordionSection>
        </motion.div>
    );
}

export default ProfileSettings;
