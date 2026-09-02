# Daily Cosmos — Build Instructions for Claude Code

Paste this whole document as your first prompt in Claude Code, in an empty project folder.

## Project Overview

Build a web app called **Daily Cosmos** — a daily space briefing dashboard that pulls live data from NASA's Open APIs and presents it as a cohesive, visually engaging page rather than raw data dumps.

## Tech Stack

- **Frontend:** React + Vite
- **Styling:** Tailwind CSS
- **Hosting target:** Vercel (so structure serverless functions accordingly, using the `/api` folder convention)
- **API key handling:** Never expose the NASA API key in client-side code. All NASA API calls must go through serverless functions in `/api` that hold the key server-side via environment variable `NASA_API_KEY`.

## NASA APIs to Use

1. **APOD** — `https://api.nasa.gov/planetary/apod`
2. **NEO Feed** — `https://api.nasa.gov/neo/rest/v1/feed`
3. **Mars Rover Photos** — `https://api.nasa.gov/mars-photos/api/v1/rovers/{rover}/photos`
4. **EPIC** — `https://api.nasa.gov/EPIC/api/natural`

## Features to Build (in this order — build and confirm each before moving to the next)

### 1. Project scaffolding
- Initialize Vite + React project
- Install and configure Tailwind CSS
- Set up `.env` for `NASA_API_KEY`, add `.env` to `.gitignore`
- Create `/api` folder for serverless proxy functions
- Set up basic page layout/shell with a dark, space-themed color palette

### 2. Serverless proxy functions
- Create one serverless function per NASA endpoint (e.g. `/api/apod.js`, `/api/neo.js`, `/api/mars-photos.js`, `/api/epic.js`)
- Each function should fetch from NASA using `NASA_API_KEY` server-side and return JSON to the frontend
- Add basic in-memory or edge caching where sensible (especially APOD, since it only changes once a day) to stay well under NASA's 1000 requests/hour limit

### 3. Hero section — APOD
- Fetch today's Astronomy Picture of the Day via the proxy function
- Full-width hero image (or embedded video if `media_type` is `"video"`)
- Display `title` and `explanation` beneath the image
- Handle loading and error states gracefully

### 4. "Nearby Today" panel — NEO feed
- Fetch today's near-Earth object data via the proxy function
- For each asteroid, display:
  - Name
  - Estimated diameter, converted into a relatable comparison (e.g. "about the size of a school bus")
  - Distance, converted from km into **lunar distances** for readability
  - A hazardous/not-hazardous badge, driven by the `is_potentially_hazardous_asteroid` field
- Sort by closest distance first

### 5. Mars gallery
- Fetch latest photos for Curiosity and Perseverance via the proxy function
- Display as a responsive photo grid
- Each photo card shows: sol number, camera name (full name, not just the code), and rover name
- Add a rover filter (dropdown or tabs) to switch between rovers

### 6. Earth view — EPIC
- Fetch the latest EPIC natural-color image via the proxy function
- Display the image with its timestamp
- Construct the actual image URL correctly (EPIC requires building the URL from the date fields in the response, not just the image name — Claude Code should look up EPIC's URL construction format from NASA's docs if unsure)

### 7. Date picker / historical browsing
- Add a date picker component
- Wire it to APOD and Mars Rover Photos so users can browse past dates
- Handle NASA API date-range limits gracefully (APOD starts June 16, 1995; Mars rovers have mission-specific date ranges)

### 8. Polish pass
- Responsive layout for mobile
- Loading skeletons for each panel while data fetches
- Friendly error messages if a NASA endpoint fails or rate-limits
- Basic page title/meta tags

## Build Process Instructions for Claude Code

- Build incrementally. Complete and verify each numbered feature above in the browser before starting the next.
- After scaffolding, confirm the dev server runs and Tailwind is working before writing any feature code.
- Use environment variables correctly for both local dev (`.env`) and production (Vercel environment variable settings) — flag this explicitly when it matters.
- Keep components modular: one component per panel (Hero, NearEarthPanel, MarsGallery, EarthView, DatePicker).
- Write clean, commented code, but do not over-engineer — this is a personal/portfolio project, not enterprise software.
- At the end, provide a short README with: setup steps, where to add the NASA API key locally, and deployment steps for Vercel.
