import { GuardaAdapter } from '@tronweb3/tronwallet-adapters';
import { initHarness, getSecurityOptionsFromUrl } from '@tronweb3/tronwallet-adapter-e2e-shared/page';
import { guardaConfig } from '../wallet-config.js';

const searchParams = new URLSearchParams(window.location.search);
const openUrlWhenWalletNotFound = searchParams.get('openUrlWhenWalletNotFound') === 'true';
const securityOptions = getSecurityOptionsFromUrl(searchParams);

const adapter = new GuardaAdapter({
    openUrlWhenWalletNotFound,
    ...(securityOptions !== undefined ? { securityOptions } : {}),
});

initHarness(adapter, guardaConfig);
