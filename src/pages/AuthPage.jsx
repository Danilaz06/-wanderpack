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
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Foto de fondo */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'url(/group.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
        filter: 'brightness(0.45)',
        zIndex: 0,
      }} />

      {/* Overlay gradiente */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.6) 100%)',
        zIndex: 1,
      }} />

      {/* Formulario */}
      <div style={{
        position: 'relative', zIndex: 2,
        width: '100%', maxWidth: 400,
        margin: '0 20px',
        background: 'rgba(255,255,255,0.10)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRadius: 24,
        border: '1px solid rgba(255,255,255,0.2)',
        padding: '40px 36px',
        boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: '2.8rem', marginBottom: 8 }}>🌺</div>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.9rem',
            fontWeight: 700,
            color: 'white',
            letterSpacing: '-0.03em',
            lineHeight: 1.1,
          }}>Anémonas 2026</h1>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.85rem', marginTop: 6 }}>
            {mode === 'login' ? 'Bienvenido de vuelta 👋' : 'Únete al grupo ✌️'}
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {error && (
            <div style={{ background: 'rgba(220,38,38,0.2)', border: '1px solid rgba(220,38,38,0.4)', color: '#fca5a5', padding: '10px 14px', borderRadius: 10, fontSize: '0.85rem' }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{ background: 'rgba(92,122,94,0.2)', border: '1px solid rgba(92,122,94,0.4)', color: '#86efac', padding: '10px 14px', borderRadius: 10, fontSize: '0.85rem' }}>
              {success}
            </div>
          )}

          {mode === 'register' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.04em' }}>Tu nombre</label>
              <input
                style={{ background: 'rgba(255,255,255,0.12)', border: '1.5px solid rgba(255,255,255,0.2)', borderRadius: 10, padding: '11px 14px', color: 'white', fontSize: '0.9rem', outline: 'none' }}
                type="text" placeholder="¿Cómo te llaman?" value={name} onChange={e => setName(e.target.value)} required
              />
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.04em' }}>Email</label>
            <input
              style={{ background: 'rgba(255,255,255,0.12)', border: '1.5px solid rgba(255,255,255,0.2)', borderRadius: 10, padding: '11px 14px', color: 'white', fontSize: '0.9rem', outline: 'none' }}
              type="email" placeholder="tu@email.com" value={email} onChange={e => setEmail(e.target.value)} required
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.04em' }}>Contraseña</label>
            <input
              style={{ background: 'rgba(255,255,255,0.12)', border: '1.5px solid rgba(255,255,255,0.2)', borderRadius: 10, padding: '11px 14px', color: 'white', fontSize: '0.9rem', outline: 'none' }}
              type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required minLength={6}
            />
          </div>

          <button
            style={{ background: 'var(--terracotta)', color: 'white', border: 'none', borderRadius: 10, padding: '13px', fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer', marginTop: 4, transition: 'all 0.18s' }}
            type="submit" disabled={loading}
          >
            {loading ? 'Cargando...' : mode === 'login' ? 'Entrar 🚀' : 'Crear cuenta 🎉'}
          </button>

          <div style={{ textAlign: 'center', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>
            {mode === 'login' ? (
              <span>¿No tienes cuenta? <button type="button" onClick={() => { setMode('register'); setError(''); setSuccess('') }} style={{ background: 'none', border: 'none', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}>Regístrate</button></span>
            ) : (
              <span>¿Ya tienes cuenta? <button type="button" onClick={() => { setMode('login'); setError(''); setSuccess('') }} style={{ background: 'none', border: 'none', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}>Inicia sesión</button></span>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
