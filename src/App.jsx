import { motion } from 'motion/react'
import NearEarthPanel from './components/NearEarthPanel'
import EarthView from './components/EarthView'
import SolarSystem from './components/SolarSystem'
import WeatherMap from './components/WeatherMap'
import SpaceWeather from './components/SpaceWeather'

const today = new Date().toLocaleDateString('en-US', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
})

const wordmark = 'DAILY COSMOS'

const letterVariants = {
  hidden: { opacity: 0, y: 10 },
  show: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.03 * i, duration: 0.35, ease: 'easeOut' },
  }),
}

const panelVariants = {
  hidden: { opacity: 0, y: 18 },
  show: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.5 + 0.12 * i, duration: 0.5, ease: 'easeOut' },
  }),
}

function App() {
  return (
    <div className="min-h-screen">
      <header className="border-b-4 border-(--fg) px-6 pt-10 pb-6 sm:px-10">
        <div className="mx-auto flex max-w-5xl items-end justify-between gap-4">
          <h1
            className="font-(family-name:--font-display) text-[13vw] leading-[0.85] font-black tracking-tight sm:text-6xl"
            aria-label={wordmark}
          >
            {wordmark.split('').map((char, i) => (
              <motion.span
                key={i}
                custom={i}
                initial="hidden"
                animate="show"
                variants={letterVariants}
                className="inline-block"
                style={{
                  color: char === ' ' ? undefined : i % 7 === 0 ? 'var(--accent-red)' : undefined,
                }}
              >
                {char === ' ' ? ' ' : char}
              </motion.span>
            ))}
          </h1>
          <div className="hidden shrink-0 text-right font-(family-name:--font-data) text-xs tracking-widest text-(--fg-dim) sm:block">
            <p>BULLETIN</p>
            <p>NO. 001</p>
          </div>
        </div>
        <div className="mx-auto mt-3 flex max-w-5xl flex-wrap items-center justify-between gap-2 font-(family-name:--font-data) text-[10px] tracking-[0.2em] text-(--fg-dim) uppercase sm:text-xs">
          <span>{today}</span>
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-(--accent-red)" />
            live from NASA open data
          </span>
        </div>
      </header>

      <SolarSystem />

      <main className="mx-auto max-w-5xl px-6 py-10 sm:px-10">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <motion.div custom={0} initial="hidden" animate="show" variants={panelVariants}>
            <NearEarthPanel />
          </motion.div>
          <motion.div custom={1} initial="hidden" animate="show" variants={panelVariants}>
            <EarthView />
          </motion.div>
        </div>
      </main>

      <WeatherMap />
      <SpaceWeather />

      <footer className="px-6 py-8 text-center sm:px-10">
        <p className="font-(family-name:--font-data) text-[10px] tracking-[0.2em] text-(--fg-dim) uppercase">
          This website is dedicated to Gooby
        </p>
      </footer>
    </div>
  )
}

export default App
