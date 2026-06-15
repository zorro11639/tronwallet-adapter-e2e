import type { WalletE2EConfig } from '@tronweb3/tronwallet-adapter-e2e-shared';

export const okxwalletConfig: WalletE2EConfig = {
    walletId: 'okxwallet',
    walletName: 'OKX Wallet',
    providerIdentityKey: 'okxwallet.tronLink.tronWeb',
    e2eBaseUrlEnvVar: 'OKX_WALLET_E2E_BASE_URL',
    unlockPagePath: '/popup.html#/unlock',
    unlockFramePredicate: (frameUrl, extensionOrigin) =>
        frameUrl.startsWith(extensionOrigin) && frameUrl.includes('/ses.html#/'),
    capabilities: {
        switchChain: false,
        multiSign: false,
    },
};
