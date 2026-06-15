import type { WalletE2EConfig } from '@tronweb3/tronwallet-adapter-e2e-shared';

export const bybitConfig: WalletE2EConfig = {
    walletId: 'bybit',
    walletName: 'Bybit Wallet',
    providerIdentityKey: 'bybitWallet.tronLink',
    e2eBaseUrlEnvVar: 'BYBIT_E2E_BASE_URL',
    unlockPagePath: '/popup.html#/unlock',
    unlockFramePredicate: () => false,
};
