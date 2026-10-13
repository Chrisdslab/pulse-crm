import { useEffect, useState, useCallback } from 'react';
import { api } from './api.js';
import CustomerDrawer, { STATUS_COLOR } from './CustomerDrawer.jsx';

const TABS = ['Customers', 'Orders', 'Draft queue'];
const money = n => `₹${Number(n).toLocaleString('en-IN')}`;

export default function App() {
  const [tab, setTab] = useState('Customers');
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [selected, setSelected] = useState(null);

  const refresh = useCallback(async () => {
    const [c, o, d] = await Promise.all([api.getCustomers(), api.getOrders(), api.getDrafts()]);
    setCustomers(c); setOrders(o); setDrafts(d);
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const revenue = orders.filter(o => o.status === 'completed').reduce((s, o) => s + Number(o.total), 0);
  const open = orders.filter(o => ['processing', 'on-hold'].includes(o.status)).length;

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pulse</h1>
          <p className="text-sm text-neutral-500">Customers, orders and conversations in one place</p>
        </div>
        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs text-emerald-800">● Synced with WooCommerce</span>
      </header>

      <section className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card label="Customers" value={customers.length} />
        <Card label="Completed revenue" value={money(revenue)} />
        <Card label="Open orders" value={open} />
        <Card label="Drafts awaiting you" value={drafts.length} accent />
      </section>

      <nav className="mt-10 flex gap-6 border-b border-neutral-200">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
                  className={`pb-3 text-sm ${tab === t ? 'border-b-2 border-indigo-600 font-medium text-neutral-900' : 'text-neutral-500'}`}>
            {t}
          </button>
        ))}
      </nav>

      {tab === 'Customers' && (
        <Table head={['Customer', 'Orders', 'Lifetime value', 'Segment']}>
          {customers.map(c => (
            <tr key={c.id} onClick={() => setSelected(c.id)} className="cursor-pointer border-t border-neutral-100 hover:bg-neutral-50">
              <td className="py-3"><div className="font-medium">{c.name}</div><div className="text-xs text-neutral-500">{c.email}</div></td>
              <td className="num">{c.order_count}</td>
              <td className="num">{money(c.total_spent)}</td>
              <td className="capitalize">{c.segment.replace('_', ' ')}</td>
            </tr>
          ))}
        </Table>
      )}

      {tab === 'Orders' && (
        <Table head={['Order', 'Customer', 'Items', 'Total', 'Status']}>
          {orders.map(o => (
            <tr key={o.id} onClick={() => setSelected(o.customer_id)} className="cursor-pointer border-t border-neutral-100 hover:bg-neutral-50">
              <td className="py-3 font-medium">#{o.woo_id}</td>
              <td>{o.customer_name}</td>
              <td className="text-neutral-500">{(o.items || []).map(i => `${i.qty}× ${i.name}`).join(', ')}</td>
              <td className="num">{money(o.total)}</td>
              <td><span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_COLOR[o.status] ?? 'bg-neutral-100'}`}>{o.status}</span></td>
            </tr>
          ))}
        </Table>
      )}

      {tab === 'Draft queue' && (
        <ul className="mt-4 space-y-3">
          {drafts.length === 0 && <li className="py-10 text-center text-sm text-neutral-400">All caught up 🎉</li>}
          {drafts.map(m => (
            <li key={m.id} onClick={() => setSelected(m.customer_id)}
                className="cursor-pointer rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 hover:bg-indigo-50">
              <div className="flex justify-between text-sm">
                <span className="font-medium">{m.customer_name}</span>
                <span className="text-xs text-indigo-700">{m.trigger_type}</span>
              </div>
              <p className="mt-1 text-sm">{m.subject}</p>
              <p className="mt-1 text-xs text-neutral-500">✦ {m.reason}</p>
            </li>
          ))}
        </ul>
      )}

      {selected && <CustomerDrawer customerId={selected} onClose={() => setSelected(null)} onChanged={refresh} />}
    </main>
  );
}

const Card = ({ label, value, accent }) => (
  <div className={`rounded-xl border p-4 ${accent ? 'border-indigo-200 bg-indigo-50' : 'border-neutral-200 bg-white'}`}>
    <div className="text-xs text-neutral-500">{label}</div>
    <div className="num mt-1 text-2xl font-semibold">{value}</div>
  </div>
);

const Table = ({ head, children }) => (
  <table className="mt-4 w-full text-left text-sm">
    <thead className="text-xs uppercase text-neutral-500">
      <tr>{head.map(h => <th key={h} className="py-2 font-medium">{h}</th>)}</tr>
    </thead>
    <tbody>{children}</tbody>
  </table>
);
