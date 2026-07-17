import { statusLabel } from '../../lib/constants'

// Builds a mailto: URL with a shipment summary pre-filled.
// docs is optional; if provided, appends a document status list.
export function buildShipmentMailto(row, docs) {
  const subject = `Shipment ${row.container_number || row.invoice_number || row.supplier} — ${statusLabel(row.status)}`

  const lines = []
  lines.push(`Shipment summary`)
  lines.push(``)
  lines.push(`Supplier: ${row.supplier || '—'}`)
  if (row.product_code) lines.push(`Product: ${row.product_code}`)
  if (row.invoice_number) lines.push(`Invoice: ${row.invoice_number}`)
  if (row.invoice_qty_kg != null) lines.push(`Qty: ${Number(row.invoice_qty_kg).toLocaleString()} kg`)
  if (row.shipping_line) lines.push(`Line: ${row.shipping_line}`)
  if (row.container_number) lines.push(`Container: ${row.container_number}`)
  lines.push(`Status: ${statusLabel(row.status)}`)
  const eta = row.new_eta || row.original_eta
  if (eta) lines.push(`ETA: ${eta}${row.new_eta && row.original_eta && row.new_eta !== row.original_eta ? ` (was ${row.original_eta})` : ''}`)
  if (row.received_date) lines.push(`Received: ${row.received_date}`)

  if (docs && docs.length) {
    const approved = docs.filter((d) => d.status === 'approved').length
    lines.push(``)
    lines.push(`Documents: ${approved} of ${docs.length} approved`)
    const pending = docs.filter((d) => d.status !== 'approved')
    if (pending.length) {
      lines.push(`Outstanding:`)
      for (const d of pending) lines.push(`  - ${d.doc_name} (${d.status})`)
    }
  }

  const body = lines.join('\n')
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}
