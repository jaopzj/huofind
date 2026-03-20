import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LuArrowLeft, LuShieldCheck, LuFileText, LuLock, LuScale, LuInfo, LuSparkles, LuZap } from 'react-icons/lu';

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
        { id: 'terms', label: 'Termos de Uso', icon: <LuFileText /> },
        { id: 'privacy', label: 'Política de Privacidade', icon: <LuShieldCheck /> }
    ];

    const handleBack = () => {
        window.location.href = '/';
    };

    return (
        <div className="min-h-screen bg-[#0b0f1a] text-gray-300 selection:bg-blue-500/30 selection:text-white font-sans">
            {/* Dark Grid Background */}
            <div className="fixed inset-0 z-0 pointer-events-none opacity-20">
                <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px]"></div>
                <div className="absolute inset-0 bg-gradient-to-b from-[#0b0f1a] via-transparent to-[#0b0f1a]"></div>
            </div>

            {/* Glowing Orbs */}
            <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full z-0 pointer-events-none"></div>
            <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-600/10 blur-[120px] rounded-full z-0 pointer-events-none"></div>

            {/* Header Navigation */}
            <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? 'py-4 backdrop-blur-xl bg-black/40 border-b border-white/5' : 'py-8'}`}>
                <div className="max-w-5xl mx-auto px-6 flex items-center justify-between">
                    <div 
                        className="flex items-center cursor-pointer group transition-all duration-300"
                        onClick={handleBack}
                    >
                        <img 
                            src="/evo-logo-horizontal.png" 
                            alt="EVO SOCIETY" 
                            className="h-10 w-auto object-contain transition-transform group-hover:scale-105"
                        />
                    </div>

                    <nav className="hidden md:flex items-center gap-1 bg-white/5 p-1 rounded-2xl border border-white/10 backdrop-blur-md">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${activeTab === tab.id
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                {tab.icon}
                                {tab.label}
                            </button>
                        ))}
                    </nav>

                    <button
                        onClick={handleBack}
                        className="flex items-center gap-2 px-6 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-sm font-bold transition-all active:scale-95 group"
                    >
                        <LuArrowLeft className="group-hover:-translate-x-1 transition-transform" />
                        Voltar
                    </button>
                </div>
            </header>

            {/* Tab Swiper for Mobile */}
            <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[90%] bg-[#1a1f2e]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-1 flex shadow-2xl">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all duration-300 ${activeTab === tab.id
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                            : 'text-gray-400'
                            }`}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Main Content */}
            <main className="relative z-10 pt-32 pb-32 px-6">
                <div className="max-w-4xl mx-auto">
                    {/* Page Title & Status */}
                    <div className="mb-12 text-center md:text-left">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-widest mb-4"
                        >
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                            </span>
                            Documentação Legal Oficial
                        </motion.div>
                        <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight mb-4">
                            {activeTab === 'terms' ? 'Termos de Serviço' : 'Privacidade & Dados'}
                        </h1>
                        <p className="text-gray-500 text-lg">
                            Última atualização: 19 de Março de 2026 • Versão 4.2.0
                        </p>
                    </div>

                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -30 }}
                            transition={{ duration: 0.4, ease: "easeOut" }}
                            className="bg-[#111827]/60 backdrop-blur-md p-8 md:p-16 rounded-[40px] border border-white/5 shadow-2xl relative overflow-hidden"
                        >
                            {/* Decorative Glow */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 blur-[80px] rounded-full -mr-32 -mt-32"></div>
                            
                            <div className="prose prose-invert prose-headings:text-white prose-headings:font-black prose-p:text-gray-400 prose-strong:text-blue-400 prose-ul:text-gray-400 max-w-none">
                                {activeTab === 'terms' ? <TermsContent /> : <PrivacyContent />}
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </main>

            {/* Footer */}
            <footer className="relative z-10 py-16 border-t border-white/5 text-center bg-black/20">
                <div className="max-w-4xl mx-auto px-6">
                    <div className="flex flex-col items-center gap-6">
                        <div className="flex items-center gap-2 opacity-50">
                            <LuSparkles className="text-blue-500" />
                            <span className="font-bold text-white tracking-tighter">EVO SOCIETY</span>
                        </div>
                        <p className="text-gray-500 text-xs leading-relaxed max-w-md">
                            A EVO SOCIETY é uma plataforma de inteligência e automação para importação. 
                            Não somos responsáveis por transações em sites de terceiros ou decisões alfandegárias.
                        </p>
                        <p className="text-gray-600 text-[10px] uppercase tracking-[0.2em]">
                            © 2026 EVO SOCIETY GLOBAL. TODOS OS DIREITOS RESERVADOS.
                        </p>
                    </div>
                </div>
            </footer>

            <style jsx>{`
                .prose h2 {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-top: 3rem;
                    font-size: 1.5rem;
                    letter-spacing: -0.025em;
                }
                .prose h2::before {
                    content: '';
                    display: block;
                    width: 4px;
                    height: 24px;
                    background: linear-gradient(to bottom, #3b82f6, #06b6d4);
                    border-radius: 99px;
                }
                .prose p {
                    line-height: 1.8;
                    margin-bottom: 1.5rem;
                }
                .prose ul {
                    list-style: none;
                    padding-left: 0;
                }
                .prose li {
                    position: relative;
                    padding-left: 1.5rem;
                    margin-bottom: 0.75rem;
                }
                .prose li::before {
                    content: '→';
                    position: absolute;
                    left: 0;
                    color: #3b82f6;
                    font-weight: bold;
                }
                .legal-card-info {
                    background: rgba(59, 130, 246, 0.05);
                    border: 1px solid rgba(59, 130, 246, 0.2);
                    padding: 2rem;
                    border-radius: 24px;
                    margin: 2rem 0;
                }
            `}</style>
        </div>
    );
};

const TermsContent = () => (
    <>
        <div className="legal-card-info">
            <h3 className="text-white font-bold flex items-center gap-2 mb-2">
                <LuInfo className="text-blue-500" />
                Resumo Essencial
            </h3>
            <p className="text-sm m-0">
                Ao acessar a <strong>EVO SOCIETY</strong>, você utiliza uma ferramenta de inteligência baseada em tecnologia proprietária para otimizar a mineração de dados e auxílio na importação. Não processamos compras de produtos, apenas organizamos informações e automatizamos tarefas complexas.
            </p>
        </div>

        <section>
            <h2>1. Definições de Ecossistema</h2>
            <p>Para clareza jurídica, as seguintes definições são adotadas:</p>
            <ul>
                <li><strong>EVO SOCIETY:</strong> O ecossistema completo de software, servidores e APIs proprietárias.</li>
                <li><strong>Mineração em Tempo Real (Xianyu Mining):</strong> Algoritmo de conexão direta com o hub de dados Xianyu para tradução e extração de metadados de anúncios.</li>
                <li><strong>Motor de Busca Yupoo:</strong> Sistema de indexação e validação de lotes (batches) de fornecedores Yupoo.</li>
                <li><strong>IA de Busca Visual:</strong> Redes neurais para reconhecimento e pareamento de produtos via upload de imagens.</li>
                <li><strong>Assistente de Declaração:</strong> Algoritmo de processamento de linguagem natural (NLP) para conversão de nomes comerciais em descrições alfandegárias aceitas internacionalmente.</li>
            </ul>
        </section>

        <section>
            <h2>2. Natureza Jurídica do Serviço</h2>
            <p>A EVO SOCIETY atua exclusivamente como uma ferramenta SaaS (Software as a Service) de inteligência competitiva e logística. Nossas operações são limitadas a:</p>
            <ul>
                <li>Indexação de banco de dados público de plataformas asiáticas.</li>
                <li>Automação de tradução de termos técnicos para o português brasileiro.</li>
                <li>Sugestões matemáticas de valores para declaração aduaneira baseadas em média histórica e categorias de risco.</li>
            </ul>
            <div className="bg-red-500/5 p-6 rounded-2xl border border-red-500/20 my-6">
                <p className="text-xs text-red-400 font-bold uppercase tracking-wider mb-2">⚠️ Clausula de Isenção Crucial</p>
                <p className="text-sm m-0">
                    A EVO SOCIETY não é um agente de compras (Forwarder), não possui estoque e não recebe pagamentos por produtos. Toda e qualquer garantia de produto, entrega ou qualidade deve ser resolvida diretamente com o vendedor ou agente escolhido pelo usuário.
                </p>
            </div>
        </section>

        <section>
            <h2>3. Sistema de Créditos e Monetização</h2>
            <p>O acesso às funcionalidades avançadas (Mineração e Assistente) é regido por um sistema de créditos proprietário:</p>
            <ul>
                <li><strong>Recargas:</strong> Créditos comprados individualmente têm validade vitalícia enquanto a conta estiver ativa.</li>
                <li><strong>Assinaturas (Planos Bronze, Prata, Ouro):</strong> Créditos mensais são renovados a cada 30 dias. Créditos de planos não são cumulativos para o mês seguinte.</li>
                <li><strong>Limites de Mineração:</strong> Cada nível de plano possui um limite de extração de dados para garantir a estabilidade do servidor e evitar abusos.</li>
            </ul>
        </section>

        <section>
            <h2>4. Responsabilidade Sobre IA e Dados</h2>
            <p>As sugestões fornecidas pelo <strong>Assistente de Declaração</strong> e pela <strong>Calculadora de Taxas</strong> são baseadas em algoritmos estatísticos. A responsabilidade final sobre a declaração enviada à Receita Federal é <strong>integral e exclusiva</strong> do Usuário (Art. 37 do Decreto-Lei nº 37/66).</p>
        </section>

        <section>
            <h2>5. Propriedade Intelectual</h2>
            <p>Nossa interface, algoritmos de mineração e código-fonte são protegidos. Tentativas de engenharia reversa, scraping de nossa plataforma ou uso de automação externa para acessar nosso site resultarão em banimento imediato e ações legais.</p>
        </section>

        <section>
            <h2>6. Foro e Jurisdição</h2>
            <p>O presente Termo é regido pelas leis da República Federativa do Brasil, elegendo-se o foro da Comarca de Canindé de São Francisco – SE para dirimir quaisquer litígios.</p>
        </section>
    </>
);

const PrivacyContent = () => (
    <>
        <div className="legal-card-info">
            <h3 className="text-white font-bold flex items-center gap-2 mb-2">
                <LuLock className="text-blue-500" />
                Sua Identidade Blindada
            </h3>
            <p className="text-sm m-0">
                Na EVO SOCIETY, tratamos seus dados sob os pilares da LGPD, garantindo que nada além do necessário seja processado para o funcionamento das nossas ferramentas de mineração.
            </p>
        </div>

        <section>
            <h2>7. Coleta Técnica de Dados</h2>
            <p>Processamos as seguintes categorias de informações:</p>
            <ul>
                <li><strong>Identificação:</strong> Nome, email corporativo/pessoal e ID de usuário gerado automaticamente.</li>
                <li><strong>Atividade Alfanumérica:</strong> Histórico de URLs mineradas e termos buscados para alimentar nosso cache inteligente e evitar o consumo dobrado de créditos do usuário.</li>
                <li><strong>Dados Sensíveis:</strong> Em conformidade com a LGPD, <strong>não</strong> coletamos dados de saúde, crenças ou orientação sexual.</li>
            </ul>
        </section>

        <section>
            <h2>8. Tratamento de Arquivos e Imagens</h2>
            <p>Ao utilizar o serviço de <strong>Busca por Imagem</strong>, aplicamos o seguinte protocolo:</p>
            <ul>
                <li>A imagem enviada é convertida em um "tensor vetorial" abstrato para processamento de similaridade.</li>
                <li>Imagens enviadas por usuários não assinantes (Guest) são deletadas imediatamente após o processamento.</li>
                <li>Não utilizamos suas fotos para treinamento de IA pública ou fins publicitários de terceiros.</li>
            </ul>
        </section>

        <section>
            <h2>9. Transações Financeiras</h2>
            <p>Nós <strong>não armazenamos</strong> dados de cartão de crédito. Todo o processamento de pagamentos é realizado via <strong>Stripe Infrastructure</strong>, utilizando criptografia de ponta a ponta e tokens de segurança que nunca tocam nossos servidores em formato legível.</p>
        </section>

        <section>
            <h2>10. Compartilhamento Restrito</h2>
            <p>Seus dados são compartilhados apenas com parceiros de infraestrutura necessários para o serviço (Vercel, Supabase, OpenAI/Anthropic para processamento de IA) sob acordos rígidos de confidencialidade.</p>
        </section>

        <section>
            <h2>11. Retenção e Exclusão</h2>
            <p>Você tem o direito de "ser esquecido". A qualquer momento, através do Painel de Perfil, o usuário pode solicitar o encerramento da conta, o que resultará na deleção permanente de todo o histórico de compras e mineração em até 30 dias úteis.</p>
        </section>
    </>
);

export default LegalPage;
