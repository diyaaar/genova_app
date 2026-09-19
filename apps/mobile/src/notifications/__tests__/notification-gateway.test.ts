jest.mock('expo-notifications', () => ({
  IosAuthorizationStatus: { NOT_DETERMINED: 0, DENIED: 1, AUTHORIZED: 2, PROVISIONAL: 3, EPHEMERAL: 4 },
  AndroidImportance: { DEFAULT: 3 },
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  getLastNotificationResponse: jest.fn(),
  clearLastNotificationResponse: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(),
}));

import { createExpoNotificationGateway, GENOVA_NOTIFICATION_CHANNEL } from '../notification-gateway';

function permission(status: 'granted' | 'denied' | 'undetermined', iosStatus?: number) {
  return { status, granted: status === 'granted', expires: 'never', canAskAgain: true, ios: iosStatus === undefined ? undefined : { status: iosStatus } };
}

function api() {
  const remove = jest.fn();
  return {
    IosAuthorizationStatus: { NOT_DETERMINED: 0, DENIED: 1, AUTHORIZED: 2, PROVISIONAL: 3, EPHEMERAL: 4 },
    AndroidImportance: { DEFAULT: 3 },
    setNotificationHandler: jest.fn(),
    getPermissionsAsync: jest.fn(async () => permission('undetermined')),
    requestPermissionsAsync: jest.fn(async () => permission('granted')),
    setNotificationChannelAsync: jest.fn(async () => null),
    getLastNotificationResponse: jest.fn(() => null),
    clearLastNotificationResponse: jest.fn(),
    addNotificationResponseReceivedListener: jest.fn((_listener: (response: unknown) => void) => ({ remove })),
    remove,
  };
}

describe('Expo notification gateway', () => {
  it('does not request permission or a token when it is created', async () => {
    const fake = api();
    const gateway = createExpoNotificationGateway(fake as never, 'ios');

    expect(fake.setNotificationHandler).toHaveBeenCalledWith({
      handleNotification: expect.any(Function),
    });
    expect(fake.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(await gateway.getPermissionState()).toBe('undetermined');
    expect(fake.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('creates the Android channel before a user-triggered permission request', async () => {
    const fake = api();
    const gateway = createExpoNotificationGateway(fake as never, 'android');

    await expect(gateway.requestPermission()).resolves.toBe('granted');
    expect(fake.setNotificationChannelAsync).toHaveBeenCalledWith(GENOVA_NOTIFICATION_CHANNEL, expect.objectContaining({
      name: 'Genova bildirimleri',
      importance: 3,
    }));
    const channelOrder = fake.setNotificationChannelAsync.mock.invocationCallOrder.at(0);
    const requestOrder = fake.requestPermissionsAsync.mock.invocationCallOrder.at(0);
    expect(channelOrder).toBeDefined();
    expect(requestOrder).toBeDefined();
    expect(channelOrder!).toBeLessThan(requestOrder!);
  });

  it.each([2, 3, 4])('accepts iOS authorization status %s without another prompt', async (iosStatus) => {
    const fake = api();
    fake.getPermissionsAsync.mockResolvedValue(permission('denied', iosStatus));
    const gateway = createExpoNotificationGateway(fake as never, 'ios');

    await expect(gateway.requestPermission()).resolves.toBe('granted');
    expect(fake.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('extracts initial/live data, clears the initial response and removes the listener', () => {
    const fake = api();
    const initialData = { type: 'initial' };
    fake.getLastNotificationResponse.mockImplementation(() => (
      { notification: { request: { content: { data: initialData } } } } as never
    ));
    const gateway = createExpoNotificationGateway(fake as never, 'ios');

    expect(gateway.getInitialResponse()).toEqual({ data: initialData });
    gateway.clearInitialResponse();
    expect(fake.clearLastNotificationResponse).toHaveBeenCalledTimes(1);

    const listener = jest.fn();
    const unsubscribe = gateway.subscribeToResponses(listener);
    const expoListener = fake.addNotificationResponseReceivedListener.mock.calls[0]?.[0];
    expect(expoListener).toBeDefined();
    if (!expoListener) throw new Error('listener missing');
    expoListener({ notification: { request: { content: { data: { type: 'live' } } } } });
    expect(listener).toHaveBeenCalledWith({ data: { type: 'live' } });
    unsubscribe();
    expect(fake.remove).toHaveBeenCalledTimes(1);
  });
});
