import { requestProtectedRepertoireFileTicket } from '@shared/repertuvar/protected-file-client';
import type { ProtectedRepertoireFileTicket } from '@shared/repertuvar/protected-file-client';

export interface AudioSessionSource {
  getAccessToken(): Promise<string | null>;
}

export interface NativeAudioSourceGateway {
  open(fileId: string): Promise<ProtectedRepertoireFileTicket>;
  clear(): void;
}

export function createNativeAudioSourceGateway(deps: {
  endpoint: string;
  session: AudioSessionSource;
  requestTicket?: typeof requestProtectedRepertoireFileTicket;
}): NativeAudioSourceGateway {
  let operationVersion = 0;
  let controller: AbortController | null = null;

  function assertCurrent(version: number) {
    if (version !== operationVersion) throw new Error('Ses isteği artık geçerli değil.');
  }

  return {
    async open(fileId) {
      controller?.abort();
      const version = ++operationVersion;
      const nextController = new AbortController();
      controller = nextController;
      try {
        const accessToken = await deps.session.getAccessToken();
        assertCurrent(version);
        if (!accessToken) throw new Error('Oturum bulunamadı. Lütfen tekrar giriş yapın.');
        const ticket = await (deps.requestTicket ?? requestProtectedRepertoireFileTicket)({
          endpoint: deps.endpoint,
          accessToken,
          fileId,
          signal: nextController.signal,
        });
        assertCurrent(version);
        return ticket;
      } finally {
        if (controller === nextController) controller = null;
      }
    },
    clear() {
      operationVersion += 1;
      controller?.abort();
      controller = null;
    },
  };
}
