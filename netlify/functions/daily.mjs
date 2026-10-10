// Scheduled function: runs every day at 12:30 UTC = 6:00 pm IST, even if nobody opens the app.
import { refresh } from '../../server/core.js';
import { blobStorage, payloadCache } from './storage.mjs';

export default async () => {
  const payload = await refresh(blobStorage);
  await payloadCache.set(payload);
  console.log(`[daily] saved prices for ${payload.today.date}`, payload.warnings);
};

export const config = { schedule: '30 12 * * *' };
