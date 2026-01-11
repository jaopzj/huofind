/**
 * CompareButton - Toggle button for product comparison selection
 */
function CompareButton({ isSelected, onClick, disabled = false }) {
    return (
        <button
            onClick={(e) => {
                e.stopPropagation();
                if (!disabled) onClick();
            }}
            disabled={disabled}
            className={`
                compare-button
                absolute top-2 right-2 z-10
                w-8 h-8 rounded-full
                flex items-center justify-center
                transition-all duration-200
                ${isSelected
                    ? 'liquid-glass-orange scale-110'
                    : 'liquid-glass-badge hover:scale-105'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
            title={isSelected ? 'Remover da comparação' : 'Adicionar à comparação'}
        >
            <svg
                className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-gray-600'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
            >
                {/* Balance/Scale icon */}
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"
                />
            </svg>
        </button>
    );
}

export default CompareButton;
