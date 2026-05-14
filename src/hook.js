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
            logger.error(`FCM Hook (Inbox) Error: ${error.message}`);
        }
    });

    action('broadcast.items.create', async (meta, context) => {
        const payload = meta.payload;
        const topicId = payload.topic;
        const targetRole = payload.target_role;
        const targetPolicy = payload.target_policy;

        try {
            const userDevicesService = new ItemsService('user_devices', {
                schema: context.schema,
                knex: context.database
            });

            let tokens = [];
            let fcmTopic = null;

            if (topicId) {
                const broadcastTopicsService = new ItemsService('broadcast_topics', {
                    schema: context.schema,
                    knex: context.database
                });
                
                try {
                    const topicRecord = await broadcastTopicsService.readOne(topicId);
                    // Use a specific fcm_topic field if it exists, otherwise slug or name
                    fcmTopic = topicRecord.fcm_topic || topicRecord.slug || topicRecord.name || topicId.toString();
                } catch (e) {
                    fcmTopic = topicId.toString();
                }
            } else {
                const query = {
                    fields: ['token'],
                    filter: {}
                };

                const filters = [];

                if (targetRole) {
                    filters.push({
                        user_id: {
                            role: {
                                _eq: targetRole
                            }
                        }
                    });
                }

                if (targetPolicy) {
                    filters.push({
                        user_id: {
                            policies: {
                                policy: {
                                    _eq: targetPolicy
                                }
                            }
                        }
                    });
                }

                if (filters.length > 0) {
                    if (filters.length === 1) {
                        query.filter = filters[0];
                    } else {
                        query.filter = {
                            _or: filters
                        };
                    }
                }

                const devices = await userDevicesService.readByQuery(query);
                tokens = devices.map(d => d.token).filter(t => !!t);
            }

            if (!fcmTopic && tokens.length === 0) {
                logger.info(`FCM Hook: No targets for broadcast ${meta.key}`);
                return;
            }

            logger.info(`FCM Hook: Sending broadcast ${meta.key} to ${fcmTopic ? 'topic: ' + fcmTopic : tokens.length + ' tokens'}`);

            await sendFCM(env, {
                tokens: fcmTopic ? null : tokens,
                topic: fcmTopic,
                title: payload.judul || 'Pengumuman Baru',
                body: payload.pesan ? payload.pesan.replace(/<[^>]*>?/gm, '') : 'Ada pengumuman baru untuk Anda.',
                metadata: {
                    broadcast_id: meta.key,
                    topic_id: topicId
                },
                logger
            });

        } catch (error) {
            logger.error(`FCM Hook (Broadcast) Error: ${error.message}`);
        }
    });
};
