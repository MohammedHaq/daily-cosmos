async function fetchJson(path, params = {}) {
  const url = new URL(path, window.location.origin)
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, value)
    }
  }

  const res = await fetch(url)
  const data = await res.json()

  if (!res.ok) {
    // NASA's error shape varies by failure type: rate limits nest under error.message,
    // bad params (e.g. an out-of-range date) come back as a flat `msg`.
    const message = data?.error?.message || data?.error || data?.msg
    throw new Error(message || `Request to ${path} failed (${res.status})`)
  }

  return data
}

export function getApod(date) {
  return fetchJson('/api/apod', { date })
}

export async function getNeoFeed(date) {
  const data = await fetchJson('/api/neo', { start_date: date, end_date: date })
  return Object.values(data.near_earth_objects ?? {}).flat()
}

export async function getMarsPhotos(rover, earthDate) {
  const data = await fetchJson('/api/mars-photos', { rover, earth_date: earthDate })
  return data.photos ?? []
}

// EPIC image URLs are built from the response's own date fields, not just the image name.
// Uses the public epic.gsfc.nasa.gov archive (no API key needed) so the key never appears client-side.
export function epicImageUrl(image) {
  const [year, month, day] = image.date.split(' ')[0].split('-')
  return `https://epic.gsfc.nasa.gov/archive/natural/${year}/${month}/${day}/png/${image.image}.png`
}

export async function getEpic(date) {
  const images = await fetchJson('/api/epic', { date })
  return Array.isArray(images) ? images : []
}

export async function getDonki(type) {
  const data = await fetchJson('/api/donki', { type })
  return Array.isArray(data) ? data : []
}
