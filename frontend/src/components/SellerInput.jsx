import { useState, useEffect, useRef } from 'react';

function SellerInput({ onMine, onUrlChange, isLoading, isEvaluating }) {
    const [url, setUrl] = useState('');
    const [limit, setLimit] = useState(30);
    const lastEvaluatedUrl = useRef('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (url.trim()) {
            onMine(url.trim(), limit);
        }
    };

    const isValidUrl = url.includes('goofish.com') || url.includes('xianyu.com') || url === '';

    // Quando a URL muda e é válida, dispara avaliação do vendedor
    useEffect(() => {
        const trimmedUrl = url.trim();
        const isValid = trimmedUrl.includes('goofish.com') || trimmedUrl.includes('xianyu.com');

        // Só avalia se a URL mudou e é válida
        if (isValid && trimmedUrl !== lastEvaluatedUrl.current && onUrlChange) {
            lastEvaluatedUrl.current = trimmedUrl;
            onUrlChange(trimmedUrl);
        }
    }, [url, onUrlChange]);

    return (
        <div className="seller-input">
            <form className="seller-input__form" onSubmit={handleSubmit}>
                <div className="seller-input__field">
                    <label className="seller-input__label" htmlFor="seller-url">
                        URL do Perfil do Vendedor
                        {isEvaluating && (
                            <span style={{ marginLeft: '8px', color: 'var(--color-primary-light)', fontSize: '0.75rem' }}>
                                🔍 Avaliando vendedor...
                            </span>
                        )}
                    </label>
                    <input
                        id="seller-url"
                        type="url"
                        className="seller-input__input"
                        placeholder="https://www.goofish.com/personal?userId=..."
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        disabled={isLoading}
                        style={{ borderColor: !isValidUrl ? 'var(--color-error)' : undefined }}
                    />
                    {!isValidUrl && (
                        <small style={{ color: 'var(--color-error)', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>
                            URL deve ser do Goofish (goofish.com ou xianyu.com)
                        </small>
                    )}
                </div>

                <div className="seller-input__limit">
                    <div className="seller-input__limit-display">
                        <span className="seller-input__label">Limite de Produtos</span>
                        <span style={{ color: 'var(--color-primary-light)', fontWeight: 600 }}>{limit}</span>
                    </div>
                    <input
                        type="range"
                        className="seller-input__slider"
                        min="10"
                        max="500"
                        step="10"
                        value={limit}
                        onChange={(e) => setLimit(parseInt(e.target.value))}
                        disabled={isLoading}
                    />
                </div>

                <button
                    type="submit"
                    className={`seller-input__btn ${isLoading ? 'seller-input__btn--loading' : ''}`}
                    disabled={isLoading || !url.trim() || !isValidUrl}
                >
                    {isLoading ? 'Minerando' : '⛏️ Iniciar Mineração'}
                </button>
            </form>
        </div>
    );
}

export default SellerInput;
