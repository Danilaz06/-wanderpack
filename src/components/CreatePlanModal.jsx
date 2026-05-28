import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { format } from 'date-fns'
import { X } from 'lucide-react'
import { notifyPlanCreated } from '../lib/notifications'

const EMOJIS = ['✈️','🏝️','⛺','🏔️','🌊','🎿','🏄','🚂','🗺️','🏕️','🎭','🍕','🎉','🤿','🧗']
const COUPLE_EMOJIS = ['💑','💕','❤️','🌹','🥂','🏖️','🍷','🎬','🛁','🌙','✨','🎀','💌','🗺️','🏡']
const COLOR_HEX = ['#C4622D','#2D6E8E','#5C7A5E','#D4A827','#7C4F8E']

function getInitialMode(plan) {
  if (!plan) return 'range'
  if (plan.open_dates) return 'open'
  if (plan.start_date && plan.end_date && plan.start_date === plan.end_date) return 'single'
  return 'range'
}

export default function CreatePlanModal({ onClose, onCreated, initialDate, isCouple = false, plan = null }) {
  const { user } = useAuth()
  const isEdit = !!plan
  const defaultDate = initialDate ? format(initialDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')

  const [title, setTitle]           = useState(plan?.title || '')
  const [description, setDescription] = useState(plan?.description || '')
  const [dateMode, setDateMode]     = useState(getInitialMode(plan))
  const [startDate, setStartDate]   = useState(plan?.start_date || defaultDate)
  const [endDate, setEndDate]       = useState(plan?.end_date || defaultDate)
  const [startTime, setStartTime]   = useState(plan?.start_time?.slice(0, 5) || '')
  const [endTime, setEndTime]       = useState(plan?.end_time?.slice(0, 5) || '')
  const [emoji, setEmoji]           = useState(plan?.emoji || (isCouple ? '💑' : '✈️'))
  const [colorIdx, setColorIdx]     = useState(plan?.color_index ?? 0)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')

  const emojiList   = isCouple ? COUPLE_EMOJIS : EMOJIS
  const accentColor = isCouple ? '#E8507A' : 'var(--terracotta)'

  const MODE_OPTIONS = [
    { key: 'range',  label: 'Rango de días' },
    { key: 'single', label: 'Día concreto' },
    { key: 'open',   label: 'Por decidir' },
  ]

  async function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim()) return
    setLoading(true); setError('')

    const planData = {
      title:       title.trim(),
      description: description.trim(),
      emoji,
      color_index: colorIdx,
      is_couple:   isCouple,
      open_dates:  dateMode === 'open',
      start_date:  dateMode !== 'open' ? startDate : null,
      end_date:    dateMode === 'single' ? startDate : (dateMode === 'range' ? endDate : null),
      start_time:  dateMode === 'single' && startTime ? startTime : null,
      end_time:    dateMode === 'single' && endTime ? endTime : null,
    }

    if (isEdit) {
      const { error: err } = await supabase.from('plans').update(planData).eq('id', plan.id)
      if (err) { setError(err.message); setLoading(false); return }
      setLoading(false)
      onCreated({ ...plan, ...planData })
    } else {
      const { data: newPlan, error: err } = await supabase
        .from('plans')
        .insert({ ...planData, created_by: user.id })
        .select()
        .single()
      if (err) { setError(err.message); setLoading(false); return }

      await supabase.from('plan_members').insert({ plan_id: newPlan.id, user_id: user.id })
      if (dateMode !== 'open') {
        await supabase.from('availability').insert({ plan_id: newPlan.id, user_id: user.id, status: 'yes' })
      }

      notifyPlanCreated(newPlan).catch(() => {})
      setLoading(false)
      onCreated(newPlan)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>
            {isEdit ? 'Editar plan' : (isCouple ? '💑 Nuevo plan nuestro' : 'Nuevo plan')}
          </h3>
          <button className="close-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <form className="modal-body" onSubmit={handleSubmit}>
          {error && <div className="error-msg">{error}</div>}

          {/* Título + emoji */}
          <div style={{ display: 'flex', gap: 12 }}>
            <div className="input-group" style={{ flex: 1 }}>
              <label>Nombre del plan</label>
              <input
                className="input"
                placeholder={isCouple ? 'Ej: Escapada romántica' : 'Ej: Ruta por Italia'}
                value={title}
                onChange={e => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="input-group" style={{ width: 80 }}>
              <label>Emoji</label>
              <select className="input" value={emoji} onChange={e => setEmoji(e.target.value)} style={{ fontSize: '1.2rem' }}>
                {emojiList.map(em => <option key={em} value={em}>{em}</option>)}
              </select>
            </div>
          </div>

          {/* Descripción */}
          <div className="input-group">
            <label>Descripcion (opcional)</label>
            <textarea
              className="input"
              placeholder="Añade algunos detalles..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          {/* Modo de fecha */}
          <div className="input-group">
            <label>Cuándo</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {MODE_OPTIONS.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setDateMode(key)}
                  style={{
                    flex: 1,
                    padding: '8px 4px',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    borderRadius: 8,
                    border: dateMode === key ? `1.5px solid ${accentColor}` : '1.5px solid var(--border)',
                    background: dateMode === key ? `${accentColor}18` : 'var(--sand)',
                    color: dateMode === key ? accentColor : 'var(--ink-light)',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Rango de días */}
          {dateMode === 'range' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="input-group">
                <label>Fecha inicio</label>
                <input
                  className="input"
                  type="date"
                  value={startDate}
                  onChange={e => { setStartDate(e.target.value); if (e.target.value > endDate) setEndDate(e.target.value) }}
                  required
                />
              </div>
              <div className="input-group">
                <label>Fecha fin</label>
                <input
                  className="input"
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={e => setEndDate(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          {/* Día concreto + horas opcionales */}
          {dateMode === 'single' && (
            <>
              <div className="input-group">
                <label>Fecha</label>
                <input
                  className="input"
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  required
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="input-group">
                  <label>Hora inicio (opcional)</label>
                  <input
                    className="input"
                    type="time"
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                  />
                </div>
                <div className="input-group">
                  <label>Hora fin (opcional)</label>
                  <input
                    className="input"
                    type="time"
                    value={endTime}
                    min={startTime}
                    onChange={e => setEndTime(e.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          {/* Abierto */}
          {dateMode === 'open' && (
            <div style={{ padding: '10px 14px', background: 'var(--sand)', borderRadius: 8, fontSize: '0.83rem', color: 'var(--ink-light)' }}>
              El plan se lanza sin fecha — decidís cuándo hacerlo después
            </div>
          )}

          {/* Color */}
          <div className="input-group">
            <label>Color</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {COLOR_HEX.map((hex, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setColorIdx(i)}
                  style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: hex, border: 'none', cursor: 'pointer',
                    outline: colorIdx === i ? '3px solid ' + hex : 'none',
                    outlineOffset: 2,
                    transform: colorIdx === i ? 'scale(1.15)' : 'scale(1)',
                    transition: 'all 0.15s',
                  }}
                />
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
            <button
              className="btn btn-primary"
              type="submit"
              disabled={loading || !title.trim()}
              style={isCouple ? { background: accentColor } : {}}
            >
              {loading ? (isEdit ? 'Guardando...' : 'Creando...') : (isEdit ? 'Guardar cambios' : 'Crear plan')}
            </button>
            <button className="btn btn-ghost" type="button" onClick={onClose}>Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  )
}
