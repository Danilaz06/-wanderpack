import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AuthPage() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError(''); setSuccess(''); setLoading(true)
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: { data: { full_name: name } }
        })
        if (error) throw error
        if (data.user) {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            email,
            full_name: name,
            updated_at: new Date().toISOString()
          })
          setSuccess('¡Cuenta creada! Ya puedes iniciar sesión.')
          setMode('login')
        }
      }
    } catch (err) {
      setError(err.message || 'Ha ocurrido un error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-visual">
        <div className="auth-visual-content">
          <div style={{ fontSize: '4rem', marginBottom: 16 }}>✈️</div>
          <h1>Organiza tus vacaciones con tus amigos</h1>
          <p style={{ marginTop: 16 }}>Planes, disponibilidad, encuestas y chat — todo en un solo lugar para tu grupo.</p>
        </div>
      </div>
      <div className="auth-form-container">
        <form className="auth-form" onSubmit={handleSubmit}>
          <div>
            <h2>{mode === 'login' ? 'Bienvenido de nuevo' : 'Crear cuenta'}</h2>
            <p style={{ color: 'var(--ink-light)', fontSize: '0.88rem', marginTop: 4 }}>
              {mode === 'login' ? 'Inicia sesión para ver los planes' : 'Únete al grupo de viaje'}
            </p>
          </div>
          {error && <div className="error-msg">{error}</div>}
          {success && <div className="success-msg">{success}</div>}
          {mode === 'register' && (
            <div className="input-group">
              <label>Nombre completo</label>
              <input className="input" type="text" placeholder="Tu nombre" value={name} onChange={e => setName(e.target.value)} required />
            </div>
          )}
          <div className="input-group">
            <label>Email</label>
            <input className="input" type="email" placeholder="tu@email.com" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="input-group">
            <label>Contraseña</label>
            <input className="input" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
          </div>
          <button className="btn btn-primary btn-lg" type="submit" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Cargando...' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
          </button>
          <div className="auth-switch">
            {mode === 'login' ? (
              <span>¿No tienes cuenta? <button type="button" onClick={() => { setMode('register'); setError(''); setSuccess('') }}>Regístrate</button></span>
            ) : (
              <span>¿Ya tienes cuenta? <button type="button" onClick={() => { setMode('login'); setError(''); setSuccess('') }}>Inicia sesión</button></span>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
