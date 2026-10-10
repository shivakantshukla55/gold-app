// Netlify Blobs storage for the price history (survives deploys; no disk needed).
import { getStore } from '@netlify/blobs';

// Strong consistency so the daily job and page visits always see the latest saved history.
const store = () => getStore({ name: 'gold', consistency: 'strong' });

export const blobStorage = {
  async loadHistory() {
    return (await store().get('history', { type: 'json' })) ?? null;
  },
  async saveHistory(history) {
    await store().setJSON('history', history);
  },
};

export const payloadCache = {
  async get() {
    return (await store().get('payload', { type: 'json' })) ?? null;
  },
  async set(payload) {
    await store().setJSON('payload', payload);
  },
};
