import { test, expect } from '@playwright/test';

test.describe('smoke', () => {
  test('home renders hero + has skip link + brand nav', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Glitch Grow/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/(production AI agents|Deploy in minutes|Yours forever)/i);
    // Skip link is rendered and points at #main.
    const skip = page.locator('a.skip-link');
    await expect(skip).toHaveAttribute('href', '#main');
    // Nav shows brand wordmark.
    await expect(page.getByRole('banner').getByText(/Grow/)).toBeVisible();
  });

  test('case studies index lists the spotlight', async ({ page }) => {
    await page.goto('/case-studies');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('link', { name: /Recovering the 60%|Read case/ })).toBeVisible();
  });

  test('case study detail page renders', async ({ page }) => {
    await page.goto('/case-studies/hidden-attribution');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/60%/);
    await expect(page.getByText(/3\.4×/).first()).toBeVisible();
  });

  test('legal + thanks render without errors', async ({ page }) => {
    for (const path of ['/legal/privacy', '/legal/terms', '/thanks']) {
      const resp = await page.goto(path);
      expect(resp?.status(), path).toBeLessThan(400);
      await expect(page.getByRole('heading', { level: 1 }), path).toBeVisible();
    }
  });

  test('JSON-LD organization + website blocks present on home', async ({ page }) => {
    await page.goto('/');
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const merged = blocks.join('\n');
    expect(merged).toContain('"Organization"');
    expect(merged).toContain('"WebSite"');
  });

  test('robots + sitemap are reachable', async ({ request }) => {
    const robots = await request.get('/robots.txt');
    expect(robots.status()).toBe(200);
    expect(await robots.text()).toMatch(/Sitemap:/);
    const sitemap = await request.get('/sitemap-index.xml');
    expect(sitemap.status()).toBe(200);
  });

  test('geo variants — / shows Canadian entity; /in shows Indian entity', async ({ page }) => {
    // Global variant: Nuraveda (Canada), Stripe, USD
    await page.goto('/');
    const globalFooter = page.getByRole('contentinfo');
    await expect(globalFooter).toContainText(/Nuraveda/);
    await expect(globalFooter).toContainText(/Stripe/);
    await expect(globalFooter).not.toContainText(/Bani Thani/);
    await expect(globalFooter).not.toContainText(/GSTIN/);

    // India variant: Bani Thani / Harshita Goyal / GSTIN / Razorpay
    await page.goto('/in/');
    const inFooter = page.getByRole('contentinfo');
    await expect(inFooter).toContainText(/Bani Thani/);
    await expect(inFooter).toContainText(/Harshita Goyal/);
    await expect(inFooter).toContainText(/23AMMPG9088N1ZB/);
    await expect(inFooter).toContainText(/Razorpay/);
    // Should NOT show the Canadian entity on the India variant
    await expect(inFooter).not.toContainText(/Nuraveda/);

    // India legal pages exist + reference Indian entity
    const tos = await page.goto('/in/legal/terms');
    expect(tos?.status()).toBeLessThan(400);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Terms of Service/);

    const privacy = await page.goto('/in/legal/privacy');
    expect(privacy?.status()).toBeLessThan(400);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Privacy Policy/);
  });

  test('agent cards have dual buttons + currency-correct prices per variant', async ({ page }) => {
    // Global variant: USD prices, Buy now button enabled (Stripe)
    await page.goto('/');
    const globalGrid = page.locator('#agents');
    await expect(globalGrid).toContainText(/\$39|\$99|\$129|\$149/);  // at least one agent USD price
    await expect(globalGrid).not.toContainText(/₹999|₹2,499|₹3,999/); // INR should not leak
    // Both buttons present
    const globalBuyBtns = globalGrid.locator('a:has-text("Buy now")');
    // Spec link uses "View spec" on sm+, "Spec" on narrow viewports.
    // Test viewport (default Playwright = 1280) -> "View spec".
    const globalSpecBtns = globalGrid.locator('a:has-text("View spec")');
    await expect(globalBuyBtns).toHaveCount(6);
    await expect(globalSpecBtns).toHaveCount(6);

    // India variant: INR prices, Razorpay buttons (disabled until setup-razorpay runs)
    await page.goto('/in/');
    const inGrid = page.locator('#agents');
    await expect(inGrid).toContainText(/₹999|₹2,499|₹3,999/);  // at least one agent INR price
    await expect(inGrid).not.toContainText(/\$39|\$99|\$129|\$149/); // USD should not leak
    const inSpecBtns = inGrid.locator('a:has-text("View spec")');
    await expect(inSpecBtns).toHaveCount(6);
    // Razorpay Standard Checkout buttons — real triggers, not disabled,
    // each carrying data-razorpay-sku for the global click delegator.
    const inRazorpayBtns = inGrid.locator('button[data-razorpay-sku]');
    await expect(inRazorpayBtns).toHaveCount(6);
  });

  test('lead modal opens on data-cta=kit click + auto-opens on ?lead=open', async ({ page }) => {
    // Click any kit CTA → modal opens
    await page.goto('/');
    const dialog = page.locator('#lead-form-modal');
    await expect(dialog).toBeAttached();
    // Native <dialog> is closed by default — open property absent
    await expect(dialog).not.toHaveAttribute('open', '');

    // Use the Hero CTA inside <main> — the announcement-bar/Nav CTAs are
    // covered by the fixed sticky header during scroll-into-view.
    await page.locator('main [data-cta="kit"]').first().click();
    await expect(dialog).toHaveAttribute('open', '');
    // Form fields are present
    await expect(page.locator('#lf-name')).toBeVisible();
    await expect(page.locator('#lf-email')).toBeVisible();
    await expect(page.locator('#lf-phone')).toBeVisible();
    await expect(page.locator('#lf-profession')).toBeVisible();

    // Close button
    await page.locator('[data-modal-close]').first().click();
    await expect(dialog).not.toHaveAttribute('open', '');

    // Auto-open via /kit?lead=open
    await page.goto('/kit?lead=open');
    await expect(page.locator('#lead-form-modal')).toHaveAttribute('open', '');
  });

  test('no obvious console errors on home', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
    await page.goto('/');
    // `load`, not `networkidle`: Turnstile + analytics scripts can keep the
    // network busy indefinitely on localhost (unauthorized hostname, poll loops).
    // `load` is sufficient — any console error from our own code fires before it.
    await page.waitForLoadState('load');
    expect(errors, errors.join('\n')).toEqual([]);
  });
});
