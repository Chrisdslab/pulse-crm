import express from 'express';
import { q } from './db.js';
import { sendMessage } from './messages.js';

export const api = express.Router();

api.get('/customers', async (_req, res) => {
  res.json(await q('SELECT * FROM customers ORDER BY total_spent DESC LIMIT 100'));
});

api.get('/customers/:id', async (req, res) => {
  const [customer] = await q('SELECT * FROM customers WHERE id=?', [req.params.id]);
  if (!customer) return res.sendStatus(404);
  const orders = await q('SELECT * FROM orders WHERE customer_id=? ORDER BY created_at DESC', [customer.id]);
  const events = await q(
    `SELECT e.* FROM order_events e JOIN orders o ON o.id=e.order_id
     WHERE o.customer_id=? ORDER BY e.at`, [customer.id]);
  const messages = await q('SELECT * FROM messages WHERE customer_id=? ORDER BY created_at DESC', [customer.id]);
  res.json({ customer, orders, events, messages });
});

api.get('/orders', async (_req, res) => {
  res.json(await q(
    `SELECT o.*, c.name AS customer_name FROM orders o
     JOIN customers c ON c.id=o.customer_id ORDER BY o.created_at DESC LIMIT 100`));
});

api.get('/drafts', async (_req, res) => {
  res.json(await q(
    `SELECT m.*, c.name AS customer_name FROM messages m
     JOIN customers c ON c.id=m.customer_id WHERE m.status='draft' ORDER BY m.created_at DESC`));
});

api.post('/messages/:id/send', sendMessage);
