import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isToday, addMonths, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import CreatePlanModal from '../components/CreatePlanModal'

const PLAN_COLORS = ['#C4622D','#2D6E8E','#5C7A5E','#D4A827','#7C4F8E']

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [plans, setPlans] = useState([])
  const [showCreate, setShowCreate] = useState(false)
  const [selectedDate, setSelectedDate] = useState(null)
  const navigate = useNavigate()

  useEffect(() => { fetchPlans() }, [currentDate])

  async function fetchPlans() {
    const start = format(startOfMonth(currentDate), 'yyyy-MM-dd')
    const end = format(endOfMonth(currentDate), 'yyyy-MM-dd')
    const { data } = await supabase
      .from('plans')
      .select('*')
      .or(`start_date.gte.${start},end_date.lte.${end}`)
      .order('start_date')
    setPlans(data || [])
  }

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: calStart, end: calEnd })

  function getPlansForDay(day) {
    return plans.filter(p => {
      if (p.open_dates || !p.start_date) return false
      const start = new Date(p.start_date + 'T00:00:00')
      const end = new Date(p.end_date + 'T00:00:00')
      return day >= start && day <= end
    })
  }

  function handleDayClick(day) {
    setSelectedDate(day)
    setShowCreate(true)
  }

  const DAY_HEADERS = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom']

  return (
    <div>
      <div className="page-header page-header-row" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h2>Calendario</h2>
          <p>Visualiza todos los planes del grupo en el tiempo</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setSelectedDate(new Date()); setShowCreate(true) }}>
          <Plus size={16} /> Nuevo plan
        </button>
      </div>

      <div className="card">
        <div className="calendar-nav">
          <button className="btn btn-ghost btn-sm" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
            <ChevronLeft size={16} />
          </button>
          <h3>{format(currentDate, 'MMMM yyyy', { locale: es })}</h3>
          <button className="btn btn-ghost btn-sm" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="calendar-grid">
          {DAY_HEADERS.map(d => (
            <div key={d} className="calendar-day-header">{d}</div>
          ))}
          {days.map(day => {
            const dayPlans = getPlansForDay(day)
            return (
              <div
                key={day.toISOString()}
                className={`calendar-day ${!isSameMonth(day, currentDate) ? 'other-month' : ''} ${isToday(day) ? 'today' : ''} ${dayPlans.length > 0 ? 'has-plans' : ''}`}
                onClick={() => handleDayClick(day)}
              >
                <div className="day-num">{format(day, 'd')}</div>
                <div className="day-plans">
                  {dayPlans.slice(0, 3).map((plan, i) => (
                    <div
                      key={plan.id}
                      className="day-plan-chip"
                      style={{ background: PLAN_COLORS[plan.color_index || 0] }}
                      onClick={e => { e.stopPropagation(); navigate(`/plans/${plan.id}`) }}
                    >
                      {plan.title}
                    </div>
                  ))}
                  {dayPlans.length > 3 && <div style={{ fontSize: '0.68rem', color: 'var(--ink-light)', paddingLeft: 4 }}>+{dayPlans.length - 3} más</div>}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {showCreate && (
        <CreatePlanModal
          initialDate={selectedDate}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); fetchPlans() }}
        />
      )}
    </div>
  )
}
