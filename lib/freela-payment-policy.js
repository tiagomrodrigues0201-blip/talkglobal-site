// The list comes from this merchant's official /v1/payment_methods endpoint.
// Never send invented type IDs in a Checkout Pro preference. Account balance
// cannot be excluded by the Preferences API, so valid balance payments must deliver.
export const CARD_TYPES = new Set(['credit_card', 'debit_card', 'prepaid_card']);
export function supportedPayment(payment) {
  return payment?.payment_method_id === 'pix'
    || CARD_TYPES.has(payment?.payment_type_id)
    || payment?.payment_type_id === 'account_money';
}
export function checkoutPaymentMethods(methods) {
  if (!Array.isArray(methods) || !methods.length) throw Error('Payment methods unavailable');
  const excluded = methods.filter(method => typeof method.id === 'string'
    && method.id !== 'pix' && method.id !== 'account_money'
    && !CARD_TYPES.has(method.payment_type_id) && method.payment_type_id !== 'account_money');
  return { excluded_payment_methods: [...new Set(excluded.map(method => method.id))].map(id => ({ id })) };
}
