import { useEffect, useState } from 'react'
import { getNeoFeed } from '../lib/nasa'
import Skeleton from './Skeleton'
import ErrorNotice from './ErrorNotice'
import NeoRadar from './NeoRadar'

function missDistanceKm(asteroid) {
  return Number(asteroid.close_approach_data?.[0]?.miss_distance?.kilometers ?? Infinity)
}

function NearEarthPanel({ date }) {
  // Keyed remount on `date` resets state cleanly instead of setState-in-effect.
  return <NearEarthContent key={date ?? 'today'} date={date} />
}

function NearEarthContent({ date }) {
  const [state, setState] = useState({ status: 'loading', asteroids: [], error: null })

  useEffect(() => {
    let cancelled = false

    getNeoFeed(date)
      .then((asteroids) => {
        if (cancelled) return
        const sorted = [...asteroids].sort((a, b) => missDistanceKm(a) - missDistanceKm(b))
        setState({ status: 'ready', asteroids: sorted, error: null })
      })
      .catch((error) => {
        if (!cancelled) setState({ status: 'error', asteroids: [], error })
      })

    return () => {
      cancelled = true
    }
  }, [date])

  return (
    <section className="flex h-full flex-col rounded-sm border border-(--fg-dim)/30 bg-(--bg-panel) p-6">
      <p className="font-(family-name:--font-data) text-[10px] tracking-[0.25em] text-(--accent-blue) uppercase">
        02 · NEO Feed
      </p>
      <h2 className="mt-2 font-(family-name:--font-display) text-2xl font-semibold">
        Nearby Today
      </h2>

      {state.status === 'loading' && (
        <div className="mt-4 space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      )}

      {state.status === 'error' && (
        <div className="mt-4">
          <ErrorNotice message={`Couldn't load nearby objects — ${state.error.message}`} />
        </div>
      )}

      {state.status === 'ready' && state.asteroids.length === 0 && (
        <p className="mt-4 font-(family-name:--font-body) text-sm text-(--fg-dim)">
          No tracked objects for this date.
        </p>
      )}

      {state.status === 'ready' && state.asteroids.length > 0 && (
        <NeoRadar asteroids={state.asteroids} />
      )}
    </section>
  )
}

export default NearEarthPanel
