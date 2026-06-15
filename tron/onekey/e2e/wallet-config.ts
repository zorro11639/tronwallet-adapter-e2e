import type { WalletE2EConfig } from '@tronweb3/tronwallet-adapter-e2e-shared';

export const onekeyConfig: WalletE2EConfig = {
    walletId: 'onekey',
    walletName: 'OneKey',
    providerIdentityKey: '$onekey.tron',
    e2eBaseUrlEnvVar: 'ONEKEY_E2E_BASE_URL',
    unlockPagePath: '/ui-expand-tab.html#/unlock',
    unlockFramePredicate: () => false,
    confirmAcknowledgeText: 'Proceed at my own risk',
};
