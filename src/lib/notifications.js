const AGUEDA_EMAIL = 'aguedacelma@gmail.com'
const COUPLE_EMAILS = ['daniellazar1614@gmail.com', 'aguedacelma@gmail.com']

async function sendEmail(templateId, templateParams) {
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
      template_params: templateParams,
    }),
  })
}

export async function notifyPlanCreated(plan, allProfiles, isCouple) {
  const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID
  if (!templateId) return

  let emailsToNotify
  if (isCouple) {
    emailsToNotify = COUPLE_EMAILS
  } else {
    emailsToNotify = (allProfiles || [])
      .map(p => p.email)
      .filter(e => e && e !== AGUEDA_EMAIL)
  }

  if (!emailsToNotify.length) return

  const planUrl = `https://wanderpack.vercel.app/plans/${plan.id}`
  const dateStr = plan.open_dates ? 'Fechas por decidir' : `${plan.start_date} – ${plan.end_date}`

  await Promise.allSettled(
    emailsToNotify.map(email =>
      sendEmail(templateId, {
        to_email: email,
        plan_title: plan.title,
        plan_emoji: plan.emoji || '✈️',
        plan_dates: dateStr,
        plan_description: plan.description || '',
        plan_url: planUrl,
      })
    )
  )
}

export async function sendPlanReminder(plan, memberEmails, type) {
  const templateId = import.meta.env.VITE_EMAILJS_REMINDER_TEMPLATE_ID
  if (!templateId) return

  const emailsToNotify = (memberEmails || []).filter(e =>
    e && (plan.is_couple || e !== AGUEDA_EMAIL)
  )
  if (!emailsToNotify.length) return

  const planUrl = `https://wanderpack.vercel.app/plans/${plan.id}`
  const dateStr = plan.open_dates ? 'Fechas por decidir' : `${plan.start_date} – ${plan.end_date}`

  const REMINDER_CONTENT = {
    remember: {
      subject: `📌 Recordatorio: ${plan.emoji || '✈️'} ${plan.title}`,
      message: `Este plan sigue en pie y necesita vuestra atención. Confirma tu disponibilidad y no os quedéis sin organizaros.`,
    },
    soon: {
      subject: `⏰ ¡Se acerca! ${plan.emoji || '✈️'} ${plan.title}`,
      message: `¡Quedan pocos días! Asegúrate de tenerlo todo listo y confirma que puedes venir.`,
    },
  }

  const content = REMINDER_CONTENT[type]

  await Promise.allSettled(
    emailsToNotify.map(email =>
      sendEmail(templateId, {
        to_email: email,
        reminder_subject: content.subject,
        reminder_message: content.message,
        plan_title: plan.title,
        plan_emoji: plan.emoji || '✈️',
        plan_dates: dateStr,
        plan_url: planUrl,
      })
    )
  )
}
