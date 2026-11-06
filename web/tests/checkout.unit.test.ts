import { describe, expect, it } from 'vitest';
import {
  canContinueCheckout,
  REQUIRED_FIELDS,
  validateCheckout,
  type CheckoutField,
  type CheckoutForm,
} from '../src/checkout';

const validForm: CheckoutForm = {
  fullName: 'Ana Pérez',
  email: 'ana@example.com',
  cardNumber: '4111111111111111',
  expiry: '12/30',
  securityCode: '123',
};

const formWith = (field: CheckoutField, value: string): CheckoutForm => ({
  ...validForm,
  [field]: value,
});

describe('Checkout - test unitario', () => {
  it('WEB-UNIT-01 - informa todos los campos obligatorios', () => {
    const emptyForm: CheckoutForm = {
      fullName: '',
      email: '',
      cardNumber: '',
      expiry: '',
      securityCode: '',
    };

    const errors = validateCheckout(emptyForm);
    expect(Object.keys(errors)).toHaveLength(REQUIRED_FIELDS.length);
    for (const field of REQUIRED_FIELDS) {
      expect(errors[field]).toBe('Campo obligatorio');
    }
  });

  it.each([
    ['WEB-UNIT-02', 'fullName'],
    ['WEB-UNIT-03', 'email'],
    ['WEB-UNIT-04', 'cardNumber'],
    ['WEB-UNIT-05', 'expiry'],
    ['WEB-UNIT-06', 'securityCode'],
  ] as const)('%s - exige el campo %s', (_id, field) => {
    expect(validateCheckout(formWith(field, ''))[field]).toBe('Campo obligatorio');
  });

  it('WEB-UNIT-07 - trata como vacío un campo con solo espacios', () => {
    expect(validateCheckout(formWith('cardNumber', '   ')).cardNumber).toBe('Campo obligatorio');
  });

  it('WEB-UNIT-08 - rechaza un email sin formato válido', () => {
    expect(validateCheckout(formWith('email', 'ana-sin-arroba')).email).toBe('Email invalido');
  });

  it('WEB-UNIT-09 - rechaza un número de tarjeta demasiado corto', () => {
    expect(validateCheckout(formWith('cardNumber', '1234')).cardNumber).toBe('Numero de tarjeta invalido');
  });

  it('WEB-UNIT-10 - rechaza letras en el número de tarjeta', () => {
    expect(validateCheckout(formWith('cardNumber', '41111111111111AB')).cardNumber).toBe('Numero de tarjeta invalido');
  });

  it('WEB-UNIT-11 - acepta espacios separadores en el número de tarjeta', () => {
    expect(validateCheckout(formWith('cardNumber', '4111 1111 1111 1111')).cardNumber).toBeUndefined();
  });

  it('WEB-UNIT-12 - rechaza una fecha de vencimiento fuera del formato MM/AA', () => {
    expect(validateCheckout(formWith('expiry', '13/30')).expiry).toBe('Vencimiento invalido (MM/AA)');
  });

  it('WEB-UNIT-13 - rechaza un código de seguridad con menos de tres dígitos', () => {
    expect(validateCheckout(formWith('securityCode', '12')).securityCode).toBe('Codigo de seguridad invalido');
  });

  it('WEB-UNIT-14 - acepta un formulario completo con los formatos definidos', () => {
    expect(validateCheckout(validForm)).toEqual({});
    expect(canContinueCheckout(validForm)).toBe(true);
  });

  it('WEB-UNIT-15 - impide continuar si falta el número de tarjeta', () => {
    expect(canContinueCheckout(formWith('cardNumber', ''))).toBe(false);
  });

  it('WEB-UNIT-16 - no modifica los datos que recibe', () => {
    const form = formWith('cardNumber', '4111 1111 1111 1111');
    const snapshot = { ...form };
    validateCheckout(form);
    expect(form).toEqual(snapshot);
  });
});
