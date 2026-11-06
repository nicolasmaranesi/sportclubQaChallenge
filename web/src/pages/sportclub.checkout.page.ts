import { expect, type Page } from '@playwright/test';

export class SportClubCheckoutPage {
  constructor(private readonly page: Page) {}

  async validarPasoDosYPlanSeleccionado(): Promise<void> {

    await expect(this.page).toHaveURL(
      /^https:\/\/checkout\.sportclub\.com\.ar\/paso2\/promocion-plan-total-mensual-ecommerce(?:[/?#]|$)/i,
      { timeout: 40_000 },
    );

    await expect(this.page.getByRole('textbox').first()).toBeVisible({
      timeout: 15_000,
    });


    await expect(
      this.page.getByText(/plan\s*total|total\s*mensual/i).first(),
      'El checkout debe identificar el Plan Total seleccionado',
    ).toBeVisible({ timeout: 15_000 });
  }
}
