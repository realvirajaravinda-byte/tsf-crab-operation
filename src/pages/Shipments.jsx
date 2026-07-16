import { useState } from 'react'
import { useConsignments } from '../features/consignments/useConsignments'
import ConsignmentForm from '../features/consignments/ConsignmentForm'
import DocChecklist from '../features/documents/DocChecklist'
import { statusLabel, STATUS_COLOR } from '../lib/constants'
import Badge from '../components/Badge'
import Drawer from '../components/Drawer'
import RoleGate from '../auth/RoleGate'

export default function Shipments() {
  const { rows, loading, create, update } = useConsignments()
  const [drawer, setDrawer] = useState(null) // {mode:'new'} | {mode:'edit', row}

  async function handleSubmit(payload) {
    if (drawer.mode === 'new') await create(payload)
    else await update(drawer.row.id, payload)
    setDrawer(null)
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Shipments</h1>
          <span className="muted">{rows.length} total</span>
        </div>
        <RoleGate write>
          <button className="btn btn-primary" onClick={() => setDrawer({ mode: 'new' })}>+ New shipment</button>
        </RoleGate>
      </div>

      {loading ? (
        <div className="spinner">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="empty">No shipments yet.</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Supplier</th><th>Product</th><th>Invoice</th><th className="num">Qty (kg)</th>
                <th>Line</th><th>Container</th><th>Status</th><th>ETA</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} onClick={() => setDrawer({ mode: 'edit', row: r })}>
                  <td>{r.supplier}</td>
                  <td>{r.product_code || '—'}</td>
                  <td>{r.invoice_number || '—'}</td>
                  <td className="num">{r.invoice_qty_kg != null ? Number(r.invoice_qty_kg).toLocaleString() : '—'}</td>
                  <td>{r.shipping_line || '—'}</td>
                  <td>{r.container_number || '—'}</td>
                  <td><Badge label={statusLabel(r.status)} color={STATUS_COLOR[r.status]} /></td>
                  <td>{r.new_eta || r.original_eta || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {drawer && (
        <Drawer
          title={drawer.mode === 'new' ? 'New shipment' : drawer.row.supplier}
          onClose={() => setDrawer(null)}
        >
          <ConsignmentForm
            initial={drawer.mode === 'edit' ? drawer.row : null}
            onSubmit={handleSubmit}
            onCancel={() => setDrawer(null)}
          />
          {drawer.mode === 'edit' && (
            <div style={{ marginTop: 24 }}>
              <h2>Clearance documents</h2>
              <DocChecklist consignmentId={drawer.row.id} />
            </div>
          )}
        </Drawer>
      )}
    </div>
  )
}
