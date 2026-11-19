# The jobs proxy (optional, not deployed)

Real Jobs works without this. It adds **Adzuna**, the one source of on-site jobs in
many countries (the UK, the US, India, South Africa, Australia, Canada, Brazil,
Mexico, Singapore and much of Europe), searched by place and distance. Adzuna needs
a key, and a key must never be in the game's code, so this small server holds it.

Nothing here has been deployed. Setting it up is the owner's decision.

## What it costs

Nothing on these terms (checked November 2026; check again before relying on them):

- Adzuna: a free developer key, for non-commercial use. Commercial use (a product
  that earns money) needs Adzuna's licence. Each advert must be credited "Adzuna"
  with a link to Adzuna, which the game does on every advert.
- Cloudflare Workers: the free plan allows 100,000 requests a day. Answers are
  kept an hour, so one search asked by many players costs one request.

## Setting it up

1. Get a key at <https://developer.adzuna.com> (an app ID and an app key).
2. With a Cloudflare account, create a Worker from `worker.js` (for example with
   `npx wrangler deploy worker.js --name gamhub-jobs-proxy`).
3. Add the settings to the Worker (Settings → Variables), never to the game:
   - `ADZUNA_APP_ID` and `ADZUNA_APP_KEY` as **secrets**;
   - `ALLOWED_ORIGINS`: the game's address, e.g. `https://your-game.example`
     (and `http://localhost:5173` for development).
4. Build the game with `VITE_JOBS_PROXY` set to the Worker's address, e.g. in
   `.env.local`: `VITE_JOBS_PROXY=https://gamhub-jobs-proxy.your-name.workers.dev`
   (this address is not a secret).

The game then lists Adzuna among its sources, and the town and distance filters
use it.

## What it allows

Only `GET /adzuna/{country}` for Adzuna's countries, from the allowed addresses,
with the search words, place, distance, number of results and age passed on
(each within limits), 30 requests a minute per address. Nothing else is
forwarded, and no player data is sent: only what the player typed in the search.
