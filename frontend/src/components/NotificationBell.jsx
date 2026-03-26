import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const POLL_INTERVAL = 30_000;

const NOTIFICATION_ICONS = {
    mining_complete: '⛏️',
    credits_low: '⚠️',
    credit_spent: '💳',
    purchase: '🛒',
    subscription: '✨',
    price_drop: '📉',
    system: '📢',
};

function timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'agora';
    if (mins < 60) return `${mins}min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
}

/**
 * NotificationBell — bell icon with unread badge + responsive dropdown.
 *
 * Desktop: fixed-positioned dropdown anchored below the bell, extending
 *          to the right past the sidebar boundary.
 * Mobile:  full-width bottom sheet with backdrop overlay.
 */
export default function NotificationBell() {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
    const mobileRef = useRef(null);
    const desktopRef = useRef(null);
    const bellRef = useRef(null);

    const token = localStorage.getItem('accessToken');
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

    // ===== DATA FETCHING =====

    const fetchUnreadCount = useCallback(async () => {
        if (!token) return;
        try {
            const res = await fetch('/api/notifications/unread-count', {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setUnreadCount(data.count || 0);
            }
        } catch { /* silent */ }
    }, [token]);

    useEffect(() => {
        fetchUnreadCount();
        const interval = setInterval(fetchUnreadCount, POLL_INTERVAL);
        return () => clearInterval(interval);
    }, [fetchUnreadCount]);

    useEffect(() => {
        const handler = () => fetchUnreadCount();
        window.addEventListener('notifications-updated', handler);
        return () => window.removeEventListener('notifications-updated', handler);
    }, [fetchUnreadCount]);

    const fetchNotifications = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const res = await fetch('/api/notifications?limit=20', {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setNotifications(data.notifications || []);
                setUnreadCount(data.unreadCount || 0);
            }
        } catch { /* silent */ }
        finally { setLoading(false); }
    }, [token]);

    // ===== OPEN / CLOSE =====

    const openDropdown = () => {
        // Calculate fixed position from bell button
        if (bellRef.current) {
            const rect = bellRef.current.getBoundingClientRect();
            setDropdownPos({
                top: rect.bottom + 8,
                left: rect.left,
            });
        }
        setIsOpen(true);
        fetchNotifications();
    };

    const closeDropdown = () => setIsOpen(false);
    const toggleDropdown = () => (isOpen ? closeDropdown() : openDropdown());

    // Close on outside click
    useEffect(() => {
        if (!isOpen) return;
        const handleClick = (e) => {
            const inBell = bellRef.current?.contains(e.target);
            const inMobile = mobileRef.current?.contains(e.target);
            const inDesktop = desktopRef.current?.contains(e.target);
            if (!inBell && !inMobile && !inDesktop) {
                closeDropdown();
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [isOpen]);

    // Close on Escape
    useEffect(() => {
        if (!isOpen) return;
        const handleKey = (e) => { if (e.key === 'Escape') closeDropdown(); };
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [isOpen]);

    // Lock body scroll on mobile when open
    useEffect(() => {
        if (isOpen && isMobile) {
            document.body.style.overflow = 'hidden';
            return () => { document.body.style.overflow = ''; };
        }
    }, [isOpen, isMobile]);

    // ===== ACTIONS =====

    const handleMarkRead = async (id) => {
        if (!token) return;
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
        setUnreadCount((c) => Math.max(0, c - 1));
        await fetch(`/api/notifications/${id}/read`, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {});
    };

    const handleMarkAllRead = async () => {
        if (!token) return;
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        setUnreadCount(0);
        await fetch('/api/notifications/read-all', {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {});
    };

    // ===== RENDER HELPERS =====

    const notificationList = useMemo(() => (
        notifications.map((n) => (
            <button
                key={n.id}
                onClick={() => { if (!n.read) handleMarkRead(n.id); }}
                className="w-full text-left px-4 py-3 flex items-start gap-3 transition-colors hover:bg-white/5 border-b border-white/[0.04] last:border-0"
                style={{
                    background: n.read ? 'transparent' : 'rgba(59, 130, 246, 0.06)',
                }}
            >
                <span className="text-base mt-0.5 shrink-0 w-5 text-center">
                    {NOTIFICATION_ICONS[n.type] || '📢'}
                </span>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <p
                            className="text-[13px] font-semibold truncate"
                            style={{ color: n.read ? '#9CA3AF' : '#F3F4F6' }}
                        >
                            {n.title}
                        </p>
                        {!n.read && (
                            <span className="shrink-0 w-1.5 h-1.5 rounded-full" style={{ background: '#3B82F6' }} />
                        )}
                    </div>
                    <p
                        className="text-xs mt-0.5 leading-relaxed line-clamp-2"
                        style={{ color: n.read ? '#6B7280' : '#9CA3AF' }}
                    >
                        {n.message}
                    </p>
                    <p className="text-[10px] mt-1 text-white/30">{timeAgo(n.created_at)}</p>
                </div>
            </button>
        ))
    ), [notifications]);

    const listContent = (
        <div
            className="overflow-y-auto overscroll-contain"
            style={{
                maxHeight: isMobile ? 'calc(70vh - 56px)' : 340,
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgba(255,255,255,0.1) transparent',
            }}
        >
            {loading && notifications.length === 0 ? (
                <div className="flex items-center justify-center py-10">
                    <div className="w-5 h-5 border-2 border-white/20 border-t-blue-400 rounded-full animate-spin" />
                </div>
            ) : notifications.length === 0 ? (
                <div className="py-12 text-center">
                    <span className="text-2xl block mb-2">🔔</span>
                    <p className="text-sm text-white/40">Nenhuma notificação</p>
                </div>
            ) : (
                notificationList
            )}
        </div>
    );

    const header = (
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <h3 className="text-sm font-bold text-white">Notificações</h3>
            <div className="flex items-center gap-3">
                {unreadCount > 0 && (
                    <button
                        onClick={handleMarkAllRead}
                        className="text-xs text-blue-400 hover:text-blue-300 transition-colors font-medium"
                    >
                        Marcar como lidas
                    </button>
                )}
                {/* Close button — visible on mobile */}
                <button
                    onClick={closeDropdown}
                    className="md:hidden p-1 rounded-lg hover:bg-white/10 transition-colors"
                    aria-label="Fechar"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                </button>
            </div>
        </div>
    );

    // ===== DROPDOWN STYLE =====

    const panelStyle = {
        background: 'rgba(23, 30, 41, 0.98)',
        backdropFilter: 'blur(20px)',
        borderColor: 'rgba(255,255,255,0.08)',
        boxShadow: '0 24px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)',
    };

    return (
        <>
            {/* Bell button */}
            <button
                ref={bellRef}
                onClick={toggleDropdown}
                className="relative p-2 rounded-xl transition-colors hover:bg-white/10"
                aria-label="Notificações"
            >
                <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-white/70"
                >
                    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                </svg>

                <AnimatePresence>
                    {unreadCount > 0 && (
                        <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[16px] h-[16px] px-0.5 rounded-full text-[9px] font-bold text-white"
                            style={{ background: '#EF4444' }}
                        >
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </motion.span>
                    )}
                </AnimatePresence>
            </button>

            {/* Dropdown — rendered as fixed overlay to avoid parent overflow clipping */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Mobile: backdrop overlay */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="md:hidden fixed inset-0 z-[998] bg-black/40"
                            onClick={closeDropdown}
                        />

                        {/* Mobile: bottom sheet */}
                        <motion.div
                            ref={mobileRef}
                            initial={{ opacity: 0, y: 40 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 40 }}
                            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                            className="md:hidden fixed bottom-0 left-0 right-0 z-[999] rounded-t-2xl border-t overflow-hidden"
                            style={{ ...panelStyle, maxHeight: '70vh' }}
                        >
                            {/* Drag handle */}
                            <div className="flex justify-center pt-2 pb-1">
                                <div className="w-8 h-1 rounded-full bg-white/20" />
                            </div>
                            {header}
                            {listContent}
                        </motion.div>

                        {/* Desktop: fixed dropdown anchored to bell position */}
                        <motion.div
                            ref={desktopRef}
                            initial={{ opacity: 0, y: -6, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -6, scale: 0.97 }}
                            transition={{ duration: 0.15 }}
                            className="hidden md:block fixed z-[999] w-[340px] rounded-2xl border overflow-hidden"
                            style={{
                                ...panelStyle,
                                top: dropdownPos.top,
                                // Anchor to left of bell, but clamp so it doesn't overflow viewport
                                left: Math.min(
                                    dropdownPos.left,
                                    (typeof window !== 'undefined' ? window.innerWidth : 1200) - 356
                                ),
                            }}
                        >
                            {header}
                            {listContent}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
