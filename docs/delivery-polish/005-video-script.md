# BSK-005 — Walkthrough video script

**Target length:** 8 minutes. **Title:** *Voice AI for Indian Shopify — ₹3 a call instead of ₹15, in 10 languages.*

## Beat 0 — Cold open (0:00–0:30)
**On screen:** a real (de-identified) phone-call recording playing — Priya calls a customer in Hindi-English Hinglish, customer confirms COD order, agent tags Shopify order. Conversation is ~45 seconds.
**VO:** "That's a real call — agent confirming a COD order in Hinglish, before the parcel ships. Two cents of compute. Cuts return-to-origin by 25 to 40 percent. The full LiveKit + Sarvam + ElevenLabs stack — yours to deploy."

## Beat 1 — What's running (0:30–1:15)
**On screen:** architecture diagram from the README. Shopify webhook → 10-min delay → LiveKit room → Sarvam STT → GPT-4o-mini → ElevenLabs TTS → tool call → Shopify GraphQL. R2 recording in the corner.
**VO:** "Shopify orders fire a webhook. Ten-minute delay because customers want to think. DND-aware scheduler so you don't call at 11pm. LiveKit places the call over Exotel SIP. Sarvam transcribes ten Indian languages. GPT-4o-mini reasons. ElevenLabs speaks. Recording goes to R2. Outcome tags fire back to Shopify."

## Beat 2 — Install (1:15–3:00)
**On screen:** terminal — clone, `./scripts/quickstart.sh`. Script detects Node 20 + pnpm, prompts for LiveKit URL/key/secret, Sarvam key, ElevenLabs key + voice ID, Postgres URL, Exotel credentials. Runs `pnpm install`, then `pnpm prefetch:turn-detector` (the cache trap), then `pnpm prisma migrate deploy`.
**VO:** "Quickstart wires the eight required keys, installs with pnpm — not npm, this matters — pre-fetches the HuggingFace turn-detector model so your first call doesn't lag thirty seconds, runs the Prisma migrations. About four minutes total."

## Beat 3 — Smoke test (3:00–4:00)
**On screen:** `pnpm test:hello` — spins up an in-process LiveKit room, agent says "नमस्ते, मैं प्रिया बोल रही हूँ" once, transcript prints. Then `pnpm dispatch:dry-run` — shows what would be called given current orders, no PSTN. Then `pnpm test:call --to=+91XXXXXXXXXX` — agent actually calls the operator's phone.
**VO:** "Three smoke tests, ascending. Hello — agent speaks once, transcript confirms. Dry-run — scheduler shows what it would dispatch, zero PSTN. Test-call — real call to your phone using a fixture order. By the third, you know the entire stack works."

## Beat 4 — Connect Shopify (4:00–5:00)
**On screen:** Shopify admin → notifications → webhooks → orders/create → URL = `https://your-host.com/shopify/webhook/myshop`. Custom App API secret pasted into `SHOPIFY_WEBHOOK_SECRETS` map. Place a real test order from a sandbox Shopify store. Webhook arrives, scheduler queues the call, ten minutes later (skipped via override) the call dispatches.
**VO:** "One webhook per shop, one secret per shop, JSON map keys on the myshopify domain. Multi-tenant from day one — five merchants on one deployment, each with its own secret."

## Beat 5 — The configuration trap (5:00–5:45)
**On screen:** ElevenLabs API key fails with `permission denied: voices:read`. Show the dashboard — scoped key without the right permissions. Generate a full-permission key, swap, agent works.
**VO:** "The trap that costs everyone an hour the first time: ElevenLabs scoped keys silently fail on the multi-stream WebSocket path if `voices:read` isn't included. Use a full-permission key, or scope it to voices:read + voices:write + text-to-speech."

## Beat 6 — How to monetise (5:45–7:30)
**On screen:** `/docs/playbook/unit-economics.xlsx` — spreadsheet showing per-call cost breakdown ($0.02 raw → ₹3-5 retail).
**VO:** "Unit economics. Two cents raw per minute. Sell at three to five rupees per call to Shopify merchants. One mid-volume merchant doing 5,000 orders a month at three rupees a call is fifteen thousand rupees a month. Ten merchants on this same VM is one and a half lakh — your pack pays itself off in week one."

**Three pricing modes:**
- Per-call retail to merchants — ₹3 to ₹5 per call
- White-label seat to agencies — ₹50,000/mo per seat, agency keeps the merchant relationship
- Volume — ₹2.50 per call above 5K calls/month

**Concrete first client:** "Pick one Indian fashion or jewelry Shopify merchant doing 100-plus COD orders a day. WhatsApp them — Indian buyers prefer WA over LinkedIn for this — *RTO ko 30% kam karne ka tarika hai. 50 calls free. Hindi mein.* (*A way to cut RTO by 30%. 50 calls free. In Hindi.*) Two responses out of ten outreach is normal."

**Concrete price band:** "Start at ₹4 per call. Don't go below ₹3 — your margin breaks. Volume discount kicks in at 5K/month."

## Beat 7 — Compliance note (7:30–7:45)
**VO:** "TRAI DND, IT Act, DPDP. The agent respects DND windows by default. Recordings live in your R2 — your responsibility. Compliance crib sheet in the playbook."

## Beat 8 — Outro (7:45–8:00)
**On screen:** buyer portal.
**VO:** "Repo, Discord, playbook, unit-economics sheet — buyer portal. First merchant by Friday."

---
## Recording notes
- Use a genuinely de-identified call recording for the cold open — change shop name, customer first name. Confirm with Tejas before publishing.
- Pre-stage one paid Sarvam + ElevenLabs key for the demo so quotas don't bite mid-recording.
- The Hindi-language delivery in the cold open is the differentiator vs. Bolna/Vapi — keep it.
- Same encode + upload spec.
