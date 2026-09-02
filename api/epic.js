import { setCache } from './_lib/cache.js'

export default async function handler(req, res) {
  const apiKey = process.env.NASA_API_KEY
  if (!apiKey) {
    res.status(500).json({ error: 'NASA_API_KEY is not configured' })
    return
  }

  const { date } = req.query
  const path = date ? `/date/${date}` : ''
  const url = new URL(`https://api.nasa.gov/EPIC/api/natural${path}`)
  url.searchParams.set('api_key', apiKey)

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
    res.status(502).json({ error: 'Failed to reach NASA EPIC API' })
  }
}
