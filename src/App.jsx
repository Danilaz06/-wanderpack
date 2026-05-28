import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import AuthPage from './pages/AuthPage'
import Layout from './components/Layout'
import CalendarPage from './pages/CalendarPage'
import PlansPage from './pages/PlansPage'
import PlanDetailPage from './pages/PlanDetailPage'
import ProfilePage from './pages/ProfilePage'
import MembersPage from './pages/MembersPage'
import CouplePage from './pages/CouplePage'

const COUPLE_EMAILS = ['daniellazar1614@gmail.com', 'aguedacelma@gmail.com']

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="loading-page"><div className="spinner" /><h2>Cargando...</h2></div>
  if (!user) return <Navigate to="/auth" replace />
  return children
}

function CoupleRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="loading-page"><div className="spinner" /><h2>Cargando...</h2></div>
  if (!user) return <Navigate to="/auth" replace />
  if (!COUPLE_EMAILS.includes(user.email)) return <Navigate to="/calendar" replace />
  return children
}

function AppRoutes() {
  const { user, loading } = useAuth()
  if (loading) return <div className="loading-page"><div className="spinner" /><h2>Cargando...</h2></div>
  return (
    <Routes>
      <Route path="/auth" element={user ? <Navigate to="/" replace /> : <AuthPage />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/calendar" replace />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="plans" element={<PlansPage />} />
        <Route path="plans/:id" element={<PlanDetailPage />} />
        <Route path="members" element={<MembersPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="couple" element={<CoupleRoute><CouplePage /></CoupleRoute>} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
