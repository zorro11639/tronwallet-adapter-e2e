import type { TestType, Expect } from '@playwright/test';
import type { WalletE2EConfig } from '../types.js';
import type { AdapterE2EPage } from '../fixtures/test-page.js';
import type { WalletPopupController } from '../fixtures/wallet-popup.js';
import { connectWallet, expectTronAddress } from '../helpers/test-helpers.js';

type Fixtures = { app: AdapterE2EPage; walletPopup: WalletPopupController };

export function defineConnectTests(test: TestType<Fixtures, {}>, expect: Expect, config: WalletE2EConfig) {
    test(`E2E-004 should connect successfully after approving the popup`, async ({ app, walletPopup }, testInfo) => {
        test.skip(
            testInfo.project.name !== 'with-extension',
            `This test requires the ${config.walletName} extension project.`
        );

        const snapshot = await connectWallet(app, walletPopup);
        expectTronAddress(snapshot.address);
        expect(snapshot.result.lastAction).toBe('connect');
    });

    test('E2E-005 should surface an error when the connection request is rejected', async ({
        app,
        walletPopup,
    }, testInfo) => {
        test.skip(
            testInfo.project.name !== 'with-extension',
            `This test requires the ${config.walletName} extension project.`
        );

        await walletPopup.completePendingRequest(() => app.runAction('connect'), 'reject');
        const snapshot = await app.getSnapshot();

        expect(snapshot.connected).toBe(false);
        expect(snapshot.address).toBeFalsy();
        expect(snapshot.result.lastAction).toBe('connect');
        expect(snapshot.result.status).toBe('error');
    });

    test.skip('E2E-006 should remain stable when connect is called twice', async ({ app, walletPopup }, testInfo) => {
        test.skip(
            testInfo.project.name !== 'with-extension',
            `This test requires the ${config.walletName} extension project.`
        );

        const first = await connectWallet(app, walletPopup);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await walletPopup.completePendingRequest(() => app.runAction('connect'), 'confirm', { popupMode: 'required' });
        const second = await app.getSnapshot();

        expectTronAddress(first.address);
        expectTronAddress(second.address);
        expect(second.connected).toBe(true);
        expect(second.result.lastAction).toBe('connect');
        expect(second.result.status).toBe('success');
    });

    test('E2E-006a should clear address and connected state after disconnect', async ({
        app,
        walletPopup,
    }, testInfo) => {
        test.skip(
            testInfo.project.name !== 'with-extension',
            `This test requires the ${config.walletName} extension project.`
        );

        await connectWallet(app, walletPopup);
        await app.runAction('disconnect');

        await expect
            .poll(async () => {
                const snapshot = await app.getSnapshot();
                return { connected: snapshot.connected, address: snapshot.address };
            })
            .toEqual({ connected: false, address: null });
    });
}
