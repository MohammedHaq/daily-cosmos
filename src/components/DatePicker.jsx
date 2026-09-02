const APOD_MIN_DATE = '1995-06-16'

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function DatePicker({ date, onChange }) {
  const today = todayIso()
  const isToday = !date || date === today

  return (
    <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 border-b border-(--fg-dim)/30 px-6 py-3 font-(family-name:--font-data) text-xs tracking-wide uppercase sm:px-10">
      <label htmlFor="briefing-date" className="text-(--fg-dim)">
        Browse archive
      </label>
      <input
        id="briefing-date"
        type="date"
        min={APOD_MIN_DATE}
        max={today}
        value={date ?? today}
        onChange={(e) => onChange(e.target.value === today ? undefined : e.target.value)}
        className="border border-(--fg-dim)/40 bg-(--bg) px-2 py-1 text-(--fg) normal-case"
      />
      {!isToday && (
        <button
          type="button"
          onClick={() => onChange(undefined)}
          className="text-(--accent-blue) underline decoration-dotted underline-offset-2"
        >
          Back to today
        </button>
      )}
      <span className="text-(--fg-dim) normal-case">
        APOD archive begins {APOD_MIN_DATE} · Mars rover photos are limited to each mission's active dates
      </span>
    </div>
  )
}

export default DatePicker
