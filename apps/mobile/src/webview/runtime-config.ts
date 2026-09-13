import {
  APP_WEB_ORIGIN,
  classifyAppUrl,
  validateInitialWebViewSource,
  type AppRoutePolicy,
  type WebRouteFamily,
} from '@shared/mobile-webview-bridge';

const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '[::1]']);

export interface NativeWebViewRuntimeConfig {
  appOrigin: string;
  routePolicy: AppRoutePolicy;
  initialUrl: string;
  routeFamily: WebRouteFamily;
}

function validatedDevelopmentOrigin(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('Geçersiz yerel WebView adresi.');
  }
  if (url.protocol !== 'http:' || !LOOPBACK_HOSTS.has(url.hostname) || !url.port
    || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('Yerel WebView adresi yalnız açık portlu loopback HTTP origin olabilir.');
  }
  return url.origin;
}

/** Release always selects the production origin; a local override exists only in an explicit dev path. */
export function resolveNativeWebViewOrigin(input: {
  isDevelopment: boolean;
  developmentOrigin?: string;
}): string {
  if (!input.isDevelopment || !input.developmentOrigin) return APP_WEB_ORIGIN;
  return validatedDevelopmentOrigin(input.developmentOrigin);
}

/** Validates Android's otherwise-unobserved initial request before a native WebView can be created. */
export function createNativeWebViewRuntimeConfig(input: {
  initialPath: string;
  isDevelopment: boolean;
  developmentOrigin?: string;
  protectedFileOrigins?: readonly string[];
}): NativeWebViewRuntimeConfig {
  const appOrigin = resolveNativeWebViewOrigin(input);
  const routePolicy = {
    appOrigin,
    ...(input.protectedFileOrigins ? { protectedFileOrigins: input.protectedFileOrigins } : {}),
  };
  const rawDecision = classifyAppUrl(input.initialPath, routePolicy);
  if (rawDecision.kind === 'rejected' || rawDecision.owner !== 'web') {
    throw new Error('route-not-allowed');
  }
  const initialUrl = new URL(rawDecision.canonicalPath, appOrigin).href;
  const decision = validateInitialWebViewSource(initialUrl, routePolicy);
  if (decision.kind === 'rejected' || decision.owner !== 'web') {
    throw new Error('route-not-allowed');
  }
  return Object.freeze({ appOrigin, routePolicy, initialUrl, routeFamily: decision.routeFamily as WebRouteFamily });
}

export function readNativeWebViewRuntimeConfig(initialPath: string): NativeWebViewRuntimeConfig {
  return createNativeWebViewRuntimeConfig({
    initialPath,
    isDevelopment: __DEV__,
    developmentOrigin: __DEV__ ? process.env.EXPO_PUBLIC_GENOVA_WEB_ORIGIN : undefined,
  });
}
