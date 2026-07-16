import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth/AuthProvider'
import Login from './auth/Login'
import Layout from './components/Layout'
import Pipeline from './pages/Pipeline'
import Shipments from './pages/Shipments'
import Documents from './pages/Documents'

function Gate() {
  const { session, loading } = useAuth()
  if (loading) return <div className="spinner" style={{ marginTop: 80 }}>Loading…</div>
  if (!session) return <Login />
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Pipeline />} />
        <Route path="/shipments" element={<Shipments />} />
        <Route path="/documents" element={<Documents />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Gate />
      </BrowserRouter>
    </AuthProvider>
  )
}
