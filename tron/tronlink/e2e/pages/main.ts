import { TronLinkAdapter } from '@tronweb3/tronwallet-adapters';
import { initHarness, getSecurityOptionsFromUrl } from '@tronweb3/tronwallet-adapter-e2e-shared/page';
import { tronlinkConfig } from '../wallet-config.js';

const searchParams = new URLSearchParams(window.location.search);
const openUrlWhenWalletNotFound = searchParams.get('openUrlWhenWalletNotFound') === 'true';
const securityOptions = getSecurityOptionsFromUrl(searchParams);

const adapter = new TronLinkAdapter({
    openUrlWhenWalletNotFound,
    checkTimeout: 1000,
    ...(securityOptions !== undefined ? { securityOptions } : {}),
});

initHarness(adapter, tronlinkConfig);
