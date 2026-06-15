import type { WalletE2EConfig } from '@tronweb3/tronwallet-adapter-e2e-shared';

export const trustConfig: WalletE2EConfig = {
    walletId: 'trust',
    walletName: 'Trust',
    providerIdentityKey: 'trustwallet.tronLink',
    e2eBaseUrlEnvVar: 'TRUST_E2E_BASE_URL',
    unlockPagePath: '/popup.html#/unlock',
    unlockFramePredicate: () => false,
};
