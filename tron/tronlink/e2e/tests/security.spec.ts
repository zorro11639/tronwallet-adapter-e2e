import { test, expect } from '../fixtures/index.js';
import { defineSecurityTests } from '@tronweb3/tronwallet-adapter-e2e-shared/specs';
import { tronlinkConfig } from '../wallet-config.js';

defineSecurityTests(test, expect, tronlinkConfig);
