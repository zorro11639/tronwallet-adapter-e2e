import type { WalletE2EConfig } from '@tronweb3/tronwallet-adapter-e2e-shared';

export const bitkeepConfig: WalletE2EConfig = {
    walletId: 'bitkeep',
    walletName: 'Bitget Wallet',
    providerIdentityKey: 'bitkeep.tron.isBitKeepChrome',
    e2eBaseUrlEnvVar: 'BITGET_E2E_BASE_URL',
    unlockPagePath: '/popup.html#/unlock',
    unlockFramePredicate: () => false,
    unlockButtonNames: [/Unlock wallet/i],
};
