import { sendFCM } from './utils.js';

export default ({ filter, action }, { env, logger, services }) => {
    const { ItemsService } = services;

    action('inbox.items.create', async (meta, context) => {
        const payload = meta.payload;
        const receiverId = payload.penerima;
        
        if (!receiverId) return;

        try {
            const userDevicesService = new ItemsService('user_devices', {
                schema: context.schema,
                knex: context.database
            });

            // Get tokens for the receiver
            const devices = await userDevicesService.readByQuery({
                filter: {
                    user_id: { _eq: receiverId }
                },
                fields: ['token']
            });

            const tokens = devices.map(d => d.token).filter(t => !!t);

            if (tokens.length === 0) {
                logger.info(`FCM Hook: No registered devices for user ${receiverId}`);
                return;
            }

            logger.info(`FCM Hook: Sending notification to user ${receiverId} (${tokens.length} devices)`);

            await sendFCM(env, {
                tokens,
                title: payload.judul || 'Pesan Baru',
                body: payload.pesan ? payload.pesan.replace(/<[^>]*>?/gm, '') : 'Anda menerima pesan baru.', // Strip HTML for body
                metadata: {
                    inbox_id: meta.key,
                    tipe_pesan: payload.tipe_pesan
                },
                logger
            });

        } catch (error) {
            logger.error(`FCM Hook Error: ${error.message}`);
        }
    });

    action('broadcast.items.create', async (meta, context) => {
        const payload = meta.payload;
        let targetTopic = 'all';

        // 1. Determine target topic
        if (payload.target_role) {
            targetTopic = `role_${payload.target_role}`;
        } else if (payload.topic) {
            // If they selected a specific topic from broadcast_topics
            targetTopic = payload.topic;
        }

        try {
            logger.info(`FCM Hook: Broadcasting to topic ${targetTopic}`);

            await sendFCM(env, {
                topic: targetTopic,
                title: payload.judul || 'Pengumuman Baru',
                body: payload.pesan ? payload.pesan.replace(/<[^>]*>?/gm, '') : 'Anda menerima pengumuman baru.',
                metadata: {
                    broadcast_id: meta.key,
                    type: 'broadcast'
                },
                logger
            });
        } catch (error) {
            logger.error(`FCM Hook Broadcast Error: ${error.message}`);
        }
    });
};
