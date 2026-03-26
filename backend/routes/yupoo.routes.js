import { Router } from 'express';
import multer from 'multer';
import { searchByImage } from '../imageSearch.js';

const router = Router();

// Configure multer for image search uploads (memory storage)
const imageSearchUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Apenas imagens são permitidas'), false);
        }
    }
}).single('image');

/**
 * POST /api/yupoo/image-search
 * Search for similar Yupoo products using an uploaded image.
 * Uses perceptual hashing (dHash) + color histogram for matching.
 */
router.post('/image-search', (req, res) => {
    imageSearchUpload(req, res, async (err) => {
        try {
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({ error: 'Imagem muito grande. Máximo 10MB.' });
                }
                return res.status(400).json({ error: 'Erro no upload: ' + err.message });
            } else if (err) {
                return res.status(400).json({ error: err.message });
            }

            if (!req.file) {
                return res.status(400).json({ error: 'Nenhuma imagem enviada' });
            }

            console.log(`[ImageSearch] Received image: ${req.file.originalname} (${(req.file.size / 1024).toFixed(1)}KB)`);

            const result = await searchByImage(req.file.buffer);

            if (result.error) {
                return res.status(503).json({ error: result.error });
            }

            console.log(`[ImageSearch] Found ${result.results.length} matches in ${result.duration}ms`);

            res.json({
                success: true,
                results: result.results,
                totalMatches: result.totalMatches,
                duration: result.duration
            });
        } catch (error) {
            console.error('[ImageSearch] Error:', error);
            res.status(500).json({ error: 'Erro ao processar busca por imagem' });
        }
    });
});

export default router;
