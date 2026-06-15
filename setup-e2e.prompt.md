---
description: 'Scaffold E2E test infrastructure for a TRON wallet adapter (e2e-shared + wallet e2e directory)'
---

# Setup E2E Test Infrastructure (TRON Wallet)

This skill creates the two directories required to run E2E tests for a TRON wallet adapter:

1. `tron/e2e-shared/` — shared Playwright scaffold (package, setup script, fixtures, specs, page harness)
2. `tron/<walletId>/e2e/` — wallet-specific test configuration, fixtures, pages, and spec files

## Project Root

This prompt file lives at `<PROJECT_ROOT>/setup-e2e.prompt.md`.
Determine the **project root** by finding the directory that contains `pnpm-workspace.yaml`.

## Input

The user will specify a wallet ID: `tronlink`, `metamask`, `trust`, `bitkeep`, `bybit`, `gatewallet`, `guarda`, `okxwallet`, `onekey`, `tokenpocket`, `binance`, or `backpack`.

## Wallet Reference

All TRON wallet adapters extend `Adapter` from `@tronweb3/tronwallet-abstract-adapter`. The adapter API is:

```ts
interface AdapterProps {
    name;
    url;
    icon;
    readyState;
    state;
    address;
    connecting;
    connected;
    connect(options?);
    disconnect();
    signMessage(message);
    signTransaction(tx);
    switchChain(chainId);
    multiSign?(tx, options); // only on some wallets
}
```

| Wallet      | walletId    | walletName     | windowProviderKey      | providerIdentityKey | Chrome Extension ID              | Adapter Class          |
| ----------- | ----------- | -------------- | ---------------------- | ------------------- | -------------------------------- | ---------------------- |
| TronLink    | tronlink    | TronLink       | `tronLink`             | `isTronLink`        | ibnejdfjmmkpcnlpebklmnkoeoihofec | `TronLinkAdapter`      |
| OKX         | okxwallet   | OKX Wallet     | `okxwallet.tronLink`   | `tronWeb`           | mcohilncbfahbmgdjkbpemcciiolgcge | `OkxWalletAdapter`     |
| Bitget      | bitkeep     | Bitget Wallet  | `bitkeep.tron`         | `isBitKeepChrome`   | jiidiaalihmmhddjgbnbgdfflelocpak | `BitgetWalletAdapter`  |
| Bybit       | bybit       | Bybit Wallet   | `bybitWallet.tronLink` | `tronWeb`           | pdliaogehgdbhbnmkklieghmmjkpigpa | `BybitWalletAdapter`   |
| Gate        | gatewallet  | Gate Wallet    | `gatewallet.tron`      | `isTronLink`        | cpmkedoipcpimgecpmgpldfpohjplkpp | `GateWalletAdapter`    |
| Guarda      | guarda      | Guarda         | `guarda`               | `tron`              | hpglfhgfnhbgpjdenjgmdgoeiappafln | `GuardaAdapter`        |
| OneKey      | onekey      | OneKey         | `$onekey.tron`         | `isOneKey`          | jnmbobjmhlngoefaiojfljckilhhlhcj | `OneKeyAdapter`        |
| TokenPocket | tokenpocket | TokenPocket    | `tokenpocket.tron`     | `isTokenPocket`     | mfgccjchihfkkindfppnaooecgfneiii | `TokenPocketAdapter`   |
| Trust       | trust       | Trust Wallet   | `trustwallet.tron`     | `isTrust`           | egjidjbpglichdcondbcbdnbeeppgdph | `TrustAdapter`         |
| MetaMask    | metamask    | MetaMask       | (Snap)                 | `isMetaMask`        | nkbihfbeogaeaoehlefnkodbefgpgknn | `MetaMaskAdapter`      |
| Binance     | binance     | Binance Wallet | `binancew3w.tron`      | `isBinance`         | cadiboklkpojfamcoggejbbdjcoiljjk | `BinanceWalletAdapter` |
| Backpack    | backpack    | Backpack       | `backpack.tron`        | `isBackpack`        | aflkmfhebedbjioipglgcbcmnbpgliof | `BackpackAdapter`      |

> **Note:** Some `providerIdentityKey` values may not exist on every wallet's injected provider; in that case, the harness's identity check returns `false` and the discovery test asserts only `providerFound`. Confirm the exact key by inspecting the wallet's injected `tronLink` / `tronWeb` provider in the browser DevTools.

Capabilities (set `false` to skip related tests):

-   `guarda`: `multiSign: false`
-   `gatewallet`: `multiSign: false`
-   `onekey`: `multiSign: false`
-   `binance`: `switchChain: false`, `multiSign: false`
-   `backpack`: `multiSign: false` (the adapter throws `WalletSignTransactionError` — multiSign is not implemented), `switchChain: false`
-   Others: all defaults (`false`)

## Step 1: Create `tron/e2e-shared/`

Skip this step if the directory already exists and contains `package.json`.

Create every file listed below **exactly as shown**. Preserve indentation and formatting precisely.

### `e2e-shared/package.json`

```json
{
    "name": "@tronweb3/tronwallet-adapter-e2e-shared",
    "version": "0.0.1",
    "description": "Internal Playwright E2E scaffold for TRON wallet adapters. Workspace-only; not published.",
    "private": true,
    "license": "MIT",
    "type": "module",
    "exports": {
        ".": {
            "types": "./lib/index.d.ts",
            "import": "./lib/index.js"
        },
        "./page": {
            "types": "./lib/page/harness.d.ts",
            "import": "./lib/page/harness.js"
        },
        "./specs": {
            "types": "./lib/specs/index.d.ts",
            "import": "./lib/specs/index.js"
        },
        "./config": {
            "types": "./lib/config/index.d.ts",
            "import": "./lib/config/index.js"
        }
    },
    "files": ["src", "lib"],
    "scripts": {
        "build": "tsc",
        "watch": "tsc --watch"
    },
    "dependencies": {
        "@playwright/test": "1.49.1"
    },
    "devDependencies": {
        "tronweb": "^6.3.0",
        "typescript": "^5.0.0",
        "vite": "6.4.2",
        "vite-plugin-node-polyfills": "0.24.0"
    }
}
```

### `e2e-shared/tsconfig.json`

```json
{
    "compilerOptions": {
        "target": "ES2022",
        "module": "NodeNext",
        "moduleResolution": "NodeNext",
        "strict": true,
        "esModuleInterop": true,
        "skipLibCheck": true,
        "forceConsistentCasingInFileNames": true,
        "declaration": true,
        "declarationMap": true,
        "sourceMap": true,
        "outDir": "lib",
        "rootDir": "src"
    },
    "include": ["src"]
}
```

### `e2e-shared/src/index.ts`

```ts
// Types
export type {
    AdapterActionName,
    AdapterEventEntry,
    AdapterResultSnapshot,
    AdapterHarnessConfig,
    AdapterSnapshot,
    WalletE2EConfig,
    WalletE2ECapabilities,
} from './types.js';
export {
    DEFAULT_CONFIRM_BUTTON_NAMES,
    DEFAULT_REJECT_BUTTON_NAMES,
    DEFAULT_UNLOCK_BUTTON_NAMES,
    resolveCapabilities,
} from './types.js';

// Env
export { createEnvLoader, type E2EEnv } from './env.js';

// Fixtures
export { createE2EFixtures } from './fixtures/create-fixtures.js';
export { WalletPopupController } from './fixtures/wallet-popup.js';
export { AdapterE2EPage } from './fixtures/test-page.js';

// Helpers
export {
    connectWallet,
    ensureChain,
    expectTronAddress,
    expectHexSignature,
    expectSignedTransaction,
} from './helpers/test-helpers.js';
```

### `e2e-shared/src/types.ts`

```ts
// ── Adapter harness types (shared between Node test runner and browser page) ──

export type AdapterActionName =
    | 'resetState'
    | 'getProvider'
    | 'connect'
    | 'disconnect'
    | 'signMessage'
    | 'signTransaction'
    | 'multiSign'
    | 'switchChain';

export interface AdapterEventEntry {
    name: string;
    payload: unknown;
    timestamp: string;
}

export interface AdapterResultSnapshot {
    lastAction: string;
    status: 'idle' | 'pending' | 'success' | 'error';
    value: string;
    errorName: string;
    errorMessage: string;
    errorCode: number | null;
}

export interface AdapterHarnessConfig {
    scenario: string;
    useDeeplink: boolean;
    openUrlWhenWalletNotFound: boolean;
}

export interface AdapterSnapshot {
    config: AdapterHarnessConfig;
    readyState: string;
    state: string;
    address: string | null;
    connected: boolean;
    chainId: string;
    providerFound: boolean | null;
    providerIdentityCheck: boolean | null;
    result: AdapterResultSnapshot;
    events: AdapterEventEntry[];
}

// ── Wallet E2E config (provided by each wallet adapter) ──

export interface WalletE2ECapabilities {
    /** Whether the wallet supports multiSign. Default: true. */
    multiSign?: boolean;
    /** Whether the wallet supports switchChain. Default: true. */
    switchChain?: boolean;
}

export interface WalletE2EConfig {
    walletId: string;
    walletName: string;
    /** Property on the injected provider used to verify wallet identity (e.g. `isTronLink`). */
    providerIdentityKey: string;
    e2eBaseUrlEnvVar: string;
    unlockPagePath: string;
    unlockFramePredicate: (frameUrl: string, extensionOrigin: string) => boolean;
    confirmButtonNames?: RegExp[];
    rejectButtonNames?: RegExp[];
    unlockButtonNames?: RegExp[];
    capabilities?: WalletE2ECapabilities;
}

// ── Default button name patterns ──

export const DEFAULT_CONFIRM_BUTTON_NAMES: RegExp[] = [
    /^next$/i,
    /^connect$/i,
    /^approve$/i,
    /^confirm$/i,
    /^sign$/i,
    /^ok$/i,
    /^done$/i,
    /^submit$/i,
    /^allow$/i,
    /^accept$/i,
];

export const DEFAULT_REJECT_BUTTON_NAMES: RegExp[] = [/^reject$/i, /^cancel$/i, /^close$/i, /^not now$/i, /^deny$/i];

export const DEFAULT_UNLOCK_BUTTON_NAMES: RegExp[] = [/^unlock$/i, /^log in$/i, /^login$/i, /^confirm$/i, /^submit$/i];

export function resolveCapabilities(config: WalletE2EConfig): Required<WalletE2ECapabilities> {
    return {
        multiSign: config.capabilities?.multiSign ?? true,
        switchChain: config.capabilities?.switchChain ?? true,
    };
}
```

### `e2e-shared/src/env.ts`

```ts
import fs from 'node:fs';
import path from 'node:path';
import type { WalletE2EConfig } from './types.js';

/**
 * TRON network chain ids (hex strings emitted on `chainChanged` by the adapter):
 *   Mainnet → 0x2b6653dc
 *   Shasta  → 0x94a9059e
 *   Nile    → 0xcd8690dc
 */
export interface E2EEnv {
    e2eDir: string;
    packageRoot: string;
    extensionPath: string | null;
    userDataDir: string | null;
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

function resolvePath(packageRoot: string, input: string) {
    return path.isAbsolute(input) ? input : path.resolve(packageRoot, input);
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

    const e2eEnv: E2EEnv = {
        e2eDir,
        packageRoot,
        extensionPath: getOptionalPath(packageRoot, 'WALLET_EXTENSION_PATH'),
        userDataDir: getOptionalPath(packageRoot, 'CHROMIUM_USER_DATA_DIR'),
        walletPassword: process.env.WALLET_PASSWORD || '',
        testChainId: process.env.TEST_CHAIN_ID || '0xcd8690dc',
        tronFullHost: process.env.TRON_FULL_HOST || 'https://nile.trongrid.io',
        testReceiverAddress: process.env.TEST_RECEIVER_ADDRESS || 'TYukBQZ2XXCcRCReAUguyXncCWNY9CEiDQ',
        testValueSun: process.env.TEST_VALUE_SUN || '1000',
        testUnknownChainId: process.env.TEST_UNKNOWN_CHAIN_ID || '0xdeadbeef',
        baseURL: process.env[config.e2eBaseUrlEnvVar] || 'http://127.0.0.1:4174',
    };

    return {
        e2eEnv,
        resolvePath: (input: string) => resolvePath(packageRoot, input),
        getOptionalPath: (name: string) => getOptionalPath(packageRoot, name),
        getRequiredPath: (name: string) => getRequiredPath(packageRoot, name),
    };
}
```

### `e2e-shared/src/config/index.ts`

```ts
export { createViteConfig } from './vite.js';
export { createPlaywrightConfig } from './playwright.js';
```

### `e2e-shared/src/config/vite.ts`

```ts
import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import type { WalletE2EConfig } from '../types.js';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export function createViteConfig(_config: WalletE2EConfig, e2eDir: string) {
    const packageRoot = path.resolve(e2eDir, '..');

    // Wallet-specific .env takes priority over shared tron/.env
    const tronDir = path.resolve(packageRoot, '..');
    const env = { ...loadEnv('', tronDir, ''), ...loadEnv('', e2eDir, '') };
    const adaptersPath =
        env.WALLET_ADAPTERS_PATH || process.env.WALLET_ADAPTERS_PATH || '@tronweb3/tronwallet-adapters';
    const alias: Record<string, string> = {};

    if (adaptersPath.startsWith('./') || adaptersPath.startsWith('../')) {
        alias['@tronweb3/tronwallet-adapters'] = path.resolve(tronDir, adaptersPath);
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
            port: 4174,
            strictPort: true,
        },
        preview: {
            host: '127.0.0.1',
            port: 4174,
            strictPort: true,
        },
        build: {
            outDir: path.resolve(e2eDir, '.vite-dist'),
            emptyOutDir: true,
        },
    });
}
```

### `e2e-shared/src/config/playwright.ts`

```ts
import path from 'node:path';
import { defineConfig } from '@playwright/test';
import type { WalletE2EConfig } from '../types.js';

export function createPlaywrightConfig(config: WalletE2EConfig, e2eDir: string) {
    const packageRoot = path.resolve(e2eDir, '..');
    const baseURL = process.env[config.e2eBaseUrlEnvVar] || 'http://127.0.0.1:4174';
    const viteConfigRelPath = path.relative(packageRoot, path.join(e2eDir, 'vite.config.ts'));

    return defineConfig({
        testDir: path.resolve(e2eDir, 'tests'),
        timeout: 90_000,
        expect: {
            timeout: 15_000,
        },
        fullyParallel: false,
        workers: 1,
        forbidOnly: !!process.env.CI,
        retries: 0,
        reporter: [['list'], ['html', { open: 'never', outputFolder: path.resolve(e2eDir, 'playwright-report') }]],
        use: {
            baseURL,
            headless: false,
            trace: 'retain-on-failure',
            screenshot: 'only-on-failure',
            video: 'retain-on-failure',
        },
        webServer: {
            command: `pnpm exec vite --configLoader runner --config ${viteConfigRelPath} --host 127.0.0.1 --port 4174`,
            cwd: packageRoot,
            url: baseURL,
            reuseExistingServer: !process.env.CI,
            timeout: 120_000,
            stdout: 'pipe',
        },
        projects: [
            {
                name: 'with-extension',
            },
            {
                name: 'without-extension',
                testMatch: /discovery\.spec\.ts$/,
            },
        ],
    });
}
```

### `e2e-shared/src/fixtures/create-fixtures.ts`

```ts
import fs from 'node:fs/promises';
import { chromium, expect, test as base } from '@playwright/test';
import type { WalletE2EConfig } from '../types.js';
import { createEnvLoader, type E2EEnv } from '../env.js';
import { createIsolatedUserDataDir, getExtensionOrigin, isExtensionWorkerUrl } from './context-helpers.js';
import { WalletPopupController, unlockWalletIfNeeded } from './wallet-popup.js';
import { AdapterE2EPage } from './test-page.js';

type Fixtures = {
    app: AdapterE2EPage;
    walletPopup: WalletPopupController;
};

export function createE2EFixtures(config: WalletE2EConfig, e2eDir: string) {
    const { e2eEnv, getRequiredPath } = createEnvLoader(config, e2eDir);

    const test = base.extend<Fixtures>({
        context: async ({ browser }, use, testInfo) => {
            if (testInfo.project.name === 'with-extension') {
                const extensionPath = getRequiredPath('WALLET_EXTENSION_PATH');
                const templateUserDataDir = getRequiredPath('CHROMIUM_USER_DATA_DIR');
                const runUserDataDir = await createIsolatedUserDataDir(config, templateUserDataDir);

                const context = await chromium.launchPersistentContext(runUserDataDir, {
                    channel: 'chromium',
                    headless: false,
                    args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
                });

                const extensionWorker =
                    context.serviceWorkers().find((worker) => isExtensionWorkerUrl(worker.url())) ||
                    (await context
                        .waitForEvent('serviceworker', {
                            timeout: 15_000,
                            predicate: (worker) => isExtensionWorkerUrl(worker.url()),
                        })
                        .catch(() => null));

                if (!extensionWorker) {
                    throw new Error(`The ${config.walletName} extension service worker did not start in time.`);
                }

                await unlockWalletIfNeeded(context, getExtensionOrigin(extensionWorker.url()), config, e2eEnv);

                try {
                    await use(context);
                } finally {
                    await context.close();
                    await fs.rm(runUserDataDir, { recursive: true, force: true });
                }
                return;
            }

            const context = await browser.newContext();
            try {
                await use(context);
            } finally {
                await context.close();
            }
        },
        app: async ({ context, baseURL }, use) => {
            if (!baseURL) {
                throw new Error('Playwright baseURL is required for the E2E test page.');
            }
            const page = await context.newPage();
            const app = new AdapterE2EPage(page, baseURL, config, e2eEnv);
            await app.goto();
            await use(app);
            await page.close();
        },
        walletPopup: async ({ context }, use) => {
            await use(new WalletPopupController(context, config, e2eEnv));
        },
    });

    return { test, expect, e2eEnv };
}
```

### `e2e-shared/src/fixtures/context-helpers.ts`

```ts
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { Frame, Page } from '@playwright/test';
import type { WalletE2EConfig } from '../types.js';

const EXTENSION_PROTOCOL = 'chrome-extension://';

export async function createIsolatedUserDataDir(config: WalletE2EConfig, templateDir: string) {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), `${config.walletId}-e2e-`));
    await fs.cp(templateDir, tempDir, { recursive: true });
    return tempDir;
}

export function isExtensionPage(page: Page) {
    return page.url().startsWith(EXTENSION_PROTOCOL);
}

export function isExtensionWorkerUrl(url: string) {
    return url.startsWith(EXTENSION_PROTOCOL);
}

export function getExtensionOrigin(url: string) {
    return new URL(url).origin;
}

type PageLike = Page | Frame;

export async function locatorVisible(target: PageLike, name: RegExp) {
    const byRole = target.getByRole('button', { name }).first();
    try {
        await byRole.waitFor({ state: 'visible', timeout: 1_500 });
        return byRole;
    } catch {
        const byText = target.getByText(name, { exact: false }).first();
        try {
            await byText.waitFor({ state: 'visible', timeout: 500 });
            return byText;
        } catch {
            return null;
        }
    }
}

export async function clickMatchingButton(page: Page, names: RegExp[]) {
    const targets: PageLike[] = [page, ...page.frames()];

    for (const target of targets) {
        for (const name of names) {
            const locator = await locatorVisible(target, name);
            if (locator) {
                await locator.click();
                return true;
            }
        }
    }

    return false;
}
```

### `e2e-shared/src/fixtures/wallet-popup.ts`

```ts
import { expect, type BrowserContext, type Frame, type Page } from '@playwright/test';
import type { WalletE2EConfig } from '../types.js';
import { DEFAULT_CONFIRM_BUTTON_NAMES, DEFAULT_REJECT_BUTTON_NAMES, DEFAULT_UNLOCK_BUTTON_NAMES } from '../types.js';
import { clickMatchingButton, isExtensionPage, locatorVisible } from './context-helpers.js';
import type { E2EEnv } from '../env.js';

type WalletAction = 'confirm' | 'reject';
type PopupMode = 'required' | 'optional';

async function ensureNotLocked(page: Page, config: WalletE2EConfig) {
    const targets: (Page | Frame)[] = [page, ...page.frames()];

    for (const target of targets) {
        const passwordField = target.locator('input[type="password"]').first();
        if (await passwordField.isVisible().catch(() => false)) {
            throw new Error(
                `The ${config.walletName} profile is locked. Unlock the template profile before running the first version of the E2E suite.`
            );
        }
    }
}

async function unlockTargetIfNeeded(target: Page | Frame, config: WalletE2EConfig, e2eEnv: E2EEnv) {
    const unlockNames = config.unlockButtonNames ?? DEFAULT_UNLOCK_BUTTON_NAMES;
    const passwordField = target.locator('input[type="password"]').first();
    const locked = await passwordField.isVisible().catch(() => false);
    if (!locked) {
        return false;
    }

    if (!e2eEnv.walletPassword) {
        throw new Error(
            `The ${config.walletName} profile is locked. Set WALLET_PASSWORD so the E2E fixture can unlock the wallet automatically.`
        );
    }

    await passwordField.fill(e2eEnv.walletPassword);

    for (const name of unlockNames) {
        const button = await locatorVisible(target, name);
        if (button) {
            await button.click();
            await expect(passwordField).not.toBeVisible({ timeout: 15_000 });
            return true;
        }
    }

    await passwordField.press('Enter');
    await expect(passwordField).not.toBeVisible({ timeout: 15_000 });
    return true;
}

export async function unlockWalletIfNeeded(
    context: BrowserContext,
    extensionOrigin: string,
    config: WalletE2EConfig,
    e2eEnv: E2EEnv
) {
    const page = await context.newPage();

    try {
        await page.goto(`${extensionOrigin}${config.unlockPagePath}`);
        await page.waitForLoadState('domcontentloaded');

        const readyDeadline = Date.now() + 15_000;
        let unlockTarget: Page | Frame = page.mainFrame();
        while (Date.now() < readyDeadline) {
            const iframe = page.frames().find((frame) => config.unlockFramePredicate(frame.url(), extensionOrigin));
            const candidate: Page | Frame = iframe ?? page.mainFrame();
            const passwordField = candidate.locator('input[type="password"]').first();
            if (await passwordField.isVisible().catch(() => false)) {
                unlockTarget = candidate;
                break;
            }
            await page.waitForTimeout(250).catch(() => {});
        }

        await unlockTargetIfNeeded(unlockTarget, config, e2eEnv);
    } finally {
        await page.close().catch(() => {});
    }
}

export class WalletPopupController {
    constructor(
        private readonly context: BrowserContext,
        private readonly config: WalletE2EConfig,
        private readonly e2eEnv: E2EEnv
    ) {}

    async completePendingRequest(
        trigger: () => Promise<unknown>,
        action: WalletAction,
        options: { popupMode?: PopupMode; timeoutMs?: number } = {}
    ) {
        const popupMode = options.popupMode || 'required';
        const timeoutMs = options.timeoutMs || (popupMode === 'required' ? 20_000 : 3_000);
        const knownPages = new Set(this.context.pages());
        const popupPromise = this.context.waitForEvent('page', {
            timeout: timeoutMs,
            predicate: (page) => isExtensionPage(page) && !knownPages.has(page),
        });

        const triggerPromise = Promise.resolve().then(trigger);

        let popup: Page | null = null;
        try {
            popup = await popupPromise;
        } catch (error) {
            if (popupMode === 'required') {
                await triggerPromise.catch(() => {});
                throw error;
            }
        }

        if (!popup) {
            await triggerPromise;
            return;
        }

        await popup.waitForLoadState('domcontentloaded');
        await popup.waitForTimeout(1_000);

        const unlockedTargets = [popup, ...popup.frames()];
        let unlockedPopup = false;
        for (const target of unlockedTargets) {
            if (await unlockTargetIfNeeded(target, this.config, this.e2eEnv)) {
                unlockedPopup = true;
                await popup.waitForLoadState('domcontentloaded').catch(() => {});
                await popup.waitForTimeout(1_000).catch(() => {});
                break;
            }
        }

        if (!unlockedPopup) {
            await ensureNotLocked(popup, this.config);
        }

        const confirmNames = this.config.confirmButtonNames ?? DEFAULT_CONFIRM_BUTTON_NAMES;
        const rejectNames = this.config.rejectButtonNames ?? DEFAULT_REJECT_BUTTON_NAMES;
        const names = action === 'confirm' ? confirmNames : rejectNames;
        let clickedAny = false;

        for (let step = 0; step < 5; step += 1) {
            const clicked = await clickMatchingButton(popup, names);
            if (!clicked) {
                break;
            }

            clickedAny = true;
            if (popup.isClosed()) {
                break;
            }

            await popup.waitForLoadState('domcontentloaded').catch(() => {});
        }

        if (!clickedAny) {
            void triggerPromise.catch(() => {});
            throw new Error(`Unable to locate a visible "${action}" button in the ${this.config.walletName} popup.`);
        }

        await triggerPromise;
    }
}
```

### `e2e-shared/src/fixtures/test-page.ts`

```ts
import { expect, type Page } from '@playwright/test';
import type { AdapterActionName, AdapterSnapshot, WalletE2EConfig } from '../types.js';
import type { E2EEnv } from '../env.js';

export class AdapterE2EPage {
    private readonly globalName: string;

    constructor(
        private readonly page: Page,
        private readonly baseURL: string,
        private readonly config: WalletE2EConfig,
        private readonly e2eEnv: E2EEnv
    ) {
        this.globalName = `${config.walletId}AdapterE2E`;
    }

    async goto() {
        const url = new URL(this.baseURL);
        url.searchParams.set('chainId', this.e2eEnv.testChainId);
        url.searchParams.set('receiver', this.e2eEnv.testReceiverAddress);
        url.searchParams.set('value', this.e2eEnv.testValueSun);
        url.searchParams.set('fullHost', this.e2eEnv.tronFullHost);
        await this.page.goto(url.toString());
        await expect(this.page.getByTestId('adapter-name')).toHaveText(/\S+/);
    }

    async runAction(action: AdapterActionName) {
        return this.page.evaluate(
            async ({ globalName, nextAction }) => {
                return (window as unknown as Record<string, { runAction(a: string): Promise<unknown> }>)[
                    globalName
                ].runAction(nextAction);
            },
            { globalName: this.globalName, nextAction: action }
        );
    }

    async getSnapshot(): Promise<AdapterSnapshot> {
        return this.page.evaluate(
            ({ globalName }) => {
                return (window as unknown as Record<string, { getSnapshot(): AdapterSnapshot }>)[
                    globalName
                ].getSnapshot();
            },
            { globalName: this.globalName }
        );
    }

    async clearEvents() {
        await this.page.evaluate(
            ({ globalName }) => {
                (window as unknown as Record<string, { clearEvents(): void }>)[globalName].clearEvents();
            },
            { globalName: this.globalName }
        );
    }

    async setField(name: 'switchChain' | 'receiver' | 'value' | 'message', value: string) {
        await this.page.evaluate(
            ({ globalName, key, nextValue }) => {
                (window as unknown as Record<string, { setField(n: string, v: string): void }>)[globalName].setField(
                    key,
                    nextValue
                );
            },
            { globalName: this.globalName, key: name, nextValue: value }
        );
    }
}
```

### `e2e-shared/src/helpers/test-helpers.ts`

```ts
import { expect } from '@playwright/test';
import type { AdapterE2EPage } from '../fixtures/test-page.js';
import type { WalletPopupController } from '../fixtures/wallet-popup.js';

export async function connectWallet(app: AdapterE2EPage, walletPopup: WalletPopupController) {
    await walletPopup.completePendingRequest(() => app.runAction('connect'), 'confirm');
    await expect
        .poll(async () => {
            const snapshot = await app.getSnapshot();
            return snapshot.connected;
        })
        .toBe(true);
    return app.getSnapshot();
}

export async function ensureChain(app: AdapterE2EPage, walletPopup: WalletPopupController, targetChainId: string) {
    const initialSnapshot = await app.getSnapshot();
    if (initialSnapshot.chainId.toLowerCase() === targetChainId.toLowerCase()) {
        return initialSnapshot;
    }

    await app.setField('switchChain', targetChainId);
    await walletPopup.completePendingRequest(() => app.runAction('switchChain'), 'confirm', { popupMode: 'optional' });

    await expect
        .poll(async () => {
            const snapshot = await app.getSnapshot();
            return snapshot.chainId;
        })
        .toBe(targetChainId);

    return app.getSnapshot();
}

/** TRON base58 addresses start with "T" and are 34 characters long. */
export function expectTronAddress(value: string | null) {
    expect(value || '').toMatch(/^T[1-9A-HJ-NP-Za-km-z]{33}$/);
}

/** signMessage returns a hex signature, usually 0x + 130 hex chars. */
export function expectHexSignature(value: string) {
    expect(value).toMatch(/^0x[a-fA-F0-9]+$/);
}

/**
 * signTransaction returns the input transaction object with a `signature` field appended.
 * The harness serializes the result as JSON; this checks the shape.
 */
export function expectSignedTransaction(value: string) {
    const parsed = JSON.parse(value);
    expect(parsed).toMatchObject({ txID: expect.any(String) });
    expect(Array.isArray(parsed.signature)).toBe(true);
    expect(parsed.signature.length).toBeGreaterThan(0);
}
```

### `e2e-shared/src/specs/index.ts`

```ts
export { defineDiscoveryTests } from './discovery.js';
export { defineConnectTests } from './connect.js';
export { defineSignTests } from './sign.js';
export { defineTransactionTests } from './transaction.js';
export { defineChainTests } from './chain.js';
export { defineEventsTests } from './events.js';
```

### `e2e-shared/src/specs/discovery.ts`

```ts
import type { TestType, Expect } from '@playwright/test';
import type { WalletE2EConfig } from '../types.js';
import type { AdapterE2EPage } from '../fixtures/test-page.js';
import type { WalletPopupController } from '../fixtures/wallet-popup.js';

type Fixtures = { app: AdapterE2EPage; walletPopup: WalletPopupController };

export function defineDiscoveryTests(test: TestType<Fixtures, {}>, expect: Expect, config: WalletE2EConfig) {
    test(`E2E-001 should detect injected ${config.walletName} provider on window`, async ({ app }, testInfo) => {
        test.skip(
            testInfo.project.name !== 'with-extension',
            `This test requires the ${config.walletName} extension project.`
        );

        await expect
            .poll(async () => {
                const snapshot = await app.getSnapshot();
                return snapshot.readyState;
            })
            .toBe('Found');
    });

    test('E2E-002 should return the injected provider and pass the identity check', async ({ app }, testInfo) => {
        test.skip(
            testInfo.project.name !== 'with-extension',
            `This test requires the ${config.walletName} extension project.`
        );

        await app.runAction('getProvider');
        await expect
            .poll(async () => {
                const snapshot = await app.getSnapshot();
                return {
                    providerFound: snapshot.providerFound,
                    providerIdentityCheck: snapshot.providerIdentityCheck,
                };
            })
            .toEqual({
                providerFound: true,
                providerIdentityCheck: true,
            });
    });

    test('E2E-003 should become NotFound when the extension is not loaded', async ({ app }, testInfo) => {
        test.skip(testInfo.project.name !== 'without-extension', 'This test requires the no-extension project.');

        await expect
            .poll(async () => {
                const snapshot = await app.getSnapshot();
                return snapshot.readyState;
            })
            .toBe('NotFound');
    });
}
```

### `e2e-shared/src/specs/connect.ts`

```ts
import type { TestType, Expect } from '@playwright/test';
import type { WalletE2EConfig } from '../types.js';
import type { AdapterE2EPage } from '../fixtures/test-page.js';
import type { WalletPopupController } from '../fixtures/wallet-popup.js';
import { connectWallet, expectTronAddress } from '../helpers/test-helpers.js';

type Fixtures = { app: AdapterE2EPage; walletPopup: WalletPopupController };

export function defineConnectTests(test: TestType<Fixtures, {}>, expect: Expect, config: WalletE2EConfig) {
    test(`E2E-004 should connect successfully after approving the popup`, async ({ app, walletPopup }, testInfo) => {
        test.skip(
            testInfo.project.name !== 'with-extension',
            `This test requires the ${config.walletName} extension project.`
        );

        const snapshot = await connectWallet(app, walletPopup);
        expectTronAddress(snapshot.address);
        expect(snapshot.result.lastAction).toBe('connect');
    });

    test('E2E-005 should surface an error when the connection request is rejected', async ({
        app,
        walletPopup,
    }, testInfo) => {
        test.skip(
            testInfo.project.name !== 'with-extension',
            `This test requires the ${config.walletName} extension project.`
        );

        await walletPopup.completePendingRequest(() => app.runAction('connect'), 'reject');
        const snapshot = await app.getSnapshot();

        expect(snapshot.connected).toBe(false);
        expect(snapshot.address).toBeNull();
        expect(snapshot.result.lastAction).toBe('connect');
        expect(snapshot.result.status).toBe('error');
    });

    test.skip('E2E-006 should remain stable when connect is called twice', async ({ app, walletPopup }, testInfo) => {
        test.skip(
            testInfo.project.name !== 'with-extension',
            `This test requires the ${config.walletName} extension project.`
        );

        const first = await connectWallet(app, walletPopup);
        await walletPopup.completePendingRequest(() => app.runAction('connect'), 'confirm', { popupMode: 'optional' });
        const second = await app.getSnapshot();

        expectTronAddress(first.address);
        expectTronAddress(second.address);
        expect(second.connected).toBe(true);
        expect(second.result.lastAction).toBe('connect');
        expect(second.result.status).toBe('success');
    });

    test('E2E-006a should clear address and connected state after disconnect', async ({
        app,
        walletPopup,
    }, testInfo) => {
        test.skip(
            testInfo.project.name !== 'with-extension',
            `This test requires the ${config.walletName} extension project.`
        );

        await connectWallet(app, walletPopup);
        await app.runAction('disconnect');

        await expect
            .poll(async () => {
                const snapshot = await app.getSnapshot();
                return { connected: snapshot.connected, address: snapshot.address };
            })
            .toEqual({ connected: false, address: null });
    });
}
```

### `e2e-shared/src/specs/sign.ts`

```ts
import type { TestType, Expect } from '@playwright/test';
import type { WalletE2EConfig } from '../types.js';
import type { AdapterE2EPage } from '../fixtures/test-page.js';
import type { WalletPopupController } from '../fixtures/wallet-popup.js';
import { connectWallet, expectHexSignature } from '../helpers/test-helpers.js';

type Fixtures = { app: AdapterE2EPage; walletPopup: WalletPopupController };

export function defineSignTests(test: TestType<Fixtures, {}>, expect: Expect, config: WalletE2EConfig) {
    test('E2E-007 should sign a message successfully', async ({ app, walletPopup }, testInfo) => {
        test.skip(
            testInfo.project.name !== 'with-extension',
            `This test requires the ${config.walletName} extension project.`
        );

        await connectWallet(app, walletPopup);
        await walletPopup.completePendingRequest(() => app.runAction('signMessage'), 'confirm');
        const snapshot = await app.getSnapshot();

        expect(snapshot.result.status).toBe('success');
        expect(snapshot.result.lastAction).toBe('signMessage');
        expectHexSignature(snapshot.result.value);
    });

    test('E2E-008 should report an error when message signing is rejected', async ({ app, walletPopup }, testInfo) => {
        test.skip(
            testInfo.project.name !== 'with-extension',
            `This test requires the ${config.walletName} extension project.`
        );

        await connectWallet(app, walletPopup);
        await walletPopup.completePendingRequest(() => app.runAction('signMessage'), 'reject');
        const snapshot = await app.getSnapshot();

        expect(snapshot.result.lastAction).toBe('signMessage');
        expect(snapshot.result.status).toBe('error');
    });

    test('E2E-011 should throw WalletDisconnectedError when signing without a connection', async ({
        app,
    }, testInfo) => {
        test.skip(
            testInfo.project.name !== 'with-extension',
            `This test requires the ${config.walletName} extension project.`
        );

        await app.runAction('resetState');
        await app.runAction('signMessage');
        const snapshot = await app.getSnapshot();

        expect(snapshot.result.lastAction).toBe('signMessage');
        expect(snapshot.result.status).toBe('error');
        expect(snapshot.result.errorName).toMatch(/Disconnected|NotFound|Connect/);
    });
}
```

### `e2e-shared/src/specs/transaction.ts`

```ts
import type { TestType, Expect } from '@playwright/test';
import type { WalletE2EConfig } from '../types.js';
import type { AdapterE2EPage } from '../fixtures/test-page.js';
import type { WalletPopupController } from '../fixtures/wallet-popup.js';
import { connectWallet, expectSignedTransaction } from '../helpers/test-helpers.js';
import { resolveCapabilities } from '../types.js';

type Fixtures = { app: AdapterE2EPage; walletPopup: WalletPopupController };

export function defineTransactionTests(test: TestType<Fixtures, {}>, expect: Expect, config: WalletE2EConfig) {
    const { multiSign: supportsMultiSign } = resolveCapabilities(config);

    test('E2E-012 should sign a TRX transfer transaction successfully', async ({ app, walletPopup }, testInfo) => {
        test.skip(
            testInfo.project.name !== 'with-extension',
            `This test requires the ${config.walletName} extension project.`
        );

        await connectWallet(app, walletPopup);
        await walletPopup.completePendingRequest(() => app.runAction('signTransaction'), 'confirm');
        const snapshot = await app.getSnapshot();

        expect(snapshot.result.lastAction).toBe('signTransaction');
        expect(snapshot.result.status).toBe('success');
        expectSignedTransaction(snapshot.result.value);
    });

    test('E2E-013 should report an error when signTransaction is rejected', async ({ app, walletPopup }, testInfo) => {
        test.skip(
            testInfo.project.name !== 'with-extension',
            `This test requires the ${config.walletName} extension project.`
        );

        await connectWallet(app, walletPopup);
        await walletPopup.completePendingRequest(() => app.runAction('signTransaction'), 'reject');
        const snapshot = await app.getSnapshot();

        expect(snapshot.result.lastAction).toBe('signTransaction');
        expect(snapshot.result.status).toBe('error');
    });

    test('E2E-014 should throw WalletDisconnectedError when signTransaction is called before connect', async ({
        app,
    }, testInfo) => {
        test.skip(
            testInfo.project.name !== 'with-extension',
            `This test requires the ${config.walletName} extension project.`
        );

        await app.runAction('resetState');
        await app.runAction('signTransaction');
        const snapshot = await app.getSnapshot();

        expect(snapshot.result.lastAction).toBe('signTransaction');
        expect(snapshot.result.status).toBe('error');
        expect(snapshot.result.errorName).toMatch(/Disconnected|NotFound|Connect/);
    });

    test('E2E-014a should multi-sign a transaction with a permission id', async ({ app, walletPopup }, testInfo) => {
        test.skip(
            testInfo.project.name !== 'with-extension',
            `This test requires the ${config.walletName} extension project.`
        );
        if (!supportsMultiSign) {
            test.skip(true, `${config.walletName} does not support multiSign.`);
        }

        await connectWallet(app, walletPopup);
        await walletPopup.completePendingRequest(() => app.runAction('multiSign'), 'confirm');
        const snapshot = await app.getSnapshot();

        expect(snapshot.result.lastAction).toBe('multiSign');
        // multiSign may fail at the wallet level when the active account has no
        // matching permission; we tolerate either outcome here, but the action
        // must have run end-to-end (never stayed pending).
        expect(['success', 'error']).toContain(snapshot.result.status);
    });
}
```

### `e2e-shared/src/specs/chain.ts`

```ts
import type { TestType, Expect } from '@playwright/test';
import type { WalletE2EConfig } from '../types.js';
import type { E2EEnv } from '../env.js';
import type { AdapterE2EPage } from '../fixtures/test-page.js';
import type { WalletPopupController } from '../fixtures/wallet-popup.js';
import { connectWallet } from '../helpers/test-helpers.js';
import { resolveCapabilities } from '../types.js';

type Fixtures = { app: AdapterE2EPage; walletPopup: WalletPopupController };

export function defineChainTests(
    test: TestType<Fixtures, {}>,
    expect: Expect,
    config: WalletE2EConfig,
    e2eEnv: E2EEnv
) {
    const { switchChain: supportsSwitchChain } = resolveCapabilities(config);

    test('E2E-015 should switch to the configured TRON network', async ({ app, walletPopup }, testInfo) => {
        test.skip(
            testInfo.project.name !== 'with-extension',
            `This test requires the ${config.walletName} extension project.`
        );
        if (!supportsSwitchChain) {
            test.skip(true, `${config.walletName} does not support switchChain.`);
        }

        await connectWallet(app, walletPopup);
        await app.clearEvents();
        await app.setField('switchChain', e2eEnv.testChainId);
        await walletPopup.completePendingRequest(() => app.runAction('switchChain'), 'confirm', {
            popupMode: 'optional',
        });

        await expect
            .poll(async () => {
                const snapshot = await app.getSnapshot();
                return {
                    chainId: snapshot.chainId,
                    status: snapshot.result.status,
                };
            })
            .toEqual({
                chainId: e2eEnv.testChainId,
                status: 'success',
            });
    });

    test('E2E-016 should not crash when switching to an unknown chain fails', async ({
        app,
        walletPopup,
    }, testInfo) => {
        test.skip(
            testInfo.project.name !== 'with-extension',
            `This test requires the ${config.walletName} extension project.`
        );
        if (!supportsSwitchChain) {
            test.skip(true, `${config.walletName} does not support switchChain.`);
        }

        await connectWallet(app, walletPopup);
        await app.setField('switchChain', e2eEnv.testUnknownChainId);
        await walletPopup.completePendingRequest(() => app.runAction('switchChain'), 'reject', {
            popupMode: 'optional',
        });
        const snapshot = await app.getSnapshot();

        expect(snapshot.result.lastAction).toBe('switchChain');
        expect(['success', 'error']).toContain(snapshot.result.status);
    });
}
```

### `e2e-shared/src/specs/events.ts`

```ts
import type { TestType, Expect } from '@playwright/test';
import type { WalletE2EConfig } from '../types.js';
import type { E2EEnv } from '../env.js';
import type { AdapterE2EPage } from '../fixtures/test-page.js';
import type { WalletPopupController } from '../fixtures/wallet-popup.js';
import { connectWallet } from '../helpers/test-helpers.js';
import { resolveCapabilities } from '../types.js';

type Fixtures = { app: AdapterE2EPage; walletPopup: WalletPopupController };

export function defineEventsTests(
    test: TestType<Fixtures, {}>,
    expect: Expect,
    config: WalletE2EConfig,
    e2eEnv: E2EEnv
) {
    const { switchChain: supportsSwitchChain } = resolveCapabilities(config);

    test(`E2E-017 should emit accountsChanged after switching the active account in ${config.walletName}`, async ({}, testInfo) => {
        test.skip(
            testInfo.project.name !== 'with-extension',
            `This test requires the ${config.walletName} extension project.`
        );
        test.fixme(
            true,
            `Switching accounts inside the ${config.walletName} extension still needs wallet-specific selectors for the account menu.`
        );
    });

    test('E2E-018 should emit chainChanged after switching chains', async ({ app, walletPopup }, testInfo) => {
        test.skip(
            testInfo.project.name !== 'with-extension',
            `This test requires the ${config.walletName} extension project.`
        );
        if (!supportsSwitchChain) {
            test.skip(true, `${config.walletName} does not support switchChain.`);
        }

        await connectWallet(app, walletPopup);
        await app.clearEvents();
        await app.setField('switchChain', e2eEnv.testChainId);
        await walletPopup.completePendingRequest(() => app.runAction('switchChain'), 'confirm', {
            popupMode: 'optional',
        });

        await expect
            .poll(async () => {
                const snapshot = await app.getSnapshot();
                return snapshot.events.some((event) => event.name === 'chainChanged');
            })
            .toBe(true);
    });

    test(`E2E-019 should emit disconnect / accountsChanged after the wallet is locked`, async ({}, testInfo) => {
        test.skip(
            testInfo.project.name !== 'with-extension',
            `This test requires the ${config.walletName} extension project.`
        );
        test.fixme(
            true,
            `Locking the ${config.walletName} profile from the extension UI still needs wallet-specific selectors for the account menu.`
        );
    });
}
```

### `e2e-shared/src/page/index.html`

```html
<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>TRON Wallet Adapter E2E Test Page</title>
        <style>
            :root {
                color-scheme: light;
                font-family: 'IBM Plex Sans', 'Helvetica Neue', sans-serif;
                background: radial-gradient(circle at top left, rgba(255, 69, 0, 0.14), transparent 30%),
                    linear-gradient(180deg, #fff8f3 0%, #fffefb 100%);
                color: #1f1f1f;
            }
            body {
                margin: 0;
                min-height: 100vh;
            }
            main {
                max-width: 1080px;
                margin: 0 auto;
                padding: 40px 24px 56px;
            }
            h1 {
                margin: 0 0 8px;
                font-size: 32px;
            }
            p {
                margin: 0 0 24px;
                color: #5c5144;
            }
            .grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                gap: 16px;
            }
            section {
                background: rgba(255, 255, 255, 0.92);
                border: 1px solid rgba(140, 117, 88, 0.12);
                border-radius: 18px;
                padding: 20px;
                box-shadow: 0 18px 50px rgba(92, 63, 21, 0.08);
            }
            section h2 {
                margin: 0 0 14px;
                font-size: 18px;
            }
            .row {
                display: flex;
                justify-content: space-between;
                gap: 16px;
                padding: 8px 0;
                border-bottom: 1px solid rgba(140, 117, 88, 0.08);
            }
            .row:last-child {
                border-bottom: 0;
            }
            .label {
                color: #745f48;
                font-weight: 600;
            }
            .value {
                font-family: 'IBM Plex Mono', 'SFMono-Regular', monospace;
                text-align: right;
                word-break: break-all;
            }
            .actions {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
                gap: 10px;
            }
            button,
            input {
                border-radius: 12px;
                border: 1px solid rgba(140, 117, 88, 0.18);
                font: inherit;
            }
            button {
                min-height: 44px;
                background: linear-gradient(135deg, #c1272d, #6f1a1f);
                color: #fffdf9;
                cursor: pointer;
            }
            input {
                width: 100%;
                box-sizing: border-box;
                min-height: 42px;
                padding: 0 12px;
                margin-bottom: 10px;
                background: #fffdf8;
            }
            pre {
                margin: 0;
                white-space: pre-wrap;
                word-break: break-word;
                font-family: 'IBM Plex Mono', 'SFMono-Regular', monospace;
                font-size: 12px;
                line-height: 1.5;
            }
        </style>
    </head>
    <body>
        <main>
            <h1 data-testid="page-heading">TRON Wallet Adapter E2E Harness</h1>
            <p>This page intentionally keeps the UI small so Playwright can drive the real extension more reliably.</p>
            <div class="grid">
                <section>
                    <h2>Adapter State</h2>
                    <div class="row">
                        <span class="label">Adapter</span><span class="value" data-testid="adapter-name"></span>
                    </div>
                    <div class="row">
                        <span class="label">Scenario</span><span class="value" data-testid="scenario"></span>
                    </div>
                    <div class="row">
                        <span class="label">Use Deeplink</span><span class="value" data-testid="use-deeplink"></span>
                    </div>
                    <div class="row">
                        <span class="label">Open URL Fallback</span
                        ><span class="value" data-testid="open-url-when-wallet-not-found"></span>
                    </div>
                    <div class="row">
                        <span class="label">Ready State</span><span class="value" data-testid="ready-state"></span>
                    </div>
                    <div class="row">
                        <span class="label">Adapter State</span><span class="value" data-testid="adapter-state"></span>
                    </div>
                    <div class="row">
                        <span class="label">Connected</span><span class="value" data-testid="connected"></span>
                    </div>
                    <div class="row">
                        <span class="label">Address</span><span class="value" data-testid="address"></span>
                    </div>
                    <div class="row">
                        <span class="label">Chain ID</span><span class="value" data-testid="chain-id"></span>
                    </div>
                    <div class="row">
                        <span class="label">Provider Found</span
                        ><span class="value" data-testid="provider-found"></span>
                    </div>
                    <div class="row">
                        <span class="label">Provider Identity</span
                        ><span class="value" data-testid="provider-identity-check"></span>
                    </div>
                </section>
                <section>
                    <h2>Inputs</h2>
                    <input data-testid="message-input" id="message-input" placeholder="message" />
                    <input data-testid="receiver-input" id="receiver-input" placeholder="receiver (TRON base58)" />
                    <input data-testid="value-input" id="value-input" placeholder="amount (sun)" />
                    <input data-testid="switch-chain-input" id="switch-chain-input" placeholder="chainId (hex)" />
                </section>
                <section style="grid-column: 1 / -1">
                    <h2>Actions</h2>
                    <div class="actions">
                        <button data-testid="reset-adapter">Reset Adapter</button>
                        <button data-testid="get-provider">Get Provider</button>
                        <button data-testid="connect">Connect</button>
                        <button data-testid="disconnect">Disconnect</button>
                        <button data-testid="sign-message">Sign Message</button>
                        <button data-testid="sign-transaction">Sign Transaction</button>
                        <button data-testid="multi-sign">Multi Sign</button>
                        <button data-testid="switch-chain">Switch Chain</button>
                    </div>
                </section>
                <section>
                    <h2>Last Result</h2>
                    <div class="row">
                        <span class="label">Action</span><span class="value" data-testid="result-action"></span>
                    </div>
                    <div class="row">
                        <span class="label">Status</span><span class="value" data-testid="result-status"></span>
                    </div>
                    <div class="row">
                        <span class="label">Error Name</span><span class="value" data-testid="result-error-name"></span>
                    </div>
                    <div class="row">
                        <span class="label">Error Code</span><span class="value" data-testid="result-error-code"></span>
                    </div>
                    <div class="row">
                        <span class="label">Error Message</span
                        ><span class="value" data-testid="result-error-message"></span>
                    </div>
                    <pre data-testid="result-value"></pre>
                </section>
                <section>
                    <h2>Event Log</h2>
                    <pre data-testid="event-log"></pre>
                </section>
                <section style="grid-column: 1 / -1">
                    <h2>Native Probe</h2>
                    <p>
                        This section keeps key state in visible text so Native-only mobile automation can still assert
                        the page without executing JS inside the WebView.
                    </p>
                    <pre data-testid="native-probe"></pre>
                </section>
            </div>
        </main>
        <script type="module" src="./main.ts"></script>
    </body>
</html>
```

### `e2e-shared/src/page/harness.ts`

```ts
/**
 * Browser-side harness for TRON wallet adapter E2E testing.
 *
 * Each wallet adapter creates its own `pages/main.ts` that calls `initHarness(adapter, config)`.
 * The harness wires up the adapter to the page DOM, exposes a `window.<walletId>AdapterE2E` global API
 * for Playwright/Appium to drive, and renders state into `data-testid` elements.
 *
 * Test transactions are built at sign-time using TronWeb against the configured fullHost (default: Nile testnet)
 * so wallets always receive a fresh, valid unsigned transaction.
 */
import TronWeb from 'tronweb';
import type { AdapterActionName, AdapterEventEntry, AdapterHarnessConfig, WalletE2EConfig } from '../types.js';

type ResultStatus = 'idle' | 'pending' | 'success' | 'error';

interface ResultState {
    lastAction: string;
    status: ResultStatus;
    value: string;
    errorName: string;
    errorMessage: string;
    errorCode: number | null;
}

/**
 * Minimal structural typing of the TRON adapter we drive in the harness.
 * Matches the public API of `Adapter` from `@tronweb3/tronwallet-abstract-adapter`.
 */
interface TronAdapter {
    name: string;
    address: string | null;
    connected: boolean;
    readyState: string;
    state: string;
    on(event: string, handler: (payload?: unknown, extra?: unknown) => void): unknown;
    removeAllListeners(): unknown;
    connect(): Promise<unknown>;
    disconnect(): Promise<unknown>;
    signMessage(message: string): Promise<string>;
    signTransaction(transaction: unknown): Promise<unknown>;
    multiSign?(transaction: unknown, options: { permissionId?: number }): Promise<unknown>;
    switchChain(chainId: string): Promise<unknown>;
}

export function initHarness(adapter: TronAdapter, config: WalletE2EConfig) {
    const searchParams = new URLSearchParams(window.location.search);
    const defaultMessage = searchParams.get('message') || `Hello from ${config.walletName} E2E`;
    const defaultReceiver = searchParams.get('receiver') || 'TYukBQZ2XXCcRCReAUguyXncCWNY9CEiDQ';
    const defaultValue = searchParams.get('value') || '1000';
    const defaultChainId = searchParams.get('chainId') || '0xcd8690dc';
    const fullHost = searchParams.get('fullHost') || 'https://nile.trongrid.io';
    const harnessConfig = resolveHarnessConfig();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tronWeb = new (TronWeb as any)({ fullHost });

    function parseBooleanParam(name: string, defaultValue: boolean) {
        const value = searchParams.get(name);
        if (value === null) return defaultValue;
        switch (value.trim().toLowerCase()) {
            case '1':
            case 'true':
            case 'yes':
            case 'on':
                return true;
            case '0':
            case 'false':
            case 'no':
            case 'off':
                return false;
            default:
                return defaultValue;
        }
    }

    function resolveHarnessConfig(): AdapterHarnessConfig {
        const useDeeplink = parseBooleanParam('useDeeplink', false);
        return {
            scenario: searchParams.get('scenario') || (useDeeplink ? 'deeplink' : 'inapp'),
            useDeeplink,
            openUrlWhenWalletNotFound: parseBooleanParam('openUrlWhenWalletNotFound', false),
        };
    }

    const elements = {
        adapterName: getByTestId('adapter-name'),
        scenario: getByTestId('scenario'),
        useDeeplink: getByTestId('use-deeplink'),
        openUrlWhenWalletNotFound: getByTestId('open-url-when-wallet-not-found'),
        readyState: getByTestId('ready-state'),
        adapterState: getByTestId('adapter-state'),
        connected: getByTestId('connected'),
        address: getByTestId('address'),
        chainId: getByTestId('chain-id'),
        providerFound: getByTestId('provider-found'),
        providerIdentityCheck: getByTestId('provider-identity-check'),
        resultAction: getByTestId('result-action'),
        resultStatus: getByTestId('result-status'),
        resultErrorName: getByTestId('result-error-name'),
        resultErrorCode: getByTestId('result-error-code'),
        resultErrorMessage: getByTestId('result-error-message'),
        resultValue: getByTestId('result-value'),
        eventLog: getByTestId('event-log'),
        nativeProbe: getByTestId('native-probe'),
        messageInput: getByTestId<HTMLInputElement>('message-input'),
        receiverInput: getByTestId<HTMLInputElement>('receiver-input'),
        valueInput: getByTestId<HTMLInputElement>('value-input'),
        switchChainInput: getByTestId<HTMLInputElement>('switch-chain-input'),
    };

    elements.messageInput.value = defaultMessage;
    elements.receiverInput.value = defaultReceiver;
    elements.valueInput.value = defaultValue;
    elements.switchChainInput.value = defaultChainId;

    const currentAdapter = adapter;
    let providerFound: boolean | null = null;
    let providerIdentityCheck: boolean | null = null;
    let chainId = '';
    let events: AdapterEventEntry[] = [];
    let resultState: ResultState = {
        lastAction: '',
        status: 'idle',
        value: '',
        errorName: '',
        errorMessage: '',
        errorCode: null,
    };

    function getByTestId<T extends HTMLElement = HTMLElement>(testId: string) {
        const element = document.querySelector<T>(`[data-testid="${testId}"]`);
        if (!element) throw new Error(`Missing data-testid="${testId}"`);
        return element;
    }

    function resetResult(action = '') {
        resultState = {
            lastAction: action,
            status: 'idle',
            value: '',
            errorName: '',
            errorMessage: '',
            errorCode: null,
        };
    }

    function serializeValue(value: unknown) {
        if (typeof value === 'string') return value;
        if (value === undefined) return '';
        return JSON.stringify(value, null, 2);
    }

    function getObjectRecord(value: unknown) {
        return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
    }

    function getNestedValue(value: unknown, key: string) {
        const record = getObjectRecord(value);
        return record ? record[key] : undefined;
    }

    function extractErrorCode(error: unknown, visited = new Set<unknown>()): number | null {
        if (!error || visited.has(error)) return null;
        visited.add(error);
        const directCode = getNestedValue(error, 'code');
        if (typeof directCode === 'number') return directCode;
        const nestedError = getNestedValue(error, 'error');
        if (nestedError !== undefined) {
            const c = extractErrorCode(nestedError, visited);
            if (c !== null) return c;
        }
        const cause = getNestedValue(error, 'cause');
        if (cause !== undefined) return extractErrorCode(cause, visited);
        return null;
    }

    function serializeError(error: unknown) {
        if (error instanceof Error)
            return { errorName: error.name, errorMessage: error.message, errorCode: extractErrorCode(error) };
        const nestedMessage = getNestedValue(error, 'message');
        const nestedName = getNestedValue(error, 'name');
        return {
            errorName: typeof nestedName === 'string' ? nestedName : 'Error',
            errorMessage:
                typeof nestedMessage === 'string'
                    ? nestedMessage
                    : typeof error === 'string'
                    ? error
                    : JSON.stringify(error),
            errorCode: extractErrorCode(error),
        };
    }

    function serializeNativeProbeValue(value: string) {
        const trimmed = value.trim();
        if (!trimmed) return '';
        try {
            const parsed = JSON.parse(trimmed);
            return typeof parsed === 'string' ? parsed : JSON.stringify(parsed);
        } catch {
            return value.replace(/\r?\n/g, '\\n');
        }
    }

    function pushEvent(name: string, payload: unknown) {
        events = [...events, { name, payload, timestamp: new Date().toISOString() }];
        render();
    }

    function snapshot() {
        return {
            config: harnessConfig,
            readyState: currentAdapter.readyState,
            state: currentAdapter.state,
            address: currentAdapter.address,
            connected: currentAdapter.connected,
            chainId,
            providerFound,
            providerIdentityCheck,
            result: resultState,
            events,
        };
    }

    function render() {
        elements.adapterName.textContent = currentAdapter.name;
        elements.scenario.textContent = harnessConfig.scenario;
        elements.useDeeplink.textContent = String(harnessConfig.useDeeplink);
        elements.openUrlWhenWalletNotFound.textContent = String(harnessConfig.openUrlWhenWalletNotFound);
        elements.readyState.textContent = currentAdapter.readyState;
        elements.adapterState.textContent = currentAdapter.state;
        elements.connected.textContent = String(currentAdapter.connected);
        elements.address.textContent = currentAdapter.address || '';
        elements.chainId.textContent = chainId;
        elements.providerFound.textContent = providerFound === null ? '' : String(providerFound);
        elements.providerIdentityCheck.textContent =
            providerIdentityCheck === null ? '' : String(providerIdentityCheck);
        elements.resultAction.textContent = resultState.lastAction;
        elements.resultStatus.textContent = resultState.status;
        elements.resultErrorName.textContent = resultState.errorName;
        elements.resultErrorCode.textContent = resultState.errorCode === null ? '' : String(resultState.errorCode);
        elements.resultErrorMessage.textContent = resultState.errorMessage;
        elements.resultValue.textContent = resultState.value;
        elements.eventLog.textContent = JSON.stringify(events, null, 2);
        elements.nativeProbe.textContent = [
            `scenario=${harnessConfig.scenario}`,
            `useDeeplink=${String(harnessConfig.useDeeplink)}`,
            `openUrlWhenWalletNotFound=${String(harnessConfig.openUrlWhenWalletNotFound)}`,
            `readyState=${currentAdapter.readyState}`,
            `state=${currentAdapter.state}`,
            `connected=${String(currentAdapter.connected)}`,
            `address=${currentAdapter.address || ''}`,
            `chainId=${chainId}`,
            `providerFound=${providerFound === null ? '' : String(providerFound)}`,
            `providerIdentityCheck=${providerIdentityCheck === null ? '' : String(providerIdentityCheck)}`,
            `resultAction=${resultState.lastAction}`,
            `resultStatus=${resultState.status}`,
            `resultErrorName=${resultState.errorName}`,
            `resultErrorCode=${resultState.errorCode === null ? '' : String(resultState.errorCode)}`,
            `resultErrorMessage=${serializeNativeProbeValue(resultState.errorMessage)}`,
            `resultValue=${serializeNativeProbeValue(resultState.value)}`,
        ].join('\n');
    }

    async function execute(action: string, task: () => Promise<unknown>): Promise<ResultState> {
        resultState = {
            lastAction: action,
            status: 'pending',
            value: '',
            errorName: '',
            errorMessage: '',
            errorCode: null,
        };
        render();
        try {
            const value = await task();
            resultState = {
                lastAction: action,
                status: 'success',
                value: serializeValue(value),
                errorName: '',
                errorMessage: '',
                errorCode: null,
            };
        } catch (error) {
            const serialized = serializeError(error);
            resultState = { lastAction: action, status: 'error', value: '', ...serialized };
        }
        render();
        return resultState;
    }

    function wireAdapterEvents(a: TronAdapter) {
        a.on('readyStateChanged', () => render());
        a.on('stateChanged', () => render());
        a.on('connect', (addr) => {
            pushEvent('connect', addr);
            render();
        });
        a.on('accountsChanged', (addr, preAddr) => {
            pushEvent('accountsChanged', { address: addr, previous: preAddr });
            render();
        });
        a.on('chainChanged', (next) => {
            // Tron emits the full chain info object; normalize to chainId string for snapshot.
            const record = next && typeof next === 'object' ? (next as Record<string, unknown>) : null;
            const nextChainId =
                record && typeof record.chainId === 'string' ? (record.chainId as string) : String(next ?? '');
            chainId = nextChainId;
            pushEvent('chainChanged', next);
            render();
        });
        a.on('disconnect', (payload) => {
            pushEvent('disconnect', payload);
            render();
        });
    }

    wireAdapterEvents(currentAdapter);

    async function buildTrxTransferTx() {
        const fromAddress = currentAdapter.address;
        if (!fromAddress) throw new Error('Adapter is not connected');
        const amount = Number.parseInt(elements.valueInput.value || '1000', 10);
        return tronWeb.transactionBuilder.sendTrx(elements.receiverInput.value, amount, fromAddress);
    }

    const actions: Record<AdapterActionName, () => Promise<ResultState>> = {
        resetState: async () => {
            // Clears harness-local state (event log, chainId cache, last-result snapshot).
            // The adapter's own `connected` / `address` are managed by the wallet and are NOT cleared here.
            currentAdapter.removeAllListeners();
            wireAdapterEvents(currentAdapter);
            providerFound = null;
            providerIdentityCheck = null;
            events = [];
            chainId = '';
            resetResult('resetState');
            render();
            return resultState;
        },
        getProvider: async () => {
            return execute('getProvider', async () => {
                // For TRON wallets the injected provider lives at a wallet-specific window key
                // (e.g. window.tronLink, window.okxwallet.tronLink). The adapter handles discovery;
                // here we only sanity-check via the adapter's `readyState` and an identity flag
                // resolved by walking the window object using providerIdentityKey if available.
                providerFound = currentAdapter.readyState === 'Found';
                const probe = providerIdentityCheckOnWindow(config.providerIdentityKey);
                providerIdentityCheck = probe;
                render();
                return { providerFound, providerIdentityCheck };
            });
        },
        connect: async () => execute('connect', async () => currentAdapter.connect()),
        disconnect: async () => execute('disconnect', async () => currentAdapter.disconnect()),
        signMessage: async () =>
            execute('signMessage', async () => currentAdapter.signMessage(elements.messageInput.value)),
        signTransaction: async () =>
            execute('signTransaction', async () => {
                const unsigned = await buildTrxTransferTx();
                return currentAdapter.signTransaction(unsigned);
            }),
        multiSign: async () =>
            execute('multiSign', async () => {
                if (typeof currentAdapter.multiSign !== 'function') {
                    throw new Error(`${currentAdapter.name} does not implement multiSign`);
                }
                const unsigned = await buildTrxTransferTx();
                return currentAdapter.multiSign(unsigned, { permissionId: 0 });
            }),
        switchChain: async () =>
            execute('switchChain', async () => currentAdapter.switchChain(elements.switchChainInput.value)),
    };

    /**
     * Walk the window object for the configured identity key. The key may be a path
     * (e.g. `isTronLink` or `okxwallet.tronLink.isOkxWallet`). Returns true if any
     * resolved value is truthy, false otherwise.
     */
    function providerIdentityCheckOnWindow(key: string): boolean {
        const parts = key.split('.');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let cursor: any = window;
        for (const part of parts) {
            if (cursor == null) return false;
            cursor = cursor[part];
        }
        return Boolean(cursor);
    }

    // Expose global API for Playwright / Appium
    const globalName = `${config.walletId}AdapterE2E`;
    (window as unknown as Record<string, unknown>)[globalName] = {
        runAction(action: AdapterActionName) {
            return actions[action]();
        },
        getSnapshot() {
            return snapshot();
        },
        clearEvents() {
            events = [];
            render();
        },
        setField(name: string, value: string) {
            switch (name) {
                case 'message':
                    elements.messageInput.value = value;
                    break;
                case 'receiver':
                    elements.receiverInput.value = value;
                    break;
                case 'value':
                    elements.valueInput.value = value;
                    break;
                case 'switchChain':
                    elements.switchChainInput.value = value;
                    break;
                default:
                    throw new Error(`Unsupported field: ${name}`);
            }
        },
    };

    // Wire up button click handlers
    const buttonMap: [string, AdapterActionName][] = [
        ['reset-adapter', 'resetState'],
        ['get-provider', 'getProvider'],
        ['connect', 'connect'],
        ['disconnect', 'disconnect'],
        ['sign-message', 'signMessage'],
        ['sign-transaction', 'signTransaction'],
        ['multi-sign', 'multiSign'],
        ['switch-chain', 'switchChain'],
    ];
    for (const [testId, action] of buttonMap) {
        document.querySelector<HTMLButtonElement>(`[data-testid="${testId}"]`)?.addEventListener('click', () => {
            void actions[action]();
        });
    }

    resetResult();
    render();
}
```

### `e2e-shared/e2e-setup.mjs`

```js
#!/usr/bin/env node

/**
 * E2E Test Environment Setup Script for TRON wallet adapters.
 *
 * Usage:
 *   node e2e-setup.mjs <walletId> --extension-id <chromeExtensionId>
 *   node e2e-setup.mjs <walletId> --crx <path/to/extension.crx>
 *   node e2e-setup.mjs <walletId> --extension-dir <path/to/unpacked-extension>
 *   node e2e-setup.mjs <walletId> --launch-profile
 *   node e2e-setup.mjs <walletId> --copy-profile
 *   node e2e-setup.mjs <walletId> --init-env
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// ── Wallet Config Map ──────────────────────────────────────────────

// All wallets share WALLET_EXTENSION_PATH, CHROMIUM_USER_DATA_DIR, and WALLET_PASSWORD
// from tron/.env. Only the base URL env var differs per wallet.
const WALLET_CONFIGS = {
    tronlink: { name: 'TronLink', baseUrlEnvVar: 'TRONLINK_E2E_BASE_URL' },
    okxwallet: { name: 'OKX Wallet', baseUrlEnvVar: 'OKX_WALLET_E2E_BASE_URL' },
    bitkeep: { name: 'Bitget Wallet', baseUrlEnvVar: 'BITGET_E2E_BASE_URL' },
    bybit: { name: 'Bybit Wallet', baseUrlEnvVar: 'BYBIT_E2E_BASE_URL' },
    gatewallet: { name: 'Gate Wallet', baseUrlEnvVar: 'GATE_E2E_BASE_URL' },
    guarda: { name: 'Guarda', baseUrlEnvVar: 'GUARDA_E2E_BASE_URL' },
    onekey: { name: 'OneKey', baseUrlEnvVar: 'ONEKEY_E2E_BASE_URL' },
    tokenpocket: { name: 'TokenPocket', baseUrlEnvVar: 'TOKENPOCKET_E2E_BASE_URL' },
    trust: { name: 'Trust Wallet', baseUrlEnvVar: 'TRUST_E2E_BASE_URL' },
    metamask: { name: 'MetaMask', baseUrlEnvVar: 'METAMASK_E2E_BASE_URL' },
    binance: { name: 'Binance Wallet', baseUrlEnvVar: 'BINANCE_E2E_BASE_URL' },
};

// ── Path Utilities ────────────────────────────────────────────────

function findMonorepoRoot(startDir) {
    let dir = startDir;
    for (let i = 0; i < 20; i++) {
        if (fs.existsSync(path.join(dir, 'pnpm-workspace.yaml'))) return dir;
        const parent = path.dirname(dir);
        if (parent === dir) break;
        dir = parent;
    }
    return null;
}

function findWalletDir(walletId, rootDir) {
    return path.join(rootDir, 'tron', walletId);
}

// ── Chrome Extension Directory Lookup ──────────────────────────────

function getChromeUserDataDir() {
    const platform = os.platform();
    switch (platform) {
        case 'darwin':
            return path.join(os.homedir(), 'Library', 'Application Support', 'Google', 'Chrome');
        case 'linux':
            return path.join(os.homedir(), '.config', 'google-chrome');
        case 'win32':
            return path.join(
                process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'),
                'Google',
                'Chrome',
                'User Data'
            );
        default:
            return null;
    }
}

function findExtensionDir(extensionId) {
    const userDataDir = getChromeUserDataDir();
    if (!userDataDir) {
        console.error(`❌ Unsupported platform: ${os.platform()}`);
        process.exit(1);
    }

    if (!fs.existsSync(userDataDir)) {
        console.error(`❌ Chrome user data directory not found: ${userDataDir}`);
        process.exit(1);
    }

    const profileDirs = fs.readdirSync(userDataDir).filter((name) => {
        if (name === 'Default' || /^Profile \d+$/.test(name)) {
            const extPath = path.join(userDataDir, name, 'Extensions', extensionId);
            return fs.existsSync(extPath);
        }
        return false;
    });

    if (profileDirs.length === 0) {
        console.error(`❌ Extension not found: ${extensionId}`);
        console.error(`   Searched all Chrome profiles in: ${userDataDir}`);
        process.exit(1);
    }

    let bestProfile = null;
    let bestVersion = null;
    let bestDir = null;

    for (const profile of profileDirs) {
        const extDir = path.join(userDataDir, profile, 'Extensions', extensionId);
        const versions = fs.readdirSync(extDir).filter((v) => fs.statSync(path.join(extDir, v)).isDirectory());
        if (versions.length === 0) continue;
        versions.sort();
        const latest = versions[versions.length - 1];
        if (!bestVersion || latest > bestVersion) {
            bestVersion = latest;
            bestProfile = profile;
            bestDir = path.join(extDir, latest);
        }
    }

    if (!bestDir) {
        console.error(`❌ Extension directory exists but has no version subdirectory`);
        process.exit(1);
    }

    console.log(`✅ Found extension: ${extensionId} v${bestVersion} (Chrome ${bestProfile})`);
    return bestDir;
}

function copyExtension(srcDir, walletDir) {
    const destDir = path.join(walletDir, 'e2e', 'extensions');

    if (path.resolve(srcDir) === path.resolve(destDir)) {
        console.log(`✅ Extension already at destination, skipping copy: ${destDir}`);
        return destDir;
    }

    if (fs.existsSync(destDir)) {
        fs.rmSync(destDir, { recursive: true, force: true });
    }
    fs.mkdirSync(destDir, { recursive: true });
    fs.cpSync(srcDir, destDir, { recursive: true });

    if (!fs.existsSync(path.join(destDir, 'manifest.json'))) {
        console.error(`❌ Copy complete but manifest.json not found, extension may be incomplete`);
        process.exit(1);
    }

    console.log(`✅ Extension copied to: ${destDir}`);
    return destDir;
}

function extractCrx(crxPath, walletDir) {
    if (!fs.existsSync(crxPath)) {
        console.error(`❌ CRX file not found: ${crxPath}`);
        process.exit(1);
    }
    const destDir = path.join(walletDir, 'e2e', 'extensions');
    if (fs.existsSync(destDir)) fs.rmSync(destDir, { recursive: true, force: true });
    fs.mkdirSync(destDir, { recursive: true });

    try {
        execSync(`unzip -o "${crxPath}" -d "${destDir}"`, { stdio: 'inherit' });
    } catch {
        console.error(`❌ CRX extraction failed.`);
        process.exit(1);
    }

    if (!fs.existsSync(path.join(destDir, 'manifest.json'))) {
        console.error(`❌ Extraction complete but manifest.json not found`);
        process.exit(1);
    }
    console.log(`✅ CRX extracted to: ${destDir}`);
    return destDir;
}

function findPlaywrightChromium() {
    try {
        const playwrightCliPath = require.resolve('playwright-core/cli');
        const result = execSync(`node "${playwrightCliPath}" print-browser --browser chromium`, {
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'pipe'],
        }).trim();
        if (result && fs.existsSync(result)) return result;
    } catch {}

    try {
        const result = execSync('npx playwright print-browser --browser chromium 2>/dev/null', {
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'pipe'],
        }).trim();
        if (result && fs.existsSync(result)) return result;
    } catch {}

    const platform = os.platform();
    const cacheDir =
        platform === 'darwin'
            ? path.join(os.homedir(), 'Library', 'Caches', 'ms-playwright')
            : platform === 'linux'
            ? path.join(os.homedir(), '.cache', 'ms-playwright')
            : path.join(os.homedir(), 'AppData', 'Local', 'ms-playwright');

    if (!fs.existsSync(cacheDir)) return null;
    const dirs = fs.readdirSync(cacheDir).filter((d) => d.startsWith('chromium-') && !d.includes('headless'));
    if (dirs.length === 0) return null;
    dirs.sort();

    for (const dir of dirs) {
        const chromiumDir = path.join(cacheDir, dir);
        const candidates = [];
        if (platform === 'darwin') {
            candidates.push(
                path.join(chromiumDir, 'chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium'),
                path.join(chromiumDir, 'chrome-mac-arm64', 'Chromium.app', 'Contents', 'MacOS', 'Chromium')
            );
        } else if (platform === 'linux') {
            candidates.push(path.join(chromiumDir, 'chrome-linux', 'chrome'));
        } else {
            candidates.push(path.join(chromiumDir, 'chrome-win', 'chrome.exe'));
        }
        for (const c of candidates) if (fs.existsSync(c)) return c;
    }
    return null;
}

function ensurePlaywrightChromium() {
    const chromium = findPlaywrightChromium();
    if (chromium) return chromium;
    console.log(`⚠️  Playwright Chromium not found, installing...`);
    try {
        execSync('pnpm exec playwright install chromium', { stdio: 'inherit' });
    } catch {
        console.error(`❌ Failed to install Playwright Chromium. Run: pnpm exec playwright install chromium`);
        process.exit(1);
    }
    const retry = findPlaywrightChromium();
    if (retry) return retry;
    process.exit(1);
}

function launchProfile(walletDir, walletId) {
    const chromium = ensurePlaywrightChromium();
    const extDir = path.join(walletDir, 'e2e', 'extensions');
    if (!fs.existsSync(extDir) || !fs.existsSync(path.join(extDir, 'manifest.json'))) {
        console.error(`❌ Extension directory missing. Prepare the extension first.`);
        process.exit(1);
    }
    const tmpProfile = path.join(os.tmpdir(), `wallet-profile-${walletId}`);

    console.log(`\n🚀 Launching Chromium to create Profile...`);
    console.log(`   1. Click extension icon → Import wallet via seed phrase`);
    console.log(`   2. Set unlock password`);
    console.log(`   3. Switch the wallet to the TRON Nile testnet`);
    console.log(`   4. (Optional) Get test TRX from https://nileex.io/join/getJoinPage`);
    console.log(`   5. Close the browser\n`);

    const cmd = `"${chromium}" --user-data-dir="${tmpProfile}" --disable-extensions-except="${extDir}" --load-extension="${extDir}" --no-first-run about:blank`;
    try {
        execSync(cmd, { stdio: 'inherit' });
    } catch {}

    if (fs.existsSync(path.join(tmpProfile, 'Default'))) {
        console.log(`\n✅ Profile saved to: ${tmpProfile}`);
        console.log(`   Next: pnpm e2e:setup --copy-profile`);
    }
}

function copyProfile(walletDir, walletId) {
    const tmpProfile = path.join(os.tmpdir(), `wallet-profile-${walletId}`);
    if (!fs.existsSync(path.join(tmpProfile, 'Default'))) {
        console.error(`❌ Temp Profile does not exist: ${tmpProfile}`);
        console.error(`   Please run: pnpm e2e:setup --launch-profile`);
        process.exit(1);
    }
    const destDir = path.join(walletDir, 'e2e', '.chromium-profile');
    if (fs.existsSync(destDir)) fs.rmSync(destDir, { recursive: true, force: true });
    fs.cpSync(tmpProfile, destDir, { recursive: true });
    console.log(`✅ Profile copied to: ${destDir}`);
}

function initEnv(walletDir, walletId) {
    const config = WALLET_CONFIGS[walletId];
    if (!config) {
        console.error(`❌ Unknown wallet: ${walletId}`);
        process.exit(1);
    }

    // Shared tron/.env — lives two levels up from the wallet directory
    const tronDir = path.resolve(walletDir, '..');
    const sharedEnvFile = path.join(tronDir, '.env');
    const sharedEnvExample = path.join(tronDir, '.env.example');

    if (fs.existsSync(sharedEnvFile)) {
        console.log(`⚠️  tron/.env already exists, skipping.`);
    } else if (fs.existsSync(sharedEnvExample)) {
        fs.copyFileSync(sharedEnvExample, sharedEnvFile);
        console.log(`✅ Created tron/.env from tron/.env.example`);
        console.log(`\n   ⚠️  Edit tron/.env to set WALLET_PASSWORD\n`);
    } else {
        const content =
            [
                `WALLET_EXTENSION_PATH=./e2e/extensions`,
                `CHROMIUM_USER_DATA_DIR=./e2e/.chromium-profile`,
                `WALLET_PASSWORD=`,
                `TEST_CHAIN_ID=0x94a9059e`,
                `TRON_FULL_HOST=https://nile.trongrid.io`,
                `TEST_RECEIVER_ADDRESS=TYukBQZ2XXCcRCReAUguyXncCWNY9CEiDQ`,
                `TEST_VALUE_SUN=1000`,
                `TEST_UNKNOWN_CHAIN_ID=0xdeadbeef`,
                `WALLET_ADAPTERS_PATH=`,
            ].join('\n') + '\n';
        fs.writeFileSync(sharedEnvFile, content);
        console.log(`✅ Created tron/.env`);
        console.log(`\n   ⚠️  Edit tron/.env to set WALLET_PASSWORD\n`);
    }
}

function verify(walletDir, walletId) {
    let hasIssue = false;

    const manifest = path.join(walletDir, 'e2e', 'extensions', 'manifest.json');
    if (fs.existsSync(manifest)) console.log(`✅ Extension files`);
    else {
        console.error(`❌ Extension files missing: ${manifest}`);
        hasIssue = true;
    }

    const defaultDir = path.join(walletDir, 'e2e', '.chromium-profile', 'Default');
    if (fs.existsSync(defaultDir)) console.log(`✅ Chromium Profile`);
    else {
        console.error(`❌ Chromium Profile missing`);
        hasIssue = true;
    }

    // Check shared tron/.env for WALLET_PASSWORD
    const tronDir = path.resolve(walletDir, '..');
    const sharedEnvFile = path.join(tronDir, '.env');
    if (fs.existsSync(sharedEnvFile)) {
        const envContent = fs.readFileSync(sharedEnvFile, 'utf-8');
        const passwordSet = envContent.split('\n').some((line) => {
            const eq = line.indexOf('=');
            if (eq === -1) return false;
            return line.slice(0, eq).trim() === 'WALLET_PASSWORD' && line.slice(eq + 1).trim().length > 0;
        });
        if (passwordSet) console.log(`✅ tron/.env (WALLET_PASSWORD is set)`);
        else {
            console.error(`⚠️  WALLET_PASSWORD is not set in tron/.env`);
            hasIssue = true;
        }
    } else {
        console.error(`❌ tron/.env missing`);
        hasIssue = true;
    }

    if (!hasIssue) console.log(`\n🎉 Ready! Run: cd ${walletDir} && pnpm e2e\n`);
    return !hasIssue;
}

// ── Main ─────────────────────────────────────────────────────────

function printHelp() {
    console.log(`
Usage: node e2e-setup.mjs <walletId> [options]

Options:
  --extension-id <id>    Copy extension from Chrome install directory
  --crx <path>           Extract extension from CRX file
  --extension-dir <path> Copy extension from local directory
  --launch-profile       Launch Chromium to create Profile
  --copy-profile         Copy Profile from /tmp to project
  --init-env             Generate .env file
  --setup                All-in-one (extension + Profile + .env)
  --verify               Verify environment is ready
  --help                 Show help

Supported wallets: ${Object.keys(WALLET_CONFIGS).join(', ')}
`);
}

const args = process.argv.slice(2);
if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printHelp();
    process.exit(0);
}

const walletId = args[0];
if (!WALLET_CONFIGS[walletId]) {
    console.error(`❌ Unknown wallet: ${walletId}`);
    console.error(`   Supported wallets: ${Object.keys(WALLET_CONFIGS).join(', ')}`);
    process.exit(1);
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = findMonorepoRoot(scriptDir) || process.cwd();
const walletDir = findWalletDir(walletId, rootDir);

console.log(`Wallet: ${WALLET_CONFIGS[walletId].name} (${walletId})`);
console.log(`Project directory: ${walletDir}\n`);

let extensionId = null;
let crxPath = null;
let extDir = null;
let doLaunchProfile = false;
let doCopyProfile = false;
let doInitEnv = false;
let doSetup = false;
let doVerify = false;

for (let i = 1; i < args.length; i++) {
    switch (args[i]) {
        case '--extension-id':
            extensionId = args[++i];
            break;
        case '--crx':
            crxPath = args[++i];
            break;
        case '--extension-dir':
            extDir = args[++i];
            break;
        case '--launch-profile':
            doLaunchProfile = true;
            break;
        case '--copy-profile':
            doCopyProfile = true;
            break;
        case '--init-env':
            doInitEnv = true;
            break;
        case '--setup':
            doSetup = true;
            break;
        case '--verify':
            doVerify = true;
            break;
    }
}

if (extensionId) copyExtension(findExtensionDir(extensionId), walletDir);
if (crxPath) extractCrx(path.resolve(crxPath), walletDir);
if (extDir) {
    const abs = path.resolve(extDir);
    if (!fs.existsSync(path.join(abs, 'manifest.json'))) {
        console.error(`❌ manifest.json not found: ${abs}`);
        process.exit(1);
    }
    copyExtension(abs, walletDir);
}

if (doLaunchProfile) launchProfile(walletDir, walletId);

if (doSetup) {
    if (!extensionId && !crxPath && !extDir) {
        console.error(`❌ --setup requires --extension-id / --crx / --extension-dir`);
        process.exit(1);
    }
    doCopyProfile = true;
    doInitEnv = true;
}

if (doCopyProfile && !doLaunchProfile) copyProfile(walletDir, walletId);
if (doInitEnv) initEnv(walletDir, walletId);
if (doVerify) process.exit(verify(walletDir, walletId) ? 0 : 1);
```

---

## Step 2: Register `e2e-shared` in `pnpm-workspace.yaml`

Ensure `tron/e2e-shared` is covered by the workspace globs. Check `pnpm-workspace.yaml` — if it already has `tron/*` or similar, no change is needed. If not, add `tron/e2e-shared` explicitly.

## Step 3: Add `e2e-shared` dev dependency to the wallet adapter

In `tron/<walletId>/package.json`, ensure these devDependencies exist:

```json
{
    "devDependencies": {
        "@tronweb3/tronwallet-adapter-e2e-shared": "workspace:^",
        "@playwright/test": "1.49.1",
        "vite": "6.4.2",
        "vite-plugin-node-polyfills": "0.24.0"
    }
}
```

And add these scripts (if not present):

```json
{
    "scripts": {
        "e2e:setup": "node ../e2e-shared/e2e-setup.mjs <walletId>",
        "e2e:page": "vite --config e2e/vite.config.ts",
        "e2e": "playwright test -c e2e/playwright.config.ts"
    }
}
```

## Step 4: Create `tron/<walletId>/e2e/`

Create all of the following files. Replace `<walletId>`, `<WalletName>`, `<ProviderIdentityKey>`, `<AdapterClassName>`, `<BaseUrlEnvVar>`, `<UnlockPagePath>`, and `unlockFramePredicate` using values from the Wallet Reference table above.

### `e2e/wallet-config.ts`

For **tronlink**:

```ts
import type { WalletE2EConfig } from '@tronweb3/tronwallet-adapter-e2e-shared';

export const tronlinkConfig: WalletE2EConfig = {
    walletId: 'tronlink',
    walletName: 'TronLink',
    providerIdentityKey: 'tronLink.isTronLink',
    e2eBaseUrlEnvVar: 'TRONLINK_E2E_BASE_URL',
    unlockPagePath: '/popup/popup.html#/login',
    unlockFramePredicate: () => false,
};
```

For **okxwallet**:

```ts
import type { WalletE2EConfig } from '@tronweb3/tronwallet-adapter-e2e-shared';

export const okxwalletConfig: WalletE2EConfig = {
    walletId: 'okxwallet',
    walletName: 'OKX Wallet',
    providerIdentityKey: 'okxwallet.tronLink.isOkxWallet',
    e2eBaseUrlEnvVar: 'OKX_WALLET_E2E_BASE_URL',
    unlockPagePath: '/home.html#/unlock',
    unlockFramePredicate: (frameUrl, extensionOrigin) =>
        frameUrl.startsWith(extensionOrigin) && frameUrl.includes('/ses.html#/'),
};
```

For **backpack** (an `AddonAdapter` — supports the security spec; multiSign is not implemented):

```ts
import type { WalletE2EConfig } from '@tronweb3/tronwallet-adapter-e2e-shared';

export const backpackConfig: WalletE2EConfig = {
    walletId: 'backpack',
    walletName: 'Backpack',
    // Backpack injects its TRON provider at `window.backpack.tron` and flags it
    // with `isBackpack`. The harness treats this as a dotted path on `window`.
    providerIdentityKey: 'backpack.tron',
    e2eBaseUrlEnvVar: 'BACKPACK_E2E_BASE_URL',
    unlockPagePath: '/popup.html',
    unlockFramePredicate: () => false,
    capabilities: {
        multiSign: false,
        switchChain: false,
    },
};
```

Substitute wallet-specific values for the other wallets. Name the exported config `<walletId>Config`. Use the `windowProviderKey` + `providerIdentityKey` columns from the Wallet Reference table to construct a dotted path (e.g. `bitkeep.tronLink.isBitKeep`). For capabilities, add a `capabilities: { multiSign: false }` or `capabilities: { switchChain: false }` block when the table marks the wallet as unsupported.

### `e2e/vite.config.ts`

```ts
import { createViteConfig } from '@tronweb3/tronwallet-adapter-e2e-shared/config';
import { <walletId>Config } from './wallet-config.js';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const e2eDir = path.dirname(fileURLToPath(import.meta.url));
export default createViteConfig(<walletId>Config, e2eDir);
```

### `e2e/playwright.config.ts`

```ts
import { createPlaywrightConfig } from '@tronweb3/tronwallet-adapter-e2e-shared/config';
import { <walletId>Config } from './wallet-config.js';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const e2eDir = path.dirname(fileURLToPath(import.meta.url));
export default createPlaywrightConfig(<walletId>Config, e2eDir);
```

### `e2e/.env.example`

```env
# <WalletName>-specific E2E environment variables.
# All shared configuration (extension path, password, chain, etc.) lives in tron/.env.
# Add overrides here only if <WalletName> needs different values from the shared defaults.
```

> **Note:** All shared variables (`WALLET_EXTENSION_PATH`, `CHROMIUM_USER_DATA_DIR`, `WALLET_PASSWORD`, `TEST_CHAIN_ID`, etc.) live in `tron/.env`. The setup script (`pnpm e2e:setup --init-env`) creates it automatically. See `tron/.env.example` for the full list.

### `e2e/fixtures/index.ts`

```ts
import { createE2EFixtures } from '@tronweb3/tronwallet-adapter-e2e-shared';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const e2eDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
import { <walletId>Config } from '../wallet-config.js';

const { test, expect, e2eEnv } = createE2EFixtures(<walletId>Config, e2eDir);

export { test, expect, e2eEnv };
```

### `e2e/pages/index.html`

Copy the `e2e-shared/src/page/index.html` file. Change the `<title>` to `<WalletName> E2E Test Page` and the `<h1>` to `<WalletName> Adapter E2E Harness`.

### `e2e/pages/main.ts`

```ts
import { <AdapterClassName> } from '../../src/index.ts';
import { initHarness } from '@tronweb3/tronwallet-adapter-e2e-shared/page';
import { <walletId>Config } from '../wallet-config.js';

const searchParams = new URLSearchParams(window.location.search);
const openUrlWhenWalletNotFound = searchParams.get('openUrlWhenWalletNotFound') === 'true';

const adapter = new <AdapterClassName>({
    openUrlWhenWalletNotFound,
});

initHarness(adapter, <walletId>Config);
```

Adapter class names — see the Wallet Reference table (`Adapter Class` column).

### `e2e/tests/discovery.spec.ts`

```ts
import { test, expect } from '../fixtures/index.js';
import { defineDiscoveryTests } from '@tronweb3/tronwallet-adapter-e2e-shared/specs';
import { <walletId>Config } from '../wallet-config.js';

defineDiscoveryTests(test, expect, <walletId>Config);
```

### `e2e/tests/connect.spec.ts`

```ts
import { test, expect } from '../fixtures/index.js';
import { defineConnectTests } from '@tronweb3/tronwallet-adapter-e2e-shared/specs';
import { <walletId>Config } from '../wallet-config.js';

defineConnectTests(test, expect, <walletId>Config);
```

### `e2e/tests/sign.spec.ts`

```ts
import { test, expect } from '../fixtures/index.js';
import { defineSignTests } from '@tronweb3/tronwallet-adapter-e2e-shared/specs';
import { <walletId>Config } from '../wallet-config.js';

defineSignTests(test, expect, <walletId>Config);
```

### `e2e/tests/transaction.spec.ts`

```ts
import { test, expect } from '../fixtures/index.js';
import { defineTransactionTests } from '@tronweb3/tronwallet-adapter-e2e-shared/specs';
import { <walletId>Config } from '../wallet-config.js';

defineTransactionTests(test, expect, <walletId>Config);
```

### `e2e/tests/chain.spec.ts`

```ts
import { test, expect, e2eEnv } from '../fixtures/index.js';
import { defineChainTests } from '@tronweb3/tronwallet-adapter-e2e-shared/specs';
import { <walletId>Config } from '../wallet-config.js';

defineChainTests(test, expect, <walletId>Config, e2eEnv);
```

### `e2e/tests/events.spec.ts`

```ts
import { test, expect, e2eEnv } from '../fixtures/index.js';
import { defineEventsTests } from '@tronweb3/tronwallet-adapter-e2e-shared/specs';
import { <walletId>Config } from '../wallet-config.js';

defineEventsTests(test, expect, <walletId>Config, e2eEnv);
```

## Step 5: Install dependencies and build `e2e-shared`

```bash
pnpm install
cd tron/e2e-shared && pnpm build
```

> **Important:** `e2e-shared` exports compiled JavaScript from `lib/`. Whenever you modify source files under `e2e-shared/src/`, re-run `pnpm build` inside `tron/e2e-shared/` to keep `lib/` in sync.

## Step 6: Confirm setup

Tell the user:

> TRON E2E infrastructure scaffolded. Next steps:
>
> 1. Run the setup script to prepare the extension, profile, and `tron/.env`:
>    `cd tron/<walletId> && pnpm e2e:setup --extension-id <id> --launch-profile`
> 2. After completing the in-browser wizard, copy the profile and create the env file:
>    `pnpm e2e:setup --copy-profile --init-env`
> 3. Edit `tron/.env` and set `WALLET_PASSWORD` to the wallet password used during setup.
> 4. Run tests: `pnpm e2e`

## Important Notes

-   Do NOT commit `tron/.env` (it contains the wallet password).
-   `tron/.env`, `.chromium-profile/`, `extensions/`, `.vite-dist/`, and `playwright-report/` should be gitignored.
-   TRON transactions are built at sign-time using TronWeb against the network configured by `TRON_FULL_HOST` (default Nile testnet). Ensure the wallet profile is switched to the same network before running transaction tests.
-   Use `TEST_VALUE_SUN=1000` (= 0.001 TRX) so signature tests don't require a funded account; if a wallet refuses to sign zero-value tests, top up the test account from a Nile faucet (https://nileex.io/join/getJoinPage).
-   The `providerIdentityKey` field is treated as a dotted property path on `window` (e.g. `okxwallet.tronLink.isOkxWallet`). Confirm the exact key for your wallet using the browser DevTools — values may shift across extension versions.
-   `multiSign` requires the connected account to have an `active` permission whose `permission_id` matches the value passed in. If the test account has only the default owner permission, the test will surface an error; that's expected and the spec tolerates either outcome (`success` or `error`), but the action must complete.
