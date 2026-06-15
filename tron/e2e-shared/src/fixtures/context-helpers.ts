import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { Frame, Page } from '@playwright/test';
import type { WalletE2EConfig } from '../types.js';

const EXTENSION_PROTOCOL = 'chrome-extension://';

export async function createIsolatedUserDataDir(config: WalletE2EConfig, templateDir: string) {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), `${config.walletId}-e2e-`));
    await fs.cp(templateDir, tempDir, { recursive: true });
    return tempDir;
}

export function isExtensionPage(page: Page) {
    return page.url().startsWith(EXTENSION_PROTOCOL);
}

export function isExtensionWorkerUrl(url: string) {
    return url.startsWith(EXTENSION_PROTOCOL);
}

export function getExtensionOrigin(url: string) {
    // Node.js URL parser returns the string "null" for chrome-extension:// origins
    // because it's treated as an opaque origin. Extract the origin manually instead.
    if (url.startsWith(EXTENSION_PROTOCOL)) {
        return url.match(/^chrome-extension:\/\/[^/]+/)?.[0] ?? '';
    }
    return new URL(url).origin;
}

type PageLike = Page | Frame;

export async function locatorVisible(target: PageLike, name: RegExp) {
    const byRole = target.getByRole('button', { name }).first();
    try {
        await byRole.waitFor({ state: 'visible', timeout: 1_500 });
        return byRole;
    } catch {
        const byText = target.getByText(name, { exact: false }).first();
        try {
            await byText.waitFor({ state: 'visible', timeout: 500 });
            return byText;
        } catch {
            return null;
        }
    }
}

export async function clickMatchingButton(page: Page, names: RegExp[]) {
    const targets: PageLike[] = [page, ...page.frames()];

    for (const target of targets) {
        for (const name of names) {
            const locator = await locatorVisible(target, name);
            if (locator) {
                await locator.click();
                return true;
            }
        }
    }

    return false;
}

/**
 * Tick a wallet's fake "acknowledge risk" checkbox by clicking the <div> that
 * immediately precedes the label text (e.g. OneKey's "Proceed at my own risk").
 *
 * Some wallets render the checkbox as a styled <div> rather than a real
 * input/[role=checkbox], so it can't be toggled via Playwright's check(). We
 * locate the smallest element containing the label text, then click its previous
 * sibling <div>. Searches the page and its frames; returns true if it clicked one.
 */
export async function clickRiskAcknowledgement(page: Page, labelText: string) {
    const targets: PageLike[] = [page, ...page.frames()];

    for (const target of targets) {
        // `:text()` matches the smallest element containing the text (the label leaf).
        const label = target.locator(`:text(${JSON.stringify(labelText)})`).first();
        if (!(await label.isVisible().catch(() => false))) continue;

        const checkbox = label.locator('xpath=preceding-sibling::div[1]');
        if ((await checkbox.count().catch(() => 0)) === 0) continue;

        await checkbox.first().click({ timeout: 2_000 }).catch(() => {});
        return true;
    }

    return false;
}
