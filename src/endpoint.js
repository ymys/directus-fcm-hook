import { sendFCM } from './utils.js';

export default (router, { env, logger }) => {
    const FCM_WEBHOOK_SECRET = env.FCM_WEBHOOK_SECRET || null;

    router.post('/send', async (req, res) => {
        const authSecret = req.headers['x-fcm-secret'];
        if (FCM_WEBHOOK_SECRET && authSecret !== FCM_WEBHOOK_SECRET) {
            logger.warn('🚨 Percobaan akses FCM Endpoint ditolak (Secret tidak cocok/hilang)');
            return res.status(401).json({ error: 'Unauthorized. Cek header x-fcm-secret.' });
        }

        const { tokens, topic, title, body, metadata } = req.body;
        if ((!tokens || !Array.isArray(tokens) || tokens.length === 0) && !topic) {
            return res.status(400).json({ error: 'Payload harus memiliki "tokens" (array) atau "topic" (string).' });
        }

        try {
            const results = await sendFCM(env, { tokens, topic, title, body, metadata, logger });
            res.json({ success: true, sent_count: results.length, details: results });
        } catch (error) {
            logger.error('❌ Error mengirim notifikasi FCM:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // Health check for this endpoint
    router.get('/health', (req, res) => {
        res.json({ status: 'ok', service: 'fcm-endpoint' });
    });
};
