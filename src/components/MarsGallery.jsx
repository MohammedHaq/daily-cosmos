import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { getMarsPhotos } from '../lib/nasa'
import { cameraFullName } from '../lib/format'
import Skeleton from './Skeleton'
import ErrorNotice from './ErrorNotice'

const ROVERS = [
  { id: 'curiosity', label: 'Curiosity' },
  { id: 'perseverance', label: 'Perseverance' },
]

function MarsGallery({ date }) {
  const [rover, setRover] = useState('curiosity')

  return (
    <section className="rounded-sm border border-(--fg-dim)/30 bg-(--bg-panel) p-6">
      <p className="font-(family-name:--font-data) text-[10px] tracking-[0.25em] text-(--accent-blue) uppercase">
        03 · Mars
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-(family-name:--font-display) text-2xl font-semibold">
          Rover Gallery
        </h2>
        <div className="relative flex gap-1 font-(family-name:--font-data) text-[11px] tracking-wide uppercase">
          {ROVERS.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRover(r.id)}
              className="relative px-3 py-1.5"
              aria-pressed={rover === r.id}
            >
              {rover === r.id && (
                <motion.span
                  layoutId="rover-tab-indicator"
                  className="absolute inset-0 rounded-full bg-(--accent-blue)"
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                />
              )}
              <span
                className="relative z-10"
                style={{ color: rover === r.id ? 'var(--bg)' : 'var(--fg-dim)' }}
              >
                {r.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <MarsPhotoGrid key={`${rover}|${date ?? 'latest'}`} rover={rover} date={date} />
      </AnimatePresence>
    </section>
  )
}

function MarsPhotoGrid({ rover, date }) {
  const [state, setState] = useState({ status: 'loading', photos: [], error: null })

  useEffect(() => {
    let cancelled = false

    getMarsPhotos(rover, date)
      .then((photos) => {
        if (!cancelled) setState({ status: 'ready', photos, error: null })
      })
      .catch((error) => {
        if (!cancelled) setState({ status: 'error', photos: [], error })
      })

    return () => {
      cancelled = true
    }
  }, [rover, date])

  if (state.status === 'loading') {
    return (
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="aspect-square" />
        ))}
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="mt-4">
        <ErrorNotice title="Signal lost" message={`Couldn't reach the rover — ${state.error.message}`} />
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3"
    >
      {state.photos.slice(0, 9).map((photo) => (
        <figure key={photo.id} className="group overflow-hidden border border-(--fg-dim)/30 bg-(--bg)">
          <div className="aspect-square overflow-hidden">
            <img
              src={photo.img_src}
              alt={`${photo.rover?.name} — ${cameraFullName(photo.camera)}`}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
              loading="lazy"
            />
          </div>
          <figcaption className="px-2 py-1.5 font-(family-name:--font-data) text-[10px] leading-tight text-(--fg-dim)">
            <p className="truncate">{cameraFullName(photo.camera)}</p>
            <p>
              Sol {photo.sol} · {photo.rover?.name}
            </p>
          </figcaption>
        </figure>
      ))}
      {state.photos.length === 0 && (
        <p className="col-span-full font-(family-name:--font-body) text-sm text-(--fg-dim)">
          No photos found for this date.
        </p>
      )}
    </motion.div>
  )
}

export default MarsGallery
