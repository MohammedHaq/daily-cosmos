import { setCache } from './_lib/cache.js'

export default async function handler(req, res) {
  const apiKey = process.env.NASA_API_KEY
  if (!apiKey) {
    res.status(500).json({ error: 'NASA_API_KEY is not configured' })
    return
  }

  const { date } = req.query
  const url = new URL('https://api.nasa.gov/planetary/apod')
  url.searchParams.set('api_key', apiKey)
  if (date) url.searchParams.set('date', date)

  try {
    const nasaRes = await fetch(url)
    const data = await nasaRes.json()

    if (!nasaRes.ok) {
      res.status(nasaRes.status).json(data)
      return
    }

    setCache(res, 60 * 60 * 24) // APOD only changes once a day
    res.status(200).json(data)
  } catch {
    res.status(502).json({ error: 'Failed to reach NASA APOD API' })
  }
}
