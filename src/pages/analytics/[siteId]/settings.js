import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import DashboardLayout from '@/components/layout/DashboardLayout';

function highlightCode(code, highlightPatterns = []) {
  let html = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const TOKEN_RE =
    /('(?:[^'\\]|\\.)*')|("(?:[^"\\]|\\.)*")|(\b(?:const|let|var|await|async|function|return|if|else|import|from|export|default|new)\b)|(&lt;\/?[\w-]+)|(\b(?:true|false|null|undefined)\b)/g;

  return html
    .split('\n')
    .map((line) => {
      const trimmed = line.trimStart();
      const isHighlighted = highlightPatterns.some((p) => trimmed.includes(p));

      let tokenized;
      if (trimmed.startsWith('//') || trimmed.startsWith('&lt;!--')) {
        tokenized = '<span class="hl-comment">' + line + '</span>';
      } else {
        tokenized = line.replace(TOKEN_RE, (match, sq, dq, kw, tag, lit) => {
          if (sq || dq) return '<span class="hl-string">' + match + '</span>';
          if (kw) return '<span class="hl-keyword">' + match + '</span>';
          if (tag) return '<span class="hl-tag">' + match + '</span>';
          if (lit) return '<span class="hl-literal">' + match + '</span>';
          return match;
        });
      }

      if (isHighlighted) {
        return '<span class="hl-line">' + tokenized + '</span>';
      }
      return tokenized;
    })
    .join('\n');
}

function CodeBlock({ code, onCopy, highlightPatterns }) {
  const highlighted = useMemo(() => highlightCode(code, highlightPatterns), [code, highlightPatterns]);
  return (
    <div className="code-block">
      <button className="copy-btn" onClick={onCopy}>Copy</button>
      <pre><code dangerouslySetInnerHTML={{ __html: highlighted }} /></pre>
    </div>
  );
}

export default function SiteSettings() {
  const router = useRouter();
  const { siteId } = router.query;

  const [site, setSite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [snippetData, setSnippetData] = useState(null);

  const [stripeSecretKey, setStripeSecretKey] = useState('');
  const [stripeSaving, setStripeSaving] = useState(false);
  const [stripeMessage, setStripeMessage] = useState('');
  const [stripeError, setStripeError] = useState('');

  const [creemApiKey, setCreemApiKey] = useState('');
  const [creemSaving, setCreemSaving] = useState(false);
  const [creemMessage, setCreemMessage] = useState('');
  const [creemError, setCreemError] = useState('');

  const [polarApiKey, setPolarApiKey] = useState('');
  const [polarSaving, setPolarSaving] = useState(false);
  const [polarMessage, setPolarMessage] = useState('');
  const [polarError, setPolarError] = useState('');

  const [coinbaseApiKey, setCoinbaseApiKey] = useState('');
  const [coinbaseSaving, setCoinbaseSaving] = useState(false);
  const [coinbaseMessage, setCoinbaseMessage] = useState('');
  const [coinbaseError, setCoinbaseError] = useState('');

  useEffect(() => {
    if (!siteId) return;
    (async () => {
      try {
        const [siteRes, snippetRes] = await Promise.all([
          fetch(`/api/sites/${siteId}`),
          fetch(`/api/sites/${siteId}/snippet`),
        ]);
        if (siteRes.ok) {
          const data = await siteRes.json();
          setSite(data.site);
          setStripeSecretKey(data.site.stripe_secret_key || '');
          setCreemApiKey(data.site.creem_api_key || '');
          setPolarApiKey(data.site.polar_api_key || '');
          setCoinbaseApiKey(data.site.coinbase_commerce_api_key || '');
        }
        if (snippetRes.ok) {
          setSnippetData(await snippetRes.json());
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [siteId]);


  const handleSaveStripe = async (e) => {
    e.preventDefault();
    setStripeSaving(true);
    setStripeMessage('');
    setStripeError('');
    try {
      const body = {};
      if (stripeSecretKey && !stripeSecretKey.startsWith('••••')) {
        body.stripe_secret_key = stripeSecretKey;
      }
      if (Object.keys(body).length === 0) {
        setStripeMessage('No changes to save');
        return;
      }
      const res = await fetch(`/api/sites/${siteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStripeSecretKey(data.site.stripe_secret_key || '');
      setStripeMessage('Stripe key saved');
    } catch (err) {
      setStripeError(err.message);
    } finally {
      setStripeSaving(false);
    }
  };

  const handleSaveCreem = async (e) => {
    e.preventDefault();
    setCreemSaving(true);
    setCreemMessage('');
    setCreemError('');
    try {
      const body = {};
      if (creemApiKey && !creemApiKey.startsWith('••••')) {
        body.creem_api_key = creemApiKey;
      }
      if (Object.keys(body).length === 0) {
        setCreemMessage('No changes to save');
        return;
      }
      const res = await fetch(`/api/sites/${siteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCreemApiKey(data.site.creem_api_key || '');
      setCreemMessage('Creem API key saved');
    } catch (err) {
      setCreemError(err.message);
    } finally {
      setCreemSaving(false);
    }
  };

  const handleSavePolar = async (e) => {
    e.preventDefault();
    setPolarSaving(true);
    setPolarMessage('');
    setPolarError('');
    try {
      const body = {};
      if (polarApiKey && !polarApiKey.startsWith('••••')) {
        body.polar_api_key = polarApiKey;
      }
      if (Object.keys(body).length === 0) {
        setPolarMessage('No changes to save');
        return;
      }
      const res = await fetch(`/api/sites/${siteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPolarApiKey(data.site.polar_api_key || '');
      setPolarMessage('Polar API key saved');
    } catch (err) {
      setPolarError(err.message);
    } finally {
      setPolarSaving(false);
    }
  };

  const handleSaveCoinbase = async (e) => {
    e.preventDefault();
    setCoinbaseSaving(true);
    setCoinbaseMessage('');
    setCoinbaseError('');
    try {
      const body = {};
      if (coinbaseApiKey && !coinbaseApiKey.startsWith('••••')) {
        body.coinbase_commerce_api_key = coinbaseApiKey;
      }
      if (Object.keys(body).length === 0) {
        setCoinbaseMessage('No changes to save');
        return;
      }
      const res = await fetch(`/api/sites/${siteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCoinbaseApiKey(data.site.coinbase_commerce_api_key || '');
      setCoinbaseMessage('Coinbase Commerce API key saved');
    } catch (err) {
      setCoinbaseError(err.message);
    } finally {
      setCoinbaseSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this site and all its data?')) return;
    await fetch(`/api/sites/${siteId}`, { method: 'DELETE' });
    router.push('/sites');
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  if (loading || !site) {
    return (
      <>
        <Head><title>Settings - Traffic Source</title></Head>
        <DashboardLayout siteId={siteId}>
          <div className="loading-inline"><div className="loading-spinner" /></div>
        </DashboardLayout>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Settings - {site.name} - Traffic Source</title>
      </Head>
      <DashboardLayout siteId={siteId} siteName={site.name} siteDomain={site.domain}>
        <h2 className="page-title">Site Settings</h2>

        {/* ── Tracking Snippet ── */}
        <div className="panel" style={{ marginBottom: 20 }}>
          <div className="panel-header">
            <div className="panel-tabs">
              <button className="panel-tab active">Tracking Code</button>
            </div>
          </div>
          <div className="panel-body" style={{ padding: 20 }}>
            {snippetData ? (
              <>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
                  Add this snippet to your website&apos;s HTML, before the closing &lt;/head&gt; tag:
                </p>
                <CodeBlock
                  code={snippetData.trackingSnippet}
                  onCopy={() => copyToClipboard(snippetData.trackingSnippet)}
                />

                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 16 }}>
                  For Stripe conversion tracking, pass the tracking cookies as metadata in your checkout:
                </p>
                <CodeBlock
                  code={snippetData.stripeSnippet}
                  onCopy={() => copyToClipboard(snippetData.stripeSnippet)}
                  highlightPatterns={['metadata', 'ts_visitor_id', 'ts_session_id']}
                />

                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 16 }}>
                  For Creem.io conversion tracking:
                </p>
                <CodeBlock
                  code={snippetData.creemSnippet}
                  onCopy={() => copyToClipboard(snippetData.creemSnippet)}
                  highlightPatterns={['metadata', 'ts_visitor_id', 'ts_session_id']}
                />

                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 16 }}>
                  For Polar.sh conversion tracking:
                </p>
                <CodeBlock
                  code={snippetData.polarSnippet}
                  onCopy={() => copyToClipboard(snippetData.polarSnippet)}
                  highlightPatterns={['metadata', 'ts_visitor_id', 'ts_session_id']}
                />

                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 16 }}>
                  For Coinbase Commerce crypto payment tracking:
                </p>
                <CodeBlock
                  code={snippetData.coinbaseSnippet}
                  onCopy={() => copyToClipboard(snippetData.coinbaseSnippet)}
                  highlightPatterns={['metadata', 'ts_visitor_id', 'ts_session_id']}
                />

                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                  Traffic Source automatically syncs payments from all providers. No webhook setup needed.
                </p>
              </>
            ) : (
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Could not load snippet data.</p>
            )}
          </div>
        </div>

        {/* ── Stripe Settings ── */}
        <div className="panel" style={{ marginBottom: 20 }}>
          <div className="panel-header">
            <div className="panel-tabs">
              <button className="panel-tab active">Stripe</button>
            </div>
          </div>
          <div className="panel-body" style={{ padding: 20 }}>
            {stripeMessage && (
              <div style={{ background: 'var(--success-light)', color: 'var(--success)', padding: '10px 14px', borderRadius: 'var(--radius)', fontSize: 13, marginBottom: 12 }}>
                {stripeMessage}
              </div>
            )}
            {stripeError && <div className="auth-error">{stripeError}</div>}
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
              Enter your Stripe Secret Key. You can find it in your Stripe Dashboard under Developers &gt; API keys.
              Traffic Source will automatically sync your payments &mdash; no webhook setup required.
            </p>
            <form onSubmit={handleSaveStripe} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label>Stripe Secret Key</label>
                <input
                  type="password"
                  value={stripeSecretKey}
                  onChange={(e) => setStripeSecretKey(e.target.value)}
                  placeholder="sk_live_..."
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={stripeSaving} style={{ alignSelf: 'flex-start' }}>
                {stripeSaving ? 'Saving...' : 'Save Key'}
              </button>
            </form>
          </div>
        </div>

        {/* ── Creem.io Settings ── */}
        <div className="panel" style={{ marginBottom: 20 }}>
          <div className="panel-header">
            <div className="panel-tabs">
              <button className="panel-tab active">Creem.io</button>
            </div>
          </div>
          <div className="panel-body" style={{ padding: 20 }}>
            {creemMessage && (
              <div style={{ background: 'var(--success-light)', color: 'var(--success)', padding: '10px 14px', borderRadius: 'var(--radius)', fontSize: 13, marginBottom: 12 }}>
                {creemMessage}
              </div>
            )}
            {creemError && <div className="auth-error">{creemError}</div>}
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
              Enter your Creem.io API Key to automatically sync payments. Find it in your Creem dashboard under Settings &gt; API.
            </p>
            <form onSubmit={handleSaveCreem} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label>Creem API Key</label>
                <input
                  type="password"
                  value={creemApiKey}
                  onChange={(e) => setCreemApiKey(e.target.value)}
                  placeholder="creem_..."
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={creemSaving} style={{ alignSelf: 'flex-start' }}>
                {creemSaving ? 'Saving...' : 'Save Key'}
              </button>
            </form>
          </div>
        </div>

        {/* ── Polar.sh Settings ── */}
        <div className="panel" style={{ marginBottom: 20 }}>
          <div className="panel-header">
            <div className="panel-tabs">
              <button className="panel-tab active">Polar.sh</button>
            </div>
          </div>
          <div className="panel-body" style={{ padding: 20 }}>
            {polarMessage && (
              <div style={{ background: 'var(--success-light)', color: 'var(--success)', padding: '10px 14px', borderRadius: 'var(--radius)', fontSize: 13, marginBottom: 12 }}>
                {polarMessage}
              </div>
            )}
            {polarError && <div className="auth-error">{polarError}</div>}
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
              Enter your Polar.sh API Key to automatically sync orders. Find it in your Polar dashboard under Settings &gt; Developers.
            </p>
            <form onSubmit={handleSavePolar} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label>Polar API Key</label>
                <input
                  type="password"
                  value={polarApiKey}
                  onChange={(e) => setPolarApiKey(e.target.value)}
                  placeholder="polar_..."
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={polarSaving} style={{ alignSelf: 'flex-start' }}>
                {polarSaving ? 'Saving...' : 'Save Key'}
              </button>
            </form>
          </div>
        </div>

        {/* ── Coinbase Commerce Settings ── */}
        <div className="panel" style={{ marginBottom: 20 }}>
          <div className="panel-header">
            <div className="panel-tabs">
              <button className="panel-tab active">Coinbase Commerce</button>
            </div>
          </div>
          <div className="panel-body" style={{ padding: 20 }}>
            {coinbaseMessage && (
              <div style={{ background: 'var(--success-light)', color: 'var(--success)', padding: '10px 14px', borderRadius: 'var(--radius)', fontSize: 13, marginBottom: 12 }}>
                {coinbaseMessage}
              </div>
            )}
            {coinbaseError && <div className="auth-error">{coinbaseError}</div>}
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
              Enter your Coinbase Commerce API Key to automatically sync crypto payments. Find it in your Coinbase Commerce dashboard under Settings &gt; API keys.
            </p>
            <form onSubmit={handleSaveCoinbase} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label>Coinbase Commerce API Key</label>
                <input
                  type="password"
                  value={coinbaseApiKey}
                  onChange={(e) => setCoinbaseApiKey(e.target.value)}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={coinbaseSaving} style={{ alignSelf: 'flex-start' }}>
                {coinbaseSaving ? 'Saving...' : 'Save Key'}
              </button>
            </form>
          </div>
        </div>

        {/* ── Danger Zone ── */}
        <div className="panel" style={{ borderColor: 'var(--danger, #e53e3e)' }}>
          <div className="panel-header">
            <div className="panel-tabs">
              <button className="panel-tab active" style={{ color: 'var(--danger, #e53e3e)' }}>Danger Zone</button>
            </div>
          </div>
          <div className="panel-body" style={{ padding: 20 }}>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
              Permanently delete <strong>{site.name}</strong> and all its analytics data. This action cannot be undone.
            </p>
            <button className="btn btn-danger" onClick={handleDelete}>
              Delete Site
            </button>
          </div>
        </div>

      </DashboardLayout>
    </>
  );
}
