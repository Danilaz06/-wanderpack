import { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { Camera, Save, Plus, Trash2 } from 'lucide-react'
import { Avatar } from '../components/Layout'

export default function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth()
  const [name, setName] = useState(profile?.full_name || '')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef()

  const [commitments, setCommitments] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [cTitle, setCTitle] = useState('')
  const [cStart, setCStart] = useState('')
  const [cEnd, setCEnd] = useState('')
  const [savingC, setSavingC] = useState(false)

  useEffect(() => { fetchCommitments() }, [])

  async function fetchCommitments() {
    const { data } = await supabase
      .from('commitments')
      .select('*')
      .eq('user_id', user.id)
      .order('start_date')
    setCommitments(data || [])
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true); setError(''); setSuccess('')
    const { error } = await supabase
      .from('profiles')
      .upsert({ id: user.id, full_name: name, email: user.email, updated_at: new Date().toISOString() })
    if (error) setError(error.message)
    else { setSuccess('Perfil guardado'); await refreshProfile() }
    setSaving(false)
  }

  async function handlePhoto(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true); setError('')
    const ext = file.name.split('.').pop()
    const path = 'avatars/' + user.id + '.' + ext
    const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (upErr) { setError('Error al subir foto'); setUploading(false); return }
    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    await supabase.from('profiles').upsert({ id: user.id, avatar_url: data.publicUrl, email: user.email, updated_at: new Date().toISOString() })
    await refreshProfile()
    setUploading(false)
    setSuccess('Foto actualizada')
  }

  async function addCommitment(e) {
    e.preventDefault()
    if (!cTitle.trim() || !cStart || !cEnd) return
    setSavingC(true)
    await supabase.from('commitments').insert({ user_id: user.id, title: cTitle.trim(), start_date: cStart, end_date: cEnd })
    setCTitle(''); setCStart(''); setCEnd(''); setShowForm(false)
    fetchCommitments()
    setSavingC(false)
  }

  async function deleteCommitment(id) {
    await supabase.from('commitments').delete().eq('id', id)
    setCommitments(c => c.filter(x => x.id !== id))
  }

  function formatDate(d) {
    const date = new Date(d + 'T00:00:00')
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
  }

  return (
    <div>
      <div className="page-header">
        <h2>Mi perfil</h2>
        <p>Tu informacion y compromisos</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>

        {/* Datos personales */}
        <div className="card">
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', marginBottom: 20 }}>Datos personales</h3>
          {error && <div className="error-msg" style={{ marginBottom: 16 }}>{error}</div>}
          {success && <div className="success-msg" style={{ marginBottom: 16 }}>{success}</div>}

          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24 }}>
            <div className="profile-avatar-wrap">
              <Avatar profile={profile || { email: user?.email }} size="xl" />
              <button className="change-photo" onClick={() => fileRef.current?.click()} disabled={uploading}>
                <Camera size={14} />
              </button>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhoto} />
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 700 }}>{profile?.full_name || 'Sin nombre'}</div>
              <div style={{ color: 'var(--ink-light)', fontSize: '0.82rem', marginTop: 4 }}>{user?.email}</div>
              {uploading && <div style={{ fontSize: '0.8rem', color: 'var(--terracotta)', marginTop: 4 }}>Subiendo foto...</div>}
            </div>
          </div>

          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="input-group">
              <label>Nombre</label>
              <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Tu nombre" />
            </div>
            <div className="input-group">
              <label>Email</label>
              <input className="input" value={user?.email || ''} disabled style={{ opacity: 0.6 }} />
            </div>
            <button className="btn btn-primary" type="submit" disabled={saving} style={{ alignSelf: 'flex-start' }}>
              <Save size={15} /> {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </form>
        </div>

        {/* Compromisos */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem' }}>Mis compromisos</h3>
            <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>
              <Plus size={14} /> Anadir
            </button>
          </div>

          {showForm && (
            <form onSubmit={addCommitment} style={{ background: 'var(--sand)', borderRadius: 10, padding: 16, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className="input-group">
                <label>Que tienes que hacer</label>
                <input className="input" placeholder="Ej: Viaje con la familia" value={cTitle} onChange={e => setCTitle(e.target.value)} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="input-group">
                  <label>Desde</label>
                  <input className="input" type="date" value={cStart} onChange={e => { setCStart(e.target.value); if (!cEnd) setCEnd(e.target.value) }} required />
                </div>
                <div className="input-group">
                  <label>Hasta</label>
                  <input className="input" type="date" value={cEnd} min={cStart} onChange={e => setCEnd(e.target.value)} required />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary btn-sm" type="submit" disabled={savingC}>Guardar</button>
                <button className="btn btn-ghost btn-sm" type="button" onClick={() => setShowForm(false)}>Cancelar</button>
              </div>
            </form>
          )}

          {commitments.length === 0 && !showForm ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--ink-light)' }}>
              <div style={{ fontSize: '2rem', marginBottom: 8 }}>📅</div>
              <p style={{ fontSize: '0.85rem' }}>Sin compromisos anotados</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {commitments.map(c => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--sand)', borderRadius: 8, borderLeft: '3px solid var(--terracotta)' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>{c.title}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--ink-light)', marginTop: 2 }}>
                      {formatDate(c.start_date)}{c.start_date !== c.end_date ? ' - ' + formatDate(c.end_date) : ''}
                    </div>
                  </div>
                  <button className="btn btn-ghost btn-sm" style={{ padding: '4px 8px', color: '#dc2626' }} onClick={() => deleteCommitment(c.id)}>
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
