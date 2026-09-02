import { setCache } from './_lib/cache.js'

const DONKI_PATHS = {
  flr: 'FLR',
  gst: 'GST',
  cme: 'CME',
}

function defaultStartDate() {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - 30)
  return d.toISOString().slice(0, 10)
}

export default async function handler(req, res) {
  const apiKey = process.env.NASA_API_KEY
  if (!apiKey) {
    res.status(500).json({ error: 'NASA_API_KEY is not configured' })
    return
  }

  const { type = 'flr', start_date = defaultStartDate(), end_date } = req.query
  const path = DONKI_PATHS[String(type).toLowerCase()]

  if (!path) {
    res.status(400).json({ error: `Unknown DONKI type "${type}"` })
    return
  }

  const url = new URL(`https://api.nasa.gov/DONKI/${path}`)
  url.searchParams.set('api_key', apiKey)
  url.searchParams.set('startDate', start_date)
  if (end_date) url.searchParams.set('endDate', end_date)

  try {
    // DONKI has been observed to be intermittently slow/unreliable — bound the
    // wait so a hung upstream request doesn't hang this function indefinitely.
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10_000)
    const nasaRes = await fetch(url, { signal: controller.signal })
    clearTimeout(timeout)

    const data = await nasaRes.json()

    if (!nasaRes.ok) {
      res.status(nasaRes.status).json(data)
      return
    }

    setCache(res, 60 * 30)
    res.status(200).json(data)
  } catch {
    res.status(502).json({ error: 'Failed to reach NASA DONKI API' })
  }
}
