export const taka = (n) => `৳ ${Number(n || 0).toLocaleString('en-IN')}`

export const date = (d) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

export const dateTime = (d) =>
  d
    ? new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—'

// Display status of a fine (Overdue comes from the backend virtual)
export const fineStatus = (fine) => (fine.isOverdue ? 'Overdue' : fine.status)

export const VESSEL_TYPES = ['Launch', 'Cargo Ship', 'Passenger Vessel', 'Boat', 'Tanker', 'Other']
export const PAYMENT_METHODS = ['bKash', 'Nagad', 'Rocket', 'Card']

// Role display names ("police" in the DB, "Naval Police" in the UI)
export const ROLE_LABEL = { admin: 'Admin', police: 'Naval Police', owner: 'Vessel Owner' }

// Registration number format: one letter + dash + any number of digits (M-15245)
export const REG_PATTERN = '[A-Za-z]-[0-9]+'

// Which portal each role returns to after logout
export const PORTAL_LOGIN = { admin: '/admin/login', police: '/police/login', owner: '/login' }

// Capacity unit per vessel type (matches the backend). For "Other" the owner chooses.
export const UNIT_BY_TYPE = {
  Launch: 'passengers',
  'Passenger Vessel': 'passengers',
  Boat: 'passengers',
  'Cargo Ship': 'tons',
  Tanker: 'tons',
}
export const unitOf = (v) => UNIT_BY_TYPE[v?.vesselType] || v?.capacityUnit || 'passengers'
export const capacityText = (v) =>
  v?.capacity === undefined || v?.capacity === null ? '—' : `${Number(v.capacity).toLocaleString('en-IN')} ${unitOf(v)}`

// Late fee rule (matches the defaults in backend utils/config.js)
export const LATE_FEE_RULE = { normal: 5, repeat: 10, intervalDays: 30 }
