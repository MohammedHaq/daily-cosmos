const LUNAR_DISTANCE_KM = 384_400

const SIZE_REFERENCES = [
  { name: 'a person', meters: 1.8 },
  { name: 'a car', meters: 4.5 },
  { name: 'a school bus', meters: 11 },
  { name: 'a blue whale', meters: 30 },
  { name: 'a Boeing 737', meters: 38 },
  { name: 'a soccer field', meters: 105 },
  { name: 'the Statue of Liberty', meters: 93 },
  { name: 'the Eiffel Tower', meters: 330 },
  { name: 'the Empire State Building', meters: 443 },
  { name: 'the Burj Khalifa', meters: 828 },
]

export function diameterComparison(meters) {
  let closest = SIZE_REFERENCES[0]
  let closestRatio = Infinity

  for (const ref of SIZE_REFERENCES) {
    const ratio = Math.max(meters / ref.meters, ref.meters / meters)
    if (ratio < closestRatio) {
      closestRatio = ratio
      closest = ref
    }
  }

  return `about the size of ${closest.name}`
}

export function kmToLunarDistances(km) {
  return km / LUNAR_DISTANCE_KM
}

export function formatLunarDistance(km) {
  const ld = kmToLunarDistances(km)
  if (ld < 0.1) return `${ld.toFixed(3)} lunar distances`
  return `${ld.toFixed(2)} lunar distances`
}

export function formatRelativeVelocity(kmPerHour) {
  const kph = Number(kmPerHour)
  return `${Math.round(kph).toLocaleString()} km/h`
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// NASA's close_approach_date_full ("2026-Sep-02 14:32") is UTC but unlabeled —
// `new Date(string)` would parse it as local time depending on the browser's
// timezone, so this parses it manually and formats it explicitly as UTC.
export function formatApproachTime(closeApproachDateFull) {
  const match = closeApproachDateFull?.match(/^(\d{4})-([A-Za-z]{3})-(\d{2}) (\d{2}):(\d{2})$/)
  if (!match) return closeApproachDateFull ?? 'Unknown'

  const [, year, monthAbbr, day, hour, minute] = match
  const month = MONTHS.indexOf(monthAbbr)
  if (month === -1) return closeApproachDateFull

  const date = new Date(Date.UTC(Number(year), month, Number(day), Number(hour), Number(minute)))
  return `${date.toLocaleString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}, ${hour}:${minute} UTC`
}

const CAMERA_NAMES = {
  FHAZ: 'Front Hazard Avoidance Camera',
  RHAZ: 'Rear Hazard Avoidance Camera',
  MAST: 'Mast Camera',
  CHEMCAM: 'Chemistry and Camera Complex',
  MAHLI: 'Mars Hand Lens Imager',
  MARDI: 'Mars Descent Imager',
  NAVCAM: 'Navigation Camera',
  PANCAM: 'Panoramic Camera',
  MINITES: 'Miniature Thermal Emission Spectrometer',
  EDL_RUCAM: 'Rover Up-Look Camera',
  EDL_RDCAM: 'Rover Down-Look Camera',
  EDL_DDCAM: 'Descent Stage Down-Look Camera',
  EDL_PUCAM1: 'Parachute Up-Look Camera A',
  EDL_PUCAM2: 'Parachute Up-Look Camera B',
  NAVCAM_LEFT: 'Navigation Camera - Left',
  NAVCAM_RIGHT: 'Navigation Camera - Right',
  MCZ_RIGHT: 'Mastcam-Z Right',
  MCZ_LEFT: 'Mastcam-Z Left',
  FRONT_HAZCAM_LEFT_A: 'Front Hazard Avoidance Camera - Left',
  FRONT_HAZCAM_RIGHT_A: 'Front Hazard Avoidance Camera - Right',
  REAR_HAZCAM_LEFT: 'Rear Hazard Avoidance Camera - Left',
  REAR_HAZCAM_RIGHT: 'Rear Hazard Avoidance Camera - Right',
  SKYCAM: 'MEDA Skycam',
  SHERLOC_WATSON: 'SHERLOC WATSON Camera',
}

export function cameraFullName(camera) {
  const code = camera?.name?.toUpperCase()
  return CAMERA_NAMES[code] || camera?.full_name || camera?.name || 'Unknown Camera'
}
