import { getDb } from './db';

const POLAR_API_BASE = 'https://api.polar.sh/v1';

async function polarFetch(path, apiKey) {
  const res = await fetch(`${POLAR_API_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) {
    throw new Error(`Polar API error ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

function resolveAttribution(db, sessionId, visitorId, siteId) {
  let utmSource = null;
  let utmMedium = null;
  let utmCampaign = null;
  let referrerDomain = null;
  let resolvedSessionId = sessionId;

  if (sessionId) {
    const origSession = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId);
    if (origSession) {
      utmSource = origSession.utm_source;
      utmMedium = origSession.utm_medium;
      utmCampaign = origSession.utm_campaign;
      referrerDomain = origSession.referrer_domain;
    }
  }

  if (!utmSource && visitorId) {
    const recentSession = db
      .prepare('SELECT * FROM sessions WHERE visitor_id = ? ORDER BY started_at DESC LIMIT 1')
      .get(visitorId);
    if (recentSession) {
      if (!resolvedSessionId) resolvedSessionId = recentSession.id;
      utmSource = recentSession.utm_source;
      utmMedium = recentSession.utm_medium;
      utmCampaign = recentSession.utm_campaign;
      referrerDomain = recentSession.referrer_domain;
    }
  }

  let affiliateId = null;
  if (visitorId) {
    const affiliateVisit = db
      .prepare('SELECT affiliate_id FROM affiliate_visits WHERE visitor_id = ? AND site_id = ? ORDER BY landed_at DESC LIMIT 1')
      .get(visitorId, siteId);
    if (affiliateVisit) affiliateId = affiliateVisit.affiliate_id;
  }

  return { resolvedSessionId, utmSource, utmMedium, utmCampaign, referrerDomain, affiliateId };
}

export async function syncPolarPayments() {
  const db = getDb();

  const sites = db
    .prepare('SELECT id, polar_api_key FROM sites WHERE polar_api_key IS NOT NULL')
    .all();

  if (sites.length === 0) return { sites: 0, conversions: 0 };

  let totalProcessed = 0;

  for (const site of sites) {
    try {
      // Fetch orders from last 24 hours
      const since = new Date(Date.now() - 86400 * 1000).toISOString();
      const data = await polarFetch(`/orders?created_at_start=${encodeURIComponent(since)}&limit=100`, site.polar_api_key);

      const orders = data.items || data.data || [];

      for (const order of orders) {
        // Skip non-paid orders
        if (order.status && order.status !== 'paid') continue;

        const orderId = order.id;

        // Dedup
        const existing = db
          .prepare('SELECT id FROM conversions WHERE payment_intent_id = ? AND site_id = ?')
          .get(orderId, site.id);
        if (existing) continue;

        const metadata = order.metadata || {};
        const visitorId = metadata.ts_visitor_id || null;
        const sessionId = metadata.ts_session_id || null;

        const { resolvedSessionId, utmSource, utmMedium, utmCampaign, referrerDomain, affiliateId } =
          resolveAttribution(db, sessionId, visitorId, site.id);

        // Polar amounts are in cents
        const amount = order.amount || order.net_amount || 0;
        const currency = (order.currency || 'usd').toLowerCase();
        const customerEmail = order.customer?.email || order.billing_address?.email || null;

        db.prepare(
          `INSERT OR IGNORE INTO conversions (
            site_id, session_id, visitor_id, stripe_event_id,
            stripe_customer_id, stripe_customer_email, payment_intent_id,
            amount, currency, status, provider,
            utm_source, utm_medium, utm_campaign, referrer_domain, affiliate_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          site.id,
          resolvedSessionId,
          visitorId,
          orderId,
          order.customer_id || order.user_id || null,
          customerEmail,
          orderId,
          amount,
          currency,
          'completed',
          'polar',
          utmSource,
          utmMedium,
          utmCampaign,
          referrerDomain,
          affiliateId
        );

        totalProcessed++;
      }
    } catch (err) {
      console.error(`Polar sync error for site ${site.id}:`, err.message);
    }
  }

  return { sites: sites.length, conversions: totalProcessed };
}
