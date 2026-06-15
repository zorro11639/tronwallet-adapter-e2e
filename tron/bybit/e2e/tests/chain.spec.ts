import { test, expect, e2eEnv } from '../fixtures/index.js';
import { defineChainTests } from '@tronweb3/tronwallet-adapter-e2e-shared/specs';
import { bybitConfig } from '../wallet-config.js';

defineChainTests(test, expect, bybitConfig, e2eEnv);
