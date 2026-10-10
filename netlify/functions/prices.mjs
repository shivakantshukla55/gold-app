// GET /api/prices  – what the React app calls.
import { refresh, CACHE_MS } from '../../server/core.js';
import { blobStorage, payloadCache } from './storage.mjs';

export default async (req) => {
  try {
    const force = new URL(req.url).searchParams.has('refresh');
    let payload = force ? null : await payloadCache.get();
    if (!payload || Date.now() - new Date(payload.fetchedAt).getTime() > CACHE_MS) {
      payload = await refresh(blobStorage);
      await payloadCache.set(payload);
    }
    return Response.json(payload);
  } catch (e) {
    return Response.json({ error: String(e.message) }, { status: 500 });
  }
};

export const config = { path: '/api/prices' };
