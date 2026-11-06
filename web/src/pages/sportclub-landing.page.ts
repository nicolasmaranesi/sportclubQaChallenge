import { expect, type Locator, type Page } from '@playwright/test';

export type ModalidadPlan = 'Mensual' | 'Anual';
export type NombrePlan = 'Plus' | 'Flex' | 'Total';


export class SportClubLandingPage {
  readonly headingPlanes: Locator;
  readonly opcionMensual: Locator;
  readonly opcionAnual: Locator;
  readonly nombrePlanTotal: Locator;
  readonly asociatePlanTotalMensual: Locator;

  constructor(readonly page: Page) {
    this.headingPlanes = page.getByRole('heading', {
      name: /eleg[ií]\s+tu\s+plan/i,
    });
    this.opcionMensual = page.getByRole('button', { name: /^mensual$/i });
    this.opcionAnual = page.getByRole('button', { name: /^anual$/i });
    this.nombrePlanTotal = page.getByRole('heading', { name: /^plan total$/i });
    this.asociatePlanTotalMensual = this.ctaAsociateDePlan('Total');
  }

  private headingPlan(plan: NombrePlan): Locator {
    return this.page.getByRole('heading', {
      name: new RegExp(`^plan\\s+${plan}$`, 'i'),
    });
  }


  tarjetaDePlan(plan: NombrePlan): Locator {
    return this.headingPlan(plan).locator(
      'xpath=ancestor::*[' +
        './/*[self::a or self::button]' +
        '[contains(translate(normalize-space(.),' +
        '"abcdefghijklmnopqrstuvwxyz",' +
        '"ABCDEFGHIJKLMNOPQRSTUVWXYZ"),"ASOCIATE")]' +
      '][1]',
    );
  }

  ctaAsociateDePlan(plan: NombrePlan): Locator {
    const tarjeta = this.tarjetaDePlan(plan);
    return tarjeta
      .getByRole('link', { name: /^asociate$/i })
      .or(tarjeta.getByRole('button', { name: /^asociate$/i }))
      .first();
  }

  async abrirLanding(): Promise<void> {
    const response = await this.page.goto('/');
    expect(response, 'La landing debe responder a la navegación').not.toBeNull();
    expect(response!.ok(), 'La landing debe devolver status 2xx').toBeTruthy();
    await expect(this.headingPlanes).toBeVisible();
  }

  async navegarDesdeBannerAPlanes(): Promise<void> {
    const banner = this.page.getByRole('link', { name: /^asociate$/i }).first();
    await expect(banner).toBeVisible();
    await banner.click();
    await expect(this.headingPlanes).toBeInViewport({ ratio: 0.1 });
  }

  async seleccionarModalidad(modalidad: ModalidadPlan): Promise<void> {
    const opcion = modalidad === 'Mensual' ? this.opcionMensual : this.opcionAnual;
    await expect(opcion).toBeVisible();
    await opcion.click();
    await expect(this.nombrePlanTotal).toBeVisible();
    // El sitio identifica el tipo de plan con un rótulo dentro de la tarjeta.
    await expect(
      this.tarjetaDePlan('Total').getByText(new RegExp(`^${modalidad}$`, 'i')).first(),
    ).toBeVisible();
  }

  async seleccionarPlanTotalMensual(): Promise<void> {
    await this.seleccionarModalidad('Mensual');
    await expect(this.asociatePlanTotalMensual).toBeVisible();
    await expect(this.asociatePlanTotalMensual).toBeEnabled();
  }

  async validarCatalogoMensual(): Promise<void> {
    await this.seleccionarModalidad('Mensual');
    for (const plan of ['Plus', 'Flex', 'Total'] as const) {
      await expect(this.headingPlan(plan), `Debe mostrarse Plan ${plan}`).toBeVisible();
      const tarjeta = this.tarjetaDePlan(plan);
      await expect(tarjeta.getByText(/^mensual$/i).first()).toBeVisible();
      await expect(this.ctaAsociateDePlan(plan)).toBeVisible();
      await expect(this.ctaAsociateDePlan(plan)).toBeEnabled();
    }
  }

  async abrirCheckoutDelPlan(): Promise<Page> {
    const target = await this.asociatePlanTotalMensual.getAttribute('target');
    if (target === '_blank') {
      const [popup] = await Promise.all([
        this.page.waitForEvent('popup'),
        this.asociatePlanTotalMensual.click(),
      ]);
      await popup.waitForLoadState('domcontentloaded');
      return popup;
    }
    await this.asociatePlanTotalMensual.click();
    return this.page;
  }
}
