import { useEffect, useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { getDonki } from '../lib/nasa'
import { stormLevel } from '../lib/format'
import Skeleton from './Skeleton'
import ErrorNotice from './ErrorNotice'

const CHART_W = 800
const CHART_H = 260
const AXIS_Y = CHART_H - 24
const FETCH_DAYS = 365 // fetch once for the widest range; the toggle only re-buckets client-side

const RANGE_OPTIONS = [
  { days: 7, label: '7 Days' },
  { days: 30, label: '30 Days' },
  { days: 365, label: '1 Year' },
]

// Stack order bottom-to-top: mildest first, so the rarer/more severe classes
// (M, X) sit visibly on top of the stack rather than buried underneath.
const CLASS_STACK_ORDER = ['A', 'B', 'C', 'M', 'X']

const CLASS_COLOR = {
  X: 'var(--accent-red)',
  M: '#d99a3d',
  C: 'var(--accent-blue)',
  B: '#8ca3c7',
  A: '#5c6b7a',
}

function classLetter(classType) {
  return classType?.[0]?.toUpperCase() ?? 'C'
}

function emptyCounts() {
  return { X: 0, M: 0, C: 0, B: 0, A: 0 }
}

// Buckets flares covering the most recent `days` window: one bucket per day
// for 7/30-day views, one per month for the 1-year view (365 daily bars
// would be unreadable). Each bucket carries per-class counts for a stacked bar.
function bucketFlares(flares, days) {
  const now = new Date()
  const monthly = days > 60

  if (monthly) {
    const buckets = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))
      buckets.push({
        key: `${d.getUTCFullYear()}-${d.getUTCMonth()}`,
        label: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' }),
        counts: emptyCounts(),
        total: 0,
      })
    }
    const byKey = Object.fromEntries(buckets.map((b) => [b.key, b]))
    for (const flare of flares) {
      const t = new Date(flare.peakTime)
      const bucket = byKey[`${t.getUTCFullYear()}-${t.getUTCMonth()}`]
      if (!bucket) continue
      const letter = classLetter(flare.classType)
      bucket.counts[letter]++
      bucket.total++
    }
    return buckets
  }

  const buckets = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86_400_000)
    buckets.push({
      key: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }),
      counts: emptyCounts(),
      total: 0,
    })
  }
  const byKey = Object.fromEntries(buckets.map((b) => [b.key, b]))
  for (const flare of flares) {
    const key = new Date(flare.peakTime).toISOString().slice(0, 10)
    const bucket = byKey[key]
    if (!bucket) continue
    const letter = classLetter(flare.classType)
    bucket.counts[letter]++
    bucket.total++
  }
  return buckets
}

function useDonki(type, params, retryKey) {
  const [state, setState] = useState({ status: 'loading', data: null })

  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading', data: null })
    getDonki(type, params)
      .then((data) => {
        if (!cancelled) setState({ status: 'ready', data })
      })
      .catch((error) => {
        if (!cancelled) setState({ status: 'error', data: null, error })
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, retryKey])

  return state
}

function ClassBreakdown({ counts, total }) {
  const maxCount = Math.max(1, ...Object.values(counts))
  return (
    <div className="mt-2 space-y-1">
      {CLASS_STACK_ORDER.slice()
        .reverse()
        .filter((letter) => counts[letter] > 0)
        .map((letter) => (
          <div key={letter} className="flex items-center gap-2">
            <span
              className="w-3 shrink-0 font-(family-name:--font-data) text-[10px]"
              style={{ color: CLASS_COLOR[letter] }}
            >
              {letter}
            </span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-(--fg-dim)/15">
              <div
                className="h-full rounded-full"
                style={{ width: `${(counts[letter] / maxCount) * 100}%`, backgroundColor: CLASS_COLOR[letter] }}
              />
            </div>
            <span className="w-6 shrink-0 text-right font-(family-name:--font-data) text-[10px] text-(--fg-dim)">
              {counts[letter]}
            </span>
          </div>
        ))}
      {total === 0 && (
        <p className="font-(family-name:--font-body) text-sm text-(--fg-dim)">No flares in this period.</p>
      )}
    </div>
  )
}

function FlareHistogram({ buckets, hoveredIndex, onHover }) {
  const maxTotal = Math.max(1, ...buckets.map((b) => b.total))
  const barSlot = CHART_W / buckets.length
  const barWidth = Math.max(2, barSlot * 0.65)
  const showEveryLabel = buckets.length <= 14

  return (
    <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className="h-full w-full">
      <line x1={0} y1={AXIS_Y} x2={CHART_W} y2={AXIS_Y} stroke="#8ca3c7" strokeOpacity={0.4} />

      {buckets.map((bucket, i) => {
        if (!showEveryLabel && i !== 0 && i !== buckets.length - 1 && i !== Math.floor(buckets.length / 2)) {
          return null
        }
        const x = (i + 0.5) * barSlot
        return (
          <text
            key={`label-${bucket.key}`}
            x={x}
            y={CHART_H - 6}
            fill="#8ca3c7"
            fontFamily="var(--font-data)"
            fontSize="9"
            textAnchor="middle"
          >
            {bucket.label}
          </text>
        )
      })}

      {buckets.map((bucket, i) => {
        const x = (i + 0.5) * barSlot - barWidth / 2
        let yCursor = AXIS_Y
        const isHovered = hoveredIndex === i
        return (
          <g
            key={bucket.key}
            opacity={hoveredIndex === null || isHovered ? 1 : 0.45}
            style={{ cursor: 'pointer' }}
            onPointerEnter={() => onHover(i)}
            onPointerLeave={() => onHover(null)}
          >
            <rect x={x} y={16} width={barWidth} height={AXIS_Y - 16} fill="transparent" />
            {CLASS_STACK_ORDER.map((letter) => {
              const count = bucket.counts[letter]
              if (!count) return null
              const height = (count / maxTotal) * (AXIS_Y - 16)
              yCursor -= height
              return (
                <motion.rect
                  key={letter}
                  x={x}
                  width={barWidth}
                  rx={1}
                  fill={CLASS_COLOR[letter]}
                  initial={{ height: 0, y: AXIS_Y }}
                  animate={{ height, y: yCursor }}
                  transition={{ duration: 0.35 }}
                />
              )
            })}
          </g>
        )
      })}

      {buckets.every((b) => b.total === 0) && (
        <text x={CHART_W / 2} y={AXIS_Y / 2} fill="#8ca3c7" fontFamily="var(--font-data)" fontSize="11" textAnchor="middle">
          No flares recorded in this window.
        </text>
      )}
    </svg>
  )
}

function SpaceWeather() {
  const [rangeDays, setRangeDays] = useState(30)
  const [hoveredIndex, setHoveredIndex] = useState(null)
  const [retryKey, setRetryKey] = useState(0)

  const flrParams = useMemo(() => {
    const end = new Date()
    const start = new Date(end.getTime() - FETCH_DAYS * 86_400_000)
    return { startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) }
  }, [])

  const flaresState = useDonki('flr', flrParams, retryKey)
  const cmeState = useDonki('cme', undefined, retryKey)
  const gstState = useDonki('gst', undefined, retryKey)

  const buckets = useMemo(
    () => bucketFlares(flaresState.data ?? [], rangeDays),
    [flaresState.data, rangeDays],
  )
  const periodTotal = buckets.reduce((sum, b) => sum + b.total, 0)
  const periodCounts = buckets.reduce((acc, b) => {
    for (const letter of CLASS_STACK_ORDER) acc[letter] += b.counts[letter]
    return acc
  }, emptyCounts())

  const hoveredBucket = hoveredIndex !== null ? buckets[hoveredIndex] : null

  const latestCme = cmeState.data ? [...cmeState.data].sort((a, b) => new Date(b.startTime) - new Date(a.startTime))[0] : null
  const latestKp = gstState.data
    ? [...gstState.data]
        .flatMap((event) => event.allKpIndex ?? [])
        .sort((a, b) => new Date(b.observedTime) - new Date(a.observedTime))[0]
    : null

  return (
    <section className="border-b-2 border-(--fg) px-6 py-10 sm:px-10">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-baseline justify-between gap-4">
          <p className="font-(family-name:--font-data) text-xs tracking-[0.25em] text-(--accent-red) uppercase">
            05 · Space Weather
          </p>
          <div className="flex gap-1 font-(family-name:--font-data) text-[11px] tracking-wide uppercase">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.days}
                type="button"
                onClick={() => setRangeDays(opt.days)}
                className="px-2 py-1"
                style={{ color: rangeDays === opt.days ? 'var(--accent-blue)' : 'var(--fg-dim)' }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <h2 className="mt-2 font-(family-name:--font-display) text-4xl font-bold sm:text-5xl">
          Solar Activity
        </h2>
        <p className="mt-2 max-w-2xl font-(family-name:--font-body) text-sm text-(--fg-dim)">
          Real solar flare counts from NASA's DONKI database, bucketed by day or month depending on
          the range. Each bar is stacked by flare class (A–X, logarithmic severity) so it shows both
          volume and intensity mix. Fetched once for the full year — switching ranges re-buckets
          instantly, no extra requests.
        </p>

        <div className="mt-6 grid grid-cols-1 overflow-hidden rounded-sm border border-(--fg-dim)/40 lg:grid-cols-[1fr_260px]">
          <div className="h-[260px] w-full bg-[#050810] p-2">
            {flaresState.status === 'loading' && <Skeleton className="h-full w-full" />}
            {flaresState.status === 'error' && (
              <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
                <ErrorNotice message="Couldn't reach NASA's DONKI flare data — it's known to be intermittently unreliable." />
                <button
                  type="button"
                  onClick={() => setRetryKey((k) => k + 1)}
                  className="rounded-full border border-(--accent-blue) px-3 py-1 font-(family-name:--font-data) text-[10px] tracking-wide text-(--accent-blue) uppercase"
                >
                  Retry
                </button>
              </div>
            )}
            {flaresState.status === 'ready' && (
              <FlareHistogram buckets={buckets} hoveredIndex={hoveredIndex} onHover={setHoveredIndex} />
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
                      (latestCme?.cmeAnalyses?.[0]?.speed
                        ? `${Math.round(latestCme.cmeAnalyses[0].speed)} km/s`
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
                    {gstState.status === 'ready' && (latestKp ? stormLevel(latestKp.kpIndex) : 'Quiet')}
                  </span>
                </div>
              </div>
            </div>

            <div className="px-4 py-4">
              <p className="font-(family-name:--font-data) text-[10px] tracking-[0.25em] text-(--accent-blue) uppercase">
                {hoveredBucket ? hoveredBucket.label : `${RANGE_OPTIONS.find((o) => o.days === rangeDays)?.label} total`}
              </p>
              <p className="mt-1 font-(family-name:--font-display) text-2xl font-semibold">
                {hoveredBucket ? hoveredBucket.total : periodTotal}
                <span className="ml-1 font-(family-name:--font-body) text-sm text-(--fg-dim)">flares</span>
              </p>
              <ClassBreakdown
                counts={hoveredBucket ? hoveredBucket.counts : periodCounts}
                total={hoveredBucket ? hoveredBucket.total : periodTotal}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default SpaceWeather
