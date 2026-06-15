import type { WalletE2EConfig } from '@tronweb3/tronwallet-adapter-e2e-shared';

export const gatewalletConfig: WalletE2EConfig = {
    walletId: 'gatewallet',
    walletName: 'Gate Wallet',
    providerIdentityKey: 'gatewallet.tronLink',
    e2eBaseUrlEnvVar: 'GATE_WALLET_E2E_BASE_URL',
    unlockPagePath: '/popup.html#/unlock',
    unlockFramePredicate: () => false,
};
