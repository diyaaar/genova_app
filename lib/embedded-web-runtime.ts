import {
  BRIDGE_CHANNEL,
  type AppRoutePolicy,
  type WebRouteFamily,
  validateInitialWebViewSource,
} from './mobile-webview-bridge';
import type { ChoirMembershipOption } from './choir-context-core';

export const EMBEDDED_LEASE_SAFETY_SECONDS = 30;

let embeddedRuntimeActive = false;

/** One-way process signal: an embedded renderer must never fall back to browser persistence. */
export function activateEmbeddedRuntime(): void {
  embeddedRuntimeActive = true;
}

export function isEmbeddedRuntimeActive(): boolean {
  return embeddedRuntimeActive;
}

const CORRELATION_ID_PATTERN = /^[A-Za-z0-9_-]{16,64}$/u;

export interface EmbeddedWebBridgeSurface {
  injectedObjectJson?: () => string;
  postMessage?: (data: string) => void;
}

export interface EmbeddedBootstrap {
  channel: typeof BRIDGE_CHANNEL;
  instanceId: string;
  tenantEpoch: number;
}

export type EmbeddedBootstrapDetection =
  | { mode: 'browser' }
  | { mode: 'invalid'; reasonCode: 'bridge-surface-invalid' | 'bootstrap-invalid' | 'frame-not-allowed' | 'route-not-allowed' }
  | { mode: 'embedded'; bootstrap: EmbeddedBootstrap; routeFamily: WebRouteFamily };

export interface EmbeddedBootstrapEnvironment {
  href: string;
  isTopFrame: boolean;
  bridge?: EmbeddedWebBridgeSurface;
  routePolicy?: AppRoutePolicy;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

/** Detects a React Native WebView without putting mode or credentials in the URL. */
export function detectEmbeddedBootstrap(environment: EmbeddedBootstrapEnvironment): EmbeddedBootstrapDetection {
  if (!environment.bridge) return { mode: 'browser' };
  if (typeof environment.bridge.injectedObjectJson !== 'function' || typeof environment.bridge.postMessage !== 'function') {
    return { mode: 'invalid', reasonCode: 'bridge-surface-invalid' };
  }
  if (!environment.isTopFrame) return { mode: 'invalid', reasonCode: 'frame-not-allowed' };

  let parsed: unknown;
  try {
    parsed = JSON.parse(environment.bridge.injectedObjectJson());
  } catch {
    return { mode: 'invalid', reasonCode: 'bootstrap-invalid' };
  }
  if (!isRecord(parsed) || !hasExactKeys(parsed, ['channel', 'instanceId', 'tenantEpoch'])
    || parsed.channel !== BRIDGE_CHANNEL
    || typeof parsed.instanceId !== 'string' || !CORRELATION_ID_PATTERN.test(parsed.instanceId)
    || !Number.isSafeInteger(parsed.tenantEpoch) || (parsed.tenantEpoch as number) < 0) {
    return { mode: 'invalid', reasonCode: 'bootstrap-invalid' };
  }

  const route = validateInitialWebViewSource(environment.href, environment.routePolicy);
  if (route.kind === 'rejected' || route.owner !== 'web') {
    return { mode: 'invalid', reasonCode: 'route-not-allowed' };
  }
  return {
    mode: 'embedded',
    bootstrap: {
      channel: BRIDGE_CHANNEL,
      instanceId: parsed.instanceId,
      tenantEpoch: parsed.tenantEpoch as number,
    },
    routeFamily: route.routeFamily as WebRouteFamily,
  };
}

export interface EmbeddedContextCandidate {
  accessToken: string;
  expiresAt: number;
  userId: string;
  choirId: string;
  memberId: string;
}

export type EmbeddedProofReason =
  | 'lease-expiring'
  | 'user-not-verified'
  | 'user-mismatch'
  | 'choir-mismatch'
  | 'proof-failed';

export interface EmbeddedContextProofDependencies {
  nowSeconds: () => number;
  verifyUser: (accessToken: string) => Promise<{ id: string } | null>;
  loadMemberships: (accessToken: string) => Promise<ChoirMembershipOption[]>;
}

/** Verifies an access lease against Auth and the exact server-current active membership. */
export async function verifyEmbeddedContext(
  candidate: EmbeddedContextCandidate,
  dependencies: EmbeddedContextProofDependencies,
): Promise<{ ok: true; value: EmbeddedContextCandidate } | { ok: false; reasonCode: EmbeddedProofReason }> {
  if (candidate.expiresAt <= dependencies.nowSeconds() + EMBEDDED_LEASE_SAFETY_SECONDS) {
    return { ok: false, reasonCode: 'lease-expiring' };
  }

  try {
    const user = await dependencies.verifyUser(candidate.accessToken);
    if (!user) return { ok: false, reasonCode: 'user-not-verified' };
    if (user.id !== candidate.userId) return { ok: false, reasonCode: 'user-mismatch' };

    const memberships = await dependencies.loadMemberships(candidate.accessToken);
    const current = memberships.filter((membership) => membership.is_current);
    if (current.length !== 1) return { ok: false, reasonCode: 'choir-mismatch' };
    const membership = current[0];
    if (!membership.member_is_active || membership.choir_id !== candidate.choirId
      || membership.member_id !== candidate.memberId) {
      return { ok: false, reasonCode: 'choir-mismatch' };
    }
    return { ok: true, value: candidate };
  } catch {
    return { ok: false, reasonCode: 'proof-failed' };
  }
}

export type EmbeddedLeaseMode = 'browser' | 'embedded';
export type EmbeddedLeasePhase = 'browser' | 'locked' | 'ready' | 'renewing';
export type EmbeddedAccessKind = 'read' | 'mutation';

export type EmbeddedLeaseSnapshot =
  | { mode: 'browser'; phase: 'browser' }
  | { mode: 'embedded'; phase: 'locked' }
  | {
      mode: 'embedded';
      phase: 'ready' | 'renewing';
      expiresAt: number;
      userId: string;
      choirId: string;
      memberId: string;
    };

type LeaseListener = (snapshot: EmbeddedLeaseSnapshot) => void;

/** Module owners keep this vault private; snapshots deliberately omit the credential. */
export class EmbeddedLeaseVault {
  #mode: EmbeddedLeaseMode = 'browser';
  #lease: EmbeddedContextCandidate | null = null;
  #renewing = false;
  #listeners = new Set<LeaseListener>();

  constructor(private readonly nowSeconds: () => number = () => Math.floor(Date.now() / 1000)) {}

  snapshot(): EmbeddedLeaseSnapshot {
    if (this.#mode === 'browser') return Object.freeze({ mode: 'browser', phase: 'browser' });
    if (!this.#lease) return Object.freeze({ mode: 'embedded', phase: 'locked' });
    return Object.freeze({
      mode: 'embedded',
      phase: this.#renewing ? 'renewing' : 'ready',
      expiresAt: this.#lease.expiresAt,
      userId: this.#lease.userId,
      choirId: this.#lease.choirId,
      memberId: this.#lease.memberId,
    });
  }

  subscribe(listener: LeaseListener): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  #emit() {
    const snapshot = this.snapshot();
    for (const listener of this.#listeners) listener(snapshot);
  }

  enterEmbeddedMode() {
    if (this.#mode === 'embedded') return;
    this.#mode = 'embedded';
    this.#lease = null;
    this.#renewing = false;
    this.#emit();
  }

  install(candidate: EmbeddedContextCandidate) {
    if (this.#mode !== 'embedded') throw new Error('embedded-mode-required');
    if (this.#lease && candidate.expiresAt <= this.#lease.expiresAt) throw new Error('embedded-lease-not-newer');
    if (candidate.expiresAt <= this.nowSeconds() + EMBEDDED_LEASE_SAFETY_SECONDS) {
      throw new Error('embedded-lease-expiring');
    }
    this.#lease = { ...candidate };
    this.#renewing = false;
    this.#emit();
  }

  beginRenewal(): boolean {
    if (this.#mode !== 'embedded' || !this.#lease || this.#renewing) return false;
    this.#renewing = true;
    this.#emit();
    return true;
  }

  requireAccess(kind: EmbeddedAccessKind): { accessToken: string; userId: string } {
    if (this.#mode !== 'embedded' || !this.#lease) throw new Error('embedded-context-locked');
    if (this.#lease.expiresAt <= this.nowSeconds()) throw new Error('embedded-context-expired');
    if (kind === 'mutation' && this.#renewing) throw new Error('embedded-context-renewing');
    return { accessToken: this.#lease.accessToken, userId: this.#lease.userId };
  }

  clear() {
    if (this.#mode !== 'embedded') return;
    this.#lease = null;
    this.#renewing = false;
    this.#emit();
  }
}
