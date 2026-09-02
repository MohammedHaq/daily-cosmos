import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { getApod } from '../lib/nasa'
import Skeleton from './Skeleton'
import ErrorNotice from './ErrorNotice'

function Hero({ date }) {
  // Keyed remount on `date` resets state cleanly instead of setState-in-effect.
  return <HeroContent key={date ?? 'today'} date={date} />
}

function HeroContent({ date }) {
  const [state, setState] = useState({ status: 'loading', data: null, error: null })

  useEffect(() => {
    let cancelled = false

    getApod(date)
      .then((data) => {
        if (!cancelled) setState({ status: 'ready', data, error: null })
      })
      .catch((error) => {
        if (!cancelled) setState({ status: 'error', data: null, error })
      })

    return () => {
      cancelled = true
    }
  }, [date])

  if (state.status === 'loading') {
    return (
      <section className="border-b-2 border-(--fg) px-6 py-10 sm:px-10">
        <div className="mx-auto max-w-5xl">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="mt-4 h-10 w-2/3" />
          <Skeleton className="mt-6 aspect-video w-full" />
        </div>
      </section>
    )
  }

  if (state.status === 'error') {
    return (
      <section className="border-b-2 border-(--accent-red) px-6 py-10 sm:px-10">
        <div className="mx-auto max-w-5xl">
          <ErrorNotice message={`Couldn't reach today's astronomy picture — ${state.error.message}`} />
        </div>
      </section>
    )
  }

  const { title, explanation, url, hdurl, media_type, copyright, date: apodDate } = state.data

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="border-b-2 border-(--fg) px-6 py-10 sm:px-10"
    >
      <div className="mx-auto max-w-5xl">
        <div className="flex items-baseline justify-between gap-4">
          <p className="font-(family-name:--font-data) text-xs tracking-[0.25em] text-(--accent-red) uppercase">
            Today's Transmission
          </p>
          <p className="font-(family-name:--font-data) text-xs text-(--fg-dim)">{apodDate}</p>
        </div>

        <h2 className="mt-2 font-(family-name:--font-display) text-4xl font-bold sm:text-5xl">
          {title}
        </h2>

        <figure className="mt-6 border border-(--fg-dim)/40 bg-(--bg-panel) p-2">
          {media_type === 'video' ? (
            <div className="aspect-video w-full">
              <iframe
                src={url}
                title={title}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <a href={hdurl || url} target="_blank" rel="noreferrer">
              <img src={url} alt={title} className="w-full" />
            </a>
          )}
          {copyright && (
            <figcaption className="mt-2 px-1 font-(family-name:--font-data) text-[10px] tracking-wide text-(--fg-dim)">
              © {copyright.trim()}
            </figcaption>
          )}
        </figure>

        <p className="mt-6 max-w-3xl font-(family-name:--font-body) text-lg leading-relaxed text-(--fg-dim)">
          {explanation}
        </p>
      </div>
    </motion.section>
  )
}

export default Hero
