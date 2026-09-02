import { useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Line, Stars } from '@react-three/drei'
import * as THREE from 'three'
import { PLANETS, heliocentricPosition, orbitEllipsePoints, earthRotationDeg } from '../lib/orbitalMechanics'
import { PLANET_FACTS, formatDayLength, formatYearLength } from '../lib/planetFacts'

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

function Sun() {
  const ref = useRef(null)
  useFrame(({ clock }) => {
    if (!ref.current) return
    const pulse = 1 + Math.sin(clock.elapsedTime * 0.8) * 0.03
    ref.current.scale.setScalar(pulse)
  })
  return (
    <group>
      <pointLight color="#fff3df" intensity={80} distance={0} decay={0.6} />
      <mesh ref={ref}>
        <sphereGeometry args={[0.9, 32, 32]} />
        <meshBasicMaterial color={SUN_COLOR} />
      </mesh>
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

function PlanetInfoPanel({ planetKey }) {
  if (!planetKey) {
    return (
      <div className="flex h-full flex-col justify-center px-5 py-6 text-center">
        <p className="font-(family-name:--font-data) text-[10px] tracking-[0.25em] text-(--fg-dim) uppercase">
          No target selected
        </p>
        <p className="mt-2 font-(family-name:--font-body) text-sm text-(--fg-dim)">
          Hover or tap a planet to read its telemetry.
        </p>
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
          Real planetary positions for this exact moment, computed from JPL's published orbital
          elements — animated forward from there so the motion is visible. Distances and planet
          sizes are compressed for legibility, not to true relative scale. Drag to rotate, scroll
          to zoom, hover or tap a planet for its telemetry.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-0 overflow-hidden rounded-sm border border-(--fg-dim)/40 lg:grid-cols-[1fr_280px]">
          <div className="h-[420px] w-full bg-[#050810] sm:h-[520px]">
            <Canvas
              camera={{ position: [0, 11, 19], fov: 45 }}
              onPointerMissed={() => setSelectedKey(null)}
            >
              <ambientLight intensity={0.12} />
              <Sun />
              <Stars radius={60} depth={30} count={2000} factor={2} fade speed={0.5} />
              <OrbitRings now={now} />
              <Planets
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
            <PlanetInfoPanel planetKey={activeKey} />
          </div>
        </div>
      </div>
    </section>
  )
}

export default SolarSystem
