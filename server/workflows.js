import Anthropic from '@anthropic-ai/sdk';
import { q } from './db.js';

const client = new Anthropic(); // reads ANTHROPIC_API_KEY

// status -> intent of the message, and whether it may be sent without approval
const RULES = {
  processing: { intent: 'Confirm the order was received and is being prepared', autoSend: false },
  completed:  { intent: 'Order is complete; thank them and invite feedback', autoSend: false },
  'on-hold':  { intent: 'Explain the order is delayed; apologize; do not invent dates', autoSend: false },
  refunded:   { intent: 'Confirm the refund; stay warm and keep the door open', autoSend: false },
};

export async function runWorkflows({ customerId, orderId, status }) {
  const rule = RULES[status];
  if (!rule) return;
  const ctx = await buildContext(customerId, orderId);
  const draft = await composeMessage(ctx, rule.intent);
  await q(
    `INSERT INTO messages (customer_id, order_id, trigger_type, subject, body, reason, ai_generated, status)
     VALUES (?,?,?,?,?,?,TRUE,?)`,
    [customerId, orderId, `status:${status}`, draft.subject, draft.body, draft.reason,
     rule.autoSend ? 'approved' : 'draft']);
}

async function buildContext(customerId, orderId) {
  const [c] = await q('SELECT * FROM customers WHERE id=?', [customerId]);
  const [o] = await q('SELECT * FROM orders WHERE id=?', [orderId]);
  const recent = await q(
    'SELECT trigger_type, subject FROM messages WHERE customer_id=? ORDER BY created_at DESC LIMIT 3',
    [customerId]);
  return {
    customer: { name: c.name, segment: c.segment, orders: c.order_count, lifetime_value: c.total_spent },
    order: { id: o.woo_id, status: o.status, total: o.total, currency: o.currency, items: o.items },
    recent_messages: recent,
  };
}

export async function composeMessage(ctx, intent) {
  const fallback = {
    subject: 'An update on your order',
    body: `Hi ${ctx.customer.name}, your order #${ctx.order.id} is now ${ctx.order.status}.`,
    reason: 'AI unavailable or unparseable; used safe template',
  };
  try {
    const res = await client.messages.create({
      model: 'claude-sonnet-5-5',
      max_tokens: 600,
      system:
        `You write customer emails for an online store. Use ONLY facts in the provided JSON. ` +
        `Never invent tracking numbers, delivery dates, discounts or policies. ` +
        `Match tone to segment (vip/loyal: warm and appreciative; new: friendly and clear). ` +
        `Keep it under 90 words. Respond with JSON only: ` +
        `{"subject": string, "body": string, "reason": string (one line explaining why this message, for the agent)}`,
      messages: [{ role: 'user', content: JSON.stringify({ intent, ...ctx }) }],
    });
    const text = res.content.find(b => b.type === 'text')?.text ?? '{}';
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
    if (!parsed.subject || !parsed.body) return fallback;
    return { subject: parsed.subject, body: parsed.body, reason: parsed.reason || '' };
  } catch (e) {
    console.error('AI compose failed:', e.message);
    return fallback;
  }
}
