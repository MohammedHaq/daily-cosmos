// Static reference data — not from a live API. NASA doesn't expose planet
// fact-sheet data through any of the 4 Open APIs this app already uses, so
// these figures come from NASA's own published Planetary Fact Sheets:
// https://nssdc.gsfc.nasa.gov/planetary/factsheet/
// Moon counts in particular keep changing as new small moons are confirmed —
// treat these as "recent, roughly right," not live.
export const PLANET_FACTS = {
  mercury: {
    meanTempC: 167,
    orbitalSpeedKms: 47.4,
    dayLengthHours: 1407.6,
    yearLengthEarthDays: 88.0,
    diameterKm: 4879,
    moons: 0,
    blurb: 'Closest to the Sun and the fastest mover — a Mercury year is shorter than its own day.',
  },
  venus: {
    meanTempC: 464,
    orbitalSpeedKms: 35.0,
    dayLengthHours: 5832.5,
    yearLengthEarthDays: 224.7,
    diameterKm: 12104,
    moons: 0,
    blurb: 'The hottest planet by far, thanks to a runaway greenhouse atmosphere — and it spins backwards.',
  },
  earth: {
    meanTempC: 15,
    orbitalSpeedKms: 29.8,
    dayLengthHours: 23.9,
    yearLengthEarthDays: 365.2,
    diameterKm: 12756,
    moons: 1,
    blurb: 'The only known world with liquid surface water — and the terminator line you see sweeping across it right now is real.',
  },
  mars: {
    meanTempC: -65,
    orbitalSpeedKms: 24.1,
    dayLengthHours: 24.6,
    yearLengthEarthDays: 687.0,
    diameterKm: 6792,
    moons: 2,
    blurb: 'A day on Mars is almost exactly an Earth day — home to the solar system’s tallest volcano, Olympus Mons.',
  },
  jupiter: {
    meanTempC: -110,
    orbitalSpeedKms: 13.1,
    dayLengthHours: 9.9,
    yearLengthEarthDays: 4331,
    diameterKm: 142984,
    moons: 95,
    blurb: 'The largest planet spins so fast its day is under 10 hours, despite being 11x Earth’s diameter.',
  },
  saturn: {
    meanTempC: -140,
    orbitalSpeedKms: 9.7,
    dayLengthHours: 10.7,
    yearLengthEarthDays: 10747,
    diameterKm: 120536,
    moons: 146,
    blurb: 'Famous for its rings, made almost entirely of ice and rock — and it’s the only planet less dense than water.',
  },
  uranus: {
    meanTempC: -195,
    orbitalSpeedKms: 6.8,
    dayLengthHours: 17.2,
    yearLengthEarthDays: 30589,
    diameterKm: 51118,
    moons: 28,
    blurb: 'Rotates on its side (98° axial tilt), likely knocked over by an ancient collision.',
  },
  neptune: {
    meanTempC: -200,
    orbitalSpeedKms: 5.4,
    dayLengthHours: 16.1,
    yearLengthEarthDays: 59800,
    diameterKm: 49528,
    moons: 16,
    blurb: 'The windiest planet, with supersonic storms — and it hasn’t completed a full orbit since its 1846 discovery until 2011.',
  },
}

export function formatYearLength(days) {
  if (days < 500) return `${days.toFixed(1)} Earth days`
  return `${(days / 365.25).toFixed(1)} Earth years`
}

export function formatDayLength(hours) {
  if (hours < 48) return `${hours.toFixed(1)} hours`
  return `${(hours / 24).toFixed(1)} Earth days`
}
