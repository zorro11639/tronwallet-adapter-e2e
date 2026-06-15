import type { WalletE2EConfig } from '@tronweb3/tronwallet-adapter-e2e-shared';

export const tronlinkConfig: WalletE2EConfig = {
    walletId: 'tronlink',
    walletName: 'TronLink',
    providerIdentityKey: 'tron.isTronLink',
    e2eBaseUrlEnvVar: 'TRONLINK_E2E_BASE_URL',
    unlockPagePath: '/popup/popup.html#/login',
    unlockFramePredicate: () => false,
    capabilities: {
        switchChain: true,
        multiSign: true,
    },
};
