import { expect, test } from '@playwright/test';
import KabumPage from '../support/pages/KabumPage';

const homeUrl = 'https://www.kabum.com.br/';

function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

async function getVisibleProductPrices(
  kabumPage: KabumPage,
  limit: number
): Promise<number[]> {
  const cards = kabumPage.kabumElements.getProductCards();
  const cardCount = Math.min(await cards.count(), limit);
  const prices: number[] = [];

  for (let index = 0; index < cardCount; index += 1) {
    const card = cards.nth(index);
    const priceArea = card
      .locator(':scope > div')
      .filter({ hasText: 'No PIX' })
      .first();
    const priceText = await priceArea.innerText();
    const cashPrices =
      priceText.split('No PIX')[0].match(/R\$\s*[\d.]+,\d{2}/g) ?? [];
    const currentPrice = cashPrices[cashPrices.length - 1]?.replace(
      /^R\$\s*/,
      ''
    );

    if (currentPrice) {
      prices.push(Number(currentPrice.replace(/\./g, '').replace(',', '.')));
    }
  }

  return prices;
}

test.describe('KaBuM! E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(homeUrl, { waitUntil: 'domcontentloaded' });
  });

  test('1. deve carregar a página inicial da KaBuM!', async ({ page }) => {
    const kabumPage = new KabumPage(page);

    await expect(page).toHaveURL(homeUrl);
    await expect(page).toHaveTitle(/KaBuM! \| Ofertas em Tech e Gamer\?/i);
    await expect(kabumPage.kabumElements.getSearchField()).toBeVisible();
  });

  test('2. deve pesquisar mouse gamer e exibir produtos', async ({ page }) => {
    const kabumPage = new KabumPage(page);

    await kabumPage.searchProducts('mouse gamer');

    await expect(page).toHaveURL(/\/busca\/mouse-gamer/);
    await expect(kabumPage.kabumElements.getSearchHeading()).toHaveText(
      /mouse gamer/i
    );

    const product = await kabumPage.findProductCardWithName(/mouse/i);
    await expect(product.card).toBeVisible();
    expect(product.name).not.toBe('');
  });

  test('3. deve abrir um produto identificado no card de mouse gamer', async ({
    page
  }) => {
    const kabumPage = new KabumPage(page);

    await kabumPage.searchProducts('mouse gamer');

    const product = await kabumPage.findProductCardWithName(/mouse/i);
    expect(product.name).not.toBe('');
    expect(product.href).toMatch(/^\/produto\/\d+\/[^?#]+/);
    await expect(product.card).toBeVisible();

    await product.card.click();

    await expect(page).toHaveURL(/\/produto\/\d+\//);
    const detailHeading = kabumPage.kabumElements.getSearchHeading();
    await expect(detailHeading).toBeVisible();
    expect(normalizeText(await detailHeading.innerText())).toBe(
      normalizeText(product.name)
    );
  });

  test('4. deve pesquisar processador e exibir produtos da categoria', async ({
    page
  }) => {
    const kabumPage = new KabumPage(page);

    await kabumPage.searchProducts('processador');

    await expect(page).toHaveURL(
      /\/(busca\/processador|hardware\/processadores)/
    );
    await expect(kabumPage.kabumElements.getSearchHeading()).toContainText(
      /processador/i
    );
    await expect(
      kabumPage.kabumElements.getProductCards().first()
    ).toBeVisible();

    const product = await kabumPage.findProductCardWithName(/processador/i);
    expect(product.name).toMatch(/processador/i);
  });

  test('5. deve pesquisar monitor gamer e obter o nome do card', async ({
    page
  }) => {
    const kabumPage = new KabumPage(page);

    await kabumPage.searchProducts('monitor gamer');

    await expect(page).toHaveURL(/\/busca\/monitor-gamer/);
    await expect(kabumPage.kabumElements.getSearchHeading()).toHaveText(
      /monitor gamer/i
    );

    const product = await kabumPage.findProductCardWithName(/monitor/i);
    await expect(product.card).toBeVisible();
    expect(product.name).toMatch(/monitor/i);
  });

  test('6. deve pesquisar teclado mecânico preservando a busca acentuada', async ({
    page
  }) => {
    const kabumPage = new KabumPage(page);

    await kabumPage.searchProducts('teclado mecânico');

    await expect(page).toHaveURL(/\/busca\/teclado/);
    await expect(kabumPage.kabumElements.getSearchHeading()).toHaveText(
      /teclado mec.nico/i
    );

    const product =
      await kabumPage.findProductCardWithName(/teclado|mec.nico/i);
    expect(normalizeText(product.name)).toMatch(/teclado|mecanico/i);
  });

  test('7. deve abrir a área de cupons e exibir uma promoção identificável', async ({
    page
  }) => {
    const kabumPage = new KabumPage(page);
    const couponHref = await kabumPage.kabumElements
      .getCouponMenuLink()
      .getAttribute('href');

    if (couponHref === null) {
      throw new Error('O link de cupons do menu não possui um destino.');
    }

    expect(couponHref).toBe('/hotsite/cupons');
    await page.goto(new URL(couponHref, homeUrl).toString(), {
      waitUntil: 'domcontentloaded'
    });

    await expect(page).toHaveURL(/\/hotsite\/cupons\/?/);
    await expect(page).toHaveTitle(/cupons.*KaBuM!/i);
    await expect(kabumPage.kabumElements.getSearchHeading()).toContainText(
      /cupom/i
    );

    const couponCode = kabumPage.kabumElements.getCouponCodes().first();
    await expect(couponCode).toBeVisible();
    await expect(couponCode).toHaveText(/^[A-Z][A-Z0-9]{4,}$/);
  });


  test('8. deve aplicar o filtro de ofertas', async ({ page }) => {
    const kabumPage = new KabumPage(page);

    await kabumPage.searchProducts('mouse gamer');

    const productCards = kabumPage.kabumElements.getProductCards();
    const beforeFiltering = (
      await productCards.evaluateAll(cards =>
        cards.slice(0, 5).map(card => (card as HTMLAnchorElement).href)
      )
    ).join('|');
    const offerFilter = kabumPage.kabumElements.getOfferFilter();

    await expect(offerFilter).toBeVisible();
    await expect(offerFilter).toBeEnabled();
    await offerFilter.check();
    await expect(offerFilter).toBeChecked();
    await expect
      .poll(
        async () =>
          (
            await productCards.evaluateAll(cards =>
              cards.slice(0, 5).map(card => (card as HTMLAnchorElement).href)
            )
          ).join('|'),
        { message: 'A aplicação do filtro deve alterar os produtos exibidos.' }
      )
      .not.toBe(beforeFiltering);
  });

  test('9. deve apresentar o fallback atual para uma busca sem correspondência', async ({
    page
  }) => {
    const kabumPage = new KabumPage(page);
    const query = 'zzzxqv-produto-inexistente-2026';

    await kabumPage.searchProducts(query);

    await expect(page).toHaveURL(/\/busca\/zzzxqv-produto-inexistente-2026/);
    await expect(kabumPage.kabumElements.getSearchHeading()).toHaveText(
      /zzzxqv produto inexistente 2026/i
    );

    const product = await kabumPage.findProductCardWithName();
    await expect(product.card).toBeVisible();
    expect(product.name).not.toBe('');
    expect(normalizeText(product.name)).not.toContain('zzzxqv');
  });
});
