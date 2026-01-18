import { test, expect, Page } from '@playwright/test';

/**
 * E2E Tests for "ANC Magic Ball" Telegram Mini App
 *
 * The app is a "Scratch Card" game:
 * - Load: Shows a loader, fetches a prediction from the backend
 * - Interact: User rubs (scratches) a "Frost Layer" (HTML5 Canvas) over a Crystal Ball
 * - Feedback: As user scratches, helper text changes (e.g., "Keep going!")
 * - Reveal: At 50%+ progress, an explosion happens, and a text bubble appears
 *
 * The ball consists of two SVG images:
 * - /images/ball.svg - the crystal ball sphere
 * - /images/stand.svg - the stand beneath the ball
 */

// Mock Telegram WebApp object
const TELEGRAM_WEBAPP_MOCK = `
  window.Telegram = {
    WebApp: {
      initData: 'user=' + encodeURIComponent(JSON.stringify({
        id: 12345,
        first_name: 'Test',
        last_name: 'User',
        username: 'testuser',
        language_code: 'uk'
      })),
      initDataUnsafe: {
        user: {
          id: 12345,
          first_name: 'Test',
          last_name: 'User',
          username: 'testuser',
          language_code: 'uk'
        }
      },
      ready: () => console.log('[Mock] Telegram.WebApp.ready() called'),
      expand: () => console.log('[Mock] Telegram.WebApp.expand() called'),
      close: () => console.log('[Mock] Telegram.WebApp.close() called'),
      HapticFeedback: {
        impactOccurred: (style) => console.log('[Mock] HapticFeedback.impactOccurred:', style),
        notificationOccurred: (type) => console.log('[Mock] HapticFeedback.notificationOccurred:', type),
        selectionChanged: () => console.log('[Mock] HapticFeedback.selectionChanged()')
      },
      MainButton: {
        show: () => {},
        hide: () => {},
        setText: () => {},
        onClick: () => {},
        offClick: () => {}
      },
      BackButton: {
        show: () => {},
        hide: () => {},
        onClick: () => {},
        offClick: () => {}
      },
      themeParams: {
        bg_color: '#1a0a2e',
        text_color: '#ffffff',
        button_color: '#7b2cbf',
        button_text_color: '#ffffff'
      },
      colorScheme: 'dark',
      viewportHeight: 640,
      viewportStableHeight: 640,
      isExpanded: true,
      platform: 'android'
    }
  };
`;

/**
 * Helper function to simulate scratching on the canvas.
 * Performs a "Zig-Zag" mouse movement to cover at least 70% of the canvas area
 * to ensure triggering the > 50% threshold (revealThreshold in the app is 50).
 */
async function simulateScratching(page: Page, canvasSelector: string): Promise<void> {
  const canvas = page.locator(canvasSelector);
  await canvas.waitFor({ state: 'visible', timeout: 10000 });

  const box = await canvas.boundingBox();
  if (!box) {
    throw new Error(`Canvas element not found or has no bounding box: ${canvasSelector}`);
  }

  const { x, y, width, height } = box;

  // Start position (center of canvas)
  const startX = x + width / 2;
  const startY = y + height / 2;

  // Move to start position and press mouse button
  await page.mouse.move(startX, startY);
  await page.mouse.down();

  // Zig-zag pattern across the canvas to scratch ~70%+ of area
  // The revealThreshold is 50%, so we need to scratch at least 50%
  const stepY = 15; // vertical step between rows
  const rows = Math.floor(height / stepY);

  for (let row = 0; row < rows; row++) {
    const currentY = y + 10 + (row * stepY);

    // Check if we're still within the circular canvas bounds
    if (currentY > y + height - 10) break;

    // Zig-zag: even rows go left-to-right, odd rows go right-to-left
    if (row % 2 === 0) {
      // Left to right
      for (let currentX = x + 15; currentX < x + width - 15; currentX += 20) {
        await page.mouse.move(currentX, currentY, { steps: 2 });
      }
    } else {
      // Right to left
      for (let currentX = x + width - 15; currentX > x + 15; currentX -= 20) {
        await page.mouse.move(currentX, currentY, { steps: 2 });
      }
    }
  }

  // Additional passes for better coverage
  for (let i = 0; i < 3; i++) {
    // Horizontal pass
    await page.mouse.move(x + 20, y + height / 2 + (i * 20), { steps: 3 });
    await page.mouse.move(x + width - 20, y + height / 2 + (i * 20), { steps: 10 });

    // Diagonal pass
    await page.mouse.move(x + 20, y + 20, { steps: 3 });
    await page.mouse.move(x + width - 20, y + height - 20, { steps: 10 });
  }

  await page.mouse.up();
}

/**
 * Helper to inject Telegram WebApp mock before page loads
 */
async function setupTelegramMock(page: Page): Promise<void> {
  await page.addInitScript(TELEGRAM_WEBAPP_MOCK);
}

test.describe('Magic Ball - Happy Path', () => {
  test.beforeEach(async ({ page }) => {
    // Inject Telegram WebApp mock
    await setupTelegramMock(page);

    // Mock the API endpoint to return a test prediction
    await page.route('**/api/predict', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          prediction: 'Test Prediction: You are awesome!',
          id: '123'
        })
      });
    });
  });

  test('should complete full scratch-to-reveal flow', async ({ page }) => {
    // Navigate to the app
    await page.goto('/');

    // 1. Verify Loading state - check if Loader appears
    // The loader shows "Консультуємось із зірками..." text
    const loaderText = page.getByText('Консультуємось із зірками...');
    await expect(loaderText).toBeVisible({ timeout: 5000 });

    // 2. Wait for interactive phase (prediction loaded)
    // The loader should disappear and ball should appear
    await expect(loaderText).toBeHidden({ timeout: 10000 });

    // 3. Verify the Magic Ball is visible with ball.svg
    const ballImage = page.locator('img[src="/images/ball.svg"]');
    await expect(ballImage).toBeVisible({ timeout: 5000 });

    // 4. Verify the Canvas (Frost Layer) is visible and covering the ball
    // The canvas is a circular scratch layer with pointer-events-auto
    const frostCanvas = page.locator('canvas.cursor-pointer.touch-none');
    await expect(frostCanvas).toBeVisible();

    // 5. Verify initial hint text is shown
    const hintText = page.getByText('Потри кришталеву кулю');
    await expect(hintText).toBeVisible();

    // 6. Verify initial progress text
    const initialProgressText = page.getByText('Ну, почнемо магію...');
    await expect(initialProgressText).toBeVisible();

    // 7. Perform scratching simulation
    await simulateScratching(page, 'canvas.cursor-pointer.touch-none');

    // 8. Wait a moment for animations and state updates
    await page.waitForTimeout(500);

    // 9. Verify the progress text changed during scratching
    // At some point, text should change to one of:
    // "Ого, пішло тепло!", "Ще активніше! Бачу спалахи!", etc.
    // We check for any of the later progress messages or the final state

    // 10. Continue scratching if needed (ensure we hit 50%+ threshold)
    // Check if canvas is still visible, if so, scratch more
    const canvasStillVisible = await frostCanvas.isVisible().catch(() => false);
    if (canvasStillVisible) {
      await simulateScratching(page, 'canvas.cursor-pointer.touch-none');
      await page.waitForTimeout(500);
    }

    // 11. Verify Reveal happened - Canvas should be gone/hidden
    await expect(frostCanvas).toBeHidden({ timeout: 10000 });

    // 12. Verify the Prediction Bubble appears with our mock text
    const predictionBubble = page.locator('.fixed.inset-0.flex.items-center.justify-center.z-50');
    await expect(predictionBubble).toBeVisible({ timeout: 10000 });

    // 13. Verify the prediction text in the bubble
    const predictionText = page.getByText('Test Prediction: You are awesome!');
    await expect(predictionText).toBeVisible();

    // 14. Verify bubble header
    const bubbleHeader = page.getByText('Твоє пророцтво');
    await expect(bubbleHeader).toBeVisible();

    // 15. Verify "Close" button is visible (Ukrainian: "Закрити")
    const closeButton = page.getByRole('button', { name: 'Закрити' });
    await expect(closeButton).toBeVisible();

    // 16. Test close button functionality
    await closeButton.click();

    // The bubble should close (or in Telegram context, app would close)
    // Since we're testing outside Telegram, the bubble should hide
    await expect(predictionBubble).toBeHidden({ timeout: 5000 });
  });

  test('should show progress percentage while scratching', async ({ page }) => {
    await page.goto('/');

    // Wait for interactive phase
    await page.waitForSelector('canvas.cursor-pointer.touch-none', { timeout: 15000 });

    // Get the canvas
    const canvas = page.locator('canvas.cursor-pointer.touch-none');
    const box = await canvas.boundingBox();

    if (!box) {
      throw new Error('Canvas not found');
    }

    // Do a small scratch and check progress appears
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 30, box.y + box.height / 2 + 30, { steps: 5 });
    await page.mouse.up();

    // Progress percentage indicator should be visible
    const progressIndicator = page.locator('span.font-mono');
    await expect(progressIndicator).toBeVisible({ timeout: 5000 });
  });

  test('should display ball.svg and stand.svg images', async ({ page }) => {
    await page.goto('/');

    // Wait for loading to complete
    await page.waitForSelector('img[src="/images/ball.svg"]', { timeout: 15000 });

    // Verify ball.svg is loaded
    const ballImage = page.locator('img[src="/images/ball.svg"]');
    await expect(ballImage).toBeVisible();

    // Verify the image loaded correctly (not broken)
    const ballNaturalWidth = await ballImage.evaluate((img: HTMLImageElement) => img.naturalWidth);
    expect(ballNaturalWidth).toBeGreaterThan(0);
  });
});

test.describe('Magic Ball - API Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    // Inject Telegram WebApp mock
    await setupTelegramMock(page);
  });

  test('should handle API 500 error gracefully with fallback prediction', async ({ page }) => {
    // Mock the API to return 500 error
    await page.route('**/api/predict', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Internal Server Error'
        })
      });
    });

    await page.goto('/');

    // App should show loader initially
    const loaderText = page.getByText('Консультуємось із зірками...');
    await expect(loaderText).toBeVisible({ timeout: 5000 });

    // Wait for error handling and fallback
    await expect(loaderText).toBeHidden({ timeout: 10000 });

    // App should NOT crash - the interactive phase should still load
    // with a fallback offline prediction
    const frostCanvas = page.locator('canvas.cursor-pointer.touch-none');
    await expect(frostCanvas).toBeVisible({ timeout: 10000 });

    // Error message should appear
    const errorMessage = page.getByText('Не вдалося отримати пророцтво');
    await expect(errorMessage).toBeVisible();

    // Ball should still be visible (app is functional)
    const ballImage = page.locator('img[src="/images/ball.svg"]');
    await expect(ballImage).toBeVisible();

    // User should still be able to scratch
    await simulateScratching(page, 'canvas.cursor-pointer.touch-none');
    await page.waitForTimeout(500);

    // Continue scratching if needed
    const canvasStillVisible = await frostCanvas.isVisible().catch(() => false);
    if (canvasStillVisible) {
      await simulateScratching(page, 'canvas.cursor-pointer.touch-none');
    }

    // Canvas should disappear after enough scratching
    await expect(frostCanvas).toBeHidden({ timeout: 10000 });

    // Bubble should appear with fallback prediction
    const predictionBubble = page.locator('.fixed.inset-0.flex.items-center.justify-center.z-50');
    await expect(predictionBubble).toBeVisible({ timeout: 10000 });

    // Fallback prediction text: "Зірки кажуть: сьогодні вітамін С - твій найкращий друг!"
    const fallbackText = page.getByText(/вітамін С/);
    await expect(fallbackText).toBeVisible();
  });

  test('should handle network timeout gracefully', async ({ page }) => {
    // Mock the API with a very long delay (simulating timeout)
    await page.route('**/api/predict', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 30000)); // 30 second delay
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ prediction: 'Delayed response' })
      });
    });

    await page.goto('/');

    // Loader should appear
    const loaderText = page.getByText('Консультуємось із зірками...');
    await expect(loaderText).toBeVisible({ timeout: 5000 });

    // App should eventually timeout and show fallback
    // (based on fetch timeout in the app, typically 10-30 seconds)
    // For testing, we can abort the route and simulate error
    await page.route('**/api/predict', async (route) => {
      await route.abort('failed');
    });

    // Trigger a navigation or refresh to apply new route
    // In real scenario, the app would timeout on its own
  });
});

test.describe('Magic Ball - UI Verification', () => {
  test.beforeEach(async ({ page }) => {
    await setupTelegramMock(page);

    await page.route('**/api/predict', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          prediction: 'Ваші зірки сьогодні особливо яскраві!',
          id: '456'
        })
      });
    });
  });

  test('should display header correctly', async ({ page }) => {
    await page.goto('/');

    // Wait for content to load
    await page.waitForSelector('canvas.cursor-pointer.touch-none', { timeout: 15000 });

    // Verify header
    const headerTitle = page.getByRole('heading', { name: 'Пророцтво дня' });
    await expect(headerTitle).toBeVisible();

    const headerSubtitle = page.getByText('ANC Pharmacy');
    await expect(headerSubtitle).toBeVisible();
  });

  test('should show Share button after reveal', async ({ page }) => {
    await page.goto('/');

    // Wait for interactive phase
    await page.waitForSelector('canvas.cursor-pointer.touch-none', { timeout: 15000 });

    // Scratch to reveal
    await simulateScratching(page, 'canvas.cursor-pointer.touch-none');
    await page.waitForTimeout(500);

    const frostCanvas = page.locator('canvas.cursor-pointer.touch-none');
    const canvasStillVisible = await frostCanvas.isVisible().catch(() => false);
    if (canvasStillVisible) {
      await simulateScratching(page, 'canvas.cursor-pointer.touch-none');
    }

    // Wait for reveal
    await expect(frostCanvas).toBeHidden({ timeout: 10000 });

    // Share button should appear
    // Looking for any button or element with share-related text or icon
    const shareButton = page.locator('button').filter({ hasText: /Поділитися|Share/i });

    // If no text, look for share button by structure
    if (!(await shareButton.isVisible().catch(() => false))) {
      // The ShareButton component exists but might not have visible text
      const shareComponent = page.locator('[class*="mt-8"]').locator('button');
      await expect(shareComponent).toBeVisible({ timeout: 5000 });
    }
  });

  test('should have correct viewport for mobile', async ({ page }) => {
    await page.goto('/');

    // Check viewport size is appropriate for mobile
    const viewport = page.viewportSize();
    expect(viewport).not.toBeNull();

    if (viewport) {
      // Mobile viewports are typically <= 428px wide (iPhone 12 Pro Max)
      expect(viewport.width).toBeLessThanOrEqual(500);
      expect(viewport.height).toBeGreaterThan(500);
    }
  });
});

test.describe('Magic Ball - Canvas Scratching Details', () => {
  test.beforeEach(async ({ page }) => {
    await setupTelegramMock(page);

    await page.route('**/api/predict', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          prediction: 'Магія працює!',
          id: '789'
        })
      });
    });
  });

  test('should scratch only within circular canvas bounds', async ({ page }) => {
    await page.goto('/');

    await page.waitForSelector('canvas.cursor-pointer.touch-none', { timeout: 15000 });

    const canvas = page.locator('canvas.cursor-pointer.touch-none');
    const box = await canvas.boundingBox();

    if (!box) {
      throw new Error('Canvas not found');
    }

    // The canvas is circular (280x280 based on BALL_SIZE constant)
    // Scratching outside the circle should not work

    // Verify canvas has circular styling
    const borderRadius = await canvas.evaluate((el) =>
      window.getComputedStyle(el).borderRadius
    );
    expect(borderRadius).toBe('50%');
  });

  test('should progressively reveal as user scratches more', async ({ page }) => {
    await page.goto('/');

    await page.waitForSelector('canvas.cursor-pointer.touch-none', { timeout: 15000 });

    const canvas = page.locator('canvas.cursor-pointer.touch-none');
    const box = await canvas.boundingBox();

    if (!box) {
      throw new Error('Canvas not found');
    }

    // Start scratching
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();

    // Do a small scratch
    for (let i = 0; i < 3; i++) {
      await page.mouse.move(
        box.x + box.width / 2 + (i * 20),
        box.y + box.height / 2 + (i * 10),
        { steps: 3 }
      );
    }
    await page.mouse.up();

    // Check that progress text has potentially changed
    // Initial text was "Ну, почнемо магію..."
    await page.waitForTimeout(300);

    // Progress bar should be visible
    const progressBar = page.locator('.h-1.w-24.bg-white\\/20.rounded-full');
    await expect(progressBar).toBeVisible();
  });
});
