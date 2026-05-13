// Shared OG card templates. Returned as `satori-html` vnodes.
// Kept pure so the endpoint is easy to test in isolation.

import { html } from 'satori-html';

export interface OgParams {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  accent?: string; // hex
  bg?: string;    // hex
}

// Inline SVG cobra badge — keeps the OG card self-contained, no network fetches.
const cobraBadge = `
  <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="#00ff88" stroke-width="1.5"
       stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 20c-4 0-6-2-6-5s2-4 4-4 3 1 3 2.5-1 2-2 2-1.5-.5-1.5-1" />
    <path d="M12 20c4 0 6-2 6-5s-2-4-4-4-3 1-3 2.5 1 2 2 2 1.5-.5 1.5-1" />
    <path d="M12 11V4" />
    <path d="M10 6c0-1 1-2 2-2s2 1 2 2" />
    <circle cx="10.5" cy="7.5" r="0.4" fill="#00ff88" />
    <circle cx="13.5" cy="7.5" r="0.4" fill="#00ff88" />
  </svg>`;

export function ogTemplate({
  eyebrow = 'Glitch Grow',
  title,
  subtitle = 'AI-Powered Digital Marketing That Scales',
  accent = '#00ff88',
  bg = '#0a0a0f',
}: OgParams) {
  const markup = `
    <div style="
      height: 100%; width: 100%; display: flex; flex-direction: column;
      background: ${bg};
      background-image: radial-gradient(circle at 80% 10%, rgba(0,255,136,0.18), transparent 55%),
                        radial-gradient(circle at 10% 90%, rgba(0,136,255,0.15), transparent 55%);
      color: #F5F7FA;
      padding: 72px 80px;
      font-family: 'Inter Tight', sans-serif;
    ">
      <div style="display: flex; align-items: center; gap: 18px;">
        ${cobraBadge}
        <div style="display: flex; flex-direction: column;">
          <span style="font-family: 'Geist Mono', monospace; font-size: 20px; letter-spacing: 0.1em;
                        text-transform: uppercase; color: ${accent};">
            ${eyebrow}
          </span>
          <span style="font-size: 20px; color: #9ca3af; margin-top: 4px;">
            grow.glitchexecutor.com
          </span>
        </div>
      </div>

      <div style="flex: 1; display: flex; flex-direction: column; justify-content: flex-end;">
        <div style="font-size: 72px; line-height: 1.05; font-weight: 800; letter-spacing: -0.03em; display: flex;">
          ${escapeHtml(title)}
        </div>
        <div style="margin-top: 24px; font-size: 28px; color: #9ca3af; line-height: 1.35; display: flex;">
          ${escapeHtml(subtitle)}
        </div>
      </div>

      <div style="margin-top: 40px; display: flex; align-items: center; justify-content: space-between;
                   font-family: 'Geist Mono', monospace; font-size: 18px; color: #6b7280;">
        <span>© Glitch Executor</span>
        <span style="color: ${accent};">support@glitchexecutor.com</span>
      </div>
    </div>
  `;
  return html(markup);
}

function escapeHtml(s: string) {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
