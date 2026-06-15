import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import type { WalletE2EConfig } from '../types.js';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { getWalletPort } from './ports.js';

export function createViteConfig(config: WalletE2EConfig, e2eDir: string) {
    // PackageRoot is the root of the wallet package
    const packageRoot = path.resolve(e2eDir, '..');
    const port = getWalletPort(config.walletId);

    // Wallet-specific .env takes priority over shared tron/.env
    const tronDir = path.resolve(packageRoot, '..');
    const env = { ...loadEnv('', tronDir, ''), ...loadEnv('', e2eDir, '') };
    const adaptersPath =
        env.WALLET_ADAPTERS_PATH || process.env.WALLET_ADAPTERS_PATH || '@tronweb3/tronwallet-adapters';
    const alias: Record<string, string> = {};

    if (adaptersPath.startsWith('./') || adaptersPath.startsWith('../')) {
        alias['@tronweb3/tronwallet-adapters'] = path.resolve(packageRoot, '../../', adaptersPath);
    }
    return defineConfig({
        root: path.resolve(e2eDir, 'pages'),
        resolve: {
            alias,
        },
        plugins: [
            nodePolyfills({
                include: ['crypto', 'stream', 'buffer', 'util', 'events'],
                globals: { Buffer: true, global: true, process: true },
            }),
        ],
        server: {
            host: '127.0.0.1',
            port,
            strictPort: true,
        },
        preview: {
            host: '127.0.0.1',
            port,
            strictPort: true,
        },
        build: {
            outDir: path.resolve(e2eDir, '.vite-dist'),
            emptyOutDir: true,
        },
    });
}
