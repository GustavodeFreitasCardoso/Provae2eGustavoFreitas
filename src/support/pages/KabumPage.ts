import { expect, Locator, Page } from '@playwright/test';
import BasePage from './BasePage';
import KabumElements from '../elements/KabumElements';

export default class KabumPage extends BasePage {
  readonly kabumElements: KabumElements;

  constructor(readonly page: Page) {
    super(page);
    this.page = page;
    this.kabumElements = new KabumElements(page);
  }

  async searchProducts(query: string): Promise<void> {
    await this.dismissBlockingDialogs();

    const searchField = this.kabumElements.getSearchField();

    await searchField.fill(query);
    await searchField.press('Enter');
  }

  async dismissBlockingDialogs(): Promise<void> {
    const privacyDialog = this.page.getByRole('dialog', {
      name: 'Controle sua privacidade'
    });

    if (await privacyDialog.isVisible()) {
      await privacyDialog.getByRole('button', { name: 'Entendi' }).click();
    }

    const promotionalDismissal = this.page.getByText('Talvez depois', {
      exact: true
    });

    if (await promotionalDismissal.isVisible()) {
      await promotionalDismissal.click();
    }
  }

  async findProductCardWithName(
    namePattern?: RegExp
  ): Promise<{ card: Locator; name: string; href: string }> {
    const cards = this.kabumElements.getProductCards();

    await expect
      .poll(
        async () => {
          const cardCount = await cards.count();

          for (let index = 0; index < cardCount; index += 1) {
            const card = cards.nth(index);

            if (
              (await card.isVisible()) &&
              /R\$\s*[\d.]+,\d{2}/.test(await card.innerText())
            ) {
              return true;
            }
          }

          return false;
        },
        { message: 'A página deve carregar os dados dos cards de produto.' }
      )
      .toBe(true);

    const cardCount = await cards.count();

    for (let index = 0; index < cardCount; index += 1) {
      const card = cards.nth(index);

      if (!(await card.isVisible())) {
        continue;
      }

      const href = await card.getAttribute('href');

      if (href === null || !/^\/produto\/\d+\/[^?#]+/.test(href)) {
        continue;
      }

      const children = card.locator(':scope > *');
      const childCount = await children.count();

      for (let childIndex = 0; childIndex < childCount; childIndex += 1) {
        const name = (await children.nth(childIndex).innerText()).trim();

        if (
          name.length > 0 &&
          !/avaliação|de \d(?:[.,]\d)? de \d|R\$|^cupom\b|produto patrocinado|produto prime ninja|restam \d/i.test(
            name
          ) &&
          (namePattern === undefined || namePattern.test(name))
        ) {
          return { card, name, href };
        }
      }
    }

    throw new Error('Nenhum card de produto visível e válido foi encontrado.');
  }
}
