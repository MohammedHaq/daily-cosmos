import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { SATELLITES, snapshotUrl, yesterday } from '../lib/gibsImagery'
import { subsolarPoint } from '../lib/orbitalMechanics'
import Skeleton from './Skeleton'
import ErrorNotice from './ErrorNotice'

const DEG2RAD = Math.PI / 180
const GRID_LINE_COLOR = '#8ca3c7'
const MAP_W = 1000
const MAP_H = 500

function isoDate(date) {
  return date.toISOString().slice(0, 10)
}

// Solar elevation angle (degrees) at (lat, lon) given the current subsolar point.
function solarElevation(lat, lon, sub) {
  const latR = lat * DEG2RAD
  const subLatR = sub.lat * DEG2RAD
  const hourAngleR = (lon - sub.lon) * DEG2RAD
  const sinElev = Math.sin(latR) * Math.sin(subLatR) + Math.cos(latR) * Math.cos(subLatR) * Math.cos(hourAngleR)
  return Math.asin(Math.min(1, Math.max(-1, sinElev))) / DEG2RAD
}

// The night-hemisphere shading polygon, in map pixel space, from the current
// subsolar point. Traces the terminator curve across every longitude, then
// closes the path to whichever pole is in darkness.
function terminatorPath(sub, width, height, samples = 72) {
  const subLatR = sub.lat * DEG2RAD
  const points = []
  for (let i = 0; i <= samples; i++) {
    const lon = -180 + (360 * i) / samples
    let H = lon - sub.lon
    H = ((H + 180) % 360 + 360) % 360 - 180
    const latR = Math.atan(-Math.cos(H * DEG2RAD) / Math.tan(subLatR))
    const lat = latR / DEG2RAD
    const x = ((lon + 180) / 360) * width
    const y = ((90 - lat) / 180) * height
    points.push(`${x.toFixed(1)},${y.toFixed(1)}`)
  }
  const nightIsSouth = sub.lat > 0
  const corners = nightIsSouth ? `${width},${height} 0,${height}` : `${width},0 0,0`
  return `M ${points.join(' L ')} L ${corners.split(' ').join(' L ')} Z`
}

function Graticule() {
  const lines = []
  for (let lon = -180; lon <= 180; lon += 30) {
    const x = ((lon + 180) / 360) * MAP_W
    lines.push(<line key={`v${lon}`} x1={x} y1={0} x2={x} y2={MAP_H} />)
  }
  for (let lat = -60; lat <= 60; lat += 30) {
    const y = ((90 - lat) / 180) * MAP_H
    lines.push(<line key={`h${lat}`} x1={0} y1={y} x2={MAP_W} y2={y} />)
  }
  return (
    <g stroke={GRID_LINE_COLOR} strokeOpacity={0.35} strokeDasharray="4 5">
      {lines}
    </g>
  )
}

function WeatherImage({ satelliteId, date }) {
  const [status, setStatus] = useState('loading')

  return (
    <div className="absolute inset-0">
      {status === 'loading' && (
        <div className="absolute inset-0">
          <Skeleton className="h-full w-full" />
        </div>
      )}
      {status === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <ErrorNotice message="Couldn't load satellite imagery for this date." />
        </div>
      )}
      <img
        src={snapshotUrl(satelliteId, date, { width: MAP_W * 2, height: MAP_H * 2 })}
        alt="NASA satellite view of Earth's current cloud cover"
        className="h-full w-full object-cover"
        style={{ opacity: status === 'ready' ? 1 : 0 }}
        onLoad={() => setStatus('ready')}
        onError={() => setStatus('error')}
      />
    </div>
  )
}

function WeatherMap() {
  const [satelliteId, setSatelliteId] = useState(SATELLITES[0].id)
  const [useToday, setUseToday] = useState(false)
  const [now, setNow] = useState(() => new Date())
  const [cursor, setCursor] = useState(null)
  const containerRef = useRef(null)

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  const imageryDate = useToday ? new Date() : yesterday(new Date())
  const sub = subsolarPoint(now)
  const nightPath = terminatorPath(sub, MAP_W, MAP_H)

  function handleMouseMove(e) {
    const rect = containerRef.current.getBoundingClientRect()
    const px = (e.clientX - rect.left) / rect.width
    const py = (e.clientY - rect.top) / rect.height
    const lon = px * 360 - 180
    const lat = 90 - py * 180
    const elevation = solarElevation(lat, lon, sub)
    setCursor({ lat, lon, daylight: elevation > 0 })
  }

  return (
    <section className="border-b-2 border-(--fg) px-6 py-10 sm:px-10">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-baseline justify-between gap-4">
          <p className="font-(family-name:--font-data) text-xs tracking-[0.25em] text-(--accent-red) uppercase">
            04 · Global Weather
          </p>
          <p className="font-(family-name:--font-data) text-xs text-(--fg-dim)">
            Imagery: {isoDate(imageryDate)}
          </p>
        </div>
        <h2 className="mt-2 font-(family-name:--font-display) text-4xl font-bold sm:text-5xl">
          Weather, Right Now
        </h2>
        <p className="mt-2 max-w-2xl font-(family-name:--font-body) text-sm text-(--fg-dim)">
          Real NASA satellite imagery of Earth's current cloud cover — not numeric weather data,
          since NASA doesn't publish a live global weather feed (that's NOAA/weather-service
          territory). The day/night shading is computed from the actual current time and is
          independent of the imagery's date, which is shown above.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex gap-1 font-(family-name:--font-data) text-[11px] tracking-wide uppercase">
            {SATELLITES.map((sat) => (
              <button
                key={sat.id}
                type="button"
                onClick={() => setSatelliteId(sat.id)}
                className="relative px-3 py-1.5"
                aria-pressed={satelliteId === sat.id}
              >
                {satelliteId === sat.id && (
                  <motion.span
                    layoutId="satellite-tab-indicator"
                    className="absolute inset-0 rounded-full bg-(--accent-blue)"
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  />
                )}
                <span
                  className="relative z-10"
                  style={{ color: satelliteId === sat.id ? 'var(--bg)' : 'var(--fg-dim)' }}
                >
                  {sat.label}
                </span>
              </button>
            ))}
          </div>

          <div className="flex gap-1 font-(family-name:--font-data) text-[11px] tracking-wide uppercase">
            <button
              type="button"
              onClick={() => setUseToday(false)}
              className="px-2 py-1"
              style={{ color: !useToday ? 'var(--accent-blue)' : 'var(--fg-dim)' }}
            >
              Yesterday · complete
            </button>
            <button
              type="button"
              onClick={() => setUseToday(true)}
              className="px-2 py-1"
              style={{ color: useToday ? 'var(--accent-blue)' : 'var(--fg-dim)' }}
            >
              Today · may be incomplete
            </button>
          </div>
        </div>

        <div
          ref={containerRef}
          className="relative mt-4 aspect-2/1 w-full overflow-hidden rounded-sm border border-(--fg-dim)/40 bg-[#050810]"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setCursor(null)}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={`${satelliteId}|${isoDate(imageryDate)}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0"
            >
              <WeatherImage satelliteId={satelliteId} date={imageryDate} />
            </motion.div>
          </AnimatePresence>

          <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} className="pointer-events-none absolute inset-0 h-full w-full">
            <Graticule />
            <path d={nightPath} fill="#050810" opacity={0.45} />
          </svg>

          <div className="absolute right-3 bottom-2 font-(family-name:--font-data) text-[10px] tracking-wide text-(--fg-dim) uppercase">
            {cursor
              ? `${Math.abs(cursor.lat).toFixed(1)}°${cursor.lat >= 0 ? 'N' : 'S'}, ${Math.abs(cursor.lon).toFixed(1)}°${cursor.lon >= 0 ? 'E' : 'W'} · ${cursor.daylight ? 'daylight' : 'night'}`
              : 'move cursor over map for coordinates'}
          </div>
        </div>

        <p className="mt-2 font-(family-name:--font-data) text-[10px] leading-relaxed text-(--fg-dim)">
          Source: NASA GIBS (Global Imagery Browse Services), a separate keyless NASA service from
          the Open APIs used elsewhere on this page.
        </p>
      </div>
    </section>
  )
}

export default WeatherMap
