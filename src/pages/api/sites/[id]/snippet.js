import { withAuth } from '@/lib/withAuth';
import { getDb } from '@/lib/db';

export default withAuth(function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  const db = getDb();

  const site = db
    .prepare('SELECT * FROM sites WHERE id = ? AND user_id = ?')
    .get(id, req.user.userId);

  if (!site) return res.status(404).json({ error: 'Site not found' });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const trackingSnippet = `<!-- Traffic Source Analytics -->
<script defer src="${appUrl}/t.js" data-site="${site.id}"></script>`;

  const stripeSnippet = `// In your checkout API route, pass the tracking cookies as metadata:
const session = await stripe.checkout.sessions.create({
  line_items: [{ price: 'price_xxx', quantity: 1 }],
  mode: 'payment',
  metadata: {
    ts_visitor_id: req.cookies._ts_vid || '',
    ts_session_id: req.cookies._ts_sid || '',
  },
  success_url: 'https://${site.domain}/success',
  cancel_url: 'https://${site.domain}/cancel',
});`;

  const creemSnippet = `// When creating a Creem order, pass the tracking cookies as metadata:
const order = await fetch('https://api.creem.io/v1/orders', {
  method: 'POST',
  headers: { 'x-api-key': process.env.CREEM_API_KEY, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    product_id: 'prod_xxx',
    metadata: {
      ts_visitor_id: req.cookies._ts_vid || '',
      ts_session_id: req.cookies._ts_sid || '',
    },
  }),
}).then((r) => r.json());`;

  const polarSnippet = `// When creating a Polar checkout, pass the tracking cookies as metadata:
import { Polar } from '@polar-sh/sdk';
const polar = new Polar({ accessToken: process.env.POLAR_API_KEY });
const checkout = await polar.checkouts.create({
  productId: 'prod_xxx',
  metadata: {
    ts_visitor_id: req.cookies._ts_vid || '',
    ts_session_id: req.cookies._ts_sid || '',
  },
  successUrl: 'https://${site.domain}/success',
});`;

  const coinbaseSnippet = `// When creating a Coinbase Commerce charge, pass tracking cookies as metadata:
const charge = await fetch('https://api.commerce.coinbase.com/charges', {
  method: 'POST',
  headers: {
    'X-CC-Api-Key': process.env.COINBASE_COMMERCE_API_KEY,
    'X-CC-Version': '2018-03-22',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: 'Order',
    pricing_type: 'fixed_price',
    local_price: { amount: '29.99', currency: 'USD' },
    metadata: {
      ts_visitor_id: req.cookies._ts_vid || '',
      ts_session_id: req.cookies._ts_sid || '',
    },
    redirect_url: 'https://${site.domain}/success',
    cancel_url: 'https://${site.domain}/cancel',
  }),
}).then((r) => r.json());`;

  res.status(200).json({
    site,
    trackingSnippet,
    stripeSnippet,
    creemSnippet,
    polarSnippet,
    coinbaseSnippet,
  });
});
