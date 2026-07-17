import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../auth/AuthProvider'
import {
  STAGE_STATUSES, STAGE_STATUS_COLOR, STATUSES_FOR_TYPE, PHASE_COLOR,
} from '../../lib/constants'
import Badge from '../../components/Badge'

export default function ProcessWorkflow({ consignmentId }) {
  const { department, role, user } = useAuth()
  const isAdmin = role === 'admin'
  const [stages, setStages] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState(null)

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('shipment_stages')
      .select('*')
      .eq('consignment_id', consignmentId)
      .order('seq')
    setStages(data || [])
    setLoading(false)
  }
  useEffect(() => { if (consignmentId) load() }, [consignmentId])

  function canEdit(stage) {
    return isAdmin || (department && stage.department === department)
  }

  async function saveStage(stage, patch) {
    setSavingId(stage.id)
    const update = { ...patch, updated_by: user?.id, updated_at: new Date().toISOString() }
    await supabase.from('shipment_stages').update(update).eq('id', stage.id)
    setStages((prev) => prev.map((s) => (s.id === stage.id ? { ...s, ...update } : s)))
    setSavingId(null)
  }

  if (loading) return <div className="spinner">Loading process…</div>
  if (!stages.length) return <div className="empty">No process stages. They are created with the shipment.</div>

  // group by phase, preserving order
  const phases = []
  for (const s of stages) {
    let p = phases.find((x) => x.phase === s.phase)
    if (!p) { p = { phase: s.phase, items: [] }; phases.push(p) }
    p.items.push(s)
  }

  const doneCount = stages.filter((s) => ['approved', 'paid', 'done'].includes(s.status)).length

  return (
    <div>
      <div className="row-between" style={{ marginBottom: 10 }}>
        <span className="faint">{doneCount} of {stages.length} stages complete</span>
        {department && <span className="faint">You edit: <b>{department}</b> stages</span>}
      </div>

      {phases.map((p) => (
        <div key={p.phase} style={{ marginBottom: 14 }}>
          <div className="phase-head">
            <span className="dot" style={{ background: PHASE_COLOR[p.phase] || '#5F5E5A' }} />
            {p.phase}
          </div>
          {p.items.map((s) => (
            <StageRow
              key={s.id}
              stage={s}
              editable={canEdit(s)}
              saving={savingId === s.id}
              onSave={(patch) => saveStage(s, patch)}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

function StageRow({ stage, editable, saving, onSave }) {
  const [open, setOpen] = useState(false)
  const statusOpts = STATUSES_FOR_TYPE[stage.stage_type] || STAGE_STATUSES.map((s) => s.value)
  const showAmount = stage.stage_type === 'payment'

  return (
    <div className={`stage-row ${editable ? '' : 'locked'}`}>
      <div className="stage-main" onClick={() => setOpen((o) => !o)}>
        <span className="stage-seq">{stage.seq}</span>
        <div className="stage-desc">
          {stage.description}
          <div className="stage-dept">{stage.department}</div>
        </div>
        <Badge label={labelFor(stage.status)} color={STAGE_STATUS_COLOR[stage.status]} />
      </div>

      {open && (
        <div className="stage-body">
          {!editable && <div className="faint" style={{ marginBottom: 8 }}>Read-only — owned by {stage.department}</div>}
          <div className="form-grid">
            <div className="field">
              <label>Status</label>
              <select
                value={stage.status}
                disabled={!editable || saving}
                onChange={(e) => onSave({ status: e.target.value })}
              >
                {statusOpts.map((v) => <option key={v} value={v}>{labelFor(v)}</option>)}
              </select>
            </div>
            {showAmount && (
              <div className="field">
                <label>Amount</label>
                <input
                  type="number" step="any" defaultValue={stage.amount ?? ''}
                  disabled={!editable || saving}
                  onBlur={(e) => onSave({ amount: e.target.value === '' ? null : Number(e.target.value) })}
                />
              </div>
            )}
            <div className="field">
              <label>Date</label>
              <input
                type="date" defaultValue={stage.stage_date ?? ''}
                disabled={!editable || saving}
                onBlur={(e) => onSave({ stage_date: e.target.value || null })}
              />
            </div>
            <div className="field">
              <label>Link</label>
              <input
                type="url" placeholder="Paste document link" defaultValue={stage.link ?? ''}
                disabled={!editable || saving}
                onBlur={(e) => onSave({ link: e.target.value || null })}
              />
            </div>
          </div>
          {stage.link && (
            <a href={stage.link} target="_blank" rel="noreferrer" className="btn btn-sm" style={{ marginTop: 8 }}>
              ↗ Open link
            </a>
          )}
        </div>
      )}
    </div>
  )
}

function labelFor(v) {
  return STAGE_STATUSES.find((s) => s.value === v)?.label ?? v
}
