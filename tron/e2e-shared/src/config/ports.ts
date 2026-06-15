/**
 * Each wallet's E2E test page is served on its own dedicated port so that running
 * one wallet's suite never reuses (or collides with) another wallet's dev server.
 *
 * Playwright's webServer uses `reuseExistingServer` locally, so a shared port meant
 * that a stale server from a different wallet would be silently reused — the loaded
 * extension would be correct but the page served would belong to another wallet.
 * Deriving a stable per-wallet port from the walletId removes that footgun.
 */

const PORT_BASE = 4174;
/** Size of the port window [PORT_BASE, PORT_BASE + PORT_RANGE). */
const PORT_RANGE = 100;

/** Stable, deterministic port for a wallet's E2E test-page server. */
export function getWalletPort(walletId: string): number {
    let hash = 0;
    for (let i = 0; i < walletId.length; i += 1) {
        hash = (hash * 31 + walletId.charCodeAt(i)) >>> 0;
    }
    return PORT_BASE + (hash % PORT_RANGE);
}

/** Default base URL for a wallet's E2E test page, when no env override is set. */
export function getWalletBaseUrl(walletId: string): string {
    return `http://127.0.0.1:${getWalletPort(walletId)}`;
}
