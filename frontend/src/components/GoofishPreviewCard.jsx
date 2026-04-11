import { motion } from 'framer-motion';

/**
 * GoofishPreviewCard — Preview ao vivo do vendedor Goofish acima da search bar.
 * Replica exatamente o card que a extensão EVO Huofind injeta em /mining.
 *
 * Estados:
 *  - isLoading=true           -> skeleton "Checando informações do Vendedor"
 *  - sellerInfo disponível    -> card premium completo
 *  - nenhum dos dois          -> não renderiza nada
 */

/**
 * Mesma função da extensão. Converte strings como "1.9w" -> "19K" (1w = 10.000 = 10K).
 * Tolera vírgulas decimais injetadas pelo Google Translate ("1,9w" -> "19K").
 */
function formatSocialNumber(str) {
    if (!str || str === '-') return '-';
    const match = String(str).match(/([0-9.,]+)([wWkKmM]?)/);
    if (!match) return '-';
    const cleanNumber = match[1].replace(',', '.');
    let num = parseFloat(cleanNumber);
    if (isNaN(num)) return '-';
    let suffix = match[2].toLowerCase();
    if (suffix === 'w') {
        num = num * 10;
        suffix = 'k';
    }
    num = Number.isInteger(num) ? num : parseFloat(num.toFixed(1));
    if (suffix === 'k') return num + 'K';
    if (suffix === 'm') return num + 'M';
    return num.toString();
}

/**
 * Isola o token numérico de uma string bruta do Goofish.
 * Higieniza espaços que o Google Translate costuma injetar ("1, 9 w" -> "1,9w").
 */
function extractNumberToken(str) {
    if (!str) return '-';
    const clean = String(str).replace(/\s+/g, '');
    const m = clean.match(/[0-9.,]+[wWkKmM]?/);
    return m ? m[0] : '-';
}

export default function GoofishPreviewCard({ sellerInfo, isLoading = false }) {
    if (!isLoading && !sellerInfo) return null;

    // Estado de carregamento — spinner idêntico ao da extensão
    if (isLoading || !sellerInfo) {
        return (
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="w-full mb-4 rounded-xl overflow-hidden relative"
                style={{
                    background: 'rgb(31, 41, 55)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    color: 'white'
                }}
            >
                <div className="flex flex-col items-center justify-center p-6 gap-3 pt-8 pb-8">
                    <svg
                        className="animate-spin h-8 w-8 text-blue-400"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                    >
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                    </svg>
                    <div className="text-blue-400 font-medium text-sm">
                        Checando informações do Vendedor
                    </div>
                </div>
            </motion.div>
        );
    }

    // Extrai campos do sellerInfo (estrutura vinda do formatSellerData no backend)
    const raw = sellerInfo.rawData || {};

    const avatarUrl = sellerInfo.avatar || '';
    const safeAvatarUrl = avatarUrl.startsWith('//') ? 'https:' + avatarUrl : avatarUrl;
    const name = sellerInfo.nickname || 'Vendedor Restrito do Goofish';
    const location = sellerInfo.location || 'Localização Desconhecida';
    const desc = sellerInfo.description || '';
    const levelUrl = raw.levelSrc || '';
    const safeLevelUrl = levelUrl.startsWith('//') ? 'https:' + levelUrl : levelUrl;

    // Para os 3 stats usamos preferencialmente as strings brutas do Goofish
    // (ex: "1.9w粉丝", "在售 1234", "好评 (2419)"). Se não houver, caímos
    // no valor numérico já parseado pelo backend.
    const rawFollowers = raw.rawFollowers || (sellerInfo.followers ? String(sellerInfo.followers) : '');
    const nFollowers = formatSocialNumber(extractNumberToken(rawFollowers));
    const nProducts = formatSocialNumber(extractNumberToken(sellerInfo.productsText));
    const nReviews = formatSocialNumber(extractNumberToken(sellerInfo.reviewsText));

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="w-full mb-4 rounded-xl overflow-hidden relative"
            style={{
                background: 'rgb(31, 41, 55)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                color: 'white'
            }}
        >
            {/* Capa / Banner Premium envelopando todo o cabeçalho */}
            <div className="relative w-full bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-t-xl p-4">
                {/* Selo de nível flutuante top/right */}
                {safeLevelUrl && (
                    <img
                        src={safeLevelUrl}
                        alt="Level"
                        style={{
                            position: 'absolute',
                            top: 16,
                            right: 16,
                            height: 22,
                            width: 'auto',
                            objectFit: 'contain'
                        }}
                    />
                )}

                <div className="flex items-start gap-4 md:gap-6">
                    {/* Avatar com borda degradê dourada */}
                    <div className="flex flex-col items-center flex-shrink-0 gap-2">
                        <div
                            className="rounded-2xl p-1"
                            style={{
                                background: 'linear-gradient(135deg, #FACC15 0%, #F59E0B 100%)',
                                boxShadow: '0 4px 15px rgba(245, 158, 11, 0.3)'
                            }}
                        >
                            {safeAvatarUrl ? (
                                <img
                                    src={safeAvatarUrl}
                                    alt="Avatar"
                                    className="rounded-xl"
                                    style={{
                                        width: 136,
                                        height: 136,
                                        objectFit: 'cover'
                                    }}
                                />
                            ) : (
                                <div
                                    className="rounded-xl flex items-center justify-center text-4xl"
                                    style={{
                                        width: 136,
                                        height: 136,
                                        background: 'rgb(17, 24, 39)'
                                    }}
                                >
                                    👤
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Cabeçalho principal */}
                    <div className="flex flex-col flex-1 pt-1 relative min-w-0">
                        {/* Nome — container com max-width pra forçar quebra antes do selo top-right */}
                        <div
                            className="flex items-center mb-1"
                            style={{ maxWidth: '75%', minHeight: 28 }}
                        >
                            <h3
                                className="text-lg font-extrabold tracking-tight text-white m-0 line-clamp-2"
                                style={{ lineHeight: 1.2, wordBreak: 'break-word' }}
                            >
                                {name}
                            </h3>
                        </div>

                        {/* Localização */}
                        <div className="mt-1.5">
                            <p
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-widest"
                                style={{
                                    background: '#1f2937',
                                    color: '#D1D5DB',
                                    border: '1px solid rgba(255,255,255,0.05)',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                                    width: 'max-content'
                                }}
                            >
                                <span style={{ fontSize: 11 }}>📍</span> {location}
                            </p>
                        </div>

                        {/* Divisor e Stats */}
                        <div
                            className="flex flex-wrap items-center gap-4 md:gap-6 mt-4 pt-4 border-t"
                            style={{ borderColor: 'rgba(255,255,255,0.06)' }}
                        >
                            <div className="flex flex-col">
                                <span className="text-xl font-black text-white leading-none">
                                    👤 {nFollowers}
                                </span>
                                <span className="text-[10px] text-gray-400 uppercase tracking-widest mt-1.5 font-bold">
                                    Seguidores
                                </span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xl font-black text-white leading-none">
                                    📦 {nProducts}
                                </span>
                                <span className="text-[10px] text-gray-400 uppercase tracking-widest mt-1.5 font-bold">
                                    Itens à Venda
                                </span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xl font-black text-white leading-none">
                                    👍 {nReviews}
                                </span>
                                <span className="text-[10px] text-gray-400 uppercase tracking-widest mt-1.5 font-bold">
                                    Reviews Positivos
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Descrição / Bio fora do banner premium */}
            {desc && (
                <div className="px-1 pb-1">
                    <div
                        className="mt-3 rounded-xl p-4"
                        style={{
                            background: 'rgba(0,0,0,0.25)',
                            border: '1px solid rgba(255,255,255,0.03)'
                        }}
                    >
                        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                            Descrição do Vendedor
                        </div>
                        <div
                            className="text-[13px]"
                            style={{
                                color: '#D1D5DB',
                                lineHeight: 1.7,
                                wordBreak: 'break-word'
                            }}
                            dangerouslySetInnerHTML={{ __html: desc }}
                        />
                    </div>
                </div>
            )}
        </motion.div>
    );
}
