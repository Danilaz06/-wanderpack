import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { Camera, Save } from 'lucide-react'
import { Avatar } from '../components/Layout'

export default function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth()
  const [name, setName] = useState(profile?.full_name || '')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef()

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true); setError(''); setSuccess('')
    const { error } = await supabase
      .from('profiles')
      .upsert({ id: user.id, full_name: name, email: user.email, updated_at: new Date().toISOString() })
    if (error) setError(error.message)
    else { setSuccess('Perfil guardado correctamente'); await refreshProfile() }
    setSaving(false)
  }

  async function handlePhoto(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true); setError('')
    const ext = file.name.split('.').pop()
    const path = `avatars/${user.id}.${ext}`
    const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (upErr) { setError('Error al subir foto: ' + upErr.message); setUploading(false); return }
    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    await supabase.from('profiles').upsert({ id: user.id, avatar_url: data.publicUrl, email: user.email, updated_at: new Date().toISOString() })
    await refreshProfile()
    setUploading(false)
    setSuccess('Foto actualizada')
  }

  return (
    <div>
      <div className="page-header">
        <h2>Mi perfil</h2>
        <p>Gestiona tu información personal</p>
      </div>

      <div className="card" style={{ maxWidth: 480 }}>
        {error && <div className="error-msg" style={{ marginBottom: 16 }}>{error}</div>}
        {success && <div className="success-msg" style={{ marginBottom: 16 }}>{success}</div>}

        <div className="profile-header">
          <div className="profile-avatar-wrap">
            <Avatar profile={profile || { email: user?.email }} size="xl" />
            <button className="change-photo" onClick={() => fileRef.current?.click()} disabled={uploading}>
              <Camera size={14} />
            </button>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhoto} />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 700 }}>
              {profile?.full_name || 'Sin nombre'}
            </div>
            <div style={{ color: 'var(--ink-light)', fontSize: '0.85rem', marginTop: 4 }}>{user?.email}</div>
            {uploading && <div style={{ fontSize: '0.8rem', color: 'var(--terracotta)', marginTop: 4 }}>Subiendo foto...</div>}
          </div>
        </div>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="input-group">
            <label>Nombre completo</label>
            <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Tu nombre" />
          </div>
          <div className="input-group">
            <label>Email</label>
            <input className="input" value={user?.email || ''} disabled style={{ opacity: 0.6 }} />
          </div>
          <button className="btn btn-primary" type="submit" disabled={saving} style={{ alignSelf: 'flex-start' }}>
            <Save size={15} />
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </form>
      </div>
    </div>
  )
}
