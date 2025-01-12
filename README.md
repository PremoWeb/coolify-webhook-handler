# Coolify Webhook Proxy Handler

This project listens for incoming webhook requests, matches the repository and branch from the payload with an API list, and triggers a deployment webhook for the matched application.

## Features

- Extracts the repository name and branch from the incoming payload.
- Fetches a list of applications from the Coolify API.
- Matches the repository and branch from the payload with the API list.
- Triggers a deployment webhook for the matched repository and branch.

## Current Integration

This webhook handler is currently designed for **Gitea** and **Gitea forks**. Future plans include adding support for:

- **GitLab**
- **GitHub**
- **Bitbucket**
- Middleware hooks for **push notifications**, **2FA authorizations**, and more.

## Requirements

- [Bun](https://bun.sh/) (Bun runtime)
- A Coolify account and API credentials:
  - `COOLIFY_API_URL`
  - `COOLIFY_API_KEY`
- A secret key for securing webhooks (`WEBHOOKS_SECRET`).

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/premoweb/coolify-webhook-handler.git
   cd coolify-webhook-handler
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

3. Create a `.env` file in the root of the project with the following variables:
   ```env
   COOLIFY_API_URL=https://your-coolify-instance.com
   COOLIFY_API_KEY=your-coolify-api-key
   WEBHOOKS_SECRET=your-webhook-secret
   ```

   > **Note:** `WEBHOOKS_SECRET` is a secret key used to secure the webhook. Keep it private and secure.

4. Start the server:
   ```bash
   bun run index.ts
   ```

   The server will start on `http://localhost:3000`.

## Deployment to Coolify

1. In Coolify, create a new application and choose the **Dockerfile** option.

2. Set the port for the application to `3000` to match the default port used by the webhook handler.

3. Pick a subdomain or URL for your deployment, such as:
   ```url
   https://deployments.your-domain.com
   ```

4. Follow the prompts in Coolify to complete the deployment process.

## Setting Up `WEBHOOKS_SECRET`

1. Generate a strong secret key:
   ```bash
   openssl rand -hex 32
   ```

2. Copy the generated key and add it to your `.env` file as `WEBHOOKS_SECRET`:
   ```env
   WEBHOOKS_SECRET=your-generated-secret-key
   ```

3. Configure your webhook source (e.g., Gitea, GitHub) to use the same secret key when sending webhooks.

## Testing the Webhook with `curl`

To test the webhook handler locally with `curl`, send the payload using the following command:

```bash
curl -X POST http://localhost:3000/ \
-H "Content-Type: application/json" \
-d @load.json
```

### Responses

- **200 OK**: Deployment triggered successfully.
- **400 Bad Request**: Invalid request (e.g., missing headers, invalid JSON).
- **404 Not Found**: No matching repository and branch found.
- **500 Internal Server Error**: Unexpected error.

## License

This project is licensed under the [MIT License](LICENSE).
