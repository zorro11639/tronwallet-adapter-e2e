import path from 'node:path';
import { defineConfig } from '@playwright/test';
import type { WalletE2EConfig } from '../types.js';
import { getWalletPort } from './ports.js';

export function createPlaywrightConfig(config: WalletE2EConfig, e2eDir: string) {
    const packageRoot = path.resolve(e2eDir, '..');
    const port = getWalletPort(config.walletId);
    const baseURL = process.env[config.e2eBaseUrlEnvVar] || `http://127.0.0.1:${port}`;
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
            command: `pnpm exec vite --configLoader runner --config ${viteConfigRelPath} --host 127.0.0.1 --port ${port}`,
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
