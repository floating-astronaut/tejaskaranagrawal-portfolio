#!/usr/bin/env node
/**
 * One-time setup: create a new Google Sheet for vibe-kit leads, set headers,
 * share editor access with support@glitchexecutor.com.
 *
 * Idempotent — if a sheet titled "Glitch Grow — Vibe Kit Leads" already
 * exists in the SA's Drive, reuses it instead of creating a duplicate.
 *
 * Usage:
 *   node scripts/setup-leads-sheet.mjs
 *
 * Reads the service-account JSON from:
 *   /home/support/glitch-social-media-agent/credentials/drive-sa.json
 *
 * Output: prints `SHEETS_LEADS_ID=...` line. Copy into Cloudflare Pages env
 * so /api/capture-lead can append rows to it.
 */
import { readFileSync } from 'node:fs';
import { google } from 'googleapis';

const SA_PATH = '/home/support/glitch-social-media-agent/credentials/drive-sa.json';
const SHEET_TITLE = 'Glitch Grow — Vibe Kit Leads';
const SHARE_WITH = 'support@glitchexecutor.com';

const HEADERS = [
  'timestamp',
  'event_id',
  'name',
  'email',
  'phone',
  'profession',
  'utm_source',
  'country',
  'ip',
  'ua',
  'ref',
];

const sa = JSON.parse(readFileSync(SA_PATH, 'utf8'));
const auth = new google.auth.JWT({
  email: sa.client_email,
  key: sa.private_key,
  scopes: [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive',
  ],
});

const drive = google.drive({ version: 'v3', auth });
const sheets = google.sheets({ version: 'v4', auth });

async function findExisting() {
  const res = await drive.files.list({
    q: `mimeType='application/vnd.google-apps.spreadsheet' and name='${SHEET_TITLE}' and trashed=false`,
    fields: 'files(id, name, webViewLink)',
    pageSize: 1,
  });
  return res.data.files?.[0];
}

async function createNew() {
  const created = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title: SHEET_TITLE },
      sheets: [{ properties: { title: 'leads' } }],
    },
    fields: 'spreadsheetId,spreadsheetUrl',
  });
  const id = created.data.spreadsheetId;

  // Write headers
  await sheets.spreadsheets.values.update({
    spreadsheetId: id,
    range: "'leads'!A1",
    valueInputOption: 'RAW',
    requestBody: { values: [HEADERS] },
  });

  // Bold the header row
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: id,
    requestBody: {
      requests: [{
        repeatCell: {
          range: { sheetId: 0, startRowIndex: 0, endRowIndex: 1 },
          cell: { userEnteredFormat: { textFormat: { bold: true } } },
          fields: 'userEnteredFormat.textFormat.bold',
        },
      }, {
        updateSheetProperties: {
          properties: { sheetId: 0, gridProperties: { frozenRowCount: 1 } },
          fields: 'gridProperties.frozenRowCount',
        },
      }],
    },
  });

  return { id, url: created.data.spreadsheetUrl };
}

async function ensureShared(fileId) {
  // Check existing perms
  const perms = await drive.permissions.list({
    fileId,
    fields: 'permissions(id, emailAddress, role, type)',
  });
  const already = perms.data.permissions?.find(
    (p) => p.emailAddress === SHARE_WITH && (p.role === 'writer' || p.role === 'owner'),
  );
  if (already) {
    console.log(`✓ Already shared with ${SHARE_WITH} (${already.role})`);
    return;
  }
  await drive.permissions.create({
    fileId,
    sendNotificationEmail: false,
    requestBody: {
      type: 'user',
      role: 'writer',
      emailAddress: SHARE_WITH,
    },
  });
  console.log(`✓ Shared editor access with ${SHARE_WITH}`);
}

async function main() {
  console.log(`Looking for existing sheet "${SHEET_TITLE}"…`);
  let existing = await findExisting();
  let id, url;

  if (existing) {
    id = existing.id;
    url = existing.webViewLink;
    console.log(`✓ Sheet exists: ${id}`);
  } else {
    console.log('Sheet not found, creating…');
    const created = await createNew();
    id = created.id;
    url = created.url;
    console.log(`✓ Sheet created: ${id}`);
  }

  await ensureShared(id);

  console.log('');
  console.log(`SHEETS_LEADS_ID=${id}`);
  console.log(`URL: ${url}`);
  console.log('');
  console.log('Add SHEETS_LEADS_ID to your Cloudflare Pages env (Production + Preview).');
  console.log('SA email (already has access via creation): ' + sa.client_email);
}

main().catch((err) => {
  console.error('Failed:', err?.errors ?? err?.message ?? err);
  process.exit(1);
});
