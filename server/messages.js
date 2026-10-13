import { Resend } from 'resend';
import { q } from './db.js';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendMessage(req, res) {
  const { id } = req.params;
  const { subject, body } = req.body;
  const [m] = await q(
    'SELECT m.id, c.email FROM messages m JOIN customers c ON c.id=m.customer_id WHERE m.id=?', [id]);
  if (!m) return res.sendStatus(404);
  try {
    const { error } = await resend.emails.send({
      from: process.env.FROM_EMAIL,
      to: m.email,
      subject,
      html: String(body).replace(/\n/g, '<br>'),
    });
    if (error) throw new Error(error.message);
    await q("UPDATE messages SET status='sent', subject=?, body=?, sent_at=NOW() WHERE id=?",
      [subject, body, id]);
    res.json({ ok: true });
  } catch (e) {
    console.error('send failed:', e.message);
    await q("UPDATE messages SET status='failed' WHERE id=?", [id]);
    res.status(502).json({ error: 'send failed' });
  }
}
