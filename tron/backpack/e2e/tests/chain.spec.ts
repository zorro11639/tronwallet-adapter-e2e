import { test, expect, e2eEnv } from '../fixtures/index.js';
import { defineChainTests } from '@tronweb3/tronwallet-adapter-e2e-shared/specs';
import { backpackConfig } from '../wallet-config.js';

defineChainTests(test, expect, backpackConfig, e2eEnv);
