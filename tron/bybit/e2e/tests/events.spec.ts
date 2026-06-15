import { test, expect, e2eEnv } from '../fixtures/index.js';
import { defineEventsTests } from '@tronweb3/tronwallet-adapter-e2e-shared/specs';
import { bybitConfig } from '../wallet-config.js';

defineEventsTests(test, expect, bybitConfig, e2eEnv);
