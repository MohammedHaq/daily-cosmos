# Daily Cosmos

A daily space briefing pulling live data from NASA's open APIs — today's Astronomy Picture of the Day, nearby asteroids, fresh Mars rover photos, and a live view of Earth from the DSCOVR satellite — presented as a single dashboard.

Built with React + Vite + Tailwind CSS, with a Vercel serverless `/api` layer that keeps the NASA API key server-side.

## Setup

```bash
npm install
```

Get a free NASA API key at **https://api.nasa.gov** (instant, no approval wait). The default `DEMO_KEY` works but is rate-limited to 30 requests/hour **shared globally across everyone using it**, so it runs out fast.

Create a `.env` file in the project root (already gitignored):

```
NASA_API_KEY=your_key_here
```

An `.env.example` is included as a template.

### Run locally

```bash
npm run dev
```

Opens at `http://localhost:5173`. The `/api/*.js` serverless functions run inside Vite's own dev server via a small dev-only middleware (see `vite.config.js`) — no need to install or log into the Vercel CLI just to develop locally. That middleware only runs in `vite dev`; on Vercel, `api/*.js` runs natively as serverless functions.

If you'd rather test against the real Vercel runtime locally, `vercel` is included as a dev dependency:

```bash
npx vercel dev
```

(This requires logging into a Vercel account the first time.)

## Deployment (Vercel)

1. Push this repo to GitHub (or your Git provider of choice) and import it in the [Vercel dashboard](https://vercel.com/new), or run `npx vercel` from the project root.
2. In the Vercel project's **Settings → Environment Variables**, add:
   - `NASA_API_KEY` = your personal NASA API key
3. Deploy. Vite's build output is served as static assets; everything under `/api` is automatically deployed as serverless functions.

## Project structure

```
api/            Serverless proxy functions (hold NASA_API_KEY server-side)
src/components/ One component per panel — Hero, NearEarthPanel, MarsGallery, EarthView, DatePicker
src/lib/        nasa.js (frontend fetch helpers) and format.js (unit conversions, camera names)
```

## Notes

- NASA's Mars Photos API (`api.nasa.gov/mars-photos`) proxies to a community-run Heroku app that has, as of this writing, been intermittently or fully unavailable ("No such app"). This is an upstream NASA/Heroku issue, not a bug in this app — the Mars gallery will show a friendly error until that service is back.
