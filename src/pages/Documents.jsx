import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Documents() {
  const [atRisk, setAtRisk] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('v_documents_at_risk').select('*')
      .then(({ data }) => { setAtRisk(data || []); setLoading(false) })
  }, [])

  if (loading) return <div className="spinner">Loading…</div>

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Documents at risk</h1>
          <span className="muted">Shipments not yet cleared with documents still outstanding</span>
        </div>
      </div>

      {atRisk.length === 0 ? (
        <div className="empty">Nothing outstanding. All in-transit shipments have their documents approved.</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Supplier</th><th>Container</th><th>Status</th><th>ETA</th>
                <th className="num">Outstanding</th><th className="num">Total</th>
              </tr>
            </thead>
            <tbody>
              {atRisk.map((r) => (
                <tr key={r.consignment_id}>
                  <td>{r.supplier}</td>
                  <td>{r.container_number || '—'}</td>
                  <td>{r.status}</td>
                  <td>{r.eta || '—'}</td>
                  <td className="num" style={{ color: 'var(--coral)', fontWeight: 600 }}>{r.docs_outstanding}</td>
                  <td className="num">{r.docs_total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
