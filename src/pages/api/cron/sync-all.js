import { syncStripePayments } from '@/lib/stripe-sync';
import { syncCreemPayments } from '@/lib/creem-sync';
import { syncPolarPayments } from '@/lib/polar-sync';
import { syncCoinbasePayments } from '@/lib/coinbase-sync';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const cronSecret = req.headers['x-cron-secret'];
  if (process.env.CRON_SECRET && cronSecret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const [stripe, creem, polar, coinbase] = await Promise.allSettled([
    syncStripePayments(),
    syncCreemPayments(),
    syncPolarPayments(),
    syncCoinbasePayments(),
  ]);

  const result = {
    stripe: stripe.status === 'fulfilled' ? stripe.value : { error: stripe.reason?.message },
    creem: creem.status === 'fulfilled' ? creem.value : { error: creem.reason?.message },
    polar: polar.status === 'fulfilled' ? polar.value : { error: polar.reason?.message },
    coinbase: coinbase.status === 'fulfilled' ? coinbase.value : { error: coinbase.reason?.message },
  };

  res.status(200).json({ success: true, ...result });
}
