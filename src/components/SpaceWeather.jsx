import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { getDonki } from '../lib/nasa'
import { flareSeverity, stormLevel } from '../lib/format'
import Skeleton from './Skeleton'
import ErrorNotice from './ErrorNotice'

const CHART_W = 800
const CHART_H = 260
const AXIS_Y = CHART_H - 24
const MAX_SEVERITY = 5.5
const RANGE_DAYS = 30

const CLASS_COLOR = {
  X: 'var(--accent-red)',
  M: '#d99a3d',
  C: 'var(--accent-blue)',
  B: '#8ca3c7',
  A: '#8ca3c7',
}

function flareColor(classType) {
  return CLASS_COLOR[classType?.[0]?.toUpperCase()] ?? '#8ca3c7'
}

// Each DONKI sub-resource (flares/CMEs/storms) is fetched and rendered
// independently — DONKI has been observed to be intermittently slow or
// flaky per-endpoint, so gating the whole section behind all three settling
// together (as an earlier version of this did) meant one slow request left
// everything stuck on a skeleton far longer than necessary.
function useDonki(type, transform) {
  const [state, setState] = useState({ status: 'loading', data: null })

  useEffect(() => {
    let cancelled = false
    getDonki(type)
      .then((data) => {
        if (!cancelled) setState({ status: 'ready', data: transform(data) })
      })
      .catch((error) => {
        if (!cancelled) setState({ status: 'error', data: null, error })
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type])

  return state
}

function FlareChart({ flares, hoveredId, onHover }) {
  const now = new Date()
  const rangeStart = new Date(now.getTime() - RANGE_DAYS * 86_400_000)

  function xForDate(iso) {
    const t = new Date(iso).getTime()
    const frac = (t - rangeStart.getTime()) / (now.getTime() - rangeStart.getTime())
    return Math.min(1, Math.max(0, frac)) * CHART_W
  }

  return (
    <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className="h-full w-full">
      <line x1={0} y1={AXIS_Y} x2={CHART_W} y2={AXIS_Y} stroke="#8ca3c7" strokeOpacity={0.4} />
      {[0, 0.5, 1].map((f) => (
        <text
          key={f}
          x={f * CHART_W}
          y={CHART_H - 6}
          fill="#8ca3c7"
          fontFamily="var(--font-data)"
          fontSize="9"
          textAnchor={f === 0 ? 'start' : f === 1 ? 'end' : 'middle'}
        >
          {new Date(rangeStart.getTime() + f * RANGE_DAYS * 86_400_000).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          })}
        </text>
      ))}

      {flares.length === 0 && (
        <text x={CHART_W / 2} y={AXIS_Y / 2} fill="#8ca3c7" fontFamily="var(--font-data)" fontSize="11" textAnchor="middle">
          No flares recorded in this window.
        </text>
      )}

      {flares.map((flare) => {
        const x = xForDate(flare.peakTime)
        const severity = flareSeverity(flare.classType)
        const barHeight = (severity / MAX_SEVERITY) * (AXIS_Y - 16)
        const isHovered = hoveredId === flare.flrID
        return (
          <motion.rect
            key={flare.flrID}
            x={x - 3}
            width={6}
            rx={1}
            fill={flareColor(flare.classType)}
            initial={{ height: 0, y: AXIS_Y }}
            animate={{ height: barHeight, y: AXIS_Y - barHeight }}
            opacity={isHovered ? 1 : 0.75}
            style={{ cursor: 'pointer' }}
            onPointerEnter={() => onHover(flare.flrID)}
            onPointerLeave={() => onHover(null)}
          />
        )
      })}
    </svg>
  )
}

function SpaceWeather() {
  const flaresState = useDonki('flr', (data) =>
    [...data].sort((a, b) => new Date(a.peakTime) - new Date(b.peakTime)),
  )
  const cmeState = useDonki('cme', (data) =>
    [...data].sort((a, b) => new Date(b.startTime) - new Date(a.startTime))[0] ?? null,
  )
  const gstState = useDonki('gst', (data) =>
    [...data]
      .flatMap((event) => event.allKpIndex ?? [])
      .sort((a, b) => new Date(b.observedTime) - new Date(a.observedTime))[0] ?? null,
  )
  const [hoveredId, setHoveredId] = useState(null)

  const flares = flaresState.data ?? []
  const hoveredFlare = flares.find((f) => f.flrID === hoveredId) ?? null

  return (
    <section className="border-b-2 border-(--fg) px-6 py-10 sm:px-10">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-baseline justify-between gap-4">
          <p className="font-(family-name:--font-data) text-xs tracking-[0.25em] text-(--accent-red) uppercase">
            05 · Space Weather
          </p>
          <p className="font-(family-name:--font-data) text-xs text-(--fg-dim)">Last {RANGE_DAYS} days</p>
        </div>
        <h2 className="mt-2 font-(family-name:--font-display) text-4xl font-bold sm:text-5xl">
          Solar Activity
        </h2>
        <p className="mt-2 max-w-2xl font-(family-name:--font-body) text-sm text-(--fg-dim)">
          Real solar flares, coronal mass ejections, and geomagnetic storms from NASA's DONKI
          database. Flare classes (A–X) are logarithmic, so bar height plots a continuous severity
          score rather than five uneven buckets.
        </p>

        <div className="mt-6 grid grid-cols-1 overflow-hidden rounded-sm border border-(--fg-dim)/40 lg:grid-cols-[1fr_260px]">
          <div className="h-[260px] w-full bg-[#050810] p-2">
            {flaresState.status === 'loading' && <Skeleton className="h-full w-full" />}
            {flaresState.status === 'error' && (
              <div className="flex h-full items-center justify-center">
                <ErrorNotice message="Couldn't reach NASA's DONKI flare data — it's known to be intermittently unreliable." />
              </div>
            )}
            {flaresState.status === 'ready' && (
              <FlareChart flares={flares} hoveredId={hoveredId} onHover={setHoveredId} />
            )}
          </div>

          <div className="border-t border-(--fg-dim)/40 bg-(--bg-panel) lg:border-t-0 lg:border-l">
            <div className="border-b border-(--fg-dim)/20 px-4 py-4">
              <p className="font-(family-name:--font-data) text-[10px] tracking-[0.25em] text-(--accent-blue) uppercase">
                Current Conditions
              </p>
              <div className="mt-2 space-y-1.5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-(family-name:--font-data) text-[10px] tracking-wide text-(--fg-dim) uppercase">
                    Latest CME speed
                  </span>
                  <span className="font-(family-name:--font-data) text-xs text-(--fg)">
                    {cmeState.status === 'loading' && '…'}
                    {cmeState.status === 'error' && '—'}
                    {cmeState.status === 'ready' &&
                      (cmeState.data?.cmeAnalyses?.[0]?.speed
                        ? `${Math.round(cmeState.data.cmeAnalyses[0].speed)} km/s`
                        : 'None recent')}
                  </span>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-(family-name:--font-data) text-[10px] tracking-wide text-(--fg-dim) uppercase">
                    Geomagnetic activity
                  </span>
                  <span className="font-(family-name:--font-data) text-xs text-(--fg)">
                    {gstState.status === 'loading' && '…'}
                    {gstState.status === 'error' && '—'}
                    {gstState.status === 'ready' && (gstState.data ? stormLevel(gstState.data.kpIndex) : 'Quiet')}
                  </span>
                </div>
              </div>
            </div>

            <div className="px-4 py-4">
              {hoveredFlare ? (
                <div>
                  <p
                    className="font-(family-name:--font-data) text-[10px] tracking-[0.25em] uppercase"
                    style={{ color: flareColor(hoveredFlare.classType) }}
                  >
                    Flare {hoveredFlare.classType}
                  </p>
                  <p className="mt-2 font-(family-name:--font-data) text-[11px] text-(--fg-dim)">
                    Peak: {new Date(hoveredFlare.peakTime).toUTCString().slice(0, 22)} UTC
                  </p>
                  {hoveredFlare.sourceLocation && (
                    <p className="mt-1 font-(family-name:--font-data) text-[11px] text-(--fg-dim)">
                      Region: {hoveredFlare.sourceLocation}
                    </p>
                  )}
                  {hoveredFlare.linkedEvents?.length > 0 && (
                    <p className="mt-1 font-(family-name:--font-data) text-[11px] text-(--fg-dim)">
                      Linked CME: yes
                    </p>
                  )}
                </div>
              ) : (
                <p className="font-(family-name:--font-body) text-sm text-(--fg-dim)">
                  Hover a bar for flare details.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default SpaceWeather
