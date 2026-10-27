import { Locator, Page } from '@playwright/test';
import BaseElements from './BaseElements';

export default class KabumElements extends BaseElements {
  constructor(readonly page: Page) {
    super(page);
    this.page = page;
  }

  getSearchField(): Locator {
    return this.page.getByRole('combobox', {
      name: 'Campo de busca de produtos'
    });
  }

  getSearchHeading(): Locator {
    return this.page.getByRole('heading', { level: 1 });
  }

  getProductCards(): Locator {
    return this.page.locator('main a[href*="/produto/"]');
  }

  getSortSelect(): Locator {
    return this.page.locator('select:has(option[value="most_searched"])');
  }

  getOfferFilter(): Locator {
    return this.page.locator('input[type="checkbox"][value="has_offer"]');
  }

  getCouponMenuLink(): Locator {
    return this.page.getByRole('link', {
      name: 'Botão do menu (Cupons)'
    });
  }

  getCouponCodes(): Locator {
    return this.page.getByText(/^[A-Z][A-Z0-9]{4,}$/);
  }
}
