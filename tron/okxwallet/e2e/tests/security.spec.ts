import { test, expect } from '../fixtures/index.js';
import { defineSecurityTests } from '@tronweb3/tronwallet-adapter-e2e-shared/specs';
import { okxwalletConfig } from '../wallet-config.js';

defineSecurityTests(test, expect, okxwalletConfig);
