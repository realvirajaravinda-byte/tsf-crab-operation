export default function Badge({ label, color }) {
  return (
    <span className="badge" style={{ background: color || '#5F5E5A' }}>
      {label}
    </span>
  )
}
