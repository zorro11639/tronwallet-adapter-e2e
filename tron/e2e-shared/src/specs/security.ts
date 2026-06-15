import type { TestType, Expect } from '@playwright/test';
import type { WalletE2EConfig } from '../types.js';
import type { AdapterE2EPage } from '../fixtures/test-page.js';
import type { WalletPopupController } from '../fixtures/wallet-popup.js';
import { connectWallet } from '../helpers/test-helpers.js';

type Fixtures = { app: AdapterE2EPage; walletPopup: WalletPopupController };

const MOCK_CONFIG_URL = 'https://e2e-security-mock.tronwallet-adapter.test/config.json';
const MOCK_CONFIG_URL_A = 'https://e2e-security-mock.tronwallet-adapter.test/config-a.json';
const MOCK_CONFIG_URL_B = 'https://e2e-security-mock.tronwallet-adapter.test/config-b.json';

function buildRiskConfig(wallets: Record<string, { noticeType: 1 | 2 | 3; title: string }[]>) {
    return JSON.stringify({ v: '1.0.0', ts: Date.now(), wallets });
}

function skipWithoutExtension(test: TestType<Fixtures, {}>, walletName: string) {
    return (testInfo: { project: { name: string } }) =>
        test.skip(
            testInfo.project.name !== 'with-extension',
            `This test requires the ${walletName} extension project.`
        );
}

export function defineSecurityTests(test: TestType<Fixtures, {}>, expect: Expect, config: WalletE2EConfig) {
    const skip = skipWithoutExtension(test, config.walletName);

    // ─── securityOptions.enabled ──────────────────────────────────────────────

    /**
     * E2E-SEC-001: Security enabled, config has risks only for another wallet.
     * Risk list for this adapter is empty → connect should succeed.
     */
    test('E2E-SEC-001 security check passes when config has no risks for this wallet', async ({
        app,
        walletPopup,
    }, testInfo) => {
        skip(testInfo);

        await app.route(MOCK_CONFIG_URL, (route) =>
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: buildRiskConfig({ OtherWallet: [{ noticeType: 1, title: 'other-wallet-risk' }] }),
            })
        );

        await app.goto({ securityEnabled: 'true', securityConfigUrl: MOCK_CONFIG_URL });

        const snapshot = await connectWallet(app, walletPopup);
        expect(snapshot.connected).toBe(true);
        expect(snapshot.result.status).toBe('success');
    });

    /**
     * E2E-SEC-002: Security enabled, risk detected for this wallet.
     * Default onRiskDetected throws → connect fails before the wallet popup appears.
     */
    test('E2E-SEC-002 security check blocks connect when a risk is detected for this wallet', async ({
        app,
    }, testInfo) => {
        skip(testInfo);

        await app.route(MOCK_CONFIG_URL, (route) =>
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: buildRiskConfig({
                    [config.walletName]: [{ noticeType: 3, title: 'critical-security-flaw' }],
                }),
            })
        );

        await app.goto({ securityEnabled: 'true', securityConfigUrl: MOCK_CONFIG_URL });

        // Security throws before the wallet popup appears — no walletPopup interaction needed
        await app.runAction('connect');
        const snapshot = await app.getSnapshot();

        expect(snapshot.connected).toBe(false);
        expect(snapshot.result.status).toBe('error');
        expect(snapshot.result.errorMessage).toContain('critical-security-flaw');
    });

    /**
     * E2E-SEC-003: Security enabled, config endpoint returns HTTP 500.
     * Adapter falls back to "safe" (allow connect) — a fetch failure must never block users.
     */
    test('E2E-SEC-003 security check falls back to safe when config fetch fails', async ({
        app,
        walletPopup,
    }, testInfo) => {
        skip(testInfo);

        await app.route(MOCK_CONFIG_URL, (route) => route.fulfill({ status: 500 }));

        await app.goto({ securityEnabled: 'true', securityConfigUrl: MOCK_CONFIG_URL });

        const snapshot = await connectWallet(app, walletPopup);
        expect(snapshot.connected).toBe(true);
        expect(snapshot.result.status).toBe('success');
    });

    /**
     * E2E-SEC-004: Security is disabled by default (enabled: false).
     * Even when a risk-bearing config URL is reachable, the adapter must never fetch it.
     * Setting up a route that would block connect verifies the fetch is truly skipped.
     */
    test('E2E-SEC-004 security check is skipped when disabled — config URL is never fetched', async ({
        app,
        walletPopup,
    }, testInfo) => {
        skip(testInfo);

        // If this route were ever called it returns a blocking risk config — connect would fail.
        // Security is disabled (no securityEnabled param), so this route should never fire.
        await app.route(MOCK_CONFIG_URL, (route) =>
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: buildRiskConfig({
                    [config.walletName]: [{ noticeType: 3, title: 'should-never-be-seen' }],
                }),
            })
        );

        // No extra params → adapter created without securityOptions.enabled → security skipped
        const snapshot = await connectWallet(app, walletPopup);
        expect(snapshot.connected).toBe(true);
        expect(snapshot.result.status).toBe('success');
    });

    // ─── securityOptions.configUrls ───────────────────────────────────────────

    /**
     * E2E-SEC-005: Multiple configUrls — risks from both URLs are merged.
     * URL-A has no risk for this wallet; URL-B has a critical risk.
     * The merged result must contain the risk from URL-B → connect fails.
     */
    test('E2E-SEC-005 risks from multiple configUrls are merged — risk in any URL blocks connect', async ({
        app,
    }, testInfo) => {
        skip(testInfo);

        await app.route(MOCK_CONFIG_URL_A, (route) =>
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: buildRiskConfig({ OtherWallet: [{ noticeType: 1, title: 'irrelevant-risk' }] }),
            })
        );

        await app.route(MOCK_CONFIG_URL_B, (route) =>
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: buildRiskConfig({
                    [config.walletName]: [{ noticeType: 3, title: 'risk-from-second-url' }],
                }),
            })
        );

        // Comma-separated configUrls — both are fetched and merged
        await app.goto({
            securityEnabled: 'true',
            securityConfigUrl: `${MOCK_CONFIG_URL_A},${MOCK_CONFIG_URL_B}`,
        });

        await app.runAction('connect');
        const snapshot = await app.getSnapshot();

        expect(snapshot.connected).toBe(false);
        expect(snapshot.result.status).toBe('error');
        expect(snapshot.result.errorMessage).toContain('risk-from-second-url');
    });

    // ─── securityOptions.onRiskDetected ───────────────────────────────────────

    /**
     * E2E-SEC-006: Risk detected but onRiskDetected only logs (does not throw).
     * This models the "soft warning" use case where the DApp informs the user but
     * does not block the connection.
     */
    test('E2E-SEC-006 risk detected but onRiskDetected does not throw — connect proceeds', async ({
        app,
        walletPopup,
    }, testInfo) => {
        skip(testInfo);

        await app.route(MOCK_CONFIG_URL, (route) =>
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: buildRiskConfig({
                    [config.walletName]: [{ noticeType: 1, title: 'minor-warning' }],
                }),
            })
        );

        // securityThrowOnRisk=false → getSecurityOptionsFromUrl omits onRiskDetected
        // → adapter falls back to defaultSecurityOptions.onRiskDetected (console.log only)
        await app.goto({
            securityEnabled: 'true',
            securityConfigUrl: MOCK_CONFIG_URL,
            securityThrowOnRisk: 'false',
        });

        const snapshot = await connectWallet(app, walletPopup);
        expect(snapshot.connected).toBe(true);
        expect(snapshot.result.status).toBe('success');
    });

    /**
     * E2E-SEC-007: Config contains multiple risk entries for this wallet.
     * All risk titles must be forwarded to onRiskDetected — none may be dropped.
     */
    test('E2E-SEC-007 all risk entries for this wallet are passed to onRiskDetected', async ({ app }, testInfo) => {
        skip(testInfo);

        await app.route(MOCK_CONFIG_URL, (route) =>
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    v: '1.0.0',
                    ts: Date.now(),
                    wallets: {
                        [config.walletName]: [
                            { noticeType: 1, title: 'risk-level-minor' },
                            { noticeType: 2, title: 'risk-level-moderate' },
                            { noticeType: 3, title: 'risk-level-critical' },
                        ],
                    },
                }),
            })
        );

        await app.goto({ securityEnabled: 'true', securityConfigUrl: MOCK_CONFIG_URL });

        await app.runAction('connect');
        const snapshot = await app.getSnapshot();

        expect(snapshot.result.status).toBe('error');
        // All three titles must appear in the thrown error message
        expect(snapshot.result.errorMessage).toContain('risk-level-minor');
        expect(snapshot.result.errorMessage).toContain('risk-level-moderate');
        expect(snapshot.result.errorMessage).toContain('risk-level-critical');
    });

    // ─── Caching behaviour ────────────────────────────────────────────────────

    /**
     * E2E-SEC-008: Config is cached in-memory after the first fetch.
     * After a successful fetch the mock is switched to abort all requests.
     * A second connect() call must still be blocked by the cached risk — proving
     * the adapter does not re-fetch within the cache TTL.
     */
    test('E2E-SEC-008 risk config is served from cache on subsequent connect calls', async ({ app }, testInfo) => {
        skip(testInfo);

        let fetchCount = 0;
        await app.route(MOCK_CONFIG_URL, (route) => {
            fetchCount++;
            if (fetchCount === 1) {
                // First fetch: return a risk config for this wallet
                return route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: buildRiskConfig({
                        [config.walletName]: [{ noticeType: 3, title: 'cached-risk' }],
                    }),
                });
            }
            // Subsequent fetches: abort — if the adapter re-fetches it would get a safe empty config
            return route.abort();
        });

        await app.goto({ securityEnabled: 'true', securityConfigUrl: MOCK_CONFIG_URL });

        // First connect: fetch succeeds, result cached, risk blocks connect
        await app.runAction('connect');
        const first = await app.getSnapshot();
        expect(first.result.status).toBe('error');
        expect(first.result.errorMessage).toContain('cached-risk');

        // Second connect: if cache works the risk is read from memory (fetchCount stays 1)
        // and connect is blocked again; if re-fetched it would abort → safe fallback → success
        await app.runAction('connect');
        const second = await app.getSnapshot();
        expect(second.result.status).toBe('error');
        expect(second.result.errorMessage).toContain('cached-risk');
    });
}
