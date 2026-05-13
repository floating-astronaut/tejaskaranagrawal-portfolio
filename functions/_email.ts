/**
 * Per-site branded email templates used by CF Pages Functions.
 *
 * This file is duplicated across the four marketing-site repos
 * (glitch-grow-site, glitch-edge-site, glitch-trade-site,
 *  glitchexecutor-portfolio). Only the BRAND object differs between repos;
 * the rendering functions are identical. If you change the template design
 * in one repo, mirror it to the other three.
 *
 * Files starting with `_` under /functions/ are not exposed as routes by
 * Cloudflare Pages — they're module-only. See
 * https://developers.cloudflare.com/pages/functions/routing/
 */

export interface BrandTheme {
  /** Product brand name, e.g. 'Glitch Grow'. */
  name: string;
  /** Canonical site URL, e.g. 'https://grow.glitchexecutor.com'. */
  siteUrl: string;
  /** One-line product tagline used in auto-reply body. */
  tagline: string;
  /** Primary brand hex, e.g. '#00ff88'. */
  accent: string;
  /** Text colour that sits on top of `accent` for CTA buttons. */
  accentInk: string;
  /** Support contact email — `to` address for admin notifications. */
  supportEmail: string;
  /** Absolute URL to a brand mascot/logo image (<=256px recommended). */
  mascotUrl: string;
}

export const BRAND: BrandTheme = {
  name:         'Glitch Grow',
  siteUrl:      'https://grow.glitchexecutor.com',
  tagline:      'AI tools for e-commerce operators who run their own growth stack.',
  accent:       '#00ff88',
  accentInk:    '#062816',
  supportEmail: 'support@glitchexecutor.com',
  mascotUrl:    'https://grow.glitchexecutor.com/assets/brand/mascot-256.png',
};

export interface ContactPayload {
  name: string;
  email: string;
  company: string;
  message: string;
}

export interface RequestContext {
  ip: string;
  ua: string;
  ref: string;
  ts: string;
  site: string;
}

export interface RenderedEmail {
  subject: string;
  text: string;
  html: string;
}

/* ──────────────────────────────────────────────────────────────────────
 * Admin notification — what YOU see in the support@ inbox when a visitor
 * submits the contact form on this site.
 * ────────────────────────────────────────────────────────────────────── */
export function renderNotification(p: ContactPayload, ctx: RequestContext): RenderedEmail {
  const subject = `[${BRAND.name}] New contact from ${p.name}`;

  const text =
`New contact from ${BRAND.name} (${ctx.site})

Name:     ${p.name}
Email:    ${p.email}
Company:  ${p.company || '—'}

Message:
${p.message}

────────────────────────────
Received: ${ctx.ts}
IP:       ${ctx.ip || '—'}
UA:       ${ctx.ua || '—'}
Referer:  ${ctx.ref || '—'}
Reply directly to this email to reach ${p.name}.
`;

  const html =
`<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f6f7f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#0a0a0f;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f6f7f9;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(10,10,15,0.08);">

        <!-- Brand header -->
        <tr>
          <td style="background:${BRAND.accent};padding:20px 28px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td style="vertical-align:middle;">
                  <img src="${BRAND.mascotUrl}" width="36" height="36" alt="" style="display:block;border-radius:8px;">
                </td>
                <td style="vertical-align:middle;padding-left:12px;">
                  <div style="font-size:13px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:${BRAND.accentInk};">${esc(BRAND.name)}</div>
                  <div style="font-size:11px;color:${BRAND.accentInk};opacity:.75;">${esc(ctx.site)}</div>
                </td>
                <td align="right" style="vertical-align:middle;font-size:11px;color:${BRAND.accentInk};opacity:.75;">New contact</td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Body -->
        <tr><td style="padding:28px;">
          <h1 style="margin:0 0 4px 0;font-size:20px;font-weight:700;letter-spacing:-.01em;">${esc(p.name)}</h1>
          <p style="margin:0 0 20px 0;color:#6b7280;font-size:14px;">
            <a href="mailto:${esc(p.email)}" style="color:#0088ff;text-decoration:none;">${esc(p.email)}</a>${p.company ? ` · ${esc(p.company)}` : ''}
          </p>

          <div style="padding:16px 18px;background:#f6f7f9;border-left:3px solid ${BRAND.accent};border-radius:4px;white-space:pre-wrap;font-size:14px;line-height:1.6;color:#111827;">${esc(p.message)}</div>

          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:24px;">
            <tr><td style="padding:4px 0;">
              <a href="mailto:${esc(p.email)}?subject=Re%3A%20Your%20message%20to%20${encodeURIComponent(BRAND.name)}"
                 style="display:inline-block;background:${BRAND.accent};color:${BRAND.accentInk};padding:10px 18px;border-radius:999px;font-size:14px;font-weight:600;text-decoration:none;">
                Reply to ${esc(p.name.split(' ')[0] || p.name)}
              </a>
            </td></tr>
          </table>
        </td></tr>

        <!-- Metadata footer -->
        <tr><td style="padding:16px 28px 24px 28px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;line-height:1.6;">
          Received ${esc(ctx.ts)}<br>
          IP: ${esc(ctx.ip || '—')} · Referer: ${esc(ctx.ref || '—')}<br>
          ${esc(ctx.ua || '—')}
        </td></tr>
      </table>

      <p style="margin:16px 0 0 0;font-size:11px;color:#9ca3af;">
        Sent automatically by <a href="${BRAND.siteUrl}" style="color:#9ca3af;text-decoration:underline;">${esc(BRAND.siteUrl.replace(/^https?:\/\//, ''))}</a>.
      </p>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject, text, html };
}

/* ──────────────────────────────────────────────────────────────────────
 * Auto-reply — optional branded "thanks, we got your message" sent back
 * to the visitor who submitted the form. Enabled by setting env var
 * RESEND_AUTOREPLY=true.
 * ────────────────────────────────────────────────────────────────────── */
export function renderAutoReply(p: ContactPayload): RenderedEmail {
  const firstName = (p.name.split(' ')[0] || p.name).trim();
  const subject = `We got your message — ${BRAND.name}`;

  const text =
`Hi ${firstName},

Thanks for reaching out to ${BRAND.name}. We've received your message and a human will reply within one business day.

For reference, here's what you sent:

    ${p.message.split('\n').join('\n    ')}

If it's urgent, reply to this email directly — replies land in our support inbox.

— The ${BRAND.name} team
${BRAND.siteUrl}
`;

  const html =
`<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f6f7f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#0a0a0f;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f6f7f9;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(10,10,15,0.08);">

        <tr>
          <td style="background:${BRAND.accent};padding:28px;" align="center">
            <img src="${BRAND.mascotUrl}" width="56" height="56" alt="${esc(BRAND.name)}" style="display:inline-block;border-radius:12px;">
            <div style="font-size:15px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:${BRAND.accentInk};margin-top:10px;">${esc(BRAND.name)}</div>
          </td>
        </tr>

        <tr><td style="padding:32px 28px;">
          <h1 style="margin:0 0 12px 0;font-size:22px;font-weight:700;letter-spacing:-.01em;">Got it, ${esc(firstName)} 👋</h1>
          <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#374151;">
            Thanks for reaching out to <strong>${esc(BRAND.name)}</strong>. Your message is in our queue and a human will reply within one business day.
          </p>
          <p style="margin:0 0 24px 0;font-size:15px;line-height:1.6;color:#374151;">
            ${esc(BRAND.tagline)}
          </p>

          <div style="padding:14px 18px;background:#f6f7f9;border-left:3px solid ${BRAND.accent};border-radius:4px;font-size:14px;line-height:1.6;color:#4b5563;white-space:pre-wrap;">
<strong style="color:#0a0a0f;">Your message</strong>
${esc(p.message)}
          </div>

          <p style="margin:24px 0 0 0;font-size:13px;color:#6b7280;line-height:1.6;">
            If it's urgent, reply to this email directly — replies land in our support inbox.
          </p>
        </td></tr>

        <tr><td style="padding:16px 28px 24px 28px;border-top:1px solid #e5e7eb;font-size:12px;color:#9ca3af;text-align:center;">
          <a href="${BRAND.siteUrl}" style="color:#9ca3af;text-decoration:none;">${esc(BRAND.siteUrl.replace(/^https?:\/\//, ''))}</a>
          &nbsp;·&nbsp;
          <a href="mailto:${esc(BRAND.supportEmail)}" style="color:#9ca3af;text-decoration:none;">${esc(BRAND.supportEmail)}</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject, text, html };
}

/* ── HTML escape ─────────────────────────────────────────────────────── */
function esc(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) => (
    c === '&' ? '&amp;' :
    c === '<' ? '&lt;'  :
    c === '>' ? '&gt;'  :
    c === '"' ? '&quot;' :
                '&#39;'
  ));
}
