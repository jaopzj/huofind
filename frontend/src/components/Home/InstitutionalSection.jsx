import { motion } from 'framer-motion';
import {
    LuSearch,
    LuLayers,
    LuGlobe,
    LuShieldCheck,
} from 'react-icons/lu';

/**
 * InstitutionalSection — Refined value proposition row.
 * Stripe-style: minimal chrome, precise typography, hairline dividers.
 */

const VALUE_PROPS = [
    {
        icon: LuSearch,
        title: 'Busca centralizada',
        description:
            'Encontre produtos dos melhores vendedores do Yupoo em um catálogo unificado.',
    },
    {
        icon: LuLayers,
        title: 'Organização inteligente',
        description:
            'Salve produtos, organize vendedores e monte coleções privadas para o seu negócio.',
    },
    {
        icon: LuShieldCheck,
        title: 'Feito para importadores',
        description:
            'Ferramentas alinhadas à legislação brasileira e à realidade do revendedor.',
    },
    {
        icon: LuGlobe,
        title: 'Mercado global, foco BR',
        description:
            'Interface em português com suporte a CNY e BRL em tempo real.',
    },
];

function InstitutionalSection() {
    return (
        <section className="institutional-section">
            <motion.div
                className="institutional-panel"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <div className="institutional-head">
                    <span className="section-eyebrow">Por que Evo Society</span>
                    <h2 className="section-title">
                        Uma plataforma construída para quem vive de importação.
                    </h2>
                </div>

                <div className="institutional-grid">
                    {VALUE_PROPS.map((prop, index) => {
                        const Icon = prop.icon;
                        return (
                            <motion.div
                                key={index}
                                className="institutional-item"
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4, delay: index * 0.06 }}
                            >
                                <div className="institutional-icon">
                                    <Icon size={18} strokeWidth={1.7} />
                                </div>
                                <h3 className="institutional-title">{prop.title}</h3>
                                <p className="institutional-description">
                                    {prop.description}
                                </p>
                            </motion.div>
                        );
                    })}
                </div>
            </motion.div>
        </section>
    );
}

export default InstitutionalSection;
