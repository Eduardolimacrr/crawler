import { test, expect } from '@playwright/test';

test('Acessando a pagina do playwright', async ({ page }) => {
    await page.goto('https://playwright.dev');
    await expect(page.getByText('Get started')).toBeVisible();  //// forma de buscar texto em uma pagina
})