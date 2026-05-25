import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { Calendar, MapPin, User, LogOut } from 'lucide-react'

const COLORS = ['#C4622D','#2D6E8E','#5C7A5E','#D4A827','#7C4F8E']

export function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

export function getColor(str) {
  if (!str) return COLORS[0]
  let hash = 0
  for (let c of str) hash = c.charCodeAt(0) + ((hash << 5) - hash)
  return COLORS[Math.abs(hash) % COLORS.length]
}

export function Avatar({ profile, size = '' }) {
  const initials = getInitials(profile?.full_name || profile?.email)
  const color = getColor(profile?.id || profile?.email)
  return (
    <div className={`avatar ${size}`} style={{ background: profile?.avatar_url ? undefined : color }}>
      {profile?.avatar_url
        ? <img src={profile.avatar_url} alt={initials} />
        : initials}
    </div>
  )
}

const NAV_ITEMS = [
  { path: '/calendar', label: 'Calendario', icon: Calendar },
  { path: '/plans', label: 'Planes', icon: MapPin },
  { path: '/profile', label: 'Perfil', icon: User },
]

export default function Layout() {
  const { profile, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/auth')
  }

  return (
    <div className="app-layout">
      {/* Sidebar desktop */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h1>Anémonas</h1>
          <span>🌺 verano 2026</span>
        </div>
        <nav className="sidebar-nav">
          {NAV_ITEMS.map(({ path, label, icon: Icon }) => (
            <button
              key={path}
              className={`nav-item ${location.pathname.startsWith(path) ? 'active' : ''}`}
              onClick={() => navigate(path)}
            >
              <Icon /> {label}
            </button>
          ))}
        </nav>
        <div className="sidebar-user">
          <div className="user-card" onClick={() => navigate('/profile')}>
            <Avatar profile={profile || { email: user?.email }} />
            <div className="user-info">
              <div className="name">{profile?.full_name || 'Sin nombre'}</div>
              <div className="email">{user?.email}</div>
            </div>
          </div>
          <button className="nav-item" style={{ marginTop: 4 }} onClick={handleLogout}>
            <LogOut /> Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="main-content">
        <Outlet />
      </main>

      {/* Bottom nav móvil */}
      <nav className="bottom-nav">
        {NAV_ITEMS.map(({ path, label, icon: Icon }) => (
          <button
            key={path}
            className={`bottom-nav-item ${location.pathname.startsWith(path) ? 'active' : ''}`}
            onClick={() => navigate(path)}
          >
            <Icon size={22} />
            <span>{label}</span>
          </button>
        ))}
        <button className="bottom-nav-item" onClick={handleLogout}>
          <LogOut size={22} />
          <span>Salir</span>
        </button>
      </nav>
    </div>
  )
}
