const express = require('express');
const cors = require('cors');
const path = require('path');
const { scrapeVendor } = require('./scraper');
const { filterProducts, cleanProducts } = require('./filter');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Aumenta limite para JSONs grandes
app.use(express.static(path.join(__dirname, 'public')));

// Endpoint principal de scraping
app.post('/api/scrape', async (req, res) => {
    const { url } = req.body;

    if (!url) {
        return res.status(400).json({
            error: 'URL não fornecida',
            message: 'Forneça a URL do vendedor Yupoo no campo "url"'
        });
    }

    // Valida se é uma URL Yupoo válida
    if (!url.includes('yupoo.com')) {
        return res.status(400).json({
            error: 'URL inválida',
            message: 'A URL deve ser de um vendedor Yupoo (ex: https://vendedor.x.yupoo.com/albums)'
        });
    }

    console.log(`[Server] Recebido pedido de scraping: ${url}`);

    try {
        const startTime = Date.now();
        const result = await scrapeVendor(url);
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);

        console.log(`[Server] Scraping concluído em ${duration}s - ${result.total_products} produtos`);

        res.json({
            success: true,
            duration_seconds: parseFloat(duration),
            ...result
        });

    } catch (error) {
        console.error('[Server] Erro no scraping:', error.message);

        res.status(500).json({
            error: 'Erro no scraping',
            message: error.message
        });
    }
});

// Endpoint de filtragem de produtos
app.post('/api/filter', (req, res) => {
    const scrapingResult = req.body;

    if (!scrapingResult || !scrapingResult.products) {
        return res.status(400).json({
            error: 'Dados inválidos',
            message: 'Forneça o resultado do scraping com a lista de produtos'
        });
    }

    console.log(`[Server] Filtrando ${scrapingResult.products.length} produtos...`);

    try {
        const startTime = Date.now();
        const filteredResult = filterProducts(scrapingResult);
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);

        console.log(`[Server] Filtragem concluída em ${duration}s`);
        console.log(`[Server] Estatísticas:`, JSON.stringify(filteredResult.stats, null, 2));

        res.json({
            success: true,
            filter_duration_seconds: parseFloat(duration),
            ...filteredResult
        });

    } catch (error) {
        console.error('[Server] Erro na filtragem:', error.message);

        res.status(500).json({
            error: 'Erro na filtragem',
            message: error.message
        });
    }
});

// Endpoint de limpeza (remove sem marca e categoria desconhecida)
app.post('/api/clean', (req, res) => {
    const filteredResult = req.body;

    if (!filteredResult || !filteredResult.products) {
        return res.status(400).json({
            error: 'Dados inválidos',
            message: 'Forneça o resultado filtrado com a lista de produtos'
        });
    }

    console.log(`[Server] Limpando ${filteredResult.products.length} produtos...`);

    try {
        const startTime = Date.now();
        const cleanedResult = cleanProducts(filteredResult);
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);

        console.log(`[Server] Limpeza concluída em ${duration}s`);
        console.log(`[Server] Removidos: ${cleanedResult.stats.removidos} | Restantes: ${cleanedResult.stats.total}`);

        res.json({
            success: true,
            clean_duration_seconds: parseFloat(duration),
            ...cleanedResult
        });

    } catch (error) {
        console.error('[Server] Erro na limpeza:', error.message);

        res.status(500).json({
            error: 'Erro na limpeza',
            message: error.message
        });
    }
});

// Healthcheck
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve a página principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Inicia o servidor
app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║               YUPOO SCRAPER - Servidor                    ║
╠═══════════════════════════════════════════════════════════╣
║   Servidor rodando em: http://localhost:${PORT}              ║
║   API Endpoints:                                          ║
║     POST /api/scrape  - Coleta produtos                   ║
║     POST /api/filter  - Filtra e categoriza               ║
║   Healthcheck:         GET /api/health                    ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

