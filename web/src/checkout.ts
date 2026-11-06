
export type CheckoutField =
  | 'fullName'
  | 'email'
  | 'cardNumber'
  | 'expiry'
  | 'securityCode';

export type CheckoutForm = Record<CheckoutField, string>;
export type CheckoutErrors = Partial<Record<CheckoutField, string>>;

export const REQUIRED_FIELDS: readonly CheckoutField[] = [
  'fullName',
  'email',
  'cardNumber',
  'expiry',
  'securityCode',
];

export function validateCheckout(form: CheckoutForm): CheckoutErrors {
  const errors: CheckoutErrors = {};

  for (const field of REQUIRED_FIELDS) {
    if (!form[field].trim()) {
      errors[field] = 'Campo obligatorio';
    }
  }

  if (!errors.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = 'Email invalido';
  }

  const cardNumber = form.cardNumber.replace(/\s/g, '');
  if (!errors.cardNumber && !/^\d{13,19}$/.test(cardNumber)) {
    errors.cardNumber = 'Numero de tarjeta invalido';
  }

  if (!errors.expiry && !/^(0[1-9]|1[0-2])\/\d{2}$/.test(form.expiry.trim())) {
    errors.expiry = 'Vencimiento invalido (MM/AA)';
  }

  if (!errors.securityCode && !/^\d{3,4}$/.test(form.securityCode.trim())) {
    errors.securityCode = 'Codigo de seguridad invalido';
  }

  return errors;
}

export function canContinueCheckout(form: CheckoutForm): boolean {
  return Object.keys(validateCheckout(form)).length === 0;
}
