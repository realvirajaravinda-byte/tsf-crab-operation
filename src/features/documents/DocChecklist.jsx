import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { DOC_STATUSES, DOC_STATUS_COLOR } from '../../lib/constants'
import { useAuth } from '../../auth/AuthProvider'
import Badge from '../../components/Badge'

export default function DocChecklist({ consignmentId }) {
  const { canWrite } = useAuth()
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('consignment_documents')
      .select('*')
      .eq('consignment_id', consignmentId)
      .order('created_at')
    setDocs(data || [])
    setLoading(false)
  }

  useEffect(() => { if (consignmentId) load() }, [consignmentId])

  async function setStatus(doc, status) {
    const patch = { status }
    const today = new Date().toISOString().slice(0, 10)
    if (status === 'submitted' && !doc.submitted_date) patch.submitted_date = today
    if (status === 'approved') {
      if (!doc.submitted_date) patch.submitted_date = today
      patch.approved_date = today
    }
    await supabase.from('consignment_documents').update(patch).eq('id', doc.id)
    load()
  }

  if (loading) return <div className="spinner">Loading documents…</div>
  if (!docs.length) return <div className="empty">No documents yet. They are created automatically with the shipment.</div>

  const approved = docs.filter((d) => d.status === 'approved').length

  return (
    <div>
      <div className="row-between" style={{ marginBottom: 8 }}>
        <span className="faint">{approved} of {docs.length} approved</span>
      </div>
      {docs.map((d) => (
        <div className="doc-row" key={d.id}>
          <div className="dname">
            {d.doc_name}
            <div className="dauth">{d.authority}</div>
          </div>
          <Badge label={statusLabelOf(d.status)} color={DOC_STATUS_COLOR[d.status]} />
          {canWrite && (
            <select
              value={d.status}
              onChange={(e) => setStatus(d, e.target.value)}
              style={{ width: 130 }}
            >
              {DOC_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          )}
        </div>
      ))}
    </div>
  )
}

function statusLabelOf(v) {
  return DOC_STATUSES.find((s) => s.value === v)?.label ?? v
}
