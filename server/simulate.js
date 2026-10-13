// Sends a signed fake WooCommerce webhook so you can test without a store.
// Usage: node simulate.js [status] [orderId] [email] [name]
import 'dotenv/config';
import crypto from 'crypto';

const [status = 'processing', orderId = '1001', email = 'asha@example.com', fullName = 'Asha Mehta'] =
  process.argv.slice(2);
const [first, ...rest] = fullName.split(' ');

const order = {
  id: Number(orderId),
  status,
  total: '1499.00',
  currency: 'INR',
  customer_id: Number(orderId),
  date_created_gmt: '2026-10-13T08:00:00',
  date_modified_gmt: new Date().toISOString().slice(0, 19),
  billing: { first_name: first, last_name: rest.join(' '), email, phone: '9999999999' },
  line_items: [{ name: 'Handloom Cotton Kurta', quantity: 2 }],
};

const body = JSON.stringify(order);
const sig = crypto.createHmac('sha256', process.env.WC_WEBHOOK_SECRET).update(body).digest('base64');

const r = await fetch(`http://localhost:${process.env.PORT || 4000}/webhooks/woocommerce/order`, {
  method: 'POST',
  body,
  headers: { 'Content-Type': 'application/json', 'X-WC-Webhook-Signature': sig },
});
console.log('Webhook response:', r.status);
