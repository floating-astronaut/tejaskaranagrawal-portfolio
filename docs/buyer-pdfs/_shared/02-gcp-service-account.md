# Chapter — GCP Service Account: the one credential 4 of 6 agents need

> **Used by:** AI Ads Agent (GA4 + Google Ads), AI Sales Agent (Gmail send), AI SEO Agent (GSC + GA4), AI Social Media Agent (Google Drive asset library, optional).
>
> You will create **one** service account in **one** GCP project and reuse it across every agent that needs Google APIs. Don't create per-agent service accounts; you'll lose track of the credentials.

---

## Why a service account (and not OAuth)

OAuth is what consumer apps use — humans click "Continue with Google" and grant access from their account. That's wrong for an unattended agent, because:

- OAuth refresh tokens expire when the human resets their password or revokes the app.
- The agent can't run while you're asleep if it needs an interactive flow.
- The token has the *user's* permissions, which usually exceed what the agent should have.

A **service account** is a Google-owned identity (looks like an email: `something@your-project.iam.gserviceaccount.com`) that the agent authenticates as. It has its own permission grants on each property (GA4, Search Console, etc.) that you control granularly.

Server-to-server. No expiry. No user in the loop after setup.

---

## Step 1 — Create the GCP project

If you don't have a GCP project yet:

1. Go to **https://console.cloud.google.com**
2. Click the project dropdown at the top of the page → **New Project**
3. Project name: `glitch-grow-agents` (any name; the *project ID* is what matters and you'll see it under the name)
4. **Don't link a billing account** if all the APIs you'll use are free (GSC, GA4, Sheets, Gmail are; PageSpeed is). Add billing only when you adopt a paid API like Vertex AI.
5. Click **Create**

The project ID (something like `glitch-grow-agents-481234`) is what you'll paste into `.env`.

---

## Step 2 — Enable the APIs you'll use

Depending on which agents you're installing, enable these APIs. **Each API is a separate enablement** — Google charges nothing for enabling, only for quota you actually consume.

In the console: **APIs & Services** → **Library** → search and click **Enable**:

| Agent | API to enable |
|---|---|
| AI Ads Agent | Google Ads API, Google Analytics Data API |
| AI Sales Agent | Gmail API, Admin SDK API |
| AI SEO Agent | Search Console API, Google Analytics Data API, PageSpeed Insights API |
| AI Social Media Agent (optional) | Google Drive API, Google Sheets API |

Enable them all in one sitting. You can re-enable additions later from the same Library page.

---

## Step 3 — Create the service account

1. **IAM & Admin** → **Service Accounts** → **Create Service Account**
2. Service account name: `glitch-agent` (or any name)
3. Description: "Used by Glitch Grow agents to read GA4/GSC/Ads and send Gmail"
4. **Don't grant any project-level roles** in the next step. The service account gets its permissions on each Google property individually (GSC site, GA4 property, etc.), not via project IAM. Skip "Grant access to this service account."
5. Skip "Grant users access" too.
6. **Done**.

You'll now see the SA listed with an email like `glitch-agent@your-project-id.iam.gserviceaccount.com`. **Copy this email**; you'll paste it into every Google property you want the agent to read.

---

## Step 4 — Generate the JSON key

1. Click the service account → **Keys** tab → **Add Key** → **Create new key**
2. Key type: **JSON**
3. Click **Create** — a JSON file downloads to your laptop.

This file looks like:

```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "glitch-agent@your-project-id.iam.gserviceaccount.com",
  ...
}
```

**Treat this file like a password.** Anyone with this JSON can act as the service account. Concretely:

- Move it to `~/.glitch/service-account.json` on the host the agent runs on (or wherever your secret-store puts it).
- `chmod 600` so only your user can read it.
- **Never commit it to git.** The agent's `.gitignore` covers `credentials/` and `*.json` but verify.
- If you lose the file, generate a new key. Old keys keep working until you delete them from the Keys tab.

The path to this file goes into `.env`:

```
GCP_SERVICE_ACCOUNT_JSON=/home/your-user/.glitch/service-account.json
```

(Some agents read the JSON contents directly. Either env var name will work; the agent docs spell out which.)

---

## Step 5 — Grant per-property access

Now the SA email gets added to each Google property the agent should read. **One pass per property.**

### Search Console (BSK-006)

1. Go to **search.google.com/search-console**.
2. Select the property (`https://your-store.com` or `sc-domain:your-store.com`).
3. **Settings** (gear icon) → **Users and permissions** → **Add user**.
4. Email: paste the SA email.
5. Permission: **Owner** (Full required for write paths the agent uses for sitemap submission; pick "Full" otherwise).
6. **Add**.

If you manage multiple sites, repeat per site. The agent's `fleet.json` config lists them all and the agent will iterate.

### GA4 Property (BSK-002, BSK-006)

1. Go to **analytics.google.com**.
2. Pick the property in the top selector.
3. **Admin** (bottom-left) → in the **Property** column → **Property access management**.
4. **+** in the top-right → **Add users**.
5. Email: paste the SA email.
6. Role: **Viewer** (Analyst if the agent writes audiences; the agent doesn't, so Viewer is enough).
7. **Add**.

Repeat per property.

### Google Ads Account (BSK-002)

This one is slightly different — Google Ads doesn't use the SA pattern directly. You need a **Google Ads Developer Token** plus OAuth-style auth, OR a "Manager Account" (MCC) that grants the SA programmatic access.

The cleanest path:
1. Apply for a Developer Token: **Google Ads** → **Tools & Settings** → **API Center** → **Apply for Basic access**. Approval is usually same-day.
2. Create an MCC: **Google Ads** → top-right → **Create manager account**. Free.
3. Link your client ad accounts to the MCC (the agent's docs walk you through the link-request flow per client).
4. The agent uses the developer token + a refresh token bound to the SA. The repo's setup script generates this; you only need the developer token in `.env`.

```
GOOGLE_ADS_DEVELOPER_TOKEN=your-token
GOOGLE_ADS_LOGIN_CUSTOMER_ID=your-mcc-id
```

### Gmail (BSK-003)

Gmail send via service account uses **domain-wide delegation**. This is the trickiest setup — it requires Google Workspace (not a free `@gmail.com`).

1. In your Google Workspace **admin.google.com**, go to **Security** → **API controls** → **Domain-wide delegation**.
2. **Add new** — paste the SA's *Client ID* (a 21-digit number on the SA detail page, NOT the email).
3. OAuth scopes (comma-separated): `https://www.googleapis.com/auth/gmail.send`
4. **Authorize**.
5. In `.env`: `GMAIL_IMPERSONATE_USER=outbound@your-domain.com` — the SA will send emails AS this address.

The `outbound@` user must exist in your workspace. Use a dedicated account per agency tenant — the Sent folder + Reply tracking accrue there.

---

## Step 6 — Verify

Each agent ships a verification script. Run it before the smoke test:

```bash
# BSK-006 SEO
pnpm gsc:test --site https://your-store.com
pnpm ga4:test

# BSK-002 Ads
pnpm meta:test
# (Google Ads test ships separately)

# BSK-003 Sales
pnpm gmail:test --to your-personal@email.com
```

If you see `403 user does not have access`, the SA email isn't on that property — go back to Step 5 and add it. The error message names the property URL so you can match it back.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `403 user does not have access` | SA email not added to property | Step 5 for the named property |
| `googleapis 401` | JSON key file path wrong, or file unreadable | `cat $GCP_SERVICE_ACCOUNT_JSON \| jq .type` should print `service_account` |
| `Domain-wide delegation not enabled` (Gmail) | Step 5 / Gmail not completed | Workspace admin → Security → API controls; paste Client ID + scope |
| `quotaExceeded` | Free tier exhausted | Check quota in IAM & Admin → Quotas; for GA4 specifically you may be hitting per-property daily limits — request bump via console |
| Key worked yesterday, fails today | Key revoked, OR project disabled (billing) | Re-check the SA Keys tab; re-check Billing if you'd previously linked it |

---

## Security checklist

Before going live with real client data:

- [ ] JSON key file `chmod 600`, owned by the service user
- [ ] `.env` not committed (`git status` shows no `.env`)
- [ ] One SA per agency (not per-client); rotate annually
- [ ] Per-property access uses minimum permission (Viewer/Owner only where needed)
- [ ] Document which SA email is on which property — a 5-row spreadsheet saves you a future audit headache
- [ ] If you ever offboard a client: remove the SA from their property in the same session you hand them their data back

---

## What this saves you

Without a service account flow, every Google integration in the agent would require:
- A human clicking "Continue with Google"
- An OAuth callback URL hosted somewhere
- Refresh-token rotation logic
- Per-user permission inconsistencies

The SA flow is one-time setup, then the agent runs unattended forever. Operators routinely point to this as the biggest "I'm glad you set this up" moment in the install. The 30 minutes you spend now buys 5 years of headless operation.
