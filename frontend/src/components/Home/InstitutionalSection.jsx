import { motion } from 'framer-motion';
import { LuSearch, LuPackage, LuGlobe } from 'react-icons/lu';

/**
 * InstitutionalSection - Value proposition section
 * Short and objective presentation of the platform benefits
 */

const VALUE_PROPS = [
    {
        icon: LuSearch,
        text: 'Busca centralizada na Yupoo',
        description: 'Encontre produtos dos melhores vendedores da Yupoo em um só lugar'
    },
    {
        icon: LuPackage,
        text: 'Organização de produtos e fornecedores',
        description: 'Salve e organize seus produtos e vendedores favoritos'
    },
    {
        icon: LuGlobe,
        text: 'Plataforma para importadores brasileiros',
        description: 'Pensada especialmente para o mercado brasileiro'
    }
];

function InstitutionalSection() {
    return (
        <section className="py-10">
            {/* Container with subtle background */}
            <motion.div
                className="rounded-2xl p-8"
                style={{ backgroundColor: '#1f2937' }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                {/* Grid */}
                <div className="value-prop-grid">
                    {VALUE_PROPS.map((prop, index) => {
                        const Icon = prop.icon;
                        return (
                            <motion.div
                                key={index}
                                className="flex flex-col items-center text-center md:items-start md:text-left"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4, delay: index * 0.1 }}
                            >
                                {/* Icon */}
                                <div
                                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
                                    style={{
                                        background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                                        boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)'
                                    }}
                                >
                                    <Icon size={24} className="text-white" />
                                </div>

                                {/* Text */}
                                <h3 className="font-bold text-white text-sm mb-1">
                                    {prop.text}
                                </h3>
                                <p className="text-xs text-gray-400 leading-relaxed">
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
