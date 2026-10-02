# LeadLens

An AI-assisted lead prioritization tool for real-estate sales teams. A rep
pastes in a raw customer inquiry — however messy — and gets back a ranked
priority, the signals that actually drive the decision, a recommended next
action, and a suggested opening line. Built as a working prototype, not a
mockup: every feature below runs end-to-end.

## What it does

- **AI lead analysis** (Gemini) — scores every lead hot/warm/cold with a
  reason, extracts the 3–5 signals that most drive the decision (ranked
  strongest-first, freely worded — not a fixed tag vocabulary), surfaces
  requirements/objections/flags pulled from the raw message, and suggests
  what to say first on the call.
- **Grounded per-lead chat** — ask follow-up questions about a specific lead
  and get answers grounded in that lead's own data, not a generic assistant.
- **Claim / release workflow** — a rep claims an open lead; marking it "not
  interested" releases it back to the open pool for someone else, instead of
  leaving dead leads stuck under one rep forever.
- **Call Log vs. Schedule** — logging a real call outcome (interested, call
  back later, no answer, etc.) is different from scheduling a first call for
  a lead nobody's reached yet. Scheduling sets a follow-up date without
  falsely marking the lead "contacted."
- **Universal search** — one box filters by name, location, hot/warm/cold,
  claimed/contacted/open, overdue, or any word from the AI's own analysis
  (e.g. "vastu"), all client-side, no API calls.
- **Multiselect priority, requested-date, and follow-up-date filters** —
  combine "Hot + Warm" with "requested in the last 7 days" with "follow-up
  overdue," with a one-click reset for all of it.
- **Backdatable requested date** — a lead can be logged today but marked as
  having come in yesterday, since reps don't always log inquiries the moment
  they happen.
- **No raw errors in the UI** — every AI/network failure is translated to a
  plain-language message server-side before it ever reaches the client.

## Deliberate scope cuts (read before judging this as "incomplete")

- **localStorage, not a database.** There is no backend persistence. Each
  browser holds its own copy of the lead queue, seeded with 8 demo leads on
  first load. This was a conscious call, not an oversight: building a real
  shared backend (schema, API routes, migrating every CRUD path off
  synchronous localStorage calls) is a multi-hour rewrite of the entire data
  layer, not a plug-in, and doing it under deadline pressure risked shipping
  something half-working instead of something fully working. The localStorage
  version is feature-complete and fully tested; a real DB is the documented
  next step, not a gap nobody noticed.
- **Single hardcoded rep identity, no auth.** There's no login. "Claim" and
  "contacted by" are real mechanics, but they operate on one hardcoded
  identity per browser, not a real multi-user system.
- **No lead ingestion pipeline.** Leads are added through the in-app form.
  "Import from CSV" is flagged in the UI as a planned feature (with the
  actual design — column mapping, row preview, duplicate detection — spelled
  out there) rather than silently missing.
- **Free-tier Gemini quota.** Seed leads are not pre-analyzed on load — a rep
  triggers analysis manually per lead — specifically so opening/reloading
  the app during a demo never burns API quota on its own.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind v4 · Gemini API
(`@google/genai`) with structured JSON output.

## Running it locally

```bash
npm install
cp .env.local.example .env.local   # add your own GEMINI_API_KEY
npm run dev
```

Open http://localhost:3000.

## Known limitations

- Data is per-browser. Two reps on two machines do not share a queue.
- Clearing browser storage wipes all leads — there is no server-side backup.
- No automated test suite; verification was manual end-to-end testing of
  every flow (add → analyze → claim → log outcome → schedule → search →
  filter → reload).
