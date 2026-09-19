import { useCallback, useEffect, useRef, useState } from 'react';
import {
  type AcceptedNotificationDeepLink,
} from '@shared/notification-deep-link';
import type {
  NativeNotificationGateway,
  NativeNotificationPermission,
  NativeNotificationResponse,
} from './notification-gateway';
import { createNotificationTapResolver } from './notification-runtime-core';

export interface NativeNotificationRuntimeState {
  permission: NativeNotificationPermission | 'loading' | 'unavailable' | 'error';
  requestingPermission: boolean;
  permissionMessage: string | null;
  tapError: string | null;
  requestPermission(): Promise<void>;
  clearTapError(): void;
}

export function useNotificationRuntime({
  gateway,
  onOpen,
}: {
  gateway?: NativeNotificationGateway;
  onOpen: (destination: AcceptedNotificationDeepLink) => void;
}): NativeNotificationRuntimeState {
  const [permission, setPermission] = useState<NativeNotificationRuntimeState['permission']>(
    gateway ? 'loading' : 'unavailable',
  );
  const [requestingPermission, setRequestingPermission] = useState(false);
  const [permissionMessage, setPermissionMessage] = useState<string | null>(null);
  const [tapError, setTapError] = useState<string | null>(null);
  const resolveTap = useRef(createNotificationTapResolver());
  const onOpenRef = useRef(onOpen);
  onOpenRef.current = onOpen;

  const handleResponse = useCallback((response: NativeNotificationResponse) => {
    const decision = resolveTap.current(response.data);
    if (decision.kind === 'duplicate') return;
    if (decision.kind === 'error') {
      setTapError(decision.message);
      return;
    }
    setTapError(null);
    onOpenRef.current(decision.destination);
  }, []);

  useEffect(() => {
    if (!gateway) {
      setPermission('unavailable');
      return;
    }
    let active = true;
    void gateway.getPermissionState()
      .then((next) => {
        if (active) setPermission(next);
      })
      .catch(() => {
        if (active) setPermission('error');
      });

    const initial = gateway.getInitialResponse();
    if (initial) {
      handleResponse(initial);
      gateway.clearInitialResponse();
    }
    const unsubscribe = gateway.subscribeToResponses(handleResponse);
    return () => {
      active = false;
      unsubscribe();
    };
  }, [gateway, handleResponse]);

  const requestPermission = useCallback(async () => {
    if (!gateway || requestingPermission) return;
    setRequestingPermission(true);
    setPermissionMessage(null);
    try {
      const next = await gateway.requestPermission();
      setPermission(next);
      setPermissionMessage(next === 'granted'
        ? 'Bildirim izni açıldı.'
        : 'Bildirim izni verilmedi. İsterseniz daha sonra sistem ayarlarından açabilirsiniz.');
    } catch {
      setPermission('error');
      setPermissionMessage('Bildirim izni kontrol edilemedi. Daha sonra tekrar deneyin.');
    } finally {
      setRequestingPermission(false);
    }
  }, [gateway, requestingPermission]);

  return {
    permission,
    requestingPermission,
    permissionMessage,
    tapError,
    requestPermission,
    clearTapError: () => setTapError(null),
  };
}
