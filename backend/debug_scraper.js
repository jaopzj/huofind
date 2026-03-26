import { chromium } from 'playwright';
import { extractSellerInfo, calculateTrustScore, formatSellerData } from './sellerAnalyzer.js';

async function testExtraction(url) {
    console.log(`[Debug] Testing extraction for: ${url}`);
    const browser = await chromium.launch({
        headless: true,
        args: ['--disable-blink-features=AutomationControlled']
    });
    try {
        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            viewport: { width: 1920, height: 1080 },
            locale: 'zh-CN',
            timezoneId: 'Asia/Shanghai'
        });

        // Anti-detection
        await context.addInitScript(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => false });
        });

        const page = await context.newPage();

        // Setup API capture with Promise (matching scraper._setupApiCapture)
        let mtopHeadData = null;
        let resolveCapture;
        const capturedPromise = new Promise(resolve => { resolveCapture = resolve; });

        const handler = async (response) => {
            const rUrl = response.url();
            if (rUrl.includes('user.page.head') || rUrl.includes('idle.web.user.page')) {
                try {
                    const body = await response.text();
                    let jsonStr = body;
                    const m = body.match(/mtopjsonp\d*\((.+)\)$/s);
                    if (m) jsonStr = m[1];
                    const parsed = JSON.parse(jsonStr);
                    if (parsed.ret?.some(r => r.includes('SUCCESS')) && parsed.data && Object.keys(parsed.data).length > 0) {
                        mtopHeadData = parsed.data;
                        console.log('[Debug] MTOP API captured successfully!');
                        console.log('[Debug] MTOP keys:', Object.keys(parsed.data));
                    }
                } catch (e) {
                    console.warn('[Debug] MTOP parse error:', e.message);
                }
                resolveCapture();
            }
        };
        page.on('response', handler);

        console.log('[Debug] Navigating...');
        await page.goto(url, { waitUntil: 'load', timeout: 30000 });

        // Wait for API capture (with 8s timeout)
        console.log('[Debug] Waiting for MTOP API data...');
        await Promise.race([
            capturedPromise,
            new Promise(resolve => setTimeout(resolve, 8000))
        ]);

        console.log(`[Debug] MTOP data captured: ${mtopHeadData ? 'YES' : 'NO'}`);
        if (mtopHeadData) {
            console.log('[Debug] MTOP data sample:', JSON.stringify(mtopHeadData).substring(0, 500));
        }

        console.log('[Debug] Extracting seller info...');
        const rawInfo = await extractSellerInfo(page, mtopHeadData);
        page.removeListener('response', handler);

        console.log('\n========== RAW SELLER INFO ==========');
        console.log(JSON.stringify(rawInfo, null, 2));

        const trustResult = calculateTrustScore(rawInfo);
        const formatted = formatSellerData(rawInfo, trustResult);

        console.log('\n========== FORMATTED RESULT ==========');
        console.log(JSON.stringify(formatted, null, 2));

        console.log('\n========== KEY VALUES ==========');
        console.log(`salesCount: ${rawInfo.salesCount} (expected: 18265)`);
        console.log(`followers: ${rawInfo.followers}`);
        console.log(`nickname: ${rawInfo.nickname}`);
        console.log(`level: ${rawInfo.level}`);
        console.log(`trustScore: ${trustResult.score} (${trustResult.classification})`);

        const pass = rawInfo.salesCount > 0;
        console.log(`\n========== TEST: ${pass ? 'PASS ✓' : 'FAIL ✗'} ==========`);
        if (!pass) {
            console.log('salesCount is 0 — extraction failed');
        }

    } catch (err) {
        console.error('[Debug] Error:', err);
    } finally {
        await browser.close();
    }
}

const targetUrl = process.argv[2] || 'https://www.goofish.com/personal?spm=a21ybx.item.itemHeader.1.4bd93da6hVLrmj&userId=391299371';
testExtraction(targetUrl);
