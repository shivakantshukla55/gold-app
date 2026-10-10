// GET /api/prices  – what the React app calls.
import { refresh, CACHE_MS, PAYLOAD_VERSION } from '../../server/core.js';
import { blobStorage, payloadCache } from './storage.mjs';

export default async (req) => {
  try {
    const force = new URL(req.url).searchParams.has('refresh');
    let payload = force ? null : await payloadCache.get();
    const fresh =
      payload && payload.v === PAYLOAD_VERSION && Date.now() - new Date(payload.fetchedAt).getTime() <= CACHE_MS;
    if (!fresh) {
      payload = await refresh(blobStorage);
      await payloadCache.set(payload);
    }
    return Response.json(payload, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return Response.json({ error: String(e.message) }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
};

export const config = { path: '/api/prices' };
