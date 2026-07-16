import { useState } from 'react'
import { CONSIGNMENT_STATUSES } from '../../lib/constants'
import { useProductTypes } from './useConsignments'

const EMPTY = {
  supplier: '', product_code: '', invoice_number: '', invoice_qty_kg: '',
  shipping_line: '', container_number: '', status: 'supplier_production',
  po_value: '', etd: '', original_eta: '', new_eta: '',
  received_date: '', unload_complete: '', unload_place: '', remarks: '',
}

export default function ConsignmentForm({ initial, onSubmit, onCancel }) {
  const types = useProductTypes()
  const [form, setForm] = useState(() => ({ ...EMPTY, ...cleanInitial(initial) }))
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })) }

  async function submit(e) {
    e.preventDefault()
    setErr(''); setBusy(true)
    try {
      const payload = { ...form }
      // numbers: empty string -> null
      for (const k of ['invoice_qty_kg', 'po_value']) {
        payload[k] = payload[k] === '' ? null : Number(payload[k])
      }
      // dates: empty string -> null
      for (const k of ['etd', 'original_eta', 'new_eta', 'received_date', 'unload_complete']) {
        payload[k] = payload[k] === '' ? null : payload[k]
      }
      if (payload.product_code === '') payload.product_code = null
      await onSubmit(payload)
    } catch (e) {
      setErr(e.message || 'Save failed')
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="stack">
      <div className="form-grid">
        <Field label="Supplier *">
          <input value={form.supplier} onChange={(e) => set('supplier', e.target.value)} required />
        </Field>
        <Field label="Product">
          <select value={form.product_code || ''} onChange={(e) => set('product_code', e.target.value)}>
            <option value="">—</option>
            {types.map((t) => <option key={t.code} value={t.code}>{t.name}</option>)}
          </select>
        </Field>
        <Field label="Invoice number">
          <input value={form.invoice_number} onChange={(e) => set('invoice_number', e.target.value)} />
        </Field>
        <Field label="Invoice qty (kg)">
          <input type="number" step="any" value={form.invoice_qty_kg} onChange={(e) => set('invoice_qty_kg', e.target.value)} />
        </Field>
        <Field label="Shipping line">
          <input value={form.shipping_line} onChange={(e) => set('shipping_line', e.target.value)} />
        </Field>
        <Field label="Container number">
          <input value={form.container_number} onChange={(e) => set('container_number', e.target.value)} />
        </Field>
        <Field label="Status">
          <select value={form.status} onChange={(e) => set('status', e.target.value)}>
            {CONSIGNMENT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </Field>
        <Field label="PO value ($)">
          <input type="number" step="any" value={form.po_value} onChange={(e) => set('po_value', e.target.value)} />
        </Field>
        <Field label="ETD">
          <input type="date" value={form.etd || ''} onChange={(e) => set('etd', e.target.value)} />
        </Field>
        <Field label="Original ETA">
          <input type="date" value={form.original_eta || ''} onChange={(e) => set('original_eta', e.target.value)} />
        </Field>
        <Field label="New ETA">
          <input type="date" value={form.new_eta || ''} onChange={(e) => set('new_eta', e.target.value)} />
        </Field>
        <Field label="Received date">
          <input type="date" value={form.received_date || ''} onChange={(e) => set('received_date', e.target.value)} />
        </Field>
        <Field label="Unload complete">
          <input type="date" value={form.unload_complete || ''} onChange={(e) => set('unload_complete', e.target.value)} />
        </Field>
        <Field label="Unload place">
          <input value={form.unload_place} onChange={(e) => set('unload_place', e.target.value)} />
        </Field>
      </div>
      <Field label="Remarks">
        <textarea rows={2} value={form.remarks} onChange={(e) => set('remarks', e.target.value)} />
      </Field>
      {err && <div className="error-msg">{err}</div>}
      <div className="inline" style={{ justifyContent: 'flex-end' }}>
        <button type="button" className="btn" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
      </div>
    </form>
  )
}

function Field({ label, children }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
    </div>
  )
}

function cleanInitial(initial) {
  if (!initial) return {}
  const out = {}
  for (const k of Object.keys(EMPTY)) {
    out[k] = initial[k] ?? EMPTY[k]
  }
  return out
}
