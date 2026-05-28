const AGUEDA_EMAIL = 'aguedacelma@gmail.com'
const COUPLE_EMAILS = ['daniellazar1614@gmail.com', 'aguedacelma@gmail.com']

export async function notifyPlanCreated(plan, allProfiles, isCouple) {
  const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID
  const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID
  const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY

  if (!serviceId || !templateId || !publicKey) return

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
  const dateStr = plan.open_dates
    ? 'Fechas por decidir'
    : `${plan.start_date} – ${plan.end_date}`

  await Promise.allSettled(
    emailsToNotify.map(email =>
      fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: serviceId,
          template_id: templateId,
          user_id: publicKey,
          template_params: {
            to_email: email,
            plan_title: plan.title,
            plan_emoji: plan.emoji || '✈️',
            plan_dates: dateStr,
            plan_description: plan.description || '',
            plan_url: planUrl,
          },
        }),
      })
    )
  )
}
