// NASA GIBS (Global Imagery Browse Services) — a different, keyless NASA
// service from api.nasa.gov. The Worldview Snapshots endpoint returns one
// full-resolution equirectangular image of the whole Earth for a given
// satellite layer and date. No API key, so — same precedent as epicImageUrl()
// in nasa.js — the URL is built and hit directly client-side.
const SNAPSHOT_ENDPOINT = 'https://wvs.earthdata.nasa.gov/api/v1/snapshot'

export const SATELLITES = [
  { id: 'VIIRS_SNPP_CorrectedReflectance_TrueColor', label: 'Suomi NPP · VIIRS' },
  { id: 'MODIS_Terra_CorrectedReflectance_TrueColor', label: 'Terra · MODIS' },
]

function isoDate(date) {
  return date.toISOString().slice(0, 10)
}

export function yesterday(date = new Date()) {
  const d = new Date(date)
  d.setUTCDate(d.getUTCDate() - 1)
  return d
}

// Same-day global coverage is often incomplete (the not-yet-imaged hemisphere
// renders solid black) depending on time of day — verified directly against
// the live API. Yesterday's mosaic is reliably complete, so that's the default;
// "today" is offered as an explicitly labeled secondary option.
export function snapshotUrl(layerId, date, { width = 1600, height = 800 } = {}) {
  const params = new URLSearchParams({
    REQUEST: 'GetSnapshot',
    LAYERS: layerId,
    CRS: 'EPSG:4326',
    TIME: isoDate(date),
    BBOX: '-90,-180,90,180',
    FORMAT: 'image/jpeg',
    WIDTH: String(width),
    HEIGHT: String(height),
  })
  return `${SNAPSHOT_ENDPOINT}?${params.toString()}`
}
