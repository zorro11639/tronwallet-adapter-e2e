import { test, expect } from '../fixtures/index.js';
import { defineTransactionTests } from '@tronweb3/tronwallet-adapter-e2e-shared/specs';
import { tronlinkConfig } from '../wallet-config.js';

defineTransactionTests(test, expect, tronlinkConfig);
