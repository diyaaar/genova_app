import {
  APP_WEB_ORIGIN,
  BRIDGE_CHANNEL,
  classifyAppUrl,
  parseBridgeMessage,
} from '@shared/mobile-webview-bridge';

describe('shared permanent WebView policy compatibility', () => {
  it('loads the exact shared module in the React Native Jest environment', () => {
    expect(classifyAppUrl('/koristler/davetler')).toMatchObject({
      kind: 'accepted',
      owner: 'web',
      routeFamily: 'invitations',
    });

    expect(parseBridgeMessage(JSON.stringify({
      channel: BRIDGE_CHANNEL,
      version: 1,
      id: 'message_1234567890abcdef',
      instanceId: 'instance_1234567890abcdef',
      tenantEpoch: 1,
      type: 'navigation.native.request',
      payload: { path: '/repertuvar/bir-eser' },
    }), {
      direction: 'web-to-native',
      expectedInstanceId: 'instance_1234567890abcdef',
      expectedTenantEpoch: 1,
      sourceUrl: `${APP_WEB_ORIGIN}/koristler/davetler`,
    })).toMatchObject({
      ok: true,
      value: { type: 'navigation.native.request', payload: { path: '/repertuvar/bir-eser' } },
    });
  });
});
