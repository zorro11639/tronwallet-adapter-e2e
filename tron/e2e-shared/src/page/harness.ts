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
import { TronWeb } from 'tronweb';
import type {
    AdapterActionName,
    AdapterActionParams,
    AdapterEventEntry,
    AdapterHarnessConfig,
    WalletE2EConfig,
} from '../types.js';

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
    network(): Promise<{ chainId: string }>;
}

/**
 * Reads security options from the page URL search params and returns an object
 * suitable for passing as `securityOptions` to a wallet adapter constructor.
 *
 * Recognised params:
 *   securityEnabled=true             – enables the security check
 *   securityConfigUrl=<url>[,<url>]  – comma-separated URL(s) to fetch the risk config from
 *   securityThrowOnRisk=true|false   – whether onRiskDetected should throw (default: true)
 *
 * Returns undefined when security is not enabled or no configUrls are provided.
 */
export function getSecurityOptionsFromUrl(searchParams: URLSearchParams):
    | {
          enabled: true;
          configUrls: string[];
          onRiskDetected?: (result: { risks: Array<{ title: string; noticeType: number }> }) => Promise<void>;
      }
    | undefined {
    if (searchParams.get('securityEnabled') !== 'true') return undefined;
    const configUrls = (searchParams.get('securityConfigUrl') ?? '').split(',').filter(Boolean);
    if (configUrls.length === 0) return undefined;

    const throwOnRisk = searchParams.get('securityThrowOnRisk') !== 'false';
    return {
        enabled: true,
        configUrls,
        ...(throwOnRisk && {
            onRiskDetected: async (result: { risks: Array<{ title: string }> }) => {
                throw new Error(
                    `[WalletAdapter] Security risk detected: ${result.risks.map((r) => r.title).join(', ')}`
                );
            },
        }),
    };
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
    const tronWeb = new TronWeb({ fullHost });

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

    async function buildTrxTransferTx(overrides?: { receiver?: string; value?: string; fromAddress?: string }) {
        const receiver = overrides?.receiver ?? elements.receiverInput.value;
        const rawValue = overrides?.value ?? elements.valueInput.value ?? '1000';
        const amount = Number.parseInt(rawValue, 10);
        return tronWeb.transactionBuilder.sendTrx(
            receiver,
            amount,
            overrides?.fromAddress || currentAdapter.address || ''
        );
    }

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

    type ActionHandlers = {
        [K in AdapterActionName]: (params?: AdapterActionParams[K]) => Promise<ResultState>;
    };

    const actions: ActionHandlers = {
        resetState: async () => {
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
                providerFound = currentAdapter.readyState === 'Found';
                providerIdentityCheck = providerIdentityCheckOnWindow(config.providerIdentityKey);
                render();
                return { providerFound, providerIdentityCheck };
            });
        },
        connect: async () => execute('connect', async () => currentAdapter.connect()),
        disconnect: async () => execute('disconnect', async () => currentAdapter.disconnect()),
        signMessage: async (params) =>
            execute('signMessage', async () => {
                const message = params?.message ?? elements.messageInput.value;
                return currentAdapter.signMessage(message);
            }),
        signTransaction: async (params) =>
            execute('signTransaction', async () => {
                const unsigned = await buildTrxTransferTx(params);
                return currentAdapter.signTransaction(unsigned);
            }),
        multiSign: async (params) =>
            execute('multiSign', async () => {
                if (typeof currentAdapter.multiSign !== 'function') {
                    throw new Error(`${currentAdapter.name} does not implement multiSign`);
                }
                const unsigned = await buildTrxTransferTx(params);
                return currentAdapter.multiSign(unsigned, { permissionId: params?.permissionId ?? 0 });
            }),
        switchChain: async (params) =>
            execute('switchChain', async () => {
                const targetChainId = params?.chainId ?? elements.switchChainInput.value;
                await currentAdapter.switchChain(targetChainId);
                return (await currentAdapter.network()).chainId;
            }),
    };

    // Expose global API for Playwright / Appium
    const globalName = `${config.walletId}AdapterE2E`;
    (window as unknown as Record<string, unknown>)[globalName] = {
        runAction<T extends AdapterActionName>(action: T, params?: AdapterActionParams[T]) {
            const handler = actions[action] as (p?: AdapterActionParams[T]) => Promise<ResultState>;
            return handler(params);
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
