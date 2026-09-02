import { setCache } from './_lib/cache.js'

export default async function handler(req, res) {
  const apiKey = process.env.NASA_API_KEY
  if (!apiKey) {
    res.status(500).json({ error: 'NASA_API_KEY is not configured' })
    return
  }

  const today = new Date().toISOString().slice(0, 10)
  const { start_date = today, end_date = today } = req.query

  const url = new URL('https://api.nasa.gov/neo/rest/v1/feed')
  url.searchParams.set('api_key', apiKey)
  url.searchParams.set('start_date', start_date)
  url.searchParams.set('end_date', end_date)

  try {
    const nasaRes = await fetch(url)
    const data = await nasaRes.json()

    if (!nasaRes.ok) {
      res.status(nasaRes.status).json(data)
      return
    }

    setCache(res, 60 * 60)
    res.status(200).json(data)
  } catch {
    res.status(502).json({ error: 'Failed to reach NASA NEO feed API' })
  }
}
