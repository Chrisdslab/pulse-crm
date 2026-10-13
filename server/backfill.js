// Imports historical WooCommerce orders (no AI drafts are generated for these).
import 'dotenv/config';
import { processOrder } from './webhooks.js';

const auth = Buffer.from(`${process.env.WC_KEY}:${process.env.WC_SECRET}`).toString('base64');
let page = 1;
let total = 0;

while (true) {
  const r = await fetch(`${process.env.WC_URL}/wp-json/wc/v3/orders?per_page=50&page=${page}`,
    { headers: { Authorization: `Basic ${auth}` } });
  const orders = await r.json();
  if (!Array.isArray(orders)) {
    console.error('Unexpected response from WooCommerce:', orders);
    process.exit(1);
  }
  if (orders.length === 0) break;
  for (const o of orders) {
    await processOrder(o, { runFlows: false });
    total++;
  }
  page++;
}
console.log(`Backfilled ${total} orders`);
process.exit(0);
