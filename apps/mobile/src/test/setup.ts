import { resetTenantCacheRegistry } from '../auth/tenant-cache';

jest.mock('@dariyd/react-native-pdf-page-image', () => ({
  PdfPageImage: {
    open: jest.fn(),
    generate: jest.fn(),
    close: jest.fn(),
  },
}));

jest.mock('@shopify/react-native-skia', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Component = ({ children, ...props }: { children?: React.ReactNode }) =>
    React.createElement(View, props, children);
  const makeBuilder = () => {
    const path = {};
    const builder: Record<string, (...args: unknown[]) => unknown> = {};
    for (const name of ['moveTo', 'lineTo', 'quadTo', 'cubicTo', 'close', 'addRRect']) {
      builder[name] = () => builder;
    }
    builder.build = () => path;
    builder.detach = () => path;
    return builder;
  };
  return {
    Canvas: Component,
    Group: Component,
    Path: Component,
    Skia: { PathBuilder: { Make: makeBuilder } },
  };
});

jest.mock('expo-audio', () => {
  const player = {
    play: jest.fn(),
    pause: jest.fn(),
    replace: jest.fn(),
    seekTo: jest.fn(async () => {}),
    setPlaybackRate: jest.fn(),
  };
  const status = {
    id: 'test-player',
    currentTime: 0,
    duration: 0,
    playing: false,
    isBuffering: false,
    isLoaded: false,
    playbackRate: 1,
    error: null,
  };
  return {
    useAudioPlayer: jest.fn(() => player),
    useAudioPlayerStatus: jest.fn(() => status),
    __mockPlayer: player,
    __mockStatus: status,
  };
});

jest.mock('react-native-webview', () => {
  const React = require('react');
  const { View } = require('react-native');
  const methods = {
    postMessage: jest.fn(),
    goBack: jest.fn(),
    stopLoading: jest.fn(),
    reload: jest.fn(),
  };
  let latestProps: Record<string, unknown> | null = null;
  const WebView = React.forwardRef((props: Record<string, unknown>, ref: React.Ref<unknown>) => {
    latestProps = props;
    React.useImperativeHandle(ref, () => methods);
    return React.createElement(View, props);
  });
  return {
    WebView,
    __mockMethods: methods,
    __getLatestProps: () => latestProps,
  };
});

jest.mock('expo-crypto', () => {
  let uuidCounter = 0;
  return {
    randomUUID: jest.fn(() => `00000000-0000-4000-8000-${String(++uuidCounter).padStart(12, '0')}`),
    getRandomBytes: jest.fn((length: number) => Uint8Array.from(
      { length },
      (_value, index) => (index * 17 + uuidCounter) % 256,
    )),
  };
});

beforeEach(() => {
  resetTenantCacheRegistry();
});
