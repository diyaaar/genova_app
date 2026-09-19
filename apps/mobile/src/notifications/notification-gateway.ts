import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

export type NativeNotificationPermission = 'undetermined' | 'granted' | 'denied';

export interface NativeNotificationResponse {
  data: unknown;
}

export interface NativeNotificationGateway {
  getPermissionState(): Promise<NativeNotificationPermission>;
  requestPermission(): Promise<NativeNotificationPermission>;
  getInitialResponse(): NativeNotificationResponse | null;
  clearInitialResponse(): void;
  subscribeToResponses(listener: (response: NativeNotificationResponse) => void): () => void;
}

type ExpoNotificationsApi = typeof Notifications;
type NativePlatform = 'android' | 'ios' | 'other';

export const GENOVA_NOTIFICATION_CHANNEL = 'genova-updates';

function mapPermission(
  status: Notifications.NotificationPermissionsStatus,
  api: ExpoNotificationsApi,
): NativeNotificationPermission {
  const iosStatus = status.ios?.status;
  if (iosStatus === api.IosAuthorizationStatus.AUTHORIZED
    || iosStatus === api.IosAuthorizationStatus.PROVISIONAL
    || iosStatus === api.IosAuthorizationStatus.EPHEMERAL) {
    return 'granted';
  }
  if (status.granted || status.status === 'granted') return 'granted';
  return status.status === 'undetermined' ? 'undetermined' : 'denied';
}

function responseData(response: Notifications.NotificationResponse | null): NativeNotificationResponse | null {
  return response ? { data: response.notification.request.content.data } : null;
}

/** Native notification API binding. It never requests a token or permission during creation. */
export function createExpoNotificationGateway(
  api: ExpoNotificationsApi = Notifications,
  platform: NativePlatform = Platform.OS === 'android' ? 'android' : Platform.OS === 'ios' ? 'ios' : 'other',
): NativeNotificationGateway {
  api.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  return {
    async getPermissionState() {
      return mapPermission(await api.getPermissionsAsync(), api);
    },

    async requestPermission() {
      if (platform === 'android') {
        await api.setNotificationChannelAsync(GENOVA_NOTIFICATION_CHANNEL, {
          name: 'Genova bildirimleri',
          importance: api.AndroidImportance.DEFAULT,
          sound: null,
          vibrationPattern: [0, 200, 100, 200],
        });
      }

      const existing = await api.getPermissionsAsync();
      if (mapPermission(existing, api) === 'granted') return 'granted';
      const requested = await api.requestPermissionsAsync(platform === 'ios' ? {
        ios: { allowAlert: true, allowBadge: false, allowSound: false },
      } : undefined);
      return mapPermission(requested, api);
    },

    getInitialResponse() {
      return responseData(api.getLastNotificationResponse());
    },

    clearInitialResponse() {
      api.clearLastNotificationResponse();
    },

    subscribeToResponses(listener) {
      const subscription = api.addNotificationResponseReceivedListener((response) => {
        const value = responseData(response);
        if (value) listener(value);
      });
      return () => subscription.remove();
    },
  };
}
