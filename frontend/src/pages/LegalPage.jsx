import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const LegalPage = ({ initialType = 'terms' }) => {
    const [activeTab, setActiveTab] = useState(initialType);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const tabs = [
        { id: 'terms', label: 'Termos de Uso' },
        { id: 'privacy', label: 'Privacidade' }
    ];

    return (
        <div className="min-h-screen bg-[#FFFAF8] selection:bg-orange-100 selection:text-orange-900">
            {/* Background Pattern */}
            <div className="fixed inset-0 opacity-[0.03] pointer-events-none" style={{
                backgroundImage: `radial-gradient(#FF6B35 1px, transparent 1px)`,
                backgroundSize: '32px 32px'
            }}></div>

            {/* Navigation Header */}
            <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'py-4' : 'py-8'}`}>
                <div className="max-w-4xl mx-auto px-6">
                    <div className="flex items-center justify-between capsule-header bg-white/80 backdrop-blur-md border border-cream-200 neo-shadow-sm">
                        <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => window.location.href = '/'}>
                            <img src="/logo.svg" alt="Huofind" className="h-8 w-auto" />
                            <span className="font-bold text-gray-800 hidden sm:block">Huofind</span>
                        </div>

                        <nav className="flex items-center gap-1 bg-gray-100/50 p-1 rounded-full">
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`px-6 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${activeTab === tab.id
                                        ? 'bg-white text-orange-600 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
                                        }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </nav>

                        <button
                            onClick={() => window.location.href = '/'}
                            className="hidden sm:flex items-center gap-2 px-5 py-2 bg-orange-500 text-white rounded-full text-sm font-bold hover:bg-orange-600 transition-all active:scale-95"
                        >
                            Voltar
                        </button>
                    </div>
                </div>
            </header>

            {/* Content Area */}
            <main className="pt-32 pb-24 px-6">
                <div className="max-w-3xl mx-auto">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                            className="legal-content bg-white p-8 md:p-12 rounded-[32px] border border-gray-100 shadow-sm relative overflow-hidden"
                        >
                            {/* Decorative element */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50 rounded-bl-full -mr-16 -mt-16 opacity-50"></div>

                            {activeTab === 'terms' ? (
                                <TermsContent />
                            ) : (
                                <PrivacyContent />
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </main>

            {/* Footer */}
            <footer className="py-12 border-t border-gray-100 text-center">
                <p className="text-gray-400 text-sm">
                    © {new Date().getFullYear()} Huofind. Todos os direitos reservados.
                </p>
            </footer>
        </div>
    );
};

const TermsContent = () => (
    <>
        <h1>Termos de Uso</h1>

        <div className="highlight-box">
            <p className="font-medium text-orange-800 m-0">
                Última atualização: 13 de Janeiro de 2026. Ao utilizar a Huofind, você concorda integralmente com estes termos.
            </p>
        </div>

        <section>
            <h2>1. Definições</h2>
            <p>Para fins deste documento, aplicam-se as seguintes definições:</p>
            <ul>
                <li><strong>Huofind:</strong> Plataforma digital de mecanismo de busca avançado, responsável pela indexação, organização e exibição de anúncios públicos de terceiros.</li>
                <li><strong>Usuário:</strong> Pessoa física que realiza cadastro e utiliza a plataforma Huofind.</li>
                <li><strong>Plataformas de Terceiros:</strong> Sites externos cujos anúncios podem ser indexados pela Huofind, incluindo Xianyu, Yupoo e similares.</li>
                <li><strong>Scraping:</strong> Processo automatizado de coleta e organização de dados públicos disponíveis na internet.</li>
                <li><strong>Planos:</strong> Modalidades de acesso (Jardineiro, Escavador e Minerador).</li>
            </ul>
        </section>

        <section>
            <h2>2. Natureza do Serviço</h2>
            <p>A Huofind atua exclusivamente como um mecanismo de busca e indexação, possuindo as seguintes características:</p>
            <ul>
                <li>Indexação e organização automatizada de anúncios públicos.</li>
                <li>Exibição de informações conforme disponibilizadas por terceiros.</li>
                <li>Redirecionamento do Usuário para plataformas externas.</li>
            </ul>
            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 my-6">
                <h3 className="font-bold mb-3 text-gray-800">2.1 Limitações do Serviço</h3>
                <p className="text-sm">A Huofind <strong>não</strong> comercializa produtos, não intermedia negociações, não processa pagamentos de produtos e não garante a entrega ou qualidade dos anúncios. Toda interação comercial ocorre diretamente entre o Usuário e a plataforma de terceiros.</p>
            </div>
        </section>

        <section>
            <h2>3. Independência e Não Afiliação</h2>
            <p>A Huofind atua de maneira totalmente independente. Não somos afiliados, patrocinados, autorizados ou endossados pelo Xianyu, Alibaba ou qualquer outra plataforma de terceiros aqui citada.</p>
        </section>

        <section>
            <h2>4. Responsabilidade do Usuário</h2>
            <p>O Usuário é o único responsável por cumprir os Termos de Uso das plataformas de terceiros acessadas. É expressamente proibido utilizar a Huofind para golpes, fraudes, engenharia social ou qualquer atividade ilícita.</p>
        </section>

        <section>
            <h2>5. Isenção de Garantias</h2>
            <p>A Huofind não garante a veracidade, integridade ou legalidade dos anúncios, nem a disponibilidade contínua do serviço ou funcionamento ininterrupto de links externos.</p>
        </section>

        <section>
            <h2>6. Suspensão e Bloqueio</h2>
            <p>A Huofind poderá, sem aviso prévio, suspender contas ou bloquear acessos em casos de uso abusivo, violação destes Termos ou tentativa de burlar sistemas.</p>
        </section>

        <section>
            <h2>7. Foro</h2>
            <p>Fica eleito o foro da Comarca de Canindé de São Francisco – SE para dirimir quaisquer controvérsias decorrentes deste documento.</p>
        </section>
    </>
);

const PrivacyContent = () => (
    <>
        <h1>Privacidade</h1>

        <div className="highlight-box">
            <p className="font-medium text-orange-800 m-0">
                Sua privacidade é prioridade na Huofind. Respeitamos a Lei Geral de Proteção de Dados (LGPD).
            </p>
        </div>

        <section>
            <h2>8. Coleta de Dados</h2>
            <p>Durante o cadastro e uso, coletamos apenas o essencial para a operação do serviço:</p>
            <ul>
                <li>Nome e E-mail para identificação da conta.</li>
                <li>Endereço IP e dados técnicos de acesso para segurança.</li>
                <li>Histórico de buscas para otimização do serviço.</li>
            </ul>
        </section>

        <section>
            <h2>9. Armazenamento e Compartilhamento</h2>
            <p>Os dados são armazenados em servidores seguros de alta performance (Supabase), podendo estar localizados no exterior.</p>
            <p>Compartilhamos dados apenas com provedores necessários (hospedagem, analytics, pagamentos) ou autoridades públicas quando exigido por lei.</p>
        </section>

        <section>
            <h2>10. Cookies</h2>
            <p>Atualmente, a Huofind <strong>não utiliza cookies</strong> para rastreamento de navegação externa.</p>
        </section>

        <section>
            <h2>11. Seus Direitos</h2>
            <p>Como titular dos dados, você pode solicitar a qualquer momento o acesso, correção ou exclusão de suas informações através do nosso suporte.</p>
        </section>

        <section>
            <h2>12. Aceite</h2>
            <p>Ao se cadastrar na Huofind, você declara que compreendeu e concorda integralmente com esta Política de Privacidade.</p>
        </section>
    </>
);

export default LegalPage;
