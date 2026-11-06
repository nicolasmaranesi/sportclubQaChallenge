import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { SportClubLandingPage } from '../src/pages/sportclub-landing.page';
import { SportClubCheckoutPage } from '../src/pages/sportclub.checkout.page';

/** Adjunta una captura por escenario exitoso al reporte HTML y test-results. */
async function adjuntarEvidencia(
  page: Page,
  testInfo: TestInfo,
  nombre: string,
): Promise<void> {
  await testInfo.attach(nombre, {
    body: await page.screenshot({ animations: 'disabled', fullPage: false }),
    contentType: 'image/png',
  });
}

test.describe('SportClub | E2E públicos de navegación (sin pagos)', () => {
  test('WEB-E2E-01 | Landing → Asociate → Total Mensual → checkout paso 2',
    async ({ page }, testInfo) => {
      const landing = new SportClubLandingPage(page);

      await test.step('WEB-MANUAL-1: abrir landing', async () => {
        await landing.abrirLanding();
      });
      await test.step('WEB-MANUAL-2: banner Asociate lleva a planes', async () => {
        await landing.navegarDesdeBannerAPlanes();
      });
      await test.step('WEB-MANUAL-3: seleccionar Total Mensual', async () => {
        await landing.seleccionarPlanTotalMensual();
      });
      await adjuntarEvidencia(page, testInfo, '01-plan-total-mensual');

      let checkoutPage = page;
      await test.step('WEB-MANUAL-4: abrir checkout sin completar formularios', async () => {
        checkoutPage = await landing.abrirCheckoutDelPlan();
      });
      await test.step('Validar URL, formulario y plan seleccionado', async () => {
        const checkout = new SportClubCheckoutPage(checkoutPage);
        await checkout.validarPasoDosYPlanSeleccionado();
      });
      await adjuntarEvidencia(checkoutPage, testInfo, '02-checkout-paso2');
    });

  test('WEB-E2E-02 | Cambiar Mensual → Anual → Mensual',
    async ({ page }, testInfo) => {
      const landing = new SportClubLandingPage(page);
      await landing.abrirLanding();

      await test.step('Seleccionar planes mensuales', async () => {
        await landing.seleccionarModalidad('Mensual');
        await adjuntarEvidencia(page, testInfo, '01-modalidad-mensual');
      });
      await test.step('Cambiar a planes anuales y validar rótulo', async () => {
        await landing.seleccionarModalidad('Anual');
        await adjuntarEvidencia(page, testInfo, '02-modalidad-anual');
      });
      await test.step('Volver a Mensual y validar restauración', async () => {
        await landing.seleccionarModalidad('Mensual');
        await adjuntarEvidencia(page, testInfo, '03-regreso-mensual');
      });
    });

  test('WEB-E2E-03 | Catálogo mensual Plus, Flex y Total',
    async ({ page }, testInfo) => {
      const landing = new SportClubLandingPage(page);
      await landing.abrirLanding();
      await test.step('Validar los tres planes y sus CTAs', async () => {
        await landing.validarCatalogoMensual();
      });
      await adjuntarEvidencia(page, testInfo, 'catalogo-planes-mensuales');
    });

  test('WEB-E2E-04 | Resolución móvil: planes y asociación disponibles',
    async ({ page }, testInfo) => {
      await page.setViewportSize({ width: 390, height: 844 });
      const landing = new SportClubLandingPage(page);
      await landing.abrirLanding();

      await test.step('Sección de planes visible en móvil', async () => {
        await landing.headingPlanes.scrollIntoViewIfNeeded();
        await expect(landing.headingPlanes).toBeInViewport({ ratio: 0.1 });
      });
      await test.step('Se puede consultar el Plan Total Mensual', async () => {
        await landing.seleccionarPlanTotalMensual();
        await expect(landing.asociatePlanTotalMensual).toBeVisible();
      });
      await adjuntarEvidencia(page, testInfo, 'landing-390x844-planes');
    });
});
