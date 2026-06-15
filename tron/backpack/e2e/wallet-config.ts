import type { WalletE2EConfig } from '@tronweb3/tronwallet-adapter-e2e-shared';

export const backpackConfig: WalletE2EConfig = {
    walletId: 'backpack',
    walletName: 'Backpack',
    // Backpack injects its TRON provider at `window.backpack.tron` and flags it
    // with `isBackpack`. The harness treats this as a dotted path on `window`.
    providerIdentityKey: 'backpack.tron',
    e2eBaseUrlEnvVar: 'BACKPACK_E2E_BASE_URL',
    unlockPagePath: '/popup.html',
    unlockFramePredicate: () => false,
    // Backpack's TRON adapter throws WalletSignTransactionError for multiSign
    // ("Multi-sign method not implemented for Backpack wallet."), so skip it.
    capabilities: {
        multiSign: false,
        switchChain: false,
    },
};
