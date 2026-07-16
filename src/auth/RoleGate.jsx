import { useAuth } from './AuthProvider'

// Wrap any element that only writers (or a specific role set) should see.
// <RoleGate write> ...edit button... </RoleGate>
// <RoleGate roles={['admin']}> ...admin thing... </RoleGate>
export default function RoleGate({ write, roles, children }) {
  const { role, canWrite } = useAuth()
  if (write && !canWrite) return null
  if (roles && !roles.includes(role)) return null
  return children
}
