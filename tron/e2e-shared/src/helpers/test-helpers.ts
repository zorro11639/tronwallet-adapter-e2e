import { expect } from '@playwright/test';
import type { AdapterE2EPage } from '../fixtures/test-page.js';
import type { WalletPopupController } from '../fixtures/wallet-popup.js';

export async function connectWallet(app: AdapterE2EPage, walletPopup: WalletPopupController) {
    await walletPopup.completePendingRequest(() => app.runAction('connect'), 'confirm');
    await expect
        .poll(async () => {
            const snapshot = await app.getSnapshot();
            return snapshot.connected;
        })
        .toBe(true);
    return app.getSnapshot();
}

export async function ensureChain(app: AdapterE2EPage, walletPopup: WalletPopupController, targetChainId: string) {
    const initialSnapshot = await app.getSnapshot();
    if (initialSnapshot.chainId.toLowerCase() === targetChainId.toLowerCase()) {
        return initialSnapshot;
    }

    await walletPopup.completePendingRequest(
        () => app.runAction('switchChain', { chainId: targetChainId }),
        'confirm',
        { popupMode: 'optional' }
    );

    await expect
        .poll(async () => {
            const snapshot = await app.getSnapshot();
            return snapshot.chainId;
        })
        .toBe(targetChainId);

    return app.getSnapshot();
}

/** TRON base58 addresses start with "T" and are 34 characters long. */
export function expectTronAddress(value: string | null) {
    expect(value || '').toMatch(/^T[1-9A-HJ-NP-Za-km-z]{33}$/);
}

/** signMessage returns a hex signature, usually 0x + 130 hex chars. */
export function expectHexSignature(value: string) {
    expect(value).toMatch(/^(0x)?[a-fA-F0-9]+$/);
}

/**
 * signTransaction returns the input transaction object with a `signature` field appended.
 * The harness serializes the result as JSON; this checks the shape.
 */
export function expectSignedTransaction(value: string) {
    const parsed = JSON.parse(value);
    expect(parsed).toMatchObject({ txID: expect.any(String) });
    expect(Array.isArray(parsed.signature)).toBe(true);
    expect(parsed.signature.length).toBeGreaterThan(0);
}
