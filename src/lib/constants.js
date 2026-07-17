// Consignment pipeline statuses, in order. Labels are what the user sees.
export const CONSIGNMENT_STATUSES = [
  { value: 'supplier_production', label: 'Supplier production' },
  { value: 'waiting_advance',     label: 'Waiting advance' },
  { value: 'on_the_way',          label: 'On the way' },
  { value: 'under_clearance',     label: 'Under clearance' },
  { value: 'received',            label: 'Received' },
  { value: 'unloaded',            label: 'Unloaded' },
]

export function statusLabel(value) {
  return CONSIGNMENT_STATUSES.find((s) => s.value === value)?.label ?? value
}

// Colour key for each status (used on the pipeline board + badges).
export const STATUS_COLOR = {
  supplier_production: '#888780',
  waiting_advance:     '#BA7517',
  on_the_way:          '#378ADD',
  under_clearance:     '#D85A30',
  received:            '#639922',
  unloaded:            '#1D9E75',
}

export const DOC_STATUSES = [
  { value: 'pending',   label: 'Pending' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'approved',  label: 'Approved' },
]

export const DOC_STATUS_COLOR = {
  pending:   '#A32D2D',
  submitted: '#BA7517',
  approved:  '#3B6D11',
}

// Roles that can create/edit.
export const WRITER_ROLES = ['admin', 'central_entry', 'plant_entry']

// Process workflow stage statuses (superset — UI filters by stage type)
export const STAGE_STATUSES = [
  { value: 'pending',   label: 'Pending' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'paid',      label: 'Paid' },
  { value: 'approved',  label: 'Approved' },
  { value: 'done',      label: 'Done' },
  { value: 'na',        label: 'N/A' },
]

export const STAGE_STATUS_COLOR = {
  pending:   '#A32D2D',
  submitted: '#BA7517',
  paid:      '#2C6E9B',
  approved:  '#3B6D11',
  done:      '#1D9E75',
  na:        '#5F5E5A',
}

// Which statuses make sense per stage type (shown in the dropdown)
export const STATUSES_FOR_TYPE = {
  payment:  ['pending', 'paid', 'na'],
  document: ['pending', 'submitted', 'approved', 'na'],
  approval: ['pending', 'submitted', 'approved', 'na'],
  action:   ['pending', 'done', 'na'],
}

export const PHASE_COLOR = {
  Order:     '#378ADD',
  Payment:   '#BA7517',
  Shipping:  '#1D9E75',
  Clearance: '#D85A30',
  Arrival:   '#639922',
}

export const DEPARTMENTS = ['Supplier', 'Admin', 'Finance', 'Costing', 'Management', 'Planning', 'Warehouse', 'QA']
