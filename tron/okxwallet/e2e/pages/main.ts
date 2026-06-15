import { OkxWalletAdapter } from '@tronweb3/tronwallet-adapters';
import { initHarness, getSecurityOptionsFromUrl } from '@tronweb3/tronwallet-adapter-e2e-shared/page';
import { okxwalletConfig } from '../wallet-config.js';

const searchParams = new URLSearchParams(window.location.search);
const openUrlWhenWalletNotFound = searchParams.get('openUrlWhenWalletNotFound') === 'true';
const securityOptions = getSecurityOptionsFromUrl(searchParams);

const adapter = new OkxWalletAdapter({
    openUrlWhenWalletNotFound,
    ...(securityOptions !== undefined ? { securityOptions } : {}),
});

initHarness(adapter, okxwalletConfig);
