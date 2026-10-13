import { useEffect, useState } from 'react';
import { api } from './api.js';

export const STATUS_COLOR = {
  processing: 'bg-amber-100 text-amber-800',
  completed: 'bg-emerald-100 text-emerald-800',
  'on-hold': 'bg-orange-100 text-orange-800',
  refunded: 'bg-rose-100 text-rose-800',
};

const fmtDate = d => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

export default function CustomerDrawer({ customerId, onClose, onChanged }) {
  const [data, setData] = useState(null);
  const [draft, setDraft] = useState(null);
  const [sending, setSending] = useState(false);

  async function load() {
    const d = await api.getCustomer(customerId);
    setData(d);
    setDraft(d.messages.find(m => m.status === 'draft') ?? null);
  }
  useEffect(() => { load(); }, [customerId]);

  async function send() {
    setSending(true);
    await api.sendMessage(draft.id, { subject: draft.subject, body: draft.body });
    setSending(false);
    await load();
    onChanged?.();
  }

  if (!data) return null;
  const { customer, orders, events, messages } = data;

  return (
    <>
      <div className="fixed inset-0 bg-black/20" onClick={onClose} />
      <aside className="fixed right-0 top-0 h-full w-full max-w-[480px] overflow-y-auto bg-white p-6 shadow-2xl">
        <button onClick={onClose} className="float-right text-sm text-neutral-500 hover:text-neutral-900">Close</button>
        <h2 className="text-xl font-semibold">{customer.name}</h2>
        <p className="text-sm text-neutral-500">{customer.email}</p>

        <div className="mt-4 grid grid-cols-3 gap-3 text-center">
          <Stat label="Lifetime value" value={`₹${Number(customer.total_spent).toLocaleString('en-IN')}`} />
          <Stat label="Orders" value={customer.order_count} />
          <Stat label="Segment" value={customer.segment.replace('_', ' ')} />
        </div>

        {draft ? (
          <section className="mt-6 rounded-xl border border-indigo-200 bg-indigo-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-indigo-700">✦ AI suggestion</p>
            <p className="mt-1 text-sm text-indigo-900">{draft.reason}</p>
            <input className="mt-3 w-full rounded border border-indigo-200 bg-white p-2 text-sm"
                   value={draft.subject} onChange={e => setDraft({ ...draft, subject: e.target.value })} />
            <textarea className="mt-2 h-40 w-full rounded border border-indigo-200 bg-white p-2 text-sm"
                      value={draft.body} onChange={e => setDraft({ ...draft, body: e.target.value })} />
            <button onClick={send} disabled={sending}
                    className="mt-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
              {sending ? 'Sending…' : 'Approve & send'}
            </button>
          </section>
        ) : (
          <p className="mt-6 rounded-xl bg-neutral-50 p-4 text-sm text-neutral-500">No pending drafts for this customer.</p>
        )}

        <h3 className="mt-8 font-medium">Order timeline</h3>
        <ol className="mt-3 space-y-4 border-l border-neutral-200 pl-4">
          {orders.map(o => (
            <li key={o.id}>
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">#{o.woo_id}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_COLOR[o.status] ?? 'bg-neutral-100'}`}>{o.status}</span>
                <span className="num text-neutral-500">₹{Number(o.total).toLocaleString('en-IN')}</span>
              </div>
              <p className="mt-0.5 text-xs text-neutral-500">
                {(o.items || []).map(i => `${i.qty}× ${i.name}`).join(', ')}
              </p>
              <p className="mt-0.5 text-xs text-neutral-400">
                {events.filter(e => e.order_id === o.id).map(e => `${e.to_status} · ${fmtDate(e.at)}`).join('  →  ')}
              </p>
            </li>
          ))}
        </ol>

        <h3 className="mt-8 font-medium">Message history</h3>
        <ul className="mt-3 space-y-2">
          {messages.filter(m => m.status !== 'draft').map(m => (
            <li key={m.id} className="rounded-lg border border-neutral-200 p-3 text-sm">
              <div className="flex justify-between">
                <span className="font-medium">{m.subject}</span>
                <span className="text-xs capitalize text-emerald-700">{m.status}</span>
              </div>
              <p className="mt-1 line-clamp-2 text-xs text-neutral-500">{m.body}</p>
            </li>
          ))}
          {messages.every(m => m.status === 'draft') && <li className="text-sm text-neutral-400">Nothing sent yet.</li>}
        </ul>
      </aside>
    </>
  );
}

const Stat = ({ label, value }) => (
  <div className="rounded-lg bg-neutral-50 p-3">
    <div className="text-xs text-neutral-500">{label}</div>
    <div className="num text-lg font-semibold capitalize">{value}</div>
  </div>
);
