import { useConsignments } from '../features/consignments/useConsignments'
import { CONSIGNMENT_STATUSES, STATUS_COLOR } from '../lib/constants'
import { useNavigate } from 'react-router-dom'

export default function Pipeline() {
  const { rows, loading } = useConsignments()
  const navigate = useNavigate()

  if (loading) return <div className="spinner">Loading pipeline…</div>

  const byStatus = Object.fromEntries(CONSIGNMENT_STATUSES.map((s) => [s.value, []]))
  for (const r of rows) {
    if (byStatus[r.status]) byStatus[r.status].push(r)
    else (byStatus[r.status] = [r])
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Pipeline</h1>
          <span className="muted">{rows.length} shipments in view</span>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="empty">No shipments yet. Add one from the Shipments tab.</div>
      ) : (
        <div className="board">
          {CONSIGNMENT_STATUSES.map((s) => (
            <div className="board-col" key={s.value}>
              <h3>
                <span className="dot" style={{ background: STATUS_COLOR[s.value] }} />
                {s.label}
                <span className="count-pill">{byStatus[s.value].length}</span>
              </h3>
              {byStatus[s.value].map((r) => (
                <div className="ship-card" key={r.id} onClick={() => navigate('/shipments')}>
                  <div className="sup">{r.supplier}</div>
                  <div className="meta">
                    {r.container_number || 'no container'} · {fmtQty(r.invoice_qty_kg)}
                  </div>
                  <div className="eta">ETA {r.new_eta || r.original_eta || '—'}</div>
                </div>
              ))}
              {byStatus[s.value].length === 0 && <div className="faint" style={{ padding: '4px 2px' }}>—</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function fmtQty(q) {
  if (q == null) return '—'
  return Number(q).toLocaleString() + ' kg'
}
