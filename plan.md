# Plano de Evolucao Estrutural - Evo Society: Mining & Logistics

> Documento mestre de evolucao tecnica da plataforma **Evo Society (Huofind)**.
> Baseado em auditoria profunda de todo o ecossistema: backend (2.103 linhas em `server.js`), frontend (1.369 linhas em `App.jsx`), modulos de scraping, pagamentos Stripe, sistema de creditos, referral e integracao Supabase.
>
> **Prioridades:** P0 = Critico/Imediato | P1 = Alta | P2 = Media | P3 = Baixa
>
> **Data da auditoria:** Marco 2026
> **Versao:** 2.0

---

## 1. Garantia de Seguranca Maxima (Blindagem de Dados)

Esta secao e a mais urgente. Vulnerabilidades ativas podem comprometer dados de usuarios, chaves de pagamento e a integridade financeira da plataforma.

---

### SEC-01. Rotacao Imediata de Segredos Expostos no Git (P0)

**Problema:** O arquivo `backend/.env` contem chaves de producao LIVE do Stripe (`sk_live_...`), chave de servico do Supabase (`SUPABASE_SERVICE_KEY`), segredo JWT, segredo do webhook e chave anon. Embora `.gitignore` liste `.env`, o arquivo ja foi commitado no historico do git (commit `da2ccea` e anteriores). Qualquer pessoa com acesso ao repositorio pode extrair todas as credenciais de producao.

**Objetivo:** Rotacionar todas as credenciais comprometidas e garantir que nunca mais sejam commitadas.

**Implementacao:**
1. Rotacionar imediatamente no painel Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
2. Rotacionar no Supabase Dashboard: `SUPABASE_SERVICE_KEY`, `SUPABASE_ANON_KEY`
3. Gerar novo `JWT_SECRET` criptograficamente seguro (ver SEC-02)
4. Executar `git rm --cached backend/.env` e `git rm --cached frontend/.env` (se rastreados)
5. Verificar com `git log --all --full-history -- backend/.env` a extensao da exposicao
6. Considerar usar `BFG Repo-Cleaner` para purgar segredos do historico git
7. Criar `backend/.env.example` e `frontend/.env.example` com valores placeholder
8. Adicionar pre-commit hook que rejeita commits contendo padroes `sk_live_`, `sk_test_`, `service_role`

**Arquivos afetados:** `backend/.env`, `frontend/.env`, `.gitignore`

---

### SEC-02. JWT Secret Criptograficamente Fraco (P0)

**Problema:** O `JWT_SECRET` atual e `huofind_jwt_secret_key_2026_secure_random_string` -- legivel, previsivel, com entropia estimada de ~40 bits. Um atacante pode tentar brute-force o segredo para forjar tokens de qualquer usuario.

**Arquivo:** `backend/auth.js` (linha 11: `const JWT_SECRET = process.env.JWT_SECRET`)

**Objetivo:** Substituir por segredo com 256 bits de entropia minima.

**Implementacao:**
1. Gerar novo segredo: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
2. Atualizar `JWT_SECRET` no `.env` de producao
3. Apos rotacao, todos os tokens existentes serao invalidados (usuarios precisam re-logar)
4. Documentar em `.env.example`: `JWT_SECRET=# Gere com: openssl rand -hex 64`

---

### SEC-03. Token JWT em Query String (SSE/EventSource) (P0)

**Problema:** O `authMiddleware.js` (linha 15) aceita token via `req.query.token` como fallback para EventSource. Tokens na URL aparecem em logs de servidor, historico do navegador, logs de proxy/CDN e cabecalhos Referer.

**Arquivo:** `backend/authMiddleware.js` linhas 9-18

**Objetivo:** Eliminar tokens de query strings.

**Implementacao:**
1. Para SSE (`/api/mine-stream`), substituir por ticket de curta duracao:
   - Endpoint `POST /api/mining/ticket` gera token single-use com TTL de 30 segundos
   - Armazena em Map/Redis: `{ ticket: userId, expiresAt }`
   - SSE recebe `?ticket=ABC123` em vez do JWT completo
   - Ticket e consumido na primeira conexao e invalidado
2. Remover `req.query.token` do `authMiddleware.js`
3. Alternativa menos disruptiva: cookie HttpOnly com SameSite=Strict para a rota SSE

---

### SEC-04. Tokens em localStorage Vulneraveis a XSS (P1)

**Problema:** `AuthContext.jsx` (linhas 20, 67-68, 111-112, 197-198) armazena `accessToken` e `refreshToken` em `localStorage`. Qualquer vulnerabilidade XSS (incluindo SVG malicioso, ver SEC-06) permite roubar tokens e personificar o usuario.

**Arquivos:** `frontend/src/contexts/AuthContext.jsx`, `frontend/src/App.jsx`, `frontend/src/components/Store/StorePage.jsx` (linha 24)

**Objetivo:** Migrar para cookies HttpOnly.

**Implementacao:**
1. Backend: na resposta de login/register, setar cookies:
   ```
   res.cookie('accessToken', token, { httpOnly: true, secure: true, sameSite: 'strict', maxAge: 7*24*60*60*1000 })
   res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: true, sameSite: 'strict', path: '/api/auth/refresh', maxAge: 30*24*60*60*1000 })
   ```
2. `authMiddleware.js`: ler de `req.cookies.accessToken` (instalar `cookie-parser`)
3. Frontend: remover todas as 42+ referencias a `localStorage.getItem('accessToken')` e `localStorage.setItem('accessToken', ...)`
4. Adicionar CSRF token (ver SEC-05)
5. Atualizar `StorePage.jsx` linha 24 que usa `localStorage.getItem('accessToken')` diretamente

---

### SEC-05. Ausencia de Protecao CSRF (P1)

**Problema:** CORS permite credentials (`credentials: true` em `server.js` linha 92), mas nenhum mecanismo CSRF e implementado. Apos migrar para cookies HttpOnly, endpoints state-changing ficam vulneraveis a CSRF.

**Objetivo:** Implementar protecao CSRF para todos os endpoints que alteram estado.

**Implementacao:**
1. Instalar `csurf` ou implementar Double Submit Cookie pattern
2. Endpoint `GET /api/csrf-token` retorna token no body + seta cookie `csrfToken`
3. Frontend envia token no header `X-CSRF-Token` em todas as requisicoes POST/PUT/DELETE
4. Backend valida match entre header e cookie
5. Excluir webhook do Stripe (`/api/stripe/webhook`) da validacao CSRF

---

### SEC-06. XSS via Upload de Avatar SVG (P1)

**Problema:** O filtro de upload em `server.js` (linhas 576-588) apenas verifica `file.mimetype.startsWith('image/')`. Um atacante pode fazer upload de um SVG contendo `<script>` tags. O mimetype e controlado pelo cliente e facilmente falsificavel. Nao ha validacao de magic bytes nem whitelist de extensoes.

**Arquivo:** `backend/server.js` linhas 576-588 (avatarUpload), linhas 1928-1939 (imageSearchUpload)

**Objetivo:** Bloquear formatos perigosos e validar conteudo real do arquivo.

**Implementacao:**
1. Whitelist de extensoes: `['.jpg', '.jpeg', '.png', '.webp', '.gif']` -- rejeitar `.svg`, `.html`
2. Validar magic bytes com `file-type` ou `sharp`: ler os primeiros bytes do buffer
3. Usar `sharp` (ja instalado) para re-processar a imagem: `sharp(buffer).jpeg().toBuffer()` -- elimina qualquer payload embutido
4. Aplicar mesma validacao no `imageSearchUpload` (linhas 1928-1939)
5. Verificar `Content-Type` retornado pelo banco ao servir avatares

---

### SEC-07. Avatares Base64 Armazenados no Banco (P1)

**Problema:** `server.js` linha 610 converte uploads para `data:${mimetype};base64,...` e armazena na coluna `avatar_url` do Supabase. Isso causa: DB bloat (2MB por avatar), queries lentas, impossibilidade de CDN/cache, uso excessivo de banda.

**Arquivo:** `backend/server.js` linhas 604-631

**Objetivo:** Migrar avatares para armazenamento externo (Supabase Storage ou S3/Cloudinary).

**Implementacao:**
1. Usar Supabase Storage (bucket `avatars`, politica publica para leitura)
2. Upload: `supabase.storage.from('avatars').upload(fileName, buffer, { contentType })`
3. Salvar URL publica no campo `avatar_url` em vez do base64
4. Script de migracao: iterar usuarios com `avatar_url LIKE 'data:%'`, re-upload para storage
5. Limite: manter 2MB max, usar `sharp` para redimensionar para 256x256

---

### SEC-08. Rate Limiting Ausente em Endpoints Criticos (P1)

**Problema:** Seis endpoints autenticados nao possuem rate limiting:
- `POST /api/evaluate-seller` (linha 851) -- sem auth, sem rate limit, lanca browser
- `PUT /api/user/profile` (linha 420)
- `PUT /api/user/email` (linha 453)
- `PUT /api/user/password` (linha 517)
- `POST /api/user/avatar` (linha 590)
- `DELETE /api/user/account` (linha 643)

Um atacante pode bombardear esses endpoints, causar brute-force em senhas, ou esgotar recursos do servidor lancando milhares de browsers via `/api/evaluate-seller`.

**Arquivo:** `backend/server.js`

**Objetivo:** Aplicar rate limiters granulares por endpoint.

**Implementacao:**
1. `evaluate-seller`: 5 req/min por IP (lanca browser = recurso caro)
2. `user/password`: 3 req/15min por usuario (prevenir brute-force)
3. `user/email`: 3 req/15min por usuario
4. `user/avatar`: 10 req/hora por usuario
5. `user/account` (delete): 3 req/hora por usuario
6. `user/profile`: 20 req/min por usuario
7. Considerar rate limit por `userId` (via `keyGenerator: req => req.user?.id`) alem de IP

---

### SEC-09. Ausencia Total de Audit Logging (P1)

**Problema:** Zero logging estruturado para acoes criticas: tentativas de login (sucesso/falha), alteracoes de senha, alteracoes de email, exclusao de conta, compras, consumo de creditos, acoes admin. Impossivel investigar incidentes de seguranca.

**Objetivo:** Implementar audit trail imutavel para todas as acoes sensiveis.

**Implementacao:**
1. Criar tabela `audit_log` no Supabase:
   ```sql
   CREATE TABLE audit_log (
     id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
     user_id uuid REFERENCES users(id),
     action text NOT NULL,
     details jsonb,
     ip_address text,
     user_agent text,
     created_at timestamptz DEFAULT now()
   );
   CREATE INDEX idx_audit_user ON audit_log(user_id);
   CREATE INDEX idx_audit_action ON audit_log(action);
   ```
2. Criar modulo `backend/auditLog.js` com funcao `logAction(userId, action, details, req)`
3. Acoes a rastrear: `LOGIN_SUCCESS`, `LOGIN_FAILURE`, `REGISTER`, `PASSWORD_CHANGE`, `EMAIL_CHANGE`, `AVATAR_CHANGE`, `ACCOUNT_DELETE`, `CREDIT_PURCHASE`, `SUBSCRIPTION_CHANGE`, `MINING_START`, `REFERRAL_CLAIM`, `ADMIN_ACTION`
4. Extrair IP de `req.ip` e User-Agent de `req.headers['user-agent']`

---

### SEC-10. Race Condition na Reivindicacao de Referral (P1)

**Problema:** `referrals.js` linhas 95-146 tem TOCTOU na funcao `applyReferralBenefits()`. Embora o codigo ja use `is('referral_used_at', null)` como guarda atomica (linhas 118, 139), a leitura de `credits` e `credits_package` (linhas 114-119) e feita separadamente do update (linhas 130-141). Se dois requests concorrentes lerem o mesmo saldo antes do update, ambos podem adicionar bonus credits.

**Arquivo:** `backend/referrals.js` linhas 95-195

**Objetivo:** Garantir atomicidade completa na operacao de referral.

**Implementacao:**
1. Usar funcao RPC do Supabase (stored procedure) para atomizar leitura + update de credits:
   ```sql
   CREATE FUNCTION claim_referral(p_user_id uuid, p_bonus int)
   RETURNS boolean AS $$
   UPDATE users SET
     credits = credits + p_bonus,
     credits_package = credits_package + p_bonus,
     referral_used_at = now(),
     bonus_credits_received = true
   WHERE id = p_user_id AND referral_used_at IS NULL
   RETURNING true;
   $$ LANGUAGE sql;
   ```
2. Chamar via `supabase.rpc('claim_referral', { p_user_id: userId, p_bonus: REFERRED_BONUS_CREDITS })`
3. Se retornar null/empty, referral ja foi reivindicado

---

### SEC-11. Race Condition no Consumo de Creditos (P1)

**Problema:** `miningLimits.js` linhas 149-206 usa optimistic locking (`eq('credits', currentCredits)`) com ate 3 retries. Porem, entre a leitura (linhas 157-161) e o update (linhas 179-185), o saldo pode mudar. O retry mitiga parcialmente, mas 3 retries podem nao ser suficientes sob alta concorrencia, e o usuario perde o credito sem obter resultado se todos falharem.

**Arquivo:** `backend/miningLimits.js` linhas 149-206

**Objetivo:** Atomizar o consumo de creditos no nivel do banco.

**Implementacao:**
1. Substituir por RPC atomico:
   ```sql
   CREATE FUNCTION consume_credits(p_user_id uuid, p_amount int)
   RETURNS int AS $$
   UPDATE users SET credits = credits - p_amount
   WHERE id = p_user_id AND credits >= p_amount
   RETURNING credits;
   $$ LANGUAGE sql;
   ```
2. Se retornar null, creditos insuficientes -- sem race condition possivel
3. Remover logica de retry do `consumeCredits()`
4. Aplicar mesma abordagem no `stripe.js` linhas 459-481 (adicao de credits por compra)

---

### SEC-12. Politica de Senha Fraca (P2)

**Problema:** `server.js` linhas 262-266 e 526-528 apenas verificam `password.length < 8`. Nao ha requisitos de complexidade, nem verificacao contra lista de senhas comuns.

**Arquivo:** `backend/server.js` linhas 262-266 (registro), linhas 526-528 (troca de senha)

**Objetivo:** Implementar politica de senha robusta.

**Implementacao:**
1. Criar `backend/passwordPolicy.js`:
   - Minimo 8 caracteres
   - Pelo menos 1 maiuscula, 1 minuscula, 1 numero
   - Nao pode ser igual ao email
   - Verificar contra lista de 10.000 senhas mais comuns (arquivo JSON estatico)
2. Retornar mensagem especifica: "Senha deve conter letra maiuscula, minuscula e numero"
3. Aplicar no registro, troca de senha e reset

---

### SEC-13. Sem Validacao de Variaveis de Ambiente na Inicializacao (P2)

**Problema:** O servidor pode iniciar em estado quebrado se variaveis de ambiente estiverem faltando. Apenas `JWT_SECRET` tem validacao (em `auth.js` linhas 14-17). `STRIPE_SECRET_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `CLIENT_URL` nao sao validadas.

**Objetivo:** Falhar rapidamente na inicializacao se configuracao estiver incompleta.

**Implementacao:**
1. Criar `backend/config.js`:
   ```js
   const REQUIRED_ENV = ['JWT_SECRET', 'SUPABASE_URL', 'SUPABASE_SERVICE_KEY', 'SUPABASE_ANON_KEY', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'CLIENT_URL'];
   for (const key of REQUIRED_ENV) {
     if (!process.env[key]) { console.error(`FATAL: ${key} not set`); process.exit(1); }
   }
   export const config = { jwtSecret: process.env.JWT_SECRET, ... };
   ```
2. Importar `config` em todos os modulos em vez de acessar `process.env` diretamente
3. Incluir validacao de formato (ex: `STRIPE_SECRET_KEY` deve comecar com `sk_`)

---

### SEC-14. Headers de Seguranca Ausentes (P2)

**Problema:** Nenhum header de seguranca e definido: sem `X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security`, `Content-Security-Policy`. Vulneravel a clickjacking, MIME sniffing, downgrade attacks.

**Objetivo:** Adicionar headers de seguranca padrao com Helmet.js.

**Implementacao:**
1. `npm install helmet`
2. Adicionar em `server.js` apos CORS: `app.use(helmet({ contentSecurityPolicy: false }))` -- CSP sera configurado depois
3. Configurar HSTS: `helmet.hsts({ maxAge: 31536000, includeSubDomains: true })`
4. `X-Frame-Options: DENY` (previne clickjacking)
5. `X-Content-Type-Options: nosniff`

---

### SEC-15. Exposicao de Detalhes Internos em Erros (P2)

**Problema:** `server.js` linha 126 retorna `Webhook Error: ${err.message}` que pode conter detalhes internos do Stripe. Linha 903 retorna `details: error.message` do scraper.

**Arquivos:** `backend/server.js` linhas 126, 903

**Objetivo:** Nunca expor mensagens de erro internas ao cliente.

**Implementacao:**
1. Webhook (linha 126): `res.status(400).json({ error: 'Webhook processing failed' })` -- manter log interno
2. Evaluate-seller (linha 903): remover `details: error.message`
3. Implementar middleware global de erro (ver ARQ-02)

---

### SEC-16. Sem Revogacao de Tokens Apos Troca de Senha (P2)

**Problema:** `server.js` linhas 517-567 -- apos trocar senha com sucesso, nenhuma sessao e invalidada. Tokens existentes continuam validos em todos os dispositivos.

**Objetivo:** Invalidar todas as sessoes ativas apos troca de senha.

**Implementacao:**
1. Apos update da senha (linha 555): `await supabase.from('sessions').delete().eq('user_id', userId)`
2. Retornar novos tokens na resposta para manter o dispositivo atual logado
3. Incrementar um campo `token_version` no usuario e incluir no JWT payload -- tokens com versao antiga sao rejeitados

---

### SEC-17. Endpoint de Enumeracao de Usuarios (P2)

**Problema:** `POST /api/auth/check-email-confirmed` (linha 370) aceita email como parametro sem autenticacao e sem rate limit. Pode ser usado para verificar se um email esta cadastrado na plataforma.

**Arquivo:** `backend/server.js` linhas 370-384, `backend/auth.js` linhas 190-236

**Objetivo:** Prevenir enumeracao de usuarios.

**Implementacao:**
1. Adicionar rate limit: 5 req/min por IP neste endpoint
2. Sempre retornar `{ confirmed: false }` se o email nao existir (em vez de `error: 'User not found'`)
3. Considerar substituir polling por WebSocket ou link de callback com token

---

### SEC-18. Validacao de Schema em Endpoints (P2)

**Problema:** Nenhum endpoint valida o formato/tipo dos dados de entrada. Campos como `email`, `password`, `url`, `packageId` sao verificados manualmente com `if (!field)` basico. Vulneravel a tipos inesperados e payloads maliciosos.

**Objetivo:** Validacao rigorosa de todos os inputs com Zod.

**Implementacao:**
1. `npm install zod`
2. Criar `backend/schemas/` com schemas por dominio:
   - `auth.schemas.js`: registerSchema, loginSchema
   - `user.schemas.js`: profileSchema, emailSchema, passwordSchema
   - `mining.schemas.js`: mineSchema, evaluateSchema
   - `stripe.schemas.js`: checkoutSchema, subscribeSchema
3. Middleware generico: `validateBody(schema)` que retorna 400 com erros formatados
4. Validar email com regex robusta (a atual `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` aceita `a@.c`)

---

### SEC-19. Sanitizacao de URLs para Prevencao de SSRF (P2)

**Problema:** URLs de scraping sao validadas apenas com `url.includes('goofish.com')` (linhas 859, 919). Um atacante pode enviar `http://malicious.com/goofish.com` ou `http://goofish.com@internal-server/`. O Playwright seguira redirecionamentos para enderecos internos.

**Objetivo:** Validar URLs estritamente para prevenir SSRF.

**Implementacao:**
1. Parsear URL com `new URL(url)`
2. Validar hostname: `['goofish.com', 'www.goofish.com', 'h5.m.goofish.com', 'xianyu.com'].includes(parsedUrl.hostname)`
3. Rejeitar protocolos nao-HTTP: `if (!['http:', 'https:'].includes(parsedUrl.protocol))`
4. Bloquear IPs privados: rejeitar 10.x, 172.16-31.x, 192.168.x, 127.x, ::1
5. Para Yupoo: whitelist de dominios `*.yupoo.com`

---

### SEC-20. Console.log com Dados Sensiveis no Frontend (P3)

**Problema:** 21 ocorrencias de `console.log` no frontend expoem: IDs de usuario, codigos de referral, dados de sessao, status de subscricao. Visiveis em DevTools de qualquer navegador.

**Arquivos:** `frontend/src/App.jsx` (12 ocorrencias), `frontend/src/hooks/useSavedProductsRealtime.js` (5), `frontend/src/components/Store/StorePage.jsx` (1), e outros.

**Objetivo:** Remover ou condicionar logs a ambiente de desenvolvimento.

**Implementacao:**
1. Criar `frontend/src/utils/logger.js`:
   ```js
   export const log = import.meta.env.DEV ? console.log.bind(console) : () => {};
   ```
2. Substituir todos os `console.log` por `log()`
3. Em producao, nenhum log visivel; em dev, comportamento preservado

---

### SEC-21. Referral Code Nao Validado na URL (P3)

**Problema:** `App.jsx` linhas 136-148 leem `?ref=` da URL, validam apenas `length === 7` e armazenam em `sessionStorage`. Nenhuma sanitizacao contra caracteres especiais ou XSS via parametro.

**Objetivo:** Validar e sanitizar codigo de referral antes de armazenar.

**Implementacao:**
1. Validar formato: `/^[A-Za-z0-9]{7}$/`
2. Rejeitar silenciosamente se nao bater o pattern
3. Nao logar o valor do codigo no console

---

## 2. Melhoria de Arquitetura e Performance (Eficiencia Maxima)

---

### ARQ-01. Modularizacao do server.js (P0)

**Problema:** `backend/server.js` acumula 2.103 linhas com 48+ rotas, logica de negocios, configuracao de middleware e inicializacao do servidor. Impossivel manter, testar ou revisar. Qualquer mudanca em uma rota arrisca quebrar outra.

**Arquivo:** `backend/server.js`

**Objetivo:** Separar em camadas routes/controllers/services.

**Implementacao:**
1. Estrutura de diretorios:
   ```
   backend/
     routes/
       auth.routes.js
       user.routes.js
       mining.routes.js
       stripe.routes.js
       referral.routes.js
       products.routes.js
       collections.routes.js
       yupoo.routes.js
     controllers/
       auth.controller.js
       user.controller.js
       mining.controller.js
       stripe.controller.js
     services/
       (manter modulos existentes: auth.js, miningLimits.js, stripe.js, etc.)
     middleware/
       auth.middleware.js (existente authMiddleware.js)
       rateLimiters.js
       errorHandler.js
       validateBody.js
     config/
       env.js (validacao de env vars)
       cors.js
       stripe.js (constantes de pacotes/planos)
   ```
2. `server.js` final: ~100 linhas (imports, middleware global, mount de routers, startup)
3. Migrar rota a rota, testando cada uma antes de prosseguir
4. Ordem sugerida: auth routes -> user routes -> mining routes -> stripe routes -> products/collections

---

### ARQ-02. Middleware Global de Tratamento de Erros (P0)

**Problema:** Cada rota tem seu proprio `try-catch` com `console.error` e `res.status(500).json()`. Inconsistencia nas respostas de erro. Alguns endpoints vazam `error.message` (SEC-15).

**Objetivo:** Centralizar tratamento de erros com respostas consistentes.

**Implementacao:**
1. Criar `backend/middleware/errorHandler.js`:
   ```js
   export function errorHandler(err, req, res, next) {
     const statusCode = err.statusCode || 500;
     const message = err.isOperational ? err.message : 'Erro interno do servidor';
     console.error(`[Error] ${req.method} ${req.path}:`, err);
     res.status(statusCode).json({ error: message, code: err.code || 'INTERNAL_ERROR' });
   }
   ```
2. Criar classe `AppError extends Error` com `statusCode` e `isOperational`
3. Registrar como ultimo middleware: `app.use(errorHandler)`
4. Nas rotas, usar `next(err)` em vez de `res.status(500).json()`

---

### ARQ-03. Migracao para React Router (P0)

**Problema:** `App.jsx` usa "Virtual Paging" (`activePage` state, linhas 82) com renderizacao condicional de 8+ paginas em um unico componente. Isso causa: sem URLs reais (impossivel compartilhar link para /profile), botao "Voltar" do navegador nao funciona, SEO zero, todo o estado vive em App.jsx.

**Arquivo:** `frontend/src/App.jsx` linhas 82, 1097-1297, `frontend/src/main.jsx`

**Objetivo:** Implementar rotas reais com `react-router-dom`.

**Implementacao:**
1. `npm install react-router-dom`
2. Definir rotas em `main.jsx`:
   ```
   /                    -> HomePage
   /mining              -> MiningPage (HeroSection + ProductGrid)
   /yupoo               -> YupooSearchPage
   /saved               -> SavedPage
   /profile             -> ProfilePage
   /store               -> StorePage
   /calculator          -> FeeCalculatorPage
   /declaration         -> DeclarationAssistantPage
   /legal               -> LegalPage
   /login               -> LoginPage
   /register            -> RegisterPage
   ```
3. Criar `<ProtectedRoute>` wrapper que redireciona para `/login` se nao autenticado
4. Substituir `setActivePage('xxx')` por `useNavigate()('/xxx')` (Sidebar, HeroHome, etc.)
5. Mover estado compartilhado (savedProducts, collections, miningInfo) para Zustand (ver ARQ-04)

---

### ARQ-04. Centralizacao de Estado Global (P0)

**Problema:** `App.jsx` contem 25+ estados (`useState`) controlando: produtos, filtros, creditos, colecoes, vendedores, sessao de mineracao, feedback de pagamento. Todo o app re-renderiza quando qualquer estado muda. Impossivel de manter.

**Arquivo:** `frontend/src/App.jsx` linhas 37-87

**Objetivo:** Migrar para Zustand com stores separadas por dominio.

**Implementacao:**
1. `npm install zustand`
2. Criar stores em `frontend/src/stores/`:
   - `useMiningStore.js`: products, sellerInfo, filters, miningStage, miningInfo, loading, error
   - `useProductsStore.js`: savedProducts, savedProductUrls, collections, collectionIcons/colors
   - `useUserStore.js`: miningInfo (credits), paymentFeedback, exchangeRate
   - `useUIStore.js`: showBackToTop, showLimitError, activePage (temporario, removido com React Router)
3. Cada store com actions (ex: `fetchMiningStatus`, `handleSaveProduct`)
4. Componentes consomem apenas o slice que precisam: `const credits = useMiningStore(s => s.credits)`

---

### ARQ-05. Decomposicao do App.jsx (P1)

**Problema:** `App.jsx` com 1.369 linhas e um componente monolitico. Contem logica de: sessao de mineracao, persistencia localStorage, callback handlers, realtime subscriptions, filtros, e todo o layout.

**Objetivo:** Reduzir App.jsx para ~100 linhas (layout shell + router).

**Implementacao:**
1. Extrair logica de mineracao para `MiningPage.jsx` (linhas 350-500, 800-1050)
2. Extrair logica de produtos salvos para hook `useSavedProducts.js` (linhas 487-600)
3. Extrair logica de sessao para hook `useMiningSession.js` (linhas 150-220)
4. Mover handlers de colecao para store Zustand
5. App.jsx final: `<Layout><Sidebar /><Outlet /></Layout>`

---

### ARQ-06. Code Splitting e Lazy Loading (P1)

**Problema:** Bundle principal de 827 KB (234 KB gzipped). Todas as paginas carregadas no bundle inicial, incluindo `DeclarationAssistantPage`, `FeeCalculatorPage`, `YupooSearchPage` que muitos usuarios nunca acessam.

**Objetivo:** Reduzir bundle inicial para <200 KB gzipped via code splitting.

**Implementacao:**
1. Usar `React.lazy()` para paginas nao-criticas:
   ```js
   const YupooSearchPage = lazy(() => import('./components/YupooSearch/YupooSearchPage'));
   const DeclarationAssistantPage = lazy(() => import('./components/DeclarationAssistant/DeclarationAssistantPage'));
   const FeeCalculatorPage = lazy(() => import('./components/FeeCalculator/FeeCalculatorPage'));
   const StorePage = lazy(() => import('./components/Store/StorePage'));
   const ProfilePage = lazy(() => import('./components/Profile/ProfilePage'));
   ```
2. Envolver com `<Suspense fallback={<WifiLoader />}>` (WifiLoader ja existe)
3. Configurar Vite manual chunks em `vite.config.js`:
   ```js
   build: { rollupOptions: { output: { manualChunks: { vendor: ['react', 'react-dom', 'framer-motion'] } } } }
   ```
4. Meta: bundle inicial < 150 KB gzipped

---

### ARQ-07. Normalizacao Centralizada de Tiers (P1)

**Problema:** Logica de normalizacao de nomes de tier ("minerador"/"gold"/"ouro") duplicada em:
- `App.jsx` linhas 103-109
- `StorePage.jsx` linhas 32-41
- `tiers.js` linhas 57-77 (`getTierByName`)

Diferentes arquivos usam diferentes nomes de retorno ('ouro' vs 'gold').

**Arquivos:** `frontend/src/App.jsx`, `frontend/src/components/Store/StorePage.jsx`, `backend/tiers.js`

**Objetivo:** Unica fonte de verdade para nomes de tier.

**Implementacao:**
1. Backend: `tiers.js` ja tem `getTierByName()` -- padronizar retorno para nomes em ingles ('guest', 'bronze', 'silver', 'gold')
2. Frontend: criar `frontend/src/utils/tierUtils.js` que importa constantes compartilhadas
3. Remover logica de normalizacao duplicada de `App.jsx` e `StorePage.jsx`
4. Garantir que o banco armazena tiers em formato canonico ('guest', 'bronze', 'silver', 'gold')

---

### ARQ-08. Otimizacao de Browser Pool (P1)

**Problema:** `browserPool.js` tem fila ilimitada (`this.waiting = []`, linha 23) sem limite maximo. Sob carga, centenas de requests podem acumular na fila consumindo memoria. Timeout de 30s por request na fila (linha 154) nao limita o tamanho total.

**Arquivo:** `backend/browserPool.js`

**Objetivo:** Limitar fila, adicionar metricas, prevenir esgotamento de recursos.

**Implementacao:**
1. Adicionar `MAX_QUEUE_SIZE = 20` -- retornar 503 se fila cheia
2. Adicionar health check periodico: verificar se browsers estao responsivos
3. Implementar per-tier concurrency: Gold pode usar 2 browsers simultaneamente, outros 1
4. Adicionar metricas: tempo medio de espera na fila, taxa de reciclagem
5. Separar `evaluate-seller` (linha 877) para usar o pool em vez de criar browser avulso
6. O endpoint `evaluate-seller` (linhas 877-892) atualmente cria `chromium.launch()` fora do pool -- migrar para `browserPool.acquire()`

---

### ARQ-09. Memoizacao de Componentes React (P2)

**Problema:** Nenhum componente usa `React.memo()`. `App.jsx` tem useMemo/useCallback para alguns valores, mas componentes filhos como `ProductGrid`, `SellerCard`, `SearchFilters` re-renderizam em qualquer mudanca de estado do pai.

**Objetivo:** Otimizar renderizacao com memoizacao estrategica.

**Implementacao:**
1. Aplicar `React.memo()` em componentes puros: `ProductGrid`, `SellerCard`, `SavedProductCard`, `CreditPackageCard`, `SearchFilters`
2. Garantir que props passadas sao estaveis (usar `useCallback` para handlers)
3. Usar React DevTools Profiler para medir impacto
4. Nao aplicar em componentes que ja recebem props dinamicas constantes

---

### ARQ-10. Pipeline CI/CD (P1)

**Problema:** Nenhuma automacao: sem GitHub Actions, sem linting automatizado, sem testes automatizados, sem deploy automatizado. Erros de build existentes (CSS `var(--color/30)` e `LuLoader2` import faltante) nao sao detectados antes do push.

**Objetivo:** Implementar pipeline CI/CD completa.

**Implementacao:**
1. Criar `.github/workflows/ci.yml`:
   - Trigger: push e PR em `main`
   - Steps: checkout -> setup-node -> install -> lint -> build -> test
2. Instalar e configurar ESLint + Prettier:
   - `npx eslint --init` para backend e frontend
   - `.prettierrc` com configuracao consistente
3. Criar `.github/workflows/deploy.yml` para deploy automatico (Railway/Render/Vercel)
4. Adicionar badge de status no README

---

### ARQ-11. Containerizacao com Docker (P2)

**Problema:** Sem Docker, desenvolvedores precisam instalar Node, Playwright browsers, e configurar env vars manualmente. Playwright requer dependencias de sistema operacional que variam entre maquinas.

**Objetivo:** Docker para desenvolvimento e producao consistentes.

**Implementacao:**
1. `backend/Dockerfile`:
   ```dockerfile
   FROM mcr.microsoft.com/playwright:v1.40.0-focal
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci --production
   COPY . .
   CMD ["node", "server.js"]
   ```
2. `frontend/Dockerfile` (multi-stage: build com Node, serve com nginx)
3. `docker-compose.yml` com services: backend, frontend, redis (para filas futuras)
4. `.dockerignore` com `node_modules`, `.env`, `.git`

---

### ARQ-12. Logging de Requisicoes HTTP (P2)

**Problema:** Nenhum log estruturado de requisicoes HTTP. Impossivel rastrear latencia, status codes, ou padroes de uso.

**Objetivo:** Adicionar request logging com morgan.

**Implementacao:**
1. `npm install morgan`
2. `app.use(morgan('combined'))` em producao, `morgan('dev')` em desenvolvimento
3. Considerar pino/winston para logging estruturado (JSON) em producao
4. Integrar com servico externo (Datadog, Papertrail) para alertas

---

### ARQ-13. Monitoramento e Observabilidade (P2)

**Problema:** Sem health checks (alem do basico em `/api/health` linha 1249), sem metricas, sem error tracking. Impossivel saber quando o sistema esta degradado.

**Objetivo:** Implementar observabilidade basica.

**Implementacao:**
1. Expandir `/api/health` para incluir: status do DB, status do browser pool, memoria usada, uptime
2. Integrar Sentry para error tracking: `npm install @sentry/node`
3. Criar endpoint `/api/metrics` com: total de mineracoes, tempo medio de resposta, erros por tipo
4. Configurar alertas: erro rate > 5%, latencia > 10s, memoria > 80%

---

### ARQ-14. Acessibilidade (WCAG) (P3)

**Problema:** Zero ARIA labels, sem navegacao por teclado, sem suporte a leitores de tela. Botoes usam apenas icones sem texto acessivel.

**Objetivo:** Atingir conformidade WCAG 2.1 nivel AA.

**Implementacao:**
1. Adicionar `aria-label` em todos os botoes com icone
2. Garantir contraste de cores (texto branco em backgrounds escuros - verificar)
3. Adicionar `role="navigation"` no Sidebar
4. Garantir que todos os formularios tem labels associados
5. Testar com leitor de tela (NVDA/VoiceOver)
6. Adicionar skip-to-content link

---

### ARQ-15. Remocao/Integracao do Diretorio yupoo-scrap (P3)

**Problema:** Diretorio `/yupoo-scrap/` contem um scraper Yupoo separado com seu proprio `server.js` (5.477 linhas), `scraper.js`, `filter.js` e `node_modules`. Codigo duplicado e desconectado do backend principal. Contem `test_price.js` e `test_price_v2.js` que parecem scripts de desenvolvimento abandonados.

**Objetivo:** Consolidar funcionalidade de Yupoo no backend principal ou remover.

**Implementacao:**
1. Auditar funcionalidades de `yupoo-scrap/` vs `backend/imageSearch.js`
2. Migrar qualquer logica util para `backend/`
3. Remover diretorio `yupoo-scrap/` e referencias
4. Atualizar `.gitignore` se necessario

---

## 3. Prevencao de Erros Logicos (Estabilidade Operacional)

---

### LOG-01. Restauracao de Sessao sem Tratamento de Erro (P0)

**Problema:** `App.jsx` linhas 152-184 fazem `JSON.parse(savedSession)` em dados do localStorage. Embora haja um try-catch externo, se os dados estiverem parcialmente corrompidos (ex: `products` e um array com objetos invalidos), os `setProducts(session.products)` podem colocar o app em estado inconsistente sem crash visivel.

**Arquivo:** `frontend/src/App.jsx` linhas 150-184

**Objetivo:** Validar dados restaurados antes de aplicar ao estado.

**Implementacao:**
1. Validar schema dos dados restaurados:
   ```js
   const isValidSession = (s) => s && typeof s === 'object' && Array.isArray(s.products) && typeof s.timestamp === 'number';
   ```
2. Validar cada produto: `p.name && (p.price !== undefined) && p.imageUrl`
3. Se invalido, limpar localStorage e iniciar limpo
4. Adicionar versao ao schema da sessao para migracao futura

---

### LOG-02. Idempotencia de Webhooks Stripe (P0)

**Problema:** Nenhuma verificacao de idempotencia no processamento de webhooks (`stripe.js` linhas 405-431). Se o Stripe reenviar um evento (retry por timeout), o sistema processara novamente: creditando duplicado, ativando subscription duplicada.

**Arquivo:** `backend/stripe.js` linhas 405-431

**Objetivo:** Garantir que cada evento e processado exatamente uma vez.

**Implementacao:**
1. Criar tabela `processed_stripe_events`:
   ```sql
   CREATE TABLE processed_stripe_events (
     event_id text PRIMARY KEY,
     event_type text,
     processed_at timestamptz DEFAULT now()
   );
   ```
2. No inicio de `handleWebhookEvent()`:
   ```js
   const { data: existing } = await supabase.from('processed_stripe_events').select('event_id').eq('event_id', event.id).single();
   if (existing) { console.log(`[Stripe] Event ${event.id} already processed, skipping`); return; }
   await supabase.from('processed_stripe_events').insert({ event_id: event.id, event_type: event.type });
   ```
3. Adicionar TTL: limpar eventos com mais de 30 dias periodicamente

---

### LOG-03. Consumo de Credito Antes do Resultado (P1)

**Problema:** `server.js` linha 1011 consome o credito (`consumeCredit(userId)`) apos o scraping terminar com sucesso. Porem, se a traducao falhar (linha 1004) ou o envio SSE falhar, o credito ja esta na fila de consumo. Alem disso, se o scraping retornar 0 produtos, o credito e consumido mesmo assim.

**Arquivo:** `backend/server.js` linhas 990-1050

**Objetivo:** Consumir credito apenas se o usuario receber valor.

**Implementacao:**
1. Verificar `result.products.length > 0` antes de consumir credito
2. Mover `consumeCredit()` para apos `sendEvent('complete', ...)` confirmar envio
3. Se traducao falhar, entregar produtos sem traducao (fallback) em vez de perder credito
4. Implementar compensacao: se SSE falhar apos consumo, creditar de volta

---

### LOG-04. Browser Pool: Fila Ilimitada e DoS (P1)

**Problema:** `browserPool.js` linha 23: `this.waiting = []` sem limite. Se 1000 requests chegarem simultaneamente, 997 ficam na fila consumindo memoria de closures e Promises pendentes. Cada Promise mantem referencia ao `resolve`/`reject` e ao timeout de 30s.

**Arquivo:** `backend/browserPool.js` linhas 150-171

**Objetivo:** Limitar fila e retornar 503 quando sobrecarregado.

**Implementacao:**
1. Adicionar constante `MAX_QUEUE_SIZE = 20`
2. No metodo `acquire()`, verificar antes de enfileirar:
   ```js
   if (this.waiting.length >= MAX_QUEUE_SIZE) {
     throw new Error('Service temporarily overloaded');
   }
   ```
3. No handler SSE (`server.js`), capturar esse erro e retornar `503 Service Unavailable`
4. Expor metricas da fila no `/api/health`

---

### LOG-05. Sem Timeout em Loop de Extracao de Produtos (P1)

**Problema:** O scraper (`scraper.js`) itera sobre cards DOM sem timeout por card. Se o DOM estiver malformado ou um seletor ficar em loop, o scraping pode travar indefinidamente, segurando um browser do pool.

**Arquivo:** `backend/scraper.js`

**Objetivo:** Adicionar timeouts em cada operacao de extracao.

**Implementacao:**
1. Timeout global de mineracao: 5 minutos maximo
2. Timeout por card: 5 segundos -- `Promise.race([extractCard(card), timeout(5000)])`
3. Se timeout por card, pular o card e continuar com os demais
4. Reportar cards pulados no resultado final
5. No `server.js`, implementar `AbortController` para cancelar scraping se cliente desconectar

---

### LOG-06. Deteccao e Tratamento de Captcha (P1)

**Problema:** Se o Goofish apresentar captcha, o scraper trava tentando achar seletores que nao existem. Nao ha deteccao proativa de captcha nem fallback.

**Objetivo:** Detectar captcha e reagir rapidamente.

**Implementacao:**
1. Apos navegacao, verificar presenca de seletores de captcha: `#nc_1_wrapper`, `.nc-lang-cnt`, `#captcha_container`
2. Se detectado: tentar rotacionar browser (reciclar com novo user-agent)
3. Se persistir: reportar ao usuario via SSE: `sendEvent('error', { code: 'CAPTCHA', message: 'Captcha detectado' })`
4. Nao consumir credito se captcha bloquear
5. Log para analytics: taxa de captchas por hora

---

### LOG-07. Cache de Traducao para Termos Comuns (P2)

**Problema:** `translator.js` traduz cada produto individualmente via Google Translate. Termos como "iPhone 15 Pro Max 256GB" sao traduzidos repetidamente. Custo de API e latencia desnecessarios.

**Arquivo:** `backend/translator.js`

**Objetivo:** Cache de traducoes para reduzir chamadas externas.

**Implementacao:**
1. Implementar `Map` ou Redis cache para traducoes:
   ```js
   const translationCache = new Map(); // key: texto_original, value: traducao
   ```
2. Antes de traduzir, verificar cache
3. Termos tecnicos que nao precisam traducao: modelos de celular, marcas, tamanhos
4. TTL do cache: 7 dias
5. Limite de tamanho: 10.000 entradas (LRU eviction)

---

### LOG-08. Auto-Referral Nao Totalmente Bloqueado (P2)

**Problema:** `referrals.js` linha 40-42 verifica `userId && referrer.id === userId`, mas o `userId` so esta disponivel se o usuario ja estiver autenticado. Durante o registro (`auth.js`), o userId ainda nao existe quando o `refCode` e validado (linha 66-81). Um usuario pode se registrar com seu proprio ref code futuro se manipular o timing.

**Arquivos:** `backend/referrals.js` linhas 39-42, `backend/auth.js` linhas 63-81

**Objetivo:** Bloquear auto-referral de forma robusta.

**Implementacao:**
1. Apos registro, verificar: `if (user.referred_by_id === user.id)` e limpar referral
2. Adicionar constraint no banco: `CHECK (referred_by_id != id)` na tabela users
3. No `storeRefCodeForUser` (linha 204), garantir que a verificacao e obrigatoria

---

### LOG-09. Validacao de Email Fraca (P2)

**Problema:** Regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` (em `server.js` linha 462) aceita emails invalidos como `a@.c`, `test@-example.com`, `user@.com.`.

**Objetivo:** Usar validacao de email robusta.

**Implementacao:**
1. Usar Zod: `z.string().email()` (schema validation, ver SEC-18)
2. Ou regex mais rigorosa: `^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`
3. Considerar verificacao de MX record para dominios suspeitos (opcao avancada)

---

### LOG-10. Polling de Email sem Cleanup (P2)

**Problema:** `AuthContext.jsx` linhas 124-151 define `checkEmailConfirmation` mas nao mostra o polling timer. Se o componente que chama `checkEmailConfirmation` em loop (via `setInterval`) desmontar antes de limpar o timer, o polling continua indefinidamente -- memory leak e requests desnecessarios.

**Objetivo:** Garantir cleanup do polling ao desmontar componente.

**Implementacao:**
1. Implementar o polling dentro de um `useEffect` com cleanup:
   ```js
   useEffect(() => {
     if (!pendingEmailConfirmation) return;
     const interval = setInterval(() => checkEmailConfirmation(email), 5000);
     return () => clearInterval(interval);
   }, [pendingEmailConfirmation]);
   ```
2. Limite maximo de polling: 5 minutos -- apos isso, parar e pedir ao usuario para recarregar

---

### LOG-11. React Error Boundaries Ausentes (P2)

**Problema:** Nenhum `ErrorBoundary` implementado. Se qualquer componente filho lancar erro em render (ex: `undefined.map()`), o app inteiro crasha com tela branca.

**Objetivo:** Conter erros em boundaries e mostrar fallback gracioso.

**Implementacao:**
1. Criar `frontend/src/components/ErrorBoundary.jsx`:
   ```jsx
   class ErrorBoundary extends React.Component {
     state = { hasError: false, error: null };
     static getDerivedStateFromError(error) { return { hasError: true, error }; }
     componentDidCatch(error, info) { /* log para Sentry */ }
     render() { return this.state.hasError ? <FallbackUI /> : this.props.children; }
   }
   ```
2. Envolver cada rota/pagina em seu proprio boundary
3. Boundary global no `main.jsx` como ultima linha de defesa
4. `FallbackUI`: botao "Recarregar pagina" + mensagem amigavel

---

### LOG-12. Limites de Produtos Hardcoded no Frontend (P2)

**Problema:** `maxProducts: 30` hardcoded em `App.jsx` linha 74 (`miningInfo` initial state). O backend tem os limites corretos em `TIER_MINING_MAX_PRODUCTS` mas o frontend usa valor fixo ate carregar do servidor.

**Objetivo:** Frontend sempre usar limites do servidor.

**Implementacao:**
1. Criar endpoint `GET /api/config/limits` que retorna limites por tier
2. Frontend carrega limites na inicializacao e armazena no store
3. Remover constantes hardcoded do frontend
4. Valores default apenas para loading state, nunca para logica de negocio

---

### LOG-13. Race Condition em Save Product Toggle (P2)

**Problema:** `App.jsx` usa `savedProductUrls` (estado local) sincronizado com updates realtime do Supabase (`useSavedProductsRealtime.js`). Se o usuario clicar rapidamente em salvar/remover, o estado local e o realtime podem dessincronizar.

**Objetivo:** Usar estado otimista com reconciliacao.

**Implementacao:**
1. Implementar optimistic UI: atualizar estado imediatamente, reverter se API falhar
2. Debounce em cliques rapidos: ignorar cliques enquanto request anterior estiver em voo
3. Usar `useTransition` do React 18 para priorizar atualizacoes de UI

---

## 4. Novas Funcoes (Expansao de Ecossistema)

---

### FEAT-01. Sistema de Notificacoes In-App (P1)

**Problema:** Nenhum sistema de notificacao. Usuarios nao sabem quando: mineracao completa (se sairem da tela), creditos baixos, preco cair em produto salvo, nova feature disponivel.

**Objetivo:** Centro de notificacoes persistente com push browser.

**Implementacao:**
1. Tabela `notifications`:
   ```sql
   CREATE TABLE notifications (
     id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
     user_id uuid REFERENCES users(id),
     type text NOT NULL, -- 'mining_complete', 'credits_low', 'price_drop', 'system'
     title text,
     message text,
     data jsonb,
     read boolean DEFAULT false,
     created_at timestamptz DEFAULT now()
   );
   ```
2. Componente `NotificationBell` no header com badge de contagem
3. Dropdown com lista de notificacoes
4. Web Push API para notificacoes mesmo com app fechado (requer service worker)
5. Criar notificacoes automaticas: creditos < 3, mineracao concluida, nova feature

---

### FEAT-02. Price Drop Alerts (Rastreador de Precos) (P1)

**Problema:** Usuarios salvam produtos mas nao tem como saber se o preco mudou. Precisam verificar manualmente cada produto.

**Objetivo:** Monitoramento automatico de precos com alertas.

**Implementacao:**
1. Tabela `price_history`:
   ```sql
   CREATE TABLE price_history (
     id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
     product_url text,
     price decimal,
     checked_at timestamptz DEFAULT now()
   );
   ```
2. Cron job (ou BullMQ worker com `ioredis` ja instalado): a cada 6 horas, verificar precos dos produtos salvos dos usuarios Gold/Silver
3. Se preco cair > 10%, criar notificacao
4. Dashboard de historico de precos por produto (grafico sparkline)
5. Restricao por tier: Gold = verificacao a cada 6h, Silver = diaria, Bronze = nenhuma

---

### FEAT-03. Dashboard de Rentabilidade (P1)

**Problema:** Usuarios precisam calcular manualmente a margem de lucro: preco Xianyu -> conversao CNY/BRL -> custos de frete/importacao -> preco de venda.

**Objetivo:** Calculadora automatica de rentabilidade integrada a cada produto.

**Implementacao:**
1. Componente `ProfitCalculator` recebe: preco CNY, taxa de cambio, custos fixos
2. Campos configuráveis: taxa de frete (por kg), imposto de importacao, margem desejada
3. Output: preco minimo de venda, margem %, ROI estimado
4. Integrar com `FeeCalculatorPage` existente (reutilizar logica)
5. Permitir salvar configuracoes de custo por usuario

---

### FEAT-04. Exportacao em Massa para Agentes de Compra (P1)

**Problema:** Usuarios copiam manualmente links de produtos para colar em agentes como Sugargoo, Superbuy, AllChinaBuy.

**Objetivo:** Exportacao one-click de colecoes inteiras.

**Implementacao:**
1. Botao "Exportar" na pagina de colecoes
2. Formatos: CSV (link, titulo, preco, vendedor), JSON, clipboard (links separados por newline)
3. Formato especifico para agentes populares (URL com parametros corretos)
4. Disponivel para todos os tiers (limitado a 10 produtos para Bronze, ilimitado para Gold)

---

### FEAT-05. Autenticacao Multi-Fator (MFA/2FA) (P2)

**Problema:** Contas com dados de pagamento e creditos monetarios protegidas apenas por senha.

**Objetivo:** 2FA opcional com TOTP (Google Authenticator, Authy).

**Implementacao:**
1. Usar Supabase Auth MFA (se suportado) ou implementar com `otpauth`
2. Tabela `user_mfa`: `user_id, totp_secret, enabled, backup_codes`
3. Fluxo: Configuracoes -> Ativar 2FA -> QR Code -> Confirmar com 6 digitos
4. Login com 2FA: email+senha -> codigo 2FA
5. Backup codes: 10 codigos de uso unico para recuperacao

---

### FEAT-06. Exportacao de Dados do Usuario (LGPD) (P2)

**Problema:** A Lei Geral de Protecao de Dados (LGPD) exige que usuarios possam exportar todos os seus dados pessoais. Nao ha funcionalidade para isso.

**Objetivo:** Exportacao completa de dados pessoais em formato legivel.

**Implementacao:**
1. Endpoint `GET /api/user/export-data` (autenticado, rate limit: 1 req/dia)
2. Coletar de todas as tabelas: users, saved_products, saved_sellers, collections, purchase_history, referral_history, audit_log
3. Formato: JSON estruturado com download como arquivo
4. Email de confirmacao apos solicitacao (com link de download temporario de 24h)
5. Incluir na pagina de Perfil: "Baixar meus dados"

---

### FEAT-07. Historico de Atividade da Conta (P2)

**Problema:** Usuarios nao tem visibilidade sobre logins, dispositivos, ou atividades em sua conta.

**Objetivo:** Pagina de atividade recente na area de perfil.

**Implementacao:**
1. Usar tabela `audit_log` (criada em SEC-09)
2. Filtrar por `user_id` com acoes: LOGIN, PASSWORD_CHANGE, MINING, PURCHASE
3. Mostrar: data/hora, IP (parcialmente mascarado), tipo de acao
4. Secao "Sessoes ativas" com botao "Encerrar todas as outras sessoes"

---

### FEAT-08. Fila de Mineracao em Background (P2)

**Problema:** Mineracao atual e sincrona via SSE -- usuario precisa manter a pagina aberta. Se fechar o navegador, perde o progresso.

**Objetivo:** Sistema de filas assincrono com status persistente.

**Implementacao:**
1. Utilizar BullMQ + IORedis (ja nas dependencias do `package.json`)
2. Endpoint `POST /api/mining/queue` adiciona job na fila com `userId`, `url`, `limit`
3. Endpoint `GET /api/mining/status/:jobId` retorna progresso
4. Worker em processo separado: `backend/workers/miningWorker.js`
5. Ao completar, salvar resultado em tabela `mining_results` e notificar usuario
6. Limite por tier: 1 job na fila para Bronze, 3 para Silver, 10 para Gold

---

### FEAT-09. Ferramenta de Comparacao de Produtos (P2)

**Problema:** Usuarios salvam multiplos produtos similares mas nao conseguem comparar lado a lado (preco, vendedor, confiabilidade).

**Objetivo:** Comparacao visual side-by-side de ate 4 produtos.

**Implementacao:**
1. Componente `ProductComparison` com layout em colunas
2. Selecao de produtos: checkbox nos cards de produtos salvos -> botao "Comparar (N)"
3. Campos comparados: imagem, titulo, preco CNY, preco BRL estimado, vendedor, trust score
4. Destacar melhor opcao em cada campo (menor preco, maior trust score)

---

### FEAT-10. PWA (Progressive Web App) (P2)

**Problema:** Muitos usuarios brasileiros acessam pelo celular. Sem PWA, nao ha: instalacao na home screen, funcionamento offline basico, push notifications.

**Objetivo:** Transformar frontend em PWA instalavel.

**Implementacao:**
1. Criar `public/manifest.json` com nome, icones, cores, display: standalone
2. Criar service worker basico com Vite PWA plugin: `vite-plugin-pwa`
3. Cachear assets estaticos para carregamento rapido
4. Splash screen customizada
5. Push notifications integradas com FEAT-01

---

### FEAT-11. Painel Administrativo (P2)

**Problema:** Nenhuma interface administrativa. Gerenciamento de usuarios, visualizacao de metricas, resolucao de disputas requer acesso direto ao banco.

**Objetivo:** Dashboard admin protegido.

**Implementacao:**
1. Rota `/admin` protegida por middleware `isAdmin` (verificar campo `is_admin` no user)
2. Paginas: usuarios (lista, busca, editar tier, ban), metricas (mineracoes/dia, receita), logs (audit_log)
3. Acoes: creditar usuario, alterar tier, ver historico de compras
4. Protecao extra: 2FA obrigatorio para admin, IP whitelist opcional

---

### FEAT-12. Historico de Confiabilidade de Vendedores (P3)

**Problema:** Trust score e calculado uma vez e cacheado. Nao ha historico de como a confiabilidade do vendedor evoluiu ao longo do tempo.

**Objetivo:** Rastrear scores de vendedores ao longo do tempo.

**Implementacao:**
1. Tabela `seller_trust_history`: `seller_id, trust_score, metrics jsonb, checked_at`
2. Ao avaliar vendedor, salvar snapshot no historico
3. Grafico de evolucao de trust score na pagina do vendedor
4. Flag se score caiu significativamente (alerta ao usuario)

---

### FEAT-13. Colecoes Compartilhadas (P3)

**Problema:** Usuarios nao podem compartilhar suas colecoes de produtos com outros usuarios ou publicamente.

**Objetivo:** Links de compartilhamento de colecoes.

**Implementacao:**
1. Campo `is_public` e `share_token` na tabela `collections`
2. Endpoint `GET /api/collections/shared/:token` (sem auth) retorna colecao e produtos
3. Pagina publica `/shared/:token` com layout read-only
4. Botao "Compartilhar" gera link e copia para clipboard
5. Opcao de desativar compartilhamento

---

### FEAT-14. AI Visual Comparison (Comparacao Visual por IA) (P3)

**Problema:** Usuarios querem comparar fotos do vendedor com fotos reais de QC (Quality Control) para verificar se o produto e fidedigno.

**Objetivo:** Comparacao visual automatizada usando analise de imagem.

**Implementacao:**
1. Integrar API de similaridade visual (ex: Google Vision, ou modelo proprio)
2. Upload de foto de QC + URL do produto -> score de similaridade
3. Destacar diferencas detectadas
4. Disponivel apenas para tier Gold

---

### FEAT-15. Dashboard de Uso de API/Creditos (P3)

**Problema:** Usuarios nao tem visibilidade sobre seu consumo de creditos ao longo do tempo nem sobre quando os creditos renovam.

**Objetivo:** Visualizacao detalhada de uso de creditos.

**Implementacao:**
1. Componente `CreditUsageDashboard` na pagina da loja
2. Grafico de consumo diario/semanal
3. Barra de progresso ate proxima renovacao (ja temos `nextRenewal` no backend)
4. Previsao: "No ritmo atual, seus creditos acabam em X dias"
5. Historico de transacoes: mineracao (-1), compra (+50), referral (+10)

---

### FEAT-16. Webhook Notifications para Usuarios (P3)

**Problema:** Usuarios avancados (agentes de compra) querem integrar eventos da plataforma com seus sistemas.

**Objetivo:** Configuracao de webhooks pessoais para eventos.

**Implementacao:**
1. Tabela `user_webhooks`: `user_id, url, events[], secret, active`
2. Pagina de configuracao no perfil
3. Eventos disponiveis: `mining.complete`, `price.drop`, `credits.low`
4. Envio com HMAC signature para verificacao
5. Disponivel apenas para tier Gold

---

## Cronograma de Execucao Revisado

| Fase | Foco Principal | Itens | Duracao | Pre-requisitos |
|------|---------------|-------|---------|----------------|
| **Fase 0 (Emergencial)** | Seguranca critica | SEC-01, SEC-02, SEC-03 | 1-2 dias | Acesso a paineis Stripe/Supabase |
| **Fase 1** | Fundacao de seguranca | SEC-04 a SEC-09, SEC-13, SEC-14 | 7-10 dias | Fase 0 concluida |
| **Fase 2** | Arquitetura core | ARQ-01, ARQ-02, ARQ-03, ARQ-04, ARQ-05 | 15-20 dias | -- (pode paralizar com Fase 1) |
| **Fase 3** | Estabilidade logica | LOG-01, LOG-02, LOG-03, LOG-04, LOG-05, LOG-06 | 7-10 dias | ARQ-01 concluida |
| **Fase 4** | Seguranca complementar | SEC-10 a SEC-21 | 5-7 dias | Fase 1 concluida |
| **Fase 5** | Performance e DX | ARQ-06 a ARQ-12, LOG-07 a LOG-13 | 10-15 dias | Fase 2 concluida |
| **Fase 6** | Features core | FEAT-01 a FEAT-04 | 15-20 dias | Fase 2, 3 concluidas |
| **Fase 7** | Features avancadas | FEAT-05 a FEAT-11 | 20-30 dias | Fase 6 concluida |
| **Fase 8** | Polish e expansao | FEAT-12 a FEAT-16, ARQ-13, ARQ-14, ARQ-15 | 15-20 dias | Fase 7 concluida |

**Duracao total estimada:** 12-16 semanas com 1 desenvolvedor full-time.

**Nota:** As fases podem ser parcialmente paralelizadas se houver mais de um desenvolvedor. A Fase 0 (seguranca emergencial) deve ser executada IMEDIATAMENTE, independente de qualquer outra atividade.

---

> **Este documento e a referencia mestra para a evolucao da plataforma Evo Society. Cada item foi verificado contra o codigo-fonte real com referencias de arquivo e linha. Atualize este documento conforme os itens forem implementados.**