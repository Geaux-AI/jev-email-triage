# Jev email triage demo

A copy of the "Email Triage Demo" from the *Jev is HERE* video. It sends each email to TypeSafe's Jev classifier and asks four questions in one call:

| Question | Jev type | Shows as |
|---|---|---|
| category | `choice` (10 options) | Category column |
| priority | `score` (Low / Normal / High) | Priority pill |
| spam | `noul` (probability of yes) | Spam % |
| reply | `noul` | Reply % |

The email itself is sent as plain JSON in `state` with no special encoding. The questions live in `buildQuestions()` in `server.js`; edit them to change the triage.

## Run

```
cp .env.example .env   # paste your TYPESAFE_API_KEY
node server.js          # http://localhost:5173
```

No key means **mock mode**: fake answers from simple keyword rules, so you can rehearse the UI. The badge at the top says which mode is active.

Pick how many emails and workers (parallel calls), then hit Start. The right panel shows run time, average and p95 latency, throughput, retries, tokens and estimated cost. Click any row to see what was sent and what Jev returned.

`emails.json` holds 1,700 made-up emails: the 60 hand-written ones in `emails.base.json` plus generated ones from `node generate_emails.js` (pass a number for a different size). Replace it with your own (same fields: id, from, to, subject, sent_at, body) to demo on a real inbox.

## Use your real inbox (1,700 emails)

1. Turn on 2-Step Verification for your Google account, then create an app password at https://myaccount.google.com/apppasswords
2. Put `GMAIL_ADDRESS` and `GMAIL_APP_PASSWORD` in `.env`
3. `python3 import_gmail.py` pulls the newest 1,700 inbox emails into `emails.gmail.json` (read only, nothing marked read). Optional: `python3 import_gmail.py 1700 "[Gmail]/All Mail"`
4. `EMAILS_FILE=emails.gmail.json node server.js`, or set `EMAILS_FILE` in `.env`
5. Set `JEV_ME` in `.env` to a sentence about you, so Jev knows what counts as important

Each email file keeps its own saved results (`last-run.<file>.json`), so the sample and your inbox never mix.

## GitHub Pages (no server, nothing to install)

`node build_pages.js` writes a static copy to `docs/`. In the repo settings, set Pages to deploy from the `main` branch, `/docs` folder.

The static page never holds an API key (anyone could read it), so it runs one of two ways:

- **Replay** (when `docs/replay.json` exists): replays a real recorded Jev run with its real timings, answers, tokens and cost. The badge says "Replay of a real Jev run" with the model and date.
- **Mock** (no replay yet): made-up answers in the browser, labeled "Mock mode (not real Jev answers)".

To record a real run: put your key in `.env`, `node server.js`, choose All emails, press Start, let it finish. That writes `replay.json`. Then `node build_pages.js`, commit and push.
