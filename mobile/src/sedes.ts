
export interface Sede {
  id: number;
  nombre: string;
  localidad: string;
}

export interface FiltrosSedes {
  texto: string;
  localidad: string;
}

export function filtrarSedes(
  sedes: Sede[],
  filtros: FiltrosSedes
): Sede[] {
  const texto = filtros.texto.trim().toLowerCase();
  const localidad = filtros.localidad.trim().toLowerCase();

  return sedes.filter(sede => {
    const coincideTexto = sede.nombre.toLowerCase().includes(texto);

    const coincideLocalidad = !localidad || sede.localidad.toLowerCase() === localidad;
    return coincideTexto && coincideLocalidad;
  });
}

export function hayFiltrosActivos(
  filtros: FiltrosSedes
): boolean {
  return Boolean(
    filtros.texto.trim() || filtros.localidad.trim()
  );
}

export interface RepositorioSedes {
  obtenerSedes(): Promise<Sede[]>;
}

export interface VistaSedes {
  mostrarResultados(sedes: Sede[]): void;
  mostrarAccionLimpiar(visible: boolean): void;
  desplazarListadoAlInicio(): void;
}

export class ControladorSedes {
  private filtros: FiltrosSedes = {
    texto: '',
    localidad: ''
  };

  constructor(
    private repositorio: RepositorioSedes,
    private vista: VistaSedes
  ) {}

  async buscar(texto: string): Promise<void> {
    this.filtros.texto = texto;
    await this.actualizarResultados();
  }

  async filtrarLocalidad(localidad: string): Promise<void> {
    this.filtros.localidad = localidad;
    await this.actualizarResultados();
  }

  async limpiarFiltros(): Promise<void> {
    this.filtros = { texto: '', localidad: '' };
    await this.actualizarResultados();
  }

  private async actualizarResultados(): Promise<void> {
    const sedes = await this.repositorio.obtenerSedes();
    const resultados = filtrarSedes(sedes, this.filtros);

    this.vista.mostrarResultados(resultados);
    this.vista.mostrarAccionLimpiar(
      hayFiltrosActivos(this.filtros)
    );
    this.vista.desplazarListadoAlInicio();
  }
}
