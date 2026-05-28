import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Plus, Calendar, Trash2, Heart, Image } from 'lucide-react'
import CreatePlanModal from '../components/CreatePlanModal'
import { Avatar } from '../components/Layout'

const PLAN_COLORS = ['#C4622D','#2D6E8E','#5C7A5E','#D4A827','#7C4F8E']

export default function CouplePage() {
  const [plans, setPlans] = useState([])
  const [showCreate, setShowCreate] = useState(false)
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState(null)
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const ADMIN_EMAIL = 'daniellazar1614@gmail.com'
  const isAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL || profile?.email?.toLowerCase() === ADMIN_EMAIL

  useEffect(() => { fetchPlans() }, [])

  async function fetchPlans() {
    setLoading(true)
    const { data: plansData, error } = await supabase
      .from('plans')
      .select('*')
      .eq('is_couple', true)
      .order('created_at', { ascending: false })

    if (error) { console.error(error); setLoading(false); return }

    const { data: membersData } = await supabase
      .from('plan_members')
      .select('plan_id, user_id')

    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, email')

    const profilesMap = {}
    profilesData?.forEach(p => { profilesMap[p.id] = p })

    const plansList = (plansData || []).map(plan => {
      const planMembers = membersData?.filter(m => m.plan_id === plan.id) || []
      const members = planMembers.map(m => profilesMap[m.user_id]).filter(Boolean)
      return { ...plan, members }
    })

    setPlans(plansList)
    setLoading(false)
  }

  async function deletePlan(e, planId, createdBy) {
    e.stopPropagation()
    if (createdBy !== user.id && !isAdmin) { alert('Solo el creador puede borrar este plan'); return }
    if (!confirm('¿Seguro que quieres borrar este plan?')) return
    setDeletingId(planId)
    await supabase.from('plans').delete().eq('id', planId)
    setPlans(p => p.filter(pl => pl.id !== planId))
    setDeletingId(null)
  }

  function formatDateRange(start, end, openDates) {
    if (openDates || !start) return 'Fechas por decidir'
    const s = new Date(start + 'T00:00:00')
    const e = new Date(end + 'T00:00:00')
    if (start === end) return format(s, "d 'de' MMMM yyyy", { locale: es })
    if (s.getMonth() === e.getMonth()) return `${format(s, 'd')}–${format(e, "d 'de' MMMM yyyy", { locale: es })}`
    return `${format(s, "d 'de' MMM", { locale: es })} – ${format(e, "d 'de' MMM yyyy", { locale: es })}`
  }

  return (
    <div>
      <div className="page-header page-header-row" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Heart size={22} color="#E8507A" fill="#E8507A" /> Nosotros
          </h2>
          <p>Vuestros planes privados 💑</p>
        </div>
        <button className="btn btn-couple" onClick={() => setShowCreate(true)}>
          <Plus size={16} /> Nuevo plan
        </button>
      </div>

      {loading ? (
        <div className="spinner" />
      ) : plans.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 24px' }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>💑</div>
          <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: 8 }}>Sin planes todavía</h3>
          <p style={{ color: 'var(--ink-light)', marginBottom: 20 }}>¡Cread vuestro primer plan juntos!</p>
          <button className="btn btn-couple" onClick={() => setShowCreate(true)}>
            <Plus size={16} /> Crear plan
          </button>
        </div>
      ) : (
        <div className="plans-grid">
          {plans.map(plan => {
            const color = PLAN_COLORS[plan.color_index || 0]
            const canDelete = plan.created_by === user.id || isAdmin
            return (
              <div key={plan.id} className="plan-card" onClick={() => navigate(`/plans/${plan.id}`)}>
                <div className="plan-card-color" style={{ background: color }} />
                <div className="plan-card-body">
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: '1.4rem' }}>{plan.emoji || '💑'}</span>
                      <h3 className="plan-card-title" style={{ margin: 0 }}>{plan.title}</h3>
                    </div>
                    {canDelete && (
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ padding: '4px 8px', color: '#dc2626', flexShrink: 0 }}
                        onClick={e => deletePlan(e, plan.id, plan.created_by)}
                        disabled={deletingId === plan.id}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                  {plan.open_dates && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', fontWeight: 700, background: 'rgba(212,168,39,0.15)', color: '#9a7a10', borderRadius: 99, padding: '2px 10px', marginBottom: 8 }}>
                      📅 Fechas por decidir
                    </span>
                  )}
                  <div className="plan-card-date">
                    <Calendar size={13} />
                    {formatDateRange(plan.start_date, plan.end_date, plan.open_dates)}
                  </div>
                  {plan.description && (
                    <p className="plan-card-desc">{plan.description}</p>
                  )}
                  <div className="plan-card-footer">
                    <div className="avatar-stack">
                      {plan.members?.slice(0, 5).map(m => (
                        <Avatar key={m.id} profile={m} />
                      ))}
                    </div>
                    <span style={{ fontSize: '0.72rem', color: '#E8507A', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Heart size={11} fill="#E8507A" color="#E8507A" /> Privado
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showCreate && (
        <CreatePlanModal
          isCouple={true}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); fetchPlans() }}
        />
      )}
    </div>
  )
}
