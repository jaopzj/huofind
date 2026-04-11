/**
 * CategoryIcons - Custom outline SVGs for clothing categories
 *
 * Replaces emoji icons with precise, stroke-based illustrations that match
 * lucide's visual weight (1.5 stroke, 24x24 viewBox).
 */

const baseProps = {
    width: 24,
    height: 24,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.6,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
};

export function TShirtIcon(props) {
    return (
        <svg {...baseProps} {...props}>
            <path d="M8 3 L4 5.5 L6 10 L8 9 V20 a1 1 0 0 0 1 1 h6 a1 1 0 0 0 1 -1 V9 L18 10 L20 5.5 L16 3" />
            <path d="M8 3 C 9 5.5 15 5.5 16 3" />
        </svg>
    );
}

export function SneakerIcon(props) {
    return (
        <svg {...baseProps} {...props}>
            <path d="M2 17 L2 14 C 2 12.5 3 12 4 12 L7 12 L9 8 L12 8 L13 11 L18 13 C 20 13.6 22 14.5 22 16.2 L22 17" />
            <path d="M2 17 H22 V19 a1 1 0 0 1 -1 1 H3 a1 1 0 0 1 -1 -1 Z" />
            <path d="M9 12 L10 14" />
            <path d="M12 12 L13 14" />
        </svg>
    );
}

export function HoodieIcon(props) {
    return (
        <svg {...baseProps} {...props}>
            <path d="M7 5 C 9 3 15 3 17 5 L20 6.5 L21.5 11 L18.5 12 V20 a1 1 0 0 1 -1 1 H6.5 a1 1 0 0 1 -1 -1 V12 L2.5 11 L4 6.5 Z" />
            <path d="M10 5 C 10 7 14 7 14 5" />
            <path d="M12 10 V16" />
            <path d="M10 13 H14" />
        </svg>
    );
}

export function PantsIcon(props) {
    return (
        <svg {...baseProps} {...props}>
            <path d="M6 3 H18 L19 11 L17 21 H13.5 L12 13 L10.5 21 H7 L5 11 Z" />
            <path d="M6 3 H18" />
            <path d="M12 3 V11" />
        </svg>
    );
}

export function PackageOutlineIcon(props) {
    return (
        <svg {...baseProps} {...props}>
            <path d="M16.5 9.4 7.5 4.21" />
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            <path d="M3.27 6.96 12 12.01l8.73-5.05" />
            <path d="M12 22.08V12" />
        </svg>
    );
}

/**
 * Get icon component for a given category id
 */
export function getCategoryIcon(categoryId) {
    switch (categoryId) {
        case 'camisetas':
            return TShirtIcon;
        case 'calcados':
            return SneakerIcon;
        case 'moletons':
            return HoodieIcon;
        case 'calcas':
            return PantsIcon;
        default:
            return PackageOutlineIcon;
    }
}
