import './SparkleButton.css';

/**
 * SparkleButton - Animated button with mining pickaxe effect
 * Border animation activates when 'valid' prop is true
 */
function SparkleButton({ children, onClick, disabled, isLoading, valid = false, type = 'button', className = '' }) {
    return (
        <button
            type={type}
            className={`sparkle-button ${disabled ? 'disabled' : ''} ${isLoading ? 'loading' : ''} ${valid ? 'valid' : ''} ${className}`}
            onClick={onClick}
            disabled={disabled}
        >
            {/* Rotating border - only visible when valid */}
            <div className="dots_border" />

            {isLoading ? (
                <>
                    <div className="loading-spinner" />
                    <span className="text_button">Minerando...</span>
                </>
            ) : (
                <>
                    {/* Pickaxe Icon - Mining themed */}
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        className="mining-icon"
                    >
                        {/* Pickaxe head */}
                        <path
                            className="pickaxe-part"
                            d="M14.5 4L20 9.5L18.5 11L13 5.5L14.5 4Z"
                            fill="currentColor"
                        />
                        <path
                            className="pickaxe-part"
                            d="M17.5 6.5L19.5 4.5C20.5 3.5 20.5 3.5 21 4C21.5 4.5 21.5 4.5 20.5 5.5L18.5 7.5L17.5 6.5Z"
                            fill="currentColor"
                        />
                        {/* Pickaxe handle */}
                        <path
                            className="pickaxe-part"
                            d="M13 5.5L5 13.5C4.5 14 4.5 14.5 5 15L9 19C9.5 19.5 10 19.5 10.5 19L18.5 11L13 5.5Z"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            fill="none"
                        />
                        {/* Sparks from mining */}
                        <circle className="spark spark-1" cx="3" cy="20" r="1" fill="currentColor" />
                        <circle className="spark spark-2" cx="5" cy="21" r="0.5" fill="currentColor" />
                        <circle className="spark spark-3" cx="7" cy="20" r="0.8" fill="currentColor" />
                    </svg>
                    <span className="text_button">{children}</span>
                </>
            )}
        </button>
    );
}

export default SparkleButton;
