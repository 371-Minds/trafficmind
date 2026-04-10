import { getDb } from './db';

// Converts a decimal price string (e.g. '29.99') to integer cents (2999).
// Returns 0 if the input is missing or not a valid number.
function decimalToCents(amount) {
  const parsed = parseFloat(amount);
  return !isNaN(parsed) ? Math.round(parsed * 100) : 0;
}

const COINBASE_API_BASE = 'https://api.commerce.coinbase.com';

async function coinbaseFetch(path, apiKey) {
  const res = await fetch(`${COINBASE_API_BASE}${path}`, {
    headers: {
      'X-CC-Api-Key': apiKey,
      'X-CC-Version': '2018-03-22',
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) {
    throw new Error(`Coinbase Commerce API error ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

// Resolved statuses indicating a completed crypto payment
const CONFIRMED_STATUSES = new Set(['CONFIRMED', 'RESOLVED']);

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

export async function syncCoinbasePayments() {
  const db = getDb();

  const sites = db
    .prepare('SELECT id, coinbase_commerce_api_key FROM sites WHERE coinbase_commerce_api_key IS NOT NULL')
    .all();

  if (sites.length === 0) return { sites: 0, conversions: 0 };

  let totalProcessed = 0;

  for (const site of sites) {
    try {
      // Coinbase Commerce uses cursor pagination; fetch last 24 hours
      const since = new Date(Date.now() - 86400 * 1000).toISOString();
      let nextCursor = null;
      let hasMore = true;

      while (hasMore) {
        const url = nextCursor
          ? `/charges?after=${nextCursor}&limit=100`
          : `/charges?limit=100`;
        const data = await coinbaseFetch(url, site.coinbase_commerce_api_key);
        const charges = data.data || [];

        // Stop paginating once charges are older than our window
        let reachedOld = false;

        for (const charge of charges) {
          // Coinbase charges have a timeline of events
          const createdAt = charge.created_at;
          if (createdAt && createdAt < since) {
            reachedOld = true;
            break;
          }

          // Check if the charge has a confirmed/resolved payment event
          const timeline = charge.timeline || [];
          const isConfirmed = timeline.some((event) => CONFIRMED_STATUSES.has(event.status));
          if (!isConfirmed) continue;

          const chargeId = charge.id || charge.code;

          // Dedup
          const existing = db
            .prepare('SELECT id FROM conversions WHERE payment_intent_id = ? AND site_id = ?')
            .get(chargeId, site.id);
          if (existing) continue;

          const metadata = charge.metadata || {};
          const visitorId = metadata.ts_visitor_id || null;
          const sessionId = metadata.ts_session_id || null;

          const { resolvedSessionId, utmSource, utmMedium, utmCampaign, referrerDomain, affiliateId } =
            resolveAttribution(db, sessionId, visitorId, site.id);

          // Extract local price in cents
          const localPrice = charge.pricing?.local;
          const currency = (localPrice?.currency || 'usd').toLowerCase();
          const amount = decimalToCents(localPrice?.amount);

          const customerEmail = charge.metadata?.customer_email || null;

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
            chargeId,
            null,
            customerEmail,
            chargeId,
            amount,
            currency,
            'completed',
            'coinbase',
            utmSource,
            utmMedium,
            utmCampaign,
            referrerDomain,
            affiliateId
          );

          totalProcessed++;
        }

        const pagination = data.pagination || {};
        hasMore = pagination.has_next && !reachedOld && charges.length > 0;
        nextCursor = pagination.ending_cursor || null;
        if (!nextCursor) hasMore = false;
      }
    } catch (err) {
      console.error(`Coinbase Commerce sync error for site ${site.id}:`, err.message);
    }
  }

  return { sites: sites.length, conversions: totalProcessed };
}
