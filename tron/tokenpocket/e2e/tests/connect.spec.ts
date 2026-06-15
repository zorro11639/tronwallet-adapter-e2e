import { test, expect } from '../fixtures/index.js';
import { defineConnectTests } from '@tronweb3/tronwallet-adapter-e2e-shared/specs';
import { tokenpocketConfig } from '../wallet-config.js';

defineConnectTests(test, expect, tokenpocketConfig);
