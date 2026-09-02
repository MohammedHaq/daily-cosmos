import { setCache } from './_lib/cache.js'

const VALID_ROVERS = new Set(['curiosity', 'opportunity', 'perseverance', 'spirit'])

export default async function handler(req, res) {
  const apiKey = process.env.NASA_API_KEY
  if (!apiKey) {
    res.status(500).json({ error: 'NASA_API_KEY is not configured' })
    return
  }

  const { rover = 'curiosity', sol, earth_date, page } = req.query
  const roverName = String(rover).toLowerCase()

  if (!VALID_ROVERS.has(roverName)) {
    res.status(400).json({ error: `Unknown rover "${rover}"` })
    return
  }

  // No date/sol given -> latest_photos; otherwise the date-filterable photos endpoint (used for historical browsing)
  const usingLatest = !sol && !earth_date
  const endpoint = usingLatest
    ? `https://api.nasa.gov/mars-photos/api/v1/rovers/${roverName}/latest_photos`
    : `https://api.nasa.gov/mars-photos/api/v1/rovers/${roverName}/photos`

  const url = new URL(endpoint)
  url.searchParams.set('api_key', apiKey)
  if (sol) url.searchParams.set('sol', sol)
  if (earth_date) url.searchParams.set('earth_date', earth_date)
  if (page) url.searchParams.set('page', page)

  try {
    const nasaRes = await fetch(url)
    const data = await nasaRes.json()

    if (!nasaRes.ok) {
      res.status(nasaRes.status).json(data)
      return
    }

    setCache(res, 60 * 60)
    res.status(200).json({ photos: usingLatest ? data.latest_photos : data.photos })
  } catch {
    res.status(502).json({ error: 'Failed to reach NASA Mars Photos API' })
  }
}
