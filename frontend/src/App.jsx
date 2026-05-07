import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/auth'
import AppLayout from './components/layout/AppLayout'
import Login from './pages/Login'
import Inbox from './pages/Inbox'
import Templates from './pages/Templates'
import Users from './pages/Users'
import { Loader2 } from 'lucide-react'

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-slate-950">
      <Loader2 size={32} className="animate-spin text-sky-500" />
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  if (adminOnly && user.role !== 'ADMIN') return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={
          <ProtectedRoute><AppLayout /></ProtectedRoute>
        }>
          <Route index element={<Inbox />} />
          <Route path="c/:id" element={<Inbox />} />
          <Route path="templates" element={<Templates />} />
          <Route path="users" element={
            <ProtectedRoute adminOnly><Users /></ProtectedRoute>
          } />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}
