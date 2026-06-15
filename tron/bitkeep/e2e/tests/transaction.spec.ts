import { test, expect } from '../fixtures/index.js';
import { defineTransactionTests } from '@tronweb3/tronwallet-adapter-e2e-shared/specs';
import { bitkeepConfig } from '../wallet-config.js';

defineTransactionTests(test, expect, bitkeepConfig);
