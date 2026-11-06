
import { describe, it, expect } from 'vitest';
import {
  filtrarSedes,
  hayFiltrosActivos,
  type Sede
} from '../src/sedes';

const sedes: Sede[] = [
  { id: 1, nombre: 'Palermo Centro', localidad: 'CABA' },
  { id: 2, nombre: 'Palermo Norte', localidad: 'GBA' },
  { id: 3, nombre: 'Tigre', localidad: 'GBA' }
];

describe('Unit Testing - Sedes', () => {

  it('MOBILE-UNIT-001: filtrar sedes por nombre', () => {
    const resultado = filtrarSedes(sedes, {
      texto: 'Palermo',
      localidad: ''
    });

    expect(resultado).toHaveLength(2);
    expect(resultado.map(s => s.id)).toEqual([1, 2]);
  });

  it('MOBILE-UNIT-002: combinar busqueda y localidad', () => {
    const resultado = filtrarSedes(sedes, {
      texto: 'Palermo',
      localidad: 'CABA'
    });

    expect(resultado).toEqual([sedes[0]]);
  });

  it('MOBILE-UNIT-003: devolver lista vacia', () => {
    const resultado = filtrarSedes(sedes, {
      texto: 'Inexistente',
      localidad: ''
    });

    expect(resultado).toEqual([]);
  });

  it('MOBILE-UNIT-004: detectar filtros', () => {
    expect(hayFiltrosActivos({
      texto: 'Palermo',
      localidad: ''
    })).toBe(true);
  });

  it('MOBILE-UNIT-005: detectar sin filtros', () => {
    expect(hayFiltrosActivos({
      texto: '',
      localidad: ''
    })).toBe(false);
  });

  it('MOBILE-UNIT-006: ignorecase en busqueda', () => {
    const resultado = filtrarSedes(sedes, {
      texto: 'PALERMO',
      localidad: ''
    });

    expect(resultado).toHaveLength(2);
  });

});
