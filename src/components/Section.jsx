import { useState } from 'react'

export default function Section({ title, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="section">
      <button type="button" className="section-head" onClick={() => setOpen((o) => !o)}>
        <span className={`chev ${open ? 'open' : ''}`}>▶</span>
        <span>{title}</span>
      </button>
      {open && <div className="section-body">{children}</div>}
    </div>
  )
}
