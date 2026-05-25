import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import { Avatar } from '../components/Layout'
import { MapPin } from 'lucide-react'

const PLAN_COLORS = ['#C4622D','#2D6E8E','#5C7A5E','#D4A827','#7C4F8E']

export default function MembersPage() {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => { fetchMembers() }, [])

  async function fetchMembers() {
    setLoading(true)
    const { data: profiles } = await supabase.from('profiles').select('*').order('full_name')
    const { data: planMembers } = await supabase.from('plan_members').select('user_id, plan_id')
    const { data: plans } = await supabase.from('plans').select('id, title, emoji, color_index')
    const plansMap = {}
    plans?.forEach(p => { plansMap[p.id] = p })
    const enriched = profiles?.map(p => {
      const ids = planMembers?.filter(pm => pm.user_id === p.id).map(pm => pm.plan_id) || []
      return { ...p, plans: ids.map(id => plansMap[id]).filter(Boolean) }
    }) || []
    setMembers(enriched)
    setLoading(false)
  }

  return (
    <div>
      <div className="page-header">
        <h2>El grupo</h2>
        <p>{members.length} personas en la app</p>
      </div>
      {loading ? <div className="spinner" /> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {members.map(member => (
            <div key={member.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <Avatar profile={member} size="lg" />
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 700 }}>
                    {member.full_name || 'Sin nombre'}
                    {member.id === user?.id && (
                      <span style={{ fontSize: '0.7rem', background: 'var(--terracotta)', color: 'white', borderRadius: 99, padding: '2px 8px', marginLeft: 8, fontFamily: 'var(--font-body)', fontWeight: 600 }}>Tu</span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--ink-light)', marginTop: 2 }}>{member.email}</div>
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--ink-light)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                  Planes ({member.plans.length})
                </div>
                {member.plans.length === 0 ? (
                  <p style={{ fontSize: '0.82rem', color: 'var(--ink-light)', fontStyle: 'italic' }}>Sin planes</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {member.plans.map(plan => (
                      <div key={plan.id} onClick={() => navigate('/plans/' + plan.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: 'var(--sand)', borderRadius: 8, cursor: 'pointer', borderLeft: '3px solid ' + PLAN_COLORS[plan.color_index || 0] }}>
                        <span>{plan.emoji || '??'}</span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, flex: 1 }}>{plan.title}</span>
                        <MapPin size={12} color="var(--ink-light)" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
