import type { TestType, Expect } from '@playwright/test';
import type { WalletE2EConfig } from '../types.js';
import type { E2EEnv } from '../env.js';
import type { AdapterE2EPage } from '../fixtures/test-page.js';
import type { WalletPopupController } from '../fixtures/wallet-popup.js';
import { connectWallet } from '../helpers/test-helpers.js';
import { resolveCapabilities } from '../types.js';

type Fixtures = { app: AdapterE2EPage; walletPopup: WalletPopupController };

export function defineChainTests(
    test: TestType<Fixtures, {}>,
    expect: Expect,
    config: WalletE2EConfig,
    e2eEnv: E2EEnv
) {
    const { switchChain: supportsSwitchChain } = resolveCapabilities(config);

    test('E2E-015 should switch to the configured TRON network', async ({ app, walletPopup }, testInfo) => {
        test.skip(
            testInfo.project.name !== 'with-extension',
            `This test requires the ${config.walletName} extension project.`
        );
        if (!supportsSwitchChain) {
            test.skip(true, `${config.walletName} does not support switchChain.`);
        }

        await connectWallet(app, walletPopup);
        await app.clearEvents();
        await walletPopup.completePendingRequest(
            () => app.runAction('switchChain', { chainId: e2eEnv.testChainId }),
            'confirm',
            { popupMode: 'optional' }
        );

        await expect
            .poll(async () => {
                const snapshot = await app.getSnapshot();
                return {
                    chainId: snapshot.chainId,
                    status: snapshot.result.status,
                };
            })
            .toEqual({
                chainId: e2eEnv.testChainId,
                status: 'success',
            });
    });

    test('E2E-016 should not crash when switching to an unknown chain fails', async ({
        app,
        walletPopup,
    }, testInfo) => {
        test.skip(
            testInfo.project.name !== 'with-extension',
            `This test requires the ${config.walletName} extension project.`
        );
        if (!supportsSwitchChain) {
            test.skip(true, `${config.walletName} does not support switchChain.`);
        }

        await connectWallet(app, walletPopup);
        await walletPopup.completePendingRequest(
            () => app.runAction('switchChain', { chainId: e2eEnv.testUnknownChainId }),
            'reject',
            { popupMode: 'optional' }
        );
        const snapshot = await app.getSnapshot();

        expect(snapshot.result.lastAction).toBe('switchChain');
        expect(['success', 'error']).toContain(snapshot.result.status);
    });
}
