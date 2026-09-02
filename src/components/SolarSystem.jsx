import { useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Line, Stars } from '@react-three/drei'
import * as THREE from 'three'
import {
  PLANETS,
  COMETS,
  heliocentricPosition,
  orbitEllipsePoints,
  earthRotationDeg,
  cometPosition,
  cometOrbitPoints,
} from '../lib/orbitalMechanics'
import { PLANET_FACTS, SUN_FACTS, formatDayLength, formatYearLength } from '../lib/planetFacts'

const DEG2RAD = Math.PI / 180
const SIMULATED_DAYS_PER_SECOND = 2 // ~1 real second = 2 simulated days: Mercury laps in ~44s, Earth in ~3min
const EARTH_AXIAL_TILT = 23.4 * DEG2RAD

const SCENE_MIN_A = 0.38709927 // Mercury's semi-major axis (AU)
const SCENE_MAX_A = 30.06992276 // Neptune's semi-major axis (AU)
const SCENE_MIN_RADIUS = 2.4
const SCENE_MAX_RADIUS = 15

const GRID_LINE_COLOR = '#8ca3c7' // mirrors --color-grid-line
const SUN_COLOR = '#f2a765'

const PLANET_RENDER_SIZE = {
  mercury: 0.09,
  venus: 0.16,
  earth: 0.17,
  mars: 0.13,
  jupiter: 0.52,
  saturn: 0.46,
  uranus: 0.3,
  neptune: 0.29,
}

// Non-linear (log) scale: compresses true AU distances into a usable scene
// range. True relative distances + true relative sizes together would be
// unusable in one view (the Sun would dwarf everything at a scale that pushes
// Neptune far off-screen) — this is standard practice for orbit diagrams.
function compressedRadius(trueA) {
  const t =
    (Math.log(trueA) - Math.log(SCENE_MIN_A)) / (Math.log(SCENE_MAX_A) - Math.log(SCENE_MIN_A))
  return SCENE_MIN_RADIUS + t * (SCENE_MAX_RADIUS - SCENE_MIN_RADIUS)
}

// AU (ecliptic x, y, z) -> three.js scene units (y-up).
function toSceneVector(x, y, z, scale) {
  return [x * scale, z * scale, -y * scale]
}

// Comets are far more eccentric than any planet (e up to ~0.97), so scaling
// them by semi-major-axis like compressedRadius() would push their aphelion
// (~2x the compressed "a") well past the camera's framing. Instead each comet
// gets its own scale derived from its true APHELION distance — the visually
// relevant extreme — log-mapped into a range that only slightly exceeds
// Neptune's ring, keeping every comet's full ellipse in frame while still
// reading as dramatically larger/faster than the planets' near-circular orbits.
const COMET_MIN_APHELION_AU = Math.min(...COMETS.map((c) => c.a * (1 + c.e)))
const COMET_MAX_APHELION_AU = Math.max(...COMETS.map((c) => c.a * (1 + c.e)))
const COMET_MIN_SCENE_RADIUS = 6
const COMET_MAX_SCENE_RADIUS = 19

function cometSceneScale(comet) {
  const aphelion = comet.a * (1 + comet.e)
  const t =
    COMET_MAX_APHELION_AU > COMET_MIN_APHELION_AU
      ? (Math.log(aphelion) - Math.log(COMET_MIN_APHELION_AU)) /
        (Math.log(COMET_MAX_APHELION_AU) - Math.log(COMET_MIN_APHELION_AU))
      : 0.5
  const sceneAphelion = COMET_MIN_SCENE_RADIUS + t * (COMET_MAX_SCENE_RADIUS - COMET_MIN_SCENE_RADIUS)
  return sceneAphelion / aphelion
}

function nextPerihelion(comet, after) {
  const periodMs = comet.periodYears * 365.25 * 86_400_000
  let t = new Date(comet.perihelionDate).getTime()
  while (t < after.getTime()) t += periodMs
  return new Date(t)
}

// A schematic lat/long graticule globe texture (no photographic imagery) —
// mirrors the blueprint-grid motif used elsewhere on the page, and gives
// Earth's spin something visible to show as it rotates.
function createEarthGraticuleTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 256
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = '#12335c'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  ctx.strokeStyle = GRID_LINE_COLOR
  ctx.globalAlpha = 0.55
  ctx.lineWidth = 1
  for (let lon = 0; lon <= canvas.width; lon += canvas.width / 12) {
    ctx.beginPath()
    ctx.moveTo(lon, 0)
    ctx.lineTo(lon, canvas.height)
    ctx.stroke()
  }
  for (let lat = 0; lat <= canvas.height; lat += canvas.height / 6) {
    ctx.beginPath()
    ctx.moveTo(0, lat)
    ctx.lineTo(canvas.width, lat)
    ctx.stroke()
  }

  ctx.globalAlpha = 0.9
  ctx.strokeStyle = '#fc3d21'
  ctx.beginPath()
  ctx.moveTo(0, canvas.height / 2)
  ctx.lineTo(canvas.width, canvas.height / 2)
  ctx.stroke()

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

const SUN_SIZE = 0.9

function Sun({ hoveredKey, onHover, onSelect }) {
  const ref = useRef(null)
  const isHovered = hoveredKey === 'sun'

  useFrame(({ clock }) => {
    if (!ref.current) return
    const pulse = 1 + Math.sin(clock.elapsedTime * 0.8) * 0.03
    ref.current.scale.setScalar(pulse)
  })

  return (
    <group>
      <pointLight color="#fff3df" intensity={80} distance={0} decay={0.6} />
      <mesh
        ref={ref}
        onPointerOver={(e) => {
          e.stopPropagation()
          onHover('sun')
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={(e) => {
          e.stopPropagation()
          onHover(null)
          document.body.style.cursor = 'auto'
        }}
        onClick={(e) => {
          e.stopPropagation()
          onSelect('sun')
        }}
      >
        <sphereGeometry args={[SUN_SIZE, 32, 32]} />
        <meshBasicMaterial color={SUN_COLOR} />
      </mesh>
      {isHovered && (
        <mesh>
          <sphereGeometry args={[SUN_SIZE * 1.3, 24, 24]} />
          <meshBasicMaterial color={SUN_COLOR} transparent opacity={0.2} />
        </mesh>
      )}
    </group>
  )
}

function OrbitRings({ now }) {
  const rings = useMemo(
    () =>
      PLANETS.map((planet) => {
        const points = orbitEllipsePoints(planet, now, 128)
        const { a } = heliocentricPosition(planet, now)
        const scale = compressedRadius(a) / a
        return {
          key: planet.key,
          points: points.map((p) => toSceneVector(p.x, p.y, p.z, scale)),
        }
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  return (
    <>
      {rings.map((ring) => (
        <Line
          key={ring.key}
          points={ring.points}
          color={GRID_LINE_COLOR}
          transparent
          opacity={0.35}
          dashed
          dashSize={0.15}
          gapSize={0.12}
        />
      ))}
    </>
  )
}

function CometOrbitRings() {
  const rings = useMemo(
    () =>
      COMETS.map((comet) => {
        const points = cometOrbitPoints(comet, 160)
        const scale = cometSceneScale(comet)
        return {
          key: comet.key,
          points: points.map((p) => toSceneVector(p.x, p.y, p.z, scale)),
        }
      }),
    [],
  )

  return (
    <>
      {rings.map((ring) => (
        <Line
          key={ring.key}
          points={ring.points}
          color="#bfe4e8"
          transparent
          opacity={0.3}
          dashed
          dashSize={0.1}
          gapSize={0.16}
        />
      ))}
    </>
  )
}

function Comets({ simTimeRef, hoveredKey, onHover, onSelect }) {
  const groupRefs = useRef({})
  const COMET_SIZE = 0.07

  useFrame(() => {
    const date = simTimeRef.current
    for (const comet of COMETS) {
      const { x, y, z } = cometPosition(comet, date)
      const scale = cometSceneScale(comet)
      const group = groupRefs.current[comet.key]
      if (group) group.position.set(...toSceneVector(x, y, z, scale))
    }
  })

  return (
    <>
      {COMETS.map((comet) => {
        const isHovered = hoveredKey === comet.key
        return (
          <group key={comet.key} ref={(el) => (groupRefs.current[comet.key] = el)}>
            <mesh
              onPointerOver={(e) => {
                e.stopPropagation()
                onHover(comet.key)
                document.body.style.cursor = 'pointer'
              }}
              onPointerOut={(e) => {
                e.stopPropagation()
                onHover(null)
                document.body.style.cursor = 'auto'
              }}
              onClick={(e) => {
                e.stopPropagation()
                onSelect(comet.key)
              }}
            >
              <sphereGeometry args={[COMET_SIZE, 16, 16]} />
              <meshStandardMaterial
                color={comet.color}
                emissive={comet.color}
                emissiveIntensity={isHovered ? 0.9 : 0.6}
              />
            </mesh>
            {isHovered && (
              <mesh>
                <sphereGeometry args={[COMET_SIZE * 2.2, 16, 16]} />
                <meshBasicMaterial color={comet.color} transparent opacity={0.2} />
              </mesh>
            )}
          </group>
        )
      })}
    </>
  )
}

function Planets({ simTimeRef, hoveredKey, onHover, onSelect }) {
  const groupRefs = useRef({})
  const spinRefs = useRef({})
  const earthTexture = useMemo(() => createEarthGraticuleTexture(), [])

  useFrame(() => {
    const date = simTimeRef.current
    for (const planet of PLANETS) {
      const { x, y, z, a } = heliocentricPosition(planet, date)
      const scale = compressedRadius(a) / a
      const group = groupRefs.current[planet.key]
      if (group) group.position.set(...toSceneVector(x, y, z, scale))
    }
    const earthSpin = spinRefs.current.earth
    if (earthSpin) earthSpin.rotation.y = earthRotationDeg(date) * DEG2RAD
  })

  return (
    <>
      {PLANETS.map((planet) => {
        const isEarth = planet.key === 'earth'
        const isHovered = hoveredKey === planet.key
        const size = PLANET_RENDER_SIZE[planet.key]

        return (
          <group key={planet.key} ref={(el) => (groupRefs.current[planet.key] = el)}>
            <group rotation={isEarth ? [EARTH_AXIAL_TILT, 0, 0] : [0, 0, 0]}>
              <mesh
                ref={isEarth ? (el) => (spinRefs.current.earth = el) : undefined}
                onPointerOver={(e) => {
                  e.stopPropagation()
                  onHover(planet.key)
                  document.body.style.cursor = 'pointer'
                }}
                onPointerOut={(e) => {
                  e.stopPropagation()
                  onHover(null)
                  document.body.style.cursor = 'auto'
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  onSelect(planet.key)
                }}
              >
                <sphereGeometry args={[size, 24, 24]} />
                {isEarth ? (
                  <meshStandardMaterial map={earthTexture} roughness={0.9} />
                ) : (
                  <meshStandardMaterial
                    color={planet.color}
                    emissive={planet.color}
                    emissiveIntensity={isHovered ? 0.55 : 0.3}
                    roughness={0.85}
                  />
                )}
              </mesh>
            </group>
            {isHovered && (
              <mesh>
                <sphereGeometry args={[size * 1.7, 16, 16]} />
                <meshBasicMaterial color={planet.color} transparent opacity={0.18} />
              </mesh>
            )}
          </group>
        )
      })}
    </>
  )
}

function ClockDriver({ simTimeRef }) {
  useFrame((_, delta) => {
    const advanced = delta * SIMULATED_DAYS_PER_SECOND * 86_400_000
    simTimeRef.current = new Date(simTimeRef.current.getTime() + advanced)
  })
  return null
}

function StatRow({ label, value }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-t border-(--fg-dim)/20 py-1.5 first:border-t-0">
      <span className="font-(family-name:--font-data) text-[10px] tracking-wide text-(--fg-dim) uppercase">
        {label}
      </span>
      <span className="font-(family-name:--font-data) text-xs text-(--fg)">{value}</span>
    </div>
  )
}

function PlanetInfoPanel({ planetKey, now }) {
  if (!planetKey) {
    return (
      <div className="flex h-full flex-col justify-center px-5 py-6 text-center">
        <p className="font-(family-name:--font-data) text-[10px] tracking-[0.25em] text-(--fg-dim) uppercase">
          No target selected
        </p>
        <p className="mt-2 font-(family-name:--font-body) text-sm text-(--fg-dim)">
          Hover or tap the Sun, a planet, or a comet for its telemetry.
        </p>
      </div>
    )
  }

  if (planetKey === 'sun') {
    return (
      <div className="px-5 py-6">
        <p
          className="font-(family-name:--font-data) text-[10px] tracking-[0.25em] uppercase"
          style={{ color: SUN_COLOR }}
        >
          Target locked · Star
        </p>
        <h3 className="mt-1 font-(family-name:--font-display) text-2xl font-semibold">The Sun</h3>
        <p className="mt-2 font-(family-name:--font-body) text-sm text-(--fg-dim)">{SUN_FACTS.blurb}</p>
        <div className="mt-4">
          <StatRow label="Type" value={SUN_FACTS.type} />
          <StatRow label="Surface temperature" value={`${SUN_FACTS.surfaceTempC.toLocaleString()}°C`} />
          <StatRow label="Core temperature" value={`${SUN_FACTS.coreTempC.toLocaleString()}°C`} />
          <StatRow label="Diameter" value={`${SUN_FACTS.diameterKm.toLocaleString()} km`} />
          <StatRow label="Mass" value={`${SUN_FACTS.massEarths.toLocaleString()}× Earth`} />
          <StatRow label="Age" value={`${SUN_FACTS.ageBillionYears} billion years`} />
          <StatRow label="Rotation (equator)" value={`~${SUN_FACTS.rotationDaysAtEquator} Earth days`} />
        </div>
      </div>
    )
  }

  const comet = COMETS.find((c) => c.key === planetKey)
  if (comet) {
    const perihelionAU = comet.a * (1 - comet.e)
    const aphelionAU = comet.a * (1 + comet.e)
    return (
      <div className="px-5 py-6">
        <p
          className="font-(family-name:--font-data) text-[10px] tracking-[0.25em] uppercase"
          style={{ color: comet.color }}
        >
          Target locked · Comet
        </p>
        <h3 className="mt-1 font-(family-name:--font-display) text-2xl font-semibold">
          {comet.name}
        </h3>
        <p className="mt-2 font-(family-name:--font-body) text-sm text-(--fg-dim)">
          Orbital elements from JPL's Small-Body Database. Highly eccentric orbit shown
          compressed for framing — its real swing from near the Sun to far past the outer
          planets is even more dramatic than it looks here.
        </p>
        <div className="mt-4">
          <StatRow label="Orbital period" value={`${comet.periodYears} years`} />
          <StatRow label="Closest approach" value={`${perihelionAU.toFixed(2)} AU`} />
          <StatRow label="Farthest distance" value={`${aphelionAU.toFixed(1)} AU`} />
          <StatRow label="Inclination" value={`${comet.i.toFixed(1)}°${comet.i > 90 ? ' (retrograde)' : ''}`} />
          <StatRow label="Next perihelion" value={nextPerihelion(comet, now).getUTCFullYear()} />
        </div>
      </div>
    )
  }

  const planet = PLANETS.find((p) => p.key === planetKey)
  const facts = PLANET_FACTS[planetKey]

  return (
    <div className="px-5 py-6">
      <p
        className="font-(family-name:--font-data) text-[10px] tracking-[0.25em] uppercase"
        style={{ color: planet.color }}
      >
        Target locked
      </p>
      <h3 className="mt-1 font-(family-name:--font-display) text-2xl font-semibold">
        {planet.name}
      </h3>
      <p className="mt-2 font-(family-name:--font-body) text-sm text-(--fg-dim)">{facts.blurb}</p>
      <div className="mt-4">
        <StatRow label="Mean temperature" value={`${facts.meanTempC}°C`} />
        <StatRow label="Orbital speed" value={`${facts.orbitalSpeedKms} km/s`} />
        <StatRow label="Day length" value={formatDayLength(facts.dayLengthHours)} />
        <StatRow label="Year length" value={formatYearLength(facts.yearLengthEarthDays)} />
        <StatRow label="Diameter" value={`${facts.diameterKm.toLocaleString()} km`} />
        <StatRow label="Moons" value={facts.moons} />
      </div>
    </div>
  )
}

function SolarSystem() {
  const simTimeRef = useRef(new Date())
  const [hoveredKey, setHoveredKey] = useState(null)
  const [selectedKey, setSelectedKey] = useState(null)
  const now = useMemo(() => new Date(), [])

  const activeKey = hoveredKey ?? selectedKey

  return (
    <section className="border-b-2 border-(--fg) px-6 py-10 sm:px-10">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-baseline justify-between gap-4">
          <p className="font-(family-name:--font-data) text-xs tracking-[0.25em] text-(--accent-red) uppercase">
            Live Orbital Plot
          </p>
          <p className="font-(family-name:--font-data) text-xs text-(--fg-dim)">
            {now.toISOString().slice(0, 16).replace('T', ' ')} UTC
          </p>
        </div>
        <h2 className="mt-2 font-(family-name:--font-display) text-4xl font-bold sm:text-5xl">
          The Solar System, Right Now
        </h2>
        <p className="mt-2 max-w-2xl font-(family-name:--font-body) text-sm text-(--fg-dim)">
          Real planetary and cometary positions for this exact moment, computed from JPL's
          published orbital elements — animated forward from there so the motion is visible.
          Distances and sizes are compressed for legibility, not to true relative scale (comets
          get their own, more dramatic compression given how eccentric their orbits are). Drag to
          rotate, scroll to zoom, hover or tap the Sun, a planet, or a comet for its telemetry.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-0 overflow-hidden rounded-sm border border-(--fg-dim)/40 lg:grid-cols-[1fr_280px]">
          <div className="h-[420px] w-full bg-[#050810] sm:h-[520px]">
            <Canvas
              camera={{ position: [0, 11, 19], fov: 45 }}
              onPointerMissed={() => setSelectedKey(null)}
            >
              <ambientLight intensity={0.12} />
              <Sun hoveredKey={hoveredKey} onHover={setHoveredKey} onSelect={setSelectedKey} />
              <Stars radius={60} depth={30} count={2000} factor={2} fade speed={0.5} />
              <OrbitRings now={now} />
              <CometOrbitRings />
              <Planets
                simTimeRef={simTimeRef}
                hoveredKey={hoveredKey}
                onHover={setHoveredKey}
                onSelect={setSelectedKey}
              />
              <Comets
                simTimeRef={simTimeRef}
                hoveredKey={hoveredKey}
                onHover={setHoveredKey}
                onSelect={setSelectedKey}
              />
              <ClockDriver simTimeRef={simTimeRef} />
              <OrbitControls
                enablePan={false}
                minDistance={6}
                maxDistance={36}
                autoRotate
                autoRotateSpeed={0.15}
              />
            </Canvas>
          </div>
          <div className="border-t border-(--fg-dim)/40 bg-(--bg-panel) lg:border-t-0 lg:border-l">
            <PlanetInfoPanel planetKey={activeKey} now={now} />
          </div>
        </div>
      </div>
    </section>
  )
}

export default SolarSystem
