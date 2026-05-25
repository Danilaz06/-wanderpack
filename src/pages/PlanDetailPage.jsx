import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { ArrowLeft, Send, Plus, Calendar, Users, MessageSquare, BarChart2, Check } from 'lucide-react'
import { Avatar } from '../components/Layout'

const PLAN_COLORS = ['#C4622D','#2D6E8E','#5C7A5E','#D4A827','#7C4F8E']

export default function PlanDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [plan, setPlan] = useState(null)
  const [members, setMembers] = useState([])
  const [tab, setTab] = useState('chat')
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)

  const [messages, setMessages] = useState([])
  const [msgText, setMsgText] = useState('')
  const messagesEndRef = useRef(null)

  const [polls, setPolls] = useState([])
  const [showPollForm, setShowPollForm] = useState(false)
  const [pollQ, setPollQ] = useState('')
  const [pollOpts, setPollOpts] = useState(['', ''])
  const [myVotes, setMyVotes] = useState({})

  const [availability, setAvailability] = useState([])

  useEffect(() => { fetchAll() }, [id])

  useEffect(() => {
    const channel = supabase
      .channel(`chat-${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `plan_id=eq.${id}` }, () => {
        fetchMessages()
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [id])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function fetchAll() {
    setLoading(true)
    await Promise.all([fetchPlan(), fetchMessages(), fetchPolls(), fetchAvailability()])
    setLoading(false)
  }

  async function fetchPlan() {
    const { data: planData } = await supabase.from('plans').select('*').eq('id', id).single()
    if (!planData) return
    setPlan(planData)

    // Fetch members separately
    const { data: memberRows } = await supabase.from('plan_members').select('user_id').eq('plan_id', id)
    if (memberRows?.length) {
      const userIds = memberRows.map(m => m.user_id)
      const { data: profiles } = await supabase.from('profiles').select('id, full_name, avatar_url, email').in('id', userIds)
      setMembers(profiles || [])
    } else {
      setMembers([])
    }
  }

  async function fetchMessages() {
    const { data: msgs } = await supabase.from('messages').select('*').eq('plan_id', id).order('created_at', { ascending: true })
    if (!msgs?.length) { setMessages([]); return }

    const userIds = [...new Set(msgs.map(m => m.user_id))]
    const { data: profiles } = await supabase.from('profiles').select('id, full_name, avatar_url, email').in('id', userIds)
    const profilesMap = {}
    profiles?.forEach(p => { profilesMap[p.id] = p })

    setMessages(msgs.map(m => ({ ...m, profiles: profilesMap[m.user_id] })))
  }

  async function fetchPolls() {
    const { data: pollsData } = await supabase.from('polls').select('*').eq('plan_id', id).order('created_at')
    if (!pollsData?.length) { setPolls([]); return }

    const pollIds = pollsData.map(p => p.id)
    const { data: options } = await supabase.from('poll_options').select('*').in('poll_id', pollIds)
    const { data: votes } = await supabase.from('poll_votes').select('*').in('poll_id', pollIds)

    const myVotesMap = {}
    votes?.filter(v => v.user_id === user?.id).forEach(v => { myVotesMap[v.poll_id] = v.option_id })
    setMyVotes(myVotesMap)

    const enriched = pollsData.map(poll => ({
      ...poll,
      poll_options: options?.filter(o => o.poll_id === poll.id).map(opt => ({
        ...opt,
        poll_votes: votes?.filter(v => v.option_id === opt.id) || []
      })) || []
    }))
    setPolls(enriched)
  }

  async function fetchAvailability() {
    const { data: avRows } = await supabase.from('availability').select('*').eq('plan_id', id)
    if (!avRows?.length) { setAvailability([]); return }

    const userIds = [...new Set(avRows.map(a => a.user_id))]
    const { data: profiles } = await supabase.from('profiles').select('id, full_name, avatar_url, email').in('id', userIds)
    const profilesMap = {}
    profiles?.forEach(p => { profilesMap[p.id] = p })

    setAvailability(avRows.map(a => ({ ...a, profiles: profilesMap[a.user_id] })))
  }

  async function sendMessage(e) {
    e.preventDefault()
    if (!msgText.trim()) return
    await supabase.from('messages').insert({ plan_id: id, user_id: user.id, content: msgText.trim() })
    setMsgText('')
    fetchMessages()
  }

  async function createPoll(e) {
    e.preventDefault()
    const validOpts = pollOpts.filter(o => o.trim())
    if (!pollQ.trim() || validOpts.length < 2) return
    const { data: poll } = await supabase.from('polls').insert({ plan_id: id, user_id: user.id, question: pollQ.trim() }).select().single()
    if (poll) {
      await supabase.from('poll_options').insert(validOpts.map(text => ({ poll_id: poll.id, text: text.trim() })))
    }
    setPollQ(''); setPollOpts(['', '']); setShowPollForm(false)
    fetchPolls()
  }

  async function vote(pollId, optionId) {
    const prev = myVotes[pollId]
    if (prev === optionId) return
    if (prev) await supabase.from('poll_votes').delete().eq('user_id', user.id).eq('option_id', prev)
    await supabase.from('poll_votes').insert({ option_id: optionId, user_id: user.id, poll_id: pollId })
    setMyVotes(v => ({ ...v, [pollId]: optionId }))
    fetchPolls()
  }

  async function setAvail(status) {
    await supabase.from('availability').upsert({ plan_id: id, user_id: user.id, status }, { onConflict: 'plan_id,user_id' })
    fetchAvailability()
  }

  async function joinPlan() {
    setJoining(true)
    await supabase.from('plan_members').upsert({ plan_id: id, user_id: user.id }, { onConflict: 'plan_id,user_id' })
    await fetchPlan()
    setJoining(false)
  }

  function getMyAvail() {
    return availability.find(a => a.user_id === user?.id)?.status
  }

  function formatDateRange(start, end) {
    const s = new Date(start + 'T00:00:00')
    const e = new Date(end + 'T00:00:00')
    if (start === end) return format(s, "d 'de' MMMM yyyy", { locale: es })
    return `${format(s, "d 'de' MMM", { locale: es })} – ${format(e, "d 'de' MMMM yyyy", { locale: es })}`
  }

  if (loading) return <div className="spinner" style={{ marginTop: 60 }} />
  if (!plan) return <div>Plan no encontrado</div>

  const color = PLAN_COLORS[plan.color_index || 0]
  const isMember = members.find(m => m.id === user?.id)

  return (
    <div>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 20 }} onClick={() => navigate('/plans')}>
        <ArrowLeft size={15} /> Volver a planes
      </button>

      <div className="plan-detail-header">
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <span style={{ fontSize: '2rem' }}>{plan.emoji || '✈️'}</span>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 700, letterSpacing: '-0.03em' }}>{plan.title}</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.88rem', color: 'var(--ink-light)' }}>
              <Calendar size={15} /> {formatDateRange(plan.start_date, plan.end_date)}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.88rem', color: 'var(--ink-light)' }}>
              <Users size={15} /> {members.length} personas
            </span>
            {!isMember && (
              <button className="btn btn-primary btn-sm" onClick={joinPlan} disabled={joining}>
                {joining ? '...' : '+ Unirme al plan'}
              </button>
            )}
          </div>
          {plan.description && <p style={{ marginTop: 10, color: 'var(--ink-light)', fontSize: '0.9rem' }}>{plan.description}</p>}
        </div>
        <div style={{ width: 8, height: 60, borderRadius: 4, background: color, flexShrink: 0 }} />
      </div>

      <div className="plan-tabs">
        <button className={`plan-tab ${tab === 'chat' ? 'active' : ''}`} onClick={() => setTab('chat')}>
          <MessageSquare size={15} /> Chat
        </button>
        <button className={`plan-tab ${tab === 'polls' ? 'active' : ''}`} onClick={() => setTab('polls')}>
          <BarChart2 size={15} /> Encuestas
        </button>
        <button className={`plan-tab ${tab === 'availability' ? 'active' : ''}`} onClick={() => setTab('availability')}>
          <Calendar size={15} /> Disponibilidad
        </button>
      </div>

      {tab === 'chat' && (
        <div className="card">
          <div className="chat-container">
            <div className="chat-messages">
              {messages.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--ink-light)', fontSize: '0.88rem', margin: 'auto' }}>
                  Sé el primero en escribir algo 💬
                </div>
              )}
              {messages.map(msg => {
                const isOwn = msg.user_id === user?.id
                const sender = msg.profiles
                return (
                  <div key={msg.id} className={`chat-message ${isOwn ? 'own' : ''}`}>
                    {!isOwn && <Avatar profile={sender} />}
                    <div>
                      {!isOwn && <div className="chat-sender">{sender?.full_name || sender?.email || 'Alguien'}</div>}
                      <div className={`chat-bubble ${isOwn ? 'own' : 'other'}`}>{msg.content}</div>
                      <div className="chat-meta">{format(new Date(msg.created_at), 'HH:mm')}</div>
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>
            <form className="chat-input-row" onSubmit={sendMessage}>
              <input className="input" placeholder="Escribe un mensaje..." value={msgText} onChange={e => setMsgText(e.target.value)} />
              <button className="btn btn-primary" type="submit" disabled={!msgText.trim()}><Send size={16} /></button>
            </form>
          </div>
        </div>
      )}

      {tab === 'polls' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem' }}>Encuestas del plan</h3>
            <button className="btn btn-primary btn-sm" onClick={() => setShowPollForm(true)}>
              <Plus size={14} /> Nueva encuesta
            </button>
          </div>

          {showPollForm && (
            <div style={{ background: 'var(--sand)', borderRadius: 'var(--radius-sm)', padding: 20, marginBottom: 20 }}>
              <form onSubmit={createPoll} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="input-group">
                  <label>Pregunta</label>
                  <input className="input" placeholder="¿Qué preferís hacer?" value={pollQ} onChange={e => setPollQ(e.target.value)} required />
                </div>
                <div className="input-group">
                  <label>Opciones</label>
                  {pollOpts.map((opt, i) => (
                    <input key={i} className="input" style={{ marginBottom: 6 }} placeholder={`Opción ${i + 1}`} value={opt} onChange={e => { const o = [...pollOpts]; o[i] = e.target.value; setPollOpts(o) }} />
                  ))}
                  {pollOpts.length < 5 && (
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPollOpts([...pollOpts, ''])}>
                      <Plus size={14} /> Añadir opción
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-primary btn-sm" type="submit">Crear encuesta</button>
                  <button className="btn btn-ghost btn-sm" type="button" onClick={() => setShowPollForm(false)}>Cancelar</button>
                </div>
              </form>
            </div>
          )}

          {polls.length === 0 && !showPollForm && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--ink-light)' }}>
              <BarChart2 size={32} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.3 }} />
              <p>Sin encuestas todavía</p>
            </div>
          )}

          {polls.map(poll => {
            const totalVotes = poll.poll_options?.reduce((s, o) => s + (o.poll_votes?.length || 0), 0) || 0
            const myVote = myVotes[poll.id]
            return (
              <div key={poll.id} className="poll-card">
                <div className="poll-question">{poll.question}</div>
                {poll.poll_options?.map(opt => {
                  const votes = opt.poll_votes?.length || 0
                  const pct = totalVotes ? Math.round((votes / totalVotes) * 100) : 0
                  const isMyVote = myVote === opt.id
                  return (
                    <div key={opt.id} className={`poll-option ${isMyVote ? 'voted' : ''}`} onClick={() => vote(poll.id, opt.id)}>
                      {isMyVote && <Check size={14} color="var(--terracotta)" />}
                      <span style={{ flex: 1, fontSize: '0.88rem' }}>{opt.text}</span>
                      <div className="poll-bar-container">
                        <div className="poll-bar" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="poll-count">{votes}</span>
                    </div>
                  )
                })}
                <div style={{ fontSize: '0.75rem', color: 'var(--ink-light)', marginTop: 8 }}>{totalVotes} votos en total</div>
              </div>
            )
          })}
        </div>
      )}

      {tab === 'availability' && (
        <div className="card">
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', marginBottom: 4 }}>Tu disponibilidad</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--ink-light)' }}>Indica si puedes venir a este plan</p>
          </div>

          <div style={{ display: 'flex', gap: 10, marginBottom: 28 }}>
            {[
              { status: 'yes', label: '✅ Voy', cls: 'avail-yes' },
              { status: 'maybe', label: '🤔 Tal vez', cls: 'avail-maybe' },
              { status: 'no', label: '❌ No puedo', cls: 'avail-no' },
            ].map(({ status, label, cls }) => (
              <button key={status} className={`avail-btn ${cls} ${getMyAvail() === status ? 'selected' : ''}`} onClick={() => setAvail(status)}>
                {label}
              </button>
            ))}
          </div>

          <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--ink-light)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Respuestas del grupo</h4>

          <div className="availability-grid">
            {members.map(m => {
              const avail = availability.find(a => a.user_id === m.id)
              const statusMap = { yes: { label: 'Va ✅', color: 'var(--sage)' }, maybe: { label: 'Tal vez 🤔', color: '#9a7a10' }, no: { label: 'No puede ❌', color: '#dc2626' } }
              const s = avail ? statusMap[avail.status] : null
              return (
                <div key={m.id} className="avail-row">
                  <Avatar profile={m} />
                  <span className="avail-name">{m.full_name || m.email}</span>
                  {s ? <span style={{ fontSize: '0.82rem', fontWeight: 700, color: s.color }}>{s.label}</span>
                    : <span style={{ fontSize: '0.82rem', color: 'var(--ink-light)', fontStyle: 'italic' }}>Sin respuesta</span>}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
