import { useMemo, useState } from 'react'
import { motion } from 'motion/react'
import {
  diameterComparison,
  formatLunarDistance,
  kmToLunarDistances,
  formatRelativeVelocity,
  formatApproachTime,
} from '../lib/format'

const VIEWBOX = 380
const CENTER = 190
const INNER_RADIUS = 44
const OUTER_RADIUS = 168
const GOLDEN_ANGLE = 137.50776405003785 * (Math.PI / 180)
const RING_FRACTIONS = [0.25, 0.5, 0.75, 1]

// Size (dot radius) uses a fixed domain so "how big is this asteroid" reads
// consistently day to day, not just relative to today's set.
const SIZE_DOMAIN_MIN_M = 5
const SIZE_DOMAIN_MAX_M = 1000
const MIN_BLIP_R = 3.5
const MAX_BLIP_R = 15

function averageDiameter(estimated) {
  const { estimated_diameter_min, estimated_diameter_max } = estimated.meters
  return (estimated_diameter_min + estimated_diameter_max) / 2
}

function missDistanceKm(asteroid) {
  return Number(asteroid.close_approach_data?.[0]?.miss_distance?.kilometers ?? Infinity)
}

function blipRadius(diameterMeters) {
  const clamped = Math.min(Math.max(diameterMeters, SIZE_DOMAIN_MIN_M), SIZE_DOMAIN_MAX_M)
  const t =
    (Math.log(clamped) - Math.log(SIZE_DOMAIN_MIN_M)) /
    (Math.log(SIZE_DOMAIN_MAX_M) - Math.log(SIZE_DOMAIN_MIN_M))
  return MIN_BLIP_R + t * (MAX_BLIP_R - MIN_BLIP_R)
}

// Distance -> radius uses today's actual min/max on a log scale (values swing
// from a fraction of a lunar distance to hundreds), so the plot always uses
// the available space well. Angle is NOT real trajectory data — NASA's feed
// gives distance but no bearing — it's a deterministic golden-angle spread
// (closest-first) chosen purely so blips don't overlap.
function layoutAsteroids(asteroids) {
  const distances = asteroids.map(missDistanceKm)
  const minD = Math.min(...distances)
  const maxD = Math.max(...distances)
  const flat = !(maxD > minD)

  const distanceToRadius = (d) => {
    if (flat) return (INNER_RADIUS + OUTER_RADIUS) / 2
    const t = (Math.log(d) - Math.log(minD)) / (Math.log(maxD) - Math.log(minD))
    return INNER_RADIUS + t * (OUTER_RADIUS - INNER_RADIUS)
  }

  const items = asteroids.map((asteroid, i) => {
    const d = missDistanceKm(asteroid)
    const r = distanceToRadius(d)
    const angle = i * GOLDEN_ANGLE
    return {
      asteroid,
      distanceKm: d,
      x: CENTER + r * Math.cos(angle),
      y: CENTER + r * Math.sin(angle),
      size: blipRadius(averageDiameter(asteroid.estimated_diameter)),
    }
  })

  const rings = flat
    ? [{ radius: (INNER_RADIUS + OUTER_RADIUS) / 2, distanceKm: minD }]
    : RING_FRACTIONS.map((t) => ({
        radius: INNER_RADIUS + t * (OUTER_RADIUS - INNER_RADIUS),
        distanceKm: Math.exp(Math.log(minD) + t * (Math.log(maxD) - Math.log(minD))),
      }))

  return { items, rings }
}

function SweepWedge() {
  const width = 32 * (Math.PI / 180)
  const x1 = CENTER + OUTER_RADIUS * Math.cos(0)
  const y1 = CENTER + OUTER_RADIUS * Math.sin(0)
  const x2 = CENTER + OUTER_RADIUS * Math.cos(width)
  const y2 = CENTER + OUTER_RADIUS * Math.sin(width)

  return (
    <motion.g
      style={{ transformOrigin: `${CENTER}px ${CENTER}px` }}
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, ease: 'linear', duration: 7 }}
    >
      <path
        d={`M ${CENTER} ${CENTER} L ${x1} ${y1} A ${OUTER_RADIUS} ${OUTER_RADIUS} 0 0 1 ${x2} ${y2} Z`}
        fill="var(--accent-blue)"
        opacity={0.12}
      />
    </motion.g>
  )
}

function AsteroidDetail({ item }) {
  if (!item) {
    return (
      <div className="flex h-full flex-col justify-center px-4 py-6 text-center">
        <p className="font-(family-name:--font-data) text-[10px] tracking-[0.25em] text-(--fg-dim) uppercase">
          No target selected
        </p>
        <p className="mt-2 font-(family-name:--font-body) text-sm text-(--fg-dim)">
          Hover or tap a blip to read its telemetry.
        </p>
      </div>
    )
  }

  const { asteroid, distanceKm } = item
  const approach = asteroid.close_approach_data?.[0]
  const diameter = averageDiameter(asteroid.estimated_diameter)
  const hazardous = asteroid.is_potentially_hazardous_asteroid

  return (
    <div className="px-4 py-5">
      <p
        className="font-(family-name:--font-data) text-[10px] tracking-[0.25em] uppercase"
        style={{ color: hazardous ? 'var(--accent-red)' : 'var(--accent-blue)' }}
      >
        {hazardous ? 'Hazardous · Tracked' : 'Clear · Tracked'}
      </p>
      <h3 className="mt-1 font-(family-name:--font-display) text-xl font-semibold">
        {asteroid.name.replace(/[()]/g, '')}
      </h3>
      <p className="mt-2 font-(family-name:--font-body) text-sm text-(--fg-dim)">
        {diameterComparison(diameter)}
      </p>
      <div className="mt-4">
        {[
          ['Distance', formatLunarDistance(distanceKm)],
          ['Diameter (est.)', `${Math.round(diameter)} m`],
          ['Relative speed', approach ? formatRelativeVelocity(approach.relative_velocity.kilometers_per_hour) : '—'],
          ['Closest approach', approach ? formatApproachTime(approach.close_approach_date_full) : '—'],
        ].map(([label, value]) => (
          <div
            key={label}
            className="flex items-baseline justify-between gap-3 border-t border-(--fg-dim)/20 py-1.5 first:border-t-0"
          >
            <span className="font-(family-name:--font-data) text-[10px] tracking-wide text-(--fg-dim) uppercase">
              {label}
            </span>
            <span className="font-(family-name:--font-data) text-right text-xs text-(--fg)">
              {value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function NeoRadar({ asteroids }) {
  const [hoveredId, setHoveredId] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const activeId = hoveredId ?? selectedId

  const { items, rings } = useMemo(() => layoutAsteroids(asteroids), [asteroids])
  const activeItem = items.find((item) => item.asteroid.id === activeId) ?? null

  return (
    <div className="mt-4">
      <div className="grid grid-cols-1 overflow-hidden rounded-sm border border-(--fg-dim)/40 sm:grid-cols-[1fr_190px]">
        <div className="relative h-[300px] w-full bg-[#050810] sm:h-[340px]">
          <svg
            viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
            className="h-full w-full"
            onPointerDown={(e) => {
              if (e.target === e.currentTarget) setSelectedId(null)
            }}
          >
            <SweepWedge />

            {rings.map((ring, i) => (
              <g key={i}>
                <circle
                  cx={CENTER}
                  cy={CENTER}
                  r={ring.radius}
                  fill="none"
                  stroke="#8ca3c7"
                  strokeOpacity={0.3}
                  strokeDasharray="3 4"
                />
                {/* Each ring's label sits at its own angle (diagonals) so the
                    four labels never stack on top of each other. */}
                <text
                  x={CENTER + (ring.radius + 12) * Math.cos((-135 + i * 90) * (Math.PI / 180))}
                  y={CENTER + (ring.radius + 12) * Math.sin((-135 + i * 90) * (Math.PI / 180))}
                  textAnchor="middle"
                  fill="#8ca3c7"
                  fontFamily="var(--font-data)"
                  fontSize="8"
                >
                  {kmToLunarDistances(ring.distanceKm).toFixed(1)} LD
                </text>
              </g>
            ))}

            {activeItem && (
              <line
                x1={CENTER}
                y1={CENTER}
                x2={activeItem.x}
                y2={activeItem.y}
                stroke={activeItem.asteroid.is_potentially_hazardous_asteroid ? 'var(--accent-red)' : 'var(--accent-blue)'}
                strokeDasharray="4 3"
                strokeOpacity={0.7}
              />
            )}

            {/* Earth */}
            <circle cx={CENTER} cy={CENTER} r={9} fill="var(--accent-blue)" opacity={0.35} />
            <circle cx={CENTER} cy={CENTER} r={5} fill="var(--accent-blue)" />
            <text
              x={CENTER}
              y={CENTER + 22}
              textAnchor="middle"
              fill="#8ca3c7"
              fontFamily="var(--font-data)"
              fontSize="8"
              letterSpacing="1"
            >
              EARTH
            </text>

            {items.map((item) => {
              const isActive = activeId === item.asteroid.id
              const hazardous = item.asteroid.is_potentially_hazardous_asteroid
              const color = hazardous ? 'var(--accent-red)' : 'var(--accent-blue)'
              return (
                <motion.circle
                  key={item.asteroid.id}
                  cx={item.x}
                  cy={item.y}
                  fill={color}
                  stroke={isActive ? 'var(--fg)' : 'none'}
                  strokeWidth={1.5}
                  style={{ cursor: 'pointer' }}
                  initial={{ r: 0, opacity: 0 }}
                  animate={{
                    r: isActive ? item.size * 1.6 : item.size,
                    opacity: hazardous ? [0.7, 1, 0.7] : 1,
                  }}
                  transition={
                    hazardous
                      ? { opacity: { repeat: Infinity, duration: 1.6 }, r: { duration: 0.2 } }
                      : { duration: 0.4 }
                  }
                  onPointerEnter={() => setHoveredId(item.asteroid.id)}
                  onPointerLeave={() => setHoveredId(null)}
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedId((current) => (current === item.asteroid.id ? null : item.asteroid.id))
                  }}
                />
              )
            })}
          </svg>
        </div>
        <div className="border-t border-(--fg-dim)/40 bg-(--bg) sm:border-t-0 sm:border-l">
          <AsteroidDetail item={activeItem} />
        </div>
      </div>
      <p className="mt-2 font-(family-name:--font-data) text-[10px] leading-relaxed text-(--fg-dim)">
        Distance from Earth is real (log-scaled to fit). Angular position is a schematic spread,
        not a real trajectory bearing — NASA's feed reports distance, not direction.
      </p>
    </div>
  )
}

export default NeoRadar
