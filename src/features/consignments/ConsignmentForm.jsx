import { useState } from 'react'
import { CONSIGNMENT_STATUSES } from '../../lib/constants'
import { useProductTypes } from './useConsignments'
import Section from '../../components/Section'

const EMPTY = {
  supplier: '', product_code: '', invoice_number: '', invoice_qty_kg: '',
  shipping_line: '', container_number: '', status: 'supplier_production',
  po_value: '', invoice_value: '',
  advance_pct: 50, advance_amount: '', advance_paid_date: '',
  balance_amount: '', balance_paid_date: '',
  etd: '', original_eta: '', new_eta: '',
  received_date: '', unload_complete: '', unload_place: '', remarks: '',
}

const NUM_FIELDS = ['invoice_qty_kg', 'po_value', 'invoice_value', 'advance_pct', 'advance_amount', 'balance_amount']
const DATE_FIELDS = ['etd', 'original_eta', 'new_eta', 'received_date', 'unload_complete', 'advance_paid_date', 'balance_paid_date']

export default function ConsignmentForm({ initial, onSubmit, onCancel }) {
  const types = useProductTypes()
  const [form, setForm] = useState(() => ({ ...EMPTY, ...cleanInitial(initial) }))
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })) }

  const poVal = num(form.po_value)
  const invVal = num(form.invoice_value)
  const advDue = poVal != null ? round2(poVal * (num(form.advance_pct) ?? 50) / 100) : null
  const base = invVal ?? poVal ?? 0
  const outstanding = round2(base - (num(form.advance_amount) ?? 0) - (num(form.balance_amount) ?? 0))

  async function submit(e) {
    e.preventDefault()
    setErr(''); setBusy(true)
    try {
      const payload = { ...form }
      for (const k of NUM_FIELDS) payload[k] = payload[k] === '' || payload[k] == null ? null : Number(payload[k])
      for (const k of DATE_FIELDS) payload[k] = payload[k] === '' ? null : payload[k]
      if (payload.product_code === '') payload.product_code = null
      await onSubmit(payload)
    } catch (e) {
      setErr(e.message || 'Save failed')
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="stack">
      <Section title="Status">
        <div className="field">
          <label>Status</label>
          <select value={form.status} onChange={(e) => set('status', e.target.value)}>
            {CONSIGNMENT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      </Section>

      <Section title="ETA & dates">
        <div className="form-grid">
          <F label="ETD"><input type="date" value={form.etd || ''} onChange={(e) => set('etd', e.target.value)} /></F>
          <F label="Original ETA"><input type="date" value={form.original_eta || ''} onChange={(e) => set('original_eta', e.target.value)} /></F>
          <F label="New ETA"><input type="date" value={form.new_eta || ''} onChange={(e) => set('new_eta', e.target.value)} /></F>
          <F label="Received date"><input type="date" value={form.received_date || ''} onChange={(e) => set('received_date', e.target.value)} /></F>
          <F label="Unload complete"><input type="date" value={form.unload_complete || ''} onChange={(e) => set('unload_complete', e.target.value)} /></F>
          <F label="Unload place"><input value={form.unload_place} onChange={(e) => set('unload_place', e.target.value)} /></F>
        </div>
      </Section>

      <Section title="Payments">
        <div className="form-grid">
          <F label="PO value ($)"><input type="number" step="any" value={form.po_value} onChange={(e) => set('po_value', e.target.value)} /></F>
          <F label="Invoice value ($)"><input type="number" step="any" value={form.invoice_value} onChange={(e) => set('invoice_value', e.target.value)} /></F>
          <F label="Advance %"><input type="number" step="any" value={form.advance_pct} onChange={(e) => set('advance_pct', e.target.value)} /></F>
          <F label="Advance paid ($)"><input type="number" step="any" value={form.advance_amount} onChange={(e) => set('advance_amount', e.target.value)} /></F>
          <F label="Advance paid date"><input type="date" value={form.advance_paid_date || ''} onChange={(e) => set('advance_paid_date', e.target.value)} /></F>
          <F label="Balance paid ($)"><input type="number" step="any" value={form.balance_amount} onChange={(e) => set('balance_amount', e.target.value)} /></F>
          <F label="Balance paid date"><input type="date" value={form.balance_paid_date || ''} onChange={(e) => set('balance_paid_date', e.target.value)} /></F>
        </div>
        <div style={{ marginTop: 12 }}>
          <div className="pay-summary"><span className="lbl">Advance due ({form.advance_pct || 50}% of PO)</span><span className="val">{fmt(advDue)}</span></div>
          <div className="pay-summary"><span className="lbl">Settling against</span><span className="val">{invVal != null ? 'Invoice value' : 'PO value'}</span></div>
          <div className="pay-summary"><span className="lbl">Outstanding</span><span className="val out">{fmt(outstanding)}</span></div>
        </div>
      </Section>

      <Section title="Shipment details">
        <div className="form-grid">
          <F label="Supplier *"><input value={form.supplier} onChange={(e) => set('supplier', e.target.value)} required /></F>
          <F label="Product">
            <select value={form.product_code || ''} onChange={(e) => set('product_code', e.target.value)}>
              <option value="">—</option>
              {types.map((t) => <option key={t.code} value={t.code}>{t.name}</option>)}
            </select>
          </F>
          <F label="Invoice number"><input value={form.invoice_number} onChange={(e) => set('invoice_number', e.target.value)} /></F>
          <F label="Invoice qty (kg)"><input type="number" step="any" value={form.invoice_qty_kg} onChange={(e) => set('invoice_qty_kg', e.target.value)} /></F>
          <F label="Shipping line"><input value={form.shipping_line} onChange={(e) => set('shipping_line', e.target.value)} /></F>
          <F label="Container number"><input value={form.container_number} onChange={(e) => set('container_number', e.target.value)} /></F>
        </div>
        <F label="Remarks"><textarea rows={2} value={form.remarks} onChange={(e) => set('remarks', e.target.value)} /></F>
      </Section>

      {err && <div className="error-msg">{err}</div>}
      <div className="inline" style={{ justifyContent: 'flex-end' }}>
        <button type="button" className="btn" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
      </div>
    </form>
  )
}

function F({ label, children }) {
  return <div className="field"><label>{label}</label>{children}</div>
}
function num(v) { if (v === '' || v == null) return null; const n = Number(v); return Number.isNaN(n) ? null : n }
function round2(n) { return n == null ? null : Math.round(n * 100) / 100 }
function fmt(n) { return n == null ? '—' : '$' + Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
function cleanInitial(initial) {
  if (!initial) return {}
  const out = {}
  for (const k of Object.keys(EMPTY)) out[k] = initial[k] ?? EMPTY[k]
  return out
}
