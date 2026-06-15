import type { WalletE2EConfig } from '@tronweb3/tronwallet-adapter-e2e-shared';

export const tokenpocketConfig: WalletE2EConfig = {
    walletId: 'tokenpocket',
    walletName: 'TokenPocket',
    providerIdentityKey: 'tokenpocket.tron.isTokenPocket',
    e2eBaseUrlEnvVar: 'TOKENPOCKET_E2E_BASE_URL',
    unlockPagePath: '/popup.html#/unlock',
    unlockFramePredicate: () => false,
};
