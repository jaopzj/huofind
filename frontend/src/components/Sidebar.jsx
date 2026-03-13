"use client";

import { useState, forwardRef, useCallback, useImperativeHandle, useRef } from "react";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import { LuPickaxe } from "react-icons/lu";

// Animated hamburger menu toggle for mobile
const AnimatedMenuToggle = ({ toggle, isOpen }) => (
    <button
        onClick={toggle}
        aria-label="Toggle menu"
        className="focus:outline-none z-[999] p-2 rounded-xl hover:bg-gray-100 transition-colors"
    >
        <motion.div animate={{ y: isOpen ? 0 : 0 }} transition={{ duration: 0.3 }}>
            <motion.svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                initial="closed"
                animate={isOpen ? "open" : "closed"}
                transition={{ duration: 0.3 }}
                className="text-white"
            >
                <motion.path
                    fill="transparent"
                    strokeWidth="2.5"
                    stroke="currentColor"
                    strokeLinecap="round"
                    variants={{
                        closed: { d: "M 3 6 L 21 6" },
                        open: { d: "M 4 18 L 18 4" },
                    }}
                />
                <motion.path
                    fill="transparent"
                    strokeWidth="2.5"
                    stroke="currentColor"
                    strokeLinecap="round"
                    variants={{
                        closed: { d: "M 3 12 L 21 12", opacity: 1 },
                        open: { opacity: 0 },
                    }}
                    transition={{ duration: 0.2 }}
                />
                <motion.path
                    fill="transparent"
                    strokeWidth="2.5"
                    stroke="currentColor"
                    strokeLinecap="round"
                    variants={{
                        closed: { d: "M 3 18 L 21 18" },
                        open: { d: "M 4 4 L 18 18" },
                    }}
                />
            </motion.svg>
        </motion.div>
    </button>
);

// Chevron icons for collapsible sections
const ChevronDownIcon = ({ isOpen }) => (
    <motion.svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        animate={{ rotate: isOpen ? 180 : 0 }}
        transition={{ duration: 0.2 }}
    >
        <polyline points="6 9 12 15 18 9" />
    </motion.svg>
);

// Collapsible section component
// Collapsible section component
const CollapsibleSection = ({ title, children, icon }) => {
    const [open, setOpen] = useState(false);

    return (
        <li className="block">
            <button
                className="sidebar-nav-item"
                onClick={() => setOpen(!open)}
            >
                <span className="sidebar-nav-icon" style={{ position: 'relative', zIndex: 1 }}>
                    {icon}
                </span>
                <span className="font-medium text-sm flex-1 text-left" style={{ position: 'relative', zIndex: 1 }}>
                    {title}
                </span>
                <span style={{ position: 'relative', zIndex: 1 }}>
                    <ChevronDownIcon isOpen={open} />
                </span>
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: "easeOut" }}
                        className="overflow-hidden"
                    >
                        <div className="pl-12 pr-2 py-1 space-y-1"> {/* Increased padding-left to align sub-items under title */}
                            {children}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </li>
    );
};

// Navigation item component with smooth transition animation
const NavItem = ({ icon, label, isActive, onClick, ...props }) => (
    <button
        onClick={onClick}
        className={`sidebar-nav-item ${isActive ? 'sidebar-nav-item-active' : ''}`}
        {...props}
    >
        {/* Animated background indicator */}
        {isActive && (
            <motion.div
                layoutId="navActiveBackground"
                className="absolute inset-0 rounded-xl bg-white/15"
                initial={false}
                transition={{
                    type: "spring",
                    stiffness: 350,
                    damping: 30,
                    duration: 0.5
                }}
            />
        )}
        <span className={`sidebar-nav-icon ${isActive ? 'sidebar-nav-icon-active' : ''}`} style={{ position: 'relative', zIndex: 1 }}>
            {icon}
        </span>
        <span className="font-medium text-sm" style={{ position: 'relative', zIndex: 1 }}>{label}</span>
        {isActive && (
            <motion.span
                layoutId="navActiveDot"
                className="absolute right-3 w-1.5 h-1.5 rounded-full bg-blue-500"
                initial={false}
                transition={{
                    type: "spring",
                    stiffness: 350,
                    damping: 30,
                    duration: 0.5
                }}
            />
        )}
    </button>
);

const HomeIcon = forwardRef(({ onMouseEnter, onMouseLeave, isActive, className, size = 20, ...props }, ref) => {
    const controls = useAnimation();
    const isControlledRef = useRef(false);

    useImperativeHandle(ref, () => {
        isControlledRef.current = true;
        return {
            startAnimation: () => {
                if (!isActive) controls.start("animate");
            },
            stopAnimation: () => controls.start("normal"),
        };
    }, [controls, isActive]);

    const handleMouseEnter = useCallback(
        (e) => {
            if (isActive) return;
            if (isControlledRef.current) {
                onMouseEnter?.(e);
            } else {
                controls.start("animate");
            }
        },
        [controls, onMouseEnter, isActive]
    );

    const handleMouseLeave = useCallback(
        (e) => {
            if (isControlledRef.current) {
                onMouseLeave?.(e);
            } else {
                controls.start("normal");
            }
        },
        [controls, onMouseLeave]
    );

    const defaultTransition = {
        duration: 0.6,
        opacity: { duration: 0.2 },
    };

    const pathVariants = {
        normal: {
            pathLength: 1,
            opacity: 1,
        },
        animate: {
            opacity: [0, 1],
            pathLength: [0, 1],
        },
    };

    return (
        <div
            className={className}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            {...props}
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: size,
                height: size,
                cursor: 'pointer'
            }}
        >
            <svg
                fill="none"
                height={size}
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                width={size}
                xmlns="http://www.w3.org/2000/svg"
            >
                <path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <motion.path
                    animate={controls}
                    d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"
                    transition={defaultTransition}
                    variants={pathVariants}
                    initial="normal"
                />
            </svg>
        </div>
    );
});
HomeIcon.displayName = "HomeIcon";

const UsersIcon = forwardRef(({ onMouseEnter, onMouseLeave, isActive, className, size = 20, duration = 1, isAnimated = true, ...props }, ref) => {
    const controls = useAnimation();
    const isControlledRef = useRef(false);

    useImperativeHandle(ref, () => {
        isControlledRef.current = true;
        return {
            startAnimation: () => {
                if (!isActive) controls.start("animate");
            },
            stopAnimation: () => controls.start("normal"),
        };
    }, [controls, isActive]);

    const handleMouseEnter = useCallback(
        (e) => {
            if (!isAnimated || isActive) return;
            if (isControlledRef.current) {
                onMouseEnter?.(e);
            } else {
                controls.start("animate");
            }
        },
        [controls, isAnimated, onMouseEnter, isActive]
    );

    const handleMouseLeave = useCallback(
        (e) => {
            if (isControlledRef.current) {
                onMouseLeave?.(e);
            } else {
                controls.start("normal");
            }
        },
        [controls, onMouseLeave]
    );

    const arcVariants = {
        normal: { strokeDashoffset: 0, opacity: 1 },
        animate: {
            strokeDashoffset: [50, 0],
            opacity: [0.3, 1],
            transition: {
                duration: 0.7 * duration,
                ease: "easeInOut",
            },
        },
    };

    const headVariants = {
        normal: { scale: 1, opacity: 1 },
        animate: {
            scale: [0.6, 1.2, 1],
            opacity: [0, 1],
            transition: {
                duration: 0.6 * duration,
                ease: "easeOut",
            },
        },
    };

    const sideArcVariants = {
        normal: { strokeDashoffset: 0, opacity: 0.8 },
        animate: {
            strokeDashoffset: [40, 0],
            opacity: [0.2, 1],
            transition: {
                duration: 0.7 * duration,
                ease: "easeInOut",
                delay: 0.3,
            },
        },
    };

    return (
        <div
            className={className}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            {...props}
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: size,
                height: size,
                cursor: 'pointer'
            }}
        >
            <motion.svg
                xmlns="http://www.w3.org/2000/svg"
                width={size}
                height={size}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <motion.path
                    d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
                    strokeDasharray="50"
                    strokeDashoffset="50"
                    variants={arcVariants}
                    initial="normal"
                    animate={controls}
                />
                <motion.path
                    d="M16 3.128a4 4 0 0 1 0 7.744"
                    strokeDasharray="40"
                    strokeDashoffset="40"
                    variants={sideArcVariants}
                    initial="normal"
                    animate={controls}
                />
                <motion.path
                    d="M22 21v-2a4 4 0 0 0-3-3.87"
                    strokeDasharray="40"
                    strokeDashoffset="40"
                    variants={sideArcVariants}
                    initial="normal"
                    animate={controls}
                />
                <motion.circle
                    cx="9"
                    cy="7"
                    r="4"
                    variants={headVariants}
                    initial="normal"
                    animate={controls}
                />
            </motion.svg>
        </div>
    );
});
UsersIcon.displayName = "UsersIcon";

const SellersIcon = UsersIcon;

const BoxesIcon = forwardRef(({ onMouseEnter, onMouseLeave, isActive, className, size = 20, ...props }, ref) => {
    const controls = useAnimation();
    const isControlledRef = useRef(false);

    useImperativeHandle(ref, () => {
        isControlledRef.current = true;
        return {
            startAnimation: () => {
                if (!isActive) controls.start("animate");
            },
            stopAnimation: () => controls.start("normal"),
        };
    }, [controls, isActive]);

    const handleMouseEnter = useCallback(
        (e) => {
            if (isActive) return;
            if (isControlledRef.current) {
                onMouseEnter?.(e);
            } else {
                controls.start("animate");
            }
        },
        [controls, onMouseEnter, isActive]
    );

    const handleMouseLeave = useCallback(
        (e) => {
            if (isControlledRef.current) {
                onMouseLeave?.(e);
            } else {
                controls.start("normal");
            }
        },
        [controls, onMouseLeave]
    );

    const baseColor = isActive ? "currentColor" : "#9CA3AF";

    return (
        <div
            className={className}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            {...props}
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: size,
                height: size,
                cursor: 'pointer'
            }}
        >
            <svg
                fill="none"
                width={size}
                height={size}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                style={{ overflow: "visible" }}
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
            >
                {/* Path 1: Top/Left Box */}
                <motion.path
                    animate={controls}
                    d="M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l3 1.8a2 2 0 0 0 2.06 0L12 19v-5.5l-5-3-4.03 2.42Z m4.03 3.58 -4.74 -2.85 m4.74 2.85 5-3 m-5 3v5.17"
                    stroke={baseColor}
                    variants={{
                        normal: { translateX: 0, translateY: 0 },
                        animate: { translateX: -1.5, translateY: 1.5 },
                    }}
                    transition={{ duration: 0.3 }}
                />
                <motion.path
                    animate={controls}
                    d="M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l3 1.8a2 2 0 0 0 2.06 0L12 19v-5.5l-5-3-4.03 2.42Z m4.03 3.58 -4.74 -2.85 m4.74 2.85 5-3 m-5 3v5.17"
                    stroke="currentColor" // Overlays with interaction color
                    variants={{
                        normal: { translateX: 0, translateY: 0, pathLength: 0, opacity: 0 },
                        animate: { translateX: -1.5, translateY: 1.5, pathLength: 1, opacity: 1 },
                    }}
                    transition={{ duration: 0.4, ease: "easeInOut" }}
                />

                {/* Path 2: Right Box */}
                <motion.path
                    animate={controls}
                    d="M12 13.5V19l3.97 2.38a2 2 0 0 0 2.06 0l3-1.8a2 2 0 0 0 .97-1.71v-3.24a2 2 0 0 0-.97-1.71L17 10.5l-5 3Z m5 3-5-3 m5 3 4.74-2.85 M17 16.5v5.17"
                    stroke={baseColor}
                    variants={{
                        normal: { translateX: 0, translateY: 0 },
                        animate: { translateX: 1.5, translateY: 1.5 },
                    }}
                    transition={{ duration: 0.3 }}
                />
                <motion.path
                    animate={controls}
                    d="M12 13.5V19l3.97 2.38a2 2 0 0 0 2.06 0l3-1.8a2 2 0 0 0 .97-1.71v-3.24a2 2 0 0 0-.97-1.71L17 10.5l-5 3Z m5 3-5-3 m5 3 4.74-2.85 M17 16.5v5.17"
                    stroke="currentColor"
                    variants={{
                        normal: { translateX: 0, translateY: 0, pathLength: 0, opacity: 0 },
                        animate: { translateX: 1.5, translateY: 1.5, pathLength: 1, opacity: 1 },
                    }}
                    transition={{ duration: 0.4, ease: "easeInOut", delay: 0.1 }} // Staggered
                />

                {/* Path 3: Top Box */}
                <motion.path
                    animate={controls}
                    d="M7.97 4.42A2 2 0 0 0 7 6.13v4.37l5 3 5-3V6.13a2 2 0 0 0-.97-1.71l-3-1.8a2 2 0 0 0-2.06 0l-3 1.8Z M12 8 7.26 5.15 m4.74 2.85 4.74-2.85 M12 13.5V8"
                    stroke={baseColor}
                    variants={{
                        normal: { translateX: 0, translateY: 0 },
                        animate: { translateX: 0, translateY: -1.5 },
                    }}
                    transition={{ duration: 0.3 }}
                />
                <motion.path
                    animate={controls}
                    d="M7.97 4.42A2 2 0 0 0 7 6.13v4.37l5 3 5-3V6.13a2 2 0 0 0-.97-1.71l-3-1.8a2 2 0 0 0-2.06 0l-3 1.8Z M12 8 7.26 5.15 m4.74 2.85 4.74-2.85 M12 13.5V8"
                    stroke="currentColor"
                    variants={{
                        normal: { translateX: 0, translateY: 0, pathLength: 0, opacity: 0 },
                        animate: { translateX: 0, translateY: -1.5, pathLength: 1, opacity: 1 },
                    }}
                    transition={{ duration: 0.4, ease: "easeInOut", delay: 0.2 }} // Staggered
                />
            </svg>
        </div>
    );
});
BoxesIcon.displayName = "BoxesIcon";

const ProductsIcon = BoxesIcon;

const UserIcon = forwardRef(({ onMouseEnter, onMouseLeave, isActive, className, size = 20, duration = 1, isAnimated = true, ...props }, ref) => {
    const controls = useAnimation();
    const isControlledRef = useRef(false);

    useImperativeHandle(ref, () => {
        isControlledRef.current = true;
        return {
            startAnimation: () => {
                if (!isActive) controls.start("animate");
            },
            stopAnimation: () => controls.start("normal"),
        };
    }, [controls, isActive]);

    const handleMouseEnter = useCallback(
        (e) => {
            if (!isAnimated || isActive) return;
            if (isControlledRef.current) {
                onMouseEnter?.(e);
            } else {
                controls.start("animate");
            }
        },
        [controls, isAnimated, onMouseEnter, isActive]
    );

    const handleMouseLeave = useCallback(
        (e) => {
            if (isControlledRef.current) {
                onMouseLeave?.(e);
            } else {
                controls.start("normal");
            }
        },
        [controls, onMouseLeave]
    );

    const baseColor = isActive ? "currentColor" : "currentColor"; // Always inherit color, opacity handles visual weight

    const bodyVariants = {
        normal: { strokeDashoffset: 0, opacity: 1 },
        animate: {
            strokeDashoffset: [40, 0],
            opacity: [0.3, 1],
            transition: { duration: 0.6 * duration, ease: "easeInOut" },
        },
    };

    const headVariants = {
        normal: { scale: 1, opacity: 1 },
        animate: {
            scale: [0.6, 1.2, 1],
            opacity: [0, 1],
            transition: { duration: 0.5 * duration, ease: "easeOut", delay: 0.2 },
        },
    };

    return (
        <div
            className={className}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            {...props}
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: size,
                height: size,
                cursor: 'pointer'
            }}
        >
            <motion.svg
                xmlns="http://www.w3.org/2000/svg"
                width={size}
                height={size}
                viewBox="0 0 24 24"
                fill="none"
                stroke={baseColor}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <motion.path
                    d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"
                    strokeDasharray="40"
                    strokeDashoffset="0"
                    variants={bodyVariants}
                    initial="normal"
                    animate={controls}
                />
                <motion.circle
                    cx="12"
                    cy="7"
                    r="4"
                    variants={headVariants}
                    initial="normal"
                    animate={controls}
                />
            </motion.svg>
        </div>
    );
});
UserIcon.displayName = "UserIcon";

const ProfileIcon = UserIcon;

// Store Icon (Dollar Circle) - Animated
const StoreIcon = forwardRef(({ onMouseEnter, onMouseLeave, isActive, className, size = 20, ...props }, ref) => {
    const controls = useAnimation();
    const isControlledRef = useRef(false);

    useImperativeHandle(ref, () => {
        isControlledRef.current = true;
        return {
            startAnimation: () => {
                if (!isActive) controls.start("animate");
            },
            stopAnimation: () => controls.start("normal"),
        };
    }, [controls, isActive]);

    const handleMouseEnter = useCallback(
        (e) => {
            if (isActive) return;
            if (isControlledRef.current) {
                onMouseEnter?.(e);
            } else {
                controls.start("animate");
            }
        },
        [controls, onMouseEnter, isActive]
    );

    const handleMouseLeave = useCallback(
        (e) => {
            if (isControlledRef.current) {
                onMouseLeave?.(e);
            } else {
                controls.start("normal");
            }
        },
        [controls, onMouseLeave]
    );

    const dollarMainVariants = {
        normal: {
            opacity: 1,
            pathLength: 1,
            transition: {
                duration: 0.4,
                opacity: { duration: 0.1 },
            },
        },
        animate: {
            opacity: [0, 1],
            pathLength: [0, 1],
            transition: {
                duration: 0.6,
                opacity: { duration: 0.1 },
            },
        },
    };

    const dollarSecondaryVariants = {
        normal: {
            opacity: 1,
            pathLength: 1,
            pathOffset: 0,
            transition: {
                delay: 0.3,
                duration: 0.3,
                opacity: { duration: 0.1, delay: 0.3 },
            },
        },
        animate: {
            opacity: [0, 1],
            pathLength: [0, 1],
            pathOffset: [1, 0],
            transition: {
                delay: 0.5,
                duration: 0.4,
                opacity: { duration: 0.1, delay: 0.5 },
            },
        },
    };

    return (
        <div
            className={className}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            {...props}
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: size,
                height: size,
                cursor: 'pointer'
            }}
        >
            <svg
                fill="none"
                height={size}
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                width={size}
                xmlns="http://www.w3.org/2000/svg"
            >
                <circle cx="12" cy="12" r="10" />
                <motion.path
                    animate={controls}
                    d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"
                    initial="normal"
                    variants={dollarMainVariants}
                />
                <motion.path
                    animate={controls}
                    d="M12 18V6"
                    initial="normal"
                    variants={dollarSecondaryVariants}
                />
            </svg>
        </div>
    );
});
StoreIcon.displayName = "StoreIcon";

const LogoutIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
);

const SettingsIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
);

// Calculator Icon - Animated chart bars for fee calculator
const CalculatorIcon = forwardRef(({ onMouseEnter, onMouseLeave, isActive, className, size = 20, ...props }, ref) => {
    const controls = useAnimation();
    const isControlledRef = useRef(false);

    useImperativeHandle(ref, () => {
        isControlledRef.current = true;
        return {
            startAnimation: () => {
                if (!isActive) controls.start("animate");
            },
            stopAnimation: () => controls.start("normal"),
        };
    }, [controls, isActive]);

    const handleMouseEnter = useCallback(
        (e) => {
            if (isActive) return;
            if (isControlledRef.current) {
                onMouseEnter?.(e);
            } else {
                controls.start("animate");
            }
        },
        [controls, onMouseEnter, isActive]
    );

    const handleMouseLeave = useCallback(
        (e) => {
            if (isControlledRef.current) {
                onMouseLeave?.(e);
            } else {
                controls.start("normal");
            }
        },
        [controls, onMouseLeave]
    );

    const bar1Variants = {
        normal: { pathLength: 1, opacity: 1 },
        animate: {
            pathLength: [0, 1],
            opacity: [0, 1],
            transition: { duration: 0.4, ease: "easeInOut", delay: 0 },
        },
    };

    const bar2Variants = {
        normal: { pathLength: 1, opacity: 1 },
        animate: {
            pathLength: [0, 1],
            opacity: [0, 1],
            transition: { duration: 0.4, ease: "easeInOut", delay: 0.15 },
        },
    };

    const bar3Variants = {
        normal: { pathLength: 1, opacity: 1 },
        animate: {
            pathLength: [0, 1],
            opacity: [0, 1],
            transition: { duration: 0.4, ease: "easeInOut", delay: 0.3 },
        },
    };

    return (
        <div
            className={className}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            {...props}
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: size,
                height: size,
                cursor: 'pointer'
            }}
        >
            <motion.svg
                xmlns="http://www.w3.org/2000/svg"
                width={size}
                height={size}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                {/* Axis */}
                <path d="M3 3v16a2 2 0 0 0 2 2h16" />
                {/* Animated bars */}
                <motion.path
                    d="M8 17V5"
                    variants={bar1Variants}
                    initial="normal"
                    animate={controls}
                />
                <motion.path
                    d="M13 17V9"
                    variants={bar2Variants}
                    initial="normal"
                    animate={controls}
                />
                <motion.path
                    d="M18 17V13"
                    variants={bar3Variants}
                    initial="normal"
                    animate={controls}
                />
            </motion.svg>
        </div>
    );
});
CalculatorIcon.displayName = "CalculatorIcon";

// AI Assistant Icon - Animated Bot
const botVariants = {
    path1: {
        normal: {},
        animate: {}
    },
    rect: {
        normal: {},
        animate: {}
    },
    path4: {
        normal: { x: 0, y: 0 },
        animate: {
            x: [0, -1.5, 1.5, 0],
            y: [0, 1.5, 1.5, 0],
            transition: { ease: 'easeInOut', duration: 1.3 },
        },
    },
    path5: {
        normal: { x: 0, y: 0 },
        animate: {
            x: [0, -1.5, 1.5, 0],
            y: [0, 1.5, 1.5, 0],
            transition: { ease: 'easeInOut', duration: 1.3 },
        },
    },
};

// AI Assistant Icon - Animated Bot
const BotIcon = forwardRef(({ onMouseEnter, onMouseLeave, isActive, className, size = 20, ...props }, ref) => {
    const controls = useAnimation();
    const isControlledRef = useRef(false);

    useImperativeHandle(ref, () => {
        isControlledRef.current = true;
        return {
            startAnimation: () => {
                if (!isActive) controls.start("animate");
            },
            stopAnimation: () => controls.start("normal"),
        };
    }, [controls, isActive]);

    const handleMouseEnter = useCallback(
        (e) => {
            if (isActive) return;
            if (isControlledRef.current) {
                onMouseEnter?.(e);
            } else {
                controls.start("animate");
            }
        },
        [controls, onMouseEnter, isActive]
    );

    const handleMouseLeave = useCallback(
        (e) => {
            if (isControlledRef.current) {
                onMouseLeave?.(e);
            } else {
                controls.start("normal");
            }
        },
        [controls, onMouseLeave]
    );

    return (
        <motion.svg
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            animate={controls}
            initial="normal"
            style={{
                display: 'block',
                cursor: 'pointer',
                filter: isActive ? 'drop-shadow(0 0 5px rgba(59, 130, 246, 0.5))' : 'none'
            }}
            {...props}
        >
            {/* Antenna */}
            <motion.path
                d="M12 8V4H8"
                variants={botVariants.path1}
            />
            {/* Head */}
            <motion.rect
                width={16}
                height={12}
                x={4}
                y={8}
                rx={2}
                variants={botVariants.rect}
            />
            {/* Side parts */}
            <path d="M2 14h2" />
            <path d="M20 14h2" />
            {/* Eyes */}
            <motion.path
                d="M15 13v2"
                variants={botVariants.path4}
            />
            <motion.path
                d="M9 13v2"
                variants={botVariants.path5}
            />
        </motion.svg>
    );
});
BotIcon.displayName = "BotIcon";


// Tier Icons and Names mapping
const TIER_CONFIG = {
    guest: {
        name: 'Convidado',
        color: '#4f6074ff',
        bg: 'rgba(107, 114, 128, 0.1)',
        icon: (props) => (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
            </svg>
        )
    },
    bronze: {
        name: 'Explorador',
        color: '#09b489ff',
        bg: 'rgba(180, 83, 9, 0.1)',
        icon: (props) => (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8l4 4-4 4M8 12h8" />
            </svg>
        )
    },
    prata: {
        name: 'Escavador',
        color: '#504b63ff',
        bg: 'rgba(75, 85, 99, 0.1)',
        icon: (props) => (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
        )
    },
    ouro: {
        name: 'Minerador',
        color: '#0696d9ff',
        bg: 'rgba(6, 69, 217, 0.1)',
        icon: (props) => (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
                <path d="M6 3h12l4 6-10 12L2 9z" />
                <path d="M11 3 8 9l3 12M13 3l3 6-3 12" />
                <path d="M2 9h20" />
            </svg>
        )
    }
};

// Guest Badge with animated hover effect
const GuestBadge = ({ config }) => {
    return (
        <motion.button
            whileHover="hover"
            initial="initial"
            className="relative overflow-hidden p-1 px-1 rounded-lg flex items-center gap-1.5 cursor-pointer block"
            variants={{
                initial: { backgroundColor: config.bg, color: config.color },
                hover: { backgroundColor: '#F97316', color: '#ffffff' } // Orange-500
            }}
            transition={{ duration: 0.3 }}
            style={{ minWidth: '85px' }} // Ensure consistent width
        >
            <div className="relative h-3.5 w-full overflow-hidden">
                {/* Default State (Convidado) */}
                <motion.div
                    className="absolute inset-0 flex items-center gap-1.5"
                    variants={{
                        initial: { y: 0 },
                        hover: { y: '-150%' }
                    }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                >
                    {config.icon({ className: "w-3.5 h-3.5" })}
                    <span className="text-[10px] font-black uppercase tracking-wider">
                        {config.name}
                    </span>
                </motion.div>

                {/* Hover State (Upgrade) */}
                <motion.div
                    className="absolute inset-0 flex items-center gap-1.5"
                    variants={{
                        initial: { y: '150%' },
                        hover: { y: 0 }
                    }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                >
                    <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-3.5 h-3.5"
                    >
                        <path d="M12 19V5" />
                        <path d="M5 12l7-7 7 7" />
                    </svg>
                    <span className="text-[10px] font-black uppercase tracking-wider">
                        UPGRADE
                    </span>
                </motion.div>
            </div>
        </motion.button>
    );
};

// Search Icon for "Buscar produtos"
const SearchLoopIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
);

// Xianyu Sidebar Icon (Logo Only - Colored via Mask)
const XianyuSidebarIcon = () => (
    <div
        className="w-5 h-5 bg-yellow-400"
        style={{
            maskImage: 'url(/xianyu-logo.svg)',
            maskSize: 'contain',
            maskRepeat: 'no-repeat',
            maskPosition: 'center',
            WebkitMaskImage: 'url(/xianyu-logo.svg)',
            WebkitMaskSize: 'contain',
            WebkitMaskRepeat: 'no-repeat',
            WebkitMaskPosition: 'center'
        }}
    />
);

// Yupoo Sidebar Icon (Logo Only - Colored via Mask)
const YupooSidebarIcon = () => (
    <div
        className="w-5 h-5 bg-green-500"
        style={{
            maskImage: 'url(/yupoo-logo.svg)',
            maskSize: 'contain',
            maskRepeat: 'no-repeat',
            maskPosition: 'center',
            WebkitMaskImage: 'url(/yupoo-logo.svg)',
            WebkitMaskSize: 'contain',
            WebkitMaskRepeat: 'no-repeat',
            WebkitMaskPosition: 'center'
        }}
    />
);

// Extracted SidebarContent to prevent remounting
const SidebarContent = ({
    user,
    activePage,
    miningInfo,
    onNavClick,
    onLogout,
    isMobile = false,
    isOpen,
    toggleSidebar,
    refs
}) => {
    const { productsIconRef, profileIconRef, sellersIconRef, homeIconRef, storeIconRef, calculatorIconRef, botIconRef: aiIconRef } = refs;

    return (
        <div className="flex flex-col h-full">
            {/* Logo / Brand Section */}
            <div className="p-4 border-b border-white/10">
                <div className="flex items-center justify-center">
                    <img src="/evo-logo-horizontal.png" alt="Huofind Logo" className="h-20 w-auto object-contain" />
                    {isMobile && (
                        <AnimatedMenuToggle toggle={toggleSidebar} isOpen={isOpen} />
                    )}
                </div>
            </div>

            {/* Profile Section */}
            <div className="px-4 py-3 border-b border-white/10">
                <div className="flex items-center gap-3">
                    <div className="sidebar-profile-avatar overflow-hidden ring-2 ring-white/30 ring-offset-2 ring-offset-[#1f2937]">
                        {user?.avatarUrl ? (
                            <img
                                src={user.avatarUrl}
                                alt={user?.name || 'Avatar'}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            user?.name?.[0] || user?.email?.[0]?.toUpperCase() || '?'
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <p className="font-bold text-white text-sm truncate">
                                {user?.name || 'Usuário'}
                            </p>
                            {/* Tier Badge integrated next to name */}
                            {miningInfo && (() => {
                                let tierKey = (user?.tier || 'guest').toLowerCase().trim();
                                if (tierKey.includes('minerador') || tierKey.includes('gold') || tierKey.includes('ouro')) tierKey = 'ouro';
                                else if (tierKey.includes('escavador') || tierKey.includes('silver') || tierKey.includes('prata')) tierKey = 'prata';
                                else if (tierKey.includes('explorador') || tierKey.includes('bronze')) tierKey = 'bronze';
                                else tierKey = 'guest';
                                const config = TIER_CONFIG[tierKey] || TIER_CONFIG['guest'];
                                return (
                                    <div
                                        className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border"
                                        style={{
                                            backgroundColor: `${config.color}10`,
                                            color: config.color,
                                            borderColor: `${config.color}30`
                                        }}
                                    >
                                        {config.name}
                                    </div>
                                );
                            })()}
                        </div>
                        <p className="text-[11px] text-white/60 truncate">
                            {user?.email || ''}
                        </p>
                    </div>
                </div>

                {/* Integrated Credits Section */}
                {miningInfo && (() => {
                    const isLowBalance = miningInfo.credits <= 10;
                    const daysUntilRenewal = miningInfo.nextRenewal
                        ? Math.max(0, Math.ceil((new Date(miningInfo.nextRenewal) - new Date()) / (1000 * 60 * 60 * 24)))
                        : null;

                    return (
                        <div className="mt-4 p-3 bg-white/10 rounded-xl border border-white/10 flex items-center justify-between group">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${isLowBalance ? 'bg-red-500/20 text-red-300' : 'bg-white/20 text-white'}`}>
                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="12" r="10" />
                                        <path d="M12 6v12M8 10h8M8 14h6" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-white/60 uppercase tracking-tighter">Saldo</p>
                                    <div className="flex items-baseline gap-1">
                                        <span className={`text-lg font-black ${isLowBalance ? 'text-red-300' : 'text-white'}`}>
                                            {miningInfo.credits}
                                        </span>
                                        <span className="text-[10px] font-medium text-white/60">créditos</span>
                                    </div>
                                </div>
                            </div>

                            {/* Renewal detail - only if exists */}
                            {daysUntilRenewal !== null && (
                                <div className="text-right">
                                    <p className="text-[9px] text-white/60 font-medium">Renovação</p>
                                    <p className="text-[10px] font-bold text-white/80">{daysUntilRenewal}d</p>
                                </div>
                            )}
                        </div>
                    );
                })()}
            </div>

            {/* Navigation Section */}
            <nav
                className="flex-1 p-4 overflow-y-auto"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                <style jsx>{`
                    nav::-webkit-scrollbar {
                        display: none;
                    }
                `}</style>
                <div className="mb-2">
                    <p className="px-4 mb-2 text-xs font-bold text-white/50 uppercase tracking-wider">
                        Menu
                    </p>
                    <ul className="space-y-1">
                        <li>
                            <NavItem
                                icon={<ProfileIcon ref={profileIconRef} isActive={activePage === 'profile'} />}
                                label="Perfil"
                                isActive={activePage === 'profile'}
                                onClick={() => onNavClick('profile')}
                                onMouseEnter={() => profileIconRef.current?.startAnimation()}
                                onMouseLeave={() => profileIconRef.current?.stopAnimation()}
                            />
                        </li>
                        <li>
                            <NavItem
                                icon={<HomeIcon ref={homeIconRef} isActive={activePage === 'home'} />}
                                label="Início"
                                isActive={activePage === 'home'}
                                onClick={() => onNavClick('home')}
                                onMouseEnter={() => homeIconRef.current?.startAnimation()}
                                onMouseLeave={() => homeIconRef.current?.stopAnimation()}
                            />
                        </li>

                        {/* Xianyu Collapsible */}
                        <CollapsibleSection title="Xianyu" icon={<XianyuSidebarIcon />}>
                            <ul className="space-y-1">
                                <li>
                                    <button
                                        className={`w-full text-left py-2 px-3 text-sm rounded-lg transition-colors flex items-center gap-2 ${activePage === 'xianyu-mining'
                                            ? 'text-blue-400 bg-blue-900/30'
                                            : 'text-white/70 hover:text-white hover:bg-white/10'
                                            }`}
                                        onClick={() => onNavClick('xianyu-mining')}
                                    >
                                        <LuPickaxe size={16} />
                                        Minerar produtos
                                    </button>
                                </li>
                            </ul>
                        </CollapsibleSection>

                        {/* Yupoo Collapsible */}
                        <CollapsibleSection title="Yupoo" icon={<YupooSidebarIcon />}>
                            <ul className="space-y-1">
                                <li>
                                    <button
                                        className={`w-full text-left py-2 px-3 text-sm rounded-lg transition-colors flex items-center gap-2 ${activePage === 'yupoo-search'
                                            ? 'text-blue-400 bg-blue-900/30'
                                            : 'text-white/70 hover:text-white hover:bg-white/10'
                                            }`}
                                        onClick={() => onNavClick('yupoo-search')}
                                    >
                                        <SearchLoopIcon />
                                        Buscar produtos
                                    </button>
                                </li>
                            </ul>
                        </CollapsibleSection>

                        <li>
                            <NavItem
                                icon={<ProductsIcon ref={productsIconRef} isActive={activePage === 'saved'} />}
                                label="Salvos"
                                isActive={activePage === 'saved'}
                                onClick={() => onNavClick('saved')}
                                onMouseEnter={() => productsIconRef.current?.startAnimation()}
                                onMouseLeave={() => productsIconRef.current?.stopAnimation()}
                            />
                        </li>
                        <li>
                            <NavItem
                                icon={<StoreIcon ref={storeIconRef} isActive={activePage === 'store'} />}
                                label="Loja"
                                isActive={activePage === 'store'}
                                onClick={() => onNavClick('store')}
                                onMouseEnter={() => storeIconRef.current?.startAnimation()}
                                onMouseLeave={() => storeIconRef.current?.stopAnimation()}
                            />
                        </li>
                    </ul>
                </div>

                <div className="mt-4 space-y-2">
                    <p className="px-4 mb-2 text-xs font-bold text-white/50 uppercase tracking-wider">
                        Ferramentas
                    </p>
                    <ul className="space-y-1 px-2">
                        <li>
                            <NavItem
                                icon={<CalculatorIcon ref={calculatorIconRef} isActive={activePage === 'fee-calculator'} />}
                                label="Calcular Taxa"
                                isActive={activePage === 'fee-calculator'}
                                onClick={() => onNavClick('fee-calculator')}
                                onMouseEnter={() => calculatorIconRef.current?.startAnimation()}
                                onMouseLeave={() => calculatorIconRef.current?.stopAnimation()}
                            />
                        </li>
                        <li>
                            <NavItem
                                icon={<BotIcon ref={aiIconRef} isActive={activePage === 'declaration-assistant'} />}
                                label="Assis. Declaração"
                                isActive={activePage === 'declaration-assistant'}
                                onClick={() => onNavClick('declaration-assistant')}
                                onMouseEnter={() => aiIconRef.current?.startAnimation()}
                                onMouseLeave={() => aiIconRef.current?.stopAnimation()}
                            />
                        </li>
                    </ul>
                </div>
            </nav>

            {/* Footer / Logout */}
            <div className="p-4 border-t border-gray-100">
                <motion.button
                    onClick={onLogout}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-all duration-200"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                >
                    <LogoutIcon />
                    Sair
                </motion.button>
            </div>
        </div >
    );
};

// Main Sidebar component
const Sidebar = ({ user, activePage, miningInfo, onPageChange, onLogout, showBRL, onToggleCurrency, hasResults }) => {
    const [isOpen, setIsOpen] = useState(false);
    const productsIconRef = useRef(null);
    const profileIconRef = useRef(null);
    const sellersIconRef = useRef(null);
    const homeIconRef = useRef(null);
    const storeIconRef = useRef(null);
    const calculatorIconRef = useRef(null);
    const botIconRef = useRef(null);

    const toggleSidebar = () => setIsOpen(!isOpen);

    const handleNavClick = (pageId) => {
        onPageChange(pageId);
        setIsOpen(false); // Close mobile menu after navigation
    };

    const sidebarProps = {
        user,
        activePage,
        miningInfo,
        onNavClick: handleNavClick,
        onLogout,
        isOpen,
        toggleSidebar,
        refs: { productsIconRef, profileIconRef, sellersIconRef, homeIconRef, storeIconRef, calculatorIconRef, botIconRef }
    };

    return (
        <>
            {/* Mobile Top Bar */}
            <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-[#1f2937]/30 backdrop-blur-xl border-b border-white/10">
                <div className="flex items-center justify-between px-4 py-3">
                    <img src="/evo-logo-horizontal.png" alt="Huofind Logo" className="h-7 w-auto object-contain" />

                    <div className="flex items-center gap-4">
                        {/* Mobile Currency Toggle - only on mining page with results */}
                        {activePage === 'xianyu-mining' && hasResults && (
                            <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-white/5 border border-white/10">
                                <span className="text-[10px] font-bold" style={{ color: showBRL ? '#6B7280' : 'white' }}>
                                    ¥
                                </span>
                                <button
                                    onClick={onToggleCurrency}
                                    className="relative w-8 h-4 rounded-full transition-all duration-300"
                                    style={{
                                        background: showBRL ? '#3B82F6' : 'rgba(255, 255, 255, 0.2)'
                                    }}
                                >
                                    <div
                                        className="absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-all duration-300"
                                        style={{
                                            left: showBRL ? '18px' : '2px'
                                        }}
                                    />
                                </button>
                                <span className="text-[10px] font-bold" style={{ color: showBRL ? 'white' : '#6B7280' }}>
                                    R$
                                </span>
                            </div>
                        )}
                        <AnimatedMenuToggle toggle={toggleSidebar} isOpen={isOpen} />
                    </div>
                </div>
            </div>

            {/* Mobile Sidebar Overlay */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial="hidden"
                        animate="visible"
                        exit="hidden"
                        variants={{ /* Define standard overlay variants inline or reuse if available elsewhere, but here we assume defaults */
                            hidden: { opacity: 0 }, visible: { opacity: 1 }
                        }}
                        transition={{ duration: 0.2 }}
                        className="md:hidden fixed inset-0 z-50 bg-black/20 backdrop-blur-sm"
                        onClick={toggleSidebar}
                    />
                )}
            </AnimatePresence>

            {/* Mobile Sidebar */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial="hidden"
                        animate="visible"
                        exit="hidden"
                        variants={{ /* Inline variants for simple slide-in */
                            hidden: { x: "-100%" }, visible: { x: 0 }
                        }}
                        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                        className="md:hidden fixed inset-y-0 left-0 z-50 w-72 bg-[#1f2937] shadow-2xl"
                    >
                        <SidebarContent {...sidebarProps} isMobile={true} />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Desktop Sidebar */}
            <div className="hidden md:flex flex-col fixed top-0 left-0 h-full w-64 bg-[#1f2937] border-r border-white/10 shadow-sm z-40">
                <SidebarContent {...sidebarProps} />
            </div>
        </>
    );
};
export default Sidebar;
