import { expect, type BrowserContext, type Frame, type Page } from '@playwright/test';
import type { WalletE2EConfig } from '../types.js';
import { DEFAULT_CONFIRM_BUTTON_NAMES, DEFAULT_REJECT_BUTTON_NAMES, DEFAULT_UNLOCK_BUTTON_NAMES } from '../types.js';
import { clickRiskAcknowledgement, clickMatchingButton, isExtensionPage, locatorVisible } from './context-helpers.js';
import type { E2EEnv } from '../env.js';

type WalletAction = 'confirm' | 'reject';
type PopupMode = 'required' | 'optional';

async function ensureNotLocked(page: Page, config: WalletE2EConfig) {
    const targets: (Page | Frame)[] = [page, ...page.frames()];

    for (const target of targets) {
        const passwordField = target.locator('input[type="password"]').first();
        if (await passwordField.isVisible().catch(() => false)) {
            throw new Error(
                `The ${config.walletName} profile is locked. Unlock the template profile before running the first version of the E2E suite.`
            );
        }
    }
}

async function unlockTargetIfNeeded(target: Page | Frame, config: WalletE2EConfig, e2eEnv: E2EEnv) {
    const unlockNames = config.unlockButtonNames ?? DEFAULT_UNLOCK_BUTTON_NAMES;
    const passwordField = target.locator('input[type="password"]').first();
    const locked = await passwordField.isVisible().catch(() => false);
    if (!locked) {
        return false;
    }

    if (!e2eEnv.walletPassword) {
        throw new Error(
            `The ${config.walletName} profile is locked. Set WALLET_PASSWORD so the E2E fixture can unlock the wallet automatically.`
        );
    }

    await passwordField.fill(e2eEnv.walletPassword);

    for (const name of unlockNames) {
        const button = await locatorVisible(target, name);
        if (button) {
            await button.click();
            await expect(passwordField).not.toBeVisible({ timeout: 15_000 });
            return true;
        }
    }

    await passwordField.press('Enter');
    await expect(passwordField).not.toBeVisible({ timeout: 15_000 });
    return true;
}

export async function unlockWalletIfNeeded(
    context: BrowserContext,
    extensionOrigin: string,
    config: WalletE2EConfig,
    e2eEnv: E2EEnv
) {
    const page = await context.newPage();

    try {
        await page.goto(`${extensionOrigin}${config.unlockPagePath}`);
        await page.waitForLoadState('domcontentloaded');

        const readyDeadline = Date.now() + 15_000;
        let unlockTarget: Page | Frame = page.mainFrame();
        while (Date.now() < readyDeadline) {
            const iframe = page.frames().find((frame) => config.unlockFramePredicate(frame.url(), extensionOrigin));
            const candidate: Page | Frame = iframe ?? page.mainFrame();
            const passwordField = candidate.locator('input[type="password"]').first();
            if (await passwordField.isVisible().catch(() => false)) {
                unlockTarget = candidate;
                break;
            }
            await page.waitForTimeout(250).catch(() => {});
        }

        await unlockTargetIfNeeded(unlockTarget, config, e2eEnv);
    } finally {
        await page.close().catch(() => {});
    }

    // Some extensions auto-open their own tabs (e.g. an unlock tab) when they detect
    // the wallet is locked at startup. Close any that are still open so tests start
    // from a clean state with no stray extension pages.
    //
    // A persistent context tears down the whole browser when its last page closes.
    // Some wallets consume the initial blank page and leave only extension pages
    // open after unlocking, so closing them all would drop the page count to zero
    // and later context operations would throw "Target page, context or browser has
    // been closed". Keep a blank page alive to guarantee at least one non-extension
    // page survives the cleanup.
    const keepAlive = await context.newPage();
    await keepAlive.goto('about:blank').catch(() => {});

    for (const p of context.pages()) {
        if (p !== keepAlive && isExtensionPage(p)) {
            await p.close().catch(() => {});
        }
    }

    if (config.postUnlockDelayMs) {
        await new Promise<void>((resolve) => setTimeout(resolve, config.postUnlockDelayMs));
    }
}

export class WalletPopupController {
    constructor(
        private readonly context: BrowserContext,
        private readonly config: WalletE2EConfig,
        private readonly e2eEnv: E2EEnv
    ) {}

    async completePendingRequest(
        trigger: () => Promise<unknown>,
        action: WalletAction,
        options: { popupMode?: PopupMode; timeoutMs?: number } = {}
    ) {
        const popupMode = options.popupMode || 'required';
        const timeoutMs = options.timeoutMs || (popupMode === 'required' ? 10_000 : 3_000);
        const knownPages = new Set(this.context.pages());
        const popupPromise = this.context.waitForEvent('page', {
            timeout: timeoutMs,
            predicate: (page) => isExtensionPage(page) && !knownPages.has(page),
        });

        const triggerPromise = Promise.resolve().then(trigger);

        let popup: Page | null = null;
        try {
            popup = await popupPromise;
        } catch (error) {
            if (popupMode === 'required') {
                await triggerPromise.catch(() => {});
                throw error;
            }
        }

        if (!popup) {
            await triggerPromise;
            return;
        }

        await popup.waitForLoadState('domcontentloaded');
        await popup.waitForTimeout(1_000);

        const unlockedTargets = [popup, ...popup.frames()];
        let unlockedPopup = false;
        for (const target of unlockedTargets) {
            if (await unlockTargetIfNeeded(target, this.config, this.e2eEnv)) {
                unlockedPopup = true;
                await popup.waitForLoadState('domcontentloaded').catch(() => {});
                await popup.waitForTimeout(1_000).catch(() => {});
                break;
            }
        }

        if (!unlockedPopup) {
            await ensureNotLocked(popup, this.config);
        }

        const confirmNames = this.config.confirmButtonNames ?? DEFAULT_CONFIRM_BUTTON_NAMES;
        const rejectNames = this.config.rejectButtonNames ?? DEFAULT_REJECT_BUTTON_NAMES;
        const names = action === 'confirm' ? confirmNames : rejectNames;
        let clickedAny = false;

        for (let step = 0; step < 5; step += 1) {
            // Some wallets gate confirm behind a fake "acknowledge risk" checkbox
            // (a styled <div>); tick it before clicking confirm. Only relevant when
            // confirming, and only for wallets that declare the label text.
            if (action === 'confirm' && this.config.confirmAcknowledgeText) {
                await clickRiskAcknowledgement(popup, this.config.confirmAcknowledgeText);
            }

            const clicked = await clickMatchingButton(popup, names);
            if (!clicked) {
                break;
            }

            clickedAny = true;
            if (popup.isClosed()) {
                break;
            }

            await popup.waitForLoadState('domcontentloaded').catch(() => {});
        }

        if (!clickedAny) {
            void triggerPromise.catch(() => {});
            throw new Error(`Unable to locate a visible "${action}" button in the ${this.config.walletName} popup.`);
        }

        await triggerPromise;
    }
}
