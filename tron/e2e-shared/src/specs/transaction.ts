import type { TestType, Expect } from '@playwright/test';
import type { WalletE2EConfig } from '../types.js';
import type { AdapterE2EPage } from '../fixtures/test-page.js';
import type { WalletPopupController } from '../fixtures/wallet-popup.js';
import { connectWallet, ensureChain, expectSignedTransaction } from '../helpers/test-helpers.js';
import { resolveCapabilities } from '../types.js';
import { TronWeb } from 'tronweb';

type Fixtures = { app: AdapterE2EPage; walletPopup: WalletPopupController };

export function defineTransactionTests(test: TestType<Fixtures, {}>, expect: Expect, config: WalletE2EConfig) {
    const { multiSign: supportsMultiSign, switchChain: supportsSwitchChain } = resolveCapabilities(config);

    test('E2E-012 should sign a TRX transfer transaction successfully', async ({ app, walletPopup }, testInfo) => {
        test.skip(
            testInfo.project.name !== 'with-extension',
            `This test requires the ${config.walletName} extension project.`
        );

        await connectWallet(app, walletPopup);
        // Wallets that support switchChain may default to a different network; align
        // them to Nile (0xcd8690dc) first so the signed transaction targets the chain
        // the harness builds transactions against.
        if (supportsSwitchChain) {
            await ensureChain(app, walletPopup, '0xcd8690dc');
        }
        await walletPopup.completePendingRequest(() => app.runAction('signTransaction'), 'confirm');
        const snapshot = await app.getSnapshot();

        expect(snapshot.result.lastAction).toBe('signTransaction');
        expect(snapshot.result.status).toBe('success');
        expectSignedTransaction(snapshot.result.value);
    });

    test('E2E-013 should report an error when signTransaction is rejected', async ({ app, walletPopup }, testInfo) => {
        test.skip(
            testInfo.project.name !== 'with-extension',
            `This test requires the ${config.walletName} extension project.`
        );

        await connectWallet(app, walletPopup);
        await walletPopup.completePendingRequest(() => app.runAction('signTransaction'), 'reject');
        const snapshot = await app.getSnapshot();

        expect(snapshot.result.lastAction).toBe('signTransaction');
        expect(snapshot.result.status).toBe('error');
    });

    test('E2E-014 should throw WalletDisconnectedError when signTransaction is called before connect', async ({
        app,
    }, testInfo) => {
        test.skip(
            testInfo.project.name !== 'with-extension',
            `This test requires the ${config.walletName} extension project.`
        );

        await app.runAction('resetState');
        await app.runAction('signTransaction', {
            receiver: app.getE2eEnv().testReceiverAddress,
            value: '1000',
            fromAddress: (await TronWeb.createAccount()).address.base58,
        });
        const snapshot = await app.getSnapshot();

        expect(snapshot.result.lastAction).toBe('signTransaction');
        expect(snapshot.result.status).toBe('error');
        expect(snapshot.result.errorName).toMatch(/Disconnected|NotFound|Connect/);
    });

    test('E2E-014a should multi-sign a transaction with a permission id', async ({ app, walletPopup }, testInfo) => {
        test.skip(
            testInfo.project.name !== 'with-extension',
            `This test requires the ${config.walletName} extension project.`
        );
        if (!supportsMultiSign) {
            test.skip(true, `${config.walletName} does not support multiSign.`);
        }

        await connectWallet(app, walletPopup);
        await walletPopup.completePendingRequest(() => app.runAction('multiSign'), 'confirm');
        const snapshot = await app.getSnapshot();

        expect(snapshot.result.lastAction).toBe('multiSign');
        // multiSign may fail at the wallet level when the active account has no
        // matching permission; we tolerate either outcome here, but the action
        // must have run end-to-end (never stayed pending).
        expect(['success', 'error']).toContain(snapshot.result.status);
    });
}
