import { createViteConfig } from '@tronweb3/tronwallet-adapter-e2e-shared/config';
import { onekeyConfig } from './wallet-config.js';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const e2eDir = path.dirname(fileURLToPath(import.meta.url));
export default createViteConfig(onekeyConfig, e2eDir);
