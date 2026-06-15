import type { WalletE2EConfig } from '@tronweb3/tronwallet-adapter-e2e-shared';

export const guardaConfig: WalletE2EConfig = {
    walletId: 'guarda',
    walletName: 'Guarda',
    providerIdentityKey: 'guarda',
    e2eBaseUrlEnvVar: 'GUARDA_E2E_BASE_URL',
    unlockPagePath: '/popup.html#/unlock',
    unlockFramePredicate: () => false,
};
