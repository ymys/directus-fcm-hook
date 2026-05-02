# Directus FCM Hook Extension

A Directus extension that automatically sends Firebase Cloud Messaging (FCM) push notifications when new items are created in the `inbox` collection.

## Features

- **Automated Notifications**: Triggers when a new message is added to your `inbox`.
- **FCM HTTP v1 API**: Uses the modern Google OAuth 2.0 authentication.
- **HTML Stripping**: Automatically strips HTML tags from message content for the notification body.
- **Metadata Support**: Passes inbox ID and message type to the mobile app for deep-linking.

## Prerequisites

To use this extension, your Directus schema must include the following:

### 1. `user_devices` Collection
Used to store FCM registration tokens for your users.
- `user_id`: (Many-to-One to `directus_users`) The owner of the device.
- `token`: (String) The FCM registration token.

### 2. `inbox` Collection
The collection that triggers personal notifications.
- `penerima`: (Many-to-One to `directus_users`) The recipient of the message.
- `judul`: (String) The title of the notification.
- `pesan`: (Text/HTML) The body of the notification.
- `tipe_pesan`: (String, Optional) Used for routing logic in the app.

### 3. `broadcast` Collection
Used for sending notifications to multiple users at once.
- `topic`: (Many-to-One to `broadcast_topics`) If set, sends to an FCM Topic.
- `target_role`: (Many-to-One to `directus_roles`) If set, sends to all users with this role.
- `judul`: (String) The title of the notification.
- `pesan`: (Text/HTML) The body of the notification.

> [!NOTE]
> If both `topic` and `target_role` are empty in a broadcast, the notification will be sent to **ALL** users with registered devices.

## Installation

1. Install the package in your Directus project:
   ```bash
   npm install @ymys/directus-extension-fcm-hook
   ```
2. Restart your Directus instance.

## Configuration

Add the following environment variables to your Directus `.env` file. You can find these values in your Firebase Service Account JSON file.

| Variable | Description |
| :--- | :--- |
| `FCM_PROJECT_ID` | Your Firebase Project ID. |
| `FCM_CLIENT_EMAIL` | The service account email (e.g., `firebase-adminsdk-...@...iam.gserviceaccount.com`). |
| `FCM_PRIVATE_KEY` | The full private key including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`. |

> [!TIP]
> If your `FCM_PRIVATE_KEY` contains literal `\n` characters, the extension will automatically convert them to actual newlines.

## How it Works

1. When a record is created in `inbox`.
2. The hook looks up all active tokens in the `user_devices` collection for the specified `penerima`.
3. It generates a Google OAuth 2.0 Access Token on the fly.
4. It sends a POST request to the FCM v1 API for each device token.
5. The notification includes:
   - **Title**: From `judul` (defaults to "Pesan Baru").
   - **Body**: From `pesan` (HTML stripped, defaults to "Anda menerima pesan baru.").
   - **Data Payload**: Includes `inbox_id` and `tipe_pesan` inside `routing_info`.

## License

MIT
