import type { WalletE2EConfig } from '@tronweb3/tronwallet-adapter-e2e-shared';

export const metamaskTronConfig: WalletE2EConfig = {
    walletId: 'metamask',
    walletName: 'MetaMask',
    providerIdentityKey: 'ethereum.isMetaMask',
    e2eBaseUrlEnvVar: 'METAMASK_TRON_E2E_BASE_URL',
    unlockPagePath: '/home.html',
    unlockFramePredicate: () => false,
};
