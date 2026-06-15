import type { WalletE2EConfig } from '@tronweb3/tronwallet-adapter-e2e-shared';

export const binanceConfig: WalletE2EConfig = {
    walletId: 'binance',
    walletName: 'Binance Wallet',
    providerIdentityKey: 'binancew3w.tron',
    e2eBaseUrlEnvVar: 'BINANCE_E2E_BASE_URL',
    unlockPagePath: '/index.html',
    unlockFramePredicate: () => false,
};
