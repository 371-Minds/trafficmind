import { getDb } from '@/lib/db';
import { withAuth } from '@/lib/withAuth';

export default withAuth(function handler(req, res) {
  const db = getDb();
  const { id } = req.query;

  const site = db
    .prepare('SELECT * FROM sites WHERE id = ? AND user_id = ?')
    .get(id, req.user.userId);

  if (!site) {
    return res.status(404).json({ error: 'Site not found' });
  }

  if (req.method === 'GET') {
    const maskedSite = { ...site };
    if (maskedSite.stripe_secret_key) {
      maskedSite.stripe_secret_key = '••••' + maskedSite.stripe_secret_key.slice(-4);
    }
    if (maskedSite.stripe_webhook_secret) {
      maskedSite.stripe_webhook_secret = '••••' + maskedSite.stripe_webhook_secret.slice(-4);
    }
    if (maskedSite.creem_api_key) {
      maskedSite.creem_api_key = '••••' + maskedSite.creem_api_key.slice(-4);
    }
    if (maskedSite.polar_api_key) {
      maskedSite.polar_api_key = '••••' + maskedSite.polar_api_key.slice(-4);
    }
    if (maskedSite.coinbase_commerce_api_key) {
      maskedSite.coinbase_commerce_api_key = '••••' + maskedSite.coinbase_commerce_api_key.slice(-4);
    }
    return res.status(200).json({ site: maskedSite });
  }

  if (req.method === 'PUT') {
    const { domain, name, stripe_secret_key, creem_api_key, polar_api_key, coinbase_commerce_api_key } = req.body;
    const cleanDomain = domain
      ? domain.replace(/^https?:\/\//, '').replace(/\/+$/, '')
      : site.domain;

    db.prepare('UPDATE sites SET domain = ?, name = ? WHERE id = ?').run(
      cleanDomain,
      name || site.name,
      id
    );

    if (stripe_secret_key !== undefined) {
      db.prepare('UPDATE sites SET stripe_secret_key = ? WHERE id = ?').run(
        stripe_secret_key || null,
        id
      );
    }

    if (creem_api_key !== undefined) {
      db.prepare('UPDATE sites SET creem_api_key = ? WHERE id = ?').run(
        creem_api_key || null,
        id
      );
    }

    if (polar_api_key !== undefined) {
      db.prepare('UPDATE sites SET polar_api_key = ? WHERE id = ?').run(
        polar_api_key || null,
        id
      );
    }

    if (coinbase_commerce_api_key !== undefined) {
      db.prepare('UPDATE sites SET coinbase_commerce_api_key = ? WHERE id = ?').run(
        coinbase_commerce_api_key || null,
        id
      );
    }

    const updated = db.prepare('SELECT * FROM sites WHERE id = ?').get(id);
    const maskedUpdated = { ...updated };
    if (maskedUpdated.stripe_secret_key) {
      maskedUpdated.stripe_secret_key = '••••' + maskedUpdated.stripe_secret_key.slice(-4);
    }
    if (maskedUpdated.stripe_webhook_secret) {
      maskedUpdated.stripe_webhook_secret = '••••' + maskedUpdated.stripe_webhook_secret.slice(-4);
    }
    if (maskedUpdated.creem_api_key) {
      maskedUpdated.creem_api_key = '••••' + maskedUpdated.creem_api_key.slice(-4);
    }
    if (maskedUpdated.polar_api_key) {
      maskedUpdated.polar_api_key = '••••' + maskedUpdated.polar_api_key.slice(-4);
    }
    if (maskedUpdated.coinbase_commerce_api_key) {
      maskedUpdated.coinbase_commerce_api_key = '••••' + maskedUpdated.coinbase_commerce_api_key.slice(-4);
    }
    return res.status(200).json({ site: maskedUpdated });
  }

  if (req.method === 'DELETE') {
    db.prepare('DELETE FROM sites WHERE id = ?').run(id);
    return res.status(200).json({ success: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
});
