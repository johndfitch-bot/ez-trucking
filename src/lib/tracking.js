const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function generateTrackingToken() {
  let out = 'EZ-'
  const arr = new Uint8Array(8)
  crypto.getRandomValues(arr)
  for (let i = 0; i < 8; i++) {
    out += ALPHABET[arr[i] % ALPHABET.length]
    if (i === 3) out += '-'
  }
  return out
}

export function formatTrackingToken(token) {
  return (token || '').toUpperCase().replace(/\s+/g, '')
}

export const STATUS_FLOW = [
  { id: 'new', label: 'Request received', clientCopy: 'Eric has your request.', color: 'slate' },
  { id: 'reviewing', label: 'Reviewing', clientCopy: 'Eric is reviewing your load.', color: 'yellow' },
  { id: 'quoted', label: 'Quoted', clientCopy: 'A quote has been sent. Waiting on your approval.', color: 'blue' },
  { id: 'accepted', label: 'Booked', clientCopy: 'Load is on the books. Eric will be in touch before pickup.', color: 'blue' },
  { id: 'scheduled', label: 'Scheduled', clientCopy: 'Pickup scheduled. You will get a heads-up before arrival.', color: 'blue' },
  { id: 'en_route_pickup', label: 'En route to pickup', clientCopy: 'Eric is on his way to pickup.', color: 'orange' },
  { id: 'loaded', label: 'Loaded', clientCopy: 'Load is on the truck.', color: 'orange' },
  { id: 'en_route_delivery', label: 'En route to delivery', clientCopy: 'In transit to delivery.', color: 'orange' },
  { id: 'delivered', label: 'Delivered', clientCopy: 'Delivered. POD attached.', color: 'green' },
  { id: 'closed', label: 'Closed', clientCopy: 'Job complete. Thanks for choosing EZ.', color: 'green' },
  { id: 'declined', label: 'Declined', clientCopy: 'Eric could not take this load. Please call for alternatives.', color: 'red' },
]

export const STATUS_BY_ID = Object.fromEntries(STATUS_FLOW.map((s) => [s.id, s]))

export function statusIndex(id) {
  return STATUS_FLOW.findIndex((s) => s.id === id)
}

export function isTerminal(id) {
  return id === 'delivered' || id === 'closed' || id === 'declined'
}
