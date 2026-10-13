# Pulse: AI-assisted CRM for WooCommerce

Customer profiles, order tracking and AI-drafted communication workflows, built on Node.js, MySQL and React.

## Structure

```
pulse-crm/
├── server/   Express API, WooCommerce webhooks, MySQL, AI drafts, email
└── web/      React + Vite + Tailwind dashboard
```

## 1. Frontend

The dashboard ships with mock data (`USE_MOCK = true` in `web/src/api.js`).

```cmd
cd web
npm install
npm run dev
```

Open http://localhost:5173

## 2. Backend

```cmd
cd server
npm install
copy .env.example .env
```

Edit `.env` (MySQL password, secrets, API keys), then create the database:

```cmd
mysql -u root -p < schema.sql
npm run dev
```

Test without WooCommerce, in a second terminal (use your own email so the send step works with Resend's test sender):

```cmd
node simulate.js processing 1001 you@gmail.com "Asha Mehta"
node simulate.js completed 1001 you@gmail.com "Asha Mehta"
node simulate.js processing 1002 other@example.com "Rohan Patil"
```

You should see rows in `customers`, `orders`, `order_events` and `messages`.

## 3. Connect the frontend to the backend

In `web/src/api.js` set `USE_MOCK = false`, keep both servers running, refresh http://localhost:5173.

## 4. Connect real WooCommerce (when LocalWP and ngrok are installed)

1. `ngrok http 4000`
2. WooCommerce → Settings → Advanced → Webhooks: add **Order created** and **Order updated**
   - Delivery URL: `https://<your-ngrok-url>/webhooks/woocommerce/order`
   - Secret: same value as `WC_WEBHOOK_SECRET` in `.env`
3. WooCommerce → Settings → Advanced → REST API → add a read key, put it in `.env` (`WC_KEY`, `WC_SECRET`, `WC_URL`)
4. Import history: `node backfill.js`

## Troubleshooting

- Webhook returns 401: secret mismatch, or `express.json()` is mounted before the webhook route.
- `ER_ACCESS_DENIED_ERROR`: wrong `DB_PASSWORD`.
- Drafts always say "safe template": missing or invalid `ANTHROPIC_API_KEY` (see the `AI compose failed` log line).
- Resend test sender only delivers to the email you signed up with.
