import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { format } from 'date-fns'
import { X } from 'lucide-react'

const EMOJIS = ['✈️','🏝️','⛺','🏔️','🌊','🎿','🏄','🚂','🗺️','🏕️','🎭','🍕','🎉','🤿','🧗']
const COLOR_HEX = ['#C4622D','#2D6E8E','#5C7A5E','#D4A827','#7C4F8E']

export default function CreatePlanModal({ onClose, onCreated, initialDate }) {
  const { user } = useAuth()
  const defaultDate = initialDate ? format(initialDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [openDates, setOpenDates] = useState(false)
  const [startDate, setStartDate] = useState(defaultDate)
  const [endDate, setEndDate] = useState(defaultDate)
  const [emoji, setEmoji] = useState('✈️')
  const [colorIdx, setColorIdx] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate(e) {
    e.preventDefault()
    if (!title.trim()) return
    setLoading(true); setError('')
    const insertData = {
      title: title.trim(),
      description: description.trim(),
      emoji,
      color_index: colorIdx,
      created_by: user.id,
      open_dates: openDates,
      start_date: openDates ? null : startDate,
      end_date: openDates ? null : endDate,
    }
    const { data: plan, error: err } = await supabase
      .from('plans')
      .insert(insertData)
      .select()
      .single()
    if (err) { setError(err.message); setLoading(false); return }
    await supabase.from('plan_members').insert({ plan_id: plan.id, user_id: user.id })
    if (!openDates) {
      await supabase.from('availability').insert({ plan_id: plan.id, user_id: user.id, status: 'yes' })
    }
    setLoading(false)
    onCreated(plan)
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>Nuevo plan</h3>
          <button className="close-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <form className="modal-body" onSubmit={handleCreate}>
          {error && <div className="error-msg">{error}</div>}

          <div style={{ display: 'flex', gap: 12 }}>
            <div className="input-group" style={{ flex: 1 }}>
              <label>Nombre del plan</label>
              <input className="input" placeholder="Ej: Ruta por Italia" value={title} onChange={e => setTitle(e.target.value)} required />
            </div>
            <div className="input-group" style={{ width: 80 }}>
              <label>Emoji</label>
              <select className="input" value={emoji} onChange={e => setEmoji(e.target.value)} style={{ fontSize: '1.2rem' }}>
                {EMOJIS.map(em => <option key={em} value={em}>{em}</option>)}
              </select>
            </div>
          </div>

          <div className="input-group">
            <label>Descripcion (opcional)</label>
            <textarea className="input" placeholder="Añade algunos detalles..." value={description} onChange={e => setDescription(e.target.value)} rows={2} />
          </div>

          {/* Toggle fechas abiertas */}
          <div
            onClick={() => setOpenDates(!openDates)}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 14px',
              background: openDates ? 'rgba(196,98,45,0.08)' : 'var(--sand)',
              border: openDates ? '1.5px solid var(--terracotta)' : '1.5px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              transition: 'all 0.18s'
            }}
          >
            <div style={{
              width: 20, height: 20, borderRadius: 4,
              background: openDates ? 'var(--terracotta)' : 'transparent',
              border: openDates ? 'none' : '2px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, transition: 'all 0.15s'
            }}>
              {openDates && <span style={{ color: 'white', fontSize: '0.75rem', fontWeight: 700 }}>✓</span>}
            </div>
            <div>
              <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>Fechas por decidir</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--ink-light)', marginTop: 2 }}>
                Lanzar el plan sin fecha — el grupo propone y vota cuando hacerlo
              </div>
            </div>
          </div>

          {!openDates && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="input-group">
                <label>Fecha inicio</label>
                <input className="input" type="date" value={startDate} onChange={e => { setStartDate(e.target.value); if (e.target.value > endDate) setEndDate(e.target.value) }} required />
              </div>
              <div className="input-group">
                <label>Fecha fin</label>
                <input className="input" type="date" value={endDate} min={startDate} onChange={e => setEndDate(e.target.value)} required />
              </div>
            </div>
          )}

          <div className="input-group">
            <label>Color</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {COLOR_HEX.map((hex, i) => (
                <button key={i} type="button" onClick={() => setColorIdx(i)}
                  style={{ width: 32, height: 32, borderRadius: '50%', background: hex, border: 'none', cursor: 'pointer', outline: colorIdx === i ? '3px solid ' + hex : 'none', outlineOffset: 2, transform: colorIdx === i ? 'scale(1.15)' : 'scale(1)', transition: 'all 0.15s' }}
                />
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
            <button className="btn btn-primary" type="submit" disabled={loading || !title.trim()}>
              {loading ? 'Creando...' : 'Crear plan'}
            </button>
            <button className="btn btn-ghost" type="button" onClick={onClose}>Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  )
}
