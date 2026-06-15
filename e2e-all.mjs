#!/usr/bin/env node

/**
 * Run all wallet e2e test suites sequentially.
 * Any extra arguments are forwarded to each wallet's `pnpm e2e` command,
 * so you can filter tests across all wallets at once.
 *
 * Usage:
 *   node e2e-all.mjs                              # run all wallets
 *   node e2e-all.mjs --grep "connect"             # only tests matching "connect"
 *   node e2e-all.mjs --project chromium           # specific project
 *   node e2e-all.mjs --grep "sign" --headed       # multiple flags
 */

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const WALLETS = [
    'tronlink',
    'okxwallet',
    'bitkeep',
    'bybit',
    'gatewallet',
    'guarda',
    'onekey',
    'tokenpocket',
    'trust',
    'metamask',
    'binance',
    'backpack',
];

const rootDir = path.dirname(fileURLToPath(import.meta.url));

// Arguments after the script name are forwarded verbatim to each wallet's e2e command.
const extraArgs = process.argv.slice(2);

const failed = [];
const passed = [];

const divider = '━'.repeat(60);

for (const wallet of WALLETS) {
    const walletDir = path.join(rootDir, 'tron', wallet);

    console.log(`\n${divider}`);
    console.log(`🚀  ${wallet}`);
    console.log(divider);

    // pnpm e2e [-- <extraArgs>]
    // The '--' separator tells pnpm to forward the remaining args to playwright.
    const pnpmArgs = extraArgs.length > 0 ? ['e2e', ...extraArgs] : ['e2e'];

    const result = spawnSync('pnpm', pnpmArgs, {
        cwd: walletDir,
        stdio: 'inherit',
        shell: false,
    });

    if (result.status === 0) {
        passed.push(wallet);
    } else {
        console.error(`\n❌  ${wallet} failed (exit ${result.status ?? 'signal'})`);
        failed.push(wallet);
    }
}

console.log(`\n${divider}`);
console.log(`Results: ${passed.length} passed, ${failed.length} failed`);
if (failed.length > 0) {
    console.error(`❌  Failed: ${failed.join(', ')}`);
    process.exit(1);
} else {
    console.log(`✅  All wallets passed`);
}
