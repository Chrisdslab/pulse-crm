import express from 'express';
import crypto from 'crypto';
import { q } from './db.js';
import { runWorkflows } from './workflows.js';

export const router = express.Router();

const toDate = s => (s ? String(s).replace('T', ' ').slice(0, 19) : null);

function verify(req) {
  const sig = req.get('X-WC-Webhook-Signature');
  if (!sig) return false;
  const expected = crypto
    .createHmac('sha256', process.env.WC_WEBHOOK_SECRET)
    .update(req.body) // Buffer, thanks to express.raw()
    .digest('base64');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Shared by the webhook route AND the backfill script
export async function processOrder(o, { runFlows = true } = {}) {
  if (!o.id || !o.billing?.email) return;

  const c = await q(
    `INSERT INTO customers (woo_id, email, name, phone) VALUES (?,?,?,?)
     ON DUPLICATE KEY UPDATE name=VALUES(name), phone=VALUES(phone), id=LAST_INSERT_ID(id)`,
    [o.customer_id || null, o.billing.email,
     `${o.billing.first_name || ''} ${o.billing.last_name || ''}`.trim(), o.billing.phone || null]);
  const customerId = c.insertId;

  const [prev] = await q('SELECT status FROM orders WHERE woo_id=?', [o.id]);

  const ord = await q(
    `INSERT INTO orders (woo_id, customer_id, status, total, currency, items, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?)
     ON DUPLICATE KEY UPDATE status=VALUES(status), total=VALUES(total),
       items=VALUES(items), updated_at=VALUES(updated_at), id=LAST_INSERT_ID(id)`,
    [o.id, customerId, o.status, o.total, o.currency,
     JSON.stringify((o.line_items || []).map(i => ({ name: i.name, qty: i.quantity }))),
     toDate(o.date_created_gmt), toDate(o.date_modified_gmt || o.date_created_gmt)]);
  const orderId = ord.insertId;

  // Only act when the status actually changed (WooCommerce can fire duplicate webhooks)
  if (!prev || prev.status !== o.status) {
    await q('INSERT INTO order_events (order_id, from_status, to_status) VALUES (?,?,?)',
      [orderId, prev?.status ?? null, o.status]);
    await refreshCustomerStats(customerId);
    if (runFlows) await runWorkflows({ customerId, orderId, status: o.status });
  }
}

async function refreshCustomerStats(id) {
  await q(
    `UPDATE customers c
     JOIN (SELECT COALESCE(SUM(total),0) AS spent, COUNT(*) AS cnt, MAX(created_at) AS last_at
           FROM orders
           WHERE customer_id=? AND status NOT IN ('cancelled','failed','refunded')) x
     SET c.total_spent = x.spent,
         c.order_count = x.cnt,
         c.last_order_at = x.last_at,
         c.segment = CASE
           WHEN x.spent > 500 THEN 'vip'
           WHEN x.cnt >= 3 THEN 'loyal'
           WHEN x.last_at < NOW() - INTERVAL 90 DAY THEN 'at_risk'
           ELSE 'new' END
     WHERE c.id=?`, [id, id]);
}

router.post('/woocommerce/order', express.raw({ type: '*/*' }), async (req, res) => {
  if (!verify(req)) return res.sendStatus(401);
  res.sendStatus(200); // ack fast; WooCommerce retries slow endpoints
  try {
    await processOrder(JSON.parse(req.body.toString('utf8')));
  } catch (err) {
    console.error('webhook processing failed:', err.message);
  }
});
