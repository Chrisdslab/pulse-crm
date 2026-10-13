import { db } from './mockData.js';

// true  = fake data (no backend needed)
// false = real backend at /api (proxied to localhost:4000 by vite.config.js)
const USE_MOCK = true;

const wait = (ms = 250) => new Promise(r => setTimeout(r, ms));
const json = r => r.json();

const nameOf = id => db.customers.find(c => c.id === id)?.name;

export const api = USE_MOCK
  ? {
      async getCustomers() { await wait(); return [...db.customers]; },
      async getCustomer(id) {
        await wait();
        const customer = db.customers.find(c => c.id === id);
        const orders = db.orders.filter(o => o.customer_id === id);
        const ids = orders.map(o => o.id);
        return {
          customer,
          orders,
          events: db.events.filter(e => ids.includes(e.order_id)),
          messages: db.messages.filter(m => m.customer_id === id),
        };
      },
      async getOrders() {
        await wait();
        return db.orders.map(o => ({ ...o, customer_name: nameOf(o.customer_id) }));
      },
      async getDrafts() {
        await wait();
        return db.messages
          .filter(m => m.status === 'draft')
          .map(m => ({ ...m, customer_name: nameOf(m.customer_id) }));
      },
      async sendMessage(id, { subject, body }) {
        await wait(600);
        const m = db.messages.find(x => x.id === id);
        Object.assign(m, { subject, body, status: 'sent' });
        return { ok: true };
      },
    }
  : {
      getCustomers: () => fetch('/api/customers').then(json),
      getCustomer: id => fetch(`/api/customers/${id}`).then(json),
      getOrders: () => fetch('/api/orders').then(json),
      getDrafts: () => fetch('/api/drafts').then(json),
      sendMessage: (id, payload) =>
        fetch(`/api/messages/${id}/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }).then(json),
    };
