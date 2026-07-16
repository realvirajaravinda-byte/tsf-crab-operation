import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'

export default function Layout() {
  const { profile, role, signOut } = useAuth()

  return (
    <div className="app">
      <div className="topbar">
        <div className="inline" style={{ gap: 20 }}>
          <div className="brand">TSF <span>Crab</span></div>
          <nav className="nav">
            <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>Pipeline</NavLink>
            <NavLink to="/shipments" className={({ isActive }) => (isActive ? 'active' : '')}>Shipments</NavLink>
            <NavLink to="/documents" className={({ isActive }) => (isActive ? 'active' : '')}>Documents</NavLink>
          </nav>
        </div>
        <div className="userbox">
          <span className="role-pill">{role || '—'}</span>
          <span className="muted" style={{ display: 'none' }}>{profile?.full_name}</span>
          <button className="btn btn-sm" onClick={signOut}>Sign out</button>
        </div>
      </div>
      <div className="content">
        <Outlet />
      </div>
    </div>
  )
}
