/**
 * Centralized route path definitions.
 * Maps legacy page IDs to URL paths for migration from virtual paging to React Router.
 */

export const ROUTES = {
    HOME: '/',
    MINING: '/mining',
    YUPOO: '/yupoo',
    SAVED: '/saved',
    PROFILE: '/profile',
    STORE: '/store',
    CALCULATOR: '/calculator',
    DECLARATION: '/declaration',
    PROFITABILITY: '/profitability',
    TERMS: '/terms',
    PRIVACY: '/privacy',
};

/**
 * Maps old virtual page IDs to new URL paths.
 * Used during migration from setActivePage() to useNavigate().
 */
export const PAGE_TO_PATH = {
    'home': ROUTES.HOME,
    'xianyu-mining': ROUTES.MINING,
    'yupoo-search': ROUTES.YUPOO,
    'saved': ROUTES.SAVED,
    'products': ROUTES.SAVED,   // QuickAccess alias
    'sellers': ROUTES.SAVED,    // QuickAccess alias
    'profile': ROUTES.PROFILE,
    'store': ROUTES.STORE,
    'fee-calculator': ROUTES.CALCULATOR,
    'declaration-assistant': ROUTES.DECLARATION,
    'profitability': ROUTES.PROFITABILITY,
};

/**
 * Resolves a legacy page ID to a URL path.
 * Falls back to '/' for unknown IDs.
 */
export function resolvePagePath(pageId) {
    return PAGE_TO_PATH[pageId] || '/';
}
