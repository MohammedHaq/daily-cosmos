import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { getEpic, epicImageUrl } from '../lib/nasa'
import Skeleton from './Skeleton'
import ErrorNotice from './ErrorNotice'

function formatEpicTimestamp(dateStr) {
  const iso = dateStr.replace(' ', 'T') + 'Z'
  return new Date(iso).toLocaleString('en-US', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'UTC',
  })
}

function EarthView({ date }) {
  // Keyed remount on `date` resets state cleanly instead of setState-in-effect.
  return <EarthViewContent key={date ?? 'latest'} date={date} />
}

function EarthViewContent({ date }) {
  const [state, setState] = useState({ status: 'loading', image: null, error: null })

  useEffect(() => {
    let cancelled = false

    getEpic(date)
      .then((images) => {
        if (cancelled) return
        const latest = [...images].sort((a, b) => new Date(b.date) - new Date(a.date))[0] ?? null
        setState({ status: 'ready', image: latest, error: null })
      })
      .catch((error) => {
        if (!cancelled) setState({ status: 'error', image: null, error })
      })

    return () => {
      cancelled = true
    }
  }, [date])

  return (
    <section className="flex h-full flex-col rounded-sm border border-(--fg-dim)/30 bg-(--bg-panel) p-6">
      <p className="font-(family-name:--font-data) text-[10px] tracking-[0.25em] text-(--accent-blue) uppercase">
        03 · EPIC
      </p>
      <h2 className="mt-2 font-(family-name:--font-display) text-2xl font-semibold">
        Earth, Right Now
      </h2>

      <div className="flex flex-1 flex-col items-center justify-center">
        {state.status === 'loading' && (
          <div className="w-full">
            <Skeleton className="mx-auto aspect-square w-full max-w-xs rounded-full" />
          </div>
        )}

        {state.status === 'error' && (
          <div className="w-full">
            <ErrorNotice message={`Couldn't reach the EPIC camera — ${state.error.message}`} />
          </div>
        )}

        {state.status === 'ready' && !state.image && (
          <p className="font-(family-name:--font-body) text-sm text-(--fg-dim)">
            No Earth imagery available for this date.
          </p>
        )}

        {state.status === 'ready' && state.image && (
          <motion.figure
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="w-full"
          >
            <div className="mx-auto aspect-square w-full max-w-xs overflow-hidden rounded-full border border-(--fg-dim)/40 bg-(--bg)">
              <img
                src={epicImageUrl(state.image)}
                alt="Earth as seen from the DSCOVR satellite"
                className="h-full w-full object-cover"
              />
            </div>
            <figcaption className="mt-3 text-center font-(family-name:--font-data) text-[11px] tracking-wide text-(--fg-dim)">
              {formatEpicTimestamp(state.image.date)} UTC
            </figcaption>
          </motion.figure>
        )}
      </div>
    </section>
  )
}

export default EarthView
