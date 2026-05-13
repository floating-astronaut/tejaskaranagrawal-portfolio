/**
 * Cloudflare Pages Function — GET /amazon/oauth/callback
 *
 * Target of the Amazon LWA redirect after a user clicks "Allow" on the
 * consent screen. Amazon hits this URL with `?code=X&state=Y`.
 *
 * Responsibilities:
 *   1. Extract code + state from the query string.
 *   2. Forward them (server-to-server) to the agent at
 *      https://insights.glitchexecutor.com/api/amazon/oauth/receive
 *      authenticated with INTERNAL_API_SECRET.
 *   3. Render a lightweight success/error HTML page for the user.
 *
 * Why a Cloudflare Function instead of terminating server-side on our VM:
 *   Amazon's LWA "Allowed Return URLs" must match exactly. We chose
 *   grow.glitchexecutor.com for the OAuth callback because that's the
 *   product-level brand surface — but grow.glitchexecutor.com is a static
 *   Astro site on CF Pages. This function bridges the static site to the
 *   dynamic agent backend.
 *
 * Env (set in Cloudflare Pages dashboard → Settings → Environment variables):
 *   AGENT_BASE_URL        — https://insights.glitchexecutor.com
 *   INTERNAL_API_SECRET   — shared with the agent's .env; used in Bearer auth
 *
 * No third-party SDKs — just `fetch`, so it stays under the CF free-tier
 * CPU budget.
 */

interface Env {
  AGENT_BASE_URL: string;         // e.g. "https://insights.glitchexecutor.com"
  INTERNAL_API_SECRET: string;    // shared secret with the agent
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const code          = url.searchParams.get("code")  || "";
  const state         = url.searchParams.get("state") || "";
  const errorCode     = url.searchParams.get("error") || "";
  const errorDetail   = url.searchParams.get("error_description") || "";

  // Amazon may redirect with ?error=... if the user declines consent.
  if (errorCode) {
    return htmlResponse(
      500,
      renderPage({
        ok: false,
        title: "Authorization declined",
        detail: `Amazon returned: ${errorCode} — ${errorDetail || "no additional detail"}. If you declined by accident, start over from the consent link.`,
      }),
    );
  }

  if (!code || !state) {
    return htmlResponse(
      400,
      renderPage({
        ok: false,
        title: "Missing code or state",
        detail: "This URL was hit without the expected ?code=...&state=... parameters. This usually means you opened the callback URL directly instead of clicking through the consent flow.",
      }),
    );
  }

  const base = (context.env.AGENT_BASE_URL || "").replace(/\/$/, "");
  const secret = context.env.INTERNAL_API_SECRET || "";
  if (!base || !secret) {
    return htmlResponse(
      503,
      renderPage({
        ok: false,
        title: "Server not configured",
        detail: "The Cloudflare Pages environment is missing AGENT_BASE_URL or INTERNAL_API_SECRET. Contact the operator.",
      }),
    );
  }

  // Forward to the agent for real token exchange + persistence.
  let forwardOk = false;
  let resultSummary = "";
  try {
    const resp = await fetch(`${base}/api/amazon/oauth/receive`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${secret}`,
      },
      body: JSON.stringify({ code, state }),
    });
    const body = await resp.json().catch(() => ({} as Record<string, unknown>));
    if (resp.ok && (body as { ok?: boolean }).ok) {
      forwardOk = true;
      resultSummary = `Token stored · account_ref=${(body as any).account_ref} · scope=${(body as any).scope || "(default)"}`;
    } else {
      resultSummary = `Agent responded ${resp.status}: ${JSON.stringify(body).slice(0, 300)}`;
    }
  } catch (err) {
    resultSummary = `Transport error talking to agent: ${String(err).slice(0, 300)}`;
  }

  return htmlResponse(
    forwardOk ? 200 : 500,
    renderPage({
      ok: forwardOk,
      title: forwardOk ? "Amazon Ads authorization complete" : "Authorization failed",
      detail: forwardOk
        ? `You can close this tab. ${resultSummary}`
        : resultSummary,
    }),
  );
};

function htmlResponse(status: number, html: string): Response {
  return new Response(html, {
    status,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });
}

function renderPage({ ok, title, detail }: { ok: boolean; title: string; detail: string }): string {
  const colorBar = ok ? "#00b864" : "#dc2626";
  const icon     = ok ? "✓" : "✗";
  const safeTitle  = escape(title);
  const safeDetail = escape(detail);
  return `<!doctype html>
<html lang="en"><head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Amazon Ads · ${safeTitle}</title>
  <style>
    :root { color-scheme: dark light; }
    body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
           font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
           background: #0a0a0f; color: #fafafa; padding: 20px; }
    .card { max-width: 520px; width: 100%; background: #12121a; border: 1px solid #1e1e2e;
            border-radius: 12px; padding: 28px 28px 24px 28px; border-left: 4px solid ${colorBar}; }
    .icon { font-size: 32px; color: ${colorBar}; margin-bottom: 10px; }
    h1 { font-size: 20px; margin: 0 0 10px 0; font-weight: 600; }
    p { color: #9ca3af; line-height: 1.6; font-size: 14px; margin: 0 0 14px 0; }
    .small { font-size: 11px; color: #6b7280; margin-top: 20px; }
    code { background: #181822; padding: 2px 6px; border-radius: 4px; font-family: ui-monospace, SFMono-Regular, monospace; font-size: 12px; color: #00b864; }
  </style>
</head><body>
  <div class="card">
    <div class="icon">${icon}</div>
    <h1>${safeTitle}</h1>
    <p>${safeDetail}</p>
    <p class="small">Glitch Grow · Amazon Ads integration · <code>grow.glitchexecutor.com/amazon/oauth/callback</code></p>
  </div>
</body></html>`;
}

function escape(s: string): string {
  return s.replace(/[&<>"']/g, (ch) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch] as string),
  );
}
