import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Plus, Calendar, Trash2 } from 'lucide-react'
import CreatePlanModal from '../components/CreatePlanModal'
import { Avatar } from '../components/Layout'

const PLAN_COLORS = ['#C4622D','#2D6E8E','#5C7A5E','#D4A827','#7C4F8E']

export default function PlansPage() {
  const [plans, setPlans] = useState([])
  const [showCreate, setShowCreate] = useState(false)
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState(null)
  const navigate = useNavigate()
  const { user } = useAuth()

  useEffect(() => { fetchPlans() }, [])

  async function fetchPlans() {
    setLoading(true)
    // Fetch all plans (no member filter — all users see all plans)
    const { data, error } = await supabase
      .from('plans')
      .select(`*, plan_members(user_id, profiles(id, full_name, avatar_url, email))`)
      .order('start_date', { ascending: true })
    if (error) console.error(error)
    setPlans(data || [])
    setLoading(false)
  }

  async function deletePlan(e, planId, createdBy) {
    e.stopPropagation()
    if (createdBy !== user.id) {
      alert('Solo el creador del plan puede borrarlo')
      return
    }
    if (!confirm('¿Seguro que quieres borrar este plan? Se borrará todo (chat, encuestas, disponibilidad)')) return
    setDeletingId(planId)
    await supabase.from('plans').delete().eq('id', planId)
    setPlans(p => p.filter(pl => pl.id !== planId))
    setDeletingId(null)
  }

  function formatDateRange(start, end) {
    const s = new Date(start + 'T00:00:00')
    const e = new Date(end + 'T00:00:00')
    if (start === end) return format(s, "d 'de' MMMM yyyy", { locale: es })
    if (s.getMonth() === e.getMonth()) return `${format(s, 'd')}–${format(e, "d 'de' MMMM yyyy", { locale: es })}`
    return `${format(s, "d 'de' MMM", { locale: es })} – ${format(e, "d 'de' MMM yyyy", { locale: es })}`
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h2>Planes</h2>
          <p>Todos los planes del grupo</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={16} /> Nuevo plan
        </button>
      </div>

      {loading ? (
        <div className="spinner" />
      ) : plans.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 24px' }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>🏝️</div>
          <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: 8 }}>Sin planes todavía</h3>
          <p style={{ color: 'var(--ink-light)', marginBottom: 20 }}>¡Crea el primer plan para el grupo!</p>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={16} /> Crear plan
          </button>
        </div>
      ) : (
        <div className="plans-grid">
          {plans.map(plan => {
            const members = plan.plan_members?.map(m => m.profiles).filter(Boolean) || []
            const color = PLAN_COLORS[plan.color_index || 0]
            const isCreator = plan.created_by === user.id
            return (
              <div key={plan.id} className="plan-card" onClick={() => navigate(`/plans/${plan.id}`)}>
                <div className="plan-card-color" style={{ background: color }} />
                <div className="plan-card-body">
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: '1.4rem' }}>{plan.emoji || '✈️'}</span>
                      <h3 className="plan-card-title" style={{ margin: 0 }}>{plan.title}</h3>
                    </div>
                    {isCreator && (
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ padding: '4px 8px', color: '#dc2626', flexShrink: 0 }}
                        onClick={e => deletePlan(e, plan.id, plan.created_by)}
                        disabled={deletingId === plan.id}
                        title="Borrar plan"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                  <div className="plan-card-date">
                    <Calendar size={13} />
                    {formatDateRange(plan.start_date, plan.end_date)}
                  </div>
                  {plan.description && (
                    <p className="plan-card-desc">{plan.description}</p>
                  )}
                  <div className="plan-card-footer">
                    <div className="avatar-stack">
                      {members.slice(0, 5).map(m => (
                        <Avatar key={m.id} profile={m} />
                      ))}
                      {members.length > 5 && (
                        <div className="avatar" style={{ background: 'var(--sand-dark)', color: 'var(--ink-light)', fontSize: '0.65rem', fontWeight: 700, width: 28, height: 28, border: '2px solid white', marginLeft: -8 }}>
                          +{members.length - 5}
                        </div>
                      )}
                      {members.length === 0 && (
                        <span style={{ fontSize: '0.78rem', color: 'var(--ink-light)' }}>Sin miembros aún</span>
                      )}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--ink-light)' }}>
                      {members.length} {members.length === 1 ? 'persona' : 'personas'}
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
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); fetchPlans() }}
        />
      )}
    </div>
  )
}
