import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Plus, Calendar, MessageSquare, BarChart2 } from 'lucide-react'
import CreatePlanModal from '../components/CreatePlanModal'
import { Avatar } from '../components/Layout'

const PLAN_COLORS = ['#C4622D','#2D6E8E','#5C7A5E','#D4A827','#7C4F8E']

export default function PlansPage() {
  const [plans, setPlans] = useState([])
  const [showCreate, setShowCreate] = useState(false)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => { fetchPlans() }, [])

  async function fetchPlans() {
    setLoading(true)
    const { data } = await supabase
      .from('plans')
      .select(`*, plan_members(user_id, profiles(id, full_name, avatar_url, email))`)
      .order('start_date', { ascending: true })
    setPlans(data || [])
    setLoading(false)
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
            return (
              <div key={plan.id} className="plan-card" onClick={() => navigate(`/plans/${plan.id}`)}>
                <div className="plan-card-color" style={{ background: color }} />
                <div className="plan-card-body">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <h3 className="plan-card-title">{plan.title}</h3>
                    <span style={{ fontSize: '1.4rem' }}>{plan.emoji || '✈️'}</span>
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
                    </div>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: 'var(--ink-light)' }}>
                        <MessageSquare size={13} />
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: 'var(--ink-light)' }}>
                        <BarChart2 size={13} />
                      </span>
                    </div>
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
