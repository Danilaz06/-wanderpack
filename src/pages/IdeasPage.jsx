import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { ThumbsUp, Plus, X, Lightbulb, CheckCircle, Clock, Loader } from 'lucide-react'
import { Avatar } from '../components/Layout'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const ADMIN_EMAIL = 'daniellazar1614@gmail.com'

const STATUS_CONFIG = {
  pendiente:    { label: 'Pendiente',    color: '#D4A827', bg: 'rgba(212,168,39,0.12)' },
  en_proceso:   { label: 'En proceso',   color: '#2D6E8E', bg: 'rgba(45,110,142,0.12)' },
  implementado: { label: 'Implementado', color: '#5C7A5E', bg: 'rgba(92,122,94,0.12)' },
}

export default function IdeasPage() {
  const { user, profile } = useAuth()
  const isAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL || profile?.email?.toLowerCase() === ADMIN_EMAIL

  const [ideas, setIdeas] = useState([])
  const [votes, setVotes] = useState({})
  const [profiles, setProfiles] = useState({})
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)

    const [{ data: ideasData }, { data: votesData }, { data: profilesData }] = await Promise.all([
      supabase.from('ideas').select('*').order('created_at', { ascending: false }),
      supabase.from('idea_votes').select('*'),
      supabase.from('profiles').select('id, full_name, email, avatar_url'),
    ])

    setIdeas(ideasData || [])

    const votesMap = {}
    for (const v of (votesData || [])) {
      if (!votesMap[v.idea_id]) votesMap[v.idea_id] = []
      votesMap[v.idea_id].push(v.user_id)
    }
    setVotes(votesMap)

    const profilesMap = {}
    for (const p of (profilesData || [])) profilesMap[p.id] = p
    setProfiles(profilesMap)

    setLoading(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim()) return
    setSubmitting(true); setError('')

    const { error: err } = await supabase.from('ideas').insert({
      user_id: user.id,
      title: title.trim(),
      description: description.trim() || null,
    })

    if (err) { setError(err.message); setSubmitting(false); return }

    setTitle(''); setDescription(''); setShowForm(false)
    setSubmitting(false)
    fetchAll()
  }

  async function handleVote(idea) {
    const myVoters = votes[idea.id] || []
    const hasVoted = myVoters.includes(user.id)

    if (hasVoted) {
      await supabase.from('idea_votes').delete().eq('idea_id', idea.id).eq('user_id', user.id)
    } else {
      await supabase.from('idea_votes').insert({ idea_id: idea.id, user_id: user.id })
    }

    setVotes(prev => {
      const current = prev[idea.id] || []
      return {
        ...prev,
        [idea.id]: hasVoted
          ? current.filter(id => id !== user.id)
          : [...current, user.id],
      }
    })
  }

  async function handleStatus(idea, status) {
    await supabase.from('ideas').update({ status }).eq('id', idea.id)
    setIdeas(prev => prev.map(i => i.id === idea.id ? { ...i, status } : i))
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 12, color: 'var(--ink-light)' }}>
      <Loader size={22} className="spin" /> Cargando ideas...
    </div>
  )

  return (
    <div className="page-container">
      <div className="page-header-row">
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Lightbulb size={22} color="var(--terracotta)" /> Ideas de mejora
          </h2>
          <p style={{ color: 'var(--ink-light)', fontSize: '0.88rem', marginTop: 2 }}>
            Propón ideas para mejorar la app · Vota las que más te gusten
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(v => !v)}>
          {showForm ? <><X size={16} /> Cancelar</> : <><Plus size={16} /> Nueva idea</>}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={{
          background: 'var(--sand)',
          border: '1.5px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: '16px 18px',
          marginBottom: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}>
          {error && <div className="error-msg">{error}</div>}
          <div className="input-group">
            <label>Título de la idea</label>
            <input className="input" placeholder="Ej: Añadir notificaciones push" value={title} onChange={e => setTitle(e.target.value)} required />
          </div>
          <div className="input-group">
            <label>Descripción (opcional)</label>
            <textarea className="input" placeholder="Explica un poco más tu idea..." value={description} onChange={e => setDescription(e.target.value)} rows={3} />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-primary" type="submit" disabled={submitting || !title.trim()}>
              {submitting ? 'Enviando...' : 'Enviar idea'}
            </button>
            <button className="btn btn-ghost" type="button" onClick={() => setShowForm(false)}>Cancelar</button>
          </div>
        </form>
      )}

      {ideas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--ink-light)' }}>
          <Lightbulb size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
          <p>Todavía no hay ideas. ¡Sé el primero en proponer algo!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {ideas.map(idea => {
            const ideaVoters = votes[idea.id] || []
            const hasVoted = ideaVoters.includes(user.id)
            const author = profiles[idea.user_id]
            const statusCfg = STATUS_CONFIG[idea.status] || STATUS_CONFIG.pendiente

            return (
              <div key={idea.id} style={{
                background: 'white',
                border: '1.5px solid var(--border)',
                borderRadius: 'var(--radius)',
                padding: '14px 16px',
                display: 'flex',
                gap: 14,
                alignItems: 'flex-start',
              }}>
                <button
                  onClick={() => handleVote(idea)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 2,
                    background: hasVoted ? 'rgba(196,98,45,0.1)' : 'var(--sand)',
                    border: hasVoted ? '1.5px solid var(--terracotta)' : '1.5px solid var(--border)',
                    borderRadius: 8,
                    padding: '6px 10px',
                    cursor: 'pointer',
                    color: hasVoted ? 'var(--terracotta)' : 'var(--ink-light)',
                    minWidth: 44,
                    flexShrink: 0,
                    transition: 'all 0.15s',
                  }}
                >
                  <ThumbsUp size={16} />
                  <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>{ideaVoters.length}</span>
                </button>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.95rem', flex: 1 }}>{idea.title}</span>
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: 20,
                      background: statusCfg.bg,
                      color: statusCfg.color,
                      whiteSpace: 'nowrap',
                    }}>
                      {statusCfg.label}
                    </span>
                  </div>

                  {idea.description && (
                    <p style={{ color: 'var(--ink-light)', fontSize: '0.85rem', marginTop: 4, lineHeight: 1.5 }}>
                      {idea.description}
                    </p>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                    <Avatar profile={author} size="sm" />
                    <span style={{ fontSize: '0.78rem', color: 'var(--ink-light)' }}>
                      {author?.full_name || author?.email?.split('@')[0]} · {format(new Date(idea.created_at), "d MMM", { locale: es })}
                    </span>
                  </div>

                  {isAdmin && (
                    <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                      {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                        <button
                          key={key}
                          onClick={() => handleStatus(idea, key)}
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            padding: '3px 10px',
                            borderRadius: 20,
                            border: idea.status === key ? `1.5px solid ${cfg.color}` : '1.5px solid var(--border)',
                            background: idea.status === key ? cfg.bg : 'transparent',
                            color: idea.status === key ? cfg.color : 'var(--ink-light)',
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                          }}
                        >
                          {cfg.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
