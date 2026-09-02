// Real-time planetary positions computed from JPL's published low-precision
// Keplerian orbital elements ("Keplerian Elements for Approximate Positions of
// the Major Planets," valid 1800-2050 AD): https://ssd.jpl.nasa.gov/planets/approx_pos.html
// No live API call needed — positions are a deterministic function of the date.
//
// Each entry: a = semi-major axis (AU), e = eccentricity, I = inclination (deg),
// L = mean longitude (deg), peri = longitude of perihelion (deg), node = longitude
// of ascending node (deg). "Rate" values are per Julian century, added to the
// base (J2000 epoch) value for the target date.
export const PLANETS = [
  {
    key: 'mercury',
    name: 'Mercury',
    color: '#a99a8c',
    elements: {
      a: [0.38709927, 0.00000037],
      e: [0.20563593, 0.00001906],
      I: [7.00497902, -0.00594749],
      L: [252.2503235, 149472.67411175],
      peri: [77.45779628, 0.16047689],
      node: [48.33076593, -0.12534081],
    },
  },
  {
    key: 'venus',
    name: 'Venus',
    color: '#d9b98a',
    elements: {
      a: [0.72333566, 0.0000039],
      e: [0.00677672, -0.00004107],
      I: [3.39467605, -0.0007889],
      L: [181.9790995, 58517.81538729],
      peri: [131.60246718, 0.00268329],
      node: [76.67984255, -0.27769418],
    },
  },
  {
    key: 'earth',
    name: 'Earth',
    color: '#4c7ac9',
    elements: {
      a: [1.00000261, 0.00000562],
      e: [0.01671123, -0.00004392],
      I: [-0.00001531, -0.01294668],
      L: [100.46457166, 35999.37244981],
      peri: [102.93768193, 0.32327364],
      node: [0, 0],
    },
  },
  {
    key: 'mars',
    name: 'Mars',
    color: '#c1440e',
    elements: {
      a: [1.52371034, 0.00001847],
      e: [0.0933941, 0.00007882],
      I: [1.84969142, -0.00813131],
      L: [-4.55343205, 19140.30268499],
      peri: [-23.94362959, 0.44441088],
      node: [49.55953891, -0.29257343],
    },
  },
  {
    key: 'jupiter',
    name: 'Jupiter',
    color: '#d9a066',
    elements: {
      a: [5.202887, -0.00011607],
      e: [0.04838624, -0.00013253],
      I: [1.30439695, -0.00183714],
      L: [34.39644051, 3034.74612775],
      peri: [14.72847983, 0.21252668],
      node: [100.47390909, 0.20469106],
    },
  },
  {
    key: 'saturn',
    name: 'Saturn',
    color: '#e0c185',
    elements: {
      a: [9.53667594, -0.0012506],
      e: [0.05386179, -0.00050991],
      I: [2.48599187, 0.00193609],
      L: [49.95424423, 1222.49362201],
      peri: [92.59887831, -0.41897216],
      node: [113.66242448, -0.28867794],
    },
  },
  {
    key: 'uranus',
    name: 'Uranus',
    color: '#9fd4de',
    elements: {
      a: [19.18916464, -0.00196176],
      e: [0.04725744, -0.00004397],
      I: [0.77263783, -0.00242939],
      L: [313.23810451, 428.48202785],
      peri: [170.9542763, 0.40805281],
      node: [74.01692503, 0.04240589],
    },
  },
  {
    key: 'neptune',
    name: 'Neptune',
    color: '#5b7fe0',
    elements: {
      a: [30.06992276, 0.00026291],
      e: [0.00859048, 0.00005105],
      I: [1.77004347, 0.00035372],
      L: [-55.12002969, 218.45945325],
      peri: [44.96476227, -0.32241464],
      node: [131.78422574, -0.00508664],
    },
  },
]

// Real orbital elements fetched live from JPL's Small-Body Database API
// (ssd-api.jpl.nasa.gov/sbdb.api, public, keyless) — a, e, i, node (Ω) and
// argument of perihelion (ω) directly, plus perihelionDate (Tp) instead of a
// mean-longitude table: comets are propagated from that one epoch via simple
// two-body mean motion (see cometPosition), not the centuries-long linear-rate
// fit used for planets, since comet elements are only trustworthy near their
// fit epoch. Good enough for a visual over this scene's session-length timescales.
export const COMETS = [
  {
    key: 'halley',
    name: '1P/Halley',
    color: '#bfe4e8',
    a: 17.9286,
    e: 0.9679,
    i: 162.191,
    Omega: 59.099,
    omega: 112.241,
    perihelionDate: '1986-02-08T11:22:00Z',
    periodYears: 75.9,
  },
  {
    key: 'encke',
    name: '2P/Encke',
    color: '#bfe4e8',
    a: 2.2197,
    e: 0.8475,
    i: 11.387,
    Omega: 334.15,
    omega: 187.174,
    perihelionDate: '2023-10-22T07:09:00Z',
    periodYears: 3.3,
  },
  {
    key: 'swift-tuttle',
    name: '109P/Swift-Tuttle',
    color: '#bfe4e8',
    a: 26.0921,
    e: 0.9632,
    i: 113.454,
    Omega: 139.381,
    omega: 152.982,
    perihelionDate: '1992-12-11T23:59:41Z',
    periodYears: 133.3,
  },
]

const DEG2RAD = Math.PI / 180

function normalizeDeg(deg) {
  return ((deg % 360) + 360) % 360
}

export function julianDate(date) {
  return date.getTime() / 86400000 + 2440587.5
}

function centuriesSinceJ2000(date) {
  return (julianDate(date) - 2451545.0) / 36525
}

function solveKepler(meanAnomalyRad, e) {
  let E = meanAnomalyRad + e * Math.sin(meanAnomalyRad)
  for (let i = 0; i < 6; i++) {
    const dE = (E - e * Math.sin(E) - meanAnomalyRad) / (1 - e * Math.cos(E))
    E -= dE
    if (Math.abs(dE) < 1e-8) break
  }
  return E
}

// Orbital elements resolved to a specific date (still in AU/degrees→radians).
function elementsAt(planet, date) {
  const T = centuriesSinceJ2000(date)
  const at = (pair) => pair[0] + pair[1] * T
  const { a: aE, e: eE, I: IE, L: LE, peri: periE, node: nodeE } = planet.elements

  const a = at(aE)
  const e = at(eE)
  const I = at(IE) * DEG2RAD
  const L = normalizeDeg(at(LE))
  const peri = normalizeDeg(at(periE))
  const node = normalizeDeg(at(nodeE))

  return {
    a,
    e,
    I,
    L,
    peri,
    omega: (peri - node) * DEG2RAD, // argument of perihelion
    Omega: node * DEG2RAD,
  }
}

// Position in AU (J2000 ecliptic frame) from an eccentric anomaly E (radians)
// and a set of resolved orbital elements.
function positionFromAnomaly(elements, E) {
  const { a, e, I, omega, Omega } = elements

  const xOrb = a * (Math.cos(E) - e)
  const yOrb = a * Math.sqrt(1 - e * e) * Math.sin(E)

  const cosO = Math.cos(Omega)
  const sinO = Math.sin(Omega)
  const cosI = Math.cos(I)
  const sinI = Math.sin(I)
  const cosW = Math.cos(omega)
  const sinW = Math.sin(omega)

  const x =
    (cosW * cosO - sinW * sinO * cosI) * xOrb + (-sinW * cosO - cosW * sinO * cosI) * yOrb
  const y =
    (cosW * sinO + sinW * cosO * cosI) * xOrb + (-sinW * sinO + cosW * cosO * cosI) * yOrb
  const z = sinW * sinI * xOrb + cosW * sinI * yOrb

  return { x, y, z }
}

// Heliocentric ecliptic position in AU (J2000 ecliptic plane), plus the true
// (uncompressed) semi-major axis, for the given planet at the given Date.
export function heliocentricPosition(planet, date) {
  const elements = elementsAt(planet, date)

  let M = normalizeDeg(elements.L - elements.peri)
  if (M > 180) M -= 360
  const E = solveKepler(M * DEG2RAD, elements.e)

  return { ...positionFromAnomaly(elements, E), a: elements.a }
}

// Points tracing the full orbit ellipse in AU, for drawing an orbit ring.
// Orientation is fixed at `date` (precession is far too slow to matter visually).
export function orbitEllipsePoints(planet, date, segments = 128) {
  const elements = elementsAt(planet, date)
  const points = []
  for (let i = 0; i <= segments; i++) {
    const E = (i / segments) * Math.PI * 2
    points.push(positionFromAnomaly(elements, E))
  }
  return points
}

// Resolved orbital elements for a comet, in the same shape positionFromAnomaly
// expects — unlike planets, i/Omega/omega don't change over the timescales
// this scene runs at, so they're used as-fetched rather than rate-adjusted.
function cometElements(comet) {
  return {
    a: comet.a,
    e: comet.e,
    I: comet.i * DEG2RAD,
    omega: comet.omega * DEG2RAD,
    Omega: comet.Omega * DEG2RAD,
  }
}

// Comet position via two-body mean motion from its perihelion epoch (Standard
// Gaussian gravitational constant k=0.01720209895 rad/day -> ~0.9856076686 deg/day
// at a=1 AU, scaled by a^-1.5). Not a multi-body integration — real comets drift
// from this over many orbits (outgassing, planetary perturbations), but for a
// visual over a browsing session the drift is imperceptible.
export function cometPosition(comet, date) {
  const elements = cometElements(comet)
  const n = 0.9856076686 / Math.pow(comet.a, 1.5)
  const daysSincePerihelion = julianDate(date) - julianDate(new Date(comet.perihelionDate))

  let M = normalizeDeg(n * daysSincePerihelion)
  if (M > 180) M -= 360
  const E = solveKepler(M * DEG2RAD, comet.e)

  return { ...positionFromAnomaly(elements, E), a: comet.a }
}

// Points tracing the comet's full orbit ellipse in AU, for the orbit ring.
export function cometOrbitPoints(comet, segments = 128) {
  const elements = cometElements(comet)
  const points = []
  for (let i = 0; i <= segments; i++) {
    const E = (i / segments) * Math.PI * 2
    points.push(positionFromAnomaly(elements, E))
  }
  return points
}

// Earth's rotation angle (degrees) about its axis "right now," via Greenwich
// Mean Sidereal Time (first-order approximation — plenty for a visual scene).
export function earthRotationDeg(date) {
  const d = julianDate(date) - 2451545.0
  return normalizeDeg(280.46061837 + 360.98564736629 * d)
}

// The subsolar point: the (lat, lon) on Earth where the Sun is directly
// overhead right now — i.e. the center of the daylight hemisphere. Standard
// low-precision solar-position formula (solar mean longitude/anomaly ->
// ecliptic longitude -> declination + right ascension), combined with the
// same GMST used by earthRotationDeg to get the sun's Greenwich hour angle.
// Good to a fraction of a degree — plenty for a visual day/night terminator.
export function subsolarPoint(date) {
  const n = julianDate(date) - 2451545.0

  const meanLong = normalizeDeg(280.46 + 0.9856474 * n)
  const meanAnomalyDeg = normalizeDeg(357.528 + 0.9856003 * n)
  const meanAnomaly = meanAnomalyDeg * DEG2RAD

  const eclipticLongDeg = normalizeDeg(
    meanLong + 1.915 * Math.sin(meanAnomaly) + 0.02 * Math.sin(2 * meanAnomaly),
  )
  const eclipticLong = eclipticLongDeg * DEG2RAD
  const obliquity = (23.439 - 0.0000004 * n) * DEG2RAD

  const lat = Math.asin(Math.sin(obliquity) * Math.sin(eclipticLong)) / DEG2RAD

  const raDeg = normalizeDeg(
    Math.atan2(Math.cos(obliquity) * Math.sin(eclipticLong), Math.cos(eclipticLong)) / DEG2RAD,
  )

  const hourAngle = normalizeDeg(earthRotationDeg(date) - raDeg)
  let lon = -hourAngle
  if (lon > 180) lon -= 360
  if (lon < -180) lon += 360

  return { lat, lon }
}
