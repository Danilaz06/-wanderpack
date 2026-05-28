import { supabase } from './supabase'

const AGUEDA_EMAIL = 'aguedacelma@gmail.com'
const COUPLE_EMAILS = ['daniellazar1614@gmail.com', 'aguedacelma@gmail.com']

async function getAllEmails() {
  const { data } = await supabase.from('profiles').select('email')
  return (data || []).map(p => p.email).filter(Boolean)
}

async function sendEmail(templateId, toEmail, templateParams) {
  const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID
  const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY
  if (!serviceId || !publicKey || !templateId) return

  return fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service_id: serviceId,
      template_id: templateId,
      user_id: publicKey,
      template_params: { ...templateParams, to_email: toEmail },
    }),
  })
}

async function blast(templateId, emails, templateParams) {
  await Promise.allSettled(
    emails.map(email => sendEmail(templateId, email, templateParams))
  )
}

// Plan nuevo creado → todos excepto Agueda (o solo pareja si es plan privado)
export async function notifyPlanCreated(plan) {
  const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID
  if (!templateId) return

  const all = await getAllEmails()
  const emails = plan.is_couple
    ? COUPLE_EMAILS
    : all.filter(e => e !== AGUEDA_EMAIL)

  const planUrl = `https://wanderpack.vercel.app/plans/${plan.id}`
  const dateStr = plan.open_dates ? 'Fechas por decidir' : `${plan.start_date} – ${plan.end_date}`

  await blast(templateId, emails, {
    plan_title: plan.title,
    plan_emoji: plan.emoji || '✈️',
    plan_dates: dateStr,
    plan_description: plan.description || '',
    plan_url: planUrl,
  })
}

// Recordatorios admin:
//   remember → todos los usuarios excepto Agueda
//   soon     → TODOS sin excepcion (Agueda incluida)
export async function sendPlanReminder(plan, type) {
  const templateId = import.meta.env.VITE_EMAILJS_REMINDER_TEMPLATE_ID
  if (!templateId) return

  const all = await getAllEmails()

  let emails
  if (plan.is_couple) {
    emails = COUPLE_EMAILS
  } else if (type === 'soon') {
    emails = all
  } else {
    emails = all.filter(e => e !== AGUEDA_EMAIL)
  }

  const planUrl = `https://wanderpack.vercel.app/plans/${plan.id}`
  const dateStr = plan.open_dates ? 'Fechas por decidir' : `${plan.start_date} – ${plan.end_date}`

  const CONTENT = {
    remember: {
      subject: `📌 Recordatorio: ${plan.emoji || '✈️'} ${plan.title}`,
      message: `Este plan sigue en pie y necesita vuestra atención. Confirma tu disponibilidad y no os quedéis sin organizaros.`,
    },
    soon: {
      subject: `⏰ ¡Se acerca! ${plan.emoji || '✈️'} ${plan.title}`,
      message: `¡Quedan pocos días! Asegúrate de tenerlo todo listo y confirma que puedes venir.`,
    },
  }

  const { subject, message } = CONTENT[type]

  await blast(templateId, emails, {
    reminder_subject: subject,
    reminder_message: message,
    plan_title: plan.title,
    plan_emoji: plan.emoji || '✈️',
    plan_dates: dateStr,
    plan_url: planUrl,
  })
}
