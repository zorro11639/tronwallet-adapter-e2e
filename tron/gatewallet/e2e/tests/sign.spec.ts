import { test, expect } from '../fixtures/index.js';
import { defineSignTests } from '@tronweb3/tronwallet-adapter-e2e-shared/specs';
import { gatewalletConfig } from '../wallet-config.js';

defineSignTests(test, expect, gatewalletConfig);
