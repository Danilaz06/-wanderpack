import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { ArrowLeft, Send, Plus, Calendar, Users, MessageSquare, BarChart2, Check, Image, Download, Trash2, X, Bell, Clock, Heart, Pencil } from 'lucide-react'
import CreatePlanModal from '../components/CreatePlanModal'
import { Avatar } from '../components/Layout'
import { sendPlanReminder } from '../lib/notifications'

const PLAN_COLORS = ['#C4622D','#2D6E8E','#5C7A5E','#D4A827','#7C4F8E']

export default function PlanDetailPage() {
  const { id } = useParams()
  const { user, profile } = useAuth()
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
  const [dateProposals, setDateProposals] = useState([])
  const [propStart, setPropStart] = useState('')
  const [propEnd, setPropEnd] = useState('')
  const [savingProp, setSavingProp] = useState(false)
  const [commitments, setCommitments] = useState({})

  // Fotos (planes de pareja)
  const [photos, setPhotos] = useState([])
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [lightboxPhoto, setLightboxPhoto] = useState(null)
  const photoInputRef = useRef(null)

  // Recordatorios admin + edición
  const [sendingReminder, setSendingReminder] = useState(null)
  const [reminderSent, setReminderSent] = useState(null)
  const [showEdit, setShowEdit] = useState(false)
  const ADMIN_EMAIL = 'daniellazar1614@gmail.com'
  const isAdmin =
    user?.email?.toLowerCase() === ADMIN_EMAIL ||
    profile?.email?.toLowerCase() === ADMIN_EMAIL

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
    await Promise.all([fetchPlan(), fetchMessages(), fetchPolls(), fetchAvailability(), fetchCommitments(), fetchDateProposals()])
    setLoading(false)
  }

  async function fetchPlan() {
    const { data: planData } = await supabase.from('plans').select('*').eq('id', id).single()
    if (!planData) return
    setPlan(planData)

    const { data: memberRows } = await supabase.from('plan_members').select('user_id').eq('plan_id', id)
    if (memberRows?.length) {
      const userIds = memberRows.map(m => m.user_id)
      const { data: profiles } = await supabase.from('profiles').select('id, full_name, avatar_url, email').in('id', userIds)
      setMembers(profiles || [])
    } else {
      setMembers([])
    }

    if (planData.is_couple) {
      fetchPhotos()
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

  async function fetchCommitments() {
    const { data: memberRows } = await supabase.from('plan_members').select('user_id').eq('plan_id', id)
    if (!memberRows?.length) return
    const userIds = memberRows.map(m => m.user_id)
    const { data } = await supabase.from('commitments').select('*').in('user_id', userIds)
    const map = {}
    data?.forEach(c => {
      if (!map[c.user_id]) map[c.user_id] = []
      map[c.user_id].push(c)
    })
    setCommitments(map)
  }

  async function fetchDateProposals() {
    const { data } = await supabase.from('date_proposals').select('*').eq('plan_id', id).order('created_at')
    if (!data?.length) { setDateProposals([]); return }
    const userIds = [...new Set(data.map(d => d.user_id))]
    const { data: profiles } = await supabase.from('profiles').select('id, full_name, avatar_url, email').in('id', userIds)
    const pm = {}; profiles?.forEach(p => { pm[p.id] = p })
    setDateProposals(data.map(d => ({ ...d, profile: pm[d.user_id] })))
  }

  async function fetchPhotos() {
    const { data } = await supabase
      .from('couple_plan_photos')
      .select('*')
      .eq('plan_id', id)
      .order('created_at', { ascending: false })
    setPhotos(data || [])
  }

  function getPhotoUrl(filePath) {
    const { data } = supabase.storage.from('couple-photos').getPublicUrl(filePath)
    return data.publicUrl
  }

  async function handlePhotoUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingPhoto(true)
    const ext = file.name.split('.').pop()
    const filePath = `${id}/${crypto.randomUUID()}.${ext}`
    const { error: uploadErr } = await supabase.storage
      .from('couple-photos')
      .upload(filePath, file)
    if (!uploadErr) {
      await supabase.from('couple_plan_photos').insert({
        plan_id: id,
        user_id: user.id,
        file_path: filePath,
        file_name: file.name,
      })
      await fetchPhotos()
    }
    setUploadingPhoto(false)
    e.target.value = ''
  }

  async function deletePhoto(photo) {
    if (!confirm('¿Eliminar esta foto?')) return
    await supabase.storage.from('couple-photos').remove([photo.file_path])
    await supabase.from('couple_plan_photos').delete().eq('id', photo.id)
    setPhotos(p => p.filter(x => x.id !== photo.id))
  }

  async function downloadPhoto(photo) {
    const url = getPhotoUrl(photo.file_path)
    const a = document.createElement('a')
    a.href = url
    a.download = photo.file_name
    a.target = '_blank'
    a.click()
  }

  async function handleReminder(type) {
    setSendingReminder(type)
    await sendPlanReminder(plan, type).catch(() => {})
    setSendingReminder(null)
    setReminderSent(type)
    setTimeout(() => setReminderSent(null), 3000)
  }

  async function addDateProposal() {
    if (!propStart) return
    setSavingProp(true)
    await supabase.from('date_proposals').insert({ plan_id: id, user_id: user.id, proposed_start: propStart, proposed_end: propEnd || propStart })
    setPropStart(''); setPropEnd('')
    await fetchDateProposals()
    setSavingProp(false)
  }

  async function deleteDateProposal(propId) {
    await supabase.from('date_proposals').delete().eq('id', propId)
    setDateProposals(p => p.filter(x => x.id !== propId))
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

  function formatDateRange(start, end, startTime, endTime) {
    if (!start) return 'Fechas por decidir'
    const s = new Date(start + 'T00:00:00')
    const e = new Date(end + 'T00:00:00')
    let dateStr = start === end
      ? format(s, "d 'de' MMMM yyyy", { locale: es })
      : `${format(s, "d 'de' MMM", { locale: es })} – ${format(e, "d 'de' MMMM yyyy", { locale: es })}`
    if (startTime) {
      dateStr += ` · ${startTime.slice(0, 5)}`
      if (endTime) dateStr += `–${endTime.slice(0, 5)}`
      dateStr += 'h'
    }
    return dateStr
  }

  function formatShortDate(d) {
    return new Date(d + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
  }

  if (loading) return <div className="spinner" style={{ marginTop: 60 }} />
  if (!plan) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-light)' }}>Plan no encontrado</div>

  const color = PLAN_COLORS[plan.color_index || 0]
  const isMember = members.find(m => m.id === user?.id)
  const isCouple = plan.is_couple

  return (
    <div>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 20 }} onClick={() => navigate(-1)}>
        <ArrowLeft size={15} /> Volver
      </button>

      <div className="plan-detail-header">
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <span style={{ fontSize: '2rem' }}>{plan.emoji || '✈️'}</span>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 700, letterSpacing: '-0.03em' }}>{plan.title}</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.88rem', color: 'var(--ink-light)' }}>
              <Calendar size={15} /> {formatDateRange(plan.start_date, plan.end_date, plan.start_time, plan.end_time)}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.88rem', color: 'var(--ink-light)' }}>
              <Users size={15} /> {members.length} personas
            </span>
            {isCouple && (
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#E8507A', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Heart size={13} fill="#E8507A" color="#E8507A" /> Plan privado
              </span>
            )}
            {!isMember && !isCouple && (
              <button className="btn btn-primary btn-sm" onClick={joinPlan} disabled={joining}>
                {joining ? '...' : '+ Unirme al plan'}
              </button>
            )}
          </div>
          {plan.open_dates && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', fontWeight: 700, background: 'rgba(212,168,39,0.15)', color: '#9a7a10', borderRadius: 99, padding: '3px 12px', marginTop: 8 }}>
              📅 Fechas por decidir
            </span>
          )}
          {plan.description && <p style={{ marginTop: 10, color: 'var(--ink-light)', fontSize: '0.9rem' }}>{plan.description}</p>}
        </div>
        <div style={{ width: 8, height: 60, borderRadius: 4, background: isCouple ? '#E8507A' : color, flexShrink: 0 }} />
      </div>

      {(isAdmin || plan?.created_by === user?.id) && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16, padding: '12px 16px', background: 'rgba(196,98,45,0.06)', borderRadius: 'var(--radius-sm)', border: '1.5px dashed var(--terracotta)' }}>
          {isAdmin && (
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--terracotta)', textTransform: 'uppercase', letterSpacing: '0.06em', width: '100%' }}>
              🔧 Admin — solo tú ves esto
            </span>
          )}
          <button
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            onClick={() => setShowEdit(true)}
          >
            <Pencil size={14} /> Editar plan
          </button>
          {isAdmin && (
            <>
              <button
                className="btn btn-secondary btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                onClick={() => handleReminder('remember')}
                disabled={sendingReminder !== null}
              >
                <Bell size={14} />
                {sendingReminder === 'remember' ? 'Enviando...' : reminderSent === 'remember' ? '✓ Enviado' : 'Recordar el plan'}
              </button>
              <button
                className="btn btn-secondary btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                onClick={() => handleReminder('soon')}
                disabled={sendingReminder !== null}
              >
                <Clock size={14} />
                {sendingReminder === 'soon' ? 'Enviando...' : reminderSent === 'soon' ? '✓ Enviado' : 'Queda poco tiempo'}
              </button>
            </>
          )}
        </div>
      )}

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
        {isCouple && (
          <button className={`plan-tab ${tab === 'photos' ? 'active' : ''}`} onClick={() => setTab('photos')}>
            <Image size={15} /> Fotos
          </button>
        )}
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
              {messages.map((msg, i) => {
                const isOwn = msg.user_id === user?.id
                const sender = msg.profiles
                const prev = messages[i - 1]
                const next = messages[i + 1]
                const isFirst = !prev || prev.user_id !== msg.user_id
                const isLast = !next || next.user_id !== msg.user_id
                return (
                  <div
                    key={msg.id}
                    className={`chat-message ${isOwn ? 'own' : ''}`}
                    style={{ marginBottom: isLast ? 8 : 2, alignItems: 'flex-end' }}
                  >
                    {/* Avatar solo en el último de cada grupo */}
                    {!isOwn && (
                      <div style={{ width: 32, flexShrink: 0 }}>
                        {isLast && <Avatar profile={sender} />}
                      </div>
                    )}
                    <div style={{ maxWidth: '72%' }}>
                      {/* Nombre solo en el primero del grupo */}
                      {!isOwn && isFirst && (
                        <div className="chat-sender">{sender?.full_name || sender?.email || 'Alguien'}</div>
                      )}
                      <div
                        className={`chat-bubble ${isOwn ? 'own' : 'other'}`}
                        style={{
                          borderBottomRightRadius: isOwn && !isLast ? 4 : undefined,
                          borderBottomLeftRadius: !isOwn && !isLast ? 4 : undefined,
                          borderTopRightRadius: isOwn && !isFirst ? 4 : undefined,
                          borderTopLeftRadius: !isOwn && !isFirst ? 4 : undefined,
                        }}
                      >
                        {msg.content}
                      </div>
                      {isLast && (
                        <div className="chat-meta">{format(new Date(msg.created_at), 'HH:mm')}</div>
                      )}
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
          {plan.open_dates && (
            <div style={{ marginBottom: 28 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', marginBottom: 4 }}>Proponer fechas</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--ink-light)', marginBottom: 16 }}>Propone cuando podria hacerse este plan</p>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
                <div className="input-group" style={{ flex: 1, minWidth: 130 }}>
                  <label>Desde</label>
                  <input className="input" type="date" value={propStart} onChange={e => { setPropStart(e.target.value); if (!propEnd) setPropEnd(e.target.value) }} />
                </div>
                <div className="input-group" style={{ flex: 1, minWidth: 130 }}>
                  <label>Hasta</label>
                  <input className="input" type="date" value={propEnd} min={propStart} onChange={e => setPropEnd(e.target.value)} />
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <button className="btn btn-primary btn-sm" onClick={addDateProposal} disabled={!propStart || savingProp}>
                    {savingProp ? '...' : '+ Proponer'}
                  </button>
                </div>
              </div>

              {dateProposals.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--ink-light)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Propuestas del grupo</div>
                  {dateProposals.map(p => (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--sand)', borderRadius: 8, borderLeft: '3px solid var(--gold)' }}>
                      <span style={{ fontSize: '1rem' }}>📅</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>
                          {formatShortDate(p.proposed_start)}{p.proposed_start !== p.proposed_end ? ' — ' + formatShortDate(p.proposed_end) : ''}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--ink-light)' }}>Propuesto por {p.profile?.full_name || p.profile?.email}</div>
                      </div>
                      {p.user_id === user?.id && (
                        <button className="btn btn-ghost btn-sm" style={{ padding: '4px 8px', color: '#dc2626' }} onClick={() => deleteDateProposal(p.id)}>✕</button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <hr style={{ border: 'none', borderTop: '1px solid var(--border)', marginBottom: 20 }} />
            </div>
          )}

          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', marginBottom: 4 }}>Tu disponibilidad</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--ink-light)' }}>Indica si puedes venir a este plan</p>
          </div>

          <div style={{ display: 'flex', gap: 10, marginBottom: 28, flexWrap: 'wrap' }}>
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
              const statusMap = { yes: { label: 'Va', color: 'var(--sage)' }, maybe: { label: 'Tal vez', color: '#9a7a10' }, no: { label: 'No puede', color: '#dc2626' } }
              const s = avail ? statusMap[avail.status] : null
              const userCommitments = (commitments[m.id] || []).filter(c => {
                if (!plan.start_date) return false
                const cs = new Date(c.start_date + 'T00:00:00')
                const ce = new Date(c.end_date + 'T00:00:00')
                const ps = new Date(plan.start_date + 'T00:00:00')
                const pe = new Date(plan.end_date + 'T00:00:00')
                return cs <= pe && ce >= ps
              })
              return (
                <div key={m.id} style={{ background: 'var(--sand)', borderRadius: 10, padding: '12px 14px', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar profile={m} />
                    <span style={{ flex: 1, fontWeight: 600, fontSize: '0.88rem' }}>{m.full_name || m.email}</span>
                    {s ? <span style={{ fontSize: '0.78rem', fontWeight: 700, color: s.color }}>{s.label}</span>
                      : <span style={{ fontSize: '0.78rem', color: 'var(--ink-light)', fontStyle: 'italic' }}>Sin respuesta</span>}
                  </div>
                  {userCommitments.length > 0 && (
                    <div style={{ marginTop: 8, paddingLeft: 44 }}>
                      {userCommitments.map(c => (
                        <div key={c.id} style={{ fontSize: '0.78rem', color: '#dc2626', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                          <span>📌</span>
                          <span>{c.title} ({new Date(c.start_date+'T00:00:00').toLocaleDateString('es-ES',{day:'numeric',month:'short'})} - {new Date(c.end_date+'T00:00:00').toLocaleDateString('es-ES',{day:'numeric',month:'short'})})</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {userCommitments.length === 0 && avail?.status !== 'no' && plan.start_date && (
                    <div style={{ marginTop: 6, paddingLeft: 44, fontSize: '0.75rem', color: 'var(--sage)' }}>
                      Sin compromisos en estas fechas
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {tab === 'photos' && isCouple && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem' }}>Fotos del plan</h3>
            <button
              className="btn btn-sm"
              style={{ background: '#E8507A', color: 'white' }}
              onClick={() => photoInputRef.current?.click()}
              disabled={uploadingPhoto}
            >
              <Image size={14} /> {uploadingPhoto ? 'Subiendo...' : 'Subir foto'}
            </button>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handlePhotoUpload}
            />
          </div>

          {photos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--ink-light)' }}>
              <Image size={36} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.25 }} />
              <p style={{ marginBottom: 16 }}>Sin fotos todavía</p>
              <button
                className="btn btn-sm"
                style={{ background: '#E8507A', color: 'white' }}
                onClick={() => photoInputRef.current?.click()}
              >
                <Image size={14} /> Subir la primera foto
              </button>
            </div>
          ) : (
            <div className="photo-grid">
              {photos.map(photo => (
                <div key={photo.id} className="photo-item" onClick={() => setLightboxPhoto(photo)}>
                  <img src={getPhotoUrl(photo.file_path)} alt={photo.file_name} loading="lazy" />
                  <div className="photo-item-actions" onClick={e => e.stopPropagation()}>
                    <button className="photo-action-btn download" onClick={() => downloadPhoto(photo)} title="Descargar">
                      <Download size={14} />
                    </button>
                    {photo.user_id === user?.id && (
                      <button className="photo-action-btn delete" onClick={() => deletePhoto(photo)} title="Eliminar">
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showEdit && (
        <CreatePlanModal
          plan={plan}
          isCouple={plan.is_couple}
          onClose={() => setShowEdit(false)}
          onCreated={updated => { setPlan(updated); setShowEdit(false) }}
        />
      )}

      {lightboxPhoto && (
        <div className="lightbox-overlay" onClick={() => setLightboxPhoto(null)}>
          <button className="lightbox-close" onClick={() => setLightboxPhoto(null)}>
            <X size={20} />
          </button>
          <img
            className="lightbox-img"
            src={getPhotoUrl(lightboxPhoto.file_path)}
            alt={lightboxPhoto.file_name}
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
