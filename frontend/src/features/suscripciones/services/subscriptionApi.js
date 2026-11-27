/**
 * Servicio de API para gestión de suscripciones y pagos con Stripe.
 */
export const createSubscriptionApi = (fetchConAuth) => ({
  verifyCheckoutSession: (sessionId) =>
    fetchConAuth('/verify-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId })
    }),

  getSubscription: () =>
    fetchConAuth('/subscription'),

  createCheckoutSession: () =>
    fetchConAuth('/create-checkout-session', {
      method: 'POST'
    }),

  cancelSubscription: () =>
    fetchConAuth('/cancel-subscription', {
      method: 'POST'
    })
});
