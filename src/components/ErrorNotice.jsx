function ErrorNotice({ title = 'Transmission interrupted', message }) {
  return (
    <div className="border-l-2 border-(--accent-red) py-1 pl-3">
      <p className="font-(family-name:--font-data) text-[10px] tracking-[0.25em] text-(--accent-red) uppercase">
        {title}
      </p>
      <p className="mt-1 font-(family-name:--font-body) text-sm text-(--fg-dim)">{message}</p>
    </div>
  )
}

export default ErrorNotice
