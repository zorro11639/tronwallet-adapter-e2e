import fs from 'node:fs';
import path from 'node:path';
import type { WalletE2EConfig } from './types.js';
import { getWalletBaseUrl } from './config/ports.js';

/**
 * TRON network chain ids (hex strings emitted on `chainChanged` by the adapter):
 *   Mainnet → 0x2b6653dc
 *   Shasta  → 0x94a9059e
 *   Nile    → 0xcd8690dc
 */
export interface E2EEnv {
    e2eDir: string;
    packageRoot: string;
    walletPassword: string;
    /** Target chain id for tests (default Nile testnet). */
    testChainId: string;
    /** TronGrid fullHost URL for building unsigned transactions in the harness. */
    tronFullHost: string;
    /** Receiver TRON base58 address for the test transfer. */
    testReceiverAddress: string;
    /** Value transferred, in sun (1 TRX = 1_000_000 sun). */
    testValueSun: string;
    /** A chain id the wallet is unlikely to recognise — used for the negative switchChain test. */
    testUnknownChainId: string;
    baseURL: string;
}

function parseDotEnvValue(raw: string) {
    let value = raw.trim();
    if (value.length >= 2) {
        const first = value[0];
        const last = value[value.length - 1];
        if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
            return value.slice(1, -1);
        }
    }
    const inlineComment = value.match(/\s+#.*$/);
    if (inlineComment) {
        value = value.slice(0, inlineComment.index).trimEnd();
    }
    return value;
}

function loadDotEnv(e2eDir: string) {
    const envFile = path.resolve(e2eDir, '.env');
    if (fs.existsSync(envFile)) {
        for (const line of fs.readFileSync(envFile, 'utf-8').split('\n')) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;
            const eqIndex = trimmed.indexOf('=');
            if (eqIndex === -1) continue;
            const key = trimmed.slice(0, eqIndex).trim();
            const value = parseDotEnvValue(trimmed.slice(eqIndex + 1));
            if (!(key in process.env)) {
                process.env[key] = value;
            }
        }
    }
}

function expandPath(input: string) {
    if (input === '~' || input.startsWith('~/') || input.startsWith('~\\')) {
        return path.join(process.env.HOME || process.env.USERPROFILE || '~', input.slice(1));
    }
    return input;
}

function resolvePath(packageRoot: string, input: string) {
    const expanded = expandPath(input);
    return path.isAbsolute(expanded) ? expanded : path.resolve(packageRoot, expanded);
}

function getOptionalPath(packageRoot: string, name: string) {
    const value = process.env[name];
    return value ? resolvePath(packageRoot, value) : null;
}

function getRequiredPath(packageRoot: string, name: string) {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return resolvePath(packageRoot, value);
}

export function createEnvLoader(config: WalletE2EConfig, e2eDir: string) {
    const packageRoot = path.resolve(e2eDir, '..');
    const tronDir = path.resolve(packageRoot, '..');

    // Wallet-specific .env is loaded first so its values take priority.
    // Shared tron/.env fills in anything not already set.
    loadDotEnv(e2eDir);
    loadDotEnv(tronDir);

    // E2E_WALLETS_DIR is resolved relative to tronDir (where tron/.env lives).
    const walletsBaseDirRaw = process.env.E2E_WALLETS_DIR;
    const walletsBaseDir = walletsBaseDirRaw
        ? resolvePath(tronDir, walletsBaseDirRaw)
        : path.resolve(tronDir, 'e2e-data');

    const walletExtensionPath = path.join(walletsBaseDir, config.walletId, 'extensions');
    const walletProfileDir = path.join(walletsBaseDir, config.walletId, '.chromium-profile');

    const e2eEnv: E2EEnv = {
        e2eDir,
        packageRoot,
        walletPassword: process.env.WALLET_PASSWORD || '',
        testChainId: process.env.TEST_CHAIN_ID || '0xcd8690dc',
        tronFullHost: process.env.TRON_FULL_HOST || 'https://nile.trongrid.io',
        testReceiverAddress: process.env.TEST_RECEIVER_ADDRESS || 'TYukBQZ2XXCcRCReAUguyXncCWNY9CEiDQ',
        testValueSun: process.env.TEST_VALUE_SUN || '1000',
        testUnknownChainId: process.env.TEST_UNKNOWN_CHAIN_ID || '0xdeadbeef',
        baseURL: process.env[config.e2eBaseUrlEnvVar] || getWalletBaseUrl(config.walletId),
    };

    return {
        e2eEnv,
        walletExtensionPath,
        walletProfileDir,
        resolvePath: (input: string) => resolvePath(packageRoot, input),
        getOptionalPath: (name: string) => getOptionalPath(packageRoot, name),
        getRequiredPath: (name: string) => getRequiredPath(packageRoot, name),
    };
}
