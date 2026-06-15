import { test, expect } from '../fixtures/index.js';
import { defineDiscoveryTests } from '@tronweb3/tronwallet-adapter-e2e-shared/specs';
import { binanceConfig } from '../wallet-config.js';

defineDiscoveryTests(test, expect, binanceConfig);
