import { motion } from 'framer-motion';
import {
    LuNewspaper,
    LuBookOpen,
    LuActivity,
    LuArrowUpRight,
} from 'react-icons/lu';

/**
 * ResourcesRow — Tertiary "learn more" cards in the Stripe dashboard tradition.
 *
 * These are intentionally NOT navigation shortcuts (which live in the sidebar).
 * They point at informational surfaces — release notes, help center, platform
 * status — so the home page provides orientation without duplicating the nav.
 */

const RESOURCES = [
    {
        id: 'whats-new',
        icon: LuNewspaper,
        eyebrow: 'Novidades',
        title: 'O que há de novo',
        description:
            'Acompanhe as últimas atualizações, recursos e melhorias lançadas para a plataforma.',
        tint: '#60A5FA',
    },
    {
        id: 'guides',
        icon: LuBookOpen,
        eyebrow: 'Central de ajuda',
        title: 'Guias e tutoriais',
        description:
            'Aprenda a aproveitar ao máximo a mineração, busca e ferramentas de análise.',
        tint: '#A78BFA',
    },
    {
        id: 'status',
        icon: LuActivity,
        eyebrow: 'Status',
        title: 'Plataforma operacional',
        description:
            'Todos os sistemas estão estáveis. Acompanhe incidentes e tempos de resposta em tempo real.',
        tint: '#10B981',
    },
];

function ResourcesRow() {
    return (
        <section className="resources-row">
            <div className="section-head">
                <span className="section-eyebrow">Recursos</span>
                <h2 className="section-title">Explore a plataforma</h2>
                <p className="section-subtitle">
                    Documentação, novidades e indicadores em um único lugar.
                </p>
            </div>

            <div className="resources-grid">
                {RESOURCES.map((item, idx) => {
                    const Icon = item.icon;
                    return (
                        <motion.a
                            key={item.id}
                            href="#"
                            onClick={(e) => e.preventDefault()}
                            className="resource-card"
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.45, delay: 0.05 * idx }}
                            whileHover={{ y: -3 }}
                            style={{ '--tint': item.tint }}
                        >
                            <div className="resource-card-top">
                                <div className="resource-icon">
                                    <Icon size={18} strokeWidth={1.7} />
                                </div>
                                <LuArrowUpRight
                                    size={16}
                                    className="resource-arrow"
                                />
                            </div>

                            <div className="resource-eyebrow">
                                {item.id === 'status' && (
                                    <span className="status-pulse" aria-hidden="true" />
                                )}
                                {item.eyebrow}
                            </div>
                            <h3 className="resource-title">{item.title}</h3>
                            <p className="resource-description">{item.description}</p>
                        </motion.a>
                    );
                })}
            </div>
        </section>
    );
}

export default ResourcesRow;
